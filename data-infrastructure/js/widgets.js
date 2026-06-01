// Widgets — vanilla JS. Quiz + Flashcards.
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
        <div class="flashcard" tabindex="0" role="button" aria-pressed="false"
             aria-label="Flashcard ${idx+1} of ${cards.length}. Activate to reveal the answer.">
          <div class="flashcard-face front">
            <div class="term">${esc(c.term || 'Term')}</div>
            <div class="q">${esc(c.q)}</div>
            <div class="hint">Click or press Enter to reveal ↻</div>
          </div>
          <div class="flashcard-face back">
            <div class="term">Answer</div>
            <div class="a">${c.a}</div>
            <div class="hint">Click or press Enter to flip back</div>
          </div>
        </div>
      `;
      const card = stage.querySelector('.flashcard');
      const flip = () => {
        const flipped = card.classList.toggle('flipped');
        card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
      };
      card.addEventListener('click', flip);
      card.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
          ev.preventDefault();
          flip();
        }
      });
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

  window.W = { Quiz, Flashcards };
})();
