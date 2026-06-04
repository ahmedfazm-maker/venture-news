import type { Job, DraftVisual, VisualMetric } from "./kv";

type Draft = NonNullable<Job["draft"]>;
type Section = Draft["sections"][number];

const C = {
  teal:   "#02686F",
  accent: "#29BE9C",
  mint:   "#DCF1DD",
  black:  "#070C0C",
  white:  "#ffffff",
  gray:   "#888888",
  body:   "#1A1A18",
  bg:     "#EEF8F7",
} as const;

const SANS  = "-apple-system, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

// ─── Public entry point ───────────────────────────────────────────────────────

export function renderNewsletterHtml(draft: Draft): string {
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const sectionsHtml = draft.sections
    .map((s) => renderSection(s, draft))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${esc(draft.subject_line)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .ew { padding: 0 !important; }
      .ec { width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:${C.bg};">${esc(draft.preview_text)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td class="ew" align="center" style="padding:32px 16px 48px;background-color:${C.bg};">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="ec" style="max-width:600px;width:100%;background-color:${C.white};">

          <!-- HEADER -->
          <tr>
            <td style="background-color:${C.teal};padding:32px 28px 0;border-bottom:4px solid ${C.accent};">
              <p style="margin:0 0 10px;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${C.white};">Venture News</p>
              <p style="margin:0 0 24px;font-family:${SANS};font-size:13px;font-weight:500;color:${C.accent};">${esc(dateLabel)}</p>
            </td>
          </tr>

          <!-- SECTIONS -->
${sectionsHtml}

          <!-- FOOTER -->
          <tr>
            <td style="background-color:${C.black};padding:20px 28px;text-align:center;">
              <p style="margin:0 0 8px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.accent};">Venture News</p>
              <p style="margin:0;font-family:${SANS};font-size:11px;color:${C.gray};">
                MENA &amp; Africa private markets intelligence &nbsp;&middot;&nbsp;
                <a href="{{unsubscribe_url}}" style="color:${C.gray};text-decoration:underline;">Unsubscribe</a>
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

// ─── Section dispatcher ───────────────────────────────────────────────────────

function renderSection(section: Section, draft: Draft): string {
  switch (section.id) {
    case "the_signal":         return sectionSignal(section, draft);
    case "why_it_matters":     return sectionWhyItMatters(section);
    case "the_stack":          return sectionStack(section);
    case "the_translation_layer": return sectionTranslation(section);
    case "the_ecosystem_radar":   return sectionEcosystem(section);
    case "the_sign_off":       return sectionSignOff(section);
    default:                   return sectionDefault(section);
  }
}

// ─── Section renderers ────────────────────────────────────────────────────────

function sectionSignal(section: Section, draft: Draft): string {
  const paras = section.content.split(/\n\n+/);
  const firstPara = paras[0].trim();
  const rest = paras.slice(1).join("\n\n").trim();

  const leadHtml = `<div style="border-left:4px solid ${C.accent};padding-left:16px;margin:0 0 20px;">
              <p style="margin:0;font-family:${SERIF};font-size:18px;font-weight:500;line-height:1.65;color:${C.black};">${inlineMarkdown(firstPara)}</p>
            </div>`;

  const visualHtml = draft.visual ? renderMetricGrid(draft.visual) : renderVisualPlaceholder();
  const restHtml   = rest ? bodyText(rest) : "";

  return wrapSection(section.name, `${leadHtml}${visualHtml}${restHtml}`, { pad: "28px 28px 24px" });
}

function sectionWhyItMatters(section: Section): string {
  const label = pill(section.name, { bg: C.black, color: C.accent, border: `1px solid ${C.accent}` });
  const body  = `<div style="font-family:${SERIF};font-size:16px;line-height:1.7;color:${C.white};">${bodyText(section.content, C.white)}</div>`;
  return `
          <tr>
            <td style="background-color:${C.black};padding:28px 28px 24px;">
              ${label}
              <div style="height:12px;"></div>
              ${body}
            </td>
          </tr>`;
}

function sectionStack(section: Section): string {
  const items = section.content
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const cardsHtml = items.map((item) => `
              <div style="background-color:${C.white};border:1px solid ${C.mint};border-left:3px solid ${C.accent};padding:12px 16px;margin-bottom:8px;">
                <p style="margin:0;font-family:${SERIF};font-size:15px;line-height:1.65;color:${C.body};">${inlineMarkdown(item)}</p>
              </div>`).join("\n");

  return wrapSection(section.name, cardsHtml, { pad: "28px 28px 24px" });
}

function sectionTranslation(section: Section): string {
  // First paragraph treated as the term definition; rest is body
  const paras = section.content.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  const term  = paras[0] ?? "";
  const rest  = paras.slice(1).join("\n\n");

  const termHtml = `<p style="margin:0 0 14px;font-family:${SERIF};font-size:18px;font-weight:600;line-height:1.5;color:${C.teal};">${inlineMarkdown(term)}</p>`;
  const restHtml = rest ? `<div style="font-family:${SERIF};font-size:16px;line-height:1.7;color:${C.black};">${bodyText(rest, C.black)}</div>` : "";

  const label = pill(section.name, { bg: C.teal, color: C.white });
  return `
          <tr>
            <td style="background-color:${C.mint};padding:28px 28px 24px;">
              ${label}
              <div style="height:14px;"></div>
              ${termHtml}
              ${restHtml}
            </td>
          </tr>`;
}

function sectionEcosystem(section: Section): string {
  // Render bullet lines with ● in accent color
  const lines = section.content
    .split("\n")
    .map((raw) => raw.trim())
    .filter(Boolean);

  const itemsHtml = lines.map((line) => {
    const text = line.replace(/^[-•●]\s*/, "");
    return `<tr>
                <td width="20" valign="top" style="padding:0 8px 12px 0;">
                  <span style="font-family:${SANS};font-size:14px;color:${C.accent};line-height:1.65;">&#9679;</span>
                </td>
                <td valign="top" style="padding:0 0 12px;">
                  <p style="margin:0;font-family:${SERIF};font-size:15px;line-height:1.65;color:${C.body};">${inlineMarkdown(text)}</p>
                </td>
              </tr>`;
  }).join("\n");

  const listHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${itemsHtml}</table>`;
  return wrapSection(section.name, listHtml, { pad: "28px 28px 24px" });
}

function sectionSignOff(section: Section): string {
  const content = `<p style="margin:0;font-family:${SERIF};font-size:15px;font-style:italic;line-height:1.7;color:${C.teal};text-align:center;">${inlineMarkdown(section.content.trim())}</p>`;
  return `
          <tr>
            <td style="padding:32px 40px;text-align:center;border-top:1px solid ${C.mint};">
              ${content}
            </td>
          </tr>`;
}

function sectionDefault(section: Section): string {
  return wrapSection(section.name, bodyText(section.content), { pad: "28px 28px 24px", border: `1px solid ${C.mint}` });
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

function renderMetricGrid(visual: DraftVisual): string {
  const m = [...visual.metrics];
  while (m.length < 4) m.push({ label: "—", value: "—", source: "" });

  const cell = (metric: VisualMetric, borderRight: boolean, borderBottom: boolean) => {
    const borders = [
      borderRight  ? `border-right:1px solid ${C.accent};`  : "",
      borderBottom ? `border-bottom:1px solid ${C.accent};` : "",
    ].join("");
    return `<td width="50%" align="center" valign="top" style="padding:16px;${borders}">
                <p style="margin:0;font-family:${SERIF};font-size:32px;font-weight:700;line-height:1;color:${C.teal};">${esc(metric.value)}</p>
                <p style="margin:4px 0 0;font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.accent};">${esc(metric.label)}</p>
                ${metric.source ? `<p style="margin:2px 0 0;font-family:${SANS};font-size:10px;color:${C.gray};">${esc(metric.source)}</p>` : ""}
              </td>`;
  };

  return `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;background-color:${C.mint};border-radius:8px;border-collapse:collapse;">
              <tr>
                ${cell(m[0], true,  true)}
                ${cell(m[1], false, true)}
              </tr>
              <tr>
                ${cell(m[2], true,  false)}
                ${cell(m[3], false, false)}
              </tr>
            </table>`;
}

function renderVisualPlaceholder(): string {
  return `
            <div style="margin:20px 0;padding:32px 24px;background-color:${C.mint};text-align:center;border-radius:8px;">
              <p style="margin:0;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.accent};">Data Visual</p>
            </div>`;
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function wrapSection(
  name: string,
  contentHtml: string,
  opts: { pad?: string; border?: string } = {}
): string {
  const pad    = opts.pad    ?? "28px 28px 24px";
  const border = opts.border ? `border-top:${opts.border};` : `border-top:1px solid ${C.mint};`;
  return `
          <tr>
            <td style="${border}padding:${pad};">
              ${pill(name)}
              <div style="height:12px;"></div>
              ${contentHtml}
            </td>
          </tr>`;
}

function pill(
  name: string,
  opts: { bg?: string; color?: string; border?: string } = {}
): string {
  const bg     = opts.bg     ?? C.mint;
  const color  = opts.color  ?? C.teal;
  const border = opts.border ? `border:${opts.border};` : "";
  return `<span style="display:inline-block;background-color:${bg};color:${color};${border}font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:3px 10px;border-radius:4px;">${esc(name)}</span>`;
}

// ─── Text rendering ───────────────────────────────────────────────────────────

function bodyText(text: string, color: string = C.body): string {
  if (!text) return "";

  const lines = text.split("\n");
  const chunks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length) {
      chunks.push(`<ul style="margin:0 0 16px;padding-left:0;list-style:none;">${listItems.join("")}</ul>`);
      listItems = [];
    }
  };

  for (const raw of lines) {
    const isBullet = /^[-•●]\s+/.test(raw);
    if (isBullet) {
      listItems.push(`<li style="margin-bottom:8px;padding-left:18px;position:relative;font-family:${SERIF};font-size:16px;line-height:1.7;color:${color};">
        <span style="position:absolute;left:0;color:${C.accent};">&#9679;</span>${inlineMarkdown(raw.replace(/^[-•●]\s+/, ""))}</li>`);
    } else {
      flushList();
      if (raw.trim()) chunks.push(raw);
    }
  }
  flushList();

  return chunks
    .join("\n")
    .split(/\n{2,}/)
    .map((chunk) => {
      chunk = chunk.trim();
      if (!chunk) return "";
      if (chunk.startsWith("<ul")) return chunk;
      return `<p style="margin:0 0 16px;font-family:${SERIF};font-size:16px;line-height:1.7;color:${color};">${chunk.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

function inlineMarkdown(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function esc(text: string): string {
  return (text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
