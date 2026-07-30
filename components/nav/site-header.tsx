'use client';

import { m, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export type PlanLink = {
  readonly slug: string;
  readonly title: string;
};

/**
 * Persistent navigation and read position.
 *
 * The bar is solid rather than translucent: it sits above the drifting slab
 * layer, and an opaque band is the one treatment that keeps the wordmark
 * legible no matter which slab happens to be behind it.
 */
export function SiteHeader({ plans }: { plans: readonly PlanLink[] }) {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 border-b-[length:var(--rule-thin)] border-[var(--hairline)] bg-[var(--bg)]"
      style={{ zIndex: 'var(--z-header)' }}
    >
      <nav
        aria-label="Main"
        className="gutter flex h-[var(--header-h)] items-stretch justify-between gap-4"
      >
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className="label flex items-center whitespace-nowrap transition-colors duration-[var(--duration-fast)] hover:text-[var(--accent-text)]"
        >
          Workout<span className="text-[var(--accent-text)]">/</span>Forge
        </Link>

        <ul role="list" className="flex items-stretch">
          {plans.map((plan, index) => {
            const href = `/plans/${plan.slug}`;
            const isActive = pathname === href;
            const ordinal = String(index + 1).padStart(2, '0');

            return (
              <li key={plan.slug} className="flex items-stretch">
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  /*
                   * The ordinal leads the accessible name because below `md`
                   * it is the only visible label. WCAG 2.5.3 requires the
                   * visible text to be contained in the accessible name, or a
                   * voice-control user saying "click 01" matches nothing.
                   */
                  aria-label={`${ordinal} ${plan.title}`}
                  className={cn(
                    'label group relative flex items-center gap-2 pl-5 transition-colors duration-[var(--duration-fast)]',
                    isActive
                      ? 'text-[var(--text)]'
                      : 'text-[var(--text-dim)] hover:text-[var(--text)]',
                  )}
                >
                  <span
                    className={cn(
                      'tabular-nums',
                      isActive
                        ? 'text-[var(--accent-text)]'
                        : 'text-[var(--text-dim)]',
                    )}
                  >
                    {ordinal}
                  </span>

                  {/* The full title is on aria-label, so hiding it under md
                      costs assistive tech nothing. */}
                  <span
                    aria-hidden="true"
                    className="hidden max-w-[18ch] truncate md:block"
                  >
                    {plan.title}
                  </span>

                  {/* Active marker, and the hover wipe for the rest. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute bottom-0 left-5 right-0 h-[var(--rule-thick)] bg-[var(--accent)]',
                      !isActive && 'wipe',
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ReadProgress />
    </header>
  );
}

/**
 * Read position along the document.
 *
 * Decorative by design: it restates what the native scrollbar already conveys,
 * so it is marked aria-hidden rather than exposed as a progressbar that would
 * announce a percentage nobody asked for.
 *
 * It does not render at all under reduced motion. A progress bar's resting
 * state is scaleX(0) — a real, non-identity transform — and the guarantee this
 * project holds is that reduced motion leaves zero transformed elements on the
 * page. Suppressing it is honest; exempting it from the audit would not be.
 */
function ReadProgress() {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 40,
    restDelta: 0.001,
  });

  useEffect(() => setMounted(true), []);

  if (!mounted || reduced) return null;

  return (
    <m.div
      aria-hidden="true"
      className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-[var(--accent)]"
      style={{ scaleX }}
    />
  );
}
