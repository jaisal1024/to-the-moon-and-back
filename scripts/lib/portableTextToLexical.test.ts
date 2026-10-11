import { describe, expect, it } from 'vitest';

import {
  lexicalToPlainText,
  type PortableTextNode,
  portableTextToLexical,
  portableTextToPlainText,
} from './portableTextToLexical';

const span = (text: string, marks: string[] = []) => ({ _type: 'span' as const, text, marks });
const block = (children: ReturnType<typeof span>[], extra: Record<string, unknown> = {}) =>
  ({ _type: 'block', style: 'normal', markDefs: [], children, ...extra }) as PortableTextNode;

const root = (blocks: PortableTextNode[]) => portableTextToLexical(blocks).root;

describe('portableTextToLexical', () => {
  it('maps styles to paragraph, heading, and quote nodes', () => {
    const nodes = root([
      block([span('p')]),
      block([span('two')], { style: 'h2' }),
      block([span('three')], { style: 'h3' }),
      block([span('q')], { style: 'blockquote' }),
    ]).children!;

    expect(nodes.map((n) => [n.type, n.tag])).toEqual([
      ['paragraph', undefined],
      ['heading', 'h2'],
      ['heading', 'h3'],
      ['quote', undefined],
    ]);
  });

  it('combines decorator marks into the Lexical format bitmask', () => {
    const [paragraph] = root([block([span('a', ['strong']), span('b', ['em', 'code']), span('c')])]).children!;
    expect(paragraph.children!.map((t) => [t.text, t.format])).toEqual([
      ['a', 1],
      ['b', 18],
      ['c', 0],
    ]);
  });

  it('wraps consecutive spans sharing a link annotation in one link node', () => {
    const [paragraph] = root([
      block([span('see '), span('the ', ['l1']), span('docs', ['l1', 'strong']), span(' now')], {
        markDefs: [{ _key: 'l1', _type: 'link', href: 'https://example.com' }],
      }),
    ]).children!;

    const [before, link, after] = paragraph.children!;
    expect(before.text).toBe('see ');
    expect(link).toMatchObject({
      type: 'link',
      version: 3,
      fields: { linkType: 'custom', url: 'https://example.com', newTab: true },
    });
    expect(link.children!.map((t) => [t.text, t.format])).toEqual([
      ['the ', 0],
      ['docs', 1],
    ]);
    expect(after.text).toBe(' now');
  });

  it('opens relative links in the same tab', () => {
    const [paragraph] = root([
      block([span('home', ['l'])], { markDefs: [{ _key: 'l', _type: 'link', href: '/about' }] }),
    ]).children!;
    expect(paragraph.children![0].fields).toMatchObject({ url: '/about', newTab: false });
  });

  it('groups consecutive list items and starts a new list when the type changes', () => {
    const nodes = root([
      block([span('a')], { listItem: 'bullet', level: 1 }),
      block([span('b')], { listItem: 'bullet', level: 1 }),
      block([span('1')], { listItem: 'number', level: 1 }),
      block([span('after')]),
      block([span('c')], { listItem: 'bullet', level: 1 }),
    ]).children!;

    expect(nodes.map((n) => [n.type, n.listType, n.children!.length])).toEqual([
      ['list', 'bullet', 2],
      ['list', 'number', 1],
      ['paragraph', undefined, 1],
      ['list', 'bullet', 1],
    ]);
    expect(nodes[0].children!.map((item) => [item.type, item.value])).toEqual([
      ['listitem', 1],
      ['listitem', 2],
    ]);
    expect(nodes[1].tag).toBe('ol');
  });

  it('converts code blocks to the Code block and defaults a missing language', () => {
    const [withLang, withoutLang] = root([
      { _type: 'codeBlock', _key: 'k1', code: 'const a = 1;', language: 'javascript' },
      { _type: 'codeBlock', _key: 'k2', code: 'let b;', language: null },
    ]).children!;

    expect(withLang).toMatchObject({
      type: 'block',
      version: 2,
      fields: { id: 'k1', blockType: 'Code', language: 'javascript', code: 'const a = 1;' },
    });
    expect(withoutLang.fields).toMatchObject({ language: 'typescript' });
  });

  it('turns line breaks inside spans into linebreak nodes', () => {
    const [paragraph] = root([block([span('one\ntwo', ['strong'])])]).children!;
    expect(paragraph.children!.map((n) => [n.type, n.text, n.format])).toEqual([
      ['text', 'one', 1],
      ['linebreak', undefined, undefined],
      ['text', 'two', 1],
    ]);
  });

  it('refuses nested list items instead of flattening them', () => {
    expect(() => root([block([span('deep')], { listItem: 'bullet', level: 2 })])).toThrow(/Nested list/);
  });

  it('refuses unknown block types instead of dropping them', () => {
    expect(() => root([{ _type: 'image', _key: 'img1' } as unknown as PortableTextNode])).toThrow(/Unsupported.*image/);
  });

  it('skips empty spans', () => {
    const [paragraph] = root([block([span(''), span('x')])]).children!;
    expect(paragraph.children).toHaveLength(1);
  });
});

describe('plain text verification', () => {
  it('extracts the same text from both representations', () => {
    const blocks: PortableTextNode[] = [
      block([span('Title')], { style: 'h2' }),
      block([span('Read '), span('this', ['l'])], { markDefs: [{ _key: 'l', _type: 'link', href: 'https://x.y' }] }),
      block([span('item')], { listItem: 'bullet', level: 1 }),
      { _type: 'codeBlock', code: 'a\n  b' },
    ];
    expect(lexicalToPlainText(portableTextToLexical(blocks))).toBe(portableTextToPlainText(blocks));
  });
});
