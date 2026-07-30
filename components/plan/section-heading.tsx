import { cn } from '@/lib/utils';

type SectionHeadingProps = {
  ordinal: string;
  title: string;
  id: string;
  className?: string;
};

export function SectionHeading({
  ordinal,
  title,
  id,
  className,
}: SectionHeadingProps) {
  return (
    <header className={cn('mb-[var(--space-block)]', className)}>
      <span className="label block text-[var(--text-dim)] tabular-nums">
        {ordinal}
      </span>
      <h2
        id={id}
        className="mt-[var(--space-tight)] text-[length:var(--text-day)] break-words"
      >
        {title}
      </h2>
    </header>
  );
}
