import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import React from 'react';
import { expect, test, vi } from 'vitest';

import Link from './Link';

// Mock dependencies
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

test('renders internal link correctly', () => {
  vi.mocked(usePathname).mockReturnValue('/');
  render(<Link href="/about">About</Link>);

  const link = screen.getByRole('link', { name: 'About' });
  expect(link).toHaveAttribute('href', '/about');
});

test('renders external link correctly', () => {
  vi.mocked(usePathname).mockReturnValue('/');
  render(<Link href="https://google.com">Google</Link>);

  const link = screen.getByRole('link', { name: 'Google' });
  expect(link).toHaveAttribute('href', 'https://google.com');
});

test('applies active class when href matches pathname', () => {
  vi.mocked(usePathname).mockReturnValue('/about');
  render(
    <Link href="/about" activeClassName="custom-active">
      About
    </Link>,
  );

  const link = screen.getByRole('link', { name: 'About' });
  expect(link.className).toContain('custom-active');
});
