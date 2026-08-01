/**
 * Shared API types for devgym. Types + const tuples only — no runtime deps.
 */

export const CATEGORIES = [
  'sql',
  'query-params',
  'js-apis',
  'typescript',
  'react',
  'http',
  'dom',
  'css',
  'a11y',
  'forms',
  'dates',
  'testing',
  'security',
  'debugging',
  'coding',
  'systems',
  'html',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * How often the knowledge actually comes up, which is a separate axis from how
 * hard the problem is. A hard problem can be daily bread (`sql-window-rank`)
 * and an easy one can be pure under-the-hood trivia (`dom-queryselectorall-type`).
 */
export const RELEVANCES = ['daily', 'occasional', 'foundational'] as const;
export type Relevance = (typeof RELEVANCES)[number];

export const PROBLEM_TYPES = ['sql', 'short-text', 'explain', 'js-code'] as const;
export type ProblemType = (typeof PROBLEM_TYPES)[number];

export const VERDICTS = ['correct', 'close', 'incorrect'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const PROBLEM_STATUSES = ['unseen', 'in_progress', 'solved', 'skipped'] as const;
export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export const RELEVANCE_LABELS: Record<Relevance, string> = {
  daily: 'Daily',
  occasional: 'Occasional',
  foundational: 'Foundational',
};

/** Tooltip copy for the relevance badge. */
export const RELEVANCE_BLURBS: Record<Relevance, string> = {
  daily: 'You write this in ordinary feature work.',
  occasional: 'Comes up in specific situations: a bug, a perf pass, an edge case.',
  foundational: "Under the hood. You'll meet it through a framework more often than you write it.",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  sql: 'SQL',
  'query-params': 'Query Params',
  'js-apis': 'JS APIs',
  typescript: 'TypeScript',
  react: 'React',
  http: 'HTTP & Fetch',
  dom: 'DOM & Browser',
  css: 'CSS & Layout',
  a11y: 'Accessibility',
  forms: 'Forms & Validation',
  dates: 'Dates & Time',
  testing: 'Testing',
  security: 'Auth & Security',
  debugging: 'Debugging',
  coding: 'Coding',
  systems: 'Systems',
  html: 'HTML & Semantics',
};

/** Row in the problem list (`GET /api/problems`). */
export interface ProblemSummary {
  slug: string;
  /** When this solved problem next comes round for review. */
  dueAt?: string | null;
  title: string;
  category: Category;
  difficulty: Difficulty;
  relevance: Relevance;
  type: ProblemType;
  position: number;
  status: ProblemStatus;
  attemptsCount: number;
}

/** Full problem view (`GET /api/problems/:slug`). */
export interface ProblemDetail extends ProblemSummary {
  prompt: string;
  orderMatters: boolean | null;
  revealedHints: string[];
  hintsTotal: number;
  solutionViewed: boolean;
  canRevealSolution: boolean;
  /** Prefilled editor contents for `js-code` problems. */
  starter: string | null;
  /** Present only when solved or the solution has been revealed. */
  solution: string | null;
  explanation: string | null;
}

/** `POST /api/problems/:slug/attempts` request body. */
export interface AttemptRequest {
  answer: string;
}

/** One assertion from a `js-code` problem's test suite. */
export interface CodeTestResult {
  name: string;
  passed: boolean;
  /** Why it failed: expected vs actual, or the thrown error. */
  detail?: string;
}

/** `POST /api/problems/:slug/attempts` response. */
export interface AttemptResponse {
  verdict: Verdict;
  feedback: string;
  /** Per-test results for `js-code` problems. */
  tests: CodeTestResult[];
  /** The hint unlocked by this attempt, if any. */
  newHint: string | null;
  revealedHints: string[];
  hintsTotal: number;
  status: ProblemStatus;
  attemptsCount: number;
  canRevealSolution: boolean;
  /** Included when the verdict is `correct`. */
  solution: string | null;
  explanation: string | null;
}

/** `POST /api/problems/:slug/reveal-solution` response. */
export interface RevealSolutionResponse {
  solution: string;
  explanation: string;
  status: ProblemStatus;
}

/** `POST /api/problems/:slug/skip` and `/reset` responses. */
export interface QueueMoveResponse {
  status: ProblemStatus;
  next: NextProblem | null;
}

export interface NextProblem {
  slug: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  /** Number of problems still in the queue, including this one. */
  queueSize: number;
}

export const QUEUE_MODES = ['all', 'review', 'due'] as const;
/**
 * `review` = attempted or skipped, and still unsolved.
 * `due` = solved before, and scheduled to come round again.
 */
export type QueueMode = (typeof QUEUE_MODES)[number];

/** Narrows the practice queue to a focused session. */
export interface QueueScope {
  category?: Category;
  difficulty?: Difficulty;
  mode?: QueueMode;
}

/**
 * Spaced-repetition ladder, in days. Solving a problem schedules it one rung up;
 * getting it wrong on review drops it back to the first rung.
 */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 21, 60] as const;

export const DEFAULT_SESSION_SIZE = 10;
export const MAX_SESSION_SIZE = 50;

export const SESSION_ITEM_STATUSES = ['pending', 'solved', 'skipped'] as const;
export type SessionItemStatus = (typeof SESSION_ITEM_STATUSES)[number];

/** `POST /api/sessions` request body. */
export interface CreateSessionRequest extends QueueScope {
  /** How many problems to pull. Defaults to 10, capped at 50. */
  size?: number;
}

export interface SessionItem {
  slug: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  relevance: Relevance;
  position: number;
  status: SessionItemStatus;
}

/** A morning session: a fixed set of problems, pinned when you start. */
export interface SessionResponse {
  id: number;
  createdAt: string;
  finishedAt: string | null;
  scope: QueueScope;
  items: SessionItem[];
  /** Counts across `items`. */
  total: number;
  solved: number;
  skipped: number;
  remaining: number;
  /** Slug of the next unfinished item, or null when the session is done. */
  nextSlug: string | null;
  /** Wall-clock seconds from start to finish (or to now while active). */
  elapsedSeconds: number;
}

/** `POST /api/progress/reset` request body. */
export interface ResetAllRequest {
  /** Also delete every attempt row, returning the dashboard to its zero state. */
  clearHistory?: boolean;
}

export interface ResetAllResponse {
  problemsReset: number;
  attemptsDeleted: number;
}

export interface CategoryProgress {
  category: Category;
  solved: number;
  total: number;
}

export interface DifficultyProgress {
  difficulty: Difficulty;
  solved: number;
  total: number;
}

export interface RecentAttempt {
  id: number;
  slug: string;
  title: string;
  verdict: Verdict;
  createdAt: string;
}

/** `GET /api/progress` — the dashboard payload. */
export interface ProgressResponse {
  hasActivity: boolean;
  solved: number;
  total: number;
  totalAttempts: number;
  /** Percentage 0–100, rounded. */
  accuracy: number;
  /** Problems attempted or skipped and still unsolved: the review queue. */
  missed: number;
  /** Solved problems whose spaced-repetition review is due now. */
  due: number;
  byCategory: CategoryProgress[];
  byDifficulty: DifficultyProgress[];
  recentAttempts: RecentAttempt[];
}

export interface PracticeColumn {
  name: string;
  type: string;
}

export interface PracticeTable {
  name: string;
  columns: PracticeColumn[];
  rowCount: number;
}

/** `GET /api/practice-schema` — powers the SQL side panel. */
export interface PracticeSchemaResponse {
  tables: PracticeTable[];
}

/* ------------------------------------------------------------------ workouts */

/**
 * A workout is a 15-30 minute build against a real toolchain: edit files in the
 * IDE, run the checkpoints, see how far you got. Content lives in
 * `packages/workouts/content/<slug>/`, so adding one touches no code.
 */
export const WORKOUT_KINDS = ['feature', 'bug-hunt', 'refactor'] as const;
export type WorkoutKind = (typeof WORKOUT_KINDS)[number];

export const WORKOUT_KIND_LABELS: Record<WorkoutKind, string> = {
  feature: 'Build a feature',
  'bug-hunt': 'Find the bugs',
  refactor: 'Refactor',
};

/** Free-form on purpose: the point is to practise against stacks you do not know. */
export interface WorkoutStack {
  server?: string;
  orm?: string;
  database?: string;
  client?: string;
}

export interface WorkoutCheckpoint {
  id: string;
  title: string;
  /** Path within the workout directory. One suite per checkpoint. */
  testFile: string;
  hint?: string;
}

export interface WorkoutManifest {
  slug: string;
  title: string;
  kind: WorkoutKind;
  /** The timer the workout is designed around. */
  minutes: number;
  difficulty: Difficulty;
  relevance: Relevance;
  stack: WorkoutStack;
  summary: string;
  focus: string[];
  /** Files the editor opens. Everything else in the workspace is read-only. */
  editable: string[];
  checkpoints: WorkoutCheckpoint[];
}

/** Row in the workout list (`GET /api/workouts`). */
export interface WorkoutSummary {
  slug: string;
  title: string;
  kind: WorkoutKind;
  minutes: number;
  difficulty: Difficulty;
  relevance: Relevance;
  stack: WorkoutStack;
  summary: string;
  focus: string[];
  checkpointCount: number;
  /** Best result so far, or null if never attempted. */
  bestCheckpointsPassed: number | null;
  lastAttemptedAt: string | null;
}

export interface WorkoutFile {
  path: string;
  contents: string;
}

/** An in-progress attempt: a materialised workspace plus a clock. */
export interface WorkoutAttempt {
  id: number;
  slug: string;
  startedAt: string;
  finishedAt: string | null;
  files: WorkoutFile[];
  lastRun: WorkoutRun | null;
}

export interface WorkoutCheckpointResult {
  id: string;
  title: string;
  hint?: string;
  status: 'passed' | 'failed' | 'not-run';
  testsPassed: number;
  testsTotal: number;
  /** First failing assertion, trimmed for display. */
  failure: string | null;
}

export interface WorkoutRun {
  ranAt: string;
  durationMs: number;
  checkpoints: WorkoutCheckpointResult[];
  passedCount: number;
  /** Set when the suite could not run at all: a syntax error, a bad import. */
  crashed: string | null;
}

/* ------------------------------------------------------------------ handbook */

/**
 * The handbook is the study half of the gym: short pages you read beside a
 * workout, each wired to the problems and workouts that prove you absorbed it.
 * Content lives in `packages/handbook/content/<section>/<slug>.md`, so adding a
 * page touches no code.
 */
export interface HandbookSource {
  author: string;
  title: string;
  url: string;
}

/** A problem or workout that exercises a page's material. */
export interface HandbookPractiseLink {
  kind: 'problem' | 'workout';
  slug: string;
  title: string;
}

export interface HandbookPageSummary {
  section: string;
  slug: string;
  title: string;
  /** The question the page answers, phrased the way you'd ask it when stuck. */
  question: string;
  /** Problem and workout slugs, unresolved. Enough to link back from either. */
  practise: string[];
}

export interface HandbookSectionSummary {
  slug: string;
  title: string;
  summary: string;
  pages: HandbookPageSummary[];
}

/** A neighbouring page, for moving through a section in order. */
export interface HandbookPageRef {
  section: string;
  slug: string;
  title: string;
}

export interface HandbookPageDetail extends HandbookPageSummary {
  sectionTitle: string;
  /** Markdown, frontmatter stripped. */
  body: string;
  sources: HandbookSource[];
  /** ISO date the page's claims were last checked against its sources. */
  verified: string;
  practiseLinks: HandbookPractiseLink[];
  previous: HandbookPageRef | null;
  next: HandbookPageRef | null;
}

export interface WorkoutDetail extends WorkoutSummary {
  brief: string;
  editable: string[];
  checkpoints: WorkoutCheckpoint[];
  attempt: WorkoutAttempt | null;
  /** Revealed once every checkpoint passes, or on request. */
  solution: WorkoutFile[] | null;
}
