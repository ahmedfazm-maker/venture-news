import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { updateJob } from "@/lib/kv";
import { callClaude, buildSignalScoringPrompt } from "@/lib/claude";
import type { Signal } from "@/lib/kv";

interface FeedSource {
  name: string;
  url: string;
  type: "rss" | "json";
}

interface RawItem {
  title: string;
  url: string;
  source: string;
  description: string;
  published_at?: string;
}

async function fetchRssFeed(source: FeedSource): Promise<RawItem[]> {
  const res = await fetch(source.url, {
    headers: { "User-Agent": "VentureNews/1.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return [];

  const xml = await res.text();
  const items: RawItem[] = [];

  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const block = match[1];
    const title = extractXmlTag(block, "title");
    const link = extractXmlTag(block, "link");
    const description = extractXmlTag(block, "description");
    const pubDate = extractXmlTag(block, "pubDate");

    if (title && link) {
      items.push({
        title: stripCdata(title),
        url: stripCdata(link),
        source: source.name,
        description: stripHtml(stripCdata(description ?? "")).slice(0, 300),
        published_at: pubDate ?? undefined,
      });
    }

    if (items.length >= 10) break;
  }

  return items;
}

function extractXmlTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1] ?? null;
}

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(): Promise<NextResponse> {
  try {
    const sourcesRaw = readFileSync(
      join(process.cwd(), "content/sources.json"),
      "utf-8"
    );
    const sources: FeedSource[] = JSON.parse(sourcesRaw);

    const allItems: RawItem[] = [];

    await Promise.allSettled(
      sources.map(async (source) => {
        const items = await fetchRssFeed(source);
        allItems.push(...items);
      })
    );

    if (allItems.length === 0) {
      await updateJob({ status: "failed", error: "No items fetched from feeds" });
      return NextResponse.json({ error: "No items fetched" }, { status: 500 });
    }

    const prompt = buildSignalScoringPrompt();
    const userMessage = `Score these ${allItems.length} news items. Return JSON with this exact shape:
{
  "signals": [
    {
      "title": "...",
      "url": "...",
      "source": "...",
      "summary": "one sentence summary",
      "score": 0.0-1.0,
      "relevance_reason": "why this matters to founders",
      "published_at": "..."
    }
  ]
}

Return the top 8 by score only. Items:
${JSON.stringify(allItems, null, 2)}`;

    const response = await callClaude(prompt, [{ role: "user", content: userMessage }], 3000);

    let signals: Signal[];
    try {
      const cleaned = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned) as { signals: Signal[] };
      signals = parsed.signals.slice(0, 8);
    } catch (parseErr) {
      console.error("[fetch-signals] Claude parse error:", parseErr);
      console.error("[fetch-signals] Raw Claude response:", response);
      const error = `Failed to parse Claude scoring response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`;
      await updateJob({ status: "failed", error });
      return NextResponse.json({ error, raw_response: response }, { status: 500 });
    }

    await updateJob({ status: "signals_ready", signals });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    await fetch(`${baseUrl}/api/pipeline/generate-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    return NextResponse.json({ ok: true, signal_count: signals.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateJob({ status: "failed", error: message }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
