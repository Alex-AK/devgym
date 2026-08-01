/**
 * A deliberately small YAML subset, hand-parsed.
 *
 * Handbook pages carry frontmatter, and frontmatter is YAML, but the shape a
 * page uses is fixed and tiny: strings, lists of strings, and lists of flat
 * objects. Parsing that needs about eighty lines, and the alternative is a
 * dependency that can parse anchors and block scalars for content that will
 * never contain either.
 *
 * The parser is strict on purpose. Anything outside the subset is an error with
 * a file and a line number rather than a silently-wrong value, and the safety
 * net in `handbook.spec.ts` runs every page through it.
 *
 * Supported:
 *
 *     key: a plain scalar
 *     key: 'quoted, because it has a comma'
 *     list:
 *       - one
 *       - two
 *     objects:
 *       - author: MDN
 *         title: Using server-sent events
 *
 * Not supported, and rejected: nesting past that, `key: [inline, lists]`,
 * multi-line scalars, comments after a value (a `#` inside a URL is a fragment,
 * not a comment).
 */

export type FrontmatterValue = string | string[] | Record<string, string>[];
export type Frontmatter = Record<string, FrontmatterValue>;

export interface ParsedDocument {
  data: Frontmatter;
  /** The markdown below the closing `---`, with leading blank lines trimmed. */
  body: string;
}

const DELIMITER = '---';

/** `key: value`, where the space after the colon is what makes it a key. */
const FIELD = /^([A-Za-z][\w-]*):(?:[ \t]+(.*))?$/;

export class FrontmatterError extends Error {
  constructor(label: string, line: number, why: string) {
    super(`${label}:${line} ${why}`);
    this.name = 'FrontmatterError';
  }
}

export function parseDocument(source: string, label: string): ParsedDocument {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  if (lines[0]?.trim() !== DELIMITER) {
    throw new FrontmatterError(label, 1, 'does not start with a --- frontmatter block');
  }

  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === DELIMITER);
  if (closing === -1)
    throw new FrontmatterError(label, 1, 'has no closing --- for its frontmatter');

  return {
    data: parseBlock(lines.slice(1, closing), label),
    body: lines
      .slice(closing + 1)
      .join('\n')
      .replace(/^\n+/, ''),
  };
}

function parseBlock(lines: string[], label: string): Frontmatter {
  const data: Frontmatter = {};
  // Frontmatter starts at line 2 of the file, so index 0 here is line 2.
  const lineNumber = (index: number): number => index + 2;

  let index = 0;
  while (index < lines.length) {
    const raw = lines[index] ?? '';
    index += 1;
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;

    const at = lineNumber(index - 1);
    if (raw.startsWith(' ') || raw.startsWith('\t')) {
      throw new FrontmatterError(label, at, 'is indented but follows no key');
    }

    const split = raw.indexOf(':');
    if (split === -1) throw new FrontmatterError(label, at, `is not "key: value": ${raw.trim()}`);

    const key = raw.slice(0, split).trim();
    if (!key) throw new FrontmatterError(label, at, 'has an empty key');
    if (key in data) throw new FrontmatterError(label, at, `repeats the key "${key}"`);

    const inline = raw.slice(split + 1).trim();
    if (inline) {
      if (inline.startsWith('[') || inline.startsWith('{')) {
        throw new FrontmatterError(label, at, `uses inline JSON for "${key}"; write it as a list`);
      }
      data[key] = unquote(inline);
      continue;
    }

    // A bare `key:` opens a list. Everything indented below it belongs to it.
    const start = index;
    while (index < lines.length && (lines[index] ?? '').startsWith(' ')) index += 1;
    const nested = lines.slice(start, index);
    if (nested.length === 0) throw new FrontmatterError(label, at, `has nothing under "${key}"`);
    data[key] = parseList(nested, label, lineNumber(start));
  }

  return data;
}

function parseList(
  lines: string[],
  label: string,
  firstLine: number
): string[] | Record<string, string>[] {
  const scalars: string[] = [];
  const objects: Record<string, string>[] = [];

  lines.forEach((raw, offset) => {
    const at = firstLine + offset;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (trimmed.startsWith('- ')) {
      const item = trimmed.slice(2).trim();
      const field = FIELD.exec(item);
      // `- author: MDN` opens an object; `- some-slug` and `- https://x` are
      // scalars. The colon has to be followed by a space to count as a key,
      // which is what keeps a URL's scheme from reading as one.
      if (field && !isQuoted(item)) objects.push({ [field[1] as string]: unquote(field[2] ?? '') });
      else scalars.push(unquote(item));
      return;
    }

    // A continuation line: another field of the object the last `-` opened.
    const current = objects[objects.length - 1];
    if (!current) throw new FrontmatterError(label, at, `expected a "- " list item: ${trimmed}`);
    const field = FIELD.exec(trimmed);
    if (!field) throw new FrontmatterError(label, at, `is not "key: value": ${trimmed}`);
    current[field[1] as string] = unquote(field[2] ?? '');
  });

  if (scalars.length && objects.length) {
    throw new FrontmatterError(label, firstLine, 'mixes plain items and objects in one list');
  }
  return objects.length ? objects : scalars;
}

function isQuoted(value: string): boolean {
  return (
    (value.startsWith("'") && value.endsWith("'") && value.length > 1) ||
    (value.startsWith('"') && value.endsWith('"') && value.length > 1)
  );
}

function unquote(value: string): string {
  return isQuoted(value) ? value.slice(1, -1) : value;
}

/* ------------------------------------------------------------------ readers */

/** Read a required string. Throws with the file's name, not a type error. */
export function readString(data: Frontmatter, key: string, label: string): string {
  const value = data[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}: frontmatter needs a non-empty "${key}"`);
  }
  return value.trim();
}

export function readOptionalNumber(data: Frontmatter, key: string, label: string): number | null {
  const value = data[key];
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value.trim())) {
    throw new Error(`${label}: "${key}" must be a number`);
  }
  return Number(value);
}

export function readStringList(data: Frontmatter, key: string, label: string): string[] {
  const value = data[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label}: "${key}" must be a list of plain values`);
  }
  return value as string[];
}

export function readObjectList(
  data: Frontmatter,
  key: string,
  label: string
): Record<string, string>[] {
  const value = data[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item === 'string')) {
    throw new Error(`${label}: "${key}" must be a list of objects`);
  }
  return value as Record<string, string>[];
}
