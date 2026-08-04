import { mkdtempSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Check a grader without opening the app:
 *
 *   pnpm grade js-find "find"
 *   pnpm grade sql-select-genre "SELECT title FROM books WHERE genre = 'Fantasy'"
 *   pnpm grade js-find                 # show the problem and its model answer
 *   pnpm grade --list react            # slugs in a category
 *
 * Use it when a verdict feels wrong — the output shows exactly which accept
 * strings, patterns and keyword groups the answer was measured against.
 */
import { CATEGORY_LABELS } from '@hone/shared';

import { PRACTICE_DB_PATH } from '../common/paths';
import { gradeAnswer, parseGraderConfig } from '../grading';
import type {
  CodeGraderConfig,
  ExplainGraderConfig,
  ShortTextGraderConfig,
  SqlGraderConfig,
  TypeGraderConfig,
} from '../grading/types';
import { buildPracticeDatabase, openPracticeDatabase } from '../seed/practice-db';
import { problemSeeds } from '../seed/problems.seed';

const VERDICT_ICON = { correct: '✅', close: '🟡', incorrect: '❌' } as const;

function listProblems(filter?: string): void {
  const matches = problemSeeds.filter(
    (seed) =>
      !filter ||
      seed.category === filter ||
      seed.difficulty === filter ||
      seed.slug.includes(filter)
  );
  for (const seed of matches) {
    console.log(
      `  ${seed.slug.padEnd(30)} ${seed.difficulty.padEnd(7)} ${CATEGORY_LABELS[seed.category]}`
    );
  }
  console.log(`\n  ${matches.length} problem(s)`);
}

/** Keep a multi-line snippet under its label, aligned with the single-line fields. */
function indentBlock(source: string): string {
  return source.split('\n').join('\n                ');
}

function describeConfig(seed: (typeof problemSeeds)[number]): void {
  if (seed.type === 'sql') {
    const config = seed.graderConfig as SqlGraderConfig;
    console.log(`  solutionSql:  ${config.solutionSql}`);
    console.log(`  orderMatters: ${config.orderMatters}`);
    return;
  }
  if (seed.type === 'short-text') {
    const config = seed.graderConfig as ShortTextGraderConfig;
    if (config.accept.length) console.log(`  accept:         ${config.accept.join(' | ')}`);
    for (const pattern of config.acceptPatterns ?? []) console.log(`  acceptPattern:  ${pattern}`);
    for (const [key, value] of Object.entries(config.nearMisses ?? {})) {
      console.log(`  nearMiss:       "${key}" → ${value}`);
    }
    for (const key of Object.keys(config.closeSubstrings ?? {})) {
      console.log(`  closeSubstring: "${key}"`);
    }
    return;
  }
  if (seed.type === 'js-code') {
    const config = seed.graderConfig as CodeGraderConfig;
    if (config.setup) console.log(`  setup:        ${indentBlock(config.setup)}`);
    if (config.starter) console.log(`  starter:      ${indentBlock(config.starter)}`);
    for (const test of config.tests) {
      console.log(`  test:         ${test.name}`);
      console.log(`                ${test.expression}`);
    }
    return;
  }
  if (seed.type === 'ts-type') {
    const config = seed.graderConfig as TypeGraderConfig;
    if (config.setup) console.log(`  setup:        ${indentBlock(config.setup)}`);
    if (config.starter) console.log(`  starter:      ${indentBlock(config.starter)}`);
    for (const test of config.tests) {
      console.log(`  check:        ${test.name}`);
      if (test.equals !== undefined) {
        console.log(`                ${test.type}  ===  ${test.equals}`);
      } else if (test.compiles !== undefined) {
        console.log(`                compiles: ${indentBlock(test.compiles)}`);
      } else {
        const code = test.errorCode ? ` (TS${test.errorCode})` : '';
        console.log(`                rejects${code}: ${indentBlock(test.rejects ?? '')}`);
      }
    }
    return;
  }
  const config = seed.graderConfig as ExplainGraderConfig;
  config.groups.forEach((group, index) => {
    console.log(`  group ${index + 1}: ${group.synonyms.map((s) => `"${s}"`).join(' | ')}`);
  });
}

async function main(): Promise<void> {
  const [first, ...rest] = process.argv.slice(2);

  if (!first || first === '--help' || first === '-h') {
    console.log('Usage: pnpm grade <slug> "<answer>"   |   pnpm grade --list [category]');
    process.exitCode = first ? 0 : 1;
    return;
  }

  if (first === '--list') {
    listProblems(rest[0]);
    return;
  }

  const seed = problemSeeds.find((entry) => entry.slug === first);
  if (!seed) {
    console.error(`No problem with slug "${first}". Try: pnpm grade --list`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `\n${seed.title}  [${seed.difficulty} · ${CATEGORY_LABELS[seed.category]} · ${seed.type}]`
  );
  console.log('─'.repeat(72));
  console.log(seed.prompt.replace(/^/gm, '  '));
  console.log('─'.repeat(72));
  describeConfig(seed);

  const answer = rest.join(' ');
  if (!answer.trim()) {
    console.log(`\n  model answer: ${seed.canonicalAnswer}`);
    console.log('\n  Pass an answer to grade it: pnpm grade ' + seed.slug + ' "your answer"');
    return;
  }

  // Reuse the seeded practice DB when it exists so SQL grades against real data.
  let practicePath = PRACTICE_DB_PATH;
  if (!existsSync(practicePath)) {
    practicePath = join(mkdtempSync(join(tmpdir(), 'hone-grade-')), 'practice.db');
    buildPracticeDatabase(practicePath);
  }
  const db = openPracticeDatabase(practicePath);

  try {
    const config = parseGraderConfig(seed.type, JSON.stringify(seed.graderConfig), seed.slug);
    const result = await gradeAnswer(seed.type, config, answer, db);
    console.log(`\n  answer:   ${answer}`);
    console.log(`  verdict:  ${VERDICT_ICON[result.verdict]} ${result.verdict}`);
    console.log(`  feedback: ${result.feedback}`);
    for (const test of result.tests ?? []) {
      // `~` is a near miss: assignable both ways, and still not the answer.
      const mark = test.passed ? '✓' : test.near ? '~' : '✗';
      console.log(`    ${mark} ${test.name}${test.detail ? ` — ${test.detail}` : ''}`);
    }
    console.log('');
  } finally {
    db.close();
  }
}

void main();
