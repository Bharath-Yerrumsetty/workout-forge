import {
  StaggerDefinitionList,
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
import type { VarietyPattern, VolumeTarget } from '@/lib/plan-schema';

export function VolumeTargets({
  targets,
}: {
  targets: readonly VolumeTarget[];
}) {
  return (
    <Table aria-labelledby="volume-targets" className="min-w-[22rem]">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Muscle group</TableHead>
          <TableHead scope="col" className="text-right">
            Direct weekly sets
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {targets.map((target) => (
          <TableRow key={target.muscleGroup} className="hover:bg-[var(--surface)]">
            <TableRowHeader>{target.muscleGroup}</TableRowHeader>
            <TableCell className="text-right tabular-nums text-[var(--text-dim)]">
              {target.weeklySets}
            </TableCell>
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
