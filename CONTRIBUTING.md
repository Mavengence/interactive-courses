# Contributing

Thanks for your interest in improving these courses. Contributions of every size are welcome — a typo fix, a clearer explanation, a new interactive simulator, or a whole new lesson.

## Philosophy

These courses are built on a few non-negotiable principles. Keep them in mind for any change:

- **No build step.** Everything is plain HTML, CSS, and JavaScript. There is no bundler, no transpiler, no `node_modules`. If a contribution needs a build pipeline, it doesn't fit here.
- **Pure static.** No backend, no API keys, no database. A course is just files you can open in a browser.
- **Interactive-first.** We teach with live, in-browser simulators — not video, not walls of text. The best lessons let the reader change an input and watch the system respond.
- **Works offline.** Open `index.html` from disk with no network and it should still work.

## Running locally

Clone the repo and serve it with any static file server:

```bash
git clone https://github.com/Mavengence/interactive-courses.git
cd interactive-courses
python3 -m http.server 8080
```

Then open <http://localhost:8080/> and pick a course. You can also open any course's `index.html` directly in a browser.

## Repo layout

One folder per course. Each course is self-contained:

```
<course>/
  index.html      # course entry point
  lessons/        # individual lessons
  styles/         # CSS for the course
  js/             # interactive simulators and page logic
```

The root holds the landing page, shared docs, and screenshots in `docs/screenshots/`.

## Proposing a lesson or a fix

1. Open an issue first for anything non-trivial (a new lesson, a new course, a reworked simulator) so we can align on scope. Small fixes can go straight to a PR.
2. Fork, branch, and make your change inside the relevant course folder.
3. Test it: serve locally, then open the page **with no network connection** and confirm it still works.
4. Open a pull request describing what changed and why.

## The bar for contributions

A change is ready to merge when it:

- **Works offline** — no external CDNs, fonts, or APIs required at runtime.
- **Needs no build** — no compile step, no dependency install.
- **Stays accessible** — semantic HTML, keyboard-navigable, sufficient color contrast, alt text on meaningful images.
- **Works on mobile** — responsive layout, readable at small widths, no horizontal scroll.
- **Reads clearly** — confident and concise. Teach the concept, then let the reader play with it.

## Reporting bugs

Found something broken? [Open a GitHub issue](https://github.com/Mavengence/interactive-courses/issues) using the bug report template. Tell us the course, the page or lesson, your browser, and what you expected versus what happened. A screenshot helps a lot.
