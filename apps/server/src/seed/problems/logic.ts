import { code, codeProblem, md, type ProblemDraft } from './types';

/**
 * Boolean algebra where it actually bites. The operators return operands rather
 * than booleans, the branch that never runs takes its side effect with it, and
 * SQL carries a third truth value that removes rows instead of raising an error.
 *
 * Truth tables are in as the model behind a conditional. Gates as circuits are
 * out: this is not a hardware course.
 */
export const logicProblems: ProblemDraft[] = [
  {
    slug: 'logic-and-returns-operand',
    title: 'What && actually returns',
    category: 'logic',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md('What does `0 && "x"` evaluate to?'),
    graderConfig: {
      accept: ['0'],
      nearMisses: {
        false:
          '`&&` does not convert anything. It returns one of its operands, and the left one here is `0`.',
        x: 'The left side is falsy, so `&&` stops there and never reaches `"x"`.',
        undefined: '`&&` returns an operand, and both operands here are defined.',
      },
      hints: [
        '`&&` is not an operator that produces a boolean.',
        'It returns the first falsy operand, or the last one if none are falsy.',
      ],
    },
    canonicalAnswer: '0',
    solution: code(
      'js',
      '0 && "x"; // 0, the left operand itself',
      '"a" && "b"; // "b", the last one, because nothing was falsy'
    ),
    explanation:
      '`&&` returns an **operand**, never a boolean of its own making. It evaluates left to right, stops at the first falsy value and returns it, and returns the last operand if it never found one. So `0 && "x"` is `0` and `"a" && "b"` is `"b"`. `||` is the mirror image: it stops at the first **truthy** value. This is why `if (a && b)` works fine (the `if` coerces) while `const flag = a && b` gives you a value whose type you have not thought about.',
  },

  {
    slug: 'logic-or-last-operand',
    title: 'The fallback that returns the fallback',
    category: 'logic',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Given:',
      '',
      code('js', 'const port = null || 0;'),
      '',
      'What is the value of `port`?'
    ),
    graderConfig: {
      accept: ['0'],
      nearMisses: {
        null: '`||` moved past `null` because it is falsy. It does not stop there.',
        false:
          '`||` returns an operand rather than a boolean, and neither operand here is `false`.',
        undefined: 'Both operands are defined. `||` hands back one of them.',
      },
      hints: [
        'Neither operand is truthy, so `||` never finds one to stop at.',
        'When nothing is truthy, `||` returns the **last** operand it evaluated.',
      ],
    },
    canonicalAnswer: '0',
    solution: code(
      'js',
      'null || 0; // 0. Nothing was truthy, so the last operand comes back',
      'null ?? 0; // 0 as well here, but for a different reason'
    ),
    explanation:
      '`||` returns the first truthy operand, and when there is not one it returns the last operand rather than `false`. That is the half people forget: a chain of falsy defaults gives you the final default, whatever it happens to be. It matters when the chain is longer than two, because `a || b || c` hands back `c` untested when `a` and `b` are both falsy, and `c` may be exactly as unusable as they were. If you meant "the first one that was actually supplied", `??` asks that question instead.',
  },

  {
    slug: 'logic-short-circuit-side-effect',
    title: 'The call that never happened',
    category: 'logic',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'How many times does `track` run?',
      '',
      code(
        'js',
        'let calls = 0;',
        'const track = () => {',
        '  calls += 1;',
        '  return true;',
        '};',
        '',
        'const enabled = false;',
        'if (enabled && track()) {',
        '  send();',
        '}'
      )
    ),
    graderConfig: {
      accept: ['0', 'zero', 'never', 'none'],
      nearMisses: {
        1: '`enabled` is `false`, so `&&` answers before it reaches the right-hand side.',
        2: 'The condition is evaluated once, and it stops before the call.',
      },
      hints: [
        '`&&` stops as soon as it knows the answer.',
        'A falsy left side settles the whole expression, so the right side is never evaluated.',
      ],
    },
    canonicalAnswer: '0',
    solution: code(
      'js',
      '// enabled is false, so && answers false without evaluating track().',
      'if (enabled && track()) send(); // calls === 0'
    ),
    explanation:
      'Short-circuiting is not an optimisation, it is the defined behaviour: `&&` does not evaluate its right operand when the left is falsy, and `||` does not when the left is truthy. Anything with a side effect on that side simply does not happen. That is useful on purpose (`user && user.save()`) and a trap when the side effect was the point, which is how logging, metrics and cache warming quietly stop running behind a flag that flipped. If you need both, evaluate them into variables first and combine the variables.',
  },

  {
    slug: 'logic-and-renders-zero',
    title: 'The count that rendered itself',
    category: 'logic',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A badge shows a bare `0` on screen when there are no messages.',
      '',
      code('jsx', '{unread && <Badge count={unread} />}'),
      '',
      'What does that expression evaluate to when `unread` is `0`?'
    ),
    graderConfig: {
      accept: ['0'],
      nearMisses: {
        false:
          'That is what you wanted it to be. `&&` returns the operand, and the operand is `0`.',
        null: 'Nothing here produces `null`. React skips `null` and `false`, which is why they would have worked.',
        nothing: 'It evaluates to a value, and that value is what gets rendered.',
      },
      hints: [
        '`&&` returns its left operand when that operand is falsy.',
        'React renders numbers. It skips `false`, `null` and `undefined`, but `0` is none of those.',
      ],
    },
    canonicalAnswer: '0',
    solution: code(
      'jsx',
      '{unread > 0 && <Badge count={unread} />} // a real boolean on the left',
      '{unread ? <Badge count={unread} /> : null} // or be explicit about the else'
    ),
    explanation:
      'The expression is `0`, and React renders `0` because it is a number. `false`, `null` and `undefined` are the values React skips, and `&&` would have produced one of those only if the left operand had been one. This is the everyday cost of `&&` returning an operand rather than a boolean: the guard leaks its own left-hand value into the output. Put a real comparison on the left, or use a ternary and say what the empty case is.',
  },

  {
    slug: 'logic-precedence-and-over-or',
    title: 'Which operator binds tighter',
    category: 'logic',
    difficulty: 'medium',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md('What does this evaluate to?', '', code('js', 'true || false && false')),
    graderConfig: {
      accept: ['true'],
      nearMisses: {
        false:
          'That is the answer if it grouped left to right. It does not: `&&` binds tighter than `||`.',
      },
      hints: [
        'The two operators do not have the same precedence.',
        '`&&` binds tighter, so the expression is `true || (false && false)`.',
      ],
    },
    canonicalAnswer: 'true',
    solution: code(
      'js',
      'true || false && false; // true',
      'true || (false && false); // the same thing, written out',
      '(true || false) && false; // false. This is what left-to-right would give'
    ),
    explanation:
      '`&&` binds tighter than `||`, so `a || b && c` is `a || (b && c)` and never `(a || b) && c`. The two disagree often enough to matter: here one is `true` and the other is `false`. It is the same relationship as `*` over `+`, and the same advice applies, which is that the parentheses cost nothing and the reader does not have to remember. `??` is the exception that refuses to guess: mixing it with `&&` or `||` without parentheses is a syntax error rather than a precedence rule.',
  },

  {
    slug: 'logic-nullish-mixing',
    title: 'The line that will not parse',
    category: 'logic',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'What happens when you run this?',
      '',
      code('js', 'const value = a || b ?? c;'),
      '',
      'Name what JavaScript does with it.'
    ),
    graderConfig: {
      accept: ['syntaxerror', 'syntax error', 'it throws a syntaxerror', 'it is a syntax error'],
      acceptPatterns: ['syntax\\s*error'],
      closeSubstrings: {
        error: 'Right that it fails. Name which kind, and when it happens.',
        parse: 'Right idea. What is the name of the error?',
      },
      hints: [
        'It does not run at all.',
        'The language refuses to guess the grouping, and says so before anything executes.',
      ],
    },
    canonicalAnswer: 'SyntaxError',
    solution: code(
      'js',
      "const value = a || b ?? c; // SyntaxError: Unexpected token '??'",
      'const value = (a || b) ?? c; // fine',
      'const value = a || (b ?? c); // also fine, and not always the same thing'
    ),
    explanation:
      'Mixing `??` with `&&` or `||` without parentheses is a **syntax error**, raised when the file is parsed, so nothing in it runs, including the parts you did not touch. The language refuses rather than picking a precedence, because the two readings genuinely differ and neither is obviously right. With `||` the two groupings happen to agree; with `&&` they do not, so `(a && b) ?? c` falls back to `c` when `a` is nullish while `a && (b ?? c)` returns `a`. Parenthesise the half you meant.',
  },

  {
    slug: 'logic-not-binds-tighter',
    title: 'Where the not stops',
    category: 'logic',
    difficulty: 'medium',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md('Given `const a = 0, b = 1;`, what does `!a && b` evaluate to?'),
    graderConfig: {
      accept: ['1'],
      nearMisses: {
        true: 'That is `!(a && b)`. `!` binds to `a` alone, not to the whole expression.',
        false: '`!a` is `true` here, because `a` is `0`.',
        0: '`&&` reaches its right operand, because `!a` is truthy.',
      },
      hints: [
        '`!` is a unary operator and binds tighter than `&&`.',
        'So the expression is `(!a) && b`, and `!a` is `true`.',
      ],
    },
    canonicalAnswer: '1',
    solution: code(
      'js',
      '!a && b; // (!a) && b  →  true && 1  →  1',
      '!(a && b); // true. A different expression with a different value'
    ),
    explanation:
      '`!` binds tighter than every binary logical operator, so `!a && b` is `(!a) && b`. With `a = 0` that is `true && 1`, and `&&` returns the last operand, so the value is `1` rather than `true`. The expression people often mean is `!(a && b)`, which is a different question and here a different answer. This is the precedence half of inverting a condition; the other half is that the inverse of `a && b` is `!a || !b`, not `!a && !b`.',
  },

  {
    slug: 'logic-invert-compound',
    title: 'Inverting a compound condition',
    category: 'logic',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A guard reads:',
      '',
      code('js', "if (status === 'open' && !archived) { … }"),
      '',
      'You need the opposite condition. Write it, and explain the rule that gets it right.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['||', 'or'],
          missingFeedback:
            'The inverted condition joins its two halves with a different operator. Which one?',
        },
        {
          synonyms: ['negat', 'invert', 'flip', 'not '],
          missingFeedback:
            'What happens to each half individually when you invert the whole thing?',
        },
        {
          synonyms: ['de morgan', 'demorgan', 'both'],
          missingFeedback:
            'Name the rule, or state it: inverting an AND gives you an OR of the inverted parts.',
        },
      ],
      hints: [
        'Negating a compound condition changes the operator as well as the parts.',
        'The inverse of `a && b` is `!a || !b`. Negating only the parts is a different condition.',
        "So: `status !== 'open' || archived`.",
      ],
    },
    canonicalAnswer:
      "The inverse is `status !== 'open' || archived`. De Morgan's law: negating an AND gives you an OR of both negated halves, so you flip each half and flip the operator. Negating only the halves and keeping the && would be a stricter condition that is not the opposite.",
    solution: code(
      'js',
      "if (status !== 'open' || archived) { … }",
      '',
      '// Or leave the condition alone and negate the whole thing, which is',
      '// always correct and often clearer:',
      "if (!(status === 'open' && !archived)) { … }"
    ),
    explanation:
      "De Morgan's laws are the two rewrites: `!(a && b)` is `!a || !b`, and `!(a || b)` is `!a && !b`. Both halves flip **and** the operator flips, and forgetting the operator is the bug, because `!a && !b` is a strictly narrower condition that happens to agree with the right answer on some inputs. When a condition has three or more terms, wrapping the original in `!( … )` is the move that cannot go wrong, and extracting it to a named predicate is the move that stops anyone having to check.",
  },

  codeProblem({
    slug: 'logic-de-morgan-code',
    title: 'Write the opposite predicate',
    category: 'logic',
    difficulty: 'medium',
    relevance: 'daily',
    prompt: md(
      'Given this predicate:',
      '',
      code('js', 'const isVisible = (item) => item.published && !item.archived;'),
      '',
      'Write `isHidden(item)` that returns `true` for exactly the items `isVisible` returns a falsy value for. Do not call `isVisible`, and return a real boolean.'
    ),
    starter: 'function isHidden(item) {\n  \n}',
    tests: [
      {
        name: 'a published, unarchived item is not hidden',
        expression: 'isHidden({ published: true, archived: false })',
        expected: false,
      },
      {
        name: 'an unpublished item is hidden',
        expression: 'isHidden({ published: false, archived: false })',
        expected: true,
      },
      {
        name: 'an archived item is hidden even when published',
        expression: 'isHidden({ published: true, archived: true })',
        expected: true,
      },
      {
        name: 'unpublished and archived is hidden',
        expression: 'isHidden({ published: false, archived: true })',
        expected: true,
      },
      {
        name: 'it returns a boolean, not an operand',
        expression: 'typeof isHidden({ published: false, archived: false })',
        expected: 'boolean',
      },
    ],
    reference: 'function isHidden(item) {\n  return !item.published || item.archived;\n}',
    hints: [
      'The inverse of `a && b` is `!a || !b`, so the `&&` becomes an `||`.',
      'The second half is already negated in the original, so negating it again gives you `item.archived`.',
      '`return !item.published || item.archived;`',
    ],
    explanation:
      'Inverting `published && !archived` flips both halves and the operator: `!published || archived`. The double negative on the second half cancels, which is where this usually goes wrong, because `!published || !archived` looks symmetrical and is a different predicate. The last test is the other half of the lesson: `||` returns an operand, so `!item.published || item.archived` gives you `true` or whatever `item.archived` held. Boolean fixtures hide that; a truthy string would not, which is why a predicate that promises a boolean should end in one.',
  }),

  {
    slug: 'logic-sql-not-in-null',
    title: 'The anti-join that returned nothing',
    category: 'logic',
    difficulty: 'hard',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      '`employees` has 12 rows, and exactly one of them has a `NULL` `manager_id`, the person at the top.',
      '',
      code(
        'sql',
        'SELECT name FROM employees',
        'WHERE id NOT IN (SELECT manager_id FROM employees);'
      ),
      '',
      'It returns 0 rows and raises no error. Explain why, using what SQL does with an unknown.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['unknown', 'three-valued', 'three valued', '3vl', 'neither true nor false'],
          missingFeedback:
            'What is the result of comparing a value against NULL? It is not true and it is not false.',
        },
        {
          synonyms: ['and', 'every', 'all of', 'chain'],
          missingFeedback:
            'What does `NOT IN` expand into? That shape is why one unknown poisons the whole thing.',
        },
        {
          synonyms: ['never true', 'not true', 'cannot be true', 'keeps only', 'only true'],
          missingFeedback: 'Which of the three truth values does WHERE keep?',
        },
      ],
      hints: [
        'Comparing anything against NULL gives neither true nor false.',
        '`NOT IN` is a chain of inequalities joined by AND: `id != a AND id != b AND …`.',
        'One unknown term makes that AND either false or unknown, and WHERE keeps only rows that came out true.',
      ],
    },
    canonicalAnswer:
      'NOT IN expands to a chain of inequalities joined by AND, and one of the values is NULL, so that term is unknown for every row. An AND containing an unknown is never true, and WHERE keeps only rows whose condition came out true, so every row is discarded. NOT EXISTS asks a question that has a real answer and returns the 9 rows.',
    solution: code(
      'sql',
      '-- 9 rows, and it survives the NULL.',
      'SELECT e.name FROM employees e',
      'WHERE NOT EXISTS (',
      '  SELECT 1 FROM employees m WHERE m.manager_id = e.id',
      ');'
    ),
    explanation:
      'SQL carries three truth values, and `WHERE` keeps only the rows whose condition came out **true**: false and unknown are discarded together, which is why this removes rows instead of raising an error. `NOT IN` is `id != v1 AND id != v2 AND …`, and one NULL in the subquery makes one term unknown for every row, so by the truth table the whole `AND` is false or unknown and never true. Plain `IN` survives the same NULL, because it is an OR chain and one genuine match makes it true. `NOT EXISTS` asks whether a row exists, which always has a real answer.',
  },

  {
    slug: 'logic-sql-not-equal-drops-null',
    title: 'The not-equals that lost rows',
    category: 'logic',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      '`reviews` has 32 rows. Ten of them have a `NULL` `comment`, and none of the comments is the string `x`.',
      '',
      code('sql', "SELECT count(*) FROM reviews WHERE comment != 'x';"),
      '',
      'What number comes back?'
    ),
    graderConfig: {
      accept: ['22'],
      nearMisses: {
        32: 'That would need the NULL rows to answer "yes, different". They answer "unknown".',
        10: 'That is the number of NULL rows, which are the ones excluded.',
        0: 'The 22 rows with a real comment do satisfy the condition.',
      },
      hints: [
        'A comparison against NULL is unknown, not true.',
        'WHERE keeps only rows whose condition came out true, so the ten NULL rows fall out.',
      ],
    },
    canonicalAnswer: '22',
    solution: code(
      'sql',
      "SELECT count(*) FROM reviews WHERE comment != 'x'; -- 22",
      "SELECT count(*) FROM reviews WHERE comment != 'x' OR comment IS NULL; -- 32"
    ),
    explanation:
      '`!=` looks like the complement of `=` and is not, over a nullable column. A NULL comment answers "unknown" rather than "yes, different", and `WHERE` keeps only true, so the ten NULL rows are discarded along with any genuine matches for `x`. The count is 22, not 32. If you meant "different, or has none", say so: `comment != \'x\' OR comment IS NULL`. This is the same rule that makes `= NULL` match nothing, wearing a different operator.',
  },

  {
    slug: 'logic-empty-array-truthy',
    title: 'The default that never fired',
    category: 'logic',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'Given:',
      '',
      code('js', 'const items = [];', "const list = items || ['default'];"),
      '',
      'What is `list.length`?'
    ),
    graderConfig: {
      accept: ['0'],
      nearMisses: {
        1: 'That is the fallback, and it never runs. `||` only falls back for a falsy left side.',
        undefined: '`list` is an array either way, so it has a length.',
      },
      hints: [
        '`||` falls back only when the left side is falsy.',
        'Every object is truthy in JavaScript, and an array is an object, however empty it is.',
      ],
    },
    canonicalAnswer: '0',
    solution: code(
      'js',
      "const list = items.length > 0 ? items : ['default']; // ask the question you meant",
      '',
      '// Because:',
      'Boolean([]); // true',
      'Boolean({}); // true',
      "Boolean(''); // false"
    ),
    explanation:
      'Every object is truthy, and arrays and objects are objects, so `[]` and `{}` both pass a truthiness test however empty they are. Only seven values are falsy: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined` and `NaN`. So `items || fallback` never falls back for an empty array, and the emptiness you were guarding against sails straight through. Test the thing you actually care about, which is usually `length` or a key count, and remember this is the mirror of the `0` problem: `||` is a truthiness test wearing the clothes of a presence test.',
  },
];
