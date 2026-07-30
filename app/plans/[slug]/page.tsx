import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Reveal } from '@/components/motion/reveal';
import { DayBlock } from '@/components/plan/day-block';
import {
  ExtraSectionList,
  VarietyFramework,
  VolumeTargets,
} from '@/components/plan/reference-tables';
import { RuleList } from '@/components/plan/rule-list';
import { SectionHeading } from '@/components/plan/section-heading';
import { WeeklyStructure } from '@/components/plan/weekly-structure';
import { getPlan, planStats, plans } from '@/lib/plans';

export const dynamicParams = false;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return plans.map((plan) => ({ slug: plan.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const plan = getPlan(slug);

  if (!plan) {
    return { title: 'Plan not found' };
  }

  return { title: plan.title, description: plan.subtitle };
}

export default async function PlanPage({ params }: PageProps) {
  const { slug } = await params;
  const plan = getPlan(slug);

  if (!plan) {
    notFound();
  }

  const stats = planStats(plan);
  const detailedDays = plan.days.map((day) => day.day);

  /**
   * Sections are assembled rather than hardcoded, because plans differ in which
   * ones they carry. Ordinals are assigned from what actually renders, so the
   * numbering never skips.
   */
  const sections: { id: string; title: string; body: ReactNode }[] = [
    {
      id: 'weekly-structure',
      title: 'Weekly structure',
      body: (
        <>
          <Reveal>
            <WeeklyStructure
              rows={plan.weeklyStructure}
              hardDays={plan.hardDays}
              hardDayLabel={plan.hardDayLabel}
              linkedDays={detailedDays}
            />
          </Reveal>
          {plan.scheduleNotes.length > 0 ? (
            <ul className="mt-[var(--space-block)] flex flex-col gap-2">
              {plan.scheduleNotes.map((note) => (
                <li
                  key={note}
                  className="max-w-[var(--measure)] text-[length:var(--text-micro)] text-[var(--text-dim)]"
                >
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ),
    },
  ];

  if (plan.programmingRules.length > 0) {
    sections.push({
      id: 'programming-rules',
      title: 'Programming rules',
      body: <RuleList rules={plan.programmingRules} />,
    });
  }

  sections.push({
    id: 'daily-plan',
    title: 'Daily training',
    body: (
      <>
        {plan.days.map((day, index) => (
          <DayBlock
            key={day.day}
            day={day}
            index={index}
            isHard={plan.hardDays.includes(day.day)}
            hardDayLabel={plan.hardDayLabel}
          />
        ))}
      </>
    ),
  });

  if (plan.volumeTargets.length > 0) {
    sections.push({
      id: 'volume-targets',
      title: 'Weekly volume',
      body: (
        <Reveal>
          <VolumeTargets targets={plan.volumeTargets} />
        </Reveal>
      ),
    });
  }

  if (plan.varietyFramework) {
    const framework = plan.varietyFramework;
    sections.push({
      id: 'variety-framework',
      title: 'Exercise variety',
      body: (
        <>
          <p className="mb-[var(--space-block)] max-w-[var(--measure)] text-[var(--text-dim)]">
            {framework.note}
          </p>
          <VarietyFramework patterns={framework.patterns} />
        </>
      ),
    });
  }

  if (plan.progressionRules.length > 0) {
    sections.push({
      id: 'progression',
      title: 'Progression & recovery',
      body: <RuleList rules={plan.progressionRules} />,
    });
  }

  for (const extra of plan.extraSections) {
    sections.push({
      id: `section-${extra.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: extra.title,
      body: <ExtraSectionList section={extra} />,
    });
  }

  return (
    <article>
      <header
        aria-labelledby="plan-title"
        className="gutter border-b-[length:var(--rule-slab)] border-[var(--accent)] pb-[var(--space-day)] pt-[var(--space-day)]"
      >
        <h1
          id="plan-title"
          className="text-[length:var(--text-display)] break-words"
        >
          {plan.title}
        </h1>

        <div className="mt-[var(--space-block)] md:grid md:grid-cols-12 md:gap-x-8">
          <p className="label text-[var(--text-dim)] md:col-span-4">
            {plan.subtitle}
          </p>

          {plan.goal ? (
            <p className="mt-[var(--space-tight)] max-w-[var(--measure)] md:col-span-8 md:col-start-5 md:mt-0">
              <span className="label text-[var(--text-dim)]">Goal — </span>
              {plan.goal}
            </p>
          ) : null}
        </div>

        <dl className="mt-[var(--space-day)] flex flex-wrap gap-x-12 gap-y-6">
          <div>
            <dt className="label text-[var(--text-dim)]">Training days</dt>
            <dd className="mt-[var(--space-hair)] text-[length:var(--text-day)] tabular-nums leading-none">
              {stats.trainingDays}
            </dd>
          </div>
          {stats.hardDays > 0 ? (
            <div>
              <dt className="label text-[var(--text-dim)]">
                {plan.hardDayLabel} days
              </dt>
              <dd className="mt-[var(--space-hair)] text-[length:var(--text-day)] tabular-nums leading-none text-[var(--accent-text)]">
                {stats.hardDays}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="label text-[var(--text-dim)]">Movements</dt>
            <dd className="mt-[var(--space-hair)] text-[length:var(--text-day)] tabular-nums leading-none">
              {stats.movements}
            </dd>
          </div>
        </dl>
      </header>

      {sections.map((section, index) => (
        <section
          key={section.id}
          aria-labelledby={section.id}
          className="gutter pb-[var(--space-day)] first-of-type:pt-[var(--space-day)]"
        >
          <SectionHeading
            ordinal={String(index + 1).padStart(2, '0')}
            id={section.id}
            title={section.title}
          />
          {section.body}
        </section>
      ))}

      {plan.intent ? (
        <section
          aria-labelledby="intent"
          className="gutter border-t-[length:var(--rule-slab)] border-[var(--accent)] py-[var(--space-day)]"
        >
          <h2 id="intent" className="label text-[var(--text-dim)]">
            Plan intent
          </h2>
          <p className="mt-[var(--space-block)] max-w-[24ch] text-[length:var(--text-plan-title)] font-[family-name:var(--font-display)] uppercase leading-[0.92] tracking-[var(--tracking-brutal)]">
            {plan.intent}
          </p>
        </section>
      ) : null}
    </article>
  );
}
