import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <section className="gutter py-[var(--space-section)]">
      <p className="label text-[var(--accent-text)]">404</p>
      <h1 className="mt-[var(--space-tight)] text-[length:var(--text-plan-title)] break-words">
        No such plan
      </h1>
      <p className="mt-[var(--space-block)] max-w-[var(--measure)] text-[var(--text-dim)]">
        Nothing is filed under that address.
      </p>
      <Link
        href="/"
        className="label mt-[var(--space-block)] inline-block border-b-[length:var(--rule-thick)] border-[var(--accent)] pb-1 transition-colors duration-[var(--duration-fast)] hover:text-[var(--accent-text)]"
      >
        Back to all plans
      </Link>
    </section>
  );
}
