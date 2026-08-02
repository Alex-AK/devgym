import type {
  Category,
  Difficulty,
  PathDetail,
  PathStep,
  PathStepDetail,
  PathSummary,
  ProblemStatus,
  Relevance,
  WorkoutManifest,
} from '@devgym/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { CurrentUserService } from '../common/current-user.service';
import type { AppDb } from '../db/client';
import { APP_DB } from '../db/db.module';
import { problemProgress, problems, workoutAttempts } from '../db/schema';
import { allPages, type HandbookPageContent, readSection } from '../handbook/handbook-content';
import { listManifests } from '../workouts/workout-content';
import { listPaths, type PathContent, readPath } from './paths-content';

interface ProblemFacts {
  title: string;
  category: Category;
  difficulty: Difficulty;
  relevance: Relevance;
  status: ProblemStatus;
}

/** Everything a step needs to resolve, read once per request rather than per step. */
interface Lookups {
  pages: Map<string, HandbookPageContent>;
  sectionTitles: Map<string, string>;
  problems: Map<string, ProblemFacts>;
  workouts: Map<string, { manifest: WorkoutManifest; bestPassed: number | null }>;
}

@Injectable()
export class PathsService {
  constructor(
    @Inject(APP_DB) private readonly db: AppDb,
    private readonly currentUser: CurrentUserService
  ) {}

  list(): PathSummary[] {
    const lookups = this.lookups();
    return listPaths().map((content) => toSummary(content, this.resolve(content, lookups)));
  }

  detail(slug: string): PathDetail {
    let content: PathContent;
    try {
      content = readPath(slug);
    } catch {
      throw new NotFoundException(`No path ${slug}`);
    }

    const steps = this.resolve(content, this.lookups());

    return {
      ...toSummary(content, steps),
      steps,
      // Where you left off, derived rather than stored: the first step that
      // carries progress and is not done. A page carries none, so it never
      // holds the marker and never satisfies it either.
      resumeIndex: steps.find((step) => step.kind !== 'page' && !step.done)?.index ?? null,
    };
  }

  /**
   * A `ref` is resolved live, so a step carries the title the page or problem
   * actually has today. A ref resolving to nothing is a content bug the safety
   * net catches before it ships, so it is dropped rather than shown dead.
   */
  private resolve(content: PathContent, lookups: Lookups): PathStepDetail[] {
    const steps: PathStepDetail[] = [];
    for (const step of content.steps) {
      const resolved = resolveStep(step, lookups, steps.length);
      if (resolved) steps.push(resolved);
    }
    return steps;
  }

  private lookups(): Lookups {
    const pages = allPages();
    const sections = new Set(pages.map((page) => page.section));

    return {
      pages: new Map(pages.map((page) => [`${page.section}/${page.slug}`, page] as const)),
      sectionTitles: new Map([...sections].map((slug) => [slug, sectionTitle(slug)] as const)),
      problems: this.problemFacts(),
      workouts: this.workoutFacts(),
    };
  }

  private problemFacts(): Map<string, ProblemFacts> {
    const userId = this.currentUser.getUserId();
    const status = new Map(
      this.db
        .select({ problemId: problemProgress.problemId, status: problemProgress.status })
        .from(problemProgress)
        .where(eq(problemProgress.userId, userId))
        .all()
        .map((row) => [row.problemId, row.status] as const)
    );

    return new Map(
      this.db
        .select({
          id: problems.id,
          slug: problems.slug,
          title: problems.title,
          category: problems.category,
          difficulty: problems.difficulty,
          relevance: problems.relevance,
        })
        .from(problems)
        .all()
        .map((row) => [
          row.slug,
          {
            title: row.title,
            category: row.category,
            difficulty: row.difficulty,
            relevance: row.relevance,
            status: status.get(row.id) ?? 'unseen',
          },
        ])
    );
  }

  /** Best checkpoint count across every attempt, matching the workouts list. */
  private workoutFacts(): Map<string, { manifest: WorkoutManifest; bestPassed: number | null }> {
    const userId = this.currentUser.getUserId();
    const history = this.db
      .select({ slug: workoutAttempts.slug, bestPassed: workoutAttempts.bestPassed })
      .from(workoutAttempts)
      .where(eq(workoutAttempts.userId, userId))
      .all();

    return new Map(
      listManifests().map((manifest) => {
        const mine = history.filter((row) => row.slug === manifest.slug);
        const best = mine.reduce((max, row) => Math.max(max, row.bestPassed), 0);
        return [manifest.slug, { manifest, bestPassed: mine.length > 0 ? best : null }] as const;
      })
    );
  }
}

/** One resolver per kind, because a `module` step is coming and should be one more. */
function resolveStep(step: PathStep, lookups: Lookups, index: number): PathStepDetail | null {
  const note = step.note ?? null;

  switch (step.kind) {
    case 'page': {
      const page = lookups.pages.get(step.ref);
      if (!page) return null;
      return {
        kind: 'page',
        index,
        ref: step.ref,
        note,
        done: false,
        section: page.section,
        sectionTitle: lookups.sectionTitles.get(page.section) ?? page.section,
        slug: page.slug,
        title: page.title,
        question: page.question,
      };
    }

    case 'problem': {
      const problem = lookups.problems.get(step.ref);
      if (!problem) return null;
      return {
        kind: 'problem',
        index,
        ref: step.ref,
        note,
        done: problem.status === 'solved',
        slug: step.ref,
        title: problem.title,
        category: problem.category,
        difficulty: problem.difficulty,
        relevance: problem.relevance,
        status: problem.status,
      };
    }

    case 'workout': {
      const found = lookups.workouts.get(step.ref);
      if (!found) return null;
      const { manifest, bestPassed } = found;
      const total = manifest.checkpoints.length;
      return {
        kind: 'workout',
        index,
        ref: step.ref,
        note,
        done: bestPassed !== null && bestPassed >= total,
        slug: manifest.slug,
        title: manifest.title,
        workoutKind: manifest.kind,
        minutes: manifest.minutes,
        summary: manifest.summary,
        checkpointCount: total,
        bestCheckpointsPassed: bestPassed,
      };
    }

    // `module` is refused by the loader until modules exist, so a step can
    // never reach here as one. When they do, this is where it lands.
    default:
      return null;
  }
}

function sectionTitle(slug: string): string {
  try {
    return readSection(slug).title;
  } catch {
    return slug;
  }
}

function toSummary(content: PathContent, steps: PathStepDetail[]): PathSummary {
  const provable = steps.filter((step) => step.kind !== 'page');
  return {
    slug: content.slug,
    title: content.title,
    question: content.question,
    summary: content.summary,
    order: content.order,
    minutes: content.minutes,
    stepCount: steps.length,
    provable: provable.length,
    done: provable.filter((step) => step.done).length,
  };
}
