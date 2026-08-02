import * as React from 'react';
import { Link } from 'react-router-dom';

/**
 * Hand-written, deliberately. It is one page, and a content pipeline for it
 * would be machinery for its own sake. The copy is the draft from
 * docs/decisions.md, which records why it was written to be shipped rather than rewritten.
 */
export function AboutPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">About devgym</h1>

      <div className="md mt-6">
        <section>
          <h2>What this is</h2>
          <p>
            devgym is a practice gym for web-dev fundamentals: short daily problems, timed workouts
            against real toolchains, and a <Link to="/handbook">handbook</Link> to study from. It
            runs entirely on your machine, fully offline. Grading is deterministic; there is no AI
            anywhere in the loop at runtime.
          </p>
          <p>
            It exists because of a simple worry: the more the day job leans on LLMs, the fewer reps
            the fundamentals get. This is a place to keep doing them yourself: write the query, take
            the feedback, build the thing under a timer. It started as one person&apos;s morning
            routine and is shared in case it is useful to anyone else who wants to keep their
            practical skills sharp without AI assistance.
          </p>
        </section>

        <section>
          <h2>What it owes to other people</h2>
          <p>
            Nearly everything. This project stands on open source software, freely shared writing,
            and the work of people who teach: course authors, documentation writers, bloggers, and
            the maintainers of every library in the lockfile. Where content draws on an identifiable
            source, it is cited in a footnote on the page; if you find something that should be
            credited and isn&apos;t, please open an issue, because that is a bug.
          </p>
        </section>

        <section>
          <h2>How it was written</h2>
          <p>
            Largely by an LLM, then reviewed progressively as it gets used: a page gets read
            properly during the study session it was written for, and corrected there. The test
            suite guarantees that every canonical answer grades correctly and every workout solution
            passes its checkpoints; it cannot guarantee that an explanation or a handbook page is
            true. Every handbook page carries its sources and the date its claims were last checked
            against them, so you can see how far that review has actually got. Corrections are very
            welcome and easy to make; every piece of content is a small file in the open repo.
          </p>
        </section>

        <section>
          <h2>Credit</h2>
          <p>
            The only thing claimed as original here is the idea of consolidating all of this into
            one place for deliberate practice. The knowledge belongs to the people cited on each
            page and to the wider community that shared it. The mistakes, statistically speaking,
            belong to the LLM.
          </p>
        </section>

        <section>
          <h2>Feedback</h2>
          <p>
            Issues and pull requests are welcome, for content errors above all. If a grader marked
            your correct answer wrong,{' '}
            <code>pnpm grade &lt;slug&gt; &quot;&lt;answer&gt;&quot;</code> prints the diagnosis;
            paste it into an issue and that is usually the whole report.
          </p>
        </section>

        <section>
          <h2>How it tries to teach</h2>
          <p>
            Four techniques with evidence behind them, and one ladder of review intervals that is a
            guess. <Link to="/how-it-teaches">How devgym tries to teach</Link> names the file or the
            screen where each technique happens, cites the research it leans on, and says plainly
            which part of the schedule was made up.
          </p>
        </section>

        <section>
          <h2>Colophon</h2>
          <p>
            Built on pnpm workspaces, Vite, React, TypeScript, Tailwind, shadcn/ui, NestJS, Drizzle,
            better-sqlite3, PGlite, CodeMirror and Vitest, and each workout borrows a stack of its
            own besides (Express, Kysely, TypeORM, jose and friends). Every one of these is
            somebody&apos;s freely given work. Thank you.
          </p>
        </section>
      </div>
    </div>
  );
}
