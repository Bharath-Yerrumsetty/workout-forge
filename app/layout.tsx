import type { Metadata, Viewport } from 'next';
import { Anton, IBM_Plex_Mono } from 'next/font/google';

import { MotionRoot } from '@/components/motion/motion-root';
import { SlabField } from '@/components/motion/slab-field';
import { SiteHeader } from '@/components/nav/site-header';
import { plans } from '@/lib/plans';

import './globals.css';

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Workout Forge',
    template: '%s — Workout Forge',
  },
  description: 'Training plans, rendered without mercy.',
};

export const viewport: Viewport = {
  themeColor: '#0a0709',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anton.variable} ${plexMono.variable}`}>
      <body>
        <a
          href="#main"
          className="label sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:bg-[var(--accent)] focus:px-4 focus:py-3 focus:text-[var(--text)]"
          style={{ zIndex: 'var(--z-skip)' }}
        >
          Skip to content
        </a>

        <MotionRoot>
          <SlabField />

          {/* Establishes the stacking context that lifts every readable
              surface above the decorative slab layer. */}
          <div className="relative" style={{ zIndex: 'var(--z-content)' }}>
            <SiteHeader
              plans={plans.map(({ slug, title }) => ({ slug, title }))}
            />

            {/* tabIndex makes the skip link actually move focus, not just
                scroll the viewport. */}
            <main id="main" tabIndex={-1}>
              {children}
            </main>

            <footer className="gutter border-t-[length:var(--rule-thin)] border-[var(--hairline)] bg-[var(--bg)] py-[var(--space-block)]">
              <p className="label text-[var(--text-dim)]">
                Plans ingested from source documents · rendered statically
              </p>
            </footer>
          </div>
        </MotionRoot>
      </body>
    </html>
  );
}
