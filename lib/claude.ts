import { readFileSync } from "fs";
import { join } from "path";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

export async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens = 2000
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  return data.content[0]?.text ?? "";
}

export function loadVoice(): string {
  return readFileSync(join(process.cwd(), "content/voice.md"), "utf-8");
}

export function loadSections(): object[] {
  const raw = readFileSync(
    join(process.cwd(), "content/sections.json"),
    "utf-8"
  );
  return JSON.parse(raw);
}

export function loadCalendar(): object {
  const raw = readFileSync(
    join(process.cwd(), "content/calendar.json"),
    "utf-8"
  );
  return JSON.parse(raw);
}

export function loadActivationRotation(): object[] {
  const raw = readFileSync(
    join(process.cwd(), "content/activation-rotation.json"),
    "utf-8"
  );
  return JSON.parse(raw);
}

export function buildSignalScoringPrompt(): string {
  const voice = loadVoice();
  return `You are a signal curator for a weekly venture and startup newsletter.

VOICE & AUDIENCE:
${voice}

Your job is to score news items for relevance, novelty, and insight value for founders and early-stage investors. Return ONLY valid JSON with no markdown.`;
}

export function buildDraftSystemPrompt(weekMod: number): string {
  const voice = loadVoice();
  const calendar = loadCalendar() as {
    profiles: Array<{
      week_mod: number;
      primary_profile: string;
      activation_type: string;
    }>;
  };
  const activation = loadActivationRotation() as Array<{
    week_mod: number;
    activation_type: string;
    copy: string;
  }>;

  const profile = calendar.profiles.find((p) => p.week_mod === weekMod);
  const act = activation.find((a) => a.week_mod === weekMod);

  return `You are a world-class newsletter writer for a venture and startup newsletter.

VOICE & STYLE:
${voice}

THIS WEEK'S PROFILE: ${profile?.primary_profile ?? "General"}
ACTIVATION TYPE: ${act?.activation_type ?? "story"}
ACTIVATION COPY: ${act?.copy ?? ""}

Write in a confident, insightful voice. Be opinionated where the data supports it. Avoid fluff. Return ONLY valid JSON with no markdown fences.`;
}
