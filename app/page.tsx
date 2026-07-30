import Link from 'next/link';

import { Reveal } from '@/components/motion/reveal';
import { plans, planStats } from '@/lib/plans';

export default function HomePage() {
  const totals = plans.reduce(
    (sum, plan) => {
      const stats = planStats(plan);
      return {
        days: sum.days + stats.trainingDays,
        movements: sum.movements + stats.movements,
      };
    },
    { days: 0, movements: 0 },
  );

  return (
    <>
      <section
        aria-labelledby="masthead"
        className="gutter border-b-[length:var(--rule-slab)] border-[var(--accent)] pb-[var(--space-section)] pt-[var(--space-day)]"
      >
        <p className="label text-[var(--text-dim)]">
          Index — {plans.length} {plans.length === 1 ? 'plan' : 'plans'} on file
        </p>

        <h1
          id="masthead"
          className="mt-[var(--space-block)] text-[length:var(--text-display)] break-words"
        >
          Workout
          <br />
          <span className="relative inline-block">
            {/* Crimson strike behind the word — the one place the bright
                accent touches display type, where scale makes it safe. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-[-0.04em] bottom-[0.14em] h-[0.14em] bg-[var(--accent)]"
            />
            <span className="relative">Forge</span>
          </span>
        </h1>

        <div className="mt-[var(--space-day)] md:grid md:grid-cols-12 md:gap-x-8">
          <p className="max-w-[var(--measure)] text-[var(--text-dim)] md:col-span-7">
            Source documents in. Structured training out. Every plan here was
            transcribed from a document, validated against a schema, and
            rendered static — nothing is parsed at request time.
          </p>

          <dl className="mt-[var(--space-block)] flex gap-10 md:col-span-4 md:col-start-9 md:mt-0 md:justify-end">
            <div>
              <dt className="label text-[var(--text-dim)]">Days</dt>
              <dd className="mt-[var(--space-hair)] text-[length:var(--text-day)] tabular-nums leading-none">
                {totals.days}
              </dd>
            </div>
            <div>
              <dt className="label text-[var(--text-dim)]">Movements</dt>
              <dd className="mt-[var(--space-hair)] text-[length:var(--text-day)] tabular-nums leading-none text-[var(--accent-text)]">
                {totals.movements}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="plans" className="gutter py-[var(--space-day)]">
        <h2 id="plans" className="sr-only">
          Plans
        </h2>

        <ul role="list">
          {plans.map((plan, index) => {
            const stats = planStats(plan);

            /*
             * Wrapping the whole card in one link makes its accessible name
             * the concatenation of every descendant — title, subtitle and
             * three stat pairs run together as "Days 6 Hard 3 Moves 69".
             * The same figures are stated here as a sentence instead, and the
             * visual <dl> is hidden from assistive tech to avoid saying it
             * twice. No information is lost, only the run-on.
             */
            const label =
              `${plan.title}. ${plan.subtitle}. ` +
              `${stats.trainingDays} training days, ` +
              `${stats.hardDays} ${plan.hardDayLabel.toLowerCase()} days, ` +
              `${stats.movements} movements.`;

            return (
              <li key={plan.slug}>
                <Reveal>
                  <Link
                    href={`/plans/${plan.slug}`}
                    aria-label={label}
                    className="group relative block border-t-[length:var(--rule-thick)] border-[var(--text)] py-[var(--space-day)] transition-colors duration-[var(--duration-normal)] hover:bg-[var(--surface)]"
                  >
                    {/* Crimson wipe along the rule. clip-path, not scaleX —
                        the resting state must carry no transform. */}
                    <span
                      aria-hidden="true"
                      className="wipe absolute inset-x-0 top-[calc(var(--rule-thick)*-1)] h-[var(--rule-thick)] bg-[var(--accent)]"
                    />

                    <div className="md:grid md:grid-cols-12 md:items-baseline md:gap-x-8">
                      <span
                        aria-hidden="true"
                        className="block font-[family-name:var(--font-display)] text-[length:var(--text-day)] leading-none tabular-nums tracking-[var(--tracking-brutal)] text-[var(--text-dim)] transition-colors duration-[var(--duration-normal)] group-hover:text-[var(--accent-text)] md:col-span-2"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div className="mt-[var(--space-block)] md:col-span-7 md:mt-0">
                        <h3 className="text-[length:var(--text-plan-title)] break-words transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-expo)] md:group-hover:translate-x-3">
                          {plan.title}
                        </h3>
                        <p className="mt-[var(--space-block)] max-w-[var(--measure)] text-[var(--text-dim)]">
                          {plan.subtitle}
                        </p>
                      </div>

                      <dl
                        aria-hidden="true"
                        className="mt-[var(--space-block)] flex gap-8 md:col-span-3 md:mt-0 md:justify-end"
                      >
                        <div>
                          <dt className="label text-[var(--text-dim)]">Days</dt>
                          <dd className="mt-[var(--space-hair)] tabular-nums">
                            {stats.trainingDays}
                          </dd>
                        </div>
                        <div>
                          <dt className="label text-[var(--text-dim)]">
                            {plan.hardDayLabel}
                          </dt>
                          <dd className="mt-[var(--space-hair)] tabular-nums text-[var(--accent-text)]">
                            {stats.hardDays}
                          </dd>
                        </div>
                        <div>
                          <dt className="label text-[var(--text-dim)]">
                            Moves
                          </dt>
                          <dd className="mt-[var(--space-hair)] tabular-nums">
                            {stats.movements}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <p className="label mt-[var(--space-block)] border-t-[length:var(--rule-thick)] border-[var(--text)] pt-[var(--space-tight)] text-[var(--text-dim)]">
          End of file
        </p>
      </section>
    </>
  );
}
