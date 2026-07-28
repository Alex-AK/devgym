import { createContext, runInContext } from 'node:vm';

/**
 * Runs the user's JavaScript against a problem's test cases.
 *
 * SECURITY NOTE: `node:vm` is an isolation convenience, not a security
 * boundary — determined code can reach the host realm through constructor
 * chains. That is acceptable here because devgym runs locally and executes
 * only code the user typed themselves, which is the same trust level as
 * running `pnpm dev`. Do not reuse this to run code from anyone else.
 */

/** Milliseconds any single script or test may run for. */
export const CODE_TIMEOUT_MS = 1_000;
const MAX_LOG_LINES = 20;

export interface CodeTestSpec {
  /** Shown to the user, so phrase it as the behaviour being checked. */
  name: string;
  /** Expression evaluated after the user's code. May use `await`. */
  expression: string;
  /** Expected value, deep-compared. JSON-serialisable. */
  expected?: unknown;
  /** For values JSON cannot hold (undefined, NaN, Map): an expression to evaluate. */
  expectedCode?: string;
  /** Expect a throw whose message contains this string. */
  throws?: string;
}

export interface CodeTestOutcome {
  name: string;
  passed: boolean;
  /** Populated when the test failed. */
  detail?: string;
}

export interface CodeRunResult {
  /** Set when the submission could not even be evaluated. */
  error?: string;
  outcomes: CodeTestOutcome[];
  logs: string[];
}

/** Format a value the way a developer would want to read it in a diff. */
export function display(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (value instanceof Map) return `Map(${value.size}) ${display([...value.entries()])}`;
  if (value instanceof Set) return `Set(${value.size}) ${display([...value.values()])}`;
  try {
    const json = JSON.stringify(value, (_key, entry: unknown) =>
      entry === undefined ? '__undefined__' : entry
    );
    // String() on a plain object gives '[object Object]', but by this point JSON
    // has already refused the value (a circular ref, a BigInt); a lossy label
    // beats throwing while formatting a diff.
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return json === undefined ? String(value) : json.replace(/"__undefined__"/g, 'undefined');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(value);
  }
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((entry, index) => deepEqual(entry, b[index]));
  }
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !deepEqual(value, b.get(key))) return false;
    }
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size) return false;
    return [...a].every((entry) => b.has(entry));
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

/**
 * Errors thrown inside the vm belong to a different realm, so `instanceof Error`
 * is false for them. Duck-type on shape instead.
 */
function message(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { name, message: text } = error as { name?: unknown; message?: unknown };
    const label = typeof name === 'string' && name ? name : 'Error';
    return `${label}: ${String(text)}`;
  }
  return String(error);
}

/** Reject if a promise has not settled in time, so an await cannot hang the server. */
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        // Pass the original through: re-wrapping would nest the message. The
        // reason is deliberately not an Error — anything thrown inside the vm
        // comes from another realm and fails `instanceof Error` anyway.
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(error);
      }
    );
  });
}

export async function runCode(
  userCode: string,
  tests: CodeTestSpec[],
  setup = ''
): Promise<CodeRunResult> {
  const logs: string[] = [];
  const timers = new Set<NodeJS.Timeout>();

  const record = (...args: unknown[]): void => {
    if (logs.length >= MAX_LOG_LINES) return;
    // Strings print bare, like a real console; everything else gets inspected.
    logs.push(args.map((arg) => (typeof arg === 'string' ? arg : display(arg))).join(' '));
  };

  const sandbox: Record<string, unknown> = {
    console: { log: record, info: record, warn: record, error: record, debug: record },
    setTimeout: (fn: () => void, ms?: number) => {
      const timer = setTimeout(fn, Math.min(ms ?? 0, CODE_TIMEOUT_MS));
      timers.add(timer);
      return timer;
    },
    clearTimeout: (timer: NodeJS.Timeout) => {
      timers.delete(timer);
      clearTimeout(timer);
    },
    queueMicrotask,
    structuredClone,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    AbortController,
    AbortSignal,
  };
  const context = createContext(sandbox);

  try {
    const preamble = setup.trim() ? `${setup}\n` : '';
    runInContext(`${preamble}${userCode}`, context, { timeout: CODE_TIMEOUT_MS });
  } catch (error) {
    clearAll(timers);
    return { error: message(error), outcomes: [], logs };
  }

  const outcomes: CodeTestOutcome[] = [];
  for (const test of tests) {
    outcomes.push(await runOne(test, context, logs));
  }
  clearAll(timers);
  return { outcomes, logs };
}

function clearAll(timers: Set<NodeJS.Timeout>): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
}

async function runOne(
  test: CodeTestSpec,
  context: object,
  logs: string[]
): Promise<CodeTestOutcome> {
  const before = logs.length;
  let actual: unknown;

  try {
    // Wrapped in an async IIFE so a test expression may use `await`.
    const result: unknown = runInContext(`(async () => (${test.expression}))()`, context, {
      timeout: CODE_TIMEOUT_MS,
    });
    actual = await withDeadline(Promise.resolve(result), CODE_TIMEOUT_MS);
  } catch (error) {
    if (test.throws) {
      const text = message(error);
      return text.includes(test.throws)
        ? { name: test.name, passed: true }
        : {
            name: test.name,
            passed: false,
            detail: `expected a throw containing "${test.throws}", got ${text}`,
          };
    }
    return { name: test.name, passed: false, detail: `threw ${message(error)}` };
  }

  if (test.throws) {
    return {
      name: test.name,
      passed: false,
      detail: `expected a throw containing "${test.throws}", but it returned ${display(actual)}`,
    };
  }

  let expected: unknown = test.expected;
  if (test.expectedCode !== undefined) {
    try {
      expected = runInContext(`(${test.expectedCode})`, context, { timeout: CODE_TIMEOUT_MS });
    } catch (error) {
      return { name: test.name, passed: false, detail: `bad expectedCode: ${message(error)}` };
    }
  }

  if (deepEqual(actual, expected)) return { name: test.name, passed: true };

  const printed = logs.slice(before);
  const logNote = printed.length > 0 ? ` (logged: ${printed.join(' | ')})` : '';
  return {
    name: test.name,
    passed: false,
    detail: `expected ${display(expected)}, got ${display(actual)}${logNote}`,
  };
}
