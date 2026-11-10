'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import styles from './site.module.css';

const NAV = [
  { label: 'Collections', href: '/', isCurrent: (path: string) => path === '/' || path.startsWith('/collections') },
  { label: 'Blog', href: '/blog', isCurrent: (path: string) => path.startsWith('/blog') },
  { label: 'About', href: '/about', isCurrent: (path: string) => path.startsWith('/about') },
];

// Pixel crescent, as one path of 1x1 squares on a 7x7 grid.
const MOON = ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..']
  .flatMap((row, y) => row.split('').map((c, x) => (c === '#' ? `M${x} ${y}h1v1h-1z` : '')))
  .join('');

export default function TopBar() {
  const pathname = usePathname() ?? '';
  const [away, setAway] = useState(false);

  // Step aside while scrolling down so the bar never sits on content; come back on scroll up.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      setAway(y > lastY && y > window.innerHeight * 0.5);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={clsx(styles.bar, away && styles.away)}>
      <nav aria-label="Primary">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.isCurrent(pathname) ? 'page' : undefined}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            {item.label}
          </Link>
        ))}
        <svg className={styles.moon} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
          <path d={MOON} />
        </svg>
      </nav>
      <Link href="/" data-testid="nav-home">
        Jaisal Friedman
      </Link>
    </header>
  );
}
