const WRAPPING_QUOTES = new Set(['"', "'", '`', '“', '”', '‘', '’']);

const CLOSERS: Record<string, string> = {
  '"': '"',
  "'": "'",
  '`': '`',
  '“': '”',
  '‘': '’',
};

const FENCE = /^```[a-z0-9+#-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```$/i;

/** Unwrap a fenced code block (``` … ```), leaving the code itself. */
export function stripCodeFence(input: string): string {
  const trimmed = input.trim();
  const match = FENCE.exec(trimmed);
  return match?.[1] !== undefined ? match[1].trim() : trimmed;
}

/** Remove matching quote/backtick pairs wrapping the whole string. */
export function stripWrappingQuotes(input: string): string {
  let s = input.trim();
  while (s.length >= 2) {
    const first = s[0] as string;
    const last = s[s.length - 1] as string;
    if (!WRAPPING_QUOTES.has(first)) break;
    const expected = CLOSERS[first] ?? first;
    if (last !== expected) break;
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Fold an answer to its comparable form: fences and wrapping quotes removed,
 * lowercased, internal whitespace collapsed, trailing punctuation dropped.
 */
/**
 * Lighter fold for **substring** matching (keyword groups, close-substrings):
 * case and whitespace only. Crucially it does not strip trailing punctuation,
 * so operator-shaped needles like `??` or `?.` survive.
 */
export function normalizeForMatch(input: string): string {
  return stripCodeFence(input).toLowerCase().replace(/\s+/g, ' ').trim();
}

export function normalizeAnswer(input: string): string {
  let s = stripCodeFence(input);
  // Quotes and trailing punctuation can nest either way round ("Sale". / "Sale.")
  // so alternate until the string stops shrinking.
  let previous: string;
  do {
    previous = s;
    s = stripWrappingQuotes(s);
    s = s.replace(/[.,;:!?]+$/g, '').trim();
  } while (s !== previous);
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}
