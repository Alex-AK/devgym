import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  DIFFICULTIES,
  type Difficulty,
  type Relevance,
  RELEVANCES,
  WORKOUT_KINDS,
  type WorkoutKind,
  type WorkoutRequirementNeed,
} from '@hone/shared';

/**
 * Scaffold a workout directory without opening the app:
 *
 *   pnpm workout stale-cart-express --stack express --kind bug-hunt \
 *     --minutes 20 --difficulty medium --relevance daily
 *   pnpm workout json-diff --file lib/diff --kind feature --minutes 25 \
 *     --difficulty hard --relevance occasional the-shapes-match one-line-per-change
 *   pnpm workout --help
 *
 * It emits the layout, the manifest, the four brief headings and the checkpoint
 * suites, wired for the stack you name. Everything a workout is actually about
 * comes out as a TODO, because a guessed fixture reads as a decision somebody
 * made. See `docs/content.md` for the bar before you fill them in.
 */
import { CONTENT_DIR, workoutDir } from '../workouts/workout-content';
import type { ScaffoldFile, ScaffoldOptions, ScaffoldStack } from './workout-scaffold';
import {
  DEFAULT_CHECKPOINTS,
  SCAFFOLD_STACKS,
  scaffoldWorkout,
  STACK_SUMMARIES,
  writeScaffold,
} from './workout-scaffold';

const USAGE = `Usage: pnpm workout <slug> --kind <kind> --minutes <n> --difficulty <d> --relevance <r>
                     [--stack <stack>] [--file <path>] [--requires <need>] [checkpoint-name ...]

  --kind        ${WORKOUT_KINDS.join(' | ')}
  --minutes     how long it should take
  --difficulty  ${DIFFICULTIES.join(' | ')}
  --relevance   ${RELEVANCES.join(' | ')}
  --stack       ${SCAFFOLD_STACKS.join(' | ')}   (default: node)
  --file        the editable file, "room" or "server/room"  (default: the slug)
  --requires    something this repo does not ship: "postgres", "5432" or
                "postgres:5432". Repeatable.  (default: nothing, which is right
                for almost every workout)

The first four are required. They decide what the workout is, JSON cannot hold a
TODO for them, and a default would ship as an answer nobody gave.

\`--requires\` is the opposite case and is opted into. It decides whether the
workout runs at all, and its usual answer is "nothing", which is what leaving the
field out already says: a stub emitted unasked would be a decision nobody made.
Name a bare binary on PATH, a loopback port, or both; the install line and the
reason come out as TODOs, because they are prose. See docs/content.md.

What each stack emits:
${SCAFFOLD_STACKS.map((stack) => `  ${stack.padEnd(8)} ${STACK_SUMMARIES[stack]}`).join('\n')}
`;

interface Parsed {
  slug: string;
  options: Omit<ScaffoldOptions, 'slug'>;
}

/**
 * Paths are printed from the repo root, not from the cwd. The script runs in
 * `apps/server` and is read at the root, so a cwd-relative path comes out as
 * `../../packages/...` and nothing printed can be pasted back.
 */
const REPO_ROOT = join(CONTENT_DIR, '..', '..', '..');
const fromRoot = (path: string): string => relative(REPO_ROOT, path);

/**
 * Flags take a value and may appear anywhere; everything left over is the slug
 * and then the checkpoint names. A flag with nothing after it is an error rather
 * than a default, because silently scaffolding the wrong stack costs more than
 * being asked again.
 */
const VALUED = [
  '--stack',
  '--file',
  '--kind',
  '--minutes',
  '--difficulty',
  '--relevance',
  '--requires',
];

function oneOf<T extends string>(value: string, allowed: readonly T[], flag: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`Unknown ${flag} "${value}". One of: ${allowed.join(', ')}.`);
}

/**
 * `postgres`, `5432` or `postgres:5432`. All digits is a port, because that is
 * the half that matters for a daemon and having to write `:5432` to say so
 * would be ceremony over the commoner case.
 *
 * Only the machine-checkable half is parsed here. The loader is what refuses a
 * binary with a path in it, and it refuses this file's output the same way it
 * refuses a hand-written manifest.
 */
function requirement(value: string): WorkoutRequirementNeed {
  const parts = value.split(':');
  if (parts.length > 2) throw new Error(`--requires "${value}" is "binary", "port" or both.`);

  const [first = '', second] = parts;
  const portOnly = second === undefined && /^\d+$/.test(first);
  const binary = portOnly ? '' : first;
  const portText = portOnly ? first : second;

  if (portText !== undefined) {
    const port = Number(portText);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(
        `--requires "${value}" names port ${JSON.stringify(portText)}, which is not a port.`
      );
    }
    if (!binary) return { port };
    assertBareName(binary, value);
    return { binary, port };
  }

  if (!binary) throw new Error(`--requires "${value}" names neither a binary nor a port.`);
  assertBareName(binary, value);
  return { binary };
}

function assertBareName(binary: string, value: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(binary)) {
    throw new Error(`--requires "${value}" wants a bare name on PATH, and "${binary}" is not one.`);
  }
}

function parseArgs(argv: string[]): Parsed {
  let stack: ScaffoldStack = 'node';
  let file: string | null = null;
  let kind: WorkoutKind | null = null;
  let minutes: number | null = null;
  let difficulty: Difficulty | null = null;
  let relevance: Relevance | null = null;
  const requires: WorkoutRequirementNeed[] = [];
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    if (VALUED.includes(arg)) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} needs a value.`);
      if (arg === '--file') file = value;
      else if (arg === '--requires') requires.push(requirement(value));
      else if (arg === '--stack') stack = oneOf(value, SCAFFOLD_STACKS, 'stack');
      else if (arg === '--kind') kind = oneOf(value, WORKOUT_KINDS, 'kind');
      else if (arg === '--difficulty') difficulty = oneOf(value, DIFFICULTIES, 'difficulty');
      else if (arg === '--relevance') relevance = oneOf(value, RELEVANCES, 'relevance');
      else {
        minutes = Number(value);
        if (!Number.isInteger(minutes) || minutes <= 0) {
          throw new Error(`--minutes needs a whole number of minutes, not "${value}".`);
        }
      }
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) throw new Error(`Unknown flag "${arg}".`);
    positional.push(arg);
  }

  const [slug, ...checkpoints] = positional;
  if (!slug) throw new Error('Name the workout: pnpm workout <slug>');

  // Required, not defaulted. These four decide what the workout is and JSON
  // cannot hold a comment saying so, so a median would ship as an answer nobody
  // gave: `grep -rn TODO` came back clean on four workouts whose `kind`,
  // `minutes`, `difficulty` and `relevance` had never been considered, and one
  // of them was a bug-hunt marked `feature`.
  if (kind === null || minutes === null || difficulty === null || relevance === null) {
    const missing = [
      kind === null && `--kind <${WORKOUT_KINDS.join('|')}>`,
      minutes === null && '--minutes <n>',
      difficulty === null && `--difficulty <${DIFFICULTIES.join('|')}>`,
      relevance === null && `--relevance <${RELEVANCES.join('|')}>`,
    ].filter((entry): entry is string => typeof entry === 'string');
    throw new Error(
      `A workout has to say what it is. Missing:\n    ${missing.join('\n    ')}\n\n` +
        '  These four are what the manifest cannot carry a TODO for, so they are asked here.'
    );
  }

  return {
    slug,
    options: {
      stack,
      file: file ?? slug,
      checkpoints: checkpoints.length ? checkpoints : DEFAULT_CHECKPOINTS,
      kind,
      minutes,
      difficulty,
      relevance,
      requires,
    },
  };
}

function countTodos(files: ScaffoldFile[]): number {
  return files.reduce((total, file) => total + (file.contents.match(/TODO/g)?.length ?? 0), 0);
}

function describe(files: ScaffoldFile[]): void {
  const width = Math.max(...files.map((file) => file.path.length)) + 2;
  const note = (path: string): string => {
    if (path === 'workout.json') return 'manifest';
    if (path === 'brief.md') return 'the ticket';
    if (path.startsWith('solution/')) return 'the reference, mirroring editable';
    if (path.startsWith('tests/')) return 'one suite, one checkpoint';
    return 'starting files';
  };
  for (const file of files) console.log(`  ${file.path.padEnd(width)}${note(file.path)}`);
}

function main(): void {
  const argv = process.argv.slice(2);

  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') {
    console.log(USAGE);
    process.exitCode = argv.length ? 0 : 1;
    return;
  }

  const { slug, options } = parseArgs(argv);
  const dir = workoutDir(slug);
  const files = scaffoldWorkout({ slug, ...options });

  if (existsSync(dir)) {
    console.error(`There is already a workout at ${fromRoot(dir)}.`);
    process.exitCode = 1;
    return;
  }

  writeScaffold(dir, files);

  console.log(`\nCreated ${fromRoot(dir)}\n`);
  describe(files);
  console.log(
    `\n  ${files.length} files, ${countTodos(files)} TODO markers. Find them with:\n` +
      `    grep -rn TODO ${fromRoot(dir)}\n`
  );
  console.log(
    'This workout fails its own suite until you write it. `workouts.spec.ts` asks every solution\n' +
      'to pass every checkpoint, and the solution here is still the starter, so the failure names\n' +
      'this slug. It clears when the solution passes the checkpoints and `files/` does not.\n'
  );

  // Worth saying out loud, because it is the one way that failure goes quiet: a
  // requirement this machine does not meet skips the workout everywhere,
  // including here, so the red that is meant to be the to-do list never appears.
  if (options.requires.length) {
    console.log(
      'It declares a `requires`, so it is skipped rather than run wherever that is not met,\n' +
        'including on your machine. Fill in the install line and the reason, and check the thing\n' +
        'is actually running before you read a green suite as agreement.\n'
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
