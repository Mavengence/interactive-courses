// Topbar — brand + nav + xp pill
(function () {
  function mountTopbar(opts = {}) {
    const xp = window.Progress?.getXP() || 0;
    const isLesson = !!opts.lesson;
    const pathPrefix = isLesson ? '../' : '';
    // Back to the catalogue (repo root). Works at repo-root and under /interactive-courses/.
    const catalogueHref = location.pathname.includes('/lessons/') ? '../../' : '../';
    const el = document.createElement('div');
    el.className = 'topbar';
    el.innerHTML = `
      <div class="topbar-inner">
        <a class="topbar-back" href="${catalogueHref}" aria-label="Back to all courses">
          <span class="tb-arrow" aria-hidden="true">&larr;</span><span class="tb-back-label">All courses</span>
        </a>
        <a class="brand" href="${pathPrefix}index.html" aria-label="Codex Course — home">
          <span class="mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22">
              <polyline class="mk-caret" points="6,6 12,11 6,16"/>
              <line class="mk-bar" x1="13" y1="16" x2="17" y2="16"/>
            </svg>
          </span>
          <span class="brand-word">
            <span class="brand-lockup">
              <span class="brand-word-1">codex</span>
              <span class="brand-divider" aria-hidden="true"></span>
              <span class="brand-word-2" aria-label="Course">
                <span>C</span><span>O</span><span>U</span><span>R</span><span>S</span><span>E</span>
              </span>
            </span>
            <span class="brand-tagline">a terminal-first playbook</span>
          </span>
        </a>
        <nav>
          <a href="${pathPrefix}index.html#tracks">Lessons</a>
          <a href="${pathPrefix}index.html#badges">Progress</a>
        </nav>
        <span class="xp-pill" title="Total XP earned">
          <span class="spark"></span>
          <b id="xp-count">${xp}</b> XP
        </span>
      </div>
    `;
    document.body.prepend(el);

    document.addEventListener('cc:xp', (ev) => {
      const c = document.getElementById('xp-count');
      const total = ev.detail && ev.detail.total;
      if (c && total != null) c.textContent = total;
    });
  }
  window.mountTopbar = mountTopbar;
})();
