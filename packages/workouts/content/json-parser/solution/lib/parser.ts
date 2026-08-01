import { type Punctuation, type Token, tokenize } from './tokenizer';

/** Everything a JSON document can hold. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Stage two: tokens in, a value out.
 *
 * Recursive descent means one function per shape in the grammar, each calling
 * the others as the shapes nest. Depth costs nothing to support: an array's
 * element and an object's value are both a value, and a value can be another
 * array or object.
 */
class Cursor {
  private at = 0;

  constructor(private readonly tokens: Token[]) {}

  /** Is there anything left? */
  get done(): boolean {
    return this.at >= this.tokens.length;
  }

  /** The next token, left where it is. */
  peek(): Token | undefined {
    return this.tokens[this.at];
  }

  /** The next token, consumed. Running off the end means the document stopped early. */
  next(): Token {
    const token = this.tokens[this.at];
    if (!token) throw new SyntaxError('The document ended early');
    this.at += 1;
    return token;
  }

  /** Consume `value` if that is what comes next, and say whether it did. */
  eat(value: Punctuation): boolean {
    const token = this.peek();
    if (token?.type === 'punctuation' && token.value === value) {
      this.at += 1;
      return true;
    }
    return false;
  }

  /** Consume `value`, or throw saying what was there instead. */
  expect(value: Punctuation): void {
    if (!this.eat(value)) {
      throw new SyntaxError(`Expected ${value} but found ${describe(this.peek())}`);
    }
  }
}

function describe(token: Token | undefined): string {
  if (!token) return 'the end of the document';
  return token.type === 'punctuation' ? token.value : `a ${token.type}`;
}

export function parse(input: string): JsonValue {
  const cursor = new Cursor(tokenize(input));
  const value = parseValue(cursor);

  // A document is one value and nothing else. Without this, `01` parses as 0
  // and `{} junk` parses as an object, both of which are wrong answers rather
  // than errors.
  if (!cursor.done) {
    throw new SyntaxError(`Unexpected ${describe(cursor.peek())} after the end of the document`);
  }

  return value;
}

function parseValue(cursor: Cursor): JsonValue {
  const token = cursor.next();

  if (token.type === 'punctuation') {
    if (token.value === '{') return parseObject(cursor);
    if (token.value === '[') return parseArray(cursor);
    throw new SyntaxError(`A value cannot start with ${token.value}`);
  }

  return token.value;
}

function parseObject(cursor: Cursor): JsonValue {
  const object: Record<string, JsonValue> = {};

  // Empty is its own case. Falling into the loop would demand a key.
  if (cursor.eat('}')) return object;

  for (;;) {
    const key = cursor.next();
    if (key.type !== 'string') {
      throw new SyntaxError(`An object key has to be a quoted string, found ${describe(key)}`);
    }

    cursor.expect(':');
    object[key.value] = parseValue(cursor);

    // A comma promises another pair, which is why `{"a": 1,}` fails on the next
    // pass rather than being quietly forgiven here.
    if (cursor.eat(',')) continue;

    cursor.expect('}');
    return object;
  }
}

function parseArray(cursor: Cursor): JsonValue {
  const items: JsonValue[] = [];

  if (cursor.eat(']')) return items;

  for (;;) {
    items.push(parseValue(cursor));

    if (cursor.eat(',')) continue;

    cursor.expect(']');
    return items;
  }
}
