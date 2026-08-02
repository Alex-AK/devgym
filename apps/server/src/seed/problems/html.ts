import { code, md, type ProblemDraft } from './types';

export const htmlProblems: ProblemDraft[] = [
  {
    slug: 'html-main-landmark',
    title: 'The landmark list is empty',
    category: 'html',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Every region of this page is a div with a helpful class name:',
      '',
      code(
        'html',
        '<div class="header">…</div>',
        '<div class="nav">…</div>',
        '<div class="content">…</div>',
        '<div class="footer">…</div>'
      ),
      '',
      'A screen reader user opens the landmark list and it is empty, so there is no way to jump past the navigation.',
      '',
      'Name the element that should replace `<div class="content">`.'
    ),
    graderConfig: {
      accept: ['main', '<main>', 'main element', 'the main element'],
      acceptPatterns: ['<\\s*main\\s*>', '\\bmain\\b'],
      nearMisses: {
        article:
          'article marks a self-contained piece of content, and a page can hold many of them. This wrapper is the one primary region.',
        section:
          'A section is only a landmark once it has an accessible name, and even then it is a generic region rather than the primary one.',
        body: 'The body is the whole document, including the navigation you are trying to skip.',
      },
      hints: [
        'The landmark list is built from elements. Class names are invisible to it.',
        'Each of those four divs has a matching element. You want the one a skip link points at.',
        '`<main>`',
      ],
    },
    canonicalAnswer: 'main',
    solution: code(
      'html',
      '<header>…</header>',
      '<nav>…</nav>',
      '<main>…</main>',
      '<footer>…</footer>'
    ),
    explanation: md(
      'Landmarks come from elements, and class names contribute nothing. `<main>` is the primary content landmark and there is one per page, which is why skip links target it. `<nav>` is the navigation landmark, and you can have several as long as each has its own name.',
      '',
      '`<header>` and `<footer>` are the pair with a condition attached: they only map to the page-level banner and contentinfo landmarks when they are not nested inside `<article>`, `<aside>`, `<nav>`, `<section>` or `<main>`. A `<header>` inside a card is a section header, not the site banner. `<aside>` maps to complementary with no condition attached. `<section>` is the one that needs a name: without an accessible name it maps to generic and is not a landmark at all.'
    ),
  },

  {
    slug: 'html-button-type-default',
    title: 'The Cancel button reloads the page',
    category: 'html',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Clicking Cancel reloads the page and loses everything the user typed:',
      '',
      code(
        'html',
        '<form action="/orders" method="post">',
        '  …',
        '  <button onclick="closeDialog()">Cancel</button>',
        '  <button>Place order</button>',
        '</form>'
      ),
      '',
      'Write the attribute the Cancel button is missing.'
    ),
    graderConfig: {
      accept: ['type="button"', 'type=button', 'type button'],
      acceptPatterns: ['type\\W*button'],
      nearMisses: {
        'type="submit"':
          'That is already what it does. Being the default submit button is the whole bug.',
        'type="reset"': 'reset wipes every field in the form, which is not what Cancel means here.',
      },
      closeSubstrings: {
        preventdefault:
          'A handler that calls preventDefault does stop it, but one attribute in the markup is the real fix.',
        formnovalidate:
          'formnovalidate skips validation and still submits. The button should not submit at all.',
      },
      hints: [
        'The Cancel button never said what kind of button it is.',
        'A `<button>` inside a form submits by default. `type` has three values.',
        '`type="button"`',
      ],
    },
    canonicalAnswer: 'type="button"',
    solution: code(
      'html',
      '<button type="button" onclick="closeDialog()">Cancel</button>',
      '<button type="submit">Place order</button>'
    ),
    explanation: md(
      '`submit` is the default when `type` is absent, empty or invalid on a button associated with a form, so every unlabelled button in a form is a submit button. That is also why pressing Enter in a text field triggers the first submit button in the form, which is often the Cancel you meant to be inert.',
      '',
      'Write `type` on every `<button>` and the class of bug disappears. It bites hardest in React, where a Cancel button inside a `<form>` submits, the page reloads, and the state you were debugging is gone before you see it. `type="reset"` exists too, and it clears the form rather than closing anything.'
    ),
  },

  {
    slug: 'html-fieldset-legend',
    title: 'Three options, no question',
    category: 'html',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'Each radio has its own label, but nothing in the markup says what the three of them are asking:',
      '',
      code(
        'html',
        '<input type="radio" id="std" name="shipping" />',
        '<label for="std">Standard</label>',
        '<input type="radio" id="exp" name="shipping" />',
        '<label for="exp">Express</label>',
        '<input type="radio" id="ovn" name="shipping" />',
        '<label for="ovn">Overnight</label>'
      ),
      '',
      'Name the two elements that give the group a label of its own.'
    ),
    graderConfig: {
      accept: ['fieldset and legend', 'fieldset, legend', '<fieldset> and <legend>'],
      acceptPatterns: ['fieldset[\\s\\S]*legend', 'legend[\\s\\S]*fieldset'],
      nearMisses: {
        fieldset: 'Half of it. The fieldset groups the controls; something inside it names them.',
        legend: 'Half of it. The legend is the caption, but it has to sit inside something.',
        label: 'A label names one control. The group needs a label of its own.',
      },
      closeSubstrings: {
        'aria-label':
          'role="group" plus aria-label does the same job, but two plain HTML elements already exist for it.',
        radiogroup:
          'role="radiogroup" is the ARIA route. There is a pair of HTML elements that gets you there without it.',
      },
      hints: [
        'The individual labels are fine. What is missing is a caption for the set.',
        'One element wraps the group; the other, as its first child, names it.',
        '`<fieldset>` with a `<legend>` as its first child.',
      ],
    },
    canonicalAnswer: 'fieldset and legend',
    solution: code(
      'html',
      '<fieldset>',
      '  <legend>Shipping speed</legend>',
      '',
      '  <input type="radio" id="std" name="shipping" />',
      '  <label for="std">Standard</label>',
      '  …',
      '</fieldset>'
    ),
    explanation: md(
      'The legend is announced along with each control inside the fieldset, so the user hears the question and the option together rather than "Standard, radio button" with no idea what is being chosen. Nothing else in HTML provides a group label like that: a `<label>` names exactly one control.',
      '',
      'Two details worth keeping. The legend has to be the first `<legend>` nested in the fieldset, and `disabled` on the fieldset disables every control inside it, which is the cheapest way to freeze a whole form section while a request is in flight. Controls inside the legend itself stay enabled.'
    ),
  },

  {
    slug: 'html-details-summary',
    title: 'Forty lines for an FAQ',
    category: 'html',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'An FAQ list is forty lines of JavaScript: a click handler per question, an `aria-expanded` to keep in sync, and a class that toggles `display`.',
      '',
      'Name the two elements that do the whole thing with no JavaScript at all.'
    ),
    graderConfig: {
      accept: ['details and summary', 'details, summary', '<details> and <summary>'],
      acceptPatterns: ['details[\\s\\S]*summary', 'summary[\\s\\S]*details'],
      nearMisses: {
        details: 'Half of it. `<details>` holds the content; something inside it is the label.',
        summary: 'Half of it. `<summary>` is the label, and it needs a parent to disclose.',
        dialog: 'A dialog is a modal or a popup layered over the page, not an inline disclosure.',
      },
      closeSubstrings: {
        accordion: 'That is the pattern. HTML has a pair of elements that implements it.',
        popover:
          'The popover attribute layers content over the page. A disclosure expands in place.',
      },
      hints: [
        'HTML has a disclosure widget built in.',
        'One element wraps everything; its first child is the always-visible label you click.',
        '`<details>` with a `<summary>` as its first child.',
      ],
    },
    canonicalAnswer: 'details and summary',
    solution: code(
      'html',
      '<details name="faq">',
      '  <summary>Can I change my plan later?</summary>',
      '  <p>Yes, from Billing. The change applies at the next renewal.</p>',
      '</details>',
      '',
      '<details name="faq">',
      '  <summary>Do you offer refunds?</summary>',
      '  <p>Within 30 days, in full.</p>',
      '</details>'
    ),
    explanation: md(
      'The browser owns the open and closed state, the expanded state it reports to assistive technology, and the keyboard handling. You get the `open` attribute to set the initial state, and a `toggle` event if you need to react to a change. `open` is boolean, so `open="false"` still means open.',
      '',
      'The `name` attribute groups several `<details>` into an exclusive accordion where opening one closes the rest, still with no JavaScript: Chrome 120, Safari 17.2 and Firefox 130. The whole element has been available across browsers since January 2020, so the JavaScript version is rewriting something the platform already ships.'
    ),
  },

  {
    slug: 'html-list-semantics',
    title: 'A menu that announces nothing',
    category: 'html',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A sidebar menu:',
      '',
      code(
        'html',
        '<div class="menu">',
        '  <div class="item"><a href="/inbox">Inbox</a></div>',
        '  <div class="item"><a href="/sent">Sent</a></div>',
        '  <div class="item"><a href="/drafts">Drafts</a></div>',
        '</div>'
      ),
      '',
      'Rewrite it with `<ul>` and `<li>` and it sounds different out loud. Say what the listener now hears that they did not before.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['list'],
          missingFeedback: 'What does the screen reader now call the container?',
        },
        {
          synonyms: [
            'how many',
            'number of items',
            'item count',
            'count',
            '3 items',
            'three items',
            'how long',
            'the size',
          ],
          missingFeedback: 'What number does it announce that a stack of divs cannot supply?',
        },
      ],
      hints: [
        'The divs carry no meaning, so the container is announced as nothing at all.',
        'A real list tells the listener two things at once: what it is, and how big it is.',
        'Something like "list, 3 items", before any of the links are read.',
      ],
    },
    canonicalAnswer:
      'The container is announced as a list, and the browser reports how many items are in it, so the user hears something like "list, 3 items" before any link is read and knows the size of the menu up front. The stack of divs announces nothing: three links in a row with no boundary and no count.',
    solution: code(
      'html',
      '<ul class="menu">',
      '  <li><a href="/inbox">Inbox</a></li>',
      '  <li><a href="/sent">Sent</a></li>',
      '  <li><a href="/drafts">Drafts</a></li>',
      '</ul>'
    ),
    explanation: md(
      'The count comes from the browser, not from you, so it stays right when items are added or filtered. That is the thing a div can never do: you would have to compute it, write it somewhere and keep it in sync.',
      '',
      'Pick the list by meaning. `<ol>` when the order is part of the content (steps, rankings) and the numbers come from the browser, so you never hardcode "1." into the text. `<dl>` for name and value pairs, `<dt>` term and `<dd>` description, which is what a metadata panel actually is rather than a two-column table. One trap: Safari drops list semantics when a list is styled with `list-style: none`, so a visually unstyled `<ul>` there needs `role="list"` put back on it.'
    ),
  },

  {
    slug: 'html-section-vs-article-vs-div',
    title: 'Section, article, or just a div',
    category: 'html',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A blog index renders each card like this, and review asks whether it should be `<article>` instead:',
      '',
      code(
        'html',
        '<section class="card">',
        '  <h3>Keyset pagination</h3>',
        '  <p>Published 14 March. 6 min read.</p>',
        '</section>'
      ),
      '',
      'Say which element each card should be, and what a `<section>` needs before it means anything more than a `<div>` does.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['article'],
          missingFeedback: 'Which element marks content that stands on its own?',
        },
        {
          synonyms: [
            'accessible name',
            'aria-label',
            'needs a name',
            'has a name',
            'given a name',
            'named',
          ],
          missingFeedback: 'What does a `<section>` need before it becomes a region landmark?',
        },
        {
          synonyms: ['div', 'styling wrapper', 'no semantics'],
          missingFeedback: 'What is an unnamed `<section>` equivalent to?',
        },
      ],
      hints: [
        'One of these three is for content that would still make sense pulled out and shown somewhere else.',
        'A `<section>` maps to a region landmark only when it has an accessible name. A heading inside it does not supply one.',
        'These cards are `<article>`. Name a `<section>` with `aria-labelledby`, or use a `<div>`.',
      ],
    },
    canonicalAnswer:
      'Each card should be an article: it is self-contained and would still make sense pulled out of this list, which is what article means. A section only becomes a region landmark once it has an accessible name, from aria-labelledby pointing at its heading or an aria-label, and a heading inside it does not give it one. Without a name a section exposes nothing a div does not, so if the element only exists to hang styles on, use a div.',
    solution: code(
      'html',
      '<article class="card">',
      '  <h3>Keyset pagination</h3>',
      '  <p>Published 14 March. 6 min read.</p>',
      '</article>',
      '',
      '<!-- a section worth writing: it has a name, so it is a landmark -->',
      '<section aria-labelledby="drafts-heading">',
      '  <h2 id="drafts-heading">Drafts</h2>',
      '  …',
      '</section>'
    ),
    explanation: md(
      '`<article>` means self-contained: a blog post, a comment, a product card, anything that survives being syndicated on its own. Nesting one inside another is meaningful too, which is how a comment sits inside the post it replies to.',
      '',
      '`<section>` maps to the region role only when it has an accessible name, and otherwise to generic. The name comes from `aria-labelledby`, `aria-label` or `title`, never from a heading child, which is the part almost everyone gets wrong. So an unnamed `<section>` is a `<div>` that reads as more deliberate than it is. Name it or use a div, and let the heading do the work of telling a reader what the block is.'
    ),
  },

  {
    slug: 'html-anchor-vs-button',
    title: 'The button that should have been a link',
    category: 'html',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'This works when clicked, and support keeps getting asked why the invoice cannot be opened in a second tab:',
      '',
      code('html', '<button onclick="location.href = \'/invoices/42\'">View invoice</button>'),
      '',
      'Name three things a real `<a href="/invoices/42">` gives you that this does not.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['new tab', 'new window', 'middle-click', 'middle click', 'cmd', 'ctrl'],
          missingFeedback: 'How does a user open it in a second tab without leaving this one?',
        },
        {
          synonyms: ['context menu', 'right-click', 'right click', 'copy link', 'bookmark'],
          missingFeedback: 'What does right-clicking offer on a link that a button cannot offer?',
        },
        {
          synonyms: ['enter', 'space'],
          missingFeedback: 'Which keys activate each of the two, and where do they differ?',
        },
      ],
      hints: [
        'The complaint is about what browsers do with a URL, and this markup contains no URL.',
        'Think about middle-click, Cmd-click, and what the right-click menu offers on a link.',
        'A link opens in a new tab on middle or Cmd click, gives you copy link address and bookmark, and is activated by Enter. A button answers to Enter and Space and has none of the URL behaviour.',
      ],
    },
    canonicalAnswer:
      'A real link can be middle-clicked or Cmd-clicked to open in a new tab, which is exactly what people are asking for here. Right-clicking a link gives the browser context menu: copy link address, open in a new window, bookmark it. And the keyboard contract differs: a link is activated by Enter alone, while a button responds to Enter and Space, so swapping one element for the other silently changes which keys work.',
    solution: code(
      'html',
      '<a href="/invoices/42">View invoice</a>',
      '',
      '<!-- a button is right when nothing navigates -->',
      '<button type="button" onclick="archive(42)">Archive</button>'
    ),
    explanation: md(
      'The rule is behaviour, not appearance: if it takes you to a URL, it is a link, and if it changes something in place, it is a button. A link styled to look like a button is fine. A button that navigates is not, because the browser can only offer new tab, copy, bookmark, drag to the bookmarks bar and the destination preview in the status bar when a real `href` exists.',
      '',
      '`href="#"` and `href="javascript:void(0)"` fail the same way from the other direction: they claim to be links and have nowhere to go. And the keyboard difference is real, not pedantic. Space scrolls the page on a focused link and activates a focused button, so users who swapped elements get the wrong result from the key they always press.'
    ),
  },

  {
    slug: 'html-dialog-showmodal',
    title: 'The dialog that does not block',
    category: 'html',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A confirm dialog opens, but the page behind it still takes clicks and Escape does nothing:',
      '',
      code(
        'html',
        '<dialog id="confirm">…</dialog>',
        '',
        '<script>',
        "  document.querySelector('#confirm').show();",
        '</script>'
      ),
      '',
      'Name the method to call instead, and two things it changes.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['showmodal'],
          missingFeedback: 'Which method opens it as a modal?',
        },
        {
          synonyms: [
            'inert',
            'top layer',
            'backdrop',
            'blocks',
            'unclickable',
            'not clickable',
            'cannot click',
          ],
          missingFeedback: 'What happens to the content behind it?',
        },
        {
          synonyms: ['escape', 'esc key', 'esc closes'],
          missingFeedback: 'Which key closes it once it is modal?',
        },
      ],
      hints: [
        'The element is right. The method is not.',
        '`show()` opens a non-modal dialog: the page behind stays live and no key is wired up to close it.',
        '`showModal()`. Top layer, inert background, a stylable `::backdrop`, and Escape closes it.',
      ],
    },
    canonicalAnswer:
      'Call showModal() instead of show(). It puts the dialog in the top layer, above everything else regardless of z-index, and makes the rest of the page inert so clicks and Tab cannot reach it. It also renders a ::backdrop you can style, and Escape closes it, which show() never does.',
    solution: code(
      'html',
      '<dialog id="confirm">',
      '  <form method="dialog">',
      '    <p>Delete this invoice?</p>',
      '    <button value="cancel">Cancel</button>',
      '    <button value="delete" autofocus>Delete</button>',
      '  </form>',
      '</dialog>',
      '',
      '<script>',
      "  const dialog = document.querySelector('#confirm');",
      '  dialog.showModal();',
      "  dialog.addEventListener('close', () => report(dialog.returnValue));",
      '</script>'
    ),
    explanation: md(
      '`show()` and `showModal()` are two different widgets from one element. Non-modal leaves the page interactive, has no backdrop and ignores Escape; modal takes the top layer, makes everything outside it inert, paints a `::backdrop`, and closes on Escape.',
      '',
      'Focus comes with it. `showModal()` moves focus to the first focusable element inside, or to whatever carries `autofocus`, and returns focus to the opener on close. A `<form method="dialog">` closes the dialog without submitting anything and sets `returnValue` from the button that was pressed, which is how you get a confirm flow with no state to manage.'
    ),
  },

  {
    slug: 'html-table-caption-scope',
    title: 'The table that reads as loose numbers',
    category: 'html',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A report renders correctly and reads aloud as "Acme, 12, 4300, 2", with no way to tell which number is which:',
      '',
      code(
        'html',
        '<table>',
        '  <tr>',
        '    <td>Customer</td><td>Orders</td><td>Revenue</td><td>Returns</td>',
        '  </tr>',
        '  <tr>',
        '    <td>Acme</td><td>12</td><td>4300</td><td>2</td>',
        '  </tr>',
        '</table>'
      ),
      '',
      'Name what is missing from this markup, and what the table gains from each piece.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['<th', 'th>', 'th element', 'header cell', 'header row'],
          missingFeedback: 'Which element is the first row using, and which should it use?',
        },
        {
          synonyms: ['scope'],
          missingFeedback: 'Which attribute says whether a header heads its row or its column?',
        },
        {
          synonyms: ['caption'],
          missingFeedback: 'What gives the table itself a name?',
        },
      ],
      hints: [
        'Every cell in this table is a plain data cell, including the four in the first row.',
        'Header cells have their own element, plus an attribute saying which direction they head.',
        '`<th scope="col">` for the header row, and a `<caption>` as the table\'s first child.',
      ],
    },
    canonicalAnswer:
      'The header row is marked up with td instead of th, so nothing in this table is a header. Use th with scope="col" on the first row: scope is what lets a screen reader announce the header alongside each cell, so the user hears "Orders, 12" rather than "12". And there is no caption, so the table has no name of its own and cannot be identified when the user lists the tables on the page.',
    solution: code(
      'html',
      '<table>',
      '  <caption>Revenue by customer, Q1</caption>',
      '  <thead>',
      '    <tr>',
      '      <th scope="col">Customer</th>',
      '      <th scope="col">Orders</th>',
      '      <th scope="col">Revenue</th>',
      '      <th scope="col">Returns</th>',
      '    </tr>',
      '  </thead>',
      '  <tbody>',
      '    <tr>',
      '      <th scope="row">Acme</th>',
      '      <td>12</td><td>4300</td><td>2</td>',
      '    </tr>',
      '  </tbody>',
      '</table>'
    ),
    explanation: md(
      'A data table gives you cell-by-cell navigation, and the header announced with each cell as you move, which is the whole reason to reach for one. `scope` takes `col`, `row`, `colgroup` and `rowgroup`. Simple tables let assistive tech infer it, but not all of them infer it correctly, so writing it costs nothing and removes the guess.',
      '',
      '`<caption>` becomes the accessible name of the table and has to be its first child. This is also the answer to "should this be a grid of divs": a div grid with `display: grid` looks identical and offers none of it, so the moment the content is genuinely tabular, a `<table>` is the cheaper option. Only reach for `role="presentation"` when the table really is layout.'
    ),
  },

  {
    slug: 'html-inputmode-keyboard',
    title: 'The phone keyboard for a six-digit code',
    category: 'html',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A verification code field brings up the full alphabetic keyboard on a phone. Switching it to `type="number"` fixes the keyboard but adds spinner arrows, and a pasted `007` loses its leading zeros.',
      '',
      code('html', '<input name="code" type="text" maxlength="6" />'),
      '',
      'Name the attribute that changes the on-screen keyboard without touching how the value is parsed or validated.'
    ),
    graderConfig: {
      accept: ['inputmode', 'inputmode="numeric"', 'inputmode=numeric', 'input mode'],
      acceptPatterns: ['inputmode', 'input\\s+mode'],
      nearMisses: {
        'type="tel"':
          'A tel field does show a keypad, but it changes the type of the field as well. The question asks for the attribute that only hints at the keyboard.',
        pattern: 'pattern constrains what counts as valid. It has no say in which keyboard opens.',
        autocomplete:
          'autocomplete tells the browser what the field holds so it can fill it in. The keyboard is a different attribute.',
      },
      hints: [
        'The problem with `type="number"` is that it changes value handling as well as the keyboard.',
        'There is a global attribute that hints at the virtual keyboard and does nothing else.',
        '`inputmode="numeric"`',
      ],
    },
    canonicalAnswer: 'inputmode',
    solution: code(
      'html',
      '<input name="code" type="text" inputmode="numeric" maxlength="6" />',
      '',
      '<!-- other keyboards worth knowing -->',
      '<input type="email" />                       <!-- adds @ -->',
      '<input type="url" />                         <!-- prominent / -->',
      '<input type="text" inputmode="decimal" />    <!-- digits and a separator -->'
    ),
    explanation: md(
      'The values are `none`, `text`, `decimal`, `numeric`, `tel`, `search`, `email` and `url`, and none of them enforce anything: `inputmode` is a hint to the keyboard and imposes no validity requirement. That is the point here. `type` is where validation lives, so you pick `type` for the data and `inputmode` for the thumbs.',
      '',
      '`type="number"` is for quantities you would sensibly increment. A verification code, a card number and a postcode are digit strings, not numbers, and treating them as numbers gets you spinners, scroll-wheel edits, lost leading zeros and, in some browsers, a value that comes back empty when the user types something non-numeric. `type="text"` plus `inputmode="numeric"` is the pattern for all three.'
    ),
  },

  {
    slug: 'html-time-datetime',
    title: '"2 days ago" is not a date',
    category: 'html',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A comment renders its timestamp as friendly text, and that string is the only version of the date the page contains:',
      '',
      code('html', '<span class="ago">2 days ago</span>'),
      '',
      'Name the element and the attribute that keep the friendly text and add the exact moment in a form a machine can read.'
    ),
    graderConfig: {
      accept: ['time and datetime', 'time datetime', 'the time element with a datetime attribute'],
      acceptPatterns: ['\\btime\\b[\\s\\S]*datetime', 'datetime[\\s\\S]*\\btime\\b'],
      nearMisses: {
        title: 'A title tooltip appears on hover and gives a parser nothing.',
        'aria-label':
          'aria-label changes what is announced. The machine-readable value is a plain HTML attribute.',
      },
      closeSubstrings: {
        datetime: 'The attribute on its own. Which element is it written on?',
        time: 'The element on its own. Which attribute carries the machine-readable value?',
      },
      hints: [
        'The visible text should stay "2 days ago". Something else has to carry the exact instant.',
        'There is a dedicated element for a date or a time, with one attribute holding the ISO value.',
        '`<time datetime="2026-03-14">2 days ago</time>`',
      ],
    },
    canonicalAnswer: 'the time element with a datetime attribute',
    solution: code(
      'html',
      '<time datetime="2026-03-14T09:30Z">2 days ago</time>',
      '',
      '<!-- datetime also takes a month, a week or a duration -->',
      '<time datetime="2026-03">March 2026</time>',
      '<time datetime="PT2H30M">two and a half hours</time>'
    ),
    explanation: md(
      'Without `datetime`, "2 days ago" is the only value on the page, and it is wrong the moment the page is cached, scraped or read a week later. The attribute takes a fixed set of forms, `YYYY-MM`, `YYYY-MM-DD`, `HH:MM`, a full local or global date and time, a week, or a duration like `PT2H30M`, and that is what search engines, structured data and your own scripts parse.',
      '',
      'Be honest about what it does not do. Screen readers read the element text, not the attribute, so `<time>` is not an accessibility fix and does not excuse a relative string nobody can pin down. If the exact date matters to a reader, show it, or put it in a `title` as well as the `datetime`.'
    ),
  },

  {
    slug: 'html-em-vs-i',
    title: 'Italic is not emphasis',
    category: 'html',
    difficulty: 'medium',
    relevance: 'foundational',
    type: 'explain',
    prompt: md(
      'A style guide says species names are italic and run-in labels are bold, so a component reaches for the elements that produce those looks:',
      '',
      code(
        'html',
        '<p><em>Homo sapiens</em> emerged in Africa.</p>',
        '<p><strong>Ingredients:</strong> flour, water, salt.</p>'
      ),
      '',
      'Say what `<em>` and `<strong>` claim about the text, and which elements these two should be instead.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['stress', 'emphasis', 'emphasise', 'emphasize', 'said louder', 'tone'],
          missingFeedback: 'What does `<em>` claim, beyond looking italic?',
        },
        {
          synonyms: ['importance', 'important', 'serious', 'urgen'],
          missingFeedback: 'What does `<strong>` claim, beyond looking bold?',
        },
        {
          synonyms: ['<i>', 'i element', 'i and b', '<b>', 'b element'],
          missingFeedback: 'Which elements carry the look without claiming either of those?',
        },
      ],
      hints: [
        'Both of these elements mean something about the sentence, not about the font.',
        'One means the word you would say louder; the other means this matters.',
        'Neither applies here, so use `<i>` for the species name and `<b>` for the run-in label.',
      ],
    },
    canonicalAnswer:
      'em marks stress emphasis, the word you would say louder if you read the sentence out, and strong marks importance, seriousness or urgency. Neither is happening here. A species name is set apart from the surrounding prose by convention, not emphasised, so it is <i>, with a lang attribute where the phrase is genuinely foreign. "Ingredients:" is a run-in label, so <b> if it has to be bold. Both of those mark text as set apart without claiming emphasis or importance.',
    solution: code(
      'html',
      '<p><i>Homo sapiens</i> emerged in Africa.</p>',
      '<p><b>Ingredients:</b> flour, water, salt.</p>',
      '',
      '<!-- what em and strong are actually for -->',
      '<p>I said <em>tomorrow</em>, not today.</p>',
      '<p><strong>Do not</strong> run this against production.</p>'
    ),
    explanation: md(
      '`<em>` changes what the sentence means: "I said *tomorrow*" and "*I* said tomorrow" are different claims. `<strong>` says this part matters more than what surrounds it. Both are about the content, and both nest, so `<em><em>` is stronger emphasis still.',
      '',
      '`<i>` and `<b>` are not "the non-semantic ones", which is the usual shorthand and is wrong. `<i>` marks text set apart for a reason that has no element of its own: a taxonomic name, a term being introduced, an idiom in another language (pair it with `lang`), a thought. `<b>` draws attention with no extra importance: a keyword in a summary, a product name, a run-in label. Reach for them after checking that a heading, `<em>`, `<strong>` or `<mark>` is not the honest answer.'
    ),
  },

  {
    slug: 'html-heading-outline-myth',
    title: 'The h1 that never got demoted',
    category: 'html',
    difficulty: 'hard',
    relevance: 'foundational',
    type: 'explain',
    prompt: md(
      'A component library gives every card an `<h1>`, on the theory that nesting inside `<section>` demotes it:',
      '',
      code(
        'html',
        '<section>',
        '  <h1>Billing</h1>',
        '  <section>',
        '    <h1>Payment method</h1>',
        '  </section>',
        '</section>'
      ),
      '',
      'Say what the accessibility tree actually reports for those two headings, and what you have to do instead.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['level 1', 'level one', 'both h1', 'two h1', 'still h1', 'both are h1'],
          missingFeedback: 'What level does each of those two headings end up at?',
        },
        {
          synonyms: [
            'outline algorithm',
            'outlining algorithm',
            'never implemented',
            'no browser implements',
            'removed from the spec',
            'was removed',
          ],
          missingFeedback:
            'Where did the idea that nesting demotes a heading come from, and what became of it?',
        },
        {
          synonyms: [
            'h2',
            'set the level',
            'choose the level',
            'pick the level',
            'yourself',
            'by hand',
          ],
          missingFeedback: 'So what actually decides the level of a heading?',
        },
      ],
      hints: [
        'Nesting does not change the heading. Ask what the browser really does with it.',
        'The outlining algorithm that would have demoted a nested h1 was never implemented by a single browser, and the spec dropped it in 2022.',
        'Both headings are level 1. Pick the levels by hand, h1 then h2 then h3, and set the size in CSS.',
      ],
    },
    canonicalAnswer:
      'Both are level 1 headings. Nesting changes nothing: the outline algorithm that would have demoted them was never implemented by any browser and was removed from the HTML spec in 2022, so the accessibility tree reports two h1s and a screen reader user hears two top-level headings with no hierarchy between them. You have to set the level yourself, h1 for the page, h2 for Billing, h3 for Payment method, and control the size in CSS.',
    solution: code(
      'html',
      '<section aria-labelledby="billing">',
      '  <h2 id="billing">Billing</h2>',
      '  <section aria-labelledby="payment">',
      '    <h3 id="payment">Payment method</h3>',
      '  </section>',
      '</section>'
    ),
    explanation: md(
      'The outlining algorithm was a real part of the HTML spec and no browser ever shipped it. It was removed in 2022, which means a nested `<h1>` has always been a level 1 heading everywhere it mattered: in the accessibility tree, in the headings list a screen reader user navigates by, and in every tool that reads structure.',
      '',
      'What kept the myth alive was a default style. Browsers shrank an `<h1>` inside `<section>`, `<article>`, `<aside>` or `<nav>` so it looked demoted, and the level underneath never changed. That rule was dropped from the standard in 2025 and browsers have been removing it since (Firefox 140, with a deprecation warning in Chrome 136), so a nested `<h1>` now looks as big as it always was semantically. The practical consequence for a reusable component is awkward and unavoidable: a card that can appear at any depth has to take its heading level as a prop, because nothing works it out for you.'
    ),
  },

  {
    slug: 'html-output-progress-meter',
    title: 'Three divs that already have elements',
    category: 'html',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'Three numbers on an order screen, all rendered as divs:',
      '',
      code(
        'html',
        '<div class="total">248.00</div>       <!-- recalculated as the user edits the order -->',
        '<div class="bar" style="width: 62%"></div>  <!-- 62% of an attachment uploaded -->',
        '<div class="disk">184 GB of 512 GB used</div>'
      ),
      '',
      'Name the element that belongs on each, and the implicit role that makes one of them announce its own updates.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['output'],
          missingFeedback: 'Which element is for a value calculated from other form controls?',
        },
        {
          synonyms: ['progress'],
          missingFeedback: 'Which element is for a task on its way to done?',
        },
        {
          synonyms: ['meter'],
          missingFeedback: 'Which element is for a measurement inside a known range?',
        },
        {
          synonyms: ['status', 'live region', 'aria-live'],
          missingFeedback: 'What is the implicit role of the one that announces its own changes?',
        },
      ],
      hints: [
        'Three different elements. The difference between two of them is a task versus a measurement.',
        '`<progress>` is work advancing towards done. `<meter>` is a gauge: a value inside a known range that is not going anywhere.',
        '`<output>` for the total, whose implicit role is `status`, `<progress>` for the upload, `<meter>` for disk usage.',
      ],
    },
    canonicalAnswer:
      'The recalculated total is an output: it is the result of a calculation over other form controls, its implicit role is status, and browsers treat it as a live region, so a new total is announced without focus having to move. The upload bar is a progress, which represents how much of a task is finished. Disk usage is a meter: a measurement inside a known range, not a task advancing towards completion.',
    solution: code(
      'html',
      '<output name="total" for="qty price">248.00</output>',
      '',
      '<progress id="upload" max="100" value="62">62%</progress>',
      '',
      '<meter id="disk" min="0" max="512" low="256" high="448" value="184">',
      '  184 GB of 512 GB',
      '</meter>'
    ),
    explanation: md(
      'The `<progress>` and `<meter>` split is the one people get wrong: progress is a task heading for completion, so its minimum is always 0 and dropping `value` makes it indeterminate, the "something is happening" bar. `<meter>` is a gauge with `min`, `max`, and `low`, `high` and `optimum` to say which part of the range is good, so it suits disk usage, a battery or a score. A meter used as a progress bar is the classic mix-up.',
      '',
      '`<output>` is the quiet win. Its implicit role is `status`, which browsers implement as a live region, so a recalculated total is announced without you writing a single `aria-live` attribute. Its `for` attribute lists the ids of the inputs that fed the calculation. One thing to know: an `<output>` value is never submitted with the form, so if the server needs the number, send it another way.'
    ),
  },
];
