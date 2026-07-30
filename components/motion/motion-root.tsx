'use client';

import { LazyMotion, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Loads only the DOM animation feature set (`domAnimation`) instead of the
 * full `motion` bundle. Every animated component in the app uses the `m`
 * primitives, which require this provider as an ancestor.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  // `strict` makes rendering a full `motion.*` component throw, so an accidental
  // import can never silently pull the large bundle back in.
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
