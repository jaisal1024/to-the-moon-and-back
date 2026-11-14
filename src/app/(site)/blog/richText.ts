// Plain rich-text blocks for blog posts. The presentation only knows these types; the CMS body
// (currently Sanity Portable Text) is mapped into them on the server.

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

type PortableSpan = { _type?: string; text?: string; marks?: string[] };
type PortableMarkDef = { _key: string; _type: string; href?: string };
type PortableNode = {
  _type: string;
  style?: string;
  listItem?: string;
  children?: PortableSpan[];
  markDefs?: PortableMarkDef[];
  code?: string;
  language?: string;
  filename?: string;
};

// The CMS content carries stray zero-width characters (e.g. a leading U+200D) and empty spacer paragraphs.
const ZERO_WIDTH = /[​-‍﻿]/g;
const DECORATORS: RichMark[] = ['strong', 'em', 'code'];

function toSpans(node: PortableNode): RichSpan[] {
  const links = new Map((node.markDefs ?? []).filter((d) => d._type === 'link').map((d) => [d._key, d.href]));
  return (node.children ?? []).flatMap((child) => {
    const text = (child.text ?? '').replace(ZERO_WIDTH, '');
    if (!text) return [];
    const marks = child.marks ?? [];
    const span: RichSpan = { text, marks: DECORATORS.filter((m) => marks.includes(m)) };
    const href = marks.map((m) => links.get(m)).find(Boolean);
    if (href) span.href = href;
    return [span];
  });
}

const isBlank = (spans: RichSpan[]) => !spans.some((s) => s.text.trim());

export function portableTextToRichBlocks(body: ReadonlyArray<PortableNode> | null | undefined): RichBlock[] {
  const blocks: RichBlock[] = [];
  for (const node of body ?? []) {
    if (node._type === 'code' || node._type === 'codeBlock') {
      if (!node.code) continue;
      blocks.push({
        type: 'code',
        code: node.code,
        ...(node.language ? { language: node.language } : {}),
        ...(node.filename ? { filename: node.filename } : {}),
      });
      continue;
    }
    if (node._type !== 'block') continue;
    const spans = toSpans(node);
    if (isBlank(spans)) continue;

    if (node.listItem) {
      const ordered = node.listItem === 'number';
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list' && last.ordered === ordered) last.items.push(spans);
      else blocks.push({ type: 'list', ordered, items: [spans] });
      continue;
    }
    const type = node.style === 'h2' || node.style === 'h3' ? node.style : 'paragraph';
    blocks.push({ type, spans });
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
