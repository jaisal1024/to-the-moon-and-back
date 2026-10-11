import { describe, expect, test } from 'vitest';

import { formatPostDate } from './formatPostDate';
import { lexicalToRichBlocks, splitComments } from './richText';

const text = (value: string, format = 0) => ({ type: 'text', text: value, format });
const body = (...children: unknown[]) => ({ root: { type: 'root', children } });

describe('lexicalToRichBlocks', () => {
  test('maps paragraphs, headings, format bits and links', () => {
    const blocks = lexicalToRichBlocks(
      body(
        {
          type: 'paragraph',
          children: [
            text('Re-post of original '),
            { type: 'link', fields: { url: 'https://example.com/post', newTab: true }, children: [text('post')] },
            text(' I wrote'),
          ],
        },
        { type: 'heading', tag: 'h2', children: [text('The Problem')] },
        { type: 'heading', tag: 'h3', children: [text('Bold', 1 | 2), text('x', 16)] },
      ),
    );

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

  test('maps bullet and numbered lists, flattening nested lists after their parent item', () => {
    const item = (...children: unknown[]) => ({ type: 'listitem', children });
    const blocks = lexicalToRichBlocks(
      body(
        { type: 'list', listType: 'bullet', children: [item(text('a')), item(text('b'))] },
        {
          type: 'list',
          listType: 'number',
          children: [
            item(text('one')),
            item({ type: 'list', listType: 'number', children: [item(text('nested'))] }),
            item(text('two')),
          ],
        },
      ),
    );
    expect(blocks).toEqual([
      { type: 'list', ordered: false, items: [[{ text: 'a', marks: [] }], [{ text: 'b', marks: [] }]] },
      {
        type: 'list',
        ordered: true,
        items: [[{ text: 'one', marks: [] }], [{ text: 'nested', marks: [] }], [{ text: 'two', marks: [] }]],
      },
    ]);
  });

  test('strips zero-width characters, drops empty spacer paragraphs and keeps line breaks', () => {
    const blocks = lexicalToRichBlocks(
      body(
        { type: 'paragraph', children: [text('\u200D')] },
        { type: 'paragraph', children: [text('\u200DIn short,'), { type: 'linebreak' }, text('it worked.')] },
        { type: 'heading', tag: 'h3', children: [text('\u200D', 16), text('Heading')] },
      ),
    );
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        spans: [
          { text: 'In short,', marks: [] },
          { text: '\n', marks: [] },
          { text: 'it worked.', marks: [] },
        ],
      },
      { type: 'h3', spans: [{ text: 'Heading', marks: [] }] },
    ]);
  });

  test('maps Code blocks with an optional language, and skips unknown nodes', () => {
    expect(
      lexicalToRichBlocks(
        body(
          { type: 'block', fields: { blockType: 'Code', code: 'const a = 1;' } },
          { type: 'block', fields: { blockType: 'Code', code: 'x()', language: 'ts' } },
          { type: 'block', fields: { blockType: 'Other' } },
          { type: 'horizontalrule' },
        ),
      ),
    ).toEqual([
      { type: 'code', code: 'const a = 1;' },
      { type: 'code', code: 'x()', language: 'ts' },
    ]);
    expect(lexicalToRichBlocks(undefined)).toEqual([]);
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
