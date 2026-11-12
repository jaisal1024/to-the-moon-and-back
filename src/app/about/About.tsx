'use client';

import { clsx } from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useId, useRef, useState } from 'react';
import shell from 'src/components/site/site.module.css';
import { clamp } from 'src/utils/math';

import styles from './about.module.css';
import SlotMachine from './slots/SlotMachine';

export type AboutCollection = {
  title: string;
  href: string;
  photo?: string;
};

const ROLES = ['engineering manager', 'photographer', 'technical leader', 'product thinker', 'data lover'];
const HOBBIES = ['surf', 'read', 'learn spanish'];
const REACH_OUT = ['advising', 'angel investing', 'open source contributing'];
const NO_REACH_OUT = ['recruiting', 'spam', 'NFTs'];

const MOBILE_MAX = 720;
const THREAD_STEPS = 300;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function Rotator({ items, delay, className }: { items: string[]; delay: number; className?: string }) {
  const [index, setIndex] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let interval: ReturnType<typeof setInterval> | undefined;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setOut(true);
        swap = setTimeout(
          () => {
            setIndex((i) => (i + 1) % items.length);
            setOut(false);
          },
          reduce ? 0 : 300,
        );
      }, 2400);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
      clearTimeout(swap);
    };
  }, [items.length, delay]);

  return <span className={clsx(styles.swap, className, out && styles.out)}>{items[index]}</span>;
}

// Each word is its own span so it can light up as the sentence scrolls into view.
function Words({ text }: { text: string }) {
  const words = text.split(' ');
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

export default function About({ collections }: { collections: AboutCollection[] }) {
  const gradientId = useId();
  const portraitRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLElement>(null);
  const threadRef = useRef<SVGPathElement>(null);
  const inkRef = useRef<SVGLinearGradientElement>(null);
  const sayARef = useRef<HTMLParagraphElement>(null);
  const sayBRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const portrait = portraitRef.current;
    const body = bodyRef.current;
    const path = threadRef.current;
    const ink = inkRef.current;
    const sayA = sayARef.current;
    const sayB = sayBRef.current;
    if (!portrait || !body || !path || !ink || !sayA || !sayB) return;
    // Needs real layout and SVG geometry, which test environments don't provide.
    if (typeof path.getTotalLength !== 'function' || typeof window.matchMedia !== 'function') return;

    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const says = [sayA, sayB].map((el) => Array.from(el.querySelectorAll<HTMLElement>('[data-word]')));
    const grows = Array.from(body.querySelectorAll<HTMLElement>('[data-grow]'));
    let threadLength = 0;
    // Furthest point down the page the thread has reached after each step, so it draws in scroll order.
    let threadDepth: number[] = [];

    function inkBox(words: HTMLElement[], origin: DOMRect) {
      let l = Infinity;
      let r = -Infinity;
      let t = Infinity;
      let b = -Infinity;
      words.forEach((w) => {
        const q = w.getBoundingClientRect();
        l = Math.min(l, q.left);
        r = Math.max(r, q.right);
        t = Math.min(t, q.top);
        b = Math.max(b, q.bottom);
      });
      return { l: l - origin.left, r: r - origin.left, t: t - origin.top, b: b - origin.top, w: r - l, h: b - t };
    }

    // One line that leaves the portrait, swoops under each statement and ducks behind the photos.
    function buildThread() {
      if (!body || !path || !ink || !portrait) return;
      const origin = body.getBoundingClientRect();
      const W = origin.width;
      const H = origin.height;
      const A = inkBox(says[0], origin);
      const B = inkBox(says[1], origin);
      const g = Math.max(18, W * 0.022);
      const pf = portrait.getBoundingClientRect();
      const start =
        window.innerWidth > MOBILE_MAX
          ? [pf.left - origin.left + pf.width * 0.62, pf.bottom - origin.top - 2]
          : [W * 0.9, -40];
      const pts = [
        start,
        [Math.min(W - 20, A.r + W * 0.16), A.t + A.h * 0.25],
        [A.r + g * 1.5, A.b + g * 0.2],
        [A.l + A.w * 0.55, A.b + g * 1.1],
        [A.l + g, A.b + g * 0.7],
        [W * 0.06, A.b + (B.t - A.b) * 0.3],
        [W * 0.5, A.b + (B.t - A.b) * 0.55],
        [Math.max(20, B.l - W * 0.14), B.t + B.h * 0.2],
        [B.l - g * 1.5, B.b + g * 0.1],
        [B.l + B.w * 0.45, B.b + g * 1.1],
        [B.r - g, B.b + g * 0.7],
        [W * 0.94, H + 60],
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
      ink.setAttribute('y1', String(Math.min(0, start[1])));
      ink.setAttribute('y2', String(H));
      threadLength = path.getTotalLength();
      path.style.strokeDasharray = String(threadLength);
      threadDepth = [];
      let deepest = -Infinity;
      for (let k = 0; k <= THREAD_STEPS; k++) {
        deepest = Math.max(deepest, path.getPointAtLength((threadLength * k) / THREAD_STEPS).y);
        threadDepth.push(deepest);
      }
    }

    function frame() {
      if (!body || !path) return;
      const vh = window.innerHeight;
      const reduce = reduceQuery.matches;

      grows.forEach((el) => {
        const r = (el.parentElement ?? el).getBoundingClientRect();
        const p = reduce ? 1 : easeOut(clamp((vh - r.top) / (vh * 0.75), 0, 1));
        el.style.transform = `scale(${0.92 + p * 0.08})`;
      });

      says.forEach((words) => {
        const first = words[0].getBoundingClientRect();
        const last = words[words.length - 1].getBoundingClientRect();
        const p = reduce ? 1 : clamp((vh * 0.88 - first.top) / (vh * 0.42 + (last.bottom - first.top)), 0, 1);
        words.forEach((w, i) => w.classList.toggle(styles.on, (i + 0.5) / words.length < p * 1.08));
      });

      const head = vh * 0.66 - body.getBoundingClientRect().top;
      let k = 0;
      if (reduce) k = THREAD_STEPS;
      else while (k < THREAD_STEPS && threadDepth[k + 1] <= head) k++;
      path.style.strokeDashoffset = String(threadLength * (1 - k / THREAD_STEPS));
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
      buildThread();
      frame();
    };

    onLayout();
    const resizeObserver = new ResizeObserver(onLayout);
    resizeObserver.observe(body);
    document.fonts?.ready.then(onLayout);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onLayout);
    reduceQuery.addEventListener('change', onLayout);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onLayout);
      reduceQuery.removeEventListener('change', onLayout);
    };
  }, []);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.meta}>
          <div className={styles.lines}>
            <p>
              I&apos;m a <Rotator items={ROLES} delay={0} />
            </p>
            <p>
              I love to <Rotator items={HOBBIES} delay={1200} className={styles.swap2} />
            </p>
            <p>
              I currently work at{' '}
              <a href="https://www.counselhealth.com/" target="_blank" rel="noreferrer">
                Counsel Health
              </a>
            </p>
          </div>
          <div ref={portraitRef} className={clsx(shell.frame, styles.portrait)}>
            <div className={shell.inner}>
              <Image
                src="/images/me.png"
                alt="Picture of the author"
                fill
                preload
                sizes="(max-width: 720px) 92vw, 27vw"
              />
            </div>
          </div>
        </div>
        <h1 data-testid="about-heading">Hi, I&apos;m Jaisal.</h1>
      </section>

      <section ref={bodyRef} className={styles.body}>
        <svg className={styles.thread} aria-hidden="true">
          <defs>
            <linearGradient ref={inkRef} id={gradientId} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="1000">
              <stop offset="0" />
              <stop offset=".5" />
              <stop offset="1" />
            </linearGradient>
          </defs>
          <path ref={threadRef} stroke={`url(#${gradientId})`} />
        </svg>
        <p ref={sayARef} className={styles.say}>
          <Words text="I live in New York City." />
        </p>
        {[
          { src: '/images/about/surfer.jpg', span: styles.w8, sizes: '(max-width: 720px) 92vw, 64vw' },
          { src: '/images/about/arches.jpg', span: styles.w4, sizes: '(max-width: 720px) 46vw, 32vw' },
          { src: '/images/about/coast.jpg', span: styles.w7, sizes: '(max-width: 720px) 92vw, 56vw' },
          { src: '/images/about/palms.jpg', span: styles.w5, sizes: '(max-width: 720px) 46vw, 40vw' },
        ].map((photo) => (
          <div key={photo.src} className={clsx(shell.frame, photo.span)}>
            <div className={shell.inner} data-grow>
              <Image src={photo.src} alt="" fill sizes={photo.sizes} />
            </div>
          </div>
        ))}
        <p ref={sayBRef} className={clsx(styles.say, styles.right)}>
          <Words text="If you are looking to learn more check out" />{' '}
          <a href="https://www.linkedin.com/in/jaisalfriedman/" target="_blank" rel="noreferrer">
            <Words text="my LinkedIn" />
          </a>
          <span className={styles.word} data-word>
            .
          </span>
        </p>
      </section>

      <div className={shell.night}>
        <SlotMachine />

        {collections.length > 0 && (
          <section className={styles.rows}>
            <span className={clsx(shell.pill, styles.rowsLabel)}>Jaisal&apos;s Collections</span>
            {collections.map((collection, i) => (
              <Link key={collection.href} className={styles.row} href={collection.href}>
                <span className={styles.n}>{String(i + 1).padStart(2, '0')}</span>
                <span className={clsx(styles.name, shell.lg)}>{collection.title}</span>
                <span className={clsx(styles.arrow, shell.lg)} aria-hidden="true">
                  →
                </span>
                <span className={styles.thumb}>
                  {collection.photo && (
                    <Image src={collection.photo} alt="" fill sizes="(max-width: 720px) 30vw, 21vw" />
                  )}
                </span>
              </Link>
            ))}
          </section>
        )}

        <section className={styles.reach}>
          <div>
            <span className={clsx(shell.pill, styles.reachLabel)}>Reach out about</span>
            <ul>
              {REACH_OUT.map((topic) => (
                <li key={topic} className={shell.lg}>
                  {topic}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className={clsx(shell.pill, styles.reachLabel)}>Please don&apos;t reach out about</span>
            <ul>
              {NO_REACH_OUT.map((topic) => (
                <li key={topic} className={clsx(shell.lg, styles.no)}>
                  {topic}
                </li>
              ))}
            </ul>
            <p className={styles.note}>I&apos;m not open to new opportunities at the moment.</p>
          </div>
        </section>
      </div>
    </>
  );
}
