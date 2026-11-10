'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import React, { useEffect, useId, useRef } from 'react';
import shell from 'src/components/site/site.module.css';

import { type RichBlock, type RichSpan, splitComments } from '../richText';
import styles from './post.module.css';

export type PostProps = {
  title: string;
  /** Display date, e.g. "April 25, 2025". */
  date?: string;
  /** Machine-readable date (YYYY-MM-DD) for <time>. */
  dateTime?: string;
  body: RichBlock[];
};

const MOBILE_MAX = 720;
const STEPS = 400;
/** The reading line: how far down the viewport the progress head sits. */
const READ_LINE = 0.42;

function Spans({ spans }: { spans: RichSpan[] }) {
  return (
    <>
      {spans.map((span, i) => {
        let node: React.ReactNode = span.text;
        if (span.marks.includes('code')) node = <code>{node}</code>;
        if (span.marks.includes('em')) node = <em>{node}</em>;
        if (span.marks.includes('strong')) node = <strong>{node}</strong>;
        if (span.href) {
          const external = /^https?:/.test(span.href);
          node = (
            <a href={span.href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
              {node}
            </a>
          );
        }
        return <React.Fragment key={i}>{node}</React.Fragment>;
      })}
    </>
  );
}

function CodePlate({ code, language, filename }: { code: string; language?: string; filename?: string }) {
  const caption = [filename, language].filter(Boolean) as string[];
  return (
    <figure className={clsx(shell.night, styles.code)} data-code>
      {caption.length > 0 && (
        <figcaption className={styles.cap}>
          {caption.map((c) => (
            <span key={c} className={shell.pill}>
              {c}
            </span>
          ))}
        </figcaption>
      )}
      {/* focusable so keyboard users can scroll long lines */}
      <pre tabIndex={0}>
        <code>
          {splitComments(code).map((part, i) =>
            part.comment ? (
              <span key={i} className={styles.comment}>
                {part.text}
              </span>
            ) : (
              <React.Fragment key={i}>{part.text}</React.Fragment>
            ),
          )}
        </code>
      </pre>
    </figure>
  );
}

export default function Post({ title, date, dateTime, body }: PostProps) {
  const gradientId = useId();
  const proseRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const inkRef = useRef<SVGPathElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Reading progress: on desktop the blue to plum thread draws down the left band as you read; on mobile a 2px bar
  // fills along the top. Code plates fade at the right edge while they have more to scroll.
  useEffect(() => {
    const prose = proseRef.current;
    const track = trackRef.current;
    const ink = inkRef.current;
    const gradient = gradientRef.current;
    const bar = barRef.current;
    if (!prose || !track || !ink || !gradient || !bar) return;
    // Needs real layout and SVG geometry, which test environments don't provide.
    if (typeof ink.getTotalLength !== 'function' || typeof window.matchMedia !== 'function') return;

    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const headings = Array.from(prose.querySelectorAll<HTMLElement>('h2'));
    const plates = Array.from(prose.querySelectorAll<HTMLElement>('[data-code]'));
    let length = 0;
    // Furthest point down the page the thread has reached after each step, so it draws in reading order.
    let depth: number[] = [];

    function build() {
      if (!prose || !track || !ink || !gradient) return;
      const b = prose.getBoundingClientRect();
      const H = b.height;
      const firstText = prose.querySelector('p, ul, ol, h2, h3');
      const text = (firstText?.getBoundingClientRect().left ?? b.left) - b.left;
      const pad = parseFloat(getComputedStyle(prose).getPropertyValue('--pad')) || 14;
      // the thread runs a little left of the numerals, which hang off the reading column
      const x = Math.max(pad, text - Math.min(190, text * 0.45));
      const pts: number[][] = [[x, 0]];
      // a slow sway: it leans toward each section numeral and eases back between them
      headings.forEach((h) => {
        const top = h.getBoundingClientRect().top - b.top;
        const prev = pts[pts.length - 1][1];
        pts.push([x, (prev + top) / 2], [x + 14, top + 40]);
      });
      pts.push([x, H]);
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6},${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6},${p2[0]} ${p2[1]}`;
      }
      track.setAttribute('d', d);
      ink.setAttribute('d', d);
      gradient.setAttribute('y2', String(H));
      length = ink.getTotalLength();
      ink.style.strokeDasharray = String(length);
      depth = [];
      let deepest = -Infinity;
      for (let k = 0; k <= STEPS; k++) {
        deepest = Math.max(deepest, ink.getPointAtLength((length * k) / STEPS).y);
        depth.push(deepest);
      }
    }

    function fades() {
      plates.forEach((plate) => {
        const pre = plate.querySelector('pre');
        if (pre) plate.toggleAttribute('data-more', pre.scrollLeft + pre.clientWidth < pre.scrollWidth - 2);
      });
    }

    function frame() {
      if (!prose || !ink || !bar) return;
      const b = prose.getBoundingClientRect();
      const vh = window.innerHeight;
      const line = vh * READ_LINE;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, (line - b.top) / b.height))})`;
      headings.forEach((h) => h.toggleAttribute('data-reached', h.getBoundingClientRect().top < line));
      if (reduceQuery.matches || window.innerWidth <= MOBILE_MAX || !length) return;
      // at the very end of the page the thread completes
      const atEnd = document.documentElement.scrollHeight - vh - window.scrollY < 4;
      const head = atEnd ? Infinity : line - b.top;
      let k = 0;
      while (k < STEPS && depth[k + 1] <= head) k++;
      ink.style.strokeDashoffset = String(length * (1 - k / STEPS));
    }

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        frame();
      });
    };
    const onLayout = () => {
      build();
      fades();
      frame();
    };

    onLayout();
    const resizeObserver = new ResizeObserver(onLayout);
    resizeObserver.observe(prose);
    document.fonts?.ready.then(onLayout);
    plates.forEach((p) => p.querySelector('pre')?.addEventListener('scroll', fades, { passive: true }));
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onLayout);
    reduceQuery.addEventListener('change', onLayout);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      plates.forEach((p) => p.querySelector('pre')?.removeEventListener('scroll', fades));
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onLayout);
      reduceQuery.removeEventListener('change', onLayout);
    };
  }, []);

  let section = 0;

  return (
    <>
      <div ref={barRef} className={styles.topbar} aria-hidden="true" />
      <article>
        <header className={clsx(styles.page, styles.head)}>
          <div className={styles.meta}>
            {date && <time dateTime={dateTime}>{date}</time>}
            <Link className={styles.allPosts} href="/blog">
              All posts
            </Link>
          </div>
          <h1 data-testid="post-heading">{title}</h1>
        </header>
        <div ref={proseRef} className={clsx(styles.page, styles.prose)}>
          <svg className={styles.progress} aria-hidden="true">
            <defs>
              <linearGradient
                ref={gradientRef}
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                x2="0"
                y1="0"
                y2="1000"
              >
                <stop offset="0" />
                <stop offset=".5" />
                <stop offset="1" />
              </linearGradient>
            </defs>
            <path ref={trackRef} className={styles.track} />
            <path ref={inkRef} className={styles.ink} stroke={`url(#${gradientId})`} />
          </svg>
          {body.map((block, i) => {
            switch (block.type) {
              case 'h2':
                section++;
                return (
                  <h2 key={i}>
                    <span className={styles.n} aria-hidden="true">
                      {String(section).padStart(2, '0')}
                    </span>
                    <Spans spans={block.spans} />
                  </h2>
                );
              case 'h3':
                return (
                  <h3 key={i}>
                    <Spans spans={block.spans} />
                  </h3>
                );
              case 'list': {
                const List = block.ordered ? 'ol' : 'ul';
                return (
                  <List key={i}>
                    {block.items.map((item, j) => (
                      <li key={j}>
                        <Spans spans={item} />
                      </li>
                    ))}
                  </List>
                );
              }
              case 'code':
                return <CodePlate key={i} code={block.code} language={block.language} filename={block.filename} />;
              default:
                return (
                  <p key={i}>
                    <Spans spans={block.spans} />
                  </p>
                );
            }
          })}
        </div>
      </article>

      <div className={shell.night}>
        <section className={styles.after}>
          <Link className={styles.back} href="/blog">
            <span className={shell.lg}>All posts</span>
            <span className={clsx(styles.arrow, shell.lg)} aria-hidden="true">
              →
            </span>
          </Link>
        </section>
      </div>
    </>
  );
}
