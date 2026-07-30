import {
  StaggerDefinitionList,
  StaggerItem,
  StaggerList,
  StaggerOrderedList,
  StaggerPair,
} from '@/components/motion/reveal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from '@/components/ui/table';
import type {
  ExtraSection,
  VarietyPattern,
  VolumeTarget,
} from '@/lib/plan-schema';

export function VolumeTargets({
  targets,
}: {
  targets: readonly VolumeTarget[];
}) {
  const hasNotes = targets.some((target) => target.note !== null);

  return (
    <Table aria-labelledby="volume-targets" className="min-w-[22rem]">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Muscle group</TableHead>
          <TableHead scope="col" className="text-right">
            Direct weekly sets
          </TableHead>
          {hasNotes ? <TableHead scope="col">Assessment</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {targets.map((target) => (
          <TableRow key={target.muscleGroup} className="hover:bg-[var(--surface)]">
            <TableRowHeader>{target.muscleGroup}</TableRowHeader>
            <TableCell className="text-right tabular-nums text-[var(--text-dim)]">
              {target.weeklySets}
            </TableCell>
            {hasNotes ? (
              <TableCell className="text-[var(--text-dim)]">
                {target.note ?? ''}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function VarietyFramework({
  patterns,
}: {
  patterns: readonly VarietyPattern[];
}) {
  return (
    <StaggerDefinitionList className="border-t-[length:var(--rule-thin)] border-[var(--hairline)]">
      {patterns.map((entry) => (
        <StaggerPair
          key={entry.pattern}
          className="border-b-[length:var(--rule-thin)] border-[var(--hairline)] py-[var(--space-row)]"
        >
          <dt className="label text-[var(--text-dim)]">{entry.pattern}</dt>
          <dd className="mt-[var(--space-hair)] max-w-[var(--measure)] text-[var(--text)]">
            {entry.rotation}
          </dd>
        </StaggerPair>
      ))}
    </StaggerDefinitionList>
  );
}

const itemClass =
  'border-b-[length:var(--rule-thin)] border-[var(--hairline)] py-[var(--space-row)]';

/**
 * A whole document section carried through verbatim. Ordered sources render as
 * `ol` so assistive tech announces position natively.
 */
export function ExtraSectionList({ section }: { section: ExtraSection }) {
  const items = section.items.map((item) => (
    <StaggerItem key={item} className={itemClass}>
      <span className="block max-w-[var(--measure)]">{item}</span>
    </StaggerItem>
  ));

  const className =
    'border-t-[length:var(--rule-thin)] border-[var(--hairline)]';

  return section.ordered ? (
    <StaggerOrderedList className={className}>{items}</StaggerOrderedList>
  ) : (
    <StaggerList className={className}>{items}</StaggerList>
  );
}
