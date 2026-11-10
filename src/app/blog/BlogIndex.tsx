'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import shell from 'src/components/site/site.module.css';

import styles from './blog.module.css';

export type BlogIndexPost = {
  title: string;
  href: string;
  /** Display date, e.g. "April 25, 2025"; undefined while unpublished. */
  date?: string;
  /** Machine-readable date (YYYY-MM-DD) for <time>. */
  dateTime?: string;
};

const MOBILE_MAX = 720;

export default function BlogIndex({ posts }: { posts: BlogIndexPost[] }) {
  const gradientId = useId();
  const heroRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const inkRef = useRef<SVGLinearGradientElement>(null);

  // The thread enters from the top right, loops under the headline and runs off toward the list; it draws in once.
  useEffect(() => {
    const hero = heroRef.current;
    const head = headRef.current;
    const path = pathRef.current;
    const ink = inkRef.current;
    if (!hero || !head || !path || !ink) return;
    // Needs real layout and SVG geometry, which test environments don't provide.
    if (typeof path.getTotalLength !== 'function' || typeof window.matchMedia !== 'function') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let drawn = reduce;
    let raf = 0;

    function build() {
      if (!hero || !head || !path || !ink) return;
      const b = hero.getBoundingClientRect();
      const W = b.width;
      const H = b.height;
      const range = document.createRange();
      range.selectNodeContents(head);
      const h = range.getBoundingClientRect();
      const t = h.top - b.top;
      const bot = h.bottom - b.top;
      const l = h.left - b.left;
      const r = Math.min(W - 40, h.right - b.left);
      const g = Math.max(16, W * 0.02);
      const wide = window.innerWidth > MOBILE_MAX;
      const pts = [
        [W * (wide ? 0.82 : 1.08), wide ? -60 : t * 0.2],
        [W * (wide ? 0.62 : 0.86), t * (wide ? 0.45 : 0.7)],
        [r + g * 2.2, t + (bot - t) * 0.3],
        [r + g * 0.6, bot - (bot - t) * 0.05],
        [l + (r - l) * 0.55, bot + g * 0.5],
        [l + g * 0.4, bot - (bot - t) * 0.12],
        [l + g * 1.6, H - g * 0.2],
        [l + (r - l) * 0.5, H + 80],
      ];
      // Catmull-Rom through the waypoints.
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6},${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6},${p2[0]} ${p2[1]}`;
      }
      path.setAttribute('d', d);
      ink.setAttribute('y1', String(pts[0][1]));
      ink.setAttribute('y2', String(H + 40));
      const length = path.getTotalLength();
      path.style.transition = drawn ? 'none' : '';
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = drawn ? '0' : String(length);
    }

    function draw() {
      if (drawn || !path) return;
      path.getBoundingClientRect();
      raf = requestAnimationFrame(() => {
        drawn = true;
        path.style.strokeDashoffset = '0';
      });
    }

    build();
    path.style.visibility = 'visible';
    let cancelled = false;
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled) return;
      if (!drawn) build();
      draw();
    });
    window.addEventListener('resize', build);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', build);
    };
  }, []);

  return (
    <>
      <section ref={heroRef} className={styles.hero}>
        <svg className={styles.thread} aria-hidden="true">
          <defs>
            <linearGradient ref={inkRef} id={gradientId} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="1000">
              <stop offset="0" />
              <stop offset=".5" />
              <stop offset="1" />
            </linearGradient>
          </defs>
          <path ref={pathRef} stroke={`url(#${gradientId})`} />
        </svg>
        <h1 ref={headRef} data-testid="blog-heading">
          Blog
        </h1>
      </section>

      <div className={shell.night}>
        <section className={styles.rows} aria-label="All posts">
          {posts.map((post, i) => (
            <Link key={post.href} className={styles.row} href={post.href} data-testid="blog-row">
              <span className={styles.n}>{String(i + 1).padStart(2, '0')}</span>
              <span className={clsx(styles.name, shell.lg)}>{post.title}</span>
              <span className={styles.end}>
                {post.date && (
                  <time className={styles.date} dateTime={post.dateTime}>
                    {post.date}
                  </time>
                )}
                <span className={clsx(styles.arrow, shell.lg)} aria-hidden="true">
                  →
                </span>
              </span>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
