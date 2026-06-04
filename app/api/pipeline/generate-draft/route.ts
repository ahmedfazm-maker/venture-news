import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getJob, updateJob } from "@/lib/kv";
import {
  callClaude,
  buildDraftSystemPrompt,
  loadSections,
} from "@/lib/claude";
import type { DraftSection } from "@/lib/kv";

interface SectionDef {
  id: string;
  name: string;
  wordcount_min: number;
  wordcount_max: number;
  format_notes: string;
}

function getWeekMod(weekString: string): number {
  const match = weekString.match(/W(\d+)/);
  if (!match) return 0;
  return (parseInt(match[1], 10) - 1) % 4;
}

async function sendReviewEmail(
  reviewUrl: string,
  week: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[generate-draft] RESEND_API_KEY not set. Review link: ${reviewUrl}`);
    return;
  }

  const emails = (process.env.FOUNDER_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (emails.length === 0) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: emails,
      subject: `Venture News draft ready — Week ${week}`,
      html: `
        <p>Your newsletter draft for <strong>${week}</strong> is ready.</p>
        <p><a href="${reviewUrl}" style="background:#111;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Review &amp; Approve Draft</a></p>
        <p style="color:#888;font-size:12px;">The link expires if you generate a new draft.</p>
      `,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend error ${res.status}: ${error}`);
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const job = await getJob();
    if (!job) {
      return NextResponse.json({ error: "No active job" }, { status: 400 });
    }
    if (!job.signals || job.signals.length === 0) {
      return NextResponse.json({ error: "No signals in job" }, { status: 400 });
    }

    await updateJob({ status: "draft_generating" });

    const weekMod = getWeekMod(job.week);
    const systemPrompt = buildDraftSystemPrompt(weekMod);
    const sectionDefs = loadSections() as SectionDef[];

    const signalContext = JSON.stringify(job.signals, null, 2);

    const sections: DraftSection[] = [];
    let visualHtml: string | undefined;

    for (const section of sectionDefs) {
      const userMessage = `Write the "${section.name}" section of this week's newsletter.

Section requirements:
- Word count: ${section.wordcount_min}–${section.wordcount_max} words
- Format notes: ${section.format_notes}

This week's signals (use relevant ones only):
${signalContext}

Return ONLY valid JSON in this exact shape:
{
  "id": "${section.id}",
  "name": "${section.name}",
  "content": "the full section text here"
}`;

      const response = await callClaude(
        systemPrompt,
        [{ role: "user", content: userMessage }],
        1500
      );

      let parsed: DraftSection;
      try {
        const cleaned = response.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        parsed = JSON.parse(cleaned) as DraftSection;
      } catch (parseErr) {
        console.error(`[generate-draft] Failed to parse section "${section.id}":`, parseErr);
        console.error("[generate-draft] Raw response:", response);
        parsed = { id: section.id, name: section.name, content: response };
      }
      sections.push(parsed);

      if (section.id === "the_signal") {
        const visualPrompt = `Based on The Signal content below, decide whether it is better illustrated by a "chart" or a "grid", then generate the visual as self-contained HTML with inline CSS only (no external resources, no <script> tags, no SVG).

"grid" format: a 2×2 HTML table. Each cell contains:
- A large bold number (the key metric value, e.g. "$240M" or "34%")
- A short metric label in smaller text below it
- A tiny source citation in muted text below that

"chart" format: a simple bar chart using HTML divs with inline styles. Use #111 bars on a white background. Label each bar. Show the value above or inside the bar.

The visual must fit within 520px wide. No JavaScript. No SVG. No external fonts.

The Signal:
${parsed.content}

Return ONLY valid JSON:
{
  "type": "chart" | "grid",
  "html": "complete self-contained HTML string with all styles inline"
}`;

        const visualResponse = await callClaude(
          systemPrompt,
          [{ role: "user", content: visualPrompt }],
          2000
        );

        try {
          const cleanedVisual = visualResponse.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          const visualParsed = JSON.parse(cleanedVisual) as { type: string; html: string };
          visualHtml = visualParsed.html;
        } catch (parseErr) {
          console.error("[generate-draft] Failed to parse visual response:", parseErr);
          console.error("[generate-draft] Raw visual response:", visualResponse);
        }
      }
    }

    const subjectPrompt = `Given these newsletter sections, write a compelling subject line and preview text.

Sections summary:
${sections.map((s) => `${s.name}: ${s.content.slice(0, 100)}`).join("\n")}

Return ONLY valid JSON:
{
  "subject_line": "...",
  "preview_text": "..."
}`;

    const metaResponse = await callClaude(
      systemPrompt,
      [{ role: "user", content: subjectPrompt }],
      300
    );

    let subjectLine = `Venture News — ${job.week}`;
    let previewText = "";

    try {
      const cleanedMeta = metaResponse.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const meta = JSON.parse(cleanedMeta) as {
        subject_line: string;
        preview_text: string;
      };
      subjectLine = meta.subject_line;
      previewText = meta.preview_text;
    } catch (parseErr) {
      console.error("[generate-draft] Failed to parse subject/preview:", parseErr);
      console.error("[generate-draft] Raw response:", metaResponse);
      // use defaults
    }

    const reviewToken = randomBytes(32).toString("hex");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const reviewUrl = `${baseUrl}/review?token=${reviewToken}`;

    await updateJob({
      status: "awaiting_review",
      draft: { subject_line: subjectLine, preview_text: previewText, sections, visual: visualHtml },
      review_token: reviewToken,
    });

    await sendReviewEmail(reviewUrl, job.week).catch((err) => {
      console.error("Email send failed:", err);
    });

    return NextResponse.json({ ok: true, review_url: reviewUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateJob({ status: "failed", error: message }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
