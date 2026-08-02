import * as React from 'react';
import { Link } from 'react-router-dom';

interface Source {
  citation: string;
  where: string;
  url: string;
  host: string;
}

/**
 * The four techniques the app leans on, where each one happens in the code, and
 * which parts are guesses. Hand-written alongside AboutPage for the same reason:
 * it is one page, so a content pipeline for it would be machinery for its own sake.
 *
 * Every claim here was checked against the file it names, and every URL below was
 * fetched before it shipped. If you edit a source line, fetch it again.
 */
export function HowItTeachesPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">How devgym tries to teach</h1>

      <div className="md mt-6">
        <p>
          Four techniques from the learning research shape how this app works. Each section names
          the file, the constant or the screen where the technique actually happens, so you can
          check the claim rather than take it. The last section covers the part that has no evidence
          behind it.
        </p>

        <section>
          <h2>Retrieval practice</h2>
          <p>
            You answer before you see the answer, everywhere. The server never sends a solution you
            have not earned: <code>ProblemsService</code> returns <code>solution: null</code> until
            the problem is solved, or until you unlock it after three wrong attempts (
            <code>REVEAL_AFTER_ATTEMPTS</code> in{' '}
            <code>apps/server/src/problems/problems.service.ts</code>
            ). Workouts hold their solution back the same way, until every checkpoint passes or you
            ask for it.
          </p>
          <p>
            Roediger and Karpicke gave students prose passages, then had them either restudy the
            passage or take free-recall tests on it with no feedback. Five minutes later, restudying
            won. On the delayed tests two days and a week out, the tested students retained
            substantially more, and the restudying students were the more confident of the two
            groups. Dunlosky et al. reviewed ten study techniques and rated practice testing one of
            the two with &quot;high utility&quot;.
          </p>
        </section>

        <section>
          <h2>Spaced repetition</h2>
          <p>
            The interval ladder is a constant: <code>REVIEW_INTERVALS_DAYS</code> in{' '}
            <code>packages/shared/src/index.ts</code>, which is <code>[1, 3, 7, 21, 60]</code>, in
            days. What the scheduler does with it, in <code>nextSchedule</code> in{' '}
            <code>apps/server/src/problems/problems.service.ts</code>:
          </p>
          <ul>
            <li>
              Solving a problem for the first time puts it on the first rung. It returns tomorrow.
            </li>
            <li>
              Each correct review moves up one rung: 3 days, then 7, then 21, then 60. It stays at
              60 from there.
            </li>
            <li>Getting a review wrong drops it back to the first rung, due again tomorrow.</li>
            <li>
              A wrong answer on a problem you have never solved changes nothing. There is no
              schedule to lose yet.
            </li>
          </ul>
          <p>
            A session deals due reviews before new material (
            <code>apps/server/src/sessions/sessions.service.ts</code>), so when both compete for the
            same ten slots, the reviews take them.
          </p>
          <p>
            Distributed practice is the other technique Dunlosky et al. rate &quot;high
            utility&quot;. The confidence behind that rating comes from work like Cepeda et
            al.&apos;s meta-analysis, which pulled together 839 assessments of distributed practice
            from 317 experiments. Neither supplies these five numbers, which is the last section on
            this page.
          </p>
        </section>

        <section>
          <h2>Interleaving</h2>
          <p>
            Consecutive problems come from different categories by construction.{' '}
            <code>assignPositions</code> in <code>apps/server/src/seed/problems.seed.ts</code> sorts
            every problem into easy, medium and hard bands, then round-robins across the categories
            inside each band: one SQL problem, one query-params problem, one JS APIs problem, and
            round again. The practice queue orders by that position, which is why working down the
            list never means twenty SQL questions in a row. Scoping a session to a single category
            switches interleaving off, which is what you want when you are drilling one weak area.
          </p>
          <p>
            The evidence here is the thinnest of the four. Dunlosky et al. rate interleaved practice
            &quot;moderate utility&quot;, not high, and write that the benefits of interleaving
            &quot;have just begun to be systematically explored, so the ultimate effectiveness of
            these techniques is currently unknown&quot;. It is in the app because dealing the queue
            this way costs nothing.
          </p>
        </section>

        <section>
          <h2>Desirable difficulty</h2>
          <p>The friction is the mechanism, in three places.</p>
          <p>
            The grader gives a verdict and a reason, never the answer. A SQL query that returns the
            right rows in the wrong order gets &quot;Right rows, wrong order. Check your ORDER
            BY.&quot; (<code>apps/server/src/grading/sql-grader.ts</code>). That tells you where to
            look and leaves the work with you.
          </p>
          <p>
            Workout briefs state the symptom and never the cause. It is a rule in{' '}
            <code>WRITING.md</code> and it holds for every <code>brief.md</code> and manifest
            summary: you get &quot;9 seconds in production&quot;, not &quot;a query per row&quot;.
            Working out what is wrong is the exercise.
          </p>
          <p>
            A checkpoint hint appears only after that checkpoint has failed.{' '}
            <code>apps/web/src/pages/WorkoutPage.tsx</code> renders a hint for failed checkpoints
            only, so until you have run the suite and watched one fail, you have the checkpoint
            title and the brief.
          </p>
          <p>
            Bjork and Bjork call these desirable difficulties: &quot;Conditions of learning that
            make performance improve rapidly often fail to support long-term retention and transfer,
            whereas conditions that create challenges and slow the rate of apparent learning often
            optimize long-term retention and transfer.&quot; The corollary is the one that matters
            for a practice app: feeling fluent while you study is a poor signal of what you will
            keep.
          </p>
        </section>

        <section>
          <h2>Where the evidence stops</h2>
          <p>The research supports spacing. It does not support 1, 3, 7, 21, 60.</p>
          <p>
            Those five numbers are a guess. They were picked because they looked reasonable, and
            they have never been tuned against anything. devgym has one user, keeps no telemetry and
            sends nothing anywhere, so there is no data set on which 2, 5, 14, 45 could be shown to
            be better or worse. Nobody has measured this schedule against any other.
          </p>
          <p>
            Two findings show the gap between &quot;spacing works&quot; and &quot;this ladder
            works&quot; is wider than it looks. Cepeda et al. found that the best gap depends on how
            long you want to hold on to the material: &quot;the ISI producing maximal retention
            increased as retention interval increased&quot;. A fixed ladder ignores that. And the
            expanding shape is not itself a finding: Karpicke and Roediger tested expanding
            intervals against equally spaced ones and found expanding better 10 minutes after
            learning, while equal spacing produced better retention two days later.
          </p>
          <p>
            So take the ladder as a default that gets you reviewing at all, which is the part with
            evidence behind it, and not as a tuned schedule. Changing it is one line in{' '}
            <code>packages/shared/src/index.ts</code>. A schedule you have reason to trust is a
            better schedule than this one.
          </p>
          <p>
            The <Link to="/about">about page</Link> covers who wrote all this, and how.
          </p>
        </section>
      </div>

      <Sources />
    </div>
  );
}

const SOURCES: Source[] = [
  {
    citation:
      "Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques: promising directions from cognitive and educational psychology. Psychological Science in the Public Interest, 14(1), 4–58. doi:10.1177/1529100612453266",
    where:
      'The utility ratings: practice testing and distributed practice high, interleaved practice moderate.',
    url: 'https://iverson.cm.utexas.edu/courses/310M/Handouts/Dunlosky%20et%20al.%20-%202013%20-%20Improving%20Students%92%20Learning%20With%20Effective%20Learni.pdf',
    host: 'open copy, University of Texas at Austin',
  },
  {
    citation:
      'Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255. doi:10.1111/j.1467-9280.2006.01693.x',
    where: 'Testing beat restudying on the delayed tests, and confidence ran the other way.',
    url: 'https://learninglab.psych.purdue.edu/downloads/2006/2006_Roediger_Karpicke_PsychSci.pdf',
    host: "authors' copy, Purdue Cognition and Learning Laboratory",
  },
  {
    citation:
      'Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: a review and quantitative synthesis. Psychological Bulletin, 132(3), 354–380. doi:10.1037/0033-2909.132.3.354',
    where:
      '839 assessments across 317 experiments, and the best gap grows with the retention interval.',
    url: 'https://www.yorku.ca/ncepeda/publications/CPVWR2006.pdf',
    host: "author's copy, York University",
  },
  {
    citation:
      'Karpicke, J. D., & Roediger, H. L. (2007). Expanding retrieval practice promotes short-term retention, but equally spaced retrieval enhances long-term retention. Journal of Experimental Psychology: Learning, Memory, and Cognition, 33(4), 704–719. doi:10.1037/0278-7393.33.4.704',
    where: 'Expanding intervals won at 10 minutes; equal spacing won at two days.',
    url: 'https://learninglab.psych.purdue.edu/downloads/2007/2007_Karpicke_Roediger_JEPLMC.pdf',
    host: "authors' copy, Purdue Cognition and Learning Laboratory",
  },
  {
    citation:
      'Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good way: creating desirable difficulties to enhance learning. In M. A. Gernsbacher, R. W. Pew, L. M. Hough & J. R. Pomerantz (eds.), Psychology and the Real World: Essays Illustrating Fundamental Contributions to Society, pages 56–64. Worth Publishers.',
    where: 'Desirable difficulties, and why rapid gains during study mislead.',
    url: 'https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf',
    host: "authors' copy, UCLA Bjork Learning and Forgetting Lab",
  },
];

function Sources(): React.ReactElement {
  return (
    <footer className="mt-10 border-t pt-4 text-sm text-muted-foreground">
      <h2 className="font-medium text-foreground">Sources</h2>
      <ol className="mt-2 space-y-3">
        {SOURCES.map((source) => (
          <li key={source.url}>
            <p>{source.citation}</p>
            <p className="mt-1">
              {source.where}{' '}
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                PDF
              </a>{' '}
              ({source.host}).
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs">
        Every link was fetched on 2 August 2026. Where the journal version is paywalled the link is
        an open copy of the same paper, and the credit belongs to the paper.
      </p>
    </footer>
  );
}
