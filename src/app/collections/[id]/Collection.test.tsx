import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import Collection, { type CollectionPhoto } from './Collection';

const L = { width: 1400, height: 788 };
const P = { width: 1400, height: 2488 };
const photo = (n: number, size: { width: number; height: number }, title: string): CollectionPhoto => ({
  src: `https://cdn.sanity.io/images/x/y/photo-${n}.jpg`,
  title,
  ...size,
});

const NICA = [
  photo(1, L, 'Two surfers at Popoyo Main Break'),
  photo(2, L, 'A perfect left'),
  photo(3, L, 'Cows walking on the beach'),
  photo(4, P, 'Zach walking to the boat'),
  photo(5, P, 'Neil walking with surfboard'),
];

test('renders the title, meta stack, description and every caption in order with counters', () => {
  render(
    <Collection
      title="Nica 1"
      description={'"Armando, Armando, where do we take off from?"'}
      location="Popoyo, Nicaragua"
      date="2023-04-19"
      photos={NICA}
    />,
  );

  expect(screen.getByTestId('collection-heading')).toHaveTextContent('Nica 1');
  expect(screen.getByText('Popoyo, Nicaragua')).toBeInTheDocument();
  expect(screen.getByText('April 2023')).toBeInTheDocument();
  expect(screen.getByText('5 photos')).toBeInTheDocument();
  expect(screen.getByText('"Armando,')).toBeInTheDocument();

  const captions = screen.getAllByRole('figure').map((f) => f.querySelector('figcaption')?.textContent);
  expect(captions).toEqual(NICA.map((p, i) => `${i + 1} / 5${p.title}`));
  expect(screen.getByAltText('A perfect left')).toBeInTheDocument();
  expect(screen.queryByText('Next collection')).not.toBeInTheDocument();
});

test('works without a description and links to the next collection', () => {
  render(
    <Collection
      title="The Range of LA"
      location="Los Angeles"
      date="2024-02-08"
      photos={[photo(1, L, 'Hollywood hills view at sunset'), photo(2, P, 'Two people walking at sunset')]}
      next={{
        number: '02',
        title: 'Nica 2',
        href: '/collections/nica-2',
        location: 'Popoyo Main Break, Nicaragua',
        date: '2023-04-28',
      }}
    />,
  );

  expect(screen.getByTestId('collection-heading')).toHaveTextContent('The Range of LA');
  expect(screen.getByText('Next collection')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Nica 2/ })).toHaveAttribute('href', '/collections/nica-2');
  expect(screen.getByText('Popoyo Main Break, Nicaragua, April 2023')).toBeInTheDocument();
  expect(screen.getByText('02')).toBeInTheDocument();
});

test('a single portrait collection still shows its photo', () => {
  render(<Collection title="Qasr al-Hosn" photos={[photo(1, P, 'Men walking between palms')]} />);

  expect(screen.getByText('1 photo')).toBeInTheDocument();
  expect(screen.getByText('1 / 1')).toBeInTheDocument();
  expect(screen.getByAltText('Men walking between palms')).toBeInTheDocument();
});
