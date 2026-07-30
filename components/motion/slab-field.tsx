'use client';

import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { MotionValue } from 'framer-motion';

/**
 * The drifting crimson understructure.
 *
 * Three properties are load-bearing and must survive any edit:
 *
 * 1. It is decorative. `aria-hidden` and `pointer-events: none` keep it out of
 *    the accessibility tree and out of every hit test.
 * 2. It is text-safe. Both tones clear 4.5:1 against every ink colour in the
 *    system, so a slab may pass under live copy without touching legibility.
 *    Verified per-pixel by scripts/check-ui.mjs, not merely by token pairs.
 * 3. Under reduced motion it carries no transform whatsoever — it renders as
 *    static geometry rather than as animation with the duration turned down.
 */

type Slab = {
  readonly tone: 'slab' | 'surface';
  /**
   * Geometry in viewport units, so the field rescales with the page.
   *
   * Vertical values use `svh`, not `vh`. The container is fixed, and on mobile
   * Safari a `vh` resolves against the toolbar-dependent viewport — every
   * toolbar show/hide would re-resolve the height and force a full re-raster
   * of these large clip-path layers mid-scroll. `svh` is stable across that.
   *
   * `top` is measured from the top of the VIEWPORT, not the document, because
   * the container is fixed. A slab is only ever visible while its drifted top
   * is under 100svh — anything positioned beyond that is invisible at every
   * scroll offset while still costing a composited layer.
   */
  readonly left: string;
  readonly top: string;
  readonly width: string;
  readonly height: string;
  /** Angled edges via clip-path — never `rotate`, which is a transform. */
  readonly clip: string;
  /** Vertical travel across the full document scroll, in svh. */
  readonly drift: number;
};

/**
 * The index page is the emptiest surface and carries the boldest field.
 * Plan pages are text-dense, so they get a third of the geometry — the UX
 * guidance against animating more than a couple of elements per view applies
 * to background mass just as much as to foreground motion.
 */
const BOLD: readonly Slab[] = [
  {
    tone: 'slab',
    left: '-18vw',
    top: '-30svh',
    width: '62vw',
    height: '150svh',
    clip: 'polygon(0 0, 100% 6%, 88% 100%, 0 94%)',
    drift: 62,
  },
  {
    tone: 'surface',
    left: '46vw',
    top: '10svh',
    width: '72vw',
    height: '170svh',
    clip: 'polygon(14% 0, 100% 0, 100% 100%, 0 92%)',
    drift: 40,
  },
  {
    tone: 'slab',
    left: '58vw',
    top: '95svh',
    width: '58vw',
    height: '140svh',
    clip: 'polygon(0 8%, 100% 0, 100% 100%, 10% 100%)',
    drift: 84,
  },
  {
    tone: 'surface',
    left: '-24vw',
    top: '118svh',
    width: '66vw',
    height: '160svh',
    clip: 'polygon(0 0, 92% 10%, 100% 100%, 0 100%)',
    drift: 78,
  },
  {
    tone: 'slab',
    left: '18vw',
    top: '165svh',
    width: '78vw',
    height: '150svh',
    clip: 'polygon(6% 0, 100% 4%, 94% 100%, 0 96%)',
    drift: 105,
  },
];

const SPARSE: readonly Slab[] = [
  {
    tone: 'slab',
    left: '-26vw',
    top: '-20svh',
    width: '54vw',
    height: '150svh',
    clip: 'polygon(0 0, 100% 8%, 84% 100%, 0 92%)',
    drift: 48,
  },
  {
    tone: 'surface',
    left: '62vw',
    top: '70svh',
    width: '68vw',
    height: '175svh',
    clip: 'polygon(12% 0, 100% 0, 100% 100%, 0 90%)',
    drift: 34,
  },
  {
    tone: 'slab',
    left: '40vw',
    top: '130svh',
    width: '70vw',
    height: '150svh',
    clip: 'polygon(0 6%, 100% 0, 100% 100%, 8% 100%)',
    drift: 85,
  },
];

const TONE: Record<Slab['tone'], string> = {
  slab: 'var(--slab)',
  surface: 'var(--surface)',
};

function StaticSlab({ slab }: { slab: Slab }) {
  return (
    <div
      className="absolute"
      style={{
        left: slab.left,
        top: slab.top,
        width: slab.width,
        height: slab.height,
        clipPath: slab.clip,
        backgroundColor: TONE[slab.tone],
      }}
    />
  );
}

function DriftingSlab({
  slab,
  progress,
}: {
  slab: Slab;
  progress: MotionValue<number>;
}) {
  // Derived on the compositor from a motion value — this never re-renders the
  // component, which is what keeps long tasks off the scroll path.
  const y = useTransform(progress, [0, 1], ['0svh', `${-slab.drift}svh`]);

  return (
    <m.div
      className="absolute will-change-transform"
      style={{
        left: slab.left,
        top: slab.top,
        width: slab.width,
        height: slab.height,
        clipPath: slab.clip,
        backgroundColor: TONE[slab.tone],
        y,
      }}
    />
  );
}

export function SlabField() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const slabs = pathname === '/' ? BOLD : SPARSE;

  // The server, and the first client paint, emit transform-free geometry.
  // Motion is an upgrade applied after mount, never a hydration difference.
  const animate = mounted && !reduced;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      // `contain: paint` bounds paint and invalidation to this box, so a slab
      // updating its transform cannot make the browser reconsider anything
      // outside the layer. Safe here: the container is viewport-sized and
      // already forms a stacking context.
      style={{ zIndex: 'var(--z-slabs)', contain: 'paint' }}
    >
      {/*
        Keyed by index, deliberately.

        SlabField lives in the root layout and persists across navigation, but
        `slabs` swaps between two constants of different length. Keying by
        geometry gives the two arrays zero keys in common, so React would tear
        down and rebuild every slab on each route change instead of restyling
        them. Both arrays are fixed, code-authored, and never reordered or
        spliced, so the usual objection to index keys does not apply.
      */}
      {slabs.map((slab, index) =>
        animate ? (
          <DriftingSlab key={index} slab={slab} progress={scrollYProgress} />
        ) : (
          <StaticSlab key={index} slab={slab} />
        ),
      )}

      <div className="grid-rule absolute inset-0" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
