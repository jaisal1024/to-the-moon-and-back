'use client';

import { clsx } from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef } from 'react';
import shell from 'src/components/site/site.module.css';

import styles from './collection.module.css';
import { aspect, formatMonth, groupPhotos, type Row } from './rows';

export type CollectionPhoto = {
  src: string;
  title: string;
  width: number;
  height: number;
  /** Tiny inline preview shown while the photo loads. */
  blurDataURL?: string;
};

export type NextCollection = {
  number: string; // position in the collections index, e.g. "04"
  title: string;
  href: string;
  location?: string;
  date?: string;
  cover?: string;
};

export type CollectionProps = {
  title: string;
  description?: string;
  location?: string;
  date?: string;
  photos: CollectionPhoto[];
  next?: NextCollection;
};

const MOBILE_MAX = 720;
const LONG_DESCRIPTION = 80; // characters; longer descriptions drop to a reading size

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Each word is its own span so the description can light up as it scrolls into view.
function Words({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span className={styles.word} data-word>
            {word}
          </span>
          {i < words.length - 1 && ' '}
        </React.Fragment>
      ))}
    </>
  );
}

function Plate({
  photo,
  index,
  total,
  sizes,
}: {
  photo: CollectionPhoto;
  index: number;
  total: number;
  sizes: string;
}) {
  return (
    <figure className={styles.shot} style={{ '--ar': aspect(photo).toFixed(4) } as React.CSSProperties}>
      <div className={clsx(shell.frame, styles.plate)}>
        <div className={styles.plateInner} data-grow>
          <Image
            src={photo.src}
            alt={photo.title}
            fill
            sizes={sizes}
            preload={index === 0}
            {...(photo.blurDataURL ? { placeholder: 'blur', blurDataURL: photo.blurDataURL } : {})}
          />
        </div>
      </div>
      <figcaption className={styles.cap}>
        <span className={styles.n}>
          {index + 1} / {total}
        </span>
        <span className={styles.t}>{photo.title}</span>
      </figcaption>
    </figure>
  );
}

function rowSizes(photos: CollectionPhoto[], row: Row, i: number) {
  if (row.kind === 'full') return '100vw';
  const sum = photos.slice(row.start, row.start + row.count).reduce((n, p) => n + aspect(p), 0);
  return `(max-width: ${MOBILE_MAX}px) 100vw, ${Math.ceil((aspect(photos[i]) / sum) * 100)}vw`;
}

export default function Collection({ title, description, location, date, photos, next }: CollectionProps) {
  const rows = useMemo(() => groupPhotos(photos), [photos]);
  const total = photos.length;
  const leadPortrait = rows[0]?.kind === 'lead';
  const month = formatMonth(date);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const sayRef = useRef<HTMLParagraphElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h1 = titleRef.current;
    const root = rootRef.current;
    if (!h1 || !root) return;
    // Needs real layout, which test environments don't provide.
    if (typeof window.matchMedia !== 'function' || typeof ResizeObserver === 'undefined') return;

    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const grows = Array.from(root.querySelectorAll<HTMLElement>('[data-grow]'));
    const words = Array.from(sayRef.current?.querySelectorAll<HTMLElement>('[data-word]') ?? []);

    // Headline: the /about size, stepped down if a word would overflow or the lead plate would miss the first screen.
    function fit() {
      if (!h1) return;
      h1.style.fontSize = '';
      let size = parseFloat(getComputedStyle(h1).fontSize);
      const vh = window.innerHeight;
      const over = () => {
        if (h1.scrollWidth > h1.clientWidth + 1) return true;
        if (leadPortrait && window.innerWidth > MOBILE_MAX)
          return h1.getBoundingClientRect().bottom + window.scrollY > vh;
        const lead = leadRef.current;
        return !!lead && lead.getBoundingClientRect().top + window.scrollY > vh * 0.62;
      };
      while (over() && size > 30) {
        size *= 0.95;
        h1.style.fontSize = `${size}px`;
      }
    }

    function frame() {
      const vh = window.innerHeight;
      const reduce = reduceQuery.matches;
      // Photos ease up inside their mats as they arrive, as on /about.
      grows.forEach((el) => {
        const r = (el.parentElement ?? el).getBoundingClientRect();
        const p = reduce ? 1 : easeOut(clamp((vh - r.top) / (vh * 0.75), 0, 1));
        el.style.transform = `scale(${0.92 + p * 0.08})`;
      });
      // The description lights up word by word, finished by the time it is centred on screen.
      if (words.length) {
        const top = words[0].getBoundingClientRect().top;
        const height = words[words.length - 1].getBoundingClientRect().bottom - top;
        const p = reduce ? 1 : clamp((vh * 0.95 - top) / (vh * 0.45 + height / 2), 0, 1);
        words.forEach((w, i) => w.classList.toggle(styles.on, (i + 0.5) / words.length <= p));
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
    const onLayout = () => {
      fit();
      frame();
    };

    onLayout();
    let lastWidth = window.innerWidth;
    const resizeObserver = new ResizeObserver(() => {
      if (window.innerWidth === lastWidth) return frame();
      lastWidth = window.innerWidth;
      onLayout();
    });
    resizeObserver.observe(root);
    document.fonts?.ready.then(onLayout);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onLayout);
    reduceQuery.addEventListener('change', frame);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onLayout);
      reduceQuery.removeEventListener('change', frame);
    };
  }, [leadPortrait]);

  const nextMeta = next ? [next.location, formatMonth(next.date)].filter(Boolean).join(', ') : '';

  return (
    <div ref={rootRef}>
      <section className={styles.open}>
        <div className={styles.meta}>
          <div className={styles.lines}>
            {location && <p>{location}</p>}
            {month && <p className={styles.when}>{month}</p>}
            {total > 0 && <p>{total === 1 ? '1 photo' : `${total} photos`}</p>}
          </div>
          {leadPortrait && (
            <div ref={leadRef} className={styles.leadSlot}>
              <Plate photo={photos[0]} index={0} total={total} sizes={`(max-width: ${MOBILE_MAX}px) 100vw, 30vw`} />
            </div>
          )}
        </div>
        <h1 ref={titleRef} className={styles.title} data-testid="collection-heading">
          {/* hyphenated words never break across lines */}
          {title.split(' ').map((word, i, all) => (
            <React.Fragment key={i}>
              <span className={styles.nowrap}>{word}</span>
              {i < all.length - 1 && ' '}
            </React.Fragment>
          ))}
        </h1>
      </section>

      <section className={styles.series}>
        {rows.map((row, ri) => {
          const isLead = ri === 0;
          if (row.kind === 'lead') {
            return description ? <Description key="say" text={description} sayRef={sayRef} /> : null;
          }
          const items = photos.slice(row.start, row.start + row.count);
          const sum = items.reduce((n, p) => n + aspect(p), 0);
          const stack = row.kind === 'll' || row.kind === 'mix' || row.count === 3;
          return (
            <React.Fragment key={row.start}>
              <div
                ref={isLead ? leadRef : undefined}
                className={clsx(
                  styles.row,
                  row.kind === 'full' && styles.full,
                  stack && styles.stack,
                  row.count === 3 && styles.trio,
                )}
                style={{ '--sum': sum.toFixed(4), '--n': row.count } as React.CSSProperties}
              >
                {items.map((photo, k) => (
                  <Plate
                    key={row.start + k}
                    photo={photo}
                    index={row.start + k}
                    total={total}
                    sizes={rowSizes(photos, row, row.start + k)}
                  />
                ))}
              </div>
              {isLead && description && <Description text={description} sayRef={sayRef} />}
            </React.Fragment>
          );
        })}
      </section>

      {next && (
        <section className={clsx(shell.night, styles.next)}>
          <span className={clsx(shell.pill, styles.nextLabel)}>Next collection</span>
          <Link className={styles.nx} href={next.href}>
            <span className={styles.nxN}>{next.number}</span>
            <span className={styles.nxText}>
              <span className={clsx(shell.xl, styles.nxTitle)}>{next.title}</span>
              {nextMeta && <span className={clsx(shell.sm, shell.muted)}>{nextMeta}</span>}
            </span>
            <span className={clsx(styles.arrow, shell.lg)} aria-hidden="true">
              →
            </span>
            <span className={styles.thumb}>
              {next.cover && <Image src={next.cover} alt="" fill sizes={`(max-width: ${MOBILE_MAX}px) 100vw, 32vw`} />}
            </span>
          </Link>
        </section>
      )}
    </div>
  );
}

function Description({ text, sayRef }: { text: string; sayRef: React.Ref<HTMLParagraphElement> }) {
  return (
    <p ref={sayRef} className={clsx(styles.say, text.length > LONG_DESCRIPTION && styles.long)}>
      <Words text={text} />
    </p>
  );
}
