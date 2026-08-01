import { code, md, type ProblemDraft } from './types';

export const cssProblems: ProblemDraft[] = [
  {
    slug: 'css-center-both-axes',
    title: 'Centre a box in both directions',
    category: 'css',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A parent needs its single child centred horizontally and vertically.',
      '',
      code('css', '.parent {', '  display: flex;', '  /* two more declarations */', '}'),
      '',
      'Name the two properties that finish the job.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'justify-content[\\s\\S]*align-items',
        'align-items[\\s\\S]*justify-content',
      ],
      closeSubstrings: {
        'text-align': 'text-align centres inline content, not the box itself.',
        margin: 'margin: auto works horizontally, but the question asks for both axes with flex.',
        'align-content':
          'align-content lays out multiple lines. With one child you want align-items.',
      },
      hints: [
        'One property controls the main axis, the other the cross axis.',
        'By default the main axis of a flex container runs horizontally.',
        '`justify-content: center` and `align-items: center`.',
      ],
    },
    canonicalAnswer: 'justify-content: center; align-items: center;',
    solution: code(
      'css',
      '.parent {',
      '  display: flex;',
      '  justify-content: center;',
      '  align-items: center;',
      '}'
    ),
    explanation:
      '`justify-content` positions children along the **main** axis and `align-items` along the **cross** axis. With the default `flex-direction: row` that means horizontal and vertical respectively, so flipping to `column` swaps which one does what. That surprise is the single most common flexbox bug. Grid gets you the same result with `display: grid; place-items: center`, which is shorter and does not care about direction.',
  },

  {
    slug: 'css-specificity-order',
    title: 'Why the later rule lost',
    category: 'css',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'The text stays blue even though the red rule comes second:',
      '',
      code(
        'css',
        '#sidebar .link { color: blue; }',
        '.link { color: red; }',
        '',
        '<a id="x" class="link">…</a>'
      ),
      '',
      'Explain why, and give one way to make red win without using `!important`.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['specificity', 'more specific', 'higher specific'],
          missingFeedback: 'Name the mechanism that decides between two matching rules.',
        },
        {
          synonyms: ['id', '#sidebar', 'identifier'],
          missingFeedback: 'Which selector part gives the blue rule its weight?',
        },
        {
          synonyms: [
            'source order',
            'order only',
            'same specificity',
            'tie',
            'only applies',
            'last one',
          ],
          missingFeedback: 'When does document order actually decide the winner?',
        },
        {
          synonyms: [
            'add a class',
            'match the specificity',
            'raise',
            'layer',
            'cascade layer',
            '#',
          ],
          missingFeedback: 'Give a fix: how do you let the red rule win?',
        },
      ],
      hints: [
        'Two rules match the same element, so something has to break the tie.',
        'Selectors are weighted id, then class/attribute/pseudo-class, then element.',
        'Source order only decides ties. An id beats any number of classes.',
      ],
    },
    canonicalAnswer:
      'Specificity decides before source order. The first selector includes an id (#sidebar) which outweighs a single class, so blue wins even though red is declared later. Source order only applies when the two selectors have the same specificity. To let red win, raise its specificity to match, for example #sidebar .link { color: red } or put the rules in cascade layers so the later layer wins.',
    solution: code(
      'css',
      '/* match the weight, then order decides */',
      '#sidebar .link { color: blue; }',
      '#sidebar .link { color: red; }',
      '',
      '/* or take order out of it with layers */',
      '@layer base, theme;',
      '@layer base { #sidebar .link { color: blue; } }',
      '@layer theme { .link { color: red; } }'
    ),
    explanation:
      'The cascade compares specificity **before** it looks at document order. An id contributes to a higher column than a class, and columns are compared left to right, so `#sidebar .link` (1 id, 1 class) beats `.link` (1 class) no matter how many classes you pile up. Source order is the last tiebreaker, not the first. `!important` wins but it is a blunt instrument that invites an `!important` arms race. Cascade layers are the modern escape hatch: a rule in a later layer beats an earlier layer regardless of specificity, which is exactly what you want for theme overrides.',
  },

  {
    slug: 'css-box-sizing',
    title: 'The width that is not the width',
    category: 'css',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'This element renders 340px wide, not 300px:',
      '',
      code('css', '.card {', '  width: 300px;', '  padding: 20px;', '}'),
      '',
      'Write the declaration that makes padding count inside the declared width.'
    ),
    graderConfig: {
      accept: ['border-box'],
      acceptPatterns: ['box-sizing:\\s*border-box'],
      nearMisses: {
        'content-box': 'content-box is the default, and it is the behaviour causing the problem.',
      },
      closeSubstrings: {
        'box-sizing': 'Right property. Which value pulls padding inside the width?',
      },
      hints: [
        'The default box model adds padding and border outside the declared width.',
        'One property switches which box `width` refers to.',
        '`box-sizing: border-box`',
      ],
    },
    canonicalAnswer: 'box-sizing: border-box',
    solution: code(
      'css',
      '.card {',
      '  box-sizing: border-box;',
      '  width: 300px;',
      '  padding: 20px; /* now inside the 300px */',
      '}'
    ),
    explanation:
      'The default `content-box` means `width` describes the content only, so padding and border are added on top: 300 + 20 + 20 = 340. `border-box` makes `width` describe the border box, so padding eats into the 300 instead of extending it. Nearly every codebase sets `*, *::before, *::after { box-sizing: border-box }` once at the top and never thinks about it again, which is why this bites hardest in a stylesheet that forgot to.',
  },

  {
    slug: 'css-flex-min-width',
    title: 'The flex item that will not shrink',
    category: 'css',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A long unbroken string inside a flex item pushes the layout wider than its container instead of being truncated:',
      '',
      code(
        'css',
        '.row { display: flex; }',
        '.item { flex: 1; overflow: hidden; text-overflow: ellipsis; }'
      ),
      '',
      'Write the declaration on `.item` that lets it shrink below its content size.'
    ),
    graderConfig: {
      accept: ['min-width: 0', 'min-width:0'],
      acceptPatterns: ['min-width:\\s*0', 'min-inline-size:\\s*0'],
      closeSubstrings: {
        'overflow-wrap': 'That breaks the text. The question is why the item refuses to shrink.',
        'word-break': 'That breaks the text. The question is why the item refuses to shrink.',
        'max-width': 'A max-width caps growth. The blocker here is the automatic *minimum*.',
      },
      hints: [
        'A flex item has an automatic minimum size, which is its content size.',
        '`overflow: hidden` cannot help while the minimum keeps the box wide.',
        'Override the automatic minimum: `min-width: 0`.',
      ],
    },
    canonicalAnswer: 'min-width: 0',
    solution: code(
      'css',
      '.item {',
      '  flex: 1;',
      '  min-width: 0; /* override the automatic minimum */',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}'
    ),
    explanation:
      'A flex item gets `min-width: auto`, which resolves to its **content** size, so it refuses to shrink below the widest unbreakable thing inside it. That is the automatic minimum size, and it silently defeats `overflow: hidden` and every truncation trick built on it. Setting `min-width: 0` opts out. In a column flex container the equivalent is `min-height: 0`, which is the same bug wearing a different hat and the usual reason a scrollable panel refuses to scroll.',
  },

  {
    slug: 'css-grid-auto-fit',
    title: 'A responsive grid without media queries',
    category: 'css',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'You want as many columns as fit, each at least 200px, each sharing leftover space, with no media queries.',
      '',
      code('css', '.grid {', '  display: grid;', '  grid-template-columns: /* ? */;', '}'),
      '',
      'Write the value for `grid-template-columns`.'
    ),
    graderConfig: {
      accept: [],
      acceptPatterns: [
        'repeat\\(\\s*auto-(fit|fill)\\s*,\\s*minmax\\(\\s*200px\\s*,\\s*1fr\\s*\\)\\s*\\)',
      ],
      closeSubstrings: {
        'repeat(3': 'A fixed count needs media queries to adapt. Let the browser decide the count.',
        minmax: 'minmax is right. Wrap it in repeat() with auto-fit so the count adapts.',
      },
      hints: [
        'Let the browser work out the column count from the available width.',
        '`repeat()` takes `auto-fit` or `auto-fill` instead of a number.',
        '`repeat(auto-fit, minmax(200px, 1fr))`',
      ],
    },
    canonicalAnswer: 'repeat(auto-fit, minmax(200px, 1fr))',
    solution: code(
      'css',
      '.grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));',
      '  gap: 1rem;',
      '}'
    ),
    explanation:
      'The browser fits as many 200px tracks as the container allows, then `1fr` shares the remainder so the tracks stretch to fill the row. No breakpoints, and it adapts to the container rather than the viewport. The difference between `auto-fit` and `auto-fill` shows up only when there are fewer items than fit: `auto-fit` collapses the empty tracks so the real items stretch, `auto-fill` keeps them, leaving a gap on the right. Use `auto-fill` when you want a stable column rhythm across rows.',
  },

  {
    slug: 'css-position-context',
    title: 'Absolute relative to what?',
    category: 'css',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A badge positioned `absolute` inside a card is landing in the corner of the page, not the card.',
      '',
      code(
        'css',
        '.card { /* nothing positional */ }',
        '.badge { position: absolute; top: 0; right: 0; }'
      ),
      '',
      'Write the declaration the card is missing.'
    ),
    graderConfig: {
      accept: ['position: relative', 'position:relative', 'relative'],
      acceptPatterns: ['position:\\s*(relative|sticky|absolute|fixed)'],
      nearMisses: {
        'position: static': 'static is the default, and it is what makes the card get skipped.',
      },
      hints: [
        'An absolute element positions against its nearest *positioned* ancestor.',
        '`static` does not count as positioned, and it is the default.',
        '`position: relative` on the card is enough.',
      ],
    },
    canonicalAnswer: 'position: relative',
    solution: code(
      'css',
      '.card { position: relative; }',
      '.badge { position: absolute; top: 0; right: 0; }'
    ),
    explanation:
      'An absolutely positioned element resolves its offsets against the nearest ancestor whose `position` is anything other than `static`. With no positioned ancestor it falls all the way back to the initial containing block, which is why the badge escapes to the page corner. `position: relative` with no offsets changes nothing visually but establishes the containing block, which is the entire trick. Note that `transform`, `filter` and `will-change` also create a containing block for fixed and absolute descendants, which is why a `fixed` header sometimes mysteriously scrolls with a transformed parent.',
  },

  {
    slug: 'css-margin-collapse',
    title: 'The margin that vanished',
    category: 'css',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'Two stacked paragraphs each have `margin: 20px 0`, but the gap between them measures 20px, not 40px.',
      '',
      'Explain what happened and name one thing that stops it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['collaps', 'margin collapse'],
          missingFeedback: 'Name the behaviour.',
        },
        {
          synonyms: ['larger', 'largest', 'bigger', 'max', 'greater'],
          missingFeedback: 'Which of the two margins survives?',
        },
        {
          synonyms: [
            'flex',
            'grid',
            'padding',
            'border',
            'overflow',
            'bfc',
            'block formatting',
            'inline-block',
            'absolute',
          ],
          missingFeedback: 'Name something that prevents it.',
        },
      ],
      hints: [
        'Adjacent vertical margins in normal flow do not add up.',
        'The bigger of the two wins; the smaller disappears.',
        'Flex and grid containers do not collapse their items’ margins.',
      ],
    },
    canonicalAnswer:
      'The vertical margins collapsed: adjacent block-level margins in normal flow merge into one, and the larger of the two wins rather than the two adding together. Making the parent a flex or grid container stops it, as does putting padding or a border between them or creating a new block formatting context with overflow.',
    solution: code(
      'css',
      '/* margins no longer collapse between flex items */',
      '.stack {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 40px;',
      '}'
    ),
    explanation:
      'Adjacent vertical margins in normal flow **collapse** into a single margin equal to the larger of the two. It also happens between a parent and its first or last child, which is the version that surprises people: a child margin escapes and pushes the parent down. Anything that creates a new block formatting context stops it, and so do flex and grid layout, which is a good reason to reach for `gap` instead of margins for spacing between siblings. `gap` is a real distance, never collapsed, and it does not leave a stray margin on the outside edges.',
  },

  {
    slug: 'css-stacking-context',
    title: 'z-index that does nothing',
    category: 'css',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A dropdown with `z-index: 9999` still renders behind a sibling card with `z-index: 1`:',
      '',
      code(
        'css',
        '.header { position: relative; opacity: 0.98; }',
        '.header .dropdown { position: absolute; z-index: 9999; }',
        '.card { position: relative; z-index: 1; }'
      ),
      '',
      'Explain why the big number loses, and how to fix it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['stacking context', 'stacking'],
          missingFeedback: 'Name the concept that scopes z-index.',
        },
        {
          synonyms: ['opacity', 'transform', 'filter', 'will-change', 'isolation'],
          missingFeedback: 'What on the header created one?',
        },
        {
          synonyms: [
            'compared',
            'within',
            'inside',
            'local',
            'relative to',
            'parent',
            'ancestor',
            'siblings',
          ],
          missingFeedback: 'Explain what z-index is actually compared against.',
        },
        {
          synonyms: ['remove the opacity', 'portal', 'move', 'raise the header', 'outside', 'fix'],
          missingFeedback: 'Give a fix.',
        },
      ],
      hints: [
        'z-index only orders elements inside the same stacking context.',
        'Several innocuous properties create a stacking context. `opacity` below 1 is one.',
        'The header itself is what has to beat the card, not the dropdown.',
      ],
    },
    canonicalAnswer:
      'The opacity below 1 on the header creates a stacking context, so the dropdown z-index of 9999 is only compared against its siblings inside the header, not against the card. The whole header stacks as one unit at its own level. Fix it by removing the opacity, by raising the header itself above the card with its own z-index, or by rendering the dropdown outside the header in a portal.',
    solution: code(
      'css',
      '/* the header is the thing that has to win */',
      '.header { position: relative; z-index: 10; }',
      '',
      '/* or drop the opacity so no context is created */',
      '.header { position: relative; }'
    ),
    explanation:
      '`z-index` orders elements **within a stacking context**, never across them. A context is created by the root element, by a positioned element with a `z-index` other than `auto`, and by a long list of otherwise harmless properties: `opacity` below 1, any `transform`, `filter`, `will-change`, `isolation: isolate`, `contain: paint`. Once the header has one, everything inside it is painted as a single unit at the header’s level, so a child can never escape past a sibling of its parent no matter how large its z-index. This is why portals exist for dropdowns and modals: rendering into `document.body` sidesteps the whole question.',
  },

  {
    slug: 'css-em-vs-rem',
    title: 'The padding that keeps growing',
    category: 'css',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Nested elements using `padding: 1em` end up with visibly different padding at each level, even though the declaration is identical.',
      '',
      'Name the unit that would keep it constant regardless of nesting.'
    ),
    graderConfig: {
      accept: ['rem'],
      acceptPatterns: ['\\brem\\b'],
      nearMisses: {
        px: 'px is constant, but it ignores the user’s font size preference. There is a better answer.',
      },
      closeSubstrings: {
        'root em': 'That is the right idea. What is the unit called?',
      },
      hints: [
        '`em` resolves against the font size of the *current* element, so it compounds.',
        'You want a unit anchored to one fixed place.',
        '`rem` is relative to the root element’s font size.',
      ],
    },
    canonicalAnswer: 'rem',
    solution: code(
      'css',
      '.box { padding: 1rem; } /* 16px everywhere, whatever the local font-size */',
      '.box { padding: 1em; }  /* relative to this element’s font-size, so it compounds */'
    ),
    explanation:
      '`em` is relative to the computed font size of the element it is used on, so nesting multiplies it: 1em inside a 1.25em parent inside another 1.25em parent keeps growing. `rem` is relative to the **root** font size, so it is the same everywhere and still respects a user who has raised their browser font size, which a hardcoded `px` value ignores. The useful exception is when you *want* compounding: `padding: 0.5em` on a button scales the padding with the button’s own text size, which is exactly right for a component that comes in three sizes.',
  },

  {
    slug: 'css-transition-display',
    title: 'The fade that never fades',
    category: 'css',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'Toggling this class makes the element appear and disappear instantly, with no fade:',
      '',
      code(
        'css',
        '.panel { display: none; opacity: 0; transition: opacity 200ms; }',
        '.panel.open { display: block; opacity: 1; }'
      ),
      '',
      'Explain why the transition does not run, and give a way to make it work.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['display', 'display: none', 'not animatable', 'discrete'],
          missingFeedback: 'Which property is the problem?',
        },
        {
          synonyms: [
            'same frame',
            'one frame',
            'no starting',
            'not rendered',
            'both change',
            'at once',
            'simultan',
          ],
          missingFeedback: 'Why does the browser have nothing to animate between?',
        },
        {
          synonyms: [
            'visibility',
            'height',
            'position',
            'pointer-events',
            'requestanimationframe',
            'allow-discrete',
            'starting-style',
            'two steps',
            'delay',
          ],
          missingFeedback: 'Give a workaround.',
        },
      ],
      hints: [
        '`display` is not an animatable property in the usual sense.',
        'The element goes from not rendered to fully rendered in a single frame, so there is no start value to interpolate from.',
        'Either keep it rendered and toggle something else, or use `transition-behavior: allow-discrete` with `@starting-style`.',
      ],
    },
    canonicalAnswer:
      'display is not interpolated, so the element goes from not rendered to rendered in the same frame that opacity changes and there is no starting value to animate from. Keep it in the layout and toggle visibility and opacity together instead, or use transition-behavior: allow-discrete with @starting-style so the browser has a start value.',
    solution: code(
      'css',
      '.panel {',
      '  visibility: hidden;',
      '  opacity: 0;',
      '  transition:',
      '    opacity 200ms,',
      '    visibility 200ms;',
      '}',
      '.panel.open {',
      '  visibility: visible;',
      '  opacity: 1;',
      '}'
    ),
    explanation:
      'A transition needs a start value and an end value in two different frames. `display: none` means the element is not rendered at all, so when it flips to `block` the browser has nothing to interpolate from and jumps straight to the end state. The traditional fix keeps the element rendered and animates `opacity` alongside `visibility`, which is animatable in a discrete way and gets delayed to the end of the transition on the way out. The modern fix is `transition-behavior: allow-discrete` plus a `@starting-style` block giving the browser an explicit start value, which finally makes fading a `display: none` element work without JavaScript.',
  },

  {
    slug: 'css-container-query',
    title: 'Style by container, not viewport',
    category: 'css',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'The same card component sits in a wide main column and a narrow sidebar. It should go two-column only when *its own box* is at least 400px, regardless of the viewport.',
      '',
      'Name the CSS feature for this.'
    ),
    graderConfig: {
      accept: ['container query', 'container queries', '@container'],
      acceptPatterns: ['container quer', '@container'],
      nearMisses: {
        'media query':
          'Media queries measure the viewport, which is exactly what we want to avoid.',
      },
      closeSubstrings: {
        'container-type': 'Right area. What is the feature called?',
      },
      hints: [
        'Media queries ask about the viewport. You want to ask about the parent box.',
        'The parent has to opt in with `container-type: inline-size`.',
        'Container queries, written `@container (min-width: 400px)`.',
      ],
    },
    canonicalAnswer: 'container query',
    solution: code(
      'css',
      '.card-wrapper {',
      '  container-type: inline-size;',
      '}',
      '',
      '@container (min-width: 400px) {',
      '  .card { grid-template-columns: 1fr 1fr; }',
      '}'
    ),
    explanation:
      'A media query asks how big the **viewport** is, which is the wrong question for a component that can appear in a wide column or a narrow sidebar on the same page. A container query asks how big the component’s own container is, so the card adapts to where it was placed. The container has to opt in with `container-type: inline-size`, which tells the browser to track its inline dimension. Note that the query targets descendants of the container, never the container itself, which is why the wrapper element exists in the solution.',
  },

  {
    slug: 'css-overflow-scroll-parent',
    title: 'The panel that will not scroll',
    category: 'css',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A scrollable list inside a full-height flex column grows past the screen instead of scrolling:',
      '',
      code(
        'css',
        '.page { display: flex; flex-direction: column; height: 100vh; }',
        '.list { flex: 1; overflow-y: auto; }'
      ),
      '',
      'Write the declaration `.list` is missing.'
    ),
    graderConfig: {
      accept: ['min-height: 0', 'min-height:0'],
      acceptPatterns: ['min-height:\\s*0', 'min-block-size:\\s*0'],
      closeSubstrings: {
        'max-height': 'A max-height works by accident. The real blocker is the automatic minimum.',
        'height: 100%': 'That fights the flex sizing rather than fixing why it will not shrink.',
        'min-width': 'Right idea, wrong axis. This is a column, so the cross axis is height.',
      },
      hints: [
        'This is the same automatic minimum size as the flex truncation problem, on the other axis.',
        'A flex item will not shrink below its content height by default.',
        '`min-height: 0`',
      ],
    },
    canonicalAnswer: 'min-height: 0',
    solution: code(
      'css',
      '.list {',
      '  flex: 1;',
      '  min-height: 0; /* let it shrink so overflow can take effect */',
      '  overflow-y: auto;',
      '}'
    ),
    explanation:
      'In a column flex container an item’s automatic minimum size is its content height, so a long list refuses to shrink to the space available and `overflow-y: auto` never has a reason to engage. `min-height: 0` opts out of the automatic minimum and lets the item take the size flex gives it, at which point overflow scrolls. It is the same rule as `min-width: 0` for horizontal truncation, and between them they explain a large share of "why is my layout scrolling the whole page" bugs. In grid the equivalent is `minmax(0, 1fr)` instead of a bare `1fr`.',
  },
];
