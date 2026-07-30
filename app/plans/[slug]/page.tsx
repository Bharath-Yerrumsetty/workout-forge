import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Reveal } from '@/components/motion/reveal';
import { DayBlock } from '@/components/plan/day-block';
import {
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

  return {
    title: plan.title,
    description: plan.subtitle,
  };
}

export default async function PlanPage({ params }: PageProps) {
  const { slug } = await params;
  const plan = getPlan(slug);

  if (!plan) {
    notFound();
  }

  const stats = planStats(plan);

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

          <p className="mt-[var(--space-tight)] max-w-[var(--measure)] md:col-span-8 md:col-start-5 md:mt-0">
            <span className="label text-[var(--text-dim)]">Goal — </span>
            {plan.goal}
          </p>
        </div>

        <dl className="mt-[var(--space-day)] flex flex-wrap gap-x-12 gap-y-6">
          <div>
            <dt className="label text-[var(--text-dim)]">Training days</dt>
            <dd className="mt-[var(--space-hair)] text-[length:var(--text-day)] tabular-nums leading-none">
              {stats.trainingDays}
            </dd>
          </div>
          <div>
            <dt className="label text-[var(--text-dim)]">Hard days</dt>
            <dd className="mt-[var(--space-hair)] text-[length:var(--text-day)] tabular-nums leading-none text-[var(--accent-text)]">
              {stats.hardDays}
            </dd>
          </div>
          <div>
            <dt className="label text-[var(--text-dim)]">Movements</dt>
            <dd className="mt-[var(--space-hair)] text-[length:var(--text-day)] tabular-nums leading-none">
              {stats.movements}
            </dd>
          </div>
        </dl>
      </header>

      <section
        aria-labelledby="weekly-structure"
        className="gutter py-[var(--space-day)]"
      >
        <SectionHeading
          ordinal="01"
          id="weekly-structure"
          title="Weekly structure"
        />
        <Reveal>
          <WeeklyStructure rows={plan.weeklyStructure} hardDays={plan.hardDays} />
        </Reveal>
      </section>

      <section
        aria-labelledby="programming-rules"
        className="gutter pb-[var(--space-day)]"
      >
        <SectionHeading
          ordinal="02"
          id="programming-rules"
          title="Programming rules"
        />
        <RuleList rules={plan.programmingRules} />
      </section>

      <section
        aria-labelledby="daily-plan"
        className="gutter pb-[var(--space-day)]"
      >
        <SectionHeading ordinal="03" id="daily-plan" title="Daily training" />
        {plan.days.map((day, index) => (
          <DayBlock
            key={day.day}
            day={day}
            index={index}
            isHard={plan.hardDays.includes(day.day)}
          />
        ))}
      </section>

      <section
        aria-labelledby="volume-targets"
        className="gutter pb-[var(--space-day)]"
      >
        <SectionHeading
          ordinal="04"
          id="volume-targets"
          title="Weekly volume"
        />
        <Reveal>
          <VolumeTargets targets={plan.volumeTargets} />
        </Reveal>
      </section>

      <section
        aria-labelledby="variety-framework"
        className="gutter pb-[var(--space-day)]"
      >
        <SectionHeading
          ordinal="05"
          id="variety-framework"
          title="Exercise variety"
        />
        <p className="mb-[var(--space-block)] max-w-[var(--measure)] text-[var(--text-dim)]">
          {plan.varietyFramework.note}
        </p>
        <VarietyFramework patterns={plan.varietyFramework.patterns} />
      </section>

      <section
        aria-labelledby="progression"
        className="gutter pb-[var(--space-day)]"
      >
        <SectionHeading
          ordinal="06"
          id="progression"
          title="Progression & recovery"
        />
        <RuleList rules={plan.progressionRules} />
      </section>

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
    </article>
  );
}
