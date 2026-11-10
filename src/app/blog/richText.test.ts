import { describe, expect, test } from 'vitest';

import { formatPostDate } from './formatPostDate';
import { portableTextToRichBlocks, splitComments } from './richText';

const span = (text: string, marks: string[] = []) => ({ _type: 'span', text, marks });

describe('portableTextToRichBlocks', () => {
  test('maps block styles, decorators and links from markDefs', () => {
    const blocks = portableTextToRichBlocks([
      {
        _type: 'block',
        style: 'normal',
        children: [span('Re-post of original '), span('post', ['l1']), span(' I wrote')],
        markDefs: [{ _key: 'l1', _type: 'link', href: 'https://example.com/post' }],
      },
      { _type: 'block', style: 'h2', children: [span('The Problem')], markDefs: [] },
      { _type: 'block', style: 'h3', children: [span('Bold', ['strong', 'em']), span('x', ['code'])], markDefs: [] },
    ]);

    expect(blocks).toEqual([
      {
        type: 'paragraph',
        spans: [
          { text: 'Re-post of original ', marks: [] },
          { text: 'post', marks: [], href: 'https://example.com/post' },
          { text: ' I wrote', marks: [] },
        ],
      },
      { type: 'h2', spans: [{ text: 'The Problem', marks: [] }] },
      {
        type: 'h3',
        spans: [
          { text: 'Bold', marks: ['strong', 'em'] },
          { text: 'x', marks: ['code'] },
        ],
      },
    ]);
  });

  test('groups consecutive list items into bullet and numbered lists', () => {
    const item = (text: string, listItem: string) => ({
      _type: 'block',
      style: 'normal',
      listItem,
      level: 1,
      children: [span(text)],
      markDefs: [],
    });
    const blocks = portableTextToRichBlocks([
      item('a', 'bullet'),
      item('b', 'bullet'),
      item('one', 'number'),
      item('two', 'number'),
    ]);
    expect(blocks).toEqual([
      { type: 'list', ordered: false, items: [[{ text: 'a', marks: [] }], [{ text: 'b', marks: [] }]] },
      { type: 'list', ordered: true, items: [[{ text: 'one', marks: [] }], [{ text: 'two', marks: [] }]] },
    ]);
  });

  test('strips zero-width characters and drops empty spacer paragraphs', () => {
    const blocks = portableTextToRichBlocks([
      { _type: 'block', style: 'normal', children: [span('‍')], markDefs: [] },
      { _type: 'block', style: 'normal', children: [span('‍In short, it worked.')], markDefs: [] },
      { _type: 'block', style: 'h3', children: [span('‍', ['code']), span('Heading')], markDefs: [] },
    ]);
    expect(blocks).toEqual([
      { type: 'paragraph', spans: [{ text: 'In short, it worked.', marks: [] }] },
      { type: 'h3', spans: [{ text: 'Heading', marks: [] }] },
    ]);
  });

  test('maps code blocks with optional filename and language, and skips unknown types', () => {
    expect(
      portableTextToRichBlocks([
        { _type: 'codeBlock', code: 'const a = 1;' },
        { _type: 'code', code: 'x()', language: 'ts', filename: 'a.ts' },
        { _type: 'image' },
      ]),
    ).toEqual([
      { type: 'code', code: 'const a = 1;' },
      { type: 'code', code: 'x()', language: 'ts', filename: 'a.ts' },
    ]);
    expect(portableTextToRichBlocks(undefined)).toEqual([]);
  });
});

test('splitComments separates line and block comments but not "//" inside strings', () => {
  expect(splitComments('a(); // note\n/* b */ c = "http://x";')).toEqual([
    { text: 'a(); ', comment: false },
    { text: '// note', comment: true },
    { text: '\n', comment: false },
    { text: '/* b */', comment: true },
    { text: ' c = "http://x";', comment: false },
  ]);
});

test('formatPostDate formats in UTC', () => {
  expect(formatPostDate('2025-04-25T18:24:00.000Z')).toEqual({ date: 'April 25, 2025', dateTime: '2025-04-25' });
  expect(formatPostDate('2025-04-25T23:59:00.000Z').date).toBe('April 25, 2025');
  expect(formatPostDate(undefined)).toEqual({});
});
