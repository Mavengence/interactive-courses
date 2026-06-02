// ========================================================================
// prod.js — production polish overlay
// Runs AFTER motion.js and after any dynamic HTML is built.
// Responsibilities:
//   1. Neutralize tilt/confetti/small-celebration handlers from motion.js + widgets.js
//   2. Rebuild the topbar to a clean professional layout (brand + crumb + outline btn + progress)
//   3. Render the slide-in Outline drawer showing the full course tree
//   4. Sweep language: "XP" → "completed", "Earn +NN XP" → removed, "Badges"/"locked" cleanup
//   5. Auto-mark lesson completion at 90% scroll; replace the giant button with a quiet link
//   6. Install the single reading-progress bar
// ========================================================================

(function () {
  'use strict';

  const doc = document;
  const win = window;

  // ---------- helpers ----------
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || doc).querySelectorAll(sel)); }
  function ready(fn) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function isLessonPage() {
    return /\/lessons\//.test(location.pathname);
  }
  function pathPrefix() { return isLessonPage() ? '../' : ''; }

  // ---------- 1. Neutralize noisy motion handlers ----------
  function neutralizeNoise() {
    // Strip data-tilt so motion.js tilt can't attach.
    $$('[data-tilt]').forEach(el => el.removeAttribute('data-tilt'));

    // Suppress the global confetti unless opted into via ctx.allowConfetti.
    if (win.CX && typeof win.CX.confetti === 'function' && !win.CX.__confettiShimmed) {
      const original = win.CX.confetti;
      win.CX.confetti = function (opts) {
        if (opts && opts.force) return original.apply(this, arguments);
        // Swallow all small celebrations.
        return;
      };
      win.CX.__confettiShimmed = true;
    }

    // Remove the floating XP toast event if it exists.
    doc.addEventListener('cc:xp-gained', (e) => {
      e.stopImmediatePropagation();
    }, true);
  }

  // ---------- 2. Rebuild topbar ----------
  function rebuildTopbar() {
    const existing = $('.topbar');
    if (existing) existing.remove();

    const prefix = pathPrefix();
    const bar = doc.createElement('div');
    bar.className = 'topbar';

    // Current lesson crumb (only on lesson pages)
    const currentCrumb = (function () {
      if (!isLessonPage()) return '';
      const slug = location.pathname.split('/').pop().replace('.html', '');
      const lesson = (win.LESSONS || []).find(l => slug === l.file.split('/').pop().replace('.html', '') || slug.startsWith(l.n) || slug.includes(l.id));
      if (!lesson) return '';
      const track = (win.TRACKS || []).find(t => t.id === lesson.track);
      const trackLabel = track ? track.label.split('—')[0].trim() : '';
      return `<span class="tb-crumb">${trackLabel} · Lesson ${lesson.n}</span>`;
    })();

    const progress = getProgressSummary();

    // Back to the catalogue (repo root). Resolves at repo-root and under /interactive-courses/.
    const catalogueHref = isLessonPage() ? '../../' : '../';

    bar.innerHTML = `
      <div class="topbar-inner">
        <a class="topbar-back" href="${catalogueHref}" aria-label="Back to all courses">
          <span class="tb-arrow" aria-hidden="true">&larr;</span><span class="tb-back-label">All courses</span>
        </a>
        <a class="brand" href="${prefix}index.html" aria-label="Codex Course — home">
          <span class="mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22">
              <polyline class="mk-caret" points="6,6 12,11 6,16"/>
              <line class="mk-bar" x1="13" y1="16" x2="17" y2="16"/>
            </svg>
          </span>
          <span class="brand-word">
            <span class="brand-word-1">codex course</span>
            <span class="brand-tagline">a terminal-first playbook</span>
          </span>
        </a>
        ${currentCrumb}
        <nav>
          <button class="btn-outline-trigger" type="button" aria-label="Open course outline">Outline</button>
          <a href="${prefix}index.html" class="tb-home">Home</a>
          <span class="progress-badge${progress.done > 0 ? ' has-progress' : ''}">${progress.done} / ${progress.total} completed</span>
        </nav>
      </div>
    `;
    doc.body.prepend(bar);

    bar.querySelector('.btn-outline-trigger').addEventListener('click', openOutlineDrawer);
    // Update badge when progress changes.
    doc.addEventListener('cc:progress', () => {
      const p = getProgressSummary();
      const b = $('.topbar .progress-badge');
      if (b) {
        b.textContent = `${p.done} / ${p.total} completed`;
        b.classList.toggle('has-progress', p.done > 0);
      }
    });
  }

  function getProgressSummary() {
    const total = (win.LESSONS || []).length || 12;
    let done = 0;
    if (win.Progress && typeof win.Progress.countCompleted === 'function') {
      done = win.Progress.countCompleted();
    }
    return { done, total };
  }

  // ---------- 3. Outline drawer ----------
  let drawerEl, backdropEl;
  function buildOutlineDrawer() {
    if (drawerEl) return;
    backdropEl = doc.createElement('div');
    backdropEl.className = 'outline-drawer-backdrop';
    backdropEl.addEventListener('click', closeOutlineDrawer);
    doc.body.appendChild(backdropEl);

    drawerEl = doc.createElement('aside');
    drawerEl.className = 'outline-drawer';
    drawerEl.setAttribute('role', 'dialog');
    drawerEl.setAttribute('aria-label', 'Course outline');
    drawerEl.innerHTML = `
      <div class="od-head">
        <h3>Course outline</h3>
        <button class="od-close" type="button" aria-label="Close">esc</button>
      </div>
      <div class="od-body"></div>
    `;
    doc.body.appendChild(drawerEl);
    drawerEl.querySelector('.od-close').addEventListener('click', closeOutlineDrawer);
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawerEl.classList.contains('open')) closeOutlineDrawer();
    });

    renderOutlineDrawerContents();
  }

  function renderOutlineDrawerContents() {
    const body = drawerEl.querySelector('.od-body');
    const tracks = win.TRACKS || [];
    const lessons = win.LESSONS || [];
    const prefix = pathPrefix();
    const currentSlug = isLessonPage() ? location.pathname.split('/').pop() : null;

    body.innerHTML = tracks.map(track => {
      const items = lessons.filter(l => l.track === track.id);
      return `
        <div class="od-track">
          <div class="od-track-tag">${track.label}</div>
          <div class="od-track-title">${track.title}</div>
          <div class="od-lessons">
            ${items.map(l => {
              const slug = l.file.split('/').pop();
              const href = prefix + l.file;
              const isCurrent = currentSlug && currentSlug === slug;
              const isDone = win.Progress && win.Progress.isDone && win.Progress.isDone(l.id);
              return `
                <a class="od-lesson${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}" href="${href}">
                  <span class="od-lesson-num">${l.n}</span>
                  <span class="od-lesson-title">${l.title}</span>
                  <span class="od-lesson-meta">${l.time}</span>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function openOutlineDrawer() {
    if (!drawerEl) buildOutlineDrawer();
    renderOutlineDrawerContents();
    requestAnimationFrame(() => {
      backdropEl.classList.add('open');
      drawerEl.classList.add('open');
    });
  }
  function closeOutlineDrawer() {
    if (!drawerEl) return;
    backdropEl.classList.remove('open');
    drawerEl.classList.remove('open');
  }

  // ---------- 4. Language sweep ----------
  function sweepLanguage() {
    // Replace "+NN XP" fragments with nothing.
    $$('.xp-tag, .plus-xp, [data-xp-label]').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });

    // Body text replacements (only replace text nodes — don't touch input/code).
    const SKIP = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'INPUT', 'TEXTAREA']);
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (SKIP.has(node.parentNode.nodeName)) return NodeFilter.FILTER_REJECT;
        const t = node.nodeValue;
        if (!t || !/\+\s*\d+\s*XP|Earn\s*\+?\d*\s*XP|Mark\s+lesson\s+complete|Try it:\s*bespoke interactive|Badges for the twelve lessons/.test(t)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const toReplace = [];
    while (walker.nextNode()) toReplace.push(walker.currentNode);
    toReplace.forEach(node => {
      let s = node.nodeValue;
      s = s.replace(/\s*\(?\+\s*\d+\s*XP\)?/g, '');
      s = s.replace(/Earn\s*\+?\d+\s*XP/gi, '');
      s = s.replace(/Mark\s+lesson\s+complete\s*/gi, 'Mark as completed');
      s = s.replace(/Try it:\s*bespoke interactive/gi, 'Practice');
      s = s.replace(/Badges for the twelve lessons\./gi, 'Your progress.');
      node.nodeValue = s;
    });

    // Replace locked-badge labels.
    $$('.badge .hint').forEach(el => {
      if (/locked/i.test(el.textContent)) {
        el.textContent = 'not started';
      } else if (/earned/i.test(el.textContent)) {
        el.textContent = 'completed';
      }
    });
  }

  // ---------- 5. Completion flow on lesson pages ----------
  function installLessonCompletion() {
    if (!isLessonPage()) return;

    // Find the existing "Mark lesson complete" button/link.
    const existingBtn = $$('button, a').find(el => /mark\s*(lesson\s*)?complet/i.test(el.textContent));

    // Resolve the current lesson id.
    const slug = location.pathname.split('/').pop();
    const lesson = (win.LESSONS || []).find(l => l.file.split('/').pop() === slug);
    if (!lesson) return;

    // Build replacement link.
    const link = doc.createElement('button');
    link.type = 'button';
    link.className = 'completion-link';
    link.textContent = win.Progress && win.Progress.isDone && win.Progress.isDone(lesson.id)
      ? 'Completed'
      : 'Mark as completed';
    if (link.textContent === 'Completed') link.classList.add('completed');

    link.addEventListener('click', () => {
      if (link.classList.contains('completed')) return;
      if (win.Progress && win.Progress.markLessonDone) {
        win.Progress.markLessonDone(lesson.id);
      }
      link.textContent = 'Completed';
      link.classList.add('completed');
      doc.dispatchEvent(new CustomEvent('cc:progress'));
    });

    if (existingBtn) {
      existingBtn.replaceWith(link);
    } else {
      // Inject at the end of lesson content.
      const host = $('.lesson-footer, .next-lesson, main') || doc.body;
      const wrap = doc.createElement('div');
      wrap.style.cssText = 'display:flex;gap:12px;margin:24px 0;align-items:center;flex-wrap:wrap;';
      wrap.appendChild(link);
      host.appendChild(wrap);
    }

    // Auto-mark on 90% scroll.
    let marked = win.Progress && win.Progress.isDone && win.Progress.isDone(lesson.id);
    win.addEventListener('scroll', () => {
      if (marked) return;
      const h = doc.documentElement;
      const progress = (h.scrollTop + h.clientHeight) / h.scrollHeight;
      if (progress > 0.9) {
        marked = true;
        if (win.Progress && win.Progress.markLessonDone) win.Progress.markLessonDone(lesson.id);
        link.textContent = 'Completed';
        link.classList.add('completed');
        doc.dispatchEvent(new CustomEvent('cc:progress'));
      }
    }, { passive: true });
  }

  // ---------- 6. Reading progress bar ----------
  function installReadingProgress() {
    if (!isLessonPage()) return;
    if ($('#reading-progress')) return;
    const rp = doc.createElement('div');
    rp.id = 'reading-progress';
    rp.innerHTML = '<div class="rp-bar"></div>';
    doc.body.appendChild(rp);
    const bar = rp.querySelector('.rp-bar');
    win.addEventListener('scroll', () => {
      const h = doc.documentElement;
      const pct = Math.min(100, Math.max(0, (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100));
      bar.style.width = pct + '%';
    }, { passive: true });
  }

  // ---------- 7. Homepage: build the unified Course Outline ----------
  function buildCourseOutline() {
    if (isLessonPage()) return;
    const tracksOut = $('#tracks-out');
    const tracksSection = $('.tracks');
    if (!tracksSection) return;

    const tracks = win.TRACKS || [];
    const lessons = win.LESSONS || [];

    // Replace the .tracks section's contents with the unified outline.
    const container = tracksSection.querySelector('.container');
    if (!container) return;
    container.innerHTML = `
      <div class="outline-head">
        <span class="eyebrow">/ the course</span>
        <h2>Four tracks. Twelve lessons. Work in order the first time.</h2>
        <p>Each track builds on the last. Come back to individual lessons as references when you're mid-task and something isn't landing.</p>
      </div>
      <div class="course-outline-body"></div>
    `;
    tracksSection.classList.add('course-outline');
    const body = container.querySelector('.course-outline-body');

    tracks.forEach(track => {
      const items = lessons.filter(l => l.track === track.id);
      const done = items.filter(l => win.Progress && win.Progress.isDone && win.Progress.isDone(l.id)).length;
      body.insertAdjacentHTML('beforeend', `
        <div class="track-block">
          <div class="track-meta">
            <div class="track-tag">${track.label}</div>
            <h3>${track.title}</h3>
            <p>${track.hint}</p>
            <div class="track-status">${done} / ${items.length} completed</div>
          </div>
          <div class="lesson-list">
            ${items.map(l => {
              const isDone = win.Progress && win.Progress.isDone && win.Progress.isDone(l.id);
              return `
                <a class="lesson-row${isDone ? ' done' : ''}" href="${l.file}">
                  <span class="lr-num">${l.n}</span>
                  <span class="lr-body">
                    <span class="lr-title">${l.title}</span>
                    <span class="lr-sub">${l.sub}</span>
                  </span>
                  <span class="lr-meta">
                    <span>${l.time}</span>
                  </span>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `);
    });
  }

  // ---------- orchestrator ----------
  ready(() => {
    // Order matters: neutralize first so motion handlers don't get to attach.
    neutralizeNoise();
    rebuildTopbar();
    buildCourseOutline();
    installReadingProgress();
    installLessonCompletion();
    // Language sweep last so it also hits the newly built outline.
    sweepLanguage();
    // Re-sweep after a tick in case widgets render async.
    setTimeout(sweepLanguage, 350);
    setTimeout(neutralizeNoise, 350);
  });
})();
