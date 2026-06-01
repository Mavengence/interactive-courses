# Contributing

Found a wrong number in a simulator? A concept that is explained unclearly?
Open an issue or a pull request.

Each chapter is a single self-contained JSX file in `src/chapters/`.
You can read any of them top-to-bottom in under 10 minutes.
Adding a new simulator means adding a React component — no bundler to fight.

The `.jsx` files are the source of truth. The page loads the matching
precompiled `.js` next to each one (plain `React.createElement` calls,
production React), so there is no in-browser transpiler on the critical path.

## Running locally

```bash
git clone https://github.com/Mavengence/data-engineering-fundamentals.git
cd data-engineering-fundamentals
python3 .serve.py
# http://127.0.0.1:5002
```

After editing a chapter, recompile just that file — one command, no config,
no install (npx fetches esbuild on demand):

```bash
npx -y esbuild src/chapters/Ch4_Orchestrate.jsx \
  --loader:.jsx=jsx --jsx=transform \
  --jsx-factory=React.createElement --jsx-fragment=React.Fragment \
  --format=iife --outfile=src/chapters/Ch4_Orchestrate.js
```

Then refresh the browser. There is no hot module replacement; refresh manually.

## What makes a good contribution

- A simulator that teaches a concept through its **failure mode**, not through
  its happy path. The course already covers the happy paths in prose.
- A factual correction to a number, query, or architectural claim.
- A cleaner explanation of something that currently reads too dense.

## What is out of scope

- New tool integrations (this is not a tool reference, it is a concepts course).
- Deployment infrastructure, Docker setups, cloud provider walkthroughs.
- Anything that adds a bundler, watcher, or persistent toolchain. The single
  per-file esbuild command above is the only build step, and it stays that way.
