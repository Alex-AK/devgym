# Autocomplete that behaves itself

There is a working autocomplete in `src/client/Autocomplete.tsx`. It searches, it shows results, you
can click one. Three things have come back about it.

- It calls the API on every keystroke, one request per character.
- Type quickly and the list sometimes settles on an older search than the one in the box.
- It cannot be used without a mouse. Arrow keys do nothing, and a screen reader gets an input with a
  pile of unlabelled buttons under it.

## The task

Four things, in `src/client/Autocomplete.tsx`.

**Search once the typing stops.** Wait `debounceMs` after the last keystroke before searching, and do
not search at all for an empty box. The component is given `debounceMs` as a prop; the checkpoints
pass a short one.

**Show the results for what is in the box.** Whatever order the answers come back in.

**Make the keyboard work.** `ArrowDown` and `ArrowUp` move the highlight, `Enter` takes the
highlighted option, `Escape` closes the list without choosing anything. `Enter` with nothing
highlighted should not quietly pick the first result.

**Make it announceable.** The ARIA combobox pattern: the input, the list and each result carry the
roles that pattern gives them, and a screen reader can tell which option is highlighted. Focus never
leaves the input.

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
