import type { Job, DraftVisual } from "./kv";

type Draft = NonNullable<Job["draft"]>;

const TEAL = "#0F6E56";
const NAVY = "#0C1929";
const BODY_COLOR = "#2C2C2A";
const DIVIDER = "#E5E3DC";
const LABEL_COLOR = "#0F6E56";

export function renderNewsletterHtml(draft: Draft): string {
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const weekLabel = draft.sections.length > 0
    ? extractWeekFromSubject()
    : dateLabel;

  const sectionsHtml = draft.sections
    .map((section, index) => {
      const isSignal = section.id === "the_signal";

      let contentHtml: string;
      if (isSignal) {
        const paragraphs = section.content.split(/\n\n+/);
        const firstPara = markdownToHtml(paragraphs[0]);
        const restParas = paragraphs.slice(1).join("\n\n");
        const restHtml = restParas ? markdownToHtml(restParas) : "";
        const visualBlock = draft.visual
          ? renderMetricGrid(draft.visual)
          : renderVisualPlaceholder();
        contentHtml = `${firstPara}${visualBlock}${restHtml}`;
      } else {
        contentHtml = markdownToHtml(section.content);
      }

      const divider = index === 0
        ? ""
        : `\n          <tr><td style="padding: 0 24px;"><div style="height: 1px; background-color: ${DIVIDER};"></div></td></tr>`;

      return `${divider}
          <tr>
            <td style="padding: 28px 24px 24px;">
              <p style="margin: 0 0 8px; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${LABEL_COLOR};">${escapeHtml(section.name)}</p>
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.7; color: ${BODY_COLOR};">${contentHtml}</div>
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
      .email-wrapper { padding: 0 !important; }
      .email-container { width: 100% !important; border-radius: 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F0EFE9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

  <!-- Hidden preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; color: #F0EFE9;">${escapeHtml(draft.preview_text)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td class="email-wrapper" align="center" style="padding: 32px 16px 48px; background-color: #F0EFE9;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background-color: ${NAVY}; padding: 36px 24px 32px;">
              <p style="margin: 0 0 10px; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #ffffff;">Venture News</p>
              <h1 style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: normal; color: #ffffff; line-height: 1.4;">${escapeHtml(draft.subject_line)}</h1>
              <p style="margin: 0; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #7A91A8;">${escapeHtml(weekLabel)}</p>
            </td>
          </tr>

          <!-- ── SECTIONS ── -->
          ${sectionsHtml}

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background-color: #F7F6F2; padding: 28px 24px 32px; border-top: 1px solid ${DIVIDER};">
              <p style="margin: 0 0 6px; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #999999; text-align: center; line-height: 1.6;">
                Venture News &middot; MENA &amp; Africa private markets intelligence
              </p>
              <p style="margin: 0; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #bbbbbb; text-align: center;">
                <a href="{{unsubscribe_url}}" style="color: #999999; text-decoration: underline;">Unsubscribe</a>
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

function renderMetricGrid(visual: DraftVisual): string {
  const metrics = visual.metrics.slice(0, 4);
  while (metrics.length < 4) {
    metrics.push({ label: "—", value: "—", source: "" });
  }

  const cell = (m: { label: string; value: string; source: string }) => `
              <td width="50%" valign="top" style="padding: 16px; background-color: #F7F6F2;">
                <p style="margin: 0 0 4px; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: bold; color: ${TEAL}; line-height: 1;">${escapeHtml(m.value)}</p>
                <p style="margin: 0 0 4px; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #555555; line-height: 1.4;">${escapeHtml(m.label)}</p>
                ${m.source ? `<p style="margin: 0; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 10px; color: #aaaaaa;">${escapeHtml(m.source)}</p>` : ""}
              </td>`;

  return `
            <table role="presentation" cellpadding="0" cellspacing="2" border="0" width="100%" style="margin: 20px 0; border-collapse: separate; border-spacing: 2px;">
              <tr>
                ${cell(metrics[0])}
                ${cell(metrics[1])}
              </tr>
              <tr>
                ${cell(metrics[2])}
                ${cell(metrics[3])}
              </tr>
            </table>`;
}

function renderVisualPlaceholder(): string {
  return `
            <div style="margin: 20px 0; padding: 32px 24px; background-color: #F7F6F2; text-align: center;">
              <p style="margin: 0; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #cccccc;">Data Visual</p>
            </div>`;
}

function extractWeekFromSubject(): string {
  const now = new Date();
  return now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
      result.push(`<li style="margin-bottom: 8px; line-height: 1.7;">${line.replace(/^[-•]\s+/, "")}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (line.trim() !== "") {
        result.push(line);
      }
    }
  }
  if (inList) result.push("</ul>");

  return result
    .join("\n")
    .split(/\n{2,}/)
    .map((chunk) => {
      chunk = chunk.trim();
      if (!chunk) return "";
      if (chunk.startsWith("<ul")) return chunk;
      return `<p style="margin: 0 0 16px; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.7; color: ${BODY_COLOR};">${chunk.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
