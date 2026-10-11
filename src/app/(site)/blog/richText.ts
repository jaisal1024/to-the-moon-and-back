// Plain rich-text blocks for blog posts. The presentation only knows these types; the CMS body
// (Payload's Lexical editor state) is mapped into them on the server.

type RichMark = 'strong' | 'em' | 'code';

export type RichSpan = {
  text: string;
  marks: RichMark[];
  href?: string;
};

export type RichBlock =
  | { type: 'paragraph' | 'h2' | 'h3'; spans: RichSpan[] }
  | { type: 'list'; ordered: boolean; items: RichSpan[][] }
  | { type: 'code'; code: string; language?: string; filename?: string };

// The slice of Lexical's serialized editor state the blog uses. Payload types the body loosely
// (children are open records), so nodes are read defensively.
type LexicalNode = {
  type?: string;
  children?: unknown[];
  text?: string;
  format?: unknown;
  tag?: string;
  listType?: string;
  fields?: { url?: string | null; blockType?: string; code?: string | null; language?: string | null };
};
type LexicalBody = { root?: { children?: unknown[] } } | null | undefined;

// Lexical text format bitmask.
const FORMAT: Array<[number, RichMark]> = [
  [1, 'strong'],
  [2, 'em'],
  [16, 'code'],
];

// Migrated content carries stray zero-width characters (e.g. a leading U+200D) and empty spacer paragraphs.
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;

const childrenOf = (node: LexicalNode) => (node.children ?? []) as LexicalNode[];

function toSpans(nodes: LexicalNode[], href?: string): RichSpan[] {
  return nodes.flatMap((node): RichSpan[] => {
    if (node.type === 'link' || node.type === 'autolink') {
      return toSpans(childrenOf(node), node.fields?.url || href);
    }
    const text = node.type === 'linebreak' ? '\n' : (node.text ?? '').replace(ZERO_WIDTH, '');
    if (node.type !== 'text' && node.type !== 'linebreak') return toSpans(childrenOf(node), href);
    if (!text) return [];
    const format = typeof node.format === 'number' ? node.format : 0;
    const span: RichSpan = { text, marks: FORMAT.filter(([bit]) => format & bit).map(([, mark]) => mark) };
    if (href) span.href = href;
    return [span];
  });
}

const isBlank = (spans: RichSpan[]) => !spans.some((s) => s.text.trim());

// One entry per list item; items of a nested list follow their parent item.
function toItems(list: LexicalNode): RichSpan[][] {
  return childrenOf(list).flatMap((item) => {
    const nested = childrenOf(item).filter((child) => child.type === 'list');
    const own = toSpans(childrenOf(item).filter((child) => child.type !== 'list'));
    return [...(isBlank(own) ? [] : [own]), ...nested.flatMap(toItems)];
  });
}

export function lexicalToRichBlocks(body: LexicalBody): RichBlock[] {
  const blocks: RichBlock[] = [];
  for (const node of (body?.root?.children ?? []) as LexicalNode[]) {
    if (node.type === 'block') {
      if (node.fields?.blockType !== 'Code' || !node.fields.code) continue;
      blocks.push({
        type: 'code',
        code: node.fields.code,
        ...(node.fields.language ? { language: node.fields.language } : {}),
      });
    } else if (node.type === 'list') {
      const items = toItems(node);
      if (items.length) blocks.push({ type: 'list', ordered: node.listType === 'number', items });
    } else if (node.type === 'paragraph' || node.type === 'heading') {
      const spans = toSpans(childrenOf(node));
      if (isBlank(spans)) continue;
      const type = node.type === 'heading' && (node.tag === 'h2' || node.tag === 'h3') ? node.tag : 'paragraph';
      blocks.push({ type, spans });
    }
  }
  return blocks;
}

// Splits source code into comment and non-comment runs, so comments can take the one accent colour.
export function splitComments(code: string): Array<{ text: string; comment: boolean }> {
  const parts: Array<{ text: string; comment: boolean }> = [];
  let plain = '';
  let i = 0;
  const flush = () => {
    if (plain) parts.push({ text: plain, comment: false });
    plain = '';
  };
  while (i < code.length) {
    const two = code.slice(i, i + 2);
    const c = code[i];
    if (two === '//' || two === '/*') {
      let end = two === '//' ? code.indexOf('\n', i) : code.indexOf('*/', i + 2);
      end = end < 0 ? code.length : two === '//' ? end : end + 2;
      flush();
      parts.push({ text: code.slice(i, end), comment: true });
      i = end;
    } else if (c === '"' || c === "'" || c === '`') {
      // skip string literals so a "//" inside one is not taken for a comment
      let q = i + 1;
      while (q < code.length && code[q] !== c && code[q] !== '\n') q += code[q] === '\\' ? 2 : 1;
      plain += code.slice(i, q + 1);
      i = q + 1;
    } else {
      plain += c;
      i++;
    }
  }
  flush();
  return parts;
}
