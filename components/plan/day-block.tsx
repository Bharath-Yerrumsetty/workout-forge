import { Badge } from '@/components/ui/badge';
import { Reveal } from '@/components/motion/reveal';
import { ExerciseList } from '@/components/plan/exercise-list';
import type { PlanDay } from '@/lib/plan-schema';
import { cn } from '@/lib/utils';

type DayBlockProps = {
  day: PlanDay;
  index: number;
  isHard: boolean;
  hardDayLabel: string;
};

/**
 * One training day.
 *
 * The column spans deliberately differ between odd and even days so the right
 * edge of the page stays ragged rather than settling into a uniform grid.
 */
export function DayBlock({ day, index, isHard, hardDayLabel }: DayBlockProps) {
  const isRecovery = day.focus.toLowerCase() === 'recovery';
  const ordinal = String(index + 1).padStart(2, '0');

  return (
    <article
      id={day.day.toLowerCase()}
      // Fragment links only move focus reliably when the target is focusable.
      tabIndex={-1}
      aria-labelledby={`day-${day.day.toLowerCase()}`}
      className={cn(
        'relative scroll-mt-24 border-t-[length:var(--rule-thick)] border-[var(--text)] pt-[var(--space-block)]',
        'md:grid md:grid-cols-12 md:gap-x-8',
        isRecovery && 'hatch',
      )}
    >
      {/* Crimson slab: the plan's own marker for a genuinely hard day. */}
      {isHard ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-[var(--rule-slab)] w-24 bg-[var(--accent)] md:w-40"
        />
      ) : null}

      <header className="md:col-span-4 md:col-start-1">
        <div className="flex items-baseline gap-4">
          <span
            className={cn(
              'label tabular-nums',
              isHard ? 'text-[var(--accent-text)]' : 'text-[var(--text-dim)]',
            )}
          >
            {ordinal}
          </span>
          {isHard ? <Badge variant="hard">{hardDayLabel}</Badge> : null}
          {isRecovery ? <Badge variant="recovery">Recovery</Badge> : null}
        </div>

        <h3
          id={`day-${day.day.toLowerCase()}`}
          className="mt-[var(--space-tight)] text-[length:var(--text-day)] break-words"
        >
          {day.day}
        </h3>

        <p className="mt-[var(--space-tight)] max-w-[34ch] text-[var(--text)]">
          {day.focus}
        </p>

        {day.type ? (
          <p className="label mt-[var(--space-hair)] text-[var(--text-dim)]">
            {day.type}
          </p>
        ) : null}

        {day.conditioningFocus ? (
          <dl className="mt-[var(--space-block)]">
            <dt className="label text-[var(--text-dim)]">Conditioning focus</dt>
            <dd className="mt-[var(--space-hair)] max-w-[34ch] text-[var(--text)]">
              {day.conditioningFocus}
            </dd>
          </dl>
        ) : null}

        {day.summary ? (
          <p className="mt-[var(--space-block)] max-w-[38ch] border-l-[length:var(--rule-thick)] border-[var(--hairline)] pl-4 text-[length:var(--text-micro)] text-[var(--text-dim)]">
            {day.summary}
          </p>
        ) : null}
      </header>

      <Reveal
        className={cn(
          'pb-[var(--space-day)]',
          index % 2 === 0
            ? 'md:col-span-8 md:col-start-5'
            : 'md:col-span-7 md:col-start-6',
        )}
      >
        {day.sections.map((section) => (
          <ExerciseList key={section.label ?? 'main'} section={section} />
        ))}
      </Reveal>
    </article>
  );
}
