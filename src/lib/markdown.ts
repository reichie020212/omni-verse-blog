const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTITIES[c]!);
}

const ALLOWED_SCHEME = /^(?:https?:|mailto:)/i;

/**
 * Render a tiny markdown subset to a safe HTML string.
 * Supports: **bold**, *italic*, `code`, [text](url), \n -> <br />.
 * Everything else is HTML-escaped. Unknown link schemes render as the literal source.
 */
export function renderMarkdownSubset(input: string): string {
  if (!input) return '';

  // Pass 1: extract code spans (their content is escaped but not further parsed).
  const codes: string[] = [];
  let text = input.replace(/`([^`\n]+)`/g, (_m, body: string) => {
    codes.push(`<code>${escapeHtml(body)}</code>`);
    return ` C${codes.length - 1} `;
  });

  // Pass 2: extract links (rejecting disallowed schemes).
  const links: string[] = [];
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => {
    if (!ALLOWED_SCHEME.test(url)) return m; // render as literal
    links.push(
      `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`,
    );
    return ` L${links.length - 1} `;
  });

  // Pass 3: escape everything else.
  text = escapeHtml(text);

  // Pass 4: bold then italic. Bold first so `**foo *bar***` becomes <strong>foo <em>bar</em></strong>.
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');

  // Pass 5: newlines.
  text = text.replace(/\n/g, '<br />');

  // Pass 6: re-insert code and link placeholders.
  text = text.replace(/ C(\d+) /g, (_m, i: string) => codes[Number(i)]!);
  text = text.replace(/ L(\d+) /g, (_m, i: string) => links[Number(i)]!);

  return text;
}
