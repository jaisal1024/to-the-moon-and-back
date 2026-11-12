'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import posthog from 'posthog-js';

import styles from './site.module.css';

const SITE_MAP = [
  { label: 'Photography', href: '/' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
];

const CONNECT = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jaisalfriedman/', destination: 'linkedin' },
  { label: 'GitHub', href: 'https://github.com/jaisal1024', destination: 'github' },
  { label: 'X', href: 'https://x.com/jaisal_f', destination: 'x' },
  { label: 'hi@jaisal.xyz', href: 'mailto:hi@jaisal.xyz' },
];

function captureSocialLinkOpened(destination: string | undefined) {
  if (!destination || !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST) return;
  posthog.capture('social_link_opened', { destination });
}

export default function SiteFooter() {
  return (
    <footer className={clsx(styles.night, styles.footer)}>
      <div>
        <span className={styles.pill}>Site Map</span>
        <ul>
          {SITE_MAP.map((item) => (
            <li key={item.href}>
              <Link className={styles.link} href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <span className={styles.pill}>Connect</span>
        <ul>
          {CONNECT.map((item) => (
            <li key={item.href}>
              <a
                className={styles.link}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => captureSocialLinkOpened(item.destination)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className={styles.by} data-testid="footer-copyright">
        site design, code and all photography by © Jaisal Friedman {new Date().getFullYear()}
      </p>
    </footer>
  );
}
