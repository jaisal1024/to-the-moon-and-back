/**
 * Converts the Sanity Portable Text used by blog posts into the Lexical JSON that
 * Payload's richText field stores. Covers exactly what the Sanity schema allowed:
 * normal/h2/h3/blockquote styles, bullet/number lists, strong/em/code/underline/
 * strike-through marks, link annotations, and the custom `codeBlock` type.
 * Node shapes mirror Payload's own Markdown converter output.
 */

export type PortableTextSpan = { _type: 'span'; text: string; marks?: string[] };
export type PortableTextMarkDef = { _key: string; _type: string; href?: string };
export type PortableTextBlock = {
  _type: 'block';
  _key?: string;
  style?: string;
  listItem?: 'bullet' | 'number';
  level?: number;
  children: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
};
export type PortableTextCode = {
  _type: 'codeBlock' | 'code';
  _key?: string;
  code?: string;
  language?: string | null;
};
export type PortableTextNode = PortableTextBlock | PortableTextCode;

type LexicalNode = { type: string; version: number; children?: LexicalNode[]; [key: string]: unknown };
type LexicalRoot = LexicalNode & {
  type: 'root';
  children: LexicalNode[];
  direction: 'ltr';
  format: '';
  indent: number;
};
export type LexicalState = { root: LexicalRoot };

// Lexical text format bitmask.
const FORMAT: Record<string, number> = {
  'strong': 1,
  'em': 2,
  'strike-through': 4,
  'underline': 8,
  'code': 16,
};

const DEFAULT_CODE_LANGUAGE = 'typescript';

const element = (type: string, children: LexicalNode[], extra: Record<string, unknown> = {}): LexicalNode => ({
  type,
  version: 1,
  direction: 'ltr',
  format: '',
  indent: 0,
  ...extra,
  children,
});

const textNode = (text: string, format: number): LexicalNode => ({
  type: 'text',
  version: 1,
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text,
});

/** Converts a block's spans to text nodes, wrapping runs that share a link in a link node. */
function convertSpans(block: PortableTextBlock): LexicalNode[] {
  const defs = new Map((block.markDefs ?? []).map((def) => [def._key, def]));
  const out: LexicalNode[] = [];
  let currentLink: { key: string; node: LexicalNode } | null = null;

  for (const span of block.children ?? []) {
    if (!span.text) continue;
    const marks = span.marks ?? [];
    const format = marks.reduce((acc, mark) => acc | (FORMAT[mark] ?? 0), 0);
    const linkKey = marks.find((mark) => defs.get(mark)?._type === 'link');
    // Shift+Enter in Sanity stores "\n" inside a span; Lexical uses linebreak nodes.
    const pieces = span.text
      .split('\n')
      .flatMap((line, i) => [
        ...(i > 0 ? [{ type: 'linebreak', version: 1 }] : []),
        ...(line ? [textNode(line, format)] : []),
      ]);

    if (!linkKey) {
      currentLink = null;
      out.push(...pieces);
      continue;
    }
    if (currentLink?.key !== linkKey) {
      const href = defs.get(linkKey)?.href ?? '';
      currentLink = {
        key: linkKey,
        node: element('link', [], {
          version: 3,
          fields: { linkType: 'custom', newTab: /^https?:/.test(href), url: href },
          id: linkKey,
        }),
      };
      out.push(currentLink.node);
    }
    currentLink.node.children!.push(...pieces);
  }
  return out;
}

function convertBlock(block: PortableTextBlock): LexicalNode {
  const children = convertSpans(block);
  switch (block.style) {
    case 'h1':
    case 'h2':
      return element('heading', children, { tag: 'h2' });
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return element('heading', children, { tag: 'h3' });
    case 'blockquote':
      return element('quote', children);
    default:
      return element('paragraph', children, { textFormat: 0, textStyle: '' });
  }
}

function convertCode(node: PortableTextCode): LexicalNode {
  return {
    type: 'block',
    version: 2,
    format: '',
    fields: {
      id: node._key ?? crypto.randomUUID().replace(/-/g, '').slice(0, 24),
      blockName: '',
      blockType: 'Code',
      language: node.language || DEFAULT_CODE_LANGUAGE,
      code: node.code ?? '',
    },
  };
}

export function portableTextToLexical(blocks: PortableTextNode[]): LexicalState {
  const children: LexicalNode[] = [];
  let openList: LexicalNode | null = null;

  for (const node of blocks) {
    if (node._type === 'block' && node.listItem) {
      if ((node.level ?? 1) > 1) {
        // Current posts only use flat lists; fail loudly rather than flatten silently.
        throw new Error(`Nested list item (level ${node.level}) in block ${node._key ?? '?'} is not supported.`);
      }
      const listType = node.listItem === 'number' ? 'number' : 'bullet';
      if (!openList || openList.listType !== listType) {
        openList = element('list', [], { listType, start: 1, tag: listType === 'number' ? 'ol' : 'ul' });
        children.push(openList);
      }
      const value = openList.children!.length + 1;
      openList.children!.push(element('listitem', convertSpans(node), { value }));
      continue;
    }
    openList = null;
    if (node._type === 'block') children.push(convertBlock(node));
    else if (node._type === 'codeBlock' || node._type === 'code') children.push(convertCode(node));
    else {
      // Unknown types (images, embeds) would be dropped without changing the plain text,
      // so the text check could not catch them. Refuse instead.
      const unknown = node as { _type?: string; _key?: string };
      throw new Error(`Unsupported Portable Text type "${unknown._type}" in block ${unknown._key ?? '?'}.`);
    }
  }

  return { root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children } };
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Plain text of Portable Text, used to verify a conversion lost no content. */
export function portableTextToPlainText(blocks: PortableTextNode[]): string {
  return normalize(
    blocks
      .map((node) =>
        node._type === 'block' ? (node.children ?? []).map((span) => span.text).join('') : (node.code ?? ''),
      )
      .join('\n'),
  );
}

/** Plain text of Lexical JSON, in the same shape as portableTextToPlainText. */
export function lexicalToPlainText(state: LexicalState): string {
  const parts: string[] = [];
  const walk = (node: LexicalNode) => {
    if (node.type === 'text') parts.push(String(node.text));
    if (node.type === 'linebreak') parts.push('\n');
    if (node.type === 'block') parts.push(`\n${String((node.fields as { code?: string }).code ?? '')}\n`);
    node.children?.forEach(walk);
    if (['paragraph', 'heading', 'quote', 'listitem'].includes(node.type)) parts.push('\n');
  };
  walk(state.root);
  return normalize(parts.join(''));
}
