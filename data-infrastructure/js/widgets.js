// Widgets — vanilla JS. Quiz, TaskSpec, Terminal demo, Diff, Flashcards
// Each widget mounts into a target element and reports checkpoints to Progress.
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // ---------------- Quiz ----------------
  function Quiz(target, opts) {
    const { lessonId, cpId, question, options, correct, explanation } = opts;
    const el = document.createElement('div');
    el.className = 'w';
    const alreadyEarned = window.Progress.hasCheckpoint(lessonId, cpId);
    const letters = ['A','B','C','D','E','F'];
    el.innerHTML = `
      <div class="w-head">
        <span class="w-kind">Check</span>
        <span class="w-title">${esc(opts.title || 'Quick check')}</span>
        <span class="w-xp ${alreadyEarned ? 'earned' : ''}">${alreadyEarned ? '+15 XP ✓' : '+15 XP'}</span>
      </div>
      <div class="quiz-q">${question}</div>
      <div class="quiz-opts"></div>
      <div class="quiz-explanation" style="display:none;"></div>
    `;
    const optsEl = el.querySelector('.quiz-opts');
    const explEl = el.querySelector('.quiz-explanation');
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'quiz-opt';
      b.innerHTML = `<span class="letter">${letters[i]}</span><span>${o}</span>`;
      b.addEventListener('click', () => {
        if (el.dataset.answered) return;
        el.dataset.answered = '1';
        const ok = i === correct;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) {
          optsEl.children[correct].classList.add('correct');
        }
        Array.from(optsEl.children).forEach(c => c.disabled = true);
        explEl.innerHTML = `<b>${ok ? 'Correct.' : 'Not quite.'}</b> ${explanation}`;
        explEl.style.display = 'block';
        if (ok) {
          const earned = window.Progress.markCheckpoint(lessonId, cpId, 'quiz');
          if (earned) el.querySelector('.w-xp').classList.add('earned');
        }
      });
      optsEl.appendChild(b);
    });
    target.replaceWith(el);
  }

  // ---------------- TaskSpec builder ----------------
  // Toggles assemble a task spec; score rises as user adds key elements.
  function TaskSpec(target, opts) {
    const { lessonId, cpId, items = [], goal, threshold = 3 } = opts;
    const el = document.createElement('div');
    el.className = 'w';
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = `
      <div class="w-head">
        <span class="w-kind">Drill</span>
        <span class="w-title">${esc(opts.title || 'Build a task spec')}</span>
        <span class="w-xp ${earned?'earned':''}">${earned?'+20 XP ✓':'+20 XP'}</span>
      </div>
      <div class="small muted" style="margin-bottom:12px;">${esc(opts.desc || 'Toggle on the elements that belong in a strong task spec. Watch the assembled output on the right.')}</div>
      <div class="spec">
        <div class="spec-left"></div>
        <div>
          <div class="spec-right mono" id="sr-${cpId}"></div>
          <div class="spec-score">
            <span class="n" id="sn-${cpId}">0</span>
            <span class="l">/${items.length} signals</span>
            <div class="bar"><div id="sb-${cpId}" style="width:0%"></div></div>
            <span class="l" id="st-${cpId}">weak</span>
          </div>
        </div>
      </div>
    `;
    const left = el.querySelector('.spec-left');
    const state = items.map(() => false);

    function render() {
      const parts = [];
      parts.push(`<span class="c"># task.md</span>`);
      parts.push('');
      parts.push(`<span class="k">## Goal</span>`);
      parts.push(`<span class="s">${esc(goal || 'Describe the change in one sentence.')}</span>`);
      parts.push('');
      items.forEach((it, i) => {
        const cls = state[i] ? '' : 'off';
        parts.push(`<span class="${cls}"><span class="k">## ${esc(it.section)}</span>`);
        (it.body || []).forEach(b => parts.push(`  ${esc(b)}`));
        parts.push(`</span>`);
        if (i < items.length - 1) parts.push('');
      });
      document.getElementById(`sr-${cpId}`).innerHTML = parts.join('\n');
      const on = state.filter(Boolean).length;
      document.getElementById(`sn-${cpId}`).textContent = on;
      document.getElementById(`sb-${cpId}`).style.width = `${Math.round(on/items.length*100)}%`;
      const tier = on >= threshold ? 'strong' : on >= 1 ? 'meh' : 'weak';
      document.getElementById(`st-${cpId}`).textContent = tier;
      if (on >= threshold && !window.Progress.hasCheckpoint(lessonId, cpId)) {
        const xp = window.Progress.markCheckpoint(lessonId, cpId, 'spec');
        if (xp) el.querySelector('.w-xp').classList.add('earned');
      }
    }

    items.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = 'spec-toggle';
      b.type = 'button';
      b.innerHTML = `
        <span class="tog"></span>
        <span class="body">
          <div class="lbl">${esc(it.section)}</div>
          <div class="hint">${esc(it.hint || '')}</div>
        </span>
      `;
      b.addEventListener('click', () => {
        state[i] = !state[i];
        b.classList.toggle('on', state[i]);
        render();
      });
      left.appendChild(b);
    });
    target.replaceWith(el);
    render();
  }

  // ---------------- Terminal demo ----------------
  // A guided replay of what Codex's session actually looks like.
  // frames: array of { line, delay?, cls? (line class), pre? (already rendered lines kept) }
  function Terminal(target, opts) {
    const { lessonId, cpId, title = 'codex@sandbox', frames = [], autorun = false } = opts;
    const el = document.createElement('div');
    el.className = 'w';
    const earned = cpId && window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = `
      <div class="w-head">
        <span class="w-kind">Replay</span>
        <span class="w-title">${esc(opts.heading || 'What Codex actually does')}</span>
        ${cpId ? `<span class="w-xp ${earned?'earned':''}">${earned?'+10 XP ✓':'+10 XP'}</span>` : ''}
      </div>
      <div class="tdemo">
        <div class="tdemo-head">
          <span class="dots"><span></span><span></span><span></span></span>
          <span>${esc(title)}</span>
          <span class="title" id="tb-${cpId || 'x'}">● idle</span>
        </div>
        <div class="tdemo-body" id="tm-${cpId || Math.random().toString(36).slice(2,8)}"></div>
      </div>
      <div class="tdemo-ctrl">
        <button class="btn sm primary" data-run>▶ Run replay</button>
        <button class="btn sm" data-reset>↺ Reset</button>
      </div>
    `;
    const bodyId = el.querySelector('.tdemo-body').id;
    const statusId = el.querySelector('.tdemo-head .title').id;

    function renderLine(frame) {
      const body = document.getElementById(bodyId);
      const line = document.createElement('div');
      line.className = 'tdemo-line' + (frame.cls ? ' ' + frame.cls : '');
      line.innerHTML = frame.line;
      body.appendChild(line);
      body.scrollTop = body.scrollHeight;
    }

    let running = false;
    async function run() {
      if (running) return;
      running = true;
      const body = document.getElementById(bodyId);
      body.innerHTML = '';
      document.getElementById(statusId).innerHTML = '<span style="color:oklch(.82 .15 150)">● running</span>';
      for (const f of frames) {
        renderLine(f);
        await new Promise(r => setTimeout(r, f.delay ?? 450));
      }
      document.getElementById(statusId).innerHTML = '<span style="color:oklch(.72 .14 210)">● done</span>';
      running = false;
      if (cpId) {
        const xp = window.Progress.markCheckpoint(lessonId, cpId, 'terminal');
        if (xp) el.querySelector('.w-xp')?.classList.add('earned');
      }
    }
    function reset() {
      document.getElementById(bodyId).innerHTML = `<div class="tdemo-line dim"><span class="c"># press “Run replay” to watch this session play out</span></div>`;
      document.getElementById(statusId).innerHTML = '● idle';
      running = false;
    }
    el.querySelector('[data-run]').addEventListener('click', run);
    el.querySelector('[data-reset]').addEventListener('click', reset);
    target.replaceWith(el);
    reset();
    if (autorun) setTimeout(run, 500);
  }

  // ---------------- Compare (weak vs strong) ----------------
  function Compare(target, opts) {
    const { bad, good, badLabel = 'Weak prompt', goodLabel = 'Strong prompt' } = opts;
    const el = document.createElement('div');
    el.className = 'w';
    el.innerHTML = `
      <div class="w-head">
        <span class="w-kind">Compare</span>
        <span class="w-title">${esc(opts.title || 'Same ask, two shapes')}</span>
      </div>
      <div class="compare">
        <div class="compare-col bad">
          <div class="ch"><span>${esc(badLabel)}</span><span>✗</span></div>
          <div class="cb">${bad}</div>
        </div>
        <div class="compare-col good">
          <div class="ch"><span>${esc(goodLabel)}</span><span>✓</span></div>
          <div class="cb">${good}</div>
        </div>
      </div>
      ${opts.note ? `<div class="callout" style="margin-top:14px;"><span class="icon">▸</span><div>${opts.note}</div></div>` : ''}
    `;
    target.replaceWith(el);
  }

  // ---------------- Diff ----------------
  function Diff(target, opts) {
    const { file = 'patch.diff', lines = [] } = opts;
    const el = document.createElement('div');
    el.className = 'w';
    const plus = lines.filter(l => l.t === '+').length;
    const minus = lines.filter(l => l.t === '-').length;
    el.innerHTML = `
      <div class="w-head">
        <span class="w-kind">Diff</span>
        <span class="w-title">${esc(opts.title || 'The patch Codex produces')}</span>
      </div>
      <div class="diff">
        <div class="diff-head">
          <span>${esc(file)}</span>
          <span class="stats"><span class="plus">+${plus}</span>  <span class="minus">−${minus}</span></span>
        </div>
        <div class="diff-body"></div>
      </div>
      ${opts.note ? `<div class="small muted" style="margin-top:10px;">${opts.note}</div>` : ''}
    `;
    const body = el.querySelector('.diff-body');
    let n = 1;
    lines.forEach(l => {
      const row = document.createElement('div');
      row.className = 'diff-line' + (l.t === '+' ? ' add' : l.t === '-' ? ' del' : '');
      row.innerHTML = `
        <span class="ln">${l.t === '-' ? '' : n++}</span>
        <span class="pm">${l.t === '+' ? '+' : l.t === '-' ? '−' : ' '}</span>
        <span class="code">${esc(l.s)}</span>
      `;
      body.appendChild(row);
    });
    target.replaceWith(el);
  }

  // ---------------- Flashcards ----------------
  function Flashcards(target, opts) {
    const { lessonId, cpId, cards = [] } = opts;
    const el = document.createElement('div');
    el.className = 'w';
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = `
      <div class="w-head">
        <span class="w-kind">Review</span>
        <span class="w-title">${esc(opts.title || 'Flashcards')}</span>
        <span class="w-xp ${earned?'earned':''}">${earned?'+5 XP ✓':'+5 XP'}</span>
      </div>
      <div class="flashcards">
        <div class="flash-stage" id="fs-${cpId}"></div>
        <div class="flash-ctrl">
          <button class="btn sm" data-prev>← Prev</button>
          <span class="count" id="fc-${cpId}">1 / ${cards.length}</span>
          <button class="btn sm" data-next>Next →</button>
        </div>
      </div>
    `;
    const stage = el.querySelector(`#fs-${cpId}`);
    const counter = el.querySelector(`#fc-${cpId}`);
    let idx = 0;
    const seen = new Set();

    function render() {
      const c = cards[idx];
      stage.innerHTML = `
        <div class="flashcard" tabindex="0">
          <div class="flashcard-face front">
            <div class="term">${esc(c.term || 'Term')}</div>
            <div class="q">${esc(c.q)}</div>
            <div class="hint">Click to reveal ↻</div>
          </div>
          <div class="flashcard-face back">
            <div class="term">Answer</div>
            <div class="a">${c.a}</div>
            <div class="hint">Click to flip back</div>
          </div>
        </div>
      `;
      const card = stage.querySelector('.flashcard');
      card.addEventListener('click', () => card.classList.toggle('flipped'));
      counter.textContent = `${idx+1} / ${cards.length}`;
      seen.add(idx);
      if (seen.size === cards.length) {
        const xp = window.Progress.markCheckpoint(lessonId, cpId, 'flash');
        if (xp) el.querySelector('.w-xp').classList.add('earned');
      }
    }
    el.querySelector('[data-prev]').addEventListener('click', () => { idx = (idx - 1 + cards.length) % cards.length; render(); });
    el.querySelector('[data-next]').addEventListener('click', () => { idx = (idx + 1) % cards.length; render(); });
    target.replaceWith(el);
    render();
  }

  window.W = { Quiz, TaskSpec, Terminal, Compare, Diff, Flashcards };
})();
