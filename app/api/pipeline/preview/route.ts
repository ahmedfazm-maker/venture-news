import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/kv";
import { renderNewsletterHtml } from "@/lib/email-template";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const job = await getJob();
  if (!job) {
    return NextResponse.json({ error: "No active job" }, { status: 404 });
  }

  if (job.review_token !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!job.draft) {
    return NextResponse.json({ error: "No draft available" }, { status: 404 });
  }

  const html = renderNewsletterHtml(job.draft);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
