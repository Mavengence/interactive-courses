// Topbar — brand + nav + xp pill
(function () {
  let xpListenerAttached = false;

  function mountTopbar(opts = {}) {
    // Guard against mounting more than once
    if (document.querySelector('.topbar')) return;

    const xp = window.Progress?.getXP() || 0;
    const isLesson = !!opts.lesson;
    const pathPrefix = isLesson ? '../' : '';
    // Back to the course catalogue. Resolve relative to the repo root so it works
    // both locally (served at root) and on Pages under /interactive-courses/.
    // Lesson pages live one level deeper, so they need an extra '../'.
    const catalogueHref = location.pathname.includes('/lessons/') ? '../../' : '../';
    const el = document.createElement('div');
    el.className = 'topbar';
    el.innerHTML = `
      <div class="topbar-inner">
        <a class="brand" href="${pathPrefix}index.html" aria-label="data INFRA — home">
          <span class="mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22">
              <polyline class="mk-caret" points="6,6 12,11 6,16"/>
              <line class="mk-bar" x1="13" y1="16" x2="17" y2="16"/>
            </svg>
          </span>
          <span class="brand-word">
            <span class="brand-lockup">
              <span class="brand-word-1">data</span>
              <span class="brand-divider" aria-hidden="true"></span>
              <span class="brand-word-2" aria-label="Infra">
                <span>I</span><span>N</span><span>F</span><span>R</span><span>A</span>
              </span>
            </span>
            <span class="brand-tagline">a senior-IC playbook</span>
          </span>
        </a>
        <a class="topbar-back" href="${catalogueHref}" aria-label="Back to all courses">
          <span class="tb-arrow" aria-hidden="true">←</span><span class="tb-label-full"> All courses</span><span class="tb-label-short"> Courses</span>
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

    if (!xpListenerAttached) {
      xpListenerAttached = true;
      document.addEventListener('cc:xp', (ev) => {
        const c = document.getElementById('xp-count');
        if (c) c.textContent = ev.detail.total;
      });
    }
  }
  window.mountTopbar = mountTopbar;
})();
