const BUTTONDOWN_API_BASE = "https://api.buttondown.email/v1";

interface ButtondownEmailResponse {
  id: string;
  status: string;
  subject: string;
}

export async function createDraftPost(
  title: string,
  htmlContent: string,
  _previewText?: string
): Promise<string> {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) throw new Error("BUTTONDOWN_API_KEY is not set");

  const url = `${BUTTONDOWN_API_BASE}/emails`;
  console.log("[buttondown] POST", url);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKey}`,
    },
    body: JSON.stringify({
      subject: title,
      body: htmlContent,
      status: "draft",
    }),
  });

  const responseText = await res.text();
  console.log("[buttondown] response status:", res.status, "body:", responseText);

  if (!res.ok) {
    throw new Error(`Buttondown createDraft error ${res.status}: ${responseText}`);
  }

  const data = JSON.parse(responseText) as ButtondownEmailResponse;
  return data.id;
}
