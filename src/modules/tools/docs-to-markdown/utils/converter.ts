export interface ConversionOptions {
  stripGoogleRedirects: boolean;
  boldMarker: '**' | '__';
  italicMarker: '*' | '_';
  strikethrough: boolean;
  tableFormatting: boolean;
  preserveConsecutiveLineBreaks: boolean;
}

export const DEFAULT_OPTIONS: ConversionOptions = {
  stripGoogleRedirects: true,
  boldMarker: '**',
  italicMarker: '*',
  strikethrough: true,
  tableFormatting: true,
  preserveConsecutiveLineBreaks: false,
};

/**
 * Strips Google's redirect tracking wrappers (https://www.google.com/url?q=...)
 * and returns the true destination URL.
 */
export function unwrapGoogleUrl(url: string): string {
  if (!url) return '';
  try {
    if (url.includes('google.com/url?')) {
      const parsed = new URL(url);
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target) {
        return decodeURIComponent(target);
      }
    }
  } catch {
    // If not a valid parseable URL, return original
  }
  return url;
}

/**
 * Wraps text with inline markdown markers while keeping leading/trailing whitespace external.
 * Example: "  hello  " with "**" becomes "  **hello**  "
 */
function wrapWithMarker(text: string, marker: string): string {
  if (!text || !text.trim()) return text;
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return `${marker}${text}${marker}`;
  const [, leading, core, trailing] = match;
  return `${leading}${marker}${core}${marker}${trailing}`;
}

/**
 * Helper to determine if an element has bold formatting in Google Docs / Word.
 * Google Docs puts `<b style="font-weight:normal" id="docs-internal-guid-...">` at the root,
 * so we must check if font-weight is explicitly 400/normal.
 */
function isBoldElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const style = element.getAttribute('style') || '';
  const fontWeightMatch = style.match(/font-weight\s*:\s*([^;]+)/i);

  if (fontWeightMatch) {
    const val = fontWeightMatch[1].trim().toLowerCase();
    if (val === 'bold' || val === '700' || val === '800' || val === '900') return true;
    if (val === 'normal' || val === '400' || val === '300') return false;
  }

  return tagName === 'b' || tagName === 'strong';
}

function isItalicElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const style = element.getAttribute('style') || '';
  if (/font-style\s*:\s*italic/i.test(style)) return true;
  return tagName === 'i' || tagName === 'em';
}

function isStrikethroughElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const style = element.getAttribute('style') || '';
  if (/text-decoration(?:-line)?\s*:[^;]*line-through/i.test(style)) return true;
  return tagName === 's' || tagName === 'strike' || tagName === 'del';
}

function isCodeElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'code' || tagName === 'samp' || tagName === 'kbd') return true;
  const style = element.getAttribute('style') || '';
  if (/font-family\s*:[^;]*(?:Consolas|Courier|monospace|Source Code)/i.test(style)) return true;
  return false;
}

/**
 * Convert an HTML Table element into a GitHub Flavored Markdown (GFM) table.
 */
function convertHtmlTable(table: HTMLTableElement, options: ConversionOptions): string {
  if (!options.tableFormatting) return table.textContent || '';

  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  const parsedGrid: string[][] = [];
  let maxCols = 0;

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>('th, td'));
    const rowValues = cells.map((cell) => {
      // Convert cell contents, replacing inner newlines with <br> to preserve GFM table format
      const cellContent = convertNode(cell, options, 0).trim();
      return cellContent.replace(/\n+/g, '<br>').replace(/\|/g, '\\|');
    });
    if (rowValues.length > maxCols) maxCols = rowValues.length;
    parsedGrid.push(rowValues);
  }

  if (maxCols === 0) return '';

  // Pad any rows that have fewer columns than maxCols
  const normalizedGrid = parsedGrid.map((row) => {
    while (row.length < maxCols) row.push('');
    return row;
  });

  const lines: string[] = [];
  const headerRow = normalizedGrid[0];
  lines.push(`| ${headerRow.join(' | ')} |`);
  lines.push(`| ${Array(maxCols).fill('---').join(' | ')} |`);

  for (let i = 1; i < normalizedGrid.length; i += 1) {
    lines.push(`| ${normalizedGrid[i].join(' | ')} |`);
  }

  return `\n\n${lines.join('\n')}\n\n`;
}

/**
 * Traverses a DOM node and transforms it into Markdown.
 */
function convertNode(node: Node, options: ConversionOptions, listDepth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Handle hidden elements or meta wrappers
  if (tag === 'script' || tag === 'style' || tag === 'meta' || tag === 'link') {
    return '';
  }

  // Preformatted Code Block
  if (tag === 'pre') {
    const code = el.textContent || '';
    return `\n\n\`\`\`\n${code.replace(/\r\n/g, '\n').trim()}\n\`\`\`\n\n`;
  }

  // Tables
  if (tag === 'table') {
    return convertHtmlTable(el as HTMLTableElement, options);
  }

  // Horizontal Rule
  if (tag === 'hr') {
    return '\n\n---\n\n';
  }

  // Line breaks
  if (tag === 'br') {
    return '\n';
  }

  // Headings
  const headingMatch = tag.match(/^h([1-6])$/);
  if (headingMatch) {
    const level = parseInt(headingMatch[1], 10);
    const prefix = '#'.repeat(level);
    const content = convertChildren(el, options, listDepth).trim();
    return `\n\n${prefix} ${content}\n\n`;
  }

  // Blockquote
  if (tag === 'blockquote') {
    const content = convertChildren(el, options, listDepth).trim();
    const quoted = content
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    return `\n\n${quoted}\n\n`;
  }

  // Lists (UL / OL)
  if (tag === 'ul' || tag === 'ol') {
    const isOrdered = tag === 'ol';
    const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
    let listOutput = '\n';

    items.forEach((item, index) => {
      const indent = '  '.repeat(listDepth);
      const bullet = isOrdered ? `${index + 1}. ` : '- ';
      const itemContent = convertChildren(item as HTMLElement, options, listDepth + 1).trim();
      listOutput += `${indent}${bullet}${itemContent}\n`;
    });

    return `${listOutput}\n`;
  }

  // List Item (if encountered outside of ul/ol handler)
  if (tag === 'li') {
    const indent = '  '.repeat(listDepth);
    const content = convertChildren(el, options, listDepth).trim();
    return `${indent}- ${content}\n`;
  }

  // Anchor Links
  if (tag === 'a') {
    let href = el.getAttribute('href') || '';
    if (options.stripGoogleRedirects) {
      href = unwrapGoogleUrl(href);
    }
    const text = convertChildren(el, options, listDepth).trim();
    if (!href) return text;
    if (!text) return href;
    return `[${text}](${href})`;
  }

  // Images
  if (tag === 'img') {
    const src = el.getAttribute('src') || '';
    const alt = el.getAttribute('alt') || 'image';
    if (!src) return '';
    return `![${alt}](${src})`;
  }

  // Paragraphs or Div blocks
  if (tag === 'p' || tag === 'div') {
    const content = convertChildren(el, options, listDepth);
    // Don't add double newlines if inside a list
    if (listDepth > 0) {
      return content;
    }
    return `\n\n${content.trim()}\n\n`;
  }

  // Inline formatting
  let result = convertChildren(el, options, listDepth);

  if (isCodeElement(el)) {
    result = `\`${result.trim()}\``;
  }

  if (options.strikethrough && isStrikethroughElement(el)) {
    result = wrapWithMarker(result, '~~');
  }

  if (isBoldElement(el)) {
    result = wrapWithMarker(result, options.boldMarker);
  }

  if (isItalicElement(el)) {
    result = wrapWithMarker(result, options.italicMarker);
  }

  return result;
}

/**
 * Traverses child nodes of an element and concatenates their markdown output.
 */
function convertChildren(element: HTMLElement, options: ConversionOptions, listDepth: number): string {
  let output = '';
  for (const child of Array.from(element.childNodes)) {
    output += convertNode(child, options, listDepth);
  }
  return output;
}

/**
 * Main conversion entry point: Takes raw HTML (or rich clipboard payload)
 * and turns it into clean GitHub-Flavored Markdown.
 */
export function convertHtmlToMarkdown(html: string, options: Partial<ConversionOptions> = {}): string {
  const resolvedOptions: ConversionOptions = { ...DEFAULT_OPTIONS, ...options };

  if (!html || !html.trim()) return '';

  // If input doesn't contain HTML tags, treat as plain text
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html.trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Strip Google Docs comment sidebars or footnote popovers if present
  const docBody = doc.body;

  let markdown = convertChildren(docBody, resolvedOptions, 0);

  // Post-processing: normalize excessive line breaks
  if (!resolvedOptions.preserveConsecutiveLineBreaks) {
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
  }

  return markdown.trim();
}
