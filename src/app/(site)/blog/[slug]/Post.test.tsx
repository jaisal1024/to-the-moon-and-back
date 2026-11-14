import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import Post from './Post';

test('renders the title, date, back links and every block type', () => {
  const { container } = render(
    <Post
      title="Scaling our chat infrastructure"
      date="April 25, 2025"
      dateTime="2025-04-25"
      body={[
        {
          type: 'paragraph',
          spans: [
            { text: 'Re-post of original ', marks: [] },
            { text: 'post', marks: [], href: 'https://example.com/post' },
          ],
        },
        { type: 'h2', spans: [{ text: 'The Problem', marks: [] }] },
        { type: 'list', ordered: false, items: [[{ text: 'Dropped messages:', marks: ['strong'] }]] },
        { type: 'list', ordered: true, items: [[{ text: 'one', marks: ['em'] }], [{ text: 'two', marks: [] }]] },
        { type: 'h2', spans: [{ text: 'The New Architecture', marks: [] }] },
        { type: 'h3', spans: [{ text: 'Outcomes', marks: [] }] },
        { type: 'code', code: '// Redux state\nconst a = 1;', filename: 'saga.ts' },
      ]}
    />,
  );

  expect(screen.getByTestId('post-heading')).toHaveTextContent('Scaling our chat infrastructure');
  expect(screen.getByText('April 25, 2025')).toHaveAttribute('dateTime', '2025-04-25');
  expect(screen.getAllByRole('link', { name: /All posts/ }).every((a) => a.getAttribute('href') === '/blog')).toBe(
    true,
  );
  expect(screen.getByRole('link', { name: 'post' })).toHaveAttribute('target', '_blank');

  const h2s = screen.getAllByRole('heading', { level: 2 });
  expect(h2s.map((h) => h.textContent)).toEqual(['01The Problem', '02The New Architecture']);
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Outcomes');
  expect(screen.getByText('Dropped messages:').tagName).toBe('STRONG');
  expect(container.querySelectorAll('ol > li')).toHaveLength(2);

  const pre = container.querySelector('pre');
  expect(pre?.textContent).toBe('// Redux state\nconst a = 1;');
  expect(screen.getByText('// Redux state').tagName).toBe('SPAN');
  expect(screen.getByText('saga.ts')).toBeInTheDocument();
});
