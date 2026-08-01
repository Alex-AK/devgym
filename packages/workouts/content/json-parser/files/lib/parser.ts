import { type Punctuation, type Token, tokenize } from './tokenizer';

/** Everything a JSON document can hold. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Stage two: tokens in, a value out.
 *
 * Recursive descent means one function per shape in the grammar, each calling
 * the others as the shapes nest. The cursor below is written for you; the two
 * shapes that nest are not.
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

  // TODO: a JSON document is one value and nothing after it. As it stands,
  // `{"a": 1} and then some` comes back as an object.

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
  // TODO: the opening brace is already consumed. Read `"key": value` pairs
  // separated by commas until the closing brace, which you consume too. {} is
  // legal and {"a": 1,} is not.
  void cursor;
  throw new SyntaxError('Objects are not parsed yet');
}

function parseArray(cursor: Cursor): JsonValue {
  // TODO: the same shape, with values instead of pairs. [] is legal and [1,]
  // is not.
  void cursor;
  throw new SyntaxError('Arrays are not parsed yet');
}
