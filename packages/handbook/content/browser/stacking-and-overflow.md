---
title: Stacking, positioning and the box that will not scroll
question: My z-index is 9999 and it is still behind the header. Why?
order: 9
practise:
  - css-stacking-context
  - css-position-context
  - css-margin-collapse
  - css-overflow-scroll-parent
  - css-transition-display
sources:
  - author: MDN
    title: Stacking context
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context
  - author: MDN
    title: Layout and the containing block
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Containing_block
  - author: MDN
    title: Mastering margin collapsing
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Mastering_margin_collapsing
  - author: MDN
    title: overflow
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/overflow
  - author: W3C
    title: CSS Flexible Box Layout Module Level 1
    url: https://www.w3.org/TR/css-flexbox-1/
  - author: MDN
    title: Top layer
    url: https://developer.mozilla.org/en-US/docs/Glossary/Top_layer
  - author: MDN
    title: visibility
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/visibility
  - author: MDN
    title: transition-behavior
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior
  - author: MDN
    title: '@starting-style'
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style
  - author: MDN
    title: overlay
    url: https://developer.mozilla.org/en-US/docs/Web/CSS/overlay
  - author: Una Kravets
    title: 'Now in Baseline: animating entry effects'
    url: https://web.dev/blog/baseline-entry-animations
verified: 2026-08-01
---

## The model

Five bugs, one misconception: that a CSS property acts on the element you wrote it on. Each of these
resolves against the element's ancestors instead, so the element you are staring at is the one place
the answer is not. Your declaration did apply. If you are not certain of that, settle it with
[the cascade](./the-cascade.md) first, then stop blaming specificity.

**`z-index` orders siblings within one stacking context.** A stacking context is a self-contained
group: everything inside it paints as a single unit at the context's own level, and no descendant can
be interleaved with anything outside it. So a `z-index` of 9999 inside a context that sits below the
header is still below the header, and the element that has to win is the context, not the child.

The properties that create one are the trap, because most of them look decorative. The common subset:
`opacity` below 1, any non-`none` `transform`, `filter`, `backdrop-filter` or `clip-path`,
`isolation: isolate`, `contain: paint` or `layout`, `position: fixed` or `sticky`, and any positioned
element with a `z-index` other than `auto`. MDN's full list runs to fourteen entries and is worth
reading once, because the ones you will not guess (`container-type`, `mix-blend-mode`, a flex item
that merely has a `z-index`) are in there.

**`position: absolute` resolves against the nearest positioned ancestor**, meaning the nearest one
whose `position` is not `static`, and it uses that ancestor's padding box. With no positioned
ancestor it falls back to the initial containing block, which is why a badge meant for a card corner
turns up in the corner of the page. `position: relative` with no offsets changes nothing visually and
fixes it. The same set of decorative properties shows up again here: `transform`, `filter`,
`backdrop-filter`, `perspective`, `contain` and a matching `will-change` all establish a containing
block for absolute **and fixed** descendants, which is how a `position: fixed` header ends up
scrolling with a transformed parent.

**Adjacent vertical margins collapse into one**, and the larger of the two wins rather than the two
adding up. It happens between siblings, and it happens between a parent and its first or last in-flow
child, which is the version that produces gaps nobody can find in the inspector: the child's margin
escapes through the parent's edge and moves the parent. A `border-top`, a `padding-top`, inline
content or clearance on the parent stops the top one; a `border-bottom`, a `padding-bottom`, or a
`height` or `min-height` stops the bottom one. Flex and grid containers never collapse their items'
margins at all, which is the real argument for spacing siblings with `gap`.

**A scrollbar appears on whichever ancestor has a constrained size.** Content overflows an element
only when that element's space is limited, by a `height`, a `max-height`, or the equivalent inline
properties. `overflow: auto` makes a box a scroll container only when there is something to scroll,
so on a box that grows to fit its content it does nothing at all, forever. The height has to come
from somewhere above and survive the whole chain down to the scroller. In flex layout that is where
it usually dies: the spec gives a flex item an automatic minimum size equal to its content-based
minimum, so a wrapper refuses to shrink below its contents and passes the full content height on.
`min-height: 0` opts out. In grid, `minmax(0, 1fr)` is the same fix. There is more on sizing in
[layout without media queries](./layout-without-media-queries.md).

**A transition needs two values in two frames**, and `display` does not give it one. `display` is a
discrete property, and by default transitions do not start for discrete properties, so a rule that
flips `display: none` to `block` and `opacity: 0` to `1` together renders the end state immediately.
Three newer features fix it properly. `transition-behavior: allow-discrete` opts the discrete
property in and times the flip so the element stays visible for the whole transition;
`@starting-style` supplies the before-first-render value there was nothing to interpolate from. Both
reached Baseline Newly available in August 2024. The third, `overlay`, keeps a top-layer element in
the top layer while it animates out. You cannot set it, only list it in `transition-property`, and
MDN still marks it limited availability rather than Baseline, so an exit animation on a popover or a
modal `<dialog>` needs a fallback where the entry animation does not.

The fallback that has always worked is to never remove the element from the layout: pair `opacity`
with `visibility`, which keeps the box affecting layout while hidden and interpolates as a discrete
step, so it stays `visible` for the whole fade out and turns hidden at the end of it.

```css
.panel {
  visibility: hidden;
  opacity: 0;
  transition:
    opacity 200ms,
    visibility 200ms;
}
.panel.open {
  visibility: visible;
  opacity: 1;
}
```

## Worked example

An app shell with two bugs in it, both of them one element above where they show up:

```css
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  position: relative;
  opacity: 0.98; /* a stacking context, by accident */
}
.header .menu {
  position: absolute;
  z-index: 9999; /* only ever compared inside .header */
}

.content {
  flex: 1; /* min-height is auto, so this never shrinks */
}
.content .list {
  overflow-y: auto; /* nothing overflows: the box grew instead */
}
.card {
  position: relative;
  z-index: 1; /* and this beats the whole header */
}
```

The menu is behind the card and the list runs off the bottom of the screen. Neither the `9999` nor
the `overflow-y` is wrong, and editing either one cannot help, because neither is the value being
read. The fixes are on the ancestors:

```css
.header {
  position: relative;
  z-index: 10; /* the header is what has to beat .card */
}
.header .menu {
  position: absolute;
  z-index: 1; /* enough, now that it means something */
}

.content {
  flex: 1;
  min-height: 0; /* let it shrink to the space it was given */
  display: flex;
  flex-direction: column;
}
.content .list {
  flex: 1;
  min-height: 0;
  overflow-y: auto; /* now there is a constrained height to overflow */
}
```

Deleting the `opacity: 0.98` instead of adding `z-index: 10` also works, and is worth trying first:
it removes the context rather than working around it. Keep the `opacity` only if you can also say
which layer the header belongs on.

## Traps

**The modal renders behind the header.** An ancestor of the modal created a stacking context, so the
modal's `z-index` is being compared against its siblings inside that context and never against the
header. Raising the number cannot cross a context boundary. Fix the ancestor, or take the modal out
of it: a portal into `document.body` sidesteps the question, and `<dialog>` with `showModal()` puts
it in the browser's top layer, above everything, which is the version you get for free. See
[what the platform gives you](./what-the-platform-gives-you.md).

**The tooltip is cut off at the edge of the card.** This one is not stacking at all, and no `z-index`
will touch it. An ancestor has `overflow: hidden` and is clipping its descendants, which it does
regardless of what layer they are on. The element has to leave the clipping ancestor: a portal, or
the top layer via `popover` or a modal `<dialog>`, which spans the viewport and is not clipped by
anything in the document.

**Nothing changed, and the layering broke.** Somebody added `opacity: 0.99` to fade a panel in, or a
`transform: translateZ(0)` for smoothness, or a `will-change: transform`. Each one silently creates a
stacking context, and every descendant is now capped at that ancestor's level. The diff looks
cosmetic and the regression is structural, which is why `git log` on the parent's stylesheet finds it
faster than the inspector does.

**There is a gap above the section and no element owns it.** The margin is on the section's first
child, and it collapsed through the parent's top edge to move the parent instead. The inspector
highlights the child's margin box outside the parent, which reads as a rendering glitch until you
know the rule. Put a `padding-top` or a `border-top` on the parent, make it a flex or grid container,
or move the spacing to the parent where you meant it.

**The panel has a fixed height and still will not scroll.** Something between the sized ancestor and
the scroller is a flex item with the default `min-height: auto`, so it refuses to shrink below its
content and hands the full content height down. Give every flex item in the chain `min-height: 0`,
not only the one you put `overflow` on. Walk down from the element with the real height and check
each link, because one that will not shrink breaks all of them.
