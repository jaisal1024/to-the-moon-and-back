import { useLazyQuery } from '@apollo/client/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { expect, test, vi } from 'vitest';

import NavBar from './NavBar';

// Mock dependencies
vi.mock('@apollo/client/react', () => ({
  useLazyQuery: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock('src/gql/gql', () => ({
  graphql: (s: string) => s,
}));

vi.mock('src/hooks/useCollectionSlug', () => ({
  default: vi.fn(),
}));

test('renders NavBar with logo and main links', () => {
  (
    useLazyQuery as unknown as { mockReturnValue: (v: unknown[]) => void }
  ).mockReturnValue([
    vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { data: null, error: null, loading: false } as any,
  ]);
  (
    usePathname as unknown as { mockReturnValue: (v: string) => void }
  ).mockReturnValue('/');

  render(<NavBar />);

  expect(screen.getByText('Jaisal Friedman')).toBeInTheDocument();
  expect(screen.getByText('Collections')).toBeInTheDocument();
  expect(screen.getByText('About')).toBeInTheDocument();
});

test('opens collections popover on click', () => {
  const getNavBarCollections = vi.fn();
  (
    useLazyQuery as unknown as { mockReturnValue: (v: unknown[]) => void }
  ).mockReturnValue([
    getNavBarCollections,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { data: null, error: null, loading: false } as any,
  ]);
  (
    usePathname as unknown as { mockReturnValue: (v: string) => void }
  ).mockReturnValue('/');

  render(<NavBar />);

  const collectionsButton = screen.getByText('Collections');
  fireEvent.click(collectionsButton);

  expect(getNavBarCollections).toHaveBeenCalled();
});
