const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2";

function getCredentials(): { apiKey: string; pubId: string } {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey) throw new Error("BEEHIIV_API_KEY is not set");
  if (!pubId) throw new Error("BEEHIIV_PUBLICATION_ID is not set");
  return { apiKey, pubId };
}

interface BeehiivPostResponse {
  data: {
    id: string;
    status: string;
    web_url: string;
  };
}

export async function createDraftPost(
  title: string,
  htmlContent: string,
  previewText?: string
): Promise<string> {
  const { apiKey, pubId } = getCredentials();

  const body = {
    title,
    content: htmlContent,
    preview_text: previewText ?? "",
    status: "draft",
    content_tags: [],
  };

  const url = `${BEEHIIV_API_BASE}/publications/${pubId}/posts`;
  console.log("[beehiiv] POST", url, "pubId:", pubId);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  console.log("[beehiiv] response status:", res.status, "body:", responseText);

  if (!res.ok) {
    throw new Error(`Beehiiv createPost error ${res.status}: ${responseText}`);
  }

  const data = JSON.parse(responseText) as BeehiivPostResponse;
  return data.data.id;
}

export async function getPost(postId: string): Promise<BeehiivPostResponse["data"]> {
  const { apiKey, pubId } = getCredentials();

  const res = await fetch(
    `${BEEHIIV_API_BASE}/publications/${pubId}/posts/${postId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Beehiiv getPost error ${res.status}: ${error}`);
  }

  const data = (await res.json()) as BeehiivPostResponse;
  return data.data;
}
