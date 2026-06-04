import type { Job } from "./kv";

type Draft = NonNullable<Job["draft"]>;

export function renderNewsletterHtml(draft: Draft): string {
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sectionsHtml = draft.sections
    .map((section, index) => {
      const isFirst = index === 0;
      const isSignal = section.id === "the_signal";
      const divider = isFirst
        ? ""
        : `<tr><td style="padding: 0 40px;"><div style="height: 1px; background-color: #e8e8e2;"></div></td></tr>`;

      let contentHtml: string;
      if (isSignal && draft.visual) {
        const paragraphs = section.content.split(/\n\n+/);
        const firstPara = markdownToHtml(paragraphs[0]);
        const restParas = paragraphs.slice(1).join("\n\n");
        const restHtml = restParas ? markdownToHtml(restParas) : "";
        contentHtml = `${firstPara}${renderVisual(draft.visual)}${restHtml}`;
      } else {
        contentHtml = markdownToHtml(section.content);
      }

      return `${divider}
    <tr>
      <td style="padding: 32px 40px 28px;">
        <p style="margin: 0 0 10px; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #999;">${escapeHtml(section.name)}</p>
        <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.75; color: #222;">${contentHtml}</div>
      </td>
    </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(draft.subject_line)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .section-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .header-pad { padding: 28px 24px 20px !important; }
      .footer-pad { padding: 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f2ec; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(draft.preview_text)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f2f2ec;">
    <tr>
      <td align="center" style="padding: 32px 16px 48px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-top: 3px solid #111111;">

          <!-- ── HEADER ── -->
          <tr>
            <td class="header-pad" style="padding: 36px 40px 28px; border-bottom: 1px solid #e8e8e2;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0 0 6px; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #111;">Venture News</p>
                    <h1 style="margin: 0 0 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: normal; color: #111; line-height: 1.35;">${escapeHtml(draft.subject_line)}</h1>
                    <p style="margin: 0; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #999;">${escapeHtml(dateLabel)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── SECTIONS ── -->
          ${sectionsHtml}

          <!-- ── FOOTER ── -->
          <tr>
            <td class="footer-pad" style="padding: 28px 40px 36px; border-top: 3px solid #111111; background-color: #f9f9f7;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #111;">Venture News</p>
                    <p style="margin: 0 0 12px; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #999; line-height: 1.6;">
                      You're receiving this because you subscribed to Venture News.<br>
                      MENA &amp; Africa private markets intelligence, weekly.
                    </p>
                    <p style="margin: 0; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #bbb;">
                      <a href="{{unsubscribe_url}}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
                      &nbsp;&middot;&nbsp;
                      <a href="{{manage_preferences_url}}" style="color: #999; text-decoration: underline;">Manage preferences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

function renderVisual(html: string): string {
  return `<div style="margin: 24px 0; padding: 20px; background-color: #f9f9f7; border-left: 3px solid #111111; overflow: hidden;">${html}</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(text: string): string {
  if (!text) return "";

  const lines = text.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

    if (/^[-•]\s+/.test(line)) {
      if (!inList) {
        result.push('<ul style="margin: 0 0 16px; padding-left: 22px;">');
        inList = true;
      }
      result.push(`<li style="margin-bottom: 7px; line-height: 1.7;">${line.replace(/^[-•]\s+/, "")}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (line.trim() === "") {
        // blank line — paragraph break handled by wrapping below
      } else {
        result.push(line);
      }
    }
  }
  if (inList) result.push("</ul>");

  // join non-list, non-blank lines into paragraphs
  return result
    .join("\n")
    .split(/\n{2,}/)
    .map((chunk) => {
      chunk = chunk.trim();
      if (!chunk) return "";
      if (chunk.startsWith("<ul") || chunk.startsWith("<li")) return chunk;
      return `<p style="margin: 0 0 16px;">${chunk.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
