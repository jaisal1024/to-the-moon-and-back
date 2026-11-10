import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import Home, { HomeCollection } from './Home';

const COLLECTIONS: HomeCollection[] = [
  {
    title: 'The Range of LA',
    href: '/collections/the-range-of-la',
    location: 'Los Angeles',
    date: 'February 2024',
    count: 8,
    cover: { src: '/cover-la.jpg', alt: 'Hollywood hills view at sunset', ratio: 16 / 9 },
    hero: { src: '/hero-la.jpg', alt: 'Palm trees backdrop of the beach', ratio: 16 / 9 },
  },
  {
    title: 'Qasr al-Hosn',
    href: '/collections/qasr-al-hosn',
    location: 'Abu Dhabi, UAE',
    date: 'April 2019',
    description: 'Qasr al-Hosn is a historical landmark.',
    count: 1,
    cover: { src: '/cover-qasr.jpg', alt: 'Two palms and a white building', ratio: 0.7 },
  },
];

test('renders the heading without a list when there are no collections', () => {
  render(<Home collections={[]} />);

  expect(screen.getByTestId('collections-heading')).toHaveTextContent("Jaisal's Collections");
  expect(screen.queryByRole('navigation', { name: 'Collections' })).not.toBeInTheDocument();
  expect(screen.queryAllByRole('link')).toHaveLength(0);
});

test('lists every collection in order with its caption and description', () => {
  render(<Home collections={COLLECTIONS} />);

  const index = screen.getByRole('navigation', { name: 'Collections' });
  const rows = Array.from(index.querySelectorAll('a'));
  expect(rows.map((a) => a.getAttribute('href'))).toEqual([
    '/collections/the-range-of-la',
    '/collections/qasr-al-hosn',
  ]);
  expect(rows[0]).toHaveTextContent('01The Range of LA');

  expect(screen.getByText('8 photos')).toBeInTheDocument();
  expect(screen.getByText('1 photo')).toBeInTheDocument();
  expect(screen.getByText('April 2019')).toBeInTheDocument();
  expect(screen.getByText('Qasr al-Hosn is a historical landmark.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Qasr al-Hosn' })).toHaveAttribute('href', '/collections/qasr-al-hosn');
});

test('the hero shows the newest collection with a hero photo', () => {
  render(<Home collections={COLLECTIONS} />);

  expect(screen.getAllByText('Los Angeles')[0]).toBeInTheDocument();
  expect(screen.getByAltText('Palm trees backdrop of the beach')).toBeInTheDocument();
  expect(screen.getAllByText('February 2024').length).toBeGreaterThan(1);
});
