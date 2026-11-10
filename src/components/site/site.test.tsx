import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { expect, test, vi } from 'vitest';

import SiteFooter from './SiteFooter';
import TopBar from './TopBar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const setPath = (path: string) =>
  (usePathname as unknown as { mockReturnValue: (v: string) => void }).mockReturnValue(path);

test.each([
  ['/', 'nav-collections'],
  ['/collections/nica-1', 'nav-collections'],
  ['/blog/scaling-our-chat-infrastructure', 'nav-blog'],
  ['/about', 'nav-about'],
])('marks the current section for %s', (path, current) => {
  setPath(path);
  render(<TopBar />);

  for (const id of ['nav-collections', 'nav-blog', 'nav-about']) {
    const link = screen.getByTestId(id);
    if (id === current) expect(link).toHaveAttribute('aria-current', 'page');
    else expect(link).not.toHaveAttribute('aria-current');
  }
  expect(screen.getByTestId('nav-home')).toHaveAttribute('href', '/');
});

test('footer keeps the site map, contact links and copyright', () => {
  render(<SiteFooter />);

  expect(screen.getByRole('link', { name: 'Photography' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
  expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/jaisalfriedman/',
  );
  expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/jaisal1024');
  expect(screen.getByRole('link', { name: 'X' })).toHaveAttribute('href', 'https://x.com/jaisal_f');
  expect(screen.getByRole('link', { name: 'hi@jaisal.xyz' })).toHaveAttribute('href', 'mailto:hi@jaisal.xyz');
  expect(screen.getByTestId('footer-copyright')).toHaveTextContent(
    `designed and built by © Jaisal Friedman ${new Date().getFullYear()}`,
  );
});
