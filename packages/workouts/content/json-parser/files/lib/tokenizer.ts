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

    // TODO: a string opens at a double quote and closes at the next one that is
    // not escaped. Push { type: 'string', value } with the escapes resolved.

    // TODO: a number opens at a digit or a minus. Push { type: 'number', value }
    // with the text already converted.

    // Both of those need to say where they stopped, so this loop knows where to
    // pick up again.

    throw new SyntaxError(`Unexpected character "${char}" at position ${at}`);
  }

  return tokens;
}
