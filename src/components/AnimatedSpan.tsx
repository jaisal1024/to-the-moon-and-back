import React, { useEffect, useRef } from 'react';

// DO NOT change without also changing the animation css duration. Needs to be half because its alternating.
const transitionTotal = 4000;
const fadeInAnimation = 'fadeIn 2s alternate infinite';

export default function AnimatedSpan({
  items,
  ...rest
}: {
  items: string[];
} & React.HTMLProps<HTMLSpanElement>) {
  const [current, setCurrent] = React.useState(0);
  const ref = useRef<HTMLSpanElement>();
  if (items.length < 1) {
    throw new Error('AnimatedTypography must have at least one string');
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((current) => (current + 1) % items.length);
      if (ref.current && !ref.current.style.animation) {
        // we have to add it in the interval because then it synchronizes perfectly which is weird
        // but it works
        ref.current.style.animation = fadeInAnimation;
      }
    }, transitionTotal);
    return () => clearInterval(interval);
  }, [current, items.length]);
  return (
    <span ref={ref} {...rest}>
      {items[current]}
    </span>
  );
}
