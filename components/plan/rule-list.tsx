import { StaggerItem, StaggerOrderedList } from '@/components/motion/reveal';

/**
 * Numbered rules, set with a hanging ordinal so the prose column stays flush
 * while the numbers break out into the margin.
 *
 * Rendered as an `ol` because the content is genuinely sequential: assistive
 * tech then announces position and count natively rather than depending on the
 * painted ordinal.
 */
export function RuleList({ rules }: { rules: readonly string[] }) {
  return (
    <StaggerOrderedList className="border-t-[length:var(--rule-thin)] border-[var(--hairline)]">
      {rules.map((rule, index) => (
        <StaggerItem
          key={rule}
          className="grid grid-cols-[3ch_1fr] gap-x-4 border-b-[length:var(--rule-thin)] border-[var(--hairline)] py-[var(--space-row)] sm:grid-cols-[5ch_1fr]"
        >
          <span aria-hidden="true" className="label pt-1 tabular-nums text-[var(--text-dim)]">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="max-w-[var(--measure)]">{rule}</span>
        </StaggerItem>
      ))}
    </StaggerOrderedList>
  );
}
