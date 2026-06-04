import type { Job } from "./kv";

type Draft = NonNullable<Job["draft"]>;

export function renderNewsletterHtml(draft: Draft): string {
  const sectionsHtml = draft.sections
    .map(
      (section) => `
    <tr>
      <td style="padding: 32px 40px 0;">
        <h2 style="margin: 0 0 12px; font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #111; border-bottom: 2px solid #111; padding-bottom: 6px;">
          ${escapeHtml(section.name)}
        </h2>
        <div style="font-family: Georgia, serif; font-size: 15px; line-height: 1.7; color: #333;">
          ${markdownToHtml(section.content)}
        </div>
      </td>
    </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(draft.subject_line)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f0; font-family: Georgia, serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f0;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e0e0d8;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; border-bottom: 3px solid #111;">
              <p style="margin: 0 0 4px; font-family: 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #888;">Venture News</p>
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #111; line-height: 1.3;">
                ${escapeHtml(draft.subject_line)}
              </h1>
              ${
                draft.preview_text
                  ? `<p style="margin: 10px 0 0; font-family: 'Helvetica Neue', sans-serif; font-size: 13px; color: #666; font-style: italic;">${escapeHtml(draft.preview_text)}</p>`
                  : ""
              }
            </td>
          </tr>

          <!-- Sections -->
          ${sectionsHtml}

          <!-- Footer -->
          <tr>
            <td style="padding: 40px; border-top: 1px solid #e0e0d8; margin-top: 32px;">
              <p style="margin: 0; font-family: 'Helvetica Neue', sans-serif; font-size: 11px; color: #aaa; text-align: center;">
                You're receiving this because you subscribed to Venture News.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^#{1,3}\s+(.+)$/gm, "<h3 style=\"margin: 16px 0 8px; font-size: 16px; font-weight: bold;\">$1</h3>")
    .replace(/^[-•]\s+(.+)$/gm, "<li style=\"margin-bottom: 6px;\">$1</li>")
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul style="margin: 0 0 16px; padding-left: 20px;">${match}</ul>`)
    .replace(/\n\n/g, "</p><p style=\"margin: 0 0 16px;\">")
    .replace(/\n/g, "<br>")
    .replace(/^(?!<[hup])(.+)/, "<p style=\"margin: 0 0 16px;\">$1</p>");
}
