/*
 * widgets.js — rebuilt for v2 with richer motion & interaction.
 *
 * Each widget mounts into a target element and reports checkpoints to Progress.
 * Widgets exposed on window.W: { Quiz, TaskSpec, Terminal, Compare, Diff, Flashcards }
 *
 * Upgrades over v1:
 *   · Quiz: ripple on wrong, confetti on correct, animated explanation reveal,
 *     keyboard A/B/C/D shortcuts, disabled states with visual finality.
 *   · TaskSpec: toggles animate tick-in, score bar has a "tier glow"
 *     (weak/meh/strong) with color transitions; `+20 XP` badge bursts on threshold.
 *   · Terminal: character-level typewriter playback (not line-level), real
 *     blinking cursor at the tail, scripted pauses, status transitions idle→
 *     running→done with animated dot, scroll-follows, Speed control.
 *   · Compare: hover-highlight emits a subtle cyan outline wave.
 *   · Diff: rows reveal as stagger with left rail animation, hover zooms line.
 *   · Flashcards: spring flip, scan-line sweep on reveal, progress dots, seen
 *     state persists, keyboard ← / → navigation.
 */
(function () {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  /** Fire-and-forget micro confetti from an element. Pure DOM, no libs. */
  function confettiFrom(anchor, count = 14) {
    if (RM) return;
    const r = anchor.getBoundingClientRect();
    const colors = ['#39aaeb', '#2a7fb8', '#71d184', '#f2c94c'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.style.cssText = `
        position: fixed; pointer-events: none; z-index: 9999;
        left: ${r.left + r.width / 2}px;
        top:  ${r.top + r.height / 2}px;
        width: 6px; height: 10px;
        background: ${colors[i % colors.length]};
        border-radius: 1px;
        transform: translate(-50%, -50%) rotate(${Math.random() * 360}deg);
        transition: transform .9s cubic-bezier(.2,.7,.2,1), opacity .9s linear;
      `;
      document.body.appendChild(p);
      requestAnimationFrame(() => {
        const a = (Math.random() - 0.5) * 2 * Math.PI;
        const d = 80 + Math.random() * 80;
        p.style.transform =
          `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 40}px)) rotate(${Math.random() * 720}deg)`;
        p.style.opacity = '0';
      });
      setTimeout(() => p.remove(), 950);
    }
  }

  /** Run a quick XP event on the pill. */
  function emitXp() {
    document.dispatchEvent(new CustomEvent('cc:xp'));
  }

  // ---------------- Quiz ----------------
  function Quiz(target, opts) {
    const { lessonId, cpId, question, options, correct, explanation } = opts;
    const el = document.createElement('div');
    el.className = 'w';
    const alreadyEarned = window.Progress.hasCheckpoint(lessonId, cpId);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
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
      b.addEventListener('click', () => answer(i, b));
      optsEl.appendChild(b);
    });

    function answer(i, btn) {
      if (el.dataset.answered) return;
      el.dataset.answered = '1';
      const ok = i === correct;
      btn.classList.add(ok ? 'correct' : 'wrong');
      if (!ok) optsEl.children[correct].classList.add('correct');
      Array.from(optsEl.children).forEach(c => c.disabled = true);
      explEl.innerHTML = `<b>${ok ? 'Correct.' : 'Not quite.'}</b> ${explanation}`;
      explEl.style.display = 'block';
      if (ok) {
        confettiFrom(el.querySelector('.w-xp'));
        const earned = window.Progress.markCheckpoint(lessonId, cpId, 'quiz');
        if (earned) {
          el.querySelector('.w-xp').classList.add('earned');
          emitXp();
        }
      }
    }

    // keyboard: A / B / C / D when the widget is on screen
    const keyHandler = (ev) => {
      if (el.dataset.answered) return;
      const idx = letters.indexOf(ev.key.toUpperCase());
      if (idx >= 0 && idx < options.length) {
        optsEl.children[idx].focus();
        answer(idx, optsEl.children[idx]);
      }
    };
    // Only bind when the widget is in viewport
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) document.addEventListener('keydown', keyHandler);
        else document.removeEventListener('keydown', keyHandler);
      });
    });
    target.replaceWith(el);
    io.observe(el);
  }

  // ---------------- TaskSpec builder ----------------
  function TaskSpec(target, opts) {
    const { lessonId, cpId, items = [], goal, threshold = 3 } = opts;
    const el = document.createElement('div');
    el.className = 'w';
    const earnedAlready = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = `
      <div class="w-head">
        <span class="w-kind">Drill</span>
        <span class="w-title">${esc(opts.title || 'Build a task spec')}</span>
        <span class="w-xp ${earnedAlready ? 'earned' : ''}">${earnedAlready ? '+20 XP ✓' : '+20 XP'}</span>
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
            <span class="l tier" id="st-${cpId}">weak</span>
          </div>
        </div>
      </div>
    `;
    const left = el.querySelector('.spec-left');
    const state = items.map(() => false);
    let hitThreshold = earnedAlready;

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
      const n = document.getElementById(`sn-${cpId}`);
      n.textContent = on;
      n.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
        { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
      document.getElementById(`sb-${cpId}`).style.width = `${Math.round(on / items.length * 100)}%`;
      const tier = on >= threshold ? 'strong' : on >= 1 ? 'meh' : 'weak';
      const t = document.getElementById(`st-${cpId}`);
      t.textContent = tier;
      t.dataset.tier = tier;
      if (on >= threshold && !hitThreshold) {
        hitThreshold = true;
        confettiFrom(el.querySelector('.w-xp'), 18);
        const xp = window.Progress.markCheckpoint(lessonId, cpId, 'spec');
        if (xp) {
          el.querySelector('.w-xp').classList.add('earned');
          emitXp();
        }
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

  // ---------------- Terminal demo — character-level typewriter ----------------
  function Terminal(target, opts) {
    const { lessonId, cpId, title = 'codex@sandbox', frames = [], autorun = false } = opts;
    const el = document.createElement('div');
    el.className = 'w';
    const earned = cpId && window.Progress.hasCheckpoint(lessonId, cpId);
    const uid = cpId || 'x' + Math.random().toString(36).slice(2, 8);
    el.innerHTML = `
      <div class="w-head">
        <span class="w-kind">Replay</span>
        <span class="w-title">${esc(opts.heading || 'What Codex actually does')}</span>
        ${cpId ? `<span class="w-xp ${earned ? 'earned' : ''}">${earned ? '+10 XP ✓' : '+10 XP'}</span>` : ''}
      </div>
      <div class="tdemo">
        <div class="tdemo-head">
          <span class="dots"><span></span><span></span><span></span></span>
          <span>${esc(title)}</span>
          <span class="title" id="tb-${uid}"><span class="status-dot idle"></span> idle</span>
        </div>
        <div class="tdemo-body" id="tm-${uid}"></div>
      </div>
      <div class="tdemo-ctrl">
        <button class="btn sm primary" data-run>▶ Run replay</button>
        <button class="btn sm" data-reset>↺ Reset</button>
        <span class="tdemo-speed">
          <label class="small muted">speed</label>
          <select data-speed>
            <option value="0.5">0.5×</option>
            <option value="1" selected>1×</option>
            <option value="2">2×</option>
            <option value="4">4×</option>
          </select>
        </span>
      </div>
    `;
    const bodyId = `tm-${uid}`;
    const statusId = `tb-${uid}`;
    let running = false;
    let cancel = false;
    let speed = 1;

    function setStatus(state, label, colorVar) {
      const s = document.getElementById(statusId);
      const color = colorVar || (state === 'running' ? 'oklch(.82 .15 150)'
        : state === 'done' ? 'oklch(.72 .14 210)'
          : state === 'error' ? 'oklch(.6 .18 25)' : 'oklch(.6 .01 240)');
      s.innerHTML = `<span class="status-dot ${state}" style="background:${color};box-shadow:0 0 10px ${color}"></span> ${label}`;
    }

    function typeLine(frame) {
      const body = document.getElementById(bodyId);
      const line = document.createElement('div');
      line.className = 'tdemo-line' + (frame.cls ? ' ' + frame.cls : '');
      body.appendChild(line);
      body.scrollTop = body.scrollHeight;
      const raw = frame.line;
      // Parse the HTML so we can type through the text content while preserving tags.
      const tmp = document.createElement('div');
      tmp.innerHTML = raw;
      const tokens = [];
      function walk(node, parentClass) {
        if (node.nodeType === 3) {
          const text = node.textContent;
          for (let i = 0; i < text.length; i++) tokens.push({ ch: text[i], cls: parentClass });
        } else if (node.nodeType === 1) {
          const cls = node.className || parentClass;
          node.childNodes.forEach(c => walk(c, cls));
          // insert a marker for a closing element so we can flush to DOM cleanly
          tokens.push({ end: true });
        }
      }
      tmp.childNodes.forEach(c => walk(c, null));

      // Render as an accumulating string (simpler & correct for small snippets).
      return new Promise(async (resolve) => {
        const chunks = raw.split(/(<[^>]+>)/); // separate tags from text
        let out = '';
        for (const chunk of chunks) {
          if (cancel) { line.innerHTML = raw; break; }
          if (chunk.startsWith('<')) {
            out += chunk;
            line.innerHTML = out;
            continue;
          }
          // per-character type
          for (let i = 0; i < chunk.length; i++) {
            if (cancel) { line.innerHTML = raw; break; }
            out += chunk[i];
            line.innerHTML = out + '<span class="type-caret">▍</span>';
            // fast "typing" — small jitter for realism
            const dur = RM ? 0 : (8 + Math.random() * 10) / speed;
            await new Promise(r => setTimeout(r, dur));
          }
          if (cancel) break;
        }
        line.innerHTML = raw;
        body.scrollTop = body.scrollHeight;
        resolve();
      });
    }

    async function run() {
      if (running) return;
      running = true; cancel = false;
      const body = document.getElementById(bodyId);
      body.innerHTML = '';
      setStatus('running', 'running');
      for (const f of frames) {
        await typeLine(f);
        if (cancel) break;
        await new Promise(r => setTimeout(r, (f.delay ?? 200) / speed));
      }
      if (!cancel) {
        setStatus('done', 'done');
        if (cpId) {
          const xp = window.Progress.markCheckpoint(lessonId, cpId, 'terminal');
          if (xp) {
            el.querySelector('.w-xp')?.classList.add('earned');
            confettiFrom(el.querySelector('.w-xp') || el, 10);
            emitXp();
          }
        }
      }
      running = false;
    }
    function reset() {
      cancel = true;
      const body = document.getElementById(bodyId);
      body.innerHTML = `<div class="tdemo-line dim"><span class="c"># press "Run replay" to watch this session play out</span></div>`;
      setStatus('idle', 'idle');
      running = false;
    }
    el.querySelector('[data-run]').addEventListener('click', run);
    el.querySelector('[data-reset]').addEventListener('click', reset);
    el.querySelector('[data-speed]').addEventListener('change', (e) => {
      speed = parseFloat(e.target.value) || 1;
    });

    target.replaceWith(el);
    reset();
    if (autorun) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { run(); io.disconnect(); }
        });
      }, { threshold: 0.4 });
      io.observe(el);
    }
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
    const earnedAlready = window.Progress.hasCheckpoint(lessonId, cpId);
    const uid = cpId;
    el.innerHTML = `
      <div class="w-head">
        <span class="w-kind">Review</span>
        <span class="w-title">${esc(opts.title || 'Flashcards')}</span>
        <span class="w-xp ${earnedAlready ? 'earned' : ''}">${earnedAlready ? '+5 XP ✓' : '+5 XP'}</span>
      </div>
      <div class="flashcards">
        <div class="flash-stage" id="fs-${uid}"></div>
        <div class="flash-dots" id="fd-${uid}"></div>
        <div class="flash-ctrl">
          <button class="btn sm" data-prev aria-label="Previous card">← Prev</button>
          <span class="count" id="fc-${uid}">1 / ${cards.length}</span>
          <button class="btn sm" data-next aria-label="Next card">Next →</button>
        </div>
      </div>
    `;
    const stage = el.querySelector(`#fs-${uid}`);
    const counter = el.querySelector(`#fc-${uid}`);
    const dots = el.querySelector(`#fd-${uid}`);
    let idx = 0;
    const seen = new Set();

    function paintDots() {
      dots.innerHTML = cards.map((_, i) => `<span class="fd ${i === idx ? 'cur' : ''} ${seen.has(i) ? 'seen' : ''}"></span>`).join('');
    }
    function render() {
      const c = cards[idx];
      stage.innerHTML = `
        <div class="flashcard" tabindex="0" role="button" aria-label="Flashcard ${idx + 1} of ${cards.length}. Press Space or click to flip.">
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
      card.addEventListener('click', () => {
        card.classList.toggle('flipped');
        card.classList.add('flipping');
        setTimeout(() => card.classList.remove('flipping'), 620);
      });
      card.addEventListener('keydown', (ev) => {
        if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); card.click(); }
      });
      counter.textContent = `${idx + 1} / ${cards.length}`;
      seen.add(idx);
      paintDots();
      if (seen.size === cards.length) {
        const xp = window.Progress.markCheckpoint(lessonId, cpId, 'flash');
        if (xp) {
          el.querySelector('.w-xp').classList.add('earned');
          confettiFrom(el.querySelector('.w-xp'), 8);
          emitXp();
        }
      }
    }

    el.querySelector('[data-prev]').addEventListener('click', () => { idx = (idx - 1 + cards.length) % cards.length; render(); });
    el.querySelector('[data-next]').addEventListener('click', () => { idx = (idx + 1) % cards.length; render(); });

    // Keyboard navigation when visible
    const keyHandler = (ev) => {
      if (ev.key === 'ArrowLeft') el.querySelector('[data-prev]').click();
      else if (ev.key === 'ArrowRight') el.querySelector('[data-next]').click();
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) document.addEventListener('keydown', keyHandler);
        else document.removeEventListener('keydown', keyHandler);
      });
    });
    target.replaceWith(el);
    io.observe(el);
    render();
  }

  window.W = { Quiz, TaskSpec, Terminal, Compare, Diff, Flashcards };
})();
