import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import BlogIndex from './BlogIndex';

test('renders the heading and numbered rows with dates and links', () => {
  render(
    <BlogIndex
      posts={[
        {
          title: 'Scaling our chat infrastructure',
          href: '/blog/scaling',
          date: 'April 25, 2025',
          dateTime: '2025-04-25',
        },
        { title: 'Second post', href: '/blog/second' },
      ]}
    />,
  );

  expect(screen.getByTestId('blog-heading')).toHaveTextContent('Blog');
  const rows = screen.getAllByTestId('blog-row');
  expect(rows.map((row) => row.getAttribute('href'))).toEqual(['/blog/scaling', '/blog/second']);
  expect(rows[0]).toHaveTextContent('01');
  expect(rows[1]).toHaveTextContent('02');
  expect(screen.getByText('April 25, 2025')).toHaveAttribute('dateTime', '2025-04-25');
  expect(screen.getByText('Second post')).toBeInTheDocument();
});

test('renders no rows when there are no posts', () => {
  render(<BlogIndex posts={[]} />);
  expect(screen.getByTestId('blog-heading')).toBeInTheDocument();
  expect(screen.queryAllByTestId('blog-row')).toHaveLength(0);
});
