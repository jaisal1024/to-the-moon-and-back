'use client';

import { clsx } from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import shell from 'src/components/site/site.module.css';

import styles from './home.module.css';

export type HomePhoto = {
  src: string;
  alt: string;
  /** width / height */
  ratio: number;
  /** Tiny inline preview shown while the photo loads. */
  blurDataURL?: string;
};

const blur = (photo: HomePhoto) =>
  photo.blurDataURL ? ({ placeholder: 'blur', blurDataURL: photo.blurDataURL } as const) : {};

export type HomeCollection = {
  title: string;
  href: string;
  location?: string;
  /** e.g. "February 2024" */
  date?: string;
  description?: string;
  count: number;
  cover?: HomePhoto;
  hero?: HomePhoto;
};

const MOBILE_MAX = 720;
const HERO_INTERVAL = 2600;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const pad2 = (n: number) => String(n).padStart(2, '0');

// Mat shape for a cover: landscape covers keep roughly their own proportions, portraits sit at 4:5.
function coverAspect(ratio: number) {
  return ratio < 1 ? '4 / 5' : `${clamp(ratio, 1.4, 1.75)} / 1`;
}

// The hero cycles through the collections, newest first, the way the about hero cycles its words.
function Hero({ collections }: { collections: HomeCollection[] }) {
  const slides = collections.filter((c) => c.hero);
  const [index, setIndex] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      if (document.hidden) return;
      setOut(true);
      swap = setTimeout(() => {
        setIndex((i) => (i + 1) % slides.length);
        setOut(false);
      }, 300);
    }, HERO_INTERVAL);
    return () => {
      clearInterval(interval);
      clearTimeout(swap);
    };
  }, [slides.length]);

  const current = slides[index];

  return (
    <section className={styles.hero}>
      {current && (
        <>
          <div className={styles.lines}>
            <p>
              <Link className={clsx(styles.swap, out && styles.out)} href={current.href}>
                {current.title}
              </Link>
            </p>
            {current.location && (
              <p>
                <span className={clsx(styles.swap, out && styles.out)}>{current.location}</span>
              </p>
            )}
            {current.date && (
              <p>
                <span className={clsx(styles.swap, out && styles.out)}>{current.date}</span>
              </p>
            )}
          </div>
          <Link className={clsx(shell.frame, styles.heroFrame)} href={current.href} aria-label={current.title}>
            <span className={shell.inner}>
              {slides.map((slide, i) => (
                <Image
                  key={slide.href}
                  className={clsx(styles.heroImg, i === index && styles.on)}
                  src={slide.hero!.src}
                  alt={i === index ? slide.hero!.alt : ''}
                  fill
                  preload={i === 0}
                  sizes="(max-width: 720px) 92vw, 64vw"
                  {...blur(slide.hero!)}
                />
              ))}
            </span>
          </Link>
        </>
      )}
      <h1 data-testid="collections-heading">Jaisal&apos;s Collections</h1>
    </section>
  );
}

export default function Home({ collections }: { collections: HomeCollection[] }) {
  const worksRef = useRef<HTMLElement>(null);
  const indexRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const works = worksRef.current;
    const index = indexRef.current;
    const rail = railRef.current;
    if (!works || !index || !rail) return;
    // Needs real layout, which test environments don't provide.
    if (typeof window.matchMedia !== 'function') return;

    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const frames = Array.from(works.querySelectorAll<HTMLElement>('[data-cover]'));
    const rows = Array.from(index.querySelectorAll<HTMLElement>('[data-row]'));
    const heads = Array.from(works.querySelectorAll<HTMLElement>('[data-head]'));

    function frame() {
      if (!index || !rail) return;
      const vh = window.innerHeight;
      const mid = vh * 0.5;
      const mobile = window.innerWidth <= MOBILE_MAX;
      const reduce = reduceQuery.matches;

      // Covers settle into their mats as they arrive: the photo eases from 1.08 to 1, the mat never changes.
      frames.forEach((el) => {
        const img = el.querySelector<HTMLElement>('img');
        if (!img) return;
        const p = reduce ? 1 : easeOut(clamp((vh - el.getBoundingClientRect().top) / (vh * 0.75), 0, 1));
        img.style.transform = `scale(${1.08 - p * 0.08})`;
      });

      if (!mobile) {
        index.style.top = `${Math.max(vh * 0.1, (vh - index.offsetHeight) / 2)}px`;
        // The active collection is the last cover whose top has crossed the middle of the screen.
        let at = -1;
        frames.forEach((el, i) => {
          if (el.getBoundingClientRect().top <= mid) at = i;
        });
        if (at < 0 && frames[0] && frames[0].getBoundingClientRect().top < vh * 0.85) at = 0;
        rows.forEach((row, i) => row.classList.toggle(styles.on, i === at));
        // The thread: a blue-to-plum line drawn down the index to the active row.
        const top = index.getBoundingClientRect().top;
        const centres = rows.map((row) => {
          const r = row.getBoundingClientRect();
          return r.top - top + r.height / 2;
        });
        rail.style.height = `${at < 0 ? 0 : centres[at]}px`;
        rail.style.backgroundSize = `100% ${centres[centres.length - 1] ?? 0}px`;
      } else {
        // On phones each title sits with its cover and lights up as it arrives.
        heads.forEach((head) =>
          head.classList.toggle(styles.on, reduce || head.getBoundingClientRect().top < vh * 0.82),
        );
      }
    }

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        frame();
      });
    };

    frame();
    const resizeObserver = new ResizeObserver(onScroll);
    resizeObserver.observe(works);
    document.fonts?.ready.then(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    reduceQuery.addEventListener('change', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      reduceQuery.removeEventListener('change', onScroll);
    };
  }, [collections.length]);

  return (
    <>
      <Hero collections={collections} />

      {collections.length > 0 && (
        <section ref={worksRef} className={styles.works}>
          <nav ref={indexRef} className={styles.index} aria-label="Collections">
            <span ref={railRef} className={styles.rail} aria-hidden="true" />
            {collections.map((c, i) => (
              <Link key={c.href} className={styles.row} href={c.href} data-row>
                <span className={styles.n}>{pad2(i + 1)}</span>
                <span className={styles.name}>{c.title}</span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </nav>

          <div className={styles.covers}>
            {collections.map((c, i) => {
              const portrait = !!c.cover && c.cover.ratio < 1;
              return (
                <article key={c.href} className={clsx(styles.work, portrait && styles.portrait)}>
                  {/* phones only: on wide screens the pinned index names the collection */}
                  <h2 className={styles.head}>
                    <Link className={shell.lg} href={c.href} data-head>
                      <span className={styles.n}>{pad2(i + 1)}</span>
                      <span className={styles.name}>{c.title}</span>
                    </Link>
                  </h2>
                  <Link
                    className={clsx(shell.frame, styles.cover)}
                    href={c.href}
                    aria-label={c.title}
                    style={{ aspectRatio: c.cover ? coverAspect(c.cover.ratio) : '3 / 2' }}
                    data-cover
                  >
                    <span className={shell.inner}>
                      {c.cover && (
                        <Image
                          src={c.cover.src}
                          alt={c.cover.alt}
                          fill
                          sizes={portrait ? '(max-width: 720px) 92vw, 32vw' : '(max-width: 720px) 92vw, 64vw'}
                          {...blur(c.cover)}
                        />
                      )}
                    </span>
                  </Link>
                  <p className={styles.cap}>
                    <span className={styles.where}>
                      {c.location && <span>{c.location}</span>}
                      {c.date && <span className={shell.muted}>{c.date}</span>}
                    </span>
                    <span className={shell.muted}>
                      {c.count} {c.count === 1 ? 'photo' : 'photos'}
                    </span>
                  </p>
                  {c.description && <p className={styles.desc}>{c.description}</p>}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
