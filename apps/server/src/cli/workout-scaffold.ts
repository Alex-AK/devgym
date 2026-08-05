import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

import type {
  Difficulty,
  Relevance,
  WorkoutKind,
  WorkoutRequirementNeed,
  WorkoutStack,
} from '@hone/shared';

/**
 * What `pnpm workout` emits, and the four shapes it emits it in.
 *
 * Reading the library, almost none of a workout is the same twice: the fixtures,
 * the fakes, the database and every line of the brief are the workout. Four
 * things are the same every time, and they are what this file knows:
 *
 *   - the directory layout, and that `solution/` mirrors `editable` exactly;
 *   - checkpoint suites numbered `NN-` in manifest order, where the number, the
 *     id and the title all come off one name;
 *   - a brief with the four headings every brief has, and the line that says
 *     `npm` is not available;
 *   - the supertest wiring, which is the one piece of a checkpoint suite that is
 *     copied verbatim between workouts and the one that has already cost a day.
 *
 * Everything else is emitted as a TODO. A scaffold that guessed at a fixture
 * would be a worse starting point than an empty file, because a wrong guess
 * reads as a decision somebody made.
 */

export const SCAFFOLD_STACKS = ['node', 'express', 'nestjs', 'react'] as const;
export type ScaffoldStack = (typeof SCAFFOLD_STACKS)[number];

export const STACK_SUMMARIES: Record<ScaffoldStack, string> = {
  node: 'src/lib, no framework. Suites import the file and call it.',
  express: 'src/server, express. Suites drive HTTP through supertest.',
  nestjs: 'src/server, a Nest module. Suites drive HTTP through supertest.',
  react: 'src/client, a component. Suites render it in jsdom.',
};

/** Four is what 23 of the 26 workouts have. The three-checkpoint ones are the 12-minute ones. */
export const DEFAULT_CHECKPOINTS = [
  'checkpoint-one',
  'checkpoint-two',
  'checkpoint-three',
  'checkpoint-four',
];

export interface ScaffoldOptions {
  slug: string;
  stack: ScaffoldStack;
  /**
   * The editable file, without an extension. A bare name goes in the stack's
   * usual directory; `server/room` says where instead, which is what a workout
   * with a database wants so its file sits beside the wiring.
   */
  file: string;
  /** One name per checkpoint. It becomes the id, the suite's file name and the title. */
  checkpoints: string[];
  /**
   * The four the manifest cannot hold a comment about. They are required rather
   * than defaulted: a median that ships silently is a decision nobody made, and
   * `kind` in particular was wrong in a shipped workout because nothing asked.
   */
  kind: WorkoutKind;
  minutes: number;
  difficulty: Difficulty;
  relevance: Relevance;
  /**
   * What the workout needs that this repo does not ship, and empty for almost
   * every workout. This one is opted into rather than asked for, because unlike
   * the four above its usual answer is "nothing", and nothing is what an absent
   * field already says. The half a machine can check comes off the flag; the
   * install line and the reason are prose and come out as TODOs.
   */
  requires: WorkoutRequirementNeed[];
}

export interface ScaffoldFile {
  /** Relative to the workout directory. Always forward slashes. */
  path: string;
  contents: string;
}

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The slug and the checkpoint names both become path segments, so this is the
 * check that keeps the tool inside `content/<slug>/`. Nothing here can hold a
 * separator, a dot or a leading dash.
 */
export function assertKebabCase(value: string, what: string): void {
  if (!KEBAB_CASE.test(value)) {
    throw new Error(
      `${what} "${value}" is not kebab-case. Lower-case words and digits, joined by single hyphens.`
    );
  }
}

interface Names {
  kebab: string;
  camel: string;
  pascal: string;
}

function names(kebab: string): Names {
  const words = kebab.split('-');
  const pascal = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  return { kebab, camel: pascal.charAt(0).toLowerCase() + pascal.slice(1), pascal };
}

/** `the-304-costs-nothing` reads as a checkpoint title once the hyphens come out. */
function sentence(kebab: string): string {
  const words = kebab.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* ------------------------------------------------------------------- stacks */

interface StackShape {
  /** Path under `files/` and under `solution/`. `src/` is prepended for `editable`. */
  editable: string;
  starter: string;
  /** Read-only companions under `files/`, which is where the wiring lives. */
  extras: ScaffoldFile[];
  manifestStack: WorkoutStack;
  /** The extension is what puts a suite in the jsdom project rather than the node one. */
  suffix: '.test.ts' | '.test.tsx';
  suite: (title: string) => string;
}

/**
 * Every emitted checkpoint disagrees with the starter it ships with, so a fresh
 * workout is red from both sides. The name of the test is the message: it is
 * what `workouts.spec.ts` prints when it reports the solution failing.
 */
const PLACEHOLDER_TEST = 'TODO: one assertion per thing this checkpoint is about';

function nodeShape(name: Names, dir: string): StackShape {
  const editable = `${dir}/${name.kebab}.ts`;
  return {
    editable,
    starter: `/**
 * TODO: what this has to do, in one sentence. See brief.md.
 */
export function ${name.camel}(input: string): string {
  return input;
}
`,
    extras: [],
    manifestStack: { server: 'node, TODO: name the libraries this workout uses' },
    suffix: '.test.ts',
    suite: (title) => `import { describe, expect, it } from 'vitest';

import { ${name.camel} } from '../../src/${editable.replace(/\.ts$/, '')}';

describe('${title}', () => {
  // Fails against the starter and against the solution, because neither is
  // written yet. Replace it with what this checkpoint is actually about.
  it('${PLACEHOLDER_TEST}', () => {
    expect(${name.camel}('scaffold')).toBe('TODO');
  });
});
`,
  };
}

function expressShape(name: Names, dir: string): StackShape {
  const editable = `${dir}/${name.kebab}.ts`;
  return {
    editable,
    starter: `import type { Request, Response } from 'express';

/**
 * \`GET /${name.kebab}\`.
 *
 * TODO: what this has to answer, and what it answers now. See brief.md.
 */
export function create${name.pascal}Handler() {
  return function ${name.camel}(_req: Request, res: Response): void {
    res.status(501).json({ error: 'Not written yet' });
  };
}
`,
    extras: [
      {
        path: `files/${dir}/app.ts`,
        contents: `import express, { type Express } from 'express';

import { create${name.pascal}Handler } from './${name.kebab}';

/**
 * The service. One endpoint, and the wiring around it.
 *
 * TODO: check what express does for you here before you trust a checkpoint. Its
 * built-in ETag handling has handed a caching workout two checkpoints for free.
 */
export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/${name.kebab}', create${name.pascal}Handler());

  return app;
}
`,
      },
    ],
    manifestStack: { server: 'express, TODO: name the database or fake, if any' },
    suffix: '.test.ts',
    suite: (title) => `import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/${dir}/app';

let server: ReturnType<ReturnType<typeof createApp>['listen']>;

// One listener for the test rather than one per request. supertest binds a fresh
// ephemeral port every time it is handed an app, so a suite that loops requests
// leaves a socket per assertion in TIME_WAIT and fails as \`socket hang up\` under
// the parallel load of \`pnpm verify\`, on a different checkpoint each run.
beforeEach(() => {
  server = createApp().listen(0);
});

afterEach(() => {
  server.close();
});

describe('${title}', () => {
  // Fails against the starter and against the solution, because neither is
  // written yet. Replace it with what this checkpoint is actually about.
  it('${PLACEHOLDER_TEST}', async () => {
    const response = await request(server).get('/${name.kebab}');

    expect(response.status).toBe(200);
  });
});
`,
  };
}

function nestShape(name: Names, dir: string): StackShape {
  const editable = `${dir}/${name.kebab}.controller.ts`;
  return {
    editable,
    starter: `import { Controller, Get, HttpCode } from '@nestjs/common';

/**
 * \`GET /${name.kebab}\`.
 *
 * TODO: what this has to answer, and what it answers now. See brief.md.
 */
@Controller('${name.kebab}')
export class ${name.pascal}Controller {
  @Get()
  @HttpCode(501)
  find(): { error: string } {
    return { error: 'Not written yet' };
  }
}
`,
    extras: [
      {
        path: `files/${dir}/app.module.ts`,
        contents: `import { Module } from '@nestjs/common';

import { ${name.pascal}Controller } from './${name.kebab}.controller';

/** The application, assembled. TODO: the providers this workout needs. */
@Module({ controllers: [${name.pascal}Controller] })
export class AppModule {}
`,
      },
    ],
    manifestStack: { server: 'nestjs, TODO: name the database or fake, if any' },
    suffix: '.test.ts',
    suite: (title) => `import 'reflect-metadata';

import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/${dir}/app.module';

let app: INestApplication;
let server: Server;

// \`app.listen(0)\`, not \`app.init()\` and \`getHttpServer()\`: the second hands
// supertest a server that is not listening, and supertest then binds a fresh
// ephemeral port per request. A suite that loops requests fails as \`socket hang
// up\` under the parallel load of \`pnpm verify\`, on a different checkpoint each
// run. Keep the \`app\` binding too, because closing it is what frees the port.
beforeEach(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  server = (await app.listen(0)) as Server;
}, 60_000);

afterEach(async () => {
  await app?.close();
});

describe('${title}', () => {
  // Fails against the starter and against the solution, because neither is
  // written yet. Replace it with what this checkpoint is actually about.
  it('${PLACEHOLDER_TEST}', async () => {
    const response = await request(server).get('/${name.kebab}');

    expect(response.status).toBe(200);
  });
});
`,
  };
}

function reactShape(name: Names, dir: string): StackShape {
  const editable = `${dir}/${name.pascal}.tsx`;
  return {
    editable,
    starter: `/**
 * TODO: what this has to do, and what somebody has complained about. See brief.md.
 */
export function ${name.pascal}() {
  return (
    <section>
      <h2>${sentence(name.kebab)}</h2>
    </section>
  );
}
`,
    extras: [],
    manifestStack: { client: 'react, TODO: name anything else this renders against' },
    suffix: '.test.tsx',
    suite: (title) => `import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ${name.pascal} } from '../../src/${editable.replace(/\.tsx$/, '')}';

describe('${title}', () => {
  // Fails against the starter and against the solution, because neither is
  // written yet. Replace it with what this checkpoint is actually about.
  it('${PLACEHOLDER_TEST}', () => {
    render(<${name.pascal} />);

    expect(screen.queryByRole('status')).not.toBeNull();
  });
});
`,
  };
}

/** Where a stack puts its editable file when `--file` does not say. */
const DEFAULT_DIR: Record<ScaffoldStack, string> = {
  node: 'lib',
  express: 'server',
  nestjs: 'server',
  react: 'client',
};

function shapeFor(stack: ScaffoldStack, name: Names, dir: string): StackShape {
  if (stack === 'express') return expressShape(name, dir);
  if (stack === 'nestjs') return nestShape(name, dir);
  if (stack === 'react') return reactShape(name, dir);
  return nodeShape(name, dir);
}

/* ------------------------------------------------------------------ emitting */

/**
 * Hand-built rather than `JSON.stringify`, because prettier checks
 * `packages/workouts/content` and its shape is not the one `JSON.stringify`
 * produces: short arrays stay on one line, objects stay expanded.
 */
function manifestJson(options: ScaffoldOptions, shape: StackShape, title: string): string {
  const stackLines = Object.entries(shape.manifestStack)
    .map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
    .join(',\n');

  const checkpoints = options.checkpoints
    .map(
      (name, index) => `    {
      "id": ${JSON.stringify(name)},
      "title": ${JSON.stringify(sentence(name))},
      "testFile": ${JSON.stringify(suitePath(name, index, shape.suffix))},
      "hint": "TODO: the one thing that is wrong. Shown only after this checkpoint fails."
    }`
    )
    .join(',\n');

  // These four decide what the workout is, and JSON cannot hold a comment saying
  // so. They used to ship as the median, which is what four authors hit:
  // `grep -rn TODO` came back empty while all four were still defaults, and one
  // shipped a bug-hunt marked `feature` because nothing ever asked. They are
  // arguments now, so the answer is given rather than inherited.
  return `{
  "slug": ${JSON.stringify(options.slug)},
  "title": ${JSON.stringify(title)},
  "kind": ${JSON.stringify(options.kind)},
  "minutes": ${options.minutes},
  "difficulty": ${JSON.stringify(options.difficulty)},
  "relevance": ${JSON.stringify(options.relevance)},
  "stack": {
${stackLines}
  },
  "summary": "TODO: what somebody would report, in one or two sentences. The symptom, never the cause.",
  "focus": ["TODO: three or four tags, the concepts this practises"],
  "editable": [${JSON.stringify(`src/${shape.editable}`)}],
${requiresJson(options.requires)}  "checkpoints": [
${checkpoints}
  ]
}
`;
}

/**
 * Emitted only when `--requires` asked for it, and the silence is the point:
 * almost no workout needs a daemon, an absent field is what "needs nothing"
 * already says, and an emitted block nobody asked for would be a guess about
 * the one field that decides whether the workout runs at all. What a flag can
 * settle is settled here; the two prose lines stay TODOs, so they land in the
 * count and in `grep -rn TODO` with every other decision left to the author.
 */
function requiresJson(requires: WorkoutRequirementNeed[]): string {
  if (requires.length === 0) return '';

  const entries = requires
    .map((need) => {
      const lines = [
        ...(need.binary !== undefined ? [`      "binary": ${JSON.stringify(need.binary)}`] : []),
        ...(need.port !== undefined ? [`      "port": ${String(need.port)}`] : []),
        '      "install": "TODO: one line the reader can run: how to install it, and how to start it"',
        '      "reason": "TODO: what this workout does with it that a fake could not"',
      ];
      return `    {\n${lines.join(',\n')}\n    }`;
    })
    .join(',\n');

  return `  "requires": [\n${entries}\n  ],\n`;
}

function suitePath(name: string, index: number, suffix: string): string {
  return `tests/checkpoints/${String(index + 1).padStart(2, '0')}-${name}${suffix}`;
}

function briefMarkdown(title: string, shape: StackShape): string {
  return `# ${title}

TODO: what somebody reported, in the words they would use. The symptom, never the cause: working
out what is wrong is the exercise, and by the time you write this you know the answer. WRITING.md
has the worked before and after.

## The task

Fix it in \`src/${shape.editable}\`.

**TODO: one bold sentence per checkpoint, saying what has to be true when you are done.**

## Notes

TODO: anything unguessable about the environment, and anything that has to hold: unchanged output,
no new dependency, the same API. A fake's odd semantics and where the query log lives belong here.
Withholding local trivia is a scavenger hunt rather than difficulty.

\`npm\`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- TODO: something worth thinking about that is not more of the same work.
`;
}

/**
 * The reference implementation, and it is deliberately the starter.
 *
 * `workouts.spec.ts` asks every solution to pass every checkpoint, so a workout
 * scaffolded and left alone fails that, once, naming itself. That failure is the
 * to-do list: it clears when this file satisfies the checkpoints and `files/`
 * does not. Emitting a solution that passed would have bought a green suite by
 * making the safety net say something untrue about a workout with no content in
 * it, and a half-written workout would then ship without a word.
 */
function solutionFile(shape: StackShape): string {
  return `/**
 * The reference implementation of \`src/${shape.editable}\`.
 *
 * TODO: this is still the starter, so \`workouts.spec.ts\` reports this workout's
 * solution failing its own checkpoints. That is the to-do list, and it clears
 * when this passes them and \`files/\` does not.
 */

${shape.starter}`;
}

export function scaffoldWorkout(options: ScaffoldOptions): ScaffoldFile[] {
  assertKebabCase(options.slug, 'slug');

  // `--file server/room` rather than `--file room`. Every workout with a
  // database puts its editable file next to the wiring in `files/server/`, and
  // the directory used to be fixed per stack, so the first thing four authors
  // did was delete the emitted tree and write it again by hand.
  const slash = options.file.lastIndexOf('/');
  const dir = slash === -1 ? DEFAULT_DIR[options.stack] : options.file.slice(0, slash);
  const base = slash === -1 ? options.file : options.file.slice(slash + 1);
  assertKebabCase(base, 'file name');
  for (const segment of dir.split('/')) assertKebabCase(segment, 'directory name');
  if (options.checkpoints.length === 0) throw new Error('A workout needs at least one checkpoint.');
  for (const name of options.checkpoints) assertKebabCase(name, 'checkpoint name');

  const duplicate = options.checkpoints.find(
    (name, index) => options.checkpoints.indexOf(name) !== index
  );
  if (duplicate) throw new Error(`Checkpoint "${duplicate}" is named twice.`);

  const shape = shapeFor(options.stack, names(base), dir);
  const title = 'TODO: the title, phrased as the symptom, and the same in brief.md';

  return [
    { path: 'workout.json', contents: manifestJson(options, shape, title) },
    { path: 'brief.md', contents: briefMarkdown(title, shape) },
    { path: `files/${shape.editable}`, contents: shape.starter },
    ...shape.extras,
    { path: `solution/${shape.editable}`, contents: solutionFile(shape) },
    ...options.checkpoints.map((name, index) => ({
      path: suitePath(name, index, shape.suffix),
      contents: shape.suite(sentence(name).toLowerCase()),
    })),
  ];
}

/**
 * Write the scaffold, and refuse to touch anything that is already there.
 *
 * The directory not existing is the whole safety story: there is no merge, no
 * overwrite and no force. A write that fails part way takes the directory back
 * out, so a half-written workout never reaches `listManifests`.
 */
export function writeScaffold(dir: string, files: ScaffoldFile[]): void {
  if (existsSync(dir)) {
    throw new Error(`${dir} already exists. Pick another slug, or delete that one yourself.`);
  }

  const root = resolve(dir);
  for (const file of files) {
    const target = resolve(root, file.path);
    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error(`Refusing to write "${file.path}", which is outside ${root}.`);
    }
  }

  try {
    for (const file of files) {
      const target = join(root, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.contents);
    }
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
