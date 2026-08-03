import { codeProblem, md, type ProblemDraft } from './types';

/**
 * The pattern track, entered on purpose: `dsa-patterns` is in
 * `OPT_IN_CATEGORIES`, so the daily queue never deals these alongside the
 * feature-work reps. Reach them by scoping practice or a session to the
 * category. Written in pattern-sized waves; this is two pointers.
 */
export const dsaPatternProblems: ProblemDraft[] = [
  codeProblem({
    slug: 'dsa-merge-sorted',
    title: 'Merge two sorted arrays',
    category: 'dsa-patterns',
    difficulty: 'easy',
    relevance: 'occasional',
    prompt: md(
      'Merge two arrays, each already sorted ascending, into one sorted array.',
      '',
      'Keep duplicates. Do it in a single pass rather than sorting the concatenation.'
    ),
    starter: 'function merge(a, b) {\n  \n}',
    tests: [
      {
        name: 'interleaves both sides',
        expression: 'merge([1, 4, 7], [2, 3, 8])',
        expected: [1, 2, 3, 4, 7, 8],
      },
      { name: 'keeps duplicates', expression: 'merge([1, 2], [2, 3])', expected: [1, 2, 2, 3] },
      {
        name: 'compares by value, not as strings',
        expression: 'merge([2, 10], [3, 20])',
        expected: [2, 3, 10, 20],
      },
      { name: 'handles an empty left side', expression: 'merge([], [1, 2])', expected: [1, 2] },
      { name: 'handles an empty right side', expression: 'merge([3], [])', expected: [3] },
      { name: 'handles two empty arrays', expression: 'merge([], [])', expected: [] },
    ],
    reference:
      'function merge(a, b) {\n  const out = [];\n  let i = 0;\n  let j = 0;\n  while (i < a.length && j < b.length) {\n    if (a[i] <= b[j]) {\n      out.push(a[i]);\n      i += 1;\n    } else {\n      out.push(b[j]);\n      j += 1;\n    }\n  }\n  return out.concat(a.slice(i), b.slice(j));\n}',
    hints: [
      'The smallest value left is always at the front of one of the two arrays.',
      'When one side runs out, everything left on the other side is already in order.',
      '`[...a, ...b].sort()` compares as strings, so 10 lands before 2.',
    ],
    explanation:
      'Both inputs are sorted, so the smallest remaining value is at the front of one of them: comparing those two fronts is the whole algorithm, and it costs O(n + m). Sorting the concatenation is O((n + m) log(n + m)) and throws away the ordering you were handed. It also has a bug that has nothing to do with speed, since `sort()` without a comparator converts to strings and puts 10 before 2. Taking from `a` when the fronts are equal is what keeps the merge stable, which starts to matter the moment the values are objects.',
  }),

  codeProblem({
    slug: 'dsa-two-sum-sorted',
    title: 'Two sum on a sorted array',
    category: 'dsa-patterns',
    difficulty: 'medium',
    relevance: 'foundational',
    prompt: md(
      'Given an array sorted ascending and a target, return the indices of the two values that add',
      'to it, as `[i, j]` with `i` before `j`. Return `null` when no pair does.',
      '',
      'A value cannot pair with itself. Solve it in constant extra space.'
    ),
    starter: 'function twoSum(sorted, target) {\n  \n}',
    tests: [
      {
        name: 'finds a pair in the middle',
        expression: 'twoSum([1, 3, 4, 7, 11], 11)',
        expected: [2, 3],
      },
      { name: 'finds a pair at the ends', expression: 'twoSum([2, 5, 9], 11)', expected: [0, 2] },
      {
        name: 'handles negative values',
        expression: 'twoSum([-4, -1, 0, 3], -5)',
        expected: [0, 1],
      },
      {
        name: 'returns null when nothing adds up',
        expression: 'twoSum([1, 2, 3], 100)',
        expectedCode: 'null',
      },
      {
        name: 'does not pair a value with itself',
        expression: 'twoSum([3, 6], 6)',
        expectedCode: 'null',
      },
      { name: 'handles an empty array', expression: 'twoSum([], 5)', expectedCode: 'null' },
    ],
    reference:
      'function twoSum(sorted, target) {\n  let left = 0;\n  let right = sorted.length - 1;\n  while (left < right) {\n    const sum = sorted[left] + sorted[right];\n    if (sum === target) return [left, right];\n    if (sum < target) left += 1;\n    else right -= 1;\n  }\n  return null;\n}',
    hints: [
      'A hash map solves this, and ignores the fact that the array is sorted.',
      'Start with the widest pair: one index at each end.',
      'A sum that is too big means the right value is too big; too small means the left one is.',
    ],
    explanation:
      'Sorting is the information the hash-map solution throws away. Once the array is ordered, the sum tells you which pointer to move: raising the left index is the only way to increase it and lowering the right index is the only way to decrease it, so neither pointer ever needs to go back and every index is visited once. That is O(n) time in O(1) space, against the map at O(n) space. The loop runs while `left < right` rather than `<=`, which is what stops one value being counted twice.',
  }),

  codeProblem({
    slug: 'dsa-move-zeroes',
    title: 'Move the zeroes to the end',
    category: 'dsa-patterns',
    difficulty: 'medium',
    relevance: 'foundational',
    prompt: md(
      'Move every zero to the end of the array, keeping the other values in their original order.',
      '',
      'Do it in place and return the same array you were given.'
    ),
    starter: 'function moveZeroes(items) {\n  \n}',
    tests: [
      {
        name: 'moves the zeroes to the end',
        expression: 'moveZeroes([0, 1, 0, 3, 12])',
        expected: [1, 3, 12, 0, 0],
      },
      {
        name: 'keeps the order of everything else',
        expression: 'moveZeroes([4, 0, 5, 0, 6])',
        expected: [4, 5, 6, 0, 0],
      },
      {
        name: 'returns the array it was given, not a copy',
        expression: '(() => { const xs = [0, 1, 0, 2]; return moveZeroes(xs) === xs; })()',
        expected: true,
      },
      {
        name: 'changes the array you passed in',
        expression: '(() => { const xs = [0, 1]; moveZeroes(xs); return xs; })()',
        expected: [1, 0],
      },
      {
        name: 'leaves an array with no zeroes alone',
        expression: 'moveZeroes([1, 2, 3])',
        expected: [1, 2, 3],
      },
      { name: 'handles an empty array', expression: 'moveZeroes([])', expected: [] },
    ],
    reference:
      'function moveZeroes(items) {\n  let write = 0;\n  for (let read = 0; read < items.length; read += 1) {\n    if (items[read] !== 0) {\n      items[write] = items[read];\n      write += 1;\n    }\n  }\n  for (; write < items.length; write += 1) {\n    items[write] = 0;\n  }\n  return items;\n}',
    hints: [
      'Two pointers, but not one at each end: one reads and one writes.',
      'Copy every non-zero value back to the write pointer, then fill what is left with zeroes.',
      'Calling `splice` inside the loop shifts every later element, which makes it O(n²).',
    ],
    explanation:
      'The write pointer is where the next kept value belongs and the read pointer is where you are looking. The write pointer can never overtake the read pointer, so overwriting in place is safe, and whatever sits past the last write is exactly the zeroes you skipped. Reaching for `splice` inside the loop is the version that looks tidier and runs in O(n²), because every removal shifts the rest of the array. `filter` then pad is the same complexity as this and reads better, but it allocates a second array, which is the one thing in place was asked to avoid.',
  }),
];
