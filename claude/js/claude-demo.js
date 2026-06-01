// Demo-mode Claude shim.
// This course is published as a static site (GitHub Pages) with no backend,
// so window.claude.complete does not exist. Rather than surface a raw
// TypeError to learners, we install a graceful local responder that returns
// plausible, well-formed answers in whatever shape each widget expects
// (plain text, or the minified JSON contracts used by the grader / arena /
// semantic-space widgets). Responses are simulated — a one-line banner on
// every interactive makes that explicit.
//
// IMPORTANT: this file must load BEFORE widgets.jsx so callClaude() resolves
// against this shim instead of throwing.
(function () {
  if (window.claude && typeof window.claude.complete === 'function') return;

  window.CLAUDE_DEMO_MODE = true;

  // ---- small helpers -------------------------------------------------------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (arr, seed) => arr[Math.abs(hash(seed)) % arr.length];
  function hash(str) {
    let h = 0;
    str = String(str || '');
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return h;
  }
  function clamp01(n) { return Math.max(0.06, Math.min(0.94, n)); }

  // ---- canned generators ---------------------------------------------------

  // Generic "Claude answers a prompt with nothing grounded" — used by the
  // sandbox, the orrery, the transform demo, etc. We tailor the answer a
  // little to the prompt so it never feels canned-in-a-bad-way.
  function genericAnswer(prompt) {
    const p = String(prompt || '').toLowerCase();

    if (/launch email|announc|rollout|release email/.test(p)) {
      const structured = /constraints|format|audience|context|role/.test(p) || prompt.length > 240;
      if (structured) {
        return `Subject: AuthKit v2 is live Monday — one action to migrate

We're replacing legacy SSO with AuthKit v2. It ships Monday, opt-in for two weeks, then becomes the default.

Do this now: point your service at the new endpoint and run the migration check.

\`\`\`
authkit migrate --check --service <your-service>
\`\`\`

Nothing else changes for you today. Tokens, scopes, and refresh behavior are identical. The two-week window is there so you can roll back if the check surfaces anything unexpected.

Questions go to the #authkit channel. Full migration notes are in the runbook.`;
      }
      return `Subject: New authentication service

Hi all — we're launching a new authentication service. It should make signing in faster and more secure. Take a look when you get a chance and let us know if you have questions. Thanks!`;
    }

    if (/p99|latency|microservice|observability|which.*service/.test(p)) {
      return `Based on typical patterns, the checkout-service tends to show the highest p99 — usually a downstream database call under load.\n\n(Heads up: I don't actually have your telemetry. I'm pattern-matching, not measuring. To get a real answer, paste the p99 numbers or wire me to your metrics — otherwise this is a confident guess, which is exactly the failure mode this lesson is about.)`;
    }

    if (/oncall|on-call|rotation|owns|who (owns|manages)/.test(p)) {
      return `That's typically owned by the platform or identity team, with a weekly on-call rotation.\n\n(But I'm guessing — none of your team's actual rotation data is in this window. Watch how readily I answered anyway. That's the point of the lesson: if it isn't in context, it isn't knowledge.)`;
    }

    // Fallback: acknowledge the prompt, answer helpfully, stay honest.
    return `Here's a useful response to that. I've taken your prompt at face value and given you the most likely-helpful continuation.\n\nIf the answer depends on facts about your specific project, team, or data, remember I can only work from what's in this window — so the more concrete context you give, the better and more grounded this gets.`;
  }

  // Short, kind, concrete feedback (quiz, fill-blank, prompt-review notes).
  function shortFeedback(prompt, system) {
    const s = String(system || '').toLowerCase();
    if (/multiple-choice|feedback on a multiple/.test(s)) {
      const correct = /correct: (.*?)\n/.exec(prompt);
      return `Good thinking through it. The strongest answer is the one that matches how Claude actually behaves — it completes the most likely helpful text from what's in the window, rather than retrieving or refusing. Keep that frame and the rest of the course clicks into place.`;
    }
    if (/filled-in prompt|coach prompt writers/.test(s)) {
      return `Solid start — the structure is there and the intent is clear. To make it bulletproof, tighten the success criteria so there's no room to drift: say exactly what "done" looks like and in what format.`;
    }
    if (/shareability|safer to share/.test(s)) {
      return `The biggest win is parameterization: swap the hardcoded repo, teammate names, and channel references for <PLACEHOLDERS> so anyone on the team can drop in their own specifics. A one-line "when to use" at the top makes it instantly reusable.`;
    }
    return `Nice work. This is on the right track — the next lever is specificity: one concrete example of what "good" looks like will sharpen the output more than any amount of extra instruction.`;
  }

  // Socratic tutor: answer briefly, then ask a question back.
  function socraticReply(messages) {
    const last = [...(messages || [])].reverse().find((m) => m.role === 'user');
    const text = (last && last.content) || '';
    const turns = (messages || []).filter((m) => m.role === 'user').length;
    const openers = [
      "Good — you're circling the right idea.",
      'That intuition is close.',
      "Let's pressure-test that.",
      'Right instinct.',
    ];
    const questions = [
      'So if none of that lives in the context window, where exactly does Claude get the answer from?',
      'What would you have to put in the window to turn that guess into knowledge?',
      'When it answered confidently with nothing grounded — what failure mode was that, and how would you fix it?',
      'If you removed the role and context from your prompt, which part of the output would degrade first, and why?',
    ];
    if (turns >= 3) {
      return `${pick(openers, text)} You've got it: Claude is a completion engine that works only from what's in the window, steered to be helpful, harmless, and honest. Everything else in this course is a way to put better material in that window. Want to try applying it to a real prompt of yours?`;
    }
    return `${pick(openers, text)} A short answer: think of Claude as continuing the most likely helpful text given everything in front of it — not retrieving, not remembering. ${pick(questions, text + turns)}`;
  }

  // CLAUDE.md builder: return ready-to-paste markdown.
  function claudeMd(prompt) {
    const get = (label) => {
      const m = new RegExp(label + ':\\s*(.*)', 'i').exec(prompt);
      return (m && m[1] && m[1].trim()) || '';
    };
    const project = get('Project') || 'Your project';
    const stack = get('Stack/tooling') || 'language, framework, key tools';
    const conventions = get('Conventions to follow') || 'house style';
    const avoid = get('Things to avoid') || 'known anti-patterns';
    const commands = get('Useful commands') || 'build / test / lint';
    return `# CLAUDE.md

## Project
${project}

## Stack
${stack}

## Conventions
- ${conventions}
- Keep changes small and focused; one concern per change.
- Write tests alongside code.

## Avoid
- ${avoid}
- No new dependencies without a clear reason.

## Commands
\`\`\`
${commands}
\`\`\`

## Working style
- Be crisp and skimmable. Lead with the answer.
- When something is ambiguous, state your assumption instead of guessing silently.`;
  }

  // ---- JSON contract responders -------------------------------------------

  function graderJSON(prompt) {
    // Extract the user's prompt being graded.
    const m = /"""\s*([\s\S]*?)\s*"""/.exec(prompt);
    const userPrompt = (m && m[1]) || '';
    const len = userPrompt.length;
    const has = (re) => re.test(userPrompt.toLowerCase());
    let score = 30;
    const strengths = [];
    const weaknesses = [];
    if (has(/you are|act as|role/)) { score += 14; strengths.push('Sets a clear role, which anchors tone and vocabulary.'); }
    else weaknesses.push('No role — Claude has to guess who it is being.');
    if (has(/context|background|we['’]re|because/)) { score += 14; strengths.push('Supplies context the model could not otherwise know.'); }
    else weaknesses.push('Thin on context; add the background the task depends on.');
    if (has(/format|json|bullet|section|under \d|words|steps/)) { score += 16; strengths.push('Specifies an output shape, so the result is predictable.'); }
    else weaknesses.push('No format constraint — the output shape is left to chance.');
    if (len > 220) { score += 14; strengths.push('Detailed enough to remove most ambiguity.'); }
    else if (len < 80) weaknesses.push('Quite short; more specificity would sharpen the result.');
    if (has(/example|e\.g\.|for instance/)) { score += 10; strengths.push('Includes an example of what "good" looks like.'); }
    score = Math.max(8, Math.min(96, score));
    if (!strengths.length) strengths.push('Gets the basic intent across.');
    if (!weaknesses.length) weaknesses.push('Could add one concrete example to lock in the style.');
    const rewrite = `You are a senior specialist on this task.

CONTEXT
<the background the model needs>

TASK
${(userPrompt.split('\n')[0] || 'Do the task').slice(0, 120)}

CONSTRAINTS
- Be specific and concrete.
- State assumptions instead of guessing.

FORMAT
<the exact shape you want back>`;
    return JSON.stringify({ score, strengths: strengths.slice(0, 4), weaknesses: weaknesses.slice(0, 4), oneBetterRewrite: rewrite });
  }

  function arenaJSON(prompt) {
    const m = /USER REWRITE:\s*([\s\S]*)$/.exec(prompt);
    const rewrite = (m && m[1]) || '';
    const om = /ORIGINAL:\s*([\s\S]*?)\n\nUSER REWRITE:/.exec(prompt);
    const original = (om && om[1]) || '';
    const r = rewrite.toLowerCase();
    let userScore = 45;
    if (/you are|role|act as/.test(r)) userScore += 14;
    if (/context|background/.test(r)) userScore += 12;
    if (/format|json|bullet|section|under \d|steps/.test(r)) userScore += 14;
    if (rewrite.length > original.length + 60) userScore += 10;
    if (/example|e\.g\./.test(r)) userScore += 8;
    userScore = Math.max(20, Math.min(95, userScore));
    const originalScore = Math.max(8, Math.min(40, 18 + (original.length > 120 ? 10 : 0)));
    const winner = userScore > originalScore + 4 ? 'user' : userScore < originalScore - 4 ? 'original' : 'tie';
    const why = winner === 'user'
      ? 'Your rewrite adds role, context, and an explicit output shape, so there is far less for the model to guess.'
      : winner === 'tie'
        ? 'Both convey the intent, but neither fully pins down the output format — that is the deciding gap.'
        : 'The original is more concrete here; your rewrite drops some specifics it needs.';
    return JSON.stringify({ winner, why, userScore, originalScore });
  }

  function semanticJSON(prompt) {
    // The prompt lists existing points as "word (x, y)" and the new word in quotes.
    const points = [];
    const re = /([A-Za-z][\w' -]*?)\s*\(([0-9.]+),\s*([0-9.]+)\)/g;
    let mm;
    while ((mm = re.exec(prompt)) !== null) {
      points.push({ w: mm[1].trim(), x: parseFloat(mm[2]), y: parseFloat(mm[3]) });
    }
    const nm = /Place the new word:\s*"([^"]+)"/i.exec(prompt) || /new word:\s*"([^"]+)"/i.exec(prompt);
    const word = ((nm && nm[1]) || '').toLowerCase();

    // Lightweight topical buckets so placement is semantically believable.
    const buckets = {
      tech: ['database', 'kubernetes', 'server', 'commit', 'pr review', 'algorithm', 'sprint', 'deploy', 'api', 'cache', 'compiler', 'kernel', 'docker', 'merge'],
      pm: ['roadmap', 'okr', 'stakeholder', 'kickoff', 'backlog', 'milestone', 'standup', 'retro', 'scope'],
      coffee: ['espresso', 'latte', 'cortado', 'grinder', 'cappuccino', 'mocha', 'brew', 'beans', 'flat white'],
      music: ['violin', 'sonata', 'concerto', 'cello', 'piano', 'fugue', 'symphony', 'opera', 'tempo', 'melody'],
    };
    let best = null;
    for (const k in buckets) {
      if (buckets[k].some((w) => word.includes(w) || w.includes(word))) { best = k; break; }
    }
    let nearWord = '';
    let why = '';
    let x = 0.5, y = 0.5;
    if (best && points.length) {
      const inBucket = points.filter((p) => buckets[best].includes(p.w.toLowerCase()));
      const cluster = inBucket.length ? inBucket : points;
      const cx = cluster.reduce((s, p) => s + p.x, 0) / cluster.length;
      const cy = cluster.reduce((s, p) => s + p.y, 0) / cluster.length;
      const jitter = (hash(word) % 100) / 1000; // up to 0.1
      x = clamp01(cx + jitter - 0.05);
      y = clamp01(cy + ((hash(word + 'y') % 100) / 1000) - 0.05);
      // nearest existing point in the same cluster
      let nd = 1e9;
      cluster.forEach((p) => { const d = Math.hypot(p.x - x, p.y - y); if (d < nd) { nd = d; nearWord = p.w; } });
      why = `it shares meaning with the ${best} cluster, so it lands beside related words.`;
    } else if (points.length) {
      // Unknown topic: place near centroid of nearest-by-name, lightly offset.
      const p = points[Math.abs(hash(word)) % points.length];
      x = clamp01(p.x + 0.06); y = clamp01(p.y - 0.04); nearWord = p.w;
      why = `its meaning is closest to that neighbourhood of the space.`;
    } else {
      nearWord = 'the centre';
      why = `there were no anchors to compare against, so it sits in the middle.`;
    }
    return JSON.stringify({ x: +x.toFixed(2), y: +y.toFixed(2), near: nearWord, why });
  }

  // ---- the router ----------------------------------------------------------
  function respond(arg) {
    // arg is either a string prompt, or { messages, system }.
    let prompt = '';
    let system = '';
    let messages = null;
    if (typeof arg === 'string') {
      prompt = arg;
    } else if (arg && typeof arg === 'object') {
      system = arg.system || '';
      if (Array.isArray(arg.messages)) {
        messages = arg.messages;
        const lastUser = [...arg.messages].reverse().find((m) => m.role === 'user');
        prompt = (lastUser && lastUser.content) || '';
      } else if (typeof arg.prompt === 'string') {
        prompt = arg.prompt;
      }
    }
    const sys = String(system).toLowerCase();

    // JSON-contract widgets (detected by their system prompt schema).
    if (/"score"|prompt engineering coach/.test(sys)) return graderJSON(prompt);
    if (/"winner"|prompt engineering judge/.test(sys)) return arenaJSON(prompt);
    if (/"x":0-1|2d semantic space|semantic space/.test(sys)) return semanticJSON(prompt);

    // Conversational tutor.
    if (/socratic|tutor/.test(sys) && messages) return socraticReply(messages);

    // CLAUDE.md builder.
    if (/claude\.md|markdown file content/.test(sys)) return claudeMd(prompt);

    // Short coaching feedback (quiz / fill-blank / shareability note).
    if (/2 sentences|≤2 sentences|kind, concrete feedback|coach prompt writers|safer to share|brief, kind/.test(sys)) {
      return shortFeedback(prompt, system);
    }

    // Default: a plausible, honest answer to the raw prompt.
    return genericAnswer(prompt);
  }

  // ---- public surface ------------------------------------------------------
  window.claude = {
    // Mimics a latency profile so the streaming UIs feel real.
    async complete(arg) {
      await wait(420 + (Math.abs(hash(JSON.stringify(arg))) % 360));
      return respond(arg);
    },
  };

  // A tiny, unobtrusive banner so learners know responses are simulated.
  // Injected once per page, after DOM is ready.
  function injectBanner() {
    if (document.getElementById('demo-mode-banner')) return;
    const bar = document.createElement('div');
    bar.id = 'demo-mode-banner';
    bar.setAttribute('role', 'note');
    bar.textContent = 'Demo mode — “live Claude” responses on this static site are simulated locally. The techniques are real; the answers are illustrative.';
    document.body.appendChild(bar);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBanner);
  } else {
    injectBanner();
  }
})();
