# Contributing

Found a wrong number in a simulator? A concept that is explained unclearly?
Open an issue or a pull request.

Each chapter is a single self-contained JSX file in `src/chapters/`.
You can read any of them top-to-bottom in under 10 minutes.
Adding a new simulator means adding a React component — no build pipeline to fight.

## Running locally

```bash
git clone https://github.com/Mavengence/data-engineering-fundamentals.git
cd data-engineering-fundamentals
python3 .serve.py
# http://127.0.0.1:5002
```

Edits to any chapter file are visible on the next browser reload.
There is no hot module replacement; refresh manually.

## What makes a good contribution

- A simulator that teaches a concept through its **failure mode**, not through
  its happy path. The course already covers the happy paths in prose.
- A factual correction to a number, query, or architectural claim.
- A cleaner explanation of something that currently reads too dense.

## What is out of scope

- New tool integrations (this is not a tool reference, it is a concepts course).
- Deployment infrastructure, Docker setups, cloud provider walkthroughs.
- Anything that requires npm or a build step to run.
