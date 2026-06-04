import { NextRequest, NextResponse } from "next/server";
import { setJob } from "@/lib/kv";

function getWeekString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cronSecret = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || cronSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const week = getWeekString();

  await setJob({
    status: "started",
    week,
    started_at: new Date().toISOString(),
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const fetchRes = await fetch(`${baseUrl}/api/pipeline/fetch-signals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!fetchRes.ok) {
    const text = await fetchRes.text();
    return NextResponse.json(
      { error: "fetch-signals failed", detail: text },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, week });
}
