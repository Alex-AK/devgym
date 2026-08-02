---
title: What the platform gives you free
question: Which of these components am I about to install a library for, and does the browser already have it?
order: 6
practise:
  - html-details-summary
  - html-dialog-showmodal
  - html-output-progress-meter
  - html-inputmode-keyboard
  - html-fieldset-legend
sources:
  - author: MDN
    title: The details disclosure element
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details
  - author: MDN
    title: The details-content pseudo-element
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::details-content
  - author: web.dev
    title: Details and summary
    url: https://web.dev/learn/html/details
  - author: MDN
    title: The dialog element
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
  - author: MDN
    title: The popover global attribute
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/popover
  - author: MDN
    title: anchor-name
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name
  - author: MDN
    title: The output element
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/output
  - author: MDN
    title: The progress indicator element
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress
  - author: MDN
    title: The meter element
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meter
  - author: MDN
    title: The webkit-progress-value pseudo-element
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::-webkit-progress-value
  - author: MDN
    title: The inputmode global attribute
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode
  - author: MDN
    title: The enterkeyhint global attribute
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/enterkeyhint
  - author: MDN
    title: The number input type
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/number
  - author: MDN
    title: The fieldset element
    url: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/fieldset
  - author: MDN
    title: Customizable select elements
    url: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select
  - author: W3C Web Accessibility Initiative
    title: Grouping controls
    url: https://www.w3.org/WAI/tutorials/forms/grouping/
verified: 2026-08-01
---

## The model

For a disclosure, a modal, a popover, a progress bar or a group label, the browser already ships the
behaviour: the open and closed state, the focus handling, the keyboard, and the entry in the
accessibility tree. What it does not always ship is the appearance. That is the honest split, and it
is the one to make before installing anything: take the behaviour, write the CSS, and pay for a
dependency only where the platform genuinely stops.

**`<details>` and `<summary>` for a disclosure or an FAQ.** The browser owns the open state, the
expanded state it reports to assistive technology, and the keyboard: focus the summary and press
Enter or the space bar. Give several of them the same `name` and opening one closes the rest, so an
exclusive accordion costs no script either. Available
across browsers since January 2020. It stops at animation: MDN says there is "no built-in way to
animate the transition between open and closed", and the fix, `::details-content` with
`transition-behavior: allow-discrete`, only became available across browsers in September 2025.

**`<dialog>` with `showModal()` for anything modal.** One method call gets you the top layer, above
everything whatever your z-index, the rest of the page inert so clicks and Tab cannot reach it, a
stylable `::backdrop`, and Escape to close. Focus moves into the dialog and returns to the opener
afterwards, which is the part hand-rolled modals get wrong; [focus](./focus.md) covers why. Put a
`<form method="dialog">` inside and its buttons close the dialog without submitting, setting
`returnValue` from whichever was pressed. Available across browsers since March 2022. Where it
stops is small: focus lands on the first focusable element inside, which is usually the close
button, so mark the control you actually meant with `autofocus`.

**The `popover` attribute for the non-modal case.** A menu, a hint bubble, a toast. `popovertarget`
on a button wires the toggle with no script, and the popover renders in the top layer, so an
ancestor's `overflow: hidden` cannot clip it and it takes no part in the z-index argument. An `auto`
popover is light-dismissed by a click outside or Esc; a `manual` one stays until something closes
it, and several can be open at once. Popovers are always non-modal, which is the line between this
and `<dialog>`. It is newer than the rest of this list: it has worked across the latest browser
versions since April 2024, so check it against your support floor rather than assuming. It stops at
position. The top layer puts the popover above the page, not beside the button that opened it, and
CSS anchor positioning is the platform's answer to that: `anchor-name` only reached the same
newly-available status in January 2026.

**`<output>`, `<progress>` and `<meter>` instead of three styled divs.** Three elements, three
different jobs:

- `<output>` — the result of a calculation over other controls. Its implicit role is `status`, and
  MDN notes that many browsers implement it as a live region, so a recalculated total is announced
  without focus moving. Its value is never submitted with the form.
- `<progress>` — a task on its way to done. The minimum is always 0 and `min` is not allowed.
  Leave `value` off and you get the indeterminate "something is happening" bar.
- `<meter>` — a measurement inside a known range: disk usage, a battery, a score. It takes `min`,
  `max`, and `low`, `high` and `optimum` to say which part of the range is the good part.

The split between the last two is the one that gets got wrong, and it is not cosmetic. One is going
somewhere and the other is not. All three stop at appearance: restyling the bars means non-standard
vendor pseudo-elements such as `::-webkit-progress-value`, which MDN labels "not part of any
standard".

**`inputmode` and `enterkeyhint` for the on-screen keyboard.** `inputmode` takes `none`, `text`,
`decimal`, `numeric`, `tel`, `search`, `email` and `url`, and changes which keyboard opens without
touching the field's type. `enterkeyhint` takes `enter`, `done`, `go`, `next`, `previous`, `search`
and `send`, and labels the enter key. Both have been available across browsers since late 2021 and
neither costs a byte of script. They stop at being hints. `inputmode` "doesn't cause any validity
requirements to be enforced", so validation stays with `type` and
[the validation the browser already does](./forms-the-browser-validates.md). Nothing visible happens
on a desktop with a hardware keyboard, which is most of why these two are almost never set.

**`<fieldset>` and `<legend>` for a group of radios.** A `<label>` names one control, so three
labelled radios still have nothing saying what the question is. A fieldset's implicit role is
`group`, and its first `<legend>` child is the caption for it. `disabled` on the fieldset disables
every control inside, which is the cheapest way to freeze a section of a form while a request is in
flight, and controls in the legend stay enabled. Two things stop it. Layout: a fieldset defaults to
`min-inline-size: min-content`, so it refuses to shrink inside a flex or grid container until you
override that, and the legend shrink-wraps and establishes its own formatting context. And
announcement varies, which the W3C forms tutorial is blunt about: screen readers read the legend
"either with every form element, once, or, rarely, not at all". Keep it short, and keep each label
self-explanatory on its own.

Three places where installing something is the right call rather than a failure of nerve. A styled
`<select>` with a custom drop-down: `appearance: base-select` exists for exactly that, and MDN says
it "is not Baseline because it does not work in some of the most widely-used browsers". A
`<details>` that animates open on a support floor older than late 2025. And popover placement that
flips and shifts to stay on screen, until anchor positioning is old enough for the people using
your app.

## Worked example

A confirm dialog and a hint bubble, one script call between them:

```html
<button popovertarget="tips">Formatting tips</button>
<div id="tips" popover>Markdown works here. Two spaces make a line break.</div>

<dialog id="confirm">
  <form method="dialog">
    <p>Delete this invoice?</p>
    <button value="cancel">Cancel</button>
    <button value="delete" autofocus>Delete</button>
  </form>
</dialog>

<script>
  const dialog = document.querySelector('#confirm');
  dialog.showModal();
  dialog.addEventListener('close', () => report(dialog.returnValue));
</script>
```

The popover needs no JavaScript at all: the button, the attribute and the id are the whole widget.
The dialog needs one call, and `showModal()` is where every behaviour in it lives.

Part of a checkout form, with no script at all:

```html
<fieldset>
  <legend>Shipping speed</legend>
  <input type="radio" id="std" name="shipping" checked />
  <label for="std">Standard</label>
  <input type="radio" id="ovn" name="shipping" />
  <label for="ovn">Overnight</label>
</fieldset>

<label for="qty">Quantity</label>
<input id="qty" type="number" min="1" value="2" />

<label for="code">Verification code</label>
<input id="code" type="text" inputmode="numeric" enterkeyhint="done" maxlength="6" />

<output name="total" for="qty">248.00</output>
<progress id="upload" max="100" value="62">62%</progress>
<meter id="disk" min="0" max="512" low="256" high="448" value="184">184 GB of 512 GB</meter>
```

Line by line: the radios are announced under the question instead of as three loose options, the
quantity gets a stepper because it is a quantity, the code gets a numeric keypad and a Done key
without a stepper because it is a digit string, and the total announces itself when it changes. The
bar and the gauge are deliberately different elements.
[Which element means this](./which-element-means-this.md) asks the same question about the rest of
the document.

## Traps

**The modal is open and the page behind it still takes clicks.** Escape does nothing either, and the
markup looks right. It was opened with `show()`, which is the non-modal dialog: no top layer, no
inert background, no backdrop, no Escape. `showModal()` is the one carrying the behaviour, and the
two calls look identical in a diff until someone clicks straight past your modal.

**A five-star rating rendered as a bar that never fills.** `<progress>` means a task heading for
completion, and a rating is not advancing towards anything. A value sitting inside a fixed range is
`<meter>`, which also gives you `low`, `high` and `optimum` so the browser can colour it. The swap
runs the other way too: a `<meter>` standing in for an upload bar gives up the indeterminate state
you get free from a `<progress>` with no `value`.

**The answer is in the FAQ and find-in-page walks straight past it.** It is inside a closed
`<details>`, and whether the browser searches in there depends on the browser. web.dev's Learn HTML
says a closed `<details>` containing a match expands to show it in Chrome and Edge, and that this
"is not replicated in Firefox or Safari". If the content has to be findable everywhere, ship that
one open, or put the searchable words in the summary.

**The verification code lost its leading zeros.** `type="number"` was the fix for the alphabetic
keyboard on mobile, and it brought the rest of its semantics along: stepper arrows, entries
invalidated automatically when they are not numbers, and a value read as a number. MDN is direct
about it, saying `number` "is not appropriate for values that happen to only consist of numbers but
aren't strictly speaking a number, such as postal codes in many countries or credit card numbers".
Keep `type="text"` and add `inputmode="numeric"`, which changes the keyboard and nothing else.
