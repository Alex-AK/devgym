import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import ts from 'typescript';

/**
 * Type-checks a submission and answers questions about the types it produced.
 *
 * SAFETY NOTE: this never executes the submission, which makes it a stronger
 * boundary than `code-runner.ts` rather than the same one restated. What it
 * has to stop instead is the compiler reading the disk. A `CompilerHost` is
 * the only door the compiler has to a filesystem, and this one is wired shut:
 * `getSourceFile`, `fileExists` and `readFile` answer from an in-memory map
 * holding two synthetic files and the lib closure loaded at startup, and
 * anything else does not exist. So an `import`, an `/// <reference path>` and
 * a `@types` lookup all resolve to nothing, and the submission cannot name a
 * file on the machine running it.
 */

/**
 * The lib the answer is checked against. ES only: no DOM, no Node types. A rep
 * needing either is a rep that wants a workout, the same call `code-runner.ts`
 * already makes about the Node globals.
 */
const ROOT_LIB = 'lib.es2022.d.ts';

/** Ambient helpers, in their own file so the submission still starts at line 1. */
export const PRELUDE_FILE = '__hone_prelude.d.ts';
export const ANSWER_FILE = 'answer.ts';

/**
 * Type identity, not assignability. `A extends B` and `B extends A` both
 * holding is a weaker claim than sameness, and the gap between them is where
 * the interesting wrong answers live: `any` passes assignability in both
 * directions against everything, and dropping a `readonly` modifier passes it
 * too. This is the deferred-conditional trick from the TypeScript issue
 * tracker (microsoft/TypeScript#27024), which compares two generic signatures
 * and so falls through to the checker's internal identity relation.
 */
const PRELUDE_HELPERS = [
  'type __HoneIdentical<X, Y> =',
  '  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;',
].join('\n');

/**
 * Mirrors the strictness in `tsconfig.base.json`, because a grader running
 * looser than the repo would teach a different language. `type-checker.spec.ts`
 * asserts the two stay in step.
 *
 * Two flags are deliberately absent. `noUnusedLocals` and `noUnusedParameters`
 * would fail a probe for declaring a value it only needed the type of, and a
 * submission for a type parameter it does not read, neither of which is ever
 * the lesson.
 */
const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  lib: [ROOT_LIB],
  strict: true,
  noUncheckedIndexedAccess: true,
  noImplicitOverride: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  forceConsistentCasingInFileNames: true,
  skipLibCheck: true,
  noEmit: true,
  // Nothing to find, and saying so keeps the compiler from asking.
  types: [],
  typeRoots: [],
};

/**
 * Parsed once and shared by every compilation. Re-parsing 57 lib files per
 * submission costs about 250ms; reusing the `SourceFile` objects takes a grade
 * to single-digit milliseconds. Sharing them is safe because a compilation is
 * synchronous from `createProgram` to the last `getTypeAtLocation`, so two
 * programs never hold the same file at once on Node's single thread.
 */
let libFiles: Map<string, ts.SourceFile> | null = null;

function loadLibClosure(): Map<string, ts.SourceFile> {
  if (libFiles) return libFiles;
  const files = new Map<string, ts.SourceFile>();
  // The compiler's own lib directory, which the compiler itself points at.
  // Not the user's project, and the only filesystem read anywhere in this file.
  const libDir = dirname(ts.getDefaultLibFilePath(COMPILER_OPTIONS));

  const load = (name: string): void => {
    if (files.has(name)) return;
    const source = ts.createSourceFile(
      name,
      readFileSync(join(libDir, name), 'utf8'),
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );
    files.set(name, source);
    // `/// <reference lib="es2015.core" />` names the file without its wrapper.
    for (const ref of source.libReferenceDirectives) {
      load(`lib.${ref.fileName.toLowerCase()}.d.ts`);
    }
  };

  load(ROOT_LIB);
  libFiles = files;
  return files;
}

export interface TypeDiagnostic {
  code: number;
  message: string;
  /** 1-based, within whichever synthetic file the diagnostic landed in. */
  line: number;
}

/** What one probe asked, and what the checker said. */
export interface ProbeReading {
  identical: boolean;
  /** Both directions of assignability. Together with `identical`: a near miss. */
  assignableTo: boolean;
  assignableFrom: boolean;
  /** `typeToString` of each side, for an expected-versus-got line. */
  actual: string;
  expected: string;
}

export interface CheckedProbe {
  /** Diagnostics inside this probe's lines. Empty means it type-checked. */
  diagnostics: TypeDiagnostic[];
  /** Only for an identity probe. */
  reading?: ProbeReading;
}

export interface TypeCheckResult {
  /** Set when the submission itself does not compile. Probes mean nothing then. */
  error?: TypeDiagnostic;
  probes: CheckedProbe[];
}

/** One question to put to the checker, in the order the config declares them. */
export type Probe =
  { kind: 'identity'; type: string; equals: string } | { kind: 'statements'; code: string };

interface Placed {
  probe: Probe;
  firstLine: number;
  lastLine: number;
  index: number;
}

/**
 * Type-check `submission` with `setup` in scope and answer every probe.
 *
 * `setup` joins the prelude rather than the answer file so the line numbers in
 * a diagnostic are the ones the user is looking at.
 */
export function checkTypes(submission: string, setup: string, probes: Probe[]): TypeCheckResult {
  const libs = loadLibClosure();

  const prelude = setup.trim() ? `${PRELUDE_HELPERS}\n${setup}\n` : `${PRELUDE_HELPERS}\n`;
  const { text, placed } = buildAnswerFile(submission, probes);
  const submissionLines = countLines(submission);

  const sources = new Map<string, ts.SourceFile>([
    [PRELUDE_FILE, source(PRELUDE_FILE, prelude)],
    [ANSWER_FILE, source(ANSWER_FILE, text)],
  ]);
  const lookup = (name: string): ts.SourceFile | undefined => sources.get(name) ?? libs.get(name);

  const host: ts.CompilerHost = {
    getSourceFile: lookup,
    getDefaultLibFileName: () => ROOT_LIB,
    writeFile: () => undefined,
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => lookup(name) !== undefined,
    readFile: (name) => lookup(name)?.text,
    directoryExists: () => false,
    getDirectories: () => [],
    readDirectory: () => [],
    // Every import resolves to nothing, so the answer cannot pull in a module.
    resolveModuleNameLiterals: (literals) => literals.map(() => ({ resolvedModule: undefined })),
  };

  const program = ts.createProgram({
    rootNames: [PRELUDE_FILE, ANSWER_FILE],
    options: COMPILER_OPTIONS,
    host,
  });
  const answer = program.getSourceFile(ANSWER_FILE);
  if (!answer) throw new Error('checkTypes: the answer file went missing from its own program');

  // A syntax error anywhere is the submission's, whatever line it surfaced on:
  // an unclosed brace swallows the probes appended after it, and the recovered
  // position lands inside one of them. Blame the last line the user wrote.
  const [syntaxError] = program.getSyntacticDiagnostics(answer);
  if (syntaxError) {
    const reported = toDiagnostic(syntaxError, answer);
    return { error: { ...reported, line: Math.min(reported.line, submissionLines) }, probes: [] };
  }

  const diagnostics = program
    .getSemanticDiagnostics(answer)
    .map((diagnostic) => toDiagnostic(diagnostic, answer));

  const inSubmission = diagnostics.find((diagnostic) => diagnostic.line <= submissionLines);
  if (inSubmission) return { error: inSubmission, probes: [] };

  const checker = program.getTypeChecker();
  const declarations = topLevelDeclarations(answer);

  return {
    probes: placed.map((entry) => ({
      diagnostics: diagnostics.filter(
        (diagnostic) => diagnostic.line >= entry.firstLine && diagnostic.line <= entry.lastLine
      ),
      ...(entry.probe.kind === 'identity'
        ? { reading: read(checker, declarations, entry.index) }
        : {}),
    })),
  };
}

function source(name: string, text: string): ts.SourceFile {
  return ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

function countLines(text: string): number {
  return text.split('\n').length;
}

function toDiagnostic(diagnostic: ts.Diagnostic, file: ts.SourceFile): TypeDiagnostic {
  const position = diagnostic.start ?? 0;
  return {
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
    line: file.getLineAndCharacterOfPosition(position).line + 1,
  };
}

/**
 * The submission, then one block per probe. Identity probes become ambient
 * declarations whose types the checker resolves for us; statement probes go
 * inside a function body, which is what gives narrowing somewhere to happen
 * and keeps one probe's names out of the next one's scope.
 */
function buildAnswerFile(submission: string, probes: Probe[]): { text: string; placed: Placed[] } {
  const lines = submission.split('\n');
  const placed: Placed[] = [];

  probes.forEach((probe, index) => {
    const firstLine = lines.length + 1;
    lines.push(...probeLines(probe, index));
    placed.push({ probe, index, firstLine, lastLine: lines.length });
  });

  return { text: lines.join('\n'), placed };
}

function probeLines(probe: Probe, index: number): string[] {
  if (probe.kind === 'identity') {
    // Parenthesised so a union or a function type cannot bind loosely inside
    // the `extends` clauses below.
    const actual = `(${probe.type})`;
    const expected = `(${probe.equals})`;
    return [
      `declare const ${name('actual', index)}: ${actual};`,
      `declare const ${name('expected', index)}: ${expected};`,
      `declare const ${name('identical', index)}: __HoneIdentical<${actual}, ${expected}>;`,
      `declare const ${name('to', index)}: [${actual}] extends [${expected}] ? true : false;`,
      `declare const ${name('from', index)}: [${expected}] extends [${actual}] ? true : false;`,
    ];
  }
  return [`function __hone_probe_${index}(): void {`, ...probe.code.split('\n'), '}'];
}

function name(role: string, index: number): string {
  return `__hone_${role}_${index}`;
}

/** Top-level `declare const` names, so a probe reading is one map lookup. */
function topLevelDeclarations(file: ts.SourceFile): Map<string, ts.Identifier> {
  const found = new Map<string, ts.Identifier>();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) found.set(declaration.name.text, declaration.name);
    }
  }
  return found;
}

const TYPE_FORMAT = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias;

function read(
  checker: ts.TypeChecker,
  declarations: Map<string, ts.Identifier>,
  index: number
): ProbeReading {
  const literal = (role: string): boolean => {
    const node = declarations.get(name(role, index));
    return node !== undefined && checker.typeToString(checker.getTypeAtLocation(node)) === 'true';
  };
  const printed = (role: string): string => {
    const node = declarations.get(name(role, index));
    if (!node) return 'unknown';
    return checker.typeToString(checker.getTypeAtLocation(node), undefined, TYPE_FORMAT);
  };

  return {
    identical: literal('identical'),
    assignableTo: literal('to'),
    assignableFrom: literal('from'),
    actual: printed('actual'),
    expected: printed('expected'),
  };
}
