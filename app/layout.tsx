import type { Metadata, Viewport } from 'next';
import { Anton, IBM_Plex_Mono } from 'next/font/google';
import Link from 'next/link';

import { MotionRoot } from '@/components/motion/motion-root';

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
          className="label sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-[var(--accent)] focus:px-4 focus:py-3 focus:text-[var(--text)]"
        >
          Skip to content
        </a>

        <MotionRoot>
          <header className="gutter border-b-[length:var(--rule-thin)] border-[var(--hairline)] py-[var(--space-block)]">
            <nav aria-label="Main">
              <Link
                href="/"
                className="label inline-block transition-colors duration-[var(--duration-fast)] hover:text-[var(--accent-text)]"
              >
                Workout&nbsp;Forge
              </Link>
            </nav>
          </header>

          <main id="main">{children}</main>

          <footer className="gutter border-t-[length:var(--rule-thin)] border-[var(--hairline)] py-[var(--space-block)]">
            <p className="label text-[var(--text-dim)]">
              Plans ingested from source documents · rendered statically
            </p>
          </footer>
        </MotionRoot>
      </body>
    </html>
  );
}
