import Link from 'next/link';

import { Reveal } from '@/components/motion/reveal';
import { plans, planStats } from '@/lib/plans';

export default function HomePage() {
  return (
    <>
      <section
        aria-labelledby="masthead"
        className="gutter border-b-[length:var(--rule-slab)] border-[var(--accent)] pb-[var(--space-section)] pt-[var(--space-day)]"
      >
        <h1
          id="masthead"
          className="text-[length:var(--text-display)] break-words"
        >
          Workout
          <br />
          Forge
        </h1>

        <p className="mt-[var(--space-block)] max-w-[var(--measure)] text-[var(--text-dim)]">
          Source documents in. Structured training out. Every plan here was
          transcribed from a document, validated against a schema, and rendered
          static — nothing is parsed at request time.
        </p>
      </section>

      <section aria-labelledby="plans" className="gutter py-[var(--space-day)]">
        <h2 id="plans" className="label text-[var(--text-dim)]">
          {plans.length} {plans.length === 1 ? 'plan' : 'plans'} on file
        </h2>

        <ul className="mt-[var(--space-block)]">
          {plans.map((plan, index) => {
            const stats = planStats(plan);

            return (
              <li key={plan.slug}>
                <Reveal>
                  <Link
                    href={`/plans/${plan.slug}`}
                    className="group block border-t-[length:var(--rule-thick)] border-[var(--text)] py-[var(--space-block)] transition-colors duration-[var(--duration-normal)] hover:bg-[var(--surface)]"
                  >
                    <div className="md:grid md:grid-cols-12 md:items-end md:gap-x-8">
                      <span className="label block text-[var(--text-dim)] tabular-nums md:col-span-2">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div className="md:col-span-7">
                        <h3 className="text-[length:var(--text-plan-title)] break-words transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-expo)] md:group-hover:translate-x-3">
                          {plan.title}
                        </h3>
                        <p className="mt-[var(--space-tight)] max-w-[var(--measure)] text-[var(--text-dim)]">
                          {plan.subtitle}
                        </p>
                      </div>

                      <dl className="mt-[var(--space-block)] flex gap-8 md:col-span-3 md:mt-0 md:justify-end">
                        <div>
                          <dt className="label text-[var(--text-dim)]">Days</dt>
                          <dd className="tabular-nums">{stats.trainingDays}</dd>
                        </div>
                        <div>
                          <dt className="label text-[var(--text-dim)]">Hard</dt>
                          <dd className="tabular-nums text-[var(--accent-text)]">
                            {stats.hardDays}
                          </dd>
                        </div>
                        <div>
                          <dt className="label text-[var(--text-dim)]">Moves</dt>
                          <dd className="tabular-nums">{stats.movements}</dd>
                        </div>
                      </dl>
                    </div>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <p className="mt-[var(--space-block)] border-t-[length:var(--rule-thick)] border-[var(--text)] pt-[var(--space-tight)] label text-[var(--text-dim)]">
          End of file
        </p>
      </section>
    </>
  );
}
