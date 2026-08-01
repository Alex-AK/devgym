/**
 * Stage one: text in, tokens out.
 *
 * A tokeniser keeps the parser small. Instead of asking "is this character part
 * of a number", the parser asks "is the next token a number", and every rule
 * about what a number looks like lives in one place.
 */

/** The six characters that hold a JSON document together. */
export type Punctuation = '{' | '}' | '[' | ']' | ':' | ',';

/**
 * A token carries the JavaScript value it stands for, already converted, so
 * nothing downstream has to look at the original text again.
 */
export type Token =
  | { type: 'punctuation'; value: Punctuation }
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'null'; value: null };

const PUNCTUATION = new Set<string>(['{', '}', '[', ']', ':', ',']);

/** The only four characters JSON counts as whitespace. */
const WHITESPACE = new Set<string>([' ', '\t', '\n', '\r']);

/** The eight one-letter escapes, and what each one stands for. */
const ESCAPES: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

/**
 * The whole number grammar in one sticky pattern: optional minus, an integer
 * part that is either 0 alone or a non-zero digit and friends, an optional
 * fraction, an optional exponent. Sticky means it only matches at `lastIndex`,
 * so it reads a number where the scanner is standing rather than hunting for
 * one. `01` matches its leading `0` and stops, which leaves the stray `1` for
 * the parser to reject.
 */
const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let at = 0;

  while (at < input.length) {
    const char = input.charAt(at);

    if (WHITESPACE.has(char)) {
      at += 1;
      continue;
    }

    if (PUNCTUATION.has(char)) {
      tokens.push({ type: 'punctuation', value: char as Punctuation });
      at += 1;
      continue;
    }

    if (char === '"') {
      const read = readString(input, at);
      tokens.push({ type: 'string', value: read.value });
      at = read.next;
      continue;
    }

    if (char === '-' || (char >= '0' && char <= '9')) {
      const read = readNumber(input, at);
      tokens.push({ type: 'number', value: read.value });
      at = read.next;
      continue;
    }

    if (input.startsWith('true', at)) {
      tokens.push({ type: 'boolean', value: true });
      at += 4;
      continue;
    }

    if (input.startsWith('false', at)) {
      tokens.push({ type: 'boolean', value: false });
      at += 5;
      continue;
    }

    if (input.startsWith('null', at)) {
      tokens.push({ type: 'null', value: null });
      at += 4;
      continue;
    }

    throw new SyntaxError(`Unexpected character "${char}" at position ${at}`);
  }

  return tokens;
}

/** Read from the opening quote to the closing one, resolving escapes as it goes. */
function readString(input: string, start: number): { value: string; next: number } {
  let at = start + 1;
  let value = '';

  while (at < input.length) {
    const char = input.charAt(at);

    if (char === '"') return { value, next: at + 1 };

    if (char === '\\') {
      const escape = input.charAt(at + 1);

      if (escape === 'u') {
        const hex = input.slice(at + 2, at + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          throw new SyntaxError(`\\u needs four hex digits at position ${at}`);
        }
        // One code unit, not one code point: a pair of \u escapes for an emoji
        // concatenates into the surrogate pair the string wants.
        value += String.fromCharCode(parseInt(hex, 16));
        at += 6;
        continue;
      }

      const replacement = ESCAPES[escape];
      if (replacement === undefined) {
        throw new SyntaxError(`Unknown escape \\${escape} at position ${at}`);
      }
      value += replacement;
      at += 2;
      continue;
    }

    // A raw newline or tab inside a string is not JSON, however readable it looks.
    if (char < ' ') {
      throw new SyntaxError(`Unescaped control character at position ${at}`);
    }

    value += char;
    at += 1;
  }

  throw new SyntaxError('The document ended inside a string');
}

/** Read as much of a number as the grammar allows, and convert it. */
function readNumber(input: string, start: number): { value: number; next: number } {
  NUMBER.lastIndex = start;
  const match = NUMBER.exec(input);

  if (!match) throw new SyntaxError(`Not a number at position ${start}`);

  return { value: Number(match[0]), next: start + match[0].length };
}
