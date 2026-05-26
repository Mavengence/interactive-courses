# Extending the course

Adding a new lesson is a five-minute operation. The module loader in
`js/final.js` auto-wires topbar, sidebar TOC, prev/next footer, progress
tracking, and all declarative widgets. You only write content.

## 1. Stamp a new lesson from the template

```bash
./scripts/new-lesson.sh 13 ship-it "Ship it" "Track 04 — Advanced"
```

This creates two files:

- `lessons/13-ship-it.html` — a copy of `templates/lesson-template.html`
  with the slug, number, title, and track substituted.
- `js/lessons/L13.js` — a stub for the bespoke interactive widget.

## 2. Register the lesson

Open `js/lessons.js` and append an entry to `window.LESSONS`:

```js
{ id: 'ship-it', n: '13', title: 'Ship it', track: 4,
  file: 'lessons/13-ship-it.html',
  sub: 'A single sentence describing the lesson.',
  hook: 'A four-word eyebrow.',
  time: '10 min', interactives: 3 },
```

That's it. The home page's course outline, the topbar breadcrumb, the
prev/next footer across sibling lessons, and progress tracking all read
from this array.

## 3. Fill in content

Open `lessons/13-ship-it.html`. Replace every `TEMPLATE:...` token.
Delete any widget section you don't use (replay, quiz, compare,
flashcards, bespoke). Keep the section IDs (`s1` .. `s7`) because
`lesson-init.js` builds the sidebar TOC from them.

## 4. Declarative widgets

Declare widgets with `data-widget="<name>"`. The loader mounts them
automatically on `DOMContentLoaded`. Supported widgets:

| Widget     | Declarative syntax                                                   |
|------------|----------------------------------------------------------------------|
| Quiz       | `<div data-widget="quiz" data-question="…" data-options='[…]' data-answer="N">`|
| Compare    | `<div data-widget="compare" data-left='{…}' data-right='{…}'>`       |
| Replay     | `<div data-widget="replay" data-script='[{…}]'>`                     |
| Flashcards | `<div data-widget="flashcards" data-cards='[{…}]'>`                  |
| Callout    | Use the `<aside class="callout callout--cyan">` HTML pattern         |

All widgets expose `destroy()` and `update(opts)` programmatically via
`window.W.<Name>(el, opts)`.

## 5. Bespoke widget

If your lesson has a unique interactive (a task board, a PR x-ray, a
flashcard drop-zone), implement it in `js/lessons/L13.js`. The module
loader mounts `#bespoke-host` on the page with any `L13.init()`
function you export. Keep the widget self-contained: scope CSS via
`body.lesson-13 .your-class { … }` and attach no global listeners.

## 6. Verify

```bash
python3 -m http.server 8787
open http://localhost:8787/lessons/13-ship-it.html
python3 run_audit.py          # re-run the contrast auditor
```

## Design tokens

Every color, font, spacing, radius, shadow, and motion value is a CSS
custom property defined at the top of `styles/final.css`. Use tokens
(`color: var(--fg-primary)`) instead of raw values. The full token
table is documented in `docs/CC2_NOTES.md` under `design_tokens`.

## Constraints

- No external CDN, no npm, no build step
- All interactive widgets must work with keyboard only
- All color combinations must meet WCAG AA (auditor enforces this)
- `prefers-reduced-motion: reduce` must be honored
- No emoji in headings or body (terminal-first tone)
