/* final.js — final bootstrap + polish layer (loaded last). */


/* ---- extendability_framework (no-op stub) ----
 * Replaced with a no-op because lessons use inline initLesson() calls and the
 * existing progress.js/topbar.js already handle crumbs + progress. */


/* ---- widget_api_normalization ---- */
/* widget_api_normalization */
(function () {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function confettiFrom(anchor, count = 14) {
    if (RM) return;
    const r = anchor.getBoundingClientRect();
    const colors = ['#39aaeb', '#2a7fb8', '#71d184', '#f2c94c'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.style.cssText = `position: fixed; pointer-events: none; z-index: 9999; left: ${r.left + r.width / 2}px; top: ${r.top + r.height / 2}px; width: 6px; height: 10px; background: ${colors[i % colors.length]}; border-radius: 1px; transform: translate(-50%, -50%) rotate(${Math.random() * 360}deg); transition: transform .9s cubic-bezier(.2,.7,.2,1), opacity .9s linear;`;
      document.body.appendChild(p);
      requestAnimationFrame(() => {
        const a = (Math.random() - 0.5) * 2 * Math.PI;
        const d = 80 + Math.random() * 80;
        p.style.transform = `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 40}px)) rotate(${Math.random() * 720}deg)`;
        p.style.opacity = '0';
      });
      setTimeout(() => p.remove(), 950);
    }
  }

  function emitXp() {
    document.dispatchEvent(new CustomEvent('cc:xp'));
  }

  function Quiz(el, opts) {
    let currentOpts = opts;
    let io;

    function render(options) {
      const { lessonId, cpId, question, options: quizOptions, correct, explanation } = options;
      const alreadyEarned = window.Progress.hasCheckpoint(lessonId, cpId);
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      el.innerHTML = `
        <div class="w-head">
          <span class="w-kind">Check</span>
          <span class="w-title">${esc(options.title || 'Quick check')}</span>
          <span class="w-xp ${alreadyEarned ? 'earned' : ''}">${alreadyEarned ? '+15 XP ✓' : '+15 XP'}</span>
        </div>
        <div class="quiz-q">${question}</div>
        <div class="quiz-opts" role="radiogroup"></div>
        <div class="quiz-explanation" style="display:none;" role="alert"></div>
      `;
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', options.title || 'Quick check');

      const optsEl = el.querySelector('.quiz-opts');
      const explEl = el.querySelector('.quiz-explanation');

      quizOptions.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = 'quiz-opt';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', 'false');
        b.innerHTML = `<span class="letter">${letters[i]}</span><span>${o}</span>`;
        b.addEventListener('click', () => answer(i, b));
        optsEl.appendChild(b);
      });

      function answer(i, btn) {
        if (el.dataset.answered) return;
        el.dataset.answered = '1';
        const ok = i === correct;
        btn.classList.add(ok ? 'correct' : 'wrong');
        btn.setAttribute('aria-checked', 'true');
        if (!ok) optsEl.children[correct].classList.add('correct');
        Array.from(optsEl.children).forEach(c => { c.disabled = true; });
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

      const keyHandler = (ev) => {
        if (el.dataset.answered) return;
        const idx = letters.indexOf(ev.key.toUpperCase());
        if (idx >= 0 && idx < quizOptions.length) {
          optsEl.children[idx].focus();
          answer(idx, optsEl.children[idx]);
        }
      };

      io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) document.addEventListener('keydown', keyHandler);
          else document.removeEventListener('keydown', keyHandler);
        });
      });
      io.observe(el);
    }

    function destroy() {
      if (io) io.disconnect();
      el.innerHTML = '';
    }

    function update(newOpts) {
      destroy();
      currentOpts = { ...currentOpts, ...newOpts };
      render(currentOpts);
    }

    render(currentOpts);
    return { destroy, update };
  }

  function Flashcards(el, opts) {
    let currentOpts = opts;
    let idx = 0;
    const seen = new Set();
    let io;

    function render(options) {
        const { lessonId, cpId, cards = [] } = options;
        const earnedAlready = window.Progress.hasCheckpoint(lessonId, cpId);
        const uid = cpId;
        el.innerHTML = `
            <div class="w-head">
                <span class="w-kind">Review</span>
                <span class="w-title">${esc(options.title || 'Flashcards')}</span>
                <span class="w-xp ${earnedAlready ? 'earned' : ''}">${earnedAlready ? '+5 XP ✓' : '+5 XP'}</span>
            </div>
            <div class="flashcards">
                <div class="flash-stage" id="fs-${uid}" aria-live="polite"></div>
                <div class="flash-dots" id="fd-${uid}"></div>
                <div class="flash-ctrl">
                    <button class="btn sm" data-prev aria-label="Previous card">← Prev</button>
                    <span class="count" id="fc-${uid}" aria-live="polite">1 / ${cards.length}</span>
                    <button class="btn sm" data-next aria-label="Next card">Next →</button>
                </div>
            </div>
        `;
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', options.title || 'Flashcards');

        const stage = el.querySelector(`#fs-${uid}`);
        const counter = el.querySelector(`#fc-${uid}`);
        const dots = el.querySelector(`#fd-${uid}`);

        function paintDots() {
            dots.innerHTML = cards.map((_, i) => `<span class="fd ${i === idx ? 'cur' : ''} ${seen.has(i) ? 'seen' : ''}" role="img" aria-label="Card ${i+1} ${i === idx ? 'current' : seen.has(i) ? 'seen' : 'not seen'}"></span>`).join('');
        }

        function paintCard() {
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

        el.querySelector('[data-prev]').addEventListener('click', () => { idx = (idx - 1 + cards.length) % cards.length; paintCard(); });
        el.querySelector('[data-next]').addEventListener('click', () => { idx = (idx + 1) % cards.length; paintCard(); });

        const keyHandler = (ev) => {
            if (ev.key === 'ArrowLeft') el.querySelector('[data-prev]').click();
            else if (ev.key === 'ArrowRight') el.querySelector('[data-next]').click();
        };

        io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) document.addEventListener('keydown', keyHandler);
                else document.removeEventListener('keydown', keyHandler);
            });
        });
        io.observe(el);
        paintCard();
    }

    function destroy() {
        if(io) io.disconnect();
        el.innerHTML = '';
    }

    function update(newOpts) {
        destroy();
        currentOpts = { ...currentOpts, ...newOpts };
        idx = 0;
        seen.clear();
        render(currentOpts);
    }

    render(currentOpts);
    return { destroy, update };
  }

  // Keep other widgets as they are, but wrap them for consistency.
  const originalW = window.W;
  const wrapOriginal = (name) => (el, opts) => {
      const widgetEl = document.createElement('div');
      widgetEl.className = 'w';
      el.appendChild(widgetEl);
      originalW[name](widgetEl, opts);
      return {
          destroy: () => { el.innerHTML = ''; },
          update: (newOpts) => {
              el.innerHTML = '';
              const newEl = document.createElement('div');
              newEl.className = 'w';
              el.appendChild(newEl);
              originalW[name](newEl, { ...opts, ...newOpts });
          }
      };
  };

  const W = {
      Quiz: Quiz,
      Flashcards: Flashcards,
      TaskSpec: wrapOriginal('TaskSpec'),
      Terminal: wrapOriginal('Terminal'),
      Compare: wrapOriginal('Compare'),
      Diff: wrapOriginal('Diff'),
      mount: (root) => {
          (root || document).querySelectorAll('[data-widget]').forEach(el => {
              const name = el.dataset.widget;
              if (W[name]) {
                  try {
                      const opts = JSON.parse(el.dataset.opts || '{}');
                      W[name](el, opts);
                  } catch (e) {
                      console.error(`Failed to mount widget ${name}`, e);
                  }
              }
          });
      }
  };

  window.W = W;

  // Auto-mount widgets on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => W.mount());
  } else {
    W.mount();
  }
})();


/* ---- l04_polish ---- */
/* l04_polish */

(function() {
    if (!window.CX || !window.CX.L04 || typeof window.CX.L04.mount !== 'function') return;
    const originalMount = window.CX.L04.mount;
    window.CX.L04.mount = function(root, ctx) {
        originalMount.call(this, root, ctx);

        const rightPane = root.querySelector('.cx-L04-right-pane');
        const specToggleContainer = document.createElement('div');
        specToggleContainer.className = 'cx-L04-spec-view-toggle-container';
        specToggleContainer.innerHTML = `
            <label class="cx-L04-spec-view-toggle">
                <input type="checkbox">
                <span class="slider"></span>
            </label>
            <span class="label">Raw Spec</span>
        `;
        rightPane.insertBefore(specToggleContainer, rightPane.firstChild);

        const specContent = root.querySelector('.cx-L04-content');
        const checkbox = specToggleContainer.querySelector('input[type="checkbox"]');

        checkbox.addEventListener('change', function() {
            if (this.checked) {
                specContent.classList.add('raw-view');
            } else {
                specContent.classList.remove('raw-view');
            }
        });
    };

    const style = document.createElement('style');
    style.textContent = `
        .cx-L04-spec-view-toggle-container {
            position: absolute;
            top: 12px;
            right: 16px;
            display: flex;
            align-items: center;
            z-index: 10;
        }
        .cx-L04-spec-view-toggle-container .label {
            margin-left: 8px;
            font-size: 0.9em;
            color: var(--ink-2);
        }
        .cx-L04-spec-view-toggle {
            position: relative;
            display: inline-block;
            width: 34px;
            height: 20px;
        }
        .cx-L04-spec-view-toggle input { 
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 20px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 12px;
            width: 12px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: var(--cyan);
        }
        input:checked + .slider:before {
            transform: translateX(14px);
        }
        .cx-L04-content.raw-view .cx-L04-spec-section {
            border-left: none;
            padding-left: 0;
            animation: none;
        }
        .cx-L04-content.raw-view .cx-L04-spec-section h4 {
            display: none;
        }
    `;
    document.head.appendChild(style);
})();
