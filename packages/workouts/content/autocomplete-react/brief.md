# Autocomplete that behaves itself

There is a working autocomplete in `src/client/Autocomplete.tsx`. It searches, it shows results, you
can click one. It is also fine to ship only if every user has a mouse, a fast connection and their
sight.

## The task

Four things, in `src/client/Autocomplete.tsx`.

**Wait for the typing to stop.** Right now every keystroke is a request. Wait `debounceMs` after the
last one before searching, and do not search at all for an empty box. The component is given
`debounceMs` as a prop; the checkpoints pass a short one.

**Call off the search nobody wants.** Type "bra", then "c" a moment later, and two searches are in
flight. They can land in either order, and if the older one lands second it wins. Pass an
`AbortSignal` to `searchProducts` and abort it when the query moves on. An aborted request rejects
with an `AbortError`, which is the expected outcome and not something to show the user.

**Make the keyboard work.** `ArrowDown` and `ArrowUp` move the highlight, `Enter` takes the
highlighted option, `Escape` closes the list without choosing anything. `Enter` with nothing
highlighted should not quietly pick the first result.

**Make it announceable.** The ARIA combobox pattern: `role="combobox"` on the input with
`aria-expanded` and `aria-controls`, `role="listbox"` on the list, `role="option"` on each result.
Focus never leaves the input, so `aria-activedescendant` is the only thing telling a screen reader
which option is highlighted, and each option needs an id for it to point at.

## Notes

`searchProducts(query, { signal })` is the API. It matches on name only, and it behaves like `fetch`
where it counts: abort the signal and the promise rejects rather than resolving with a result you no
longer want.

It also exposes `calls` and a `fixture` helper so the checkpoints can count requests and make one
answer arrive late. Real APIs have neither.

Searching "bra" finds the bracket and the brass hinge; "brac" finds only the bracket. That is how the
second checkpoint can tell whose answer is on screen.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- The list does not close when focus leaves it. Fix that, and notice why `onBlur` and `onClick` fight
  each other.
- Scroll the highlighted option into view when the list is longer than the box.
- Announce how many results came back through an `aria-live` region, and work out why announcing on
  every keystroke would be worse than saying nothing.
