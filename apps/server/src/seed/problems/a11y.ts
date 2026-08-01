import { code, md, type ProblemDraft } from './types';

export const a11yProblems: ProblemDraft[] = [
  {
    slug: 'a11y-div-button',
    title: 'The div that pretends to be a button',
    category: 'a11y',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A colleague ships this and it works fine with a mouse:',
      '',
      code('html', '<div class="btn" onclick="save()">Save</div>'),
      '',
      'Name three things a real `<button>` would have given you for free.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['focus', 'tab', 'tabindex', 'keyboard nav'],
          missingFeedback: 'How does a keyboard user reach it?',
        },
        {
          synonyms: ['enter', 'space', 'spacebar', 'key', 'activat'],
          missingFeedback: 'How does a keyboard user press it?',
        },
        {
          synonyms: ['role', 'screen reader', 'announce', 'semantic', 'accessibility tree'],
          missingFeedback: 'How is it announced to assistive technology?',
        },
      ],
      hints: [
        'Think about someone who never touches a mouse.',
        'A div is not in the tab order and does not respond to Enter or Space.',
        'A screen reader announces a button as "button". A div is announced as nothing.',
      ],
    },
    canonicalAnswer:
      'A real button is in the tab order so keyboard users can focus it, it activates on Enter and Space without any extra key handling, and it exposes the button role so a screen reader announces it as a button. You also get the disabled state and form submission behaviour for free.',
    solution: code('html', '<button type="button" class="btn" onclick="save()">Save</button>'),
    explanation:
      'Recreating a button from a div takes `tabindex="0"`, `role="button"`, a keydown handler for both Enter and Space, and matching `:focus-visible` styling. That is four things to get right and keep right, and the fourth is the one everyone forgets. Native elements carry their semantics, keyboard behaviour and platform conventions with them. The first rule of ARIA is that no ARIA is better than bad ARIA, and the shortest route to no ARIA is using the element that already means what you want.',
  },

  {
    slug: 'a11y-label-input',
    title: 'Connect a label to its input',
    category: 'a11y',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'This label is not associated with anything:',
      '',
      code('html', '<label>Email</label>', '<input type="email" id="email" />'),
      '',
      'Name the label attribute that fixes it.'
    ),
    graderConfig: {
      accept: ['for', 'htmlfor', 'htmlfor="email"', 'for="email"'],
      acceptPatterns: ['\\bhtml-?for\\b', '\\bfor\\s*=', '^for$'],
      nearMisses: {
        'aria-label':
          'aria-label works when there is no visible text, but here there is a real label to connect.',
        id: 'The input already has the id. The label needs the attribute that points at it.',
      },
      hints: [
        'The attribute points at the input’s id.',
        'In JSX it is spelled differently from HTML.',
        '`for="email"`, or `htmlFor="email"` in JSX.',
      ],
    },
    canonicalAnswer: 'for',
    solution: code(
      'html',
      '<label for="email">Email</label>',
      '<input type="email" id="email" />',
      '',
      '<!-- or wrap it, no id needed -->',
      '<label>Email <input type="email" /></label>'
    ),
    explanation:
      'A connected label is announced when the input takes focus, and it grows the click target: clicking the word "Email" focuses the field. Both matter, and the second one helps every user, not only screen reader users. Wrapping the input in the label works without an id, which is handy for generated markup, though explicit `for`/`id` survives refactoring better. In React the attribute is `htmlFor`, because `for` is a reserved word in JavaScript.',
  },

  {
    slug: 'a11y-alt-decorative',
    title: 'Alt text for a decorative image',
    category: 'a11y',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A purely decorative flourish sits next to a heading that already says everything.',
      '',
      code('html', '<img src="/swirl.svg" />'),
      '',
      'Write the attribute value that hides it from screen readers.'
    ),
    graderConfig: {
      accept: ['alt=""', 'alt=', 'empty alt', 'alt attribute with an empty string'],
      acceptPatterns: ['alt\\s*=\\s*(""|\'\')', 'empty\\s+alt', 'alt\\s+with\\s+an?\\s+empty'],
      nearMisses: {
        'aria-hidden':
          'aria-hidden works too, but for images the conventional answer is a single attribute.',
      },
      closeSubstrings: {
        'no alt':
          'Omitting alt entirely is different: some screen readers then read the filename aloud.',
      },
      hints: [
        'Leaving the attribute off is not the same as leaving it empty.',
        'An empty value tells assistive tech this image carries no information.',
        '`alt=""`',
      ],
    },
    canonicalAnswer: 'alt=""',
    solution: code('html', '<img src="/swirl.svg" alt="" />'),
    explanation:
      'An empty `alt` marks the image as decorative and screen readers skip it. **Omitting** `alt` is a different thing: with nothing to announce, some screen readers fall back to reading the file name, so the user hears "swirl dot ess vee gee". Empty alt is a deliberate statement, a missing alt is a bug. For an informative image the alt should say what the image communicates in context, not describe the picture: a chart’s alt is its takeaway, not "bar chart".',
  },

  {
    slug: 'a11y-focus-trap-modal',
    title: 'What a modal owes the keyboard',
    category: 'a11y',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'You are reviewing a custom modal built from divs. It renders on top and looks right.',
      '',
      'Name three keyboard or focus behaviours it has to implement to be usable.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['move focus', 'focus into', 'focus the', 'initial focus', 'autofocus'],
          missingFeedback: 'What happens to focus when it opens?',
        },
        {
          synonyms: ['trap', 'cycle', 'contain', 'loop', 'wrap', 'inside the modal'],
          missingFeedback: 'What stops Tab wandering into the page behind?',
        },
        {
          synonyms: ['escape', 'esc', 'close'],
          missingFeedback: 'How does a keyboard user dismiss it?',
        },
        {
          synonyms: [
            'return',
            'restore',
            'back to',
            'trigger',
            'previously focused',
            'where it was',
          ],
          missingFeedback: 'Where does focus go when it closes?',
        },
      ],
      hints: [
        'Think through opening, using and closing it with only a keyboard.',
        'Focus has to go in, stay in, and come back out to the right place.',
        'Escape should close it, and focus should return to whatever opened it.',
      ],
    },
    canonicalAnswer:
      'On open, move focus into the dialog rather than leaving it on the page behind. While open, trap Tab and Shift+Tab so focus cycles inside the modal and cannot reach the content underneath. Escape should close it. On close, return focus to the element that opened it so the user does not lose their place.',
    solution: code(
      'html',
      '<!-- the platform does all four for you -->',
      '<dialog id="confirm">',
      '  <form method="dialog">',
      '    <p>Delete this item?</p>',
      '    <button value="cancel">Cancel</button>',
      '    <button value="ok">Delete</button>',
      '  </form>',
      '</dialog>',
      '',
      '<script>',
      "  document.querySelector('#confirm').showModal();",
      '</script>'
    ),
    explanation:
      'Those four behaviours are the minimum, and there is a fifth: content behind the modal should be inert so a screen reader cursor cannot wander into it, which `inert` or `aria-hidden` on the background handles. `<dialog>` with `showModal()` gives you focus movement, the focus trap, Escape, the top layer and background inertness from the platform, and it returns focus on close. Reach for it before reaching for a library. If you do build your own, the return-focus step is the one most often missed, and it is the one that makes a keyboard user lose their place entirely.',
  },

  {
    slug: 'a11y-focus-visible',
    title: 'Removing the ugly outline',
    category: 'a11y',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A designer asks you to remove the focus ring that appears when clicking buttons. Someone writes:',
      '',
      code('css', 'button:focus { outline: none; }'),
      '',
      'Name the pseudo-class that keeps the ring for keyboard users while satisfying the request.'
    ),
    graderConfig: {
      accept: [':focus-visible', 'focus-visible'],
      acceptPatterns: [':?focus-visible'],
      nearMisses: {
        ':focus-within':
          'focus-within styles an ancestor of the focused element, which is a different job.',
        ':active': 'active is the pressed state, not the focused state.',
      },
      hints: [
        'The browser already knows whether focus came from a mouse or a keyboard.',
        'There is a pseudo-class that only matches when a visible indicator is warranted.',
        '`:focus-visible`',
      ],
    },
    canonicalAnswer: ':focus-visible',
    solution: code(
      'css',
      'button:focus { outline: none; }',
      'button:focus-visible {',
      '  outline: 2px solid currentColor;',
      '  outline-offset: 2px;',
      '}'
    ),
    explanation:
      '`:focus-visible` matches only when the browser judges a focus indicator is needed, which in practice means keyboard and other non-pointer interaction. That gives the designer the clean mouse click they asked for and keeps the ring for the people who navigate without a mouse. Killing `:focus` outright is one of the most common accessibility regressions on the web, and it is invisible to everyone testing with a mouse. If you remove the default outline, always replace it with something of your own that meets contrast, rather than leaving keyboard users with no indication of where they are.',
  },

  {
    slug: 'a11y-aria-live',
    title: 'Announcing something that changed',
    category: 'a11y',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'After an async save, a "Changes saved" message appears in a corner of the page. Sighted users see it; screen reader users never hear it, because focus never moved.',
      '',
      'Name the attribute that makes the region announce its own updates.'
    ),
    graderConfig: {
      accept: ['aria-live', 'aria-live="polite"', 'aria-live=polite'],
      acceptPatterns: ['aria-live'],
      nearMisses: {
        'aria-label': 'aria-label names an element; it does not announce later changes.',
        role: 'role="status" does work, because it carries an implicit live region. Name the attribute.',
      },
      hints: [
        'The region has to advertise that its contents change.',
        'Values are `polite` and `assertive`, and `polite` is nearly always right.',
        '`aria-live="polite"`',
      ],
    },
    canonicalAnswer: 'aria-live',
    solution: code(
      'html',
      '<div aria-live="polite" class="toast-region">',
      '  <!-- text swapped in here is announced -->',
      '</div>',
      '',
      '<!-- role="status" implies aria-live="polite" -->',
      '<div role="status">Changes saved</div>'
    ),
    explanation:
      '`aria-live="polite"` queues the announcement until the screen reader finishes what it is saying; `assertive` interrupts immediately and should be reserved for genuine emergencies, like a session about to expire. The container has to exist in the DOM **before** the text is inserted, because a live region added and populated in the same tick is often missed entirely. `role="status"` and `role="alert"` are shorthands for polite and assertive respectively. Keep the message short: the whole region is re-announced when it changes.',
  },

  {
    slug: 'a11y-heading-order',
    title: 'Headings are an outline, not a size',
    category: 'a11y',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A section needs a smaller heading, so someone changes `<h2>` to `<h4>` to get the size they want.',
      '',
      'Explain why that is a problem and what to do instead.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['outline', 'structure', 'hierarch', 'document structure', 'navigate'],
          missingFeedback: 'What do heading levels actually communicate?',
        },
        {
          synonyms: ['skip', 'jump', 'gap', 'out of order', 'level', 'h3'],
          missingFeedback: 'What goes wrong with the level sequence?',
        },
        {
          synonyms: ['css', 'font-size', 'style', 'class', 'styling'],
          missingFeedback: 'What should control the visual size instead?',
        },
      ],
      hints: [
        'Screen reader users jump between headings to navigate a page.',
        'Skipping from h2 to h4 implies a missing level in the outline.',
        'Keep the level correct and set the size in CSS.',
      ],
    },
    canonicalAnswer:
      'Heading levels describe the document outline, and screen reader users navigate by jumping between them. Skipping from h2 to h4 implies a missing h3 and makes the structure misleading. Keep the correct level for the position in the hierarchy and control the visual size with CSS or a class.',
    solution: code(
      'html',
      '<h3 class="text-sm font-medium">Billing address</h3>',
      '',
      '<!-- not this -->',
      '<h5>Billing address</h5>'
    ),
    explanation:
      'Heading navigation is one of the primary ways screen reader users move around a page, alongside landmarks and links. The levels form an outline, so jumping a level reads as a gap in the structure. Pick the level from the content hierarchy and set the appearance in CSS, which is exactly the separation of concerns the two languages exist for. One `<h1>` per page is the usual convention, and an `<h1>` that matches the page title is what most users expect to hear first.',
  },

  {
    slug: 'a11y-contrast-ratio',
    title: 'The minimum contrast ratio',
    category: 'a11y',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A design uses #999999 text on a white background for body copy.',
      '',
      'What contrast ratio does WCAG AA require for normal-size body text?'
    ),
    graderConfig: {
      accept: ['4.5', '4.5:1', '4.5 to 1', '4.5:1 ratio'],
      acceptPatterns: ['4\\.5\\s*(:|\\s+to\\s+)?\\s*1?'],
      nearMisses: {
        '3:1': '3:1 is the bar for large text and for UI components, not for body copy.',
        '7:1': '7:1 is AAA, a stricter level than AA.',
      },
      hints: [
        'The AA bar for normal text is stricter than for large text.',
        'Large text (18pt, or 14pt bold) only needs 3:1.',
        '4.5:1',
      ],
    },
    canonicalAnswer: '4.5:1',
    solution: code(
      'text',
      'AA  normal text      4.5:1',
      'AA  large text       3:1     (>=18pt, or >=14pt bold)',
      'AA  UI components    3:1     (borders, icons, focus indicators)',
      'AAA normal text      7:1',
      '',
      '#999999 on #ffffff is 2.85:1 — fails.'
    ),
    explanation:
      '#999 on white is about 2.85:1, comfortably below the bar, and it is the single most common contrast failure in real designs because it looks fine to a designer on a bright calibrated screen. The 3:1 bar for large text exists because bigger glyphs carry more of their own signal. The same 3:1 applies to non-text essentials like input borders, icons and focus indicators, which is the rule most often missed: a beautiful 1px `#e5e5e5` border around a text field fails it. Contrast is also the accessibility rule that helps everyone, on a phone outdoors as much as with low vision.',
  },

  {
    slug: 'a11y-icon-button-name',
    title: 'A button with no words',
    category: 'a11y',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A screen reader announces this as just "button":',
      '',
      code('html', '<button onclick="close()">', '  <svg>…</svg>', '</button>'),
      '',
      'Name one attribute that gives it an accessible name.'
    ),
    graderConfig: {
      accept: ['aria-label', 'aria-labelledby', 'title'],
      acceptPatterns: ['aria-label(ledby)?', 'visually hidden', 'sr-only'],
      nearMisses: {
        alt: 'alt is for img elements. An inline svg inside a button needs something else.',
        'aria-describedby':
          'describedby adds a description on top of a name. The button has no name yet.',
      },
      hints: [
        'The button contains no text, so there is nothing to announce.',
        'Either give the button a name directly or put visually hidden text inside it.',
        '`aria-label="Close"`',
      ],
    },
    canonicalAnswer: 'aria-label',
    solution: code(
      'html',
      '<button aria-label="Close" onclick="close()">',
      '  <svg aria-hidden="true">…</svg>',
      '</button>',
      '',
      '<!-- or visually hidden text, which survives translation better -->',
      '<button onclick="close()">',
      '  <svg aria-hidden="true">…</svg>',
      '  <span class="sr-only">Close</span>',
      '</button>'
    ),
    explanation:
      'An icon-only control needs an accessible name or it is announced as an unlabelled button, which tells the user nothing. `aria-label` is the quickest fix. Visually hidden text is often better: it is picked up by page translation tools, it survives a stylesheet failure, and it shows up in text search. Either way mark the decorative `<svg>` with `aria-hidden="true"` so its contents are not announced alongside the name. The same rule covers icon-only links, which additionally need to say where they go, not what they look like.',
  },

  {
    slug: 'a11y-form-error-association',
    title: 'Announcing a validation error',
    category: 'a11y',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A field shows a red "Email is required" message below it. Screen reader users hear the label and nothing else.',
      '',
      'Name the two attributes that connect the error to the input and mark the field as invalid.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['aria-describedby', 'describedby'],
          missingFeedback: 'Which attribute points the input at the error text?',
        },
        {
          synonyms: ['aria-invalid', 'invalid'],
          missingFeedback: 'Which attribute marks the field itself as invalid?',
        },
      ],
      hints: [
        'One attribute references the id of the message element.',
        'The other is a boolean state on the input.',
        '`aria-describedby` and `aria-invalid`.',
      ],
    },
    canonicalAnswer:
      'aria-describedby on the input, pointing at the id of the error message, so the message is announced with the field. And aria-invalid="true" on the input so its invalid state is announced rather than only being conveyed by the red colour.',
    solution: code(
      'html',
      '<label for="email">Email</label>',
      '<input id="email" aria-invalid="true" aria-describedby="email-error" />',
      '<p id="email-error">Email is required</p>'
    ),
    explanation:
      'Without the association the message is just text floating near the field, and colour alone never conveys state to a screen reader user or to anyone with a colour vision deficiency. `aria-describedby` makes the message part of what is announced when the field takes focus, and `aria-invalid` conveys the state itself. Remove `aria-invalid` once the field is corrected, or it lies. For a whole-form summary on submit, moving focus to a list of errors at the top gives a keyboard user somewhere to start.',
  },

  {
    slug: 'a11y-skip-link',
    title: 'Past the navigation, every time',
    category: 'a11y',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A keyboard user has to Tab through forty navigation links on every page before reaching the article.',
      '',
      'Name the conventional solution.'
    ),
    graderConfig: {
      accept: ['skip link', 'skip links', 'skip to content', 'skip navigation', 'skip nav'],
      acceptPatterns: ['skip\\s*(to|nav|link|main|content)'],
      closeSubstrings: {
        landmark:
          'Landmarks help screen reader users jump around, but a sighted keyboard user needs something focusable.',
        tabindex: 'Managing tabindex on the nav is not the conventional fix, and it hides content.',
      },
      hints: [
        'It is the first focusable thing on the page and usually invisible until focused.',
        'It jumps focus to the main content.',
        'A skip link.',
      ],
    },
    canonicalAnswer: 'skip link',
    solution: code(
      'html',
      '<a href="#main" class="skip-link">Skip to main content</a>',
      '<nav>…</nav>',
      '<main id="main" tabindex="-1">…</main>'
    ),
    explanation:
      'A skip link is the first focusable element on the page, visually hidden until it takes focus, and it jumps straight to the main content. It is a small thing that saves a keyboard user forty keystrokes on every single page load. Two details make it actually work: the target needs `tabindex="-1"` so focus can move to a non-interactive element, and the link must become visible on focus or a sighted keyboard user has no idea what just happened. Proper landmarks (`<nav>`, `<main>`) solve the same problem for screen reader users, who can jump by landmark.',
  },

  {
    slug: 'a11y-reduced-motion',
    title: 'Respecting a motion preference',
    category: 'a11y',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A parallax hero and several large slide transitions make some users feel genuinely unwell.',
      '',
      'Name the media query that lets you tone the animation down for them.'
    ),
    graderConfig: {
      accept: ['prefers-reduced-motion', 'reduced motion'],
      acceptPatterns: ['prefers-reduced-motion'],
      nearMisses: {
        'prefers-color-scheme': 'That one is about light and dark, not motion.',
      },
      hints: [
        'The operating system already has this setting; CSS can read it.',
        'It sits alongside `prefers-color-scheme` and `prefers-contrast`.',
        '`@media (prefers-reduced-motion: reduce)`',
      ],
    },
    canonicalAnswer: 'prefers-reduced-motion',
    solution: code(
      'css',
      '@media (prefers-reduced-motion: reduce) {',
      '  *,',
      '  *::before,',
      '  *::after {',
      '    animation-duration: 0.01ms !important;',
      '    animation-iteration-count: 1 !important;',
      '    transition-duration: 0.01ms !important;',
      '    scroll-behavior: auto !important;',
      '  }',
      '}'
    ),
    explanation:
      'Vestibular disorders are common, and large parallax or sliding motion can cause real nausea and dizziness, not mild annoyance. The OS setting already exists on every major platform, so the work is only to respect it. Reduce rather than remove: a fade or an instant change still communicates that something happened, whereas removing all feedback can make an interface feel broken. `window.matchMedia("(prefers-reduced-motion: reduce)")` gives you the same signal in JavaScript for animation driven from code.',
  },
];
