/* AI-Native Course — content
   ---------------------------
   9 modules (one per pillar), each with 4-6 lessons.
   Lessons contain prose, callouts, exercises, case-studies, knowledge checks.
*/

const COURSE_META = {
  title: 'The AI-Native Operator',
  subtitle: 'A 9-module course for individuals, leaders, and executives who intend to compete in 2026 and beyond.',
  duration: '~14 hours of reading + 30 exercises',
  cohort: 'COHORT 12 · MAY 2026',
  authors: 'Built on the AI-Native Journey research · v2.4',
  outcomes: [
    'Diagnose your own AI maturity across 9 dimensions, honestly.',
    'Operate at "L3 — Conductor": directing fleets of agents, not keystroking.',
    'Redesign a product, a team, or an org around AI-native primitives.',
    'Build a governance + measurement system that lets you go faster, not slower.',
  ],
};

const MODULES = [
  {
    id: 'mindset',
    code: 'M01',
    name: 'Mindset & Culture',
    short: 'Mindset',
    tagline: 'The default move on every task is now an AI delegation. Build the muscle.',
    duration: '85 min',
    lessons: 5,
    difficulty: 'Foundational',
    color: '--team-blue',
    lessons_data: [
      {
        n: 1,
        title: 'Why "AI-first" is no longer optional',
        duration: '14 min',
        kind: 'reading',
        objective: 'Understand the economic and competitive forces that have made reflexive AI use a baseline expectation, not an aspiration.',
        sections: [
          {
            h: 'The reckoning that already happened',
            p: 'In 2023 you could still treat AI as a curiosity — a tab you opened when you needed a haiku or a regex. By 2025 the floor moved. Tobi Lütke at Shopify wrote what every executive was thinking but few had the courage to say: before you ask for headcount, prove an AI cannot do the job. Klarna replaced 700 customer-service agents with one assistant and reported CSAT on par with humans. Microsoft\'s Work Trend Index put a number on the office worker\'s lift — roughly fourteen hours per month back, every month, forever. Compounded across a workforce, that is not a productivity bump. It is a different company.',
          },
          {
            h: 'The competitive math',
            p: 'A team that adopts AI-native operating gets two things at once: more output per person, and a faster learning loop. The output gain is what most leaders see first — more shipped, fewer hours. The learning loop is what kills you if you are on the other side of it. An AI-native team runs more experiments, sees more outcomes, and gets smarter faster. Six months in, the gap is not 20% — it is generational.',
          },
          {
            h: 'What "AI-first" actually means',
            p: 'It does not mean "use AI more." It means: every new task starts with the question, "what if a model did this?" — and you only do by hand the work that genuinely requires you. The artifact you produce is no longer the work; the artifact is the judgment about whether the work is right. Your job description is half the words it used to be, and the words that remain are heavier.',
          },
        ],
        callout: {
          kind: 'quote',
          text: 'Reflexive AI usage is now a baseline expectation. Before asking for more headcount, teams must demonstrate why AI cannot do the job.',
          attr: 'Tobi Lütke · Shopify · 2025',
        },
        exercise: {
          kind: 'reflect',
          prompt: 'List three tasks you did this week that took more than 30 minutes. For each, write one sentence describing how an AI could have done the first 80%.',
          rows: 3,
        },
      },
      {
        n: 2,
        title: 'The four maturity levels',
        duration: '11 min',
        kind: 'reading',
        objective: 'Place yourself, your team, and your org honestly on the L0 → L3 maturity ladder.',
        sections: [
          { h: 'L0 — Spectator', p: 'AI is something other people talk about. You have an account somewhere; you have not opened it this week. Real work happens in tabs you have already mastered. There is no shame in L0 — most of the world is here. There is, however, a clock.' },
          { h: 'L1 — User', p: 'You use AI for "small stuff." Phrasing an email, summarizing a meeting, writing a regex. Trust is fragile: one hallucination ends the experiment for the week. AI sits on the side of your work — never in the middle of it.' },
          { h: 'L2 — Operator', p: 'AI is the default first draft for everything. You do not write the doc — you brief the model, then edit. You do not investigate the bug — the agent investigates, you adjudicate. The interface of work has changed: you spend more time reviewing, less time generating.' },
          { h: 'L3 — Conductor', p: 'You direct fleets of agents. The unit of work is a delegation, not a keystroke. Agents spec, write, test, refactor, and open PRs while you orchestrate. Humans choose, judge, and ship; agents do the in-between. This is where the leverage compounds.' },
        ],
        callout: {
          kind: 'note',
          h: 'A note on honesty',
          text: 'Most people overestimate their level by one. The senior engineer who uses Cursor for autocomplete thinks they are L2; they are L1. The L2 engineer thinks they are L3; they are L2. Calibrate down. The course is more useful that way.',
        },
        exercise: {
          kind: 'self-rate',
          prompt: 'Rate yourself on each axis. Be honest. The scoring is for you alone.',
          axes: [
            { id: 'tasks', label: 'Default task posture', anchors: ['Hand-do everything', 'Sometimes ask AI', 'AI drafts first', 'Delegate by default'] },
            { id: 'tools', label: 'Tool depth', anchors: ['Browser tab', 'Copilot autocomplete', 'Agent IDE daily', 'Multi-agent fleets'] },
            { id: 'trust', label: 'Trust calibration', anchors: ['No trust', 'Brittle trust', 'Verification habits', 'Calibrated by domain'] },
          ],
        },
      },
      {
        n: 3,
        title: 'Trust calibration: the new senior skill',
        duration: '16 min',
        kind: 'reading',
        objective: 'Build a personal practice for knowing when to trust an AI output and when to verify — without slipping into either blind faith or paranoia.',
        sections: [
          { h: 'Trust is not a binary', p: 'The L0 mindset says "AI lies, so don\'t use it." The naive L1 mindset says "AI was right last time, so it\'s right now." Both are wrong. Trust is a calibrated, domain-specific function: how often is this model right on this kind of task with this kind of context, and what does failure cost? The senior practitioner internalizes that function and moves accordingly.' },
          { h: 'The cost-of-error frame', p: 'Some errors are cheap — a typo in an internal email is undone in seconds. Some errors are expensive — a wrong number in a board deck or a leaked customer record. Calibrate verification effort to cost-of-error, not to your mood. A useful rule: if the cost of being wrong is more than the cost of verifying, verify. If less, ship.' },
          { h: 'Building the habit', p: 'Pick one task per week where you let an AI be wrong on purpose, and you must catch it. Run agents on tasks where you have ground truth. Note the failure modes — they cluster. Within a month you will know, without thinking, which kinds of outputs to scan and which to trust.' },
        ],
        callout: {
          kind: 'warn',
          h: 'Failure mode: the senior who never verifies',
          text: 'A common pattern: confident senior + confident agent + no verification = a wrong answer that nobody catches. The seniority of the human is a multiplier, not a corrective. Build the habit before the cost.',
        },
        exercise: {
          kind: 'matrix',
          prompt: 'For each task type below, mark how much you should verify in your current role. There is no right answer — calibrate to your context.',
          rows: ['Internal email draft', 'External customer email', 'Code patch under 50 lines', 'Code patch over 200 lines', 'Board-facing number', 'Performance review draft'],
          cols: ['Skim', 'Read carefully', 'Verify against source', 'Have a second human review'],
        },
      },
      {
        n: 4,
        title: 'Killing the hero artisan',
        duration: '12 min',
        kind: 'reading',
        objective: 'Recognize and dismantle the cultural patterns that reward heroic individual effort over leveraged outcomes.',
        sections: [
          { h: 'The 2 a.m. PR is no longer the move', p: 'For twenty years, software culture celebrated the person who hand-coded a feature alone overnight. That person was the hero. In 2026, that person is a bottleneck. The new hero shipped three features by Tuesday with agents and was home for dinner. Recognize this shift and the comp/promo signals that go with it.' },
          { h: 'What leaders should publicly praise', p: 'Praise the engineer who set up the eval suite that caught a regression. Praise the PM who replaced a five-step flow with one delegated agent. Praise the manager who shrank their team by 30% and grew its output. The signal you send shapes the culture more than any policy.' },
          { h: 'Resistance from senior ICs', p: 'The most common resistance comes from senior individual contributors who built their identity around manual mastery. Take them seriously. Their craft is real. The path forward is not to dismiss it — it is to redirect: the same taste, the same standards, applied to specs, evals, and review. Their craft scales now.' },
        ],
        exercise: {
          kind: 'plays',
          prompt: 'Pick three plays you will personally adopt this month.',
          options: [
            'For every new task, write a one-line "AI delegation plan" before starting.',
            'Run one weekly retro with my team about what AI did and didn\'t do well.',
            'Publicly share one delegation per week — what worked, what didn\'t.',
            'Stop celebrating long hours. Start celebrating leveraged outcomes.',
            'Ask one peer to call me out when I revert to manual habits.',
          ],
          minPick: 3,
        },
      },
      {
        n: 5,
        title: 'Module 1 — knowledge check',
        duration: '8 min',
        kind: 'quiz',
        objective: 'Confirm you can articulate the why, the levels, and the practice — in your own words.',
        questions: [
          {
            q: 'A teammate says "I tried AI and it gave me a wrong answer, so I don\'t trust it." What is the most useful response?',
            options: [
              'Agree — AI is unreliable for serious work.',
              'Trust is calibrated per task type. The question is when you should verify, not whether to use it.',
              'Use a different model.',
              'Wait six months for the technology to improve.',
            ],
            correct: 1,
          },
          {
            q: 'Which best describes L3 (Conductor)?',
            options: [
              'You use Cursor or Claude Code for autocomplete daily.',
              'AI writes your first draft of every doc.',
              'You direct multiple agents in parallel; the unit of work is a delegation, not a keystroke.',
              'You have read three books on AI.',
            ],
            correct: 2,
          },
          {
            q: 'A senior engineer hand-codes a feature overnight to "prove they still can." In an AI-native culture, the leader\'s response is:',
            options: [
              'Celebrate the heroic effort publicly.',
              'Privately appreciate the craft, then redirect: ask them to scale that taste through specs and evals.',
              'Punish them for not using AI.',
              'Ignore it.',
            ],
            correct: 1,
          },
        ],
      },
    ],
  },

  {
    id: 'engineering',
    code: 'M02',
    name: 'Engineering Practices',
    short: 'Engineering',
    tagline: 'The unit of engineering work is no longer the keystroke. It is the spec, the eval, and the review.',
    duration: '110 min',
    lessons: 5,
    difficulty: 'Core',
    color: '--team-blue',
    lessons_data: [
      {
        n: 1,
        title: 'From keystroke to delegation',
        duration: '15 min',
        kind: 'reading',
        objective: 'Internalize the shift in what an engineer\'s day looks like — and where the leverage now lives.',
        sections: [
          { h: 'The old day', p: 'A senior engineer in 2022 wrote ~50 lines of production code per day, hand-typed in an IDE. They read Stack Overflow. They debugged by print statement. They reviewed peers\' PRs by reading every line. The work was honest and the work was slow.' },
          { h: 'The new day', p: 'A senior engineer in 2026 ships 5–10 PRs per day, all reviewed and tested. Agents draft them while she sleeps. She wakes, reviews the morning batch, pushes one tweak per PR, and approves. Her afternoons are spent on the harder problems — system design, evals, the things that truly need her judgment. She works fewer hours and ships more.' },
          { h: 'The skills that suddenly matter more', p: 'Spec writing. Eval design. Code review at scale. System architecture. Debugging an agent\'s reasoning, not just its output. These were always senior skills — they are now also junior skills, because juniors who do not have them never become senior in the new world.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'For your last shipped PR or feature: how much of it could a competent agent have done if you had given it the right spec? Be honest.',
          rows: 4,
        },
      },
      {
        n: 2,
        title: 'Spec-first development',
        duration: '22 min',
        kind: 'reading',
        objective: 'Learn to write a spec an agent can implement — with enough constraint to be correct, enough freedom to be useful.',
        sections: [
          { h: 'A spec is the new code', p: 'In 2026 you do not start by writing code. You start by writing a spec the agent can implement. The spec describes the goal, the interfaces, the constraints, and the test cases. The code is downstream. If the spec is good, the code is good. If the spec is sloppy, no model on earth saves you.' },
          { h: 'Anatomy of a good agent spec', p: 'A useful spec has five sections: (1) the goal in one sentence; (2) the interfaces — function signatures, API contracts, file paths it can touch; (3) the invariants that must hold; (4) the explicit non-goals — what NOT to do; (5) the test cases — concrete inputs and expected outputs. Most spec failures come from skipping (3) and (4).' },
          { h: 'The 80/20 rule for specs', p: 'Spend 80% of your effort on the parts of the spec that constrain the search space. The opening sentence and the test cases do almost all the work. Long prose in the middle is mostly decoration — and sometimes worse than nothing, because it gives the agent license to drift.' },
        ],
        callout: {
          kind: 'spec',
          h: 'Example: a spec the agent can implement',
          lines: [
            '# Goal',
            'Add idempotency to the /api/orders POST endpoint via an Idempotency-Key header.',
            '',
            '# Interfaces',
            '- File: services/orders/handler.go',
            '- Header: Idempotency-Key (UUID)',
            '- Storage: existing redis client; key prefix "idem:orders:"',
            '',
            '# Invariants',
            '- Same Idempotency-Key + same body within 24h returns the original response.',
            '- Same key + different body returns 409.',
            '',
            '# Non-goals',
            '- Do NOT touch /api/payments. Do NOT change the response shape.',
            '',
            '# Tests',
            '- Test: replay returns same OrderID',
            '- Test: replay with mutated body returns 409',
            '- Test: TTL of 24h enforced',
          ],
        },
        exercise: {
          kind: 'spec-builder',
          prompt: 'Write a 5-section spec for a real ticket on your backlog. Use the structure above.',
        },
      },
      {
        n: 3,
        title: 'Background agent fleets',
        duration: '24 min',
        kind: 'reading',
        objective: 'Move from "one agent at a time" to "three to five agents working in parallel while you orchestrate."',
        sections: [
          { h: 'The mental model', p: 'A fleet is not "lots of windows open." A fleet is a small number of specialized agents, each with a clear role, running in parallel against well-bounded specs. You are the conductor — you assign, you check in, you redirect. You are not in the IDE; you are above the IDE.' },
          { h: 'A starter fleet', p: 'Three agents are usually enough to start. Agent A handles the bug backlog overnight, working through tickets one at a time. Agent B handles small feature work from the spec inbox. Agent C handles refactors, cleanups, and dependency upgrades — the work that always slips. You spend ~30 minutes each morning reviewing what they did.' },
          { h: 'When fleets break', p: 'Fleets break when the specs are bad, the context is shallow, or the eval gates are missing. They also break when the human tries to micromanage — defeating the purpose. The fix is almost always upstream: tighten the spec, deepen the context, raise the eval bar.' },
        ],
        exercise: {
          kind: 'fleet-design',
          prompt: 'Design your starter fleet. Three agents, each with a one-sentence role and a typical task type.',
          slots: 3,
        },
      },
      {
        n: 4,
        title: 'Evals: the only thing keeping you safe',
        duration: '20 min',
        kind: 'reading',
        objective: 'Treat your agents like services. Build evals. Track regressions. Pin versions. Roll back when they get worse.',
        sections: [
          { h: 'Why evals are non-negotiable', p: 'An agent without an eval suite is a service without monitoring. It works until it doesn\'t, and you find out from the customer. The teams that scale agentic workflows are the ones that built the eval suite first. The teams that didn\'t are the ones telling cautionary tales at conferences.' },
          { h: 'What to measure', p: 'For each agent, define a small, expensive, high-signal eval set: 30–100 tasks that represent the real distribution of work. Score automatically where you can; score with human judgment where you must. Run on every model upgrade, every prompt change, every tool addition.' },
          { h: 'The eval-driven release', p: 'No agent change ships without passing the eval suite. Regressions block. The discipline feels heavy until the day it saves you — and then you never give it up.' },
        ],
        callout: {
          kind: 'note',
          h: 'A useful starting taxonomy',
          text: 'Group your eval cases by: (1) golden — must always pass, (2) typical — represent the real workload, (3) adversarial — known failure modes you have seen in prod. Track scores per group; a regression in any one is a release blocker.',
        },
        exercise: {
          kind: 'eval-builder',
          prompt: 'For one of your agents, list five test cases — three typical, two adversarial. Be specific about input and expected output.',
          slots: 5,
        },
      },
      {
        n: 5,
        title: 'Module 2 — knowledge check',
        duration: '9 min',
        kind: 'quiz',
        objective: 'Confirm engineering primitives are clear before you scale them.',
        questions: [
          {
            q: 'What is the most important section of an agent spec?',
            options: ['The opening sentence and the test cases', 'The middle prose explaining context', 'The list of files', 'The author and timestamp'],
            correct: 0,
          },
          {
            q: 'A teammate ships an agent change without running the eval suite. What is the right response?',
            options: ['Allow it; evals slow things down.', 'Block the change. Eval-driven release is the discipline that lets you go fast safely.', 'Run the eval after merge.', 'Add a comment to the PR but merge anyway.'],
            correct: 1,
          },
          {
            q: 'Your fleet of three agents is producing low-quality PRs. What is the most likely cause?',
            options: ['The agents need to be replaced with newer models.', 'You are micromanaging.', 'The specs are bad, the context is shallow, or the eval gates are missing.', 'Agents fundamentally cannot do this work.'],
            correct: 2,
          },
        ],
      },
    ],
  },

  {
    id: 'product',
    code: 'M03',
    name: 'Product Building',
    short: 'Product',
    tagline: 'AI features are dead. AI products are the only kind that matters.',
    duration: '95 min',
    lessons: 5,
    difficulty: 'Core',
    color: '--team-blue',
    lessons_data: [
      {
        n: 1,
        title: 'The death of the chat bubble',
        duration: '13 min',
        kind: 'reading',
        objective: 'Recognize when "AI feature" is a bolt-on and when it is the actual product.',
        sections: [
          { h: 'The bolt-on era', p: '2023–2024 produced a generation of products with a chat bubble in the corner. The bubble said "Ask AI anything." Most of them died. They died because the bubble did not change the product — it was a separate room nobody visited. The interface stayed static, the flows stayed long, the value stayed the same.' },
          { h: 'The integrated era', p: 'The products that won made the AI invisible and the value loud. The interface adapts to user intent. Forms ask one question instead of twelve. The reasoning system is the engine; the UI is a thin shell. When you use them, you do not say "I used AI" — you say "I got the thing I wanted, faster."' },
          { h: 'The diagnostic question', p: 'Ask of any AI product: if you removed the AI, would the product still work? If yes, the AI is a feature. If no, the AI is the product. Only the second category matters.' },
        ],
        exercise: {
          kind: 'audit',
          prompt: 'Audit your product. List three flows where the AI is a bolt-on. For each, sketch in one sentence how it could be the product instead.',
          rows: 3,
        },
      },
      {
        n: 2,
        title: 'Find the intent moment',
        duration: '18 min',
        kind: 'reading',
        objective: 'Identify the moment in any flow where the user states intent — and replace the next five steps with one delegation.',
        sections: [
          { h: 'Where intent lives', p: 'In every flow there is a moment when the user expresses what they want. It might be a search query, a button click, an email subject line, a verbal request. Before that moment, the product is exploration. After it, the product is execution. The AI-native opportunity is at and after that moment: collapse the next N steps into one delegated action.' },
          { h: 'The five-to-one rule', p: 'A useful design heuristic: take any flow with more than five steps after intent and ask, "what would it take to compress this to one?" Sometimes you cannot. Often you can. The teams that consistently apply this rule are the ones whose flows feel like magic.' },
          { h: 'The structured + conversational hybrid', p: 'Pure chat is rarely the right UI. Mix conversation with structured controls. Let the AI choose the surface — a form, a chat, a calendar, a map — for the moment. The user does not care about modality; they care about getting the thing they wanted.' },
        ],
        exercise: {
          kind: 'flow-compress',
          prompt: 'Pick one flow in your product with more than five post-intent steps. Sketch the one-step version. What is the user input? What is the agent output? What controls remain?',
          rows: 4,
        },
      },
      {
        n: 3,
        title: 'Generative UI',
        duration: '21 min',
        kind: 'reading',
        objective: 'Stop designing every screen. Design the system that designs screens.',
        sections: [
          { h: 'From screens to systems', p: 'The classical PM and designer ship screens — wireframes, mockups, prototypes. The AI-native PM and designer ship a system: a library of components, a set of constraints, a few patterns. The model assembles screens from that vocabulary in response to intent.' },
          { h: 'The constraint hierarchy', p: 'Generative UI is only useful when the constraints are right. Too few constraints and you get a chaotic experience that violates brand and accessibility. Too many constraints and you get the same product everyone has. The art is in the middle — define the components, the patterns, the dos and donts. Let the model improvise the rest.' },
          { h: 'When NOT to generate', p: 'Some screens should never be generated: legal flows, payment, anything where consistency is the value. Identify these explicitly. Generative UI is a tool, not an ideology.' },
        ],
        callout: {
          kind: 'note',
          h: 'A pragmatic starting point',
          text: 'Pick one surface in your product where users have wildly different goals — a dashboard, a homepage, a settings panel. Make that surface generative. Leave the rest static for now.',
        },
        exercise: {
          kind: 'reflect',
          prompt: 'Which surface in your product has the highest variance in user intent? That is your first candidate for generative UI.',
          rows: 3,
        },
      },
      {
        n: 4,
        title: 'Real-time evals on user-facing AI',
        duration: '17 min',
        kind: 'reading',
        objective: 'Score every AI response in production. Detect regressions before users do.',
        sections: [
          { h: 'The production reality', p: 'Internal evals catch most regressions. Some they will not. A model upgrade, a prompt tweak, a new tool — any of these can shift behavior in production in ways your eval suite did not anticipate. Real-time evals are the safety net.' },
          { h: 'What to score', p: 'Score every AI-facing response on a small set of dimensions: correctness (where you can verify), helpfulness (proxied by user signal), safety (rule-based filters). Sample for human review. Watch the distributions, not the individual scores.' },
          { h: 'The auto-rollback discipline', p: 'When a real-time eval crosses a threshold, the system rolls back automatically. The human reads the postmortem after. This discipline takes work to build and saves you the day a model upgrade quietly breaks 12% of your traffic.' },
        ],
        exercise: {
          kind: 'kpi-design',
          prompt: 'For your most user-facing AI surface, design three real-time eval signals. What thresholds trigger alert? What thresholds trigger auto-rollback?',
          rows: 4,
        },
      },
      {
        n: 5,
        title: 'Module 3 — knowledge check',
        duration: '8 min',
        kind: 'quiz',
        objective: 'Confirm the product mindset shift is internalized.',
        questions: [
          {
            q: 'Diagnostic for whether AI is a feature or a product:',
            options: ['Whether marketing calls it AI-powered.', 'Whether it uses an LLM under the hood.', 'Whether the product still works if you remove the AI. If no, AI is the product.', 'Whether it has a chat interface.'],
            correct: 2,
          },
          {
            q: 'A flow has 7 steps after the user states intent. The AI-native instinct is:',
            options: ['Add a chat bubble for help.', 'Compress the 7 steps into one delegated action.', 'Reorder the steps for clarity.', 'Add tooltips.'],
            correct: 1,
          },
          {
            q: 'Generative UI is most appropriate for:',
            options: ['Payment flows.', 'Legal disclosures.', 'Surfaces with high variance in user intent — dashboards, homepages, settings.', 'Every screen in the product.'],
            correct: 2,
          },
        ],
      },
    ],
  },

  {
    id: 'operations',
    code: 'M04',
    name: 'Operations & Workflows',
    short: 'Operations',
    tagline: 'Meetings shrink to decisions. Docs draft themselves. Status reports become live dashboards.',
    duration: '78 min',
    lessons: 4,
    difficulty: 'Foundational',
    color: '--team-blue',
    lessons_data: [
      {
        n: 1,
        title: 'Async-default meetings',
        duration: '14 min',
        kind: 'reading',
        objective: 'Reclaim a third of your week by routing status through async + AI summary instead of synchronous time.',
        sections: [
          { h: 'The status meeting is dead', p: 'Five people each report what they did. Four of them are reporting it to four others who do not need to know. The decision-makers wait through the rest. This ritual was never efficient — it was a coordination tax. AI removes the tax.' },
          { h: 'The new ritual', p: 'Each person posts a one-paragraph status to a channel. An agent summarizes the channel. The summary surfaces conflicts, blockers, and decisions needed. The leader spends 5 minutes reading. A 30-minute meeting only happens when a real-time decision is required.' },
          { h: 'What you lose, and how to recover it', p: 'You lose serendipity — the side conversations that produced unexpected ideas. Recover this through a different ritual: a weekly "open hour" where the team is together with no agenda. The serendipity was never in the status meeting; it was in being in the same room.' },
        ],
        exercise: {
          kind: 'meeting-audit',
          prompt: 'List your five most frequent recurring meetings. For each, mark whether it is a decision meeting (keep) or a status meeting (kill, replace with async + AI summary).',
          rows: 5,
        },
      },
      {
        n: 2,
        title: 'AI in every doc',
        duration: '12 min',
        kind: 'reading',
        objective: 'Eliminate the blank page from your team\'s working life.',
        sections: [
          { h: 'The blank-page tax', p: 'Most knowledge work begins by staring at a blank page for 20 minutes. AI eliminates this tax. The first draft is no longer where you spend your effort — it is where you start your effort. The blank page should never appear again in your team\'s life.' },
          { h: 'The brief-first habit', p: 'For every doc — design, technical, planning, performance, comms — start with a one-paragraph brief. The agent drafts. You sharpen. The shape of the work has changed: 80% editor, 20% writer. The output quality is higher, not lower, because editing is harder than writing and you spend the time on the harder part.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'Pick one doc on your plate this week. Write the one-paragraph brief now. (You can paste this brief into your tool of choice when you sit down to draft.)',
          rows: 4,
        },
      },
      {
        n: 3,
        title: 'Ticket triage agents',
        duration: '17 min',
        kind: 'reading',
        objective: 'Set up an agent that classifies, enriches, deduplicates, and assigns inbound tickets — leaving humans to handle exceptions only.',
        sections: [
          { h: 'The triage pipeline', p: 'Inbound ticket → agent reads → agent classifies (severity, area, owner) → agent enriches (links related tickets, recent context) → agent assigns. Human reviews exceptions only — the ones where the agent flagged uncertainty.' },
          { h: 'The 95/5 rule', p: 'A well-designed triage agent handles 95% of tickets without human touch. The remaining 5% are the genuinely ambiguous ones, and they go to a human with full context. The human spends 1 hour a day on triage instead of 4 — and the work is more interesting because all the easy cases are gone.' },
          { h: 'The escalation path', p: 'When the agent is wrong, what happens? The eng team needs a clear escalation path: who reviews, who fixes, who closes the loop with the user. Triage agents fail silently if you let them. Build the loop.' },
        ],
        exercise: {
          kind: 'pipeline-design',
          prompt: 'Sketch your triage pipeline. Inputs, classification dimensions, enrichment sources, escalation rules.',
          rows: 5,
        },
      },
      {
        n: 4,
        title: 'Module 4 — knowledge check',
        duration: '7 min',
        kind: 'quiz',
        objective: 'Operational basics, locked.',
        questions: [
          {
            q: 'A weekly status meeting with 8 attendees mostly reports information already in writing. The right move is:',
            options: ['Make the meeting shorter.', 'Replace with async status + AI summary; reserve sync time for decisions.', 'Add an agenda.', 'Rotate the meeting time.'],
            correct: 1,
          },
          {
            q: 'A well-designed ticket triage agent handles ~95% of tickets without human touch. The 5% that escalate to humans should be:',
            options: ['Random sample.', 'The oldest tickets.', 'The cases where the agent flagged uncertainty.', 'The ones from VIP customers only.'],
            correct: 2,
          },
        ],
      },
    ],
  },

  {
    id: 'talent',
    code: 'M05',
    name: 'Talent & Skills',
    short: 'Talent',
    tagline: 'Hire generalists who multiply themselves with agents. Performance is leverage, not hours.',
    duration: '88 min',
    lessons: 4,
    difficulty: 'Leadership',
    color: '--team-blue',
    lessons_data: [
      {
        n: 1,
        title: 'The live-build interview',
        duration: '20 min',
        kind: 'reading',
        objective: 'Replace the whiteboard with a 60-minute "build something with agents" exercise that tests the skills that matter.',
        sections: [
          { h: 'Why the whiteboard is over', p: 'The whiteboard interview tested the candidate\'s ability to invert a binary tree on the spot. It was always a poor proxy for engineering, and now it is a useless one. The candidate who can ace whiteboards in 2026 is not the candidate who will produce the most leverage on your team.' },
          { h: 'What to test instead', p: 'Give the candidate a real problem, real tools, real time — 60 minutes, an agent IDE, a representative codebase. Ask them to ship something small and real. Watch how they direct, review, and decide. Watch what they choose NOT to delegate. Watch how they verify.' },
          { h: 'The rubric', p: 'Score on five dimensions: spec quality, agent direction, judgment in review, calibrated trust, and final quality. The best candidates are not the fastest — they are the ones who consistently produce the right outcome with the least keystroke effort.' },
        ],
        exercise: {
          kind: 'rubric-build',
          prompt: 'Draft your live-build problem. What is the task? What tools? What is the rubric?',
          rows: 5,
        },
      },
      {
        n: 2,
        title: 'AI fluency in the career ladder',
        duration: '18 min',
        kind: 'reading',
        objective: 'Add explicit AI fluency rungs to your ladder. Make L4 a hard gate for senior IC.',
        sections: [
          { h: 'A four-level rubric', p: 'L1 — uses AI for occasional tasks. L2 — AI is the default first draft. L3 — runs agent fleets, builds evals, ships at 3-5x velocity. L4 — designs agentic systems for the team or company; sets the standard. The senior IC bar should sit at L3+; the staff/principal bar at L4.' },
          { h: 'How to measure', p: 'Measurement is qualitative but specific. Ask: what is the largest agentic workflow this person has built? What evals do they own? Whose work depends on their orchestration? The answers calibrate the level honestly.' },
          { h: 'The brutal truth about senior ICs', p: 'Some of your best 2024 engineers will not make L3 in 2026. Their craft was real but their adaptation is slow. Have the conversation early. Coach. If they cannot move, they will be passed by their juniors — and the worst outcome is them finding out via a comp letter.' },
        ],
        exercise: {
          kind: 'ladder',
          prompt: 'Draft the L1–L4 AI fluency rubric for your role family. Two sentences per level, plus an example artifact someone at that level would produce.',
          slots: 4,
        },
      },
      {
        n: 3,
        title: 'Outcome-on-leverage compensation',
        duration: '22 min',
        kind: 'reading',
        objective: 'Tie a portion of comp to AI-augmented outcomes, not to hours or activity.',
        sections: [
          { h: 'Why comp must move', p: 'Culture is downstream of comp. If you say AI matters but pay for hours, the culture pays for hours. If you pay for leverage, the culture chases leverage. Nothing else moves behavior as reliably.' },
          { h: 'The mechanism', p: 'A common implementation: 70% of bonus tied to traditional outcomes (impact, ratings), 20% tied to AI leverage (specific KPIs by team), 10% tied to ecosystem contribution (evals shared, agents built for others). Ratios will vary; the structure rarely does.' },
          { h: 'The hard part', p: 'Measurement. AI leverage is real but slippery. Use a small set of outcome metrics — cycle time, defect rate, throughput — and trust the trend. Avoid metrics that game easily. Calibrate by manager + skip-level review.' },
        ],
        callout: {
          kind: 'warn',
          h: 'A failure mode to avoid',
          text: 'Do not measure "AI usage" — number of prompts, tokens used, agents spawned. These metrics game instantly and tell you nothing. Measure outcomes. Outcomes are harder to define, harder to game, and the only thing that matters.',
        },
        exercise: {
          kind: 'comp-design',
          prompt: 'Sketch the leverage-comp formula for one team. What outcomes do you measure? What weights? How do you calibrate?',
          rows: 5,
        },
      },
      {
        n: 4,
        title: 'Module 5 — knowledge check',
        duration: '8 min',
        kind: 'quiz',
        objective: 'Lock the talent shifts.',
        questions: [
          {
            q: 'A live-build interview tests:',
            options: ['Speed of typing.', 'Ability to invert a binary tree.', 'Spec quality, agent direction, judgment in review, calibrated trust, and final quality.', 'Years of experience.'],
            correct: 2,
          },
          {
            q: 'You are designing leverage-tied comp. Which metric is the WORST choice?',
            options: ['Team cycle time.', 'Defect rate.', 'Number of prompts sent per week.', 'Throughput per engineer.'],
            correct: 2,
          },
        ],
      },
    ],
  },

  {
    id: 'orgmodel',
    code: 'M06',
    name: 'Org Structure',
    short: 'Org Model',
    tagline: 'Two humans + a fleet of agents will own a P&L line. The org chart flattens.',
    duration: '90 min',
    lessons: 4,
    difficulty: 'Leadership',
    color: '--team-blue',
    lessons_data: [
      {
        n: 1,
        title: 'The "two-pizza + agents" team',
        duration: '20 min',
        kind: 'reading',
        objective: 'Cap human team size and force scaling through agents instead of headcount.',
        sections: [
          { h: 'The shape that wins', p: 'The classical 30-person product team — PM, designer, eng, data, ops, marketing, support — is over for most surfaces. Two to four humans plus a fleet of agents will own a full product surface. The handoff chain compresses to nearly nothing. Decisions move in hours, not quarters.' },
          { h: 'How to enforce the cap', p: 'A cap is only real if leadership enforces it. The discipline: when a team asks for more headcount, the answer is "show me what you tried with agents first." This is not a cost-saving measure dressed up. It is a forcing function for AI-native operating.' },
          { h: 'When the cap is wrong', p: 'Some surfaces still require larger teams — physical product, regulated industries, deeply specialized domains. Be honest about which is which. The cap is a default, not a dogma.' },
        ],
        exercise: {
          kind: 'team-shape',
          prompt: 'Pick one team or product surface. Sketch the AI-native shape: how many humans, what roles, what the agent fleet covers.',
          rows: 5,
        },
      },
      {
        n: 2,
        title: 'Generalists over specialists',
        duration: '18 min',
        kind: 'reading',
        objective: 'Hire and promote T-shaped generalists who use agents to fill gaps; treat specialists as advisors.',
        sections: [
          { h: 'The cost of specialization', p: 'Deep specialization made sense when the cost of context-switching was high and the cost of expertise was low. AI inverts this: context is cheap (the agent has it), expertise is expensive (the human has it). The generalist who can wield three specialists\' worth of agents beats three specialists in handoff hell.' },
          { h: 'When specialists still matter', p: 'For genuinely deep, novel work — frontier research, regulatory design, architecture-defining decisions. Treat specialists as advisors and reviewers, not owners of execution. They scale through their judgment, not their hours.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'Identify two specialist roles on your team that could move to advisor mode in the next 6 months. What does the transition look like?',
          rows: 3,
        },
      },
      {
        n: 3,
        title: 'Flatten approval chains',
        duration: '14 min',
        kind: 'reading',
        objective: 'Cap any decision at two human approvals. Agents do prep, summary, risk; humans decide.',
        sections: [
          { h: 'The chain that kills', p: 'Five-approver decisions are a tax on speed. Each link adds delay, adds politics, adds risk-aversion. The chain exists because, historically, no one approver had time to absorb full context. AI removes that excuse.' },
          { h: 'The two-approver default', p: 'For most decisions, two humans are enough: the directly responsible owner and one accountable senior. Both get a full agent-prepared briefing — risks, options, recommended path. They decide in minutes.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'Pick one approval chain on your team. Map the current chain. Sketch the two-approver version. Where does the agent help?',
          rows: 4,
        },
      },
      {
        n: 4,
        title: 'Module 6 — knowledge check',
        duration: '8 min',
        kind: 'quiz',
        objective: 'Org primitives, locked.',
        questions: [
          {
            q: 'A team requests +5 headcount. AI-native leadership response is:',
            options: ['Approve if budget exists.', 'Deny outright.', '"Show me what you tried with agents first."', 'Approve only senior hires.'],
            correct: 2,
          },
          {
            q: 'Specialists are most useful in an AI-native org as:',
            options: ['Deep individual contributors who own execution.', 'Advisors and reviewers who scale through judgment.', 'Managers of generalists.', 'Eliminated entirely.'],
            correct: 1,
          },
        ],
      },
    ],
  },

  {
    id: 'data',
    code: 'M07',
    name: 'Data & Infrastructure',
    short: 'Data/Infra',
    tagline: 'Without context, your AI is a stranger giving advice on your business.',
    duration: '102 min',
    lessons: 4,
    difficulty: 'Core',
    color: '--team-blue',
    lessons_data: [
      {
        n: 1,
        title: 'The unified context layer',
        duration: '24 min',
        kind: 'reading',
        objective: 'Stand up a single retrieval surface (RAG/MCP) over docs, code, tickets, and conversations.',
        sections: [
          { h: 'Why context is everything', p: 'The same model, with rich context, gives expert-level answers. Without context, generic ones. The investment that compounds is the context layer — the unified, permissioned, queryable surface over all of your work artifacts.' },
          { h: 'What to include', p: 'Docs (Confluence, Notion, Drive). Code (Git). Tickets (Jira, Linear). Conversations (Slack, email — with care). Calendars. CRMs. The agent should see the same surface a thoughtful new hire would, after their first month — but on day one.' },
          { h: 'The build', p: 'Most teams should not build the context layer from scratch. Use MCP-compatible connectors. Standardize on identity and permissions. Invest in the index quality and the freshness — the quality of agent answers is downstream.' },
        ],
        callout: {
          kind: 'note',
          h: 'A useful sequencing',
          text: 'Phase 1: docs + code (most ROI per week of work). Phase 2: tickets + recent decisions. Phase 3: conversations (only with explicit privacy review). Skipping straight to phase 3 is the most common path to disaster.',
        },
        exercise: {
          kind: 'context-design',
          prompt: 'List the top 5 sources of context your team\'s agents need. For each: who owns it, what is the access model, how stale is it.',
          rows: 5,
        },
      },
      {
        n: 2,
        title: 'Permission-aware retrieval',
        duration: '20 min',
        kind: 'reading',
        objective: 'Make the agent see exactly what the user sees — nothing more, nothing less.',
        sections: [
          { h: 'The leak that ends the program', p: 'A single incident — agent returns a doc the user shouldn\'t see, agent leaks a customer record — sets the program back two years. Permission-aware retrieval is the discipline that prevents this.' },
          { h: 'How it works', p: 'The agent inherits the calling user\'s identity. Every retrieval is filtered by the user\'s ACLs. The index stores ACLs alongside the content. There is no "agent identity" with elevated access — the agent is always acting on behalf of a specific user, with that user\'s permissions.' },
          { h: 'The audit', p: 'Every retrieval is logged: user, query, results returned, ACLs applied. When something goes wrong, you can reconstruct exactly what happened. Without this, you are guessing in incident response.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'For your context layer, can you answer: "Which user, on which day, retrieved which document via which agent, with which ACLs applied?" If no, name the gap.',
          rows: 3,
        },
      },
      {
        n: 3,
        title: 'Live knowledge graphs',
        duration: '22 min',
        kind: 'reading',
        objective: 'Move from snapshot indexes to live, governed knowledge — agents working with fresh context.',
        sections: [
          { h: 'Snapshots are radioactive', p: 'A nightly index is fine for some uses. For agentic workflows, it is poison: the agent answers based on yesterday\'s reality, takes action in today\'s, and the answer is wrong. The bar for fresh context is minutes, not days.' },
          { h: 'The investment that pays', p: 'Streaming change events into the index. Per-source freshness SLAs. Stale-data detection — the agent should know when it\'s working with stale context and warn the user.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'For each major source of context, what is the current freshness? What is the target freshness? Where is the gap?',
          rows: 4,
        },
      },
      {
        n: 4,
        title: 'Module 7 — knowledge check',
        duration: '9 min',
        kind: 'quiz',
        objective: 'Confirm context discipline.',
        questions: [
          {
            q: 'An agent returns a confidential document the calling user should not see. The right architectural fix is:',
            options: ['Add a content filter on the response.', 'Permission-aware retrieval: agent inherits user identity, retrieval is filtered by user ACLs.', 'Hide the agent from senior users.', 'Disable retrieval temporarily.'],
            correct: 1,
          },
          {
            q: 'Why are nightly snapshots "radioactive" for agentic workflows?',
            options: ['They are slow to build.', 'They use too much storage.', 'The agent answers based on yesterday\'s reality, takes action in today\'s, and the answer is wrong.', 'They miss new files.'],
            correct: 2,
          },
        ],
      },
    ],
  },

  {
    id: 'governance',
    code: 'M08',
    name: 'Governance & Safety',
    short: 'Governance',
    tagline: 'Governance is not a brake. It is the system that lets you go faster.',
    duration: '95 min',
    lessons: 4,
    difficulty: 'Leadership',
    color: '--team-blue',
    lessons_data: [
      {
        n: 1,
        title: 'The model registry',
        duration: '18 min',
        kind: 'reading',
        objective: 'Track every model, where it runs, what data it sees, and who approved it.',
        sections: [
          { h: 'Why a registry exists', p: 'Without a registry, you cannot answer the question "which models are running on which data right now?" — and that question gets asked the day you have an incident, a regulator, or an audit. The registry is the boring foundation that makes everything else possible.' },
          { h: 'What the registry tracks', p: 'For each model: provider, version, intended use case, data classification approved, permitted tools, owner, last review date, eval scores. Nothing exotic — just the facts, in one place, kept current.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'Can you produce a list of every AI model running in your org right now? What it does, what data it sees? If no, your registry is the next step.',
          rows: 3,
        },
      },
      {
        n: 2,
        title: 'Eval-driven release',
        duration: '24 min',
        kind: 'reading',
        objective: 'Treat models like services. No release without passing the eval suite. Block regressions automatically.',
        sections: [
          { h: 'The release gate', p: 'Every model change — provider swap, version bump, prompt edit, tool addition — must pass a defined eval suite before reaching production. Regressions block. The system enforces, not the human memory.' },
          { h: 'The discipline pays', p: 'In year one, the suite catches a few embarrassments and you mostly grumble at the friction. In year two, it catches a near-disaster and the grumbling stops forever. The teams that scale agentic systems have this gate; the teams that get burned do not.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'For your most-deployed agent, what eval gates exist today? What gates would you add to be confident in any model upgrade?',
          rows: 4,
        },
      },
      {
        n: 3,
        title: 'Agent identity and audit',
        duration: '20 min',
        kind: 'reading',
        objective: 'Every agent has an identity. Permissions, audit, and accountability — same as a human user.',
        sections: [
          { h: 'Why identity matters', p: 'When an agent takes an action — sends an email, opens a PR, deletes a record — you must be able to answer: which agent, on whose behalf, with what authorization. Without identity, the audit log is a story you tell yourself. With it, you have ground truth.' },
          { h: 'Implementing it', p: 'Agents are first-class principals in your identity provider. Every action is logged with agent ID + on-behalf-of-user. Permissions are explicit, scoped, time-limited. Reviews happen on a cadence.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'For your most consequential agent action (write/destructive), can you produce an audit trail with agent ID, user, authorization, and timestamp? If no, name the gap.',
          rows: 3,
        },
      },
      {
        n: 4,
        title: 'Module 8 — knowledge check',
        duration: '8 min',
        kind: 'quiz',
        objective: 'Lock governance basics.',
        questions: [
          {
            q: 'Your security team asks: "Which AI models are running on customer PII right now?" You can\'t answer. Highest-leverage fix:',
            options: ['Disable all AI temporarily.', 'Stand up the model registry.', 'Hire a CISO.', 'Add encryption.'],
            correct: 1,
          },
          {
            q: 'An agent deletes a record. To answer "who did this and why," you need:',
            options: ['Sentiment analysis of recent prompts.', 'A rough estimate based on agent name.', 'Agent identity + on-behalf-of-user + timestamp + authorization, all in the audit log.', 'A team retrospective.'],
            correct: 2,
          },
        ],
      },
    ],
  },

  {
    id: 'measurement',
    code: 'M09',
    name: 'Measurement & ROI',
    short: 'Measurement',
    tagline: 'Track AI leverage like you track revenue. Tie comp to it. Make it boring.',
    duration: '82 min',
    lessons: 4,
    difficulty: 'Leadership',
    color: '--team-blue',
    lessons_data: [
      {
        n: 1,
        title: 'Beyond seat counts',
        duration: '18 min',
        kind: 'reading',
        objective: 'Stop measuring "how many people have an AI license." Measure outcomes.',
        sections: [
          { h: 'The vanity metric', p: 'Adoption dashboards counting active users, prompts sent, tokens consumed — these tell you nothing about whether AI is working. They are the AI-era equivalent of "lines of code shipped." Comforting; useless.' },
          { h: 'What to measure instead', p: 'Per team, pick 2-3 outcome metrics that should improve with AI: cycle time, throughput, defect rate, NPS, deal velocity, ticket resolution time. Track them. Compare to baseline. The metric matters; the activity around it does not.' },
        ],
        exercise: {
          kind: 'kpi-pick',
          prompt: 'For your team, pick 2-3 outcome KPIs that AI should measurably move. State the current baseline and the 90-day target.',
          rows: 4,
        },
      },
      {
        n: 2,
        title: 'Baseline before scaling',
        duration: '14 min',
        kind: 'reading',
        objective: 'Before rolling out any AI tool, baseline the metric. Without baseline, you are telling stories.',
        sections: [
          { h: 'The discipline', p: 'No AI rollout begins without a measured baseline of the target metric. Two weeks minimum. Same conditions as the post-rollout measurement. Without this, every claimed improvement is anecdote.' },
          { h: 'Why teams skip it (and shouldn\'t)', p: 'Baselining is unglamorous and feels slow. The pressure to "just ship the AI tool" is high. Skipping it costs you the ability to ever prove the ROI — and that means the program eventually loses funding when budgets tighten.' },
        ],
        exercise: {
          kind: 'reflect',
          prompt: 'Pick one AI rollout you did or are planning. What is the baseline measurement? If you don\'t have one, stop and gather it.',
          rows: 3,
        },
      },
      {
        n: 3,
        title: 'The quarterly leverage review',
        duration: '20 min',
        kind: 'reading',
        objective: 'Run leverage reviews on the same cadence and rigor as revenue reviews.',
        sections: [
          { h: 'The ritual', p: 'Every quarter, every team presents AI leverage like a revenue review. What metrics moved. Why. What worked. What didn\'t. What\'s next quarter\'s bet. The seriousness of the ritual signals the seriousness of the program.' },
          { h: 'What good looks like', p: 'A 20-minute deck. Three slides on outcomes, one on causes, one on next bets. No vanity metrics. Honest about what didn\'t work. The first few are awkward; by the third quarter the format is muscle memory and the program compounds.' },
        ],
        exercise: {
          kind: 'review-template',
          prompt: 'Sketch the 5-slide leverage review for your team next quarter. Slide titles + one-line content per slide.',
          slots: 5,
        },
      },
      {
        n: 4,
        title: 'Module 9 — knowledge check & capstone',
        duration: '15 min',
        kind: 'quiz',
        objective: 'Confirm measurement primitives, then commit.',
        questions: [
          {
            q: 'Your AI rollout claims 30% productivity gain. The hardest question a board member can ask is:',
            options: ['What model are you using?', 'What is the baseline measurement and when was it taken?', 'Who is the vendor?', 'How many seats?'],
            correct: 1,
          },
          {
            q: 'The most reliable signal that an AI program is working:',
            options: ['Number of active users.', 'Tokens per month.', 'Outcome metrics (cycle time, defect rate, throughput) moving against a measured baseline.', 'Internal survey sentiment.'],
            correct: 2,
          },
          {
            q: 'A quarterly leverage review should look most like:',
            options: ['A project status update.', 'A revenue review — with the same rigor and seriousness.', 'A demo day.', 'A retrospective.'],
            correct: 1,
          },
        ],
      },
    ],
  },
];

Object.assign(window, { COURSE_META, MODULES });
