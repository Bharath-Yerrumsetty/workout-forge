'use client';

import { m, useInView, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/**
 * Scroll-triggered reveals.
 *
 * Three rules hold this together:
 *
 * 1. `initial={false}` — the server and the first client render both paint the
 *    *visible* state. Nothing is ever stamped `opacity: 0` into static HTML, so
 *    content stays readable if JavaScript is slow, blocked, or broken.
 * 2. The hidden state is only ever entered after mount, and only for elements
 *    that are off-screen at that moment, so nothing visible flashes away.
 * 3. `prefers-reduced-motion` pins the state to `show` forever — no transform
 *    is ever applied, rather than merely being applied faster.
 *
 * Only `opacity` and `transform` animate. No layout-bound property is touched.
 *
 * Each list flavour exists as its own component so the underlying element stays
 * semantically correct: `ul` for unordered, `ol` for genuinely sequential
 * rules, `dl` for term/definition pairs.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const IN_VIEW = { once: true, margin: '0px 0px -12% 0px' } as const;

/** Leaving view is instant; only the entrance is animated. */
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28, transition: { duration: 0 } },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const listVariants: Variants = {
  hidden: { transition: { duration: 0 } },
  show: { transition: { staggerChildren: 0.045 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -14, transition: { duration: 0 } },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
};

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Resolves the variant to render. Returns `show` until the component has
 * mounted, so server output and first paint are always the visible state.
 */
function useRevealState(ref: RefObject<Element | null>) {
  const inView = useInView(ref, IN_VIEW);
  const reduced = useReducedMotion();
  const mounted = useMounted();

  if (!mounted || reduced) return 'show';
  return inView ? 'show' : 'hidden';
}

type RevealProps = {
  children: ReactNode;
  className?: string;
};

export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRevealState(ref);

  return (
    <m.div
      ref={ref}
      className={className}
      variants={revealVariants}
      initial={false}
      animate={state}
    >
      {children}
    </m.div>
  );
}

export function StaggerList({ children, className }: RevealProps) {
  const ref = useRef<HTMLUListElement>(null);
  const state = useRevealState(ref);

  return (
    // `role="list"` restores the semantics that `list-style: none` strips in
    // Safari/VoiceOver — without it these announce as plain text, not a list.
    <m.ul
      role="list"
      ref={ref}
      className={className}
      variants={listVariants}
      initial={false}
      animate={state}
    >
      {children}
    </m.ul>
  );
}

/** For genuinely sequential content, so AT announces "item 3 of 8". */
export function StaggerOrderedList({ children, className }: RevealProps) {
  const ref = useRef<HTMLOListElement>(null);
  const state = useRevealState(ref);

  return (
    <m.ol
      role="list"
      ref={ref}
      className={className}
      variants={listVariants}
      initial={false}
      animate={state}
    >
      {children}
    </m.ol>
  );
}

/** For term/definition pairs. Children should be StaggerPair. */
export function StaggerDefinitionList({ children, className }: RevealProps) {
  const ref = useRef<HTMLDListElement>(null);
  const state = useRevealState(ref);

  return (
    <m.dl
      ref={ref}
      className={className}
      variants={listVariants}
      initial={false}
      animate={state}
    >
      {children}
    </m.dl>
  );
}

/** Inherits its animation state from the enclosing list. */
export function StaggerItem({ children, className }: RevealProps) {
  return (
    <m.li className={className} variants={itemVariants}>
      {children}
    </m.li>
  );
}

/** A dt/dd wrapper. Valid as a direct child of `dl`. */
export function StaggerPair({ children, className }: RevealProps) {
  return (
    <m.div className={className} variants={itemVariants}>
      {children}
    </m.div>
  );
}
