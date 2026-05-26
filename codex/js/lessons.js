// Lesson catalog — titles, tracks, urls, one-line hooks
window.LESSONS = [
  // TRACK 1: Fundamentals
  { id: 'mental-model',   n: '01', title: 'What Codex Actually Is',    track: 1, file: 'lessons/01-mental-model.html',
    sub: "Codex isn't autocomplete. It's an autonomous agent in a sandbox. Get that wrong and every task plan after is a guess.",
    hook: 'Agent, not assistant.', time: '10 min', interactives: 3 },
  { id: 'sandbox',         n: '02', title: 'The Sandbox Contract',     track: 1, file: 'lessons/02-sandbox.html',
    sub: 'Ephemeral filesystem, no network by default, a patch at the end. Every safety rail shapes how you prompt.',
    hook: 'The walls you forgot you built.', time: '9 min', interactives: 3 },
  { id: 'agents-md',       n: '03', title: 'AGENTS.md — Codex\'s Memory', track: 1, file: 'lessons/03-agents-md.html',
    sub: 'One file, committed to your repo. It\'s the difference between "write a PR" and "write a PR the way we write PRs here."',
    hook: 'Onboard the agent like a new hire.', time: '11 min', interactives: 3 },

  // TRACK 2: Task Craft
  { id: 'task-spec',       n: '04', title: 'Anatomy of a Task Spec',   track: 2, file: 'lessons/04-task-spec.html',
    sub: 'Goal, constraints, acceptance criteria, out-of-scope. Four lines, and your success rate doubles.',
    hook: 'Specs aren\'t docs. Specs are guardrails.', time: '12 min', interactives: 3 },
  { id: 'scope',           n: '05', title: 'Scoping: Small Tasks Win', track: 2, file: 'lessons/05-scope.html',
    sub: 'Codex is great at a morning\'s work, not a quarter\'s. Learn the shape of a task it can land cleanly.',
    hook: 'Slice the elephant.', time: '9 min', interactives: 2 },
  { id: 'acceptance',      n: '06', title: 'Acceptance Criteria',      track: 2, file: 'lessons/06-acceptance.html',
    sub: 'Ambiguous done = ambiguous PR. Write the tests before you write the task. Or have Codex write them first.',
    hook: 'Done is a checklist, not a feeling.', time: '10 min', interactives: 3 },

  // TRACK 3: Working With It
  { id: 'review',          n: '07', title: 'Reviewing a Codex PR',     track: 3, file: 'lessons/07-review.html',
    sub: 'It wrote 400 lines. Three are subtly wrong. Here\'s the review checklist that catches them.',
    hook: 'Trust, but diff.', time: '12 min', interactives: 3 },
  { id: 'iterate',         n: '08', title: 'Iteration Loops',          track: 3, file: 'lessons/08-iterate.html',
    sub: 'When to nudge, when to re-spec, when to throw it away and restart. A decision tree for every stuck run.',
    hook: 'Two retries, then rewrite.', time: '9 min', interactives: 2 },
  { id: 'tools',           n: '09', title: 'The AI Tools Ecosystem',    track: 3, file: 'lessons/09-tools.html',
    sub: 'Claude Code, Copilot, Cursor, Aider, Cline — each solves a different slice of the problem. Picking the wrong one for a job is expensive. Picking the right one is a force multiplier.',
    hook: 'Know the landscape.', time: '11 min', interactives: 3 },

  // TRACK 4: Advanced
  { id: 'parallelism',     n: '10', title: 'Parallel Tasks, One Repo', track: 4, file: 'lessons/10-parallelism.html',
    sub: 'Git worktrees, task decomposition, and coordination patterns. How to run multiple agents in parallel without merge hell.',
    hook: 'Multiplayer mode.', time: '12 min', interactives: 3 },
  { id: 'patterns',        n: '11', title: 'Patterns That Work',        track: 4, file: 'lessons/11-patterns.html',
    sub: 'TDD with AI, brownfield onboarding, refactoring, debugging — the task shapes that consistently succeed, and three that reliably fail.',
    hook: 'A library of proven shapes.', time: '13 min', interactives: 3 },
  { id: 'workflow',        n: '12', title: 'Your AI Dev Workflow',      track: 4, file: 'lessons/12-workflow.html',
    sub: 'End-to-end workflow: discuss → plan → implement → review → ship → learn. The capstone task you choose every move.',
    hook: 'From knowledge to habit.', time: '15 min', interactives: 5 },
];

window.TRACKS = [
  { id: 1, label: 'Track 01 — Fundamentals', title: 'The mental model',
    hint: 'Three lessons on what Codex is and how it sees your repo.' },
  { id: 2, label: 'Track 02 — Task Craft', title: 'Writing tasks that work',
    hint: 'Where most of the quality lives. Spec it right, ship it right.' },
  { id: 3, label: 'Track 03 — In the Loop', title: 'Working with the agent',
    hint: 'Review, iterate, give it the tools it needs to finish the job.' },
  { id: 4, label: 'Track 04 — Advanced', title: 'Scale it into your workflow',
    hint: 'Parallel agents, proven patterns, and the daily loop.' },
];
