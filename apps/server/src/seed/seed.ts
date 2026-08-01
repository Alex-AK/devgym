import { sql } from 'drizzle-orm';

import { PRACTICE_DB_PATH } from '../common/paths';
import type { AppDb } from '../db/client';
import { problems, users } from '../db/schema';
import { buildPracticeDatabase } from './practice-db';
import { problemSeeds } from './problems.seed';

export const LOCAL_USER_ID = 1;

/** The single v1 user. Auth-ready schema, hardcoded resolution. */
export function ensureLocalUser(db: AppDb): void {
  db.insert(users)
    .values({ id: LOCAL_USER_ID, name: 'Local' })
    .onConflictDoNothing({ target: users.id })
    .run();
}

/**
 * Upsert problems by slug so re-seeding refreshes prompts, hints and grader
 * configs without touching attempt history or progress.
 */
export function seedProblems(db: AppDb): number {
  for (const seed of problemSeeds) {
    db.insert(problems)
      .values({
        slug: seed.slug,
        title: seed.title,
        category: seed.category,
        difficulty: seed.difficulty,
        relevance: seed.relevance,
        type: seed.type,
        position: seed.position,
        prompt: seed.prompt,
        graderConfig: JSON.stringify(seed.graderConfig),
        solution: seed.solution,
        explanation: seed.explanation,
      })
      .onConflictDoUpdate({
        target: problems.slug,
        set: {
          title: sql`excluded.title`,
          category: sql`excluded.category`,
          difficulty: sql`excluded.difficulty`,
          relevance: sql`excluded.relevance`,
          type: sql`excluded.type`,
          position: sql`excluded.position`,
          prompt: sql`excluded.prompt`,
          graderConfig: sql`excluded.grader_config`,
          solution: sql`excluded.solution`,
          explanation: sql`excluded.explanation`,
        },
      })
      .run();
  }
  return problemSeeds.length;
}

export interface SeedResult {
  problems: number;
  practiceDbPath: string;
}

/** Rebuild practice.db and upsert the app.db seed rows. */
export function seedAll(db: AppDb, practiceDbPath: string = PRACTICE_DB_PATH): SeedResult {
  buildPracticeDatabase(practiceDbPath);
  ensureLocalUser(db);
  const count = seedProblems(db);
  return { problems: count, practiceDbPath };
}
