import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/kv";
import type { Job } from "@/lib/kv";

interface ApproveBody {
  token: string;
  action: "approve" | "edit" | "reject";
  draft?: Job["draft"];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ApproveBody;
  try {
    body = (await request.json()) as ApproveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token, action, draft } = body;

  if (!token || !action) {
    return NextResponse.json(
      { error: "token and action are required" },
      { status: 400 }
    );
  }

  const job = await getJob();
  if (!job) {
    return NextResponse.json({ error: "No active job" }, { status: 404 });
  }

  if (job.review_token !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (job.status !== "awaiting_review") {
    return NextResponse.json(
      { error: `Job is in status "${job.status}", expected "awaiting_review"` },
      { status: 409 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (action === "approve" || action === "edit") {
    if (draft) {
      await updateJob({ draft, status: "approved" });
    } else {
      await updateJob({ status: "approved" });
    }

    const sendRes = await fetch(`${baseUrl}/api/pipeline/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!sendRes.ok) {
      const text = await sendRes.text();
      return NextResponse.json(
        { error: "send step failed", detail: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, action });
  }

  if (action === "reject") {
    await updateJob({ status: "signals_ready", draft: undefined, review_token: undefined });

    const genRes = await fetch(`${baseUrl}/api/pipeline/generate-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!genRes.ok) {
      const text = await genRes.text();
      return NextResponse.json(
        { error: "regenerate failed", detail: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, action: "rejected", message: "Regenerating draft" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
