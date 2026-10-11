import { fireEvent, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, expect, test, vi } from 'vitest';

import NavBar from './NavBar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock('src/hooks/useCollectionSlug', () => ({
  default: vi.fn(),
}));

const collections = [
  { id: 1, title: 'Nica 1', slug: 'nica-1' },
  { id: 2, title: 'Qasr al-Hosn', slug: 'qasr-al-hosn' },
];

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue('/');
});

test('renders NavBar with logo and main links', () => {
  render(<NavBar collections={collections} />);

  expect(screen.getByText('Jaisal Friedman')).toBeInTheDocument();
  expect(screen.getByText('Collections')).toBeInTheDocument();
  expect(screen.getByText('About')).toBeInTheDocument();
  expect(screen.getByText('Blog')).toBeInTheDocument();
});

test('collections popover lists the server-provided collections', () => {
  render(<NavBar collections={collections} />);

  fireEvent.click(screen.getByText('Collections'));

  expect(screen.getByTestId('navbar-list-item-nica-1')).toHaveAttribute('href', '/collections/nica-1');
  expect(screen.getByTestId('navbar-list-item-qasr-al-hosn')).toHaveAttribute('href', '/collections/qasr-al-hosn');
});
