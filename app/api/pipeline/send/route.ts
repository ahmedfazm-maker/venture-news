import { NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/kv";
import { renderNewsletterHtml } from "@/lib/email-template";
import { createDraftPost } from "@/lib/beehiiv";

async function sendConfirmationEmail(
  postId: string,
  week: string,
  pubId: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[send] RESEND_API_KEY not set. Beehiiv post created: ${postId}`);
    return;
  }

  const emails = (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (emails.length === 0) return;

  const beehiivDraftUrl = `https://app.beehiiv.com/publications/${pubId}/posts/${postId}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: emails,
      subject: `Venture News draft created in Beehiiv — Week ${week}`,
      html: `
        <p>The newsletter draft for <strong>${week}</strong> has been created in Beehiiv as a <strong>draft</strong>.</p>
        <p>Post ID: <code>${postId}</code></p>
        <p><a href="${beehiivDraftUrl}" style="background:#111;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">View in Beehiiv</a></p>
        <p style="color:#888;font-size:12px;">Schedule and send it from the Beehiiv dashboard when ready.</p>
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
    if (!job.draft) {
      return NextResponse.json({ error: "No draft on job" }, { status: 400 });
    }
    if (job.status !== "approved") {
      return NextResponse.json(
        { error: `Job status is "${job.status}", expected "approved"` },
        { status: 409 }
      );
    }

    const htmlContent = renderNewsletterHtml(job.draft);

    const postId = await createDraftPost(
      job.draft.subject_line,
      htmlContent,
      job.draft.preview_text
    );

    await updateJob({
      status: "sent",
      beehiiv_post_id: postId,
    });

    const pubId = process.env.BEEHIIV_PUBLICATION_ID ?? "";
    await sendConfirmationEmail(postId, job.week, pubId).catch((err) => {
      console.error("Confirmation email failed:", err);
    });

    return NextResponse.json({ ok: true, beehiiv_post_id: postId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateJob({ status: "failed", error: message }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
