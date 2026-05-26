// Lesson-init: mounts topbar, TOC, scroll-spy, lesson footer
(function () {
  function mountTOC(sections) {
    const wrap = document.getElementById('toc');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="toc-head">Contents</div>
      <ul>
        ${sections.map((s, i) => `
          <li><a href="#${s.id}" data-toc="${s.id}"><span class="n">${String(i+1).padStart(2,'0')}</span>${s.label}</a></li>
        `).join('')}
      </ul>
    `;
    const links = Array.from(wrap.querySelectorAll('a'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          links.forEach(a => a.classList.toggle('active', a.dataset.toc === id));
        }
      });
    }, { rootMargin: '-30% 0% -60% 0%' });
    sections.forEach(s => {
      const t = document.getElementById(s.id);
      if (t) io.observe(t);
    });
  }

  function mountLessonFoot(lessonId) {
    const container = document.getElementById('lesson-footer');
    if (!container) return;
    const lessons = window.LESSONS || [];
    const idx = lessons.findIndex(l => l.id === lessonId);
    const prev = idx > 0 ? lessons[idx - 1] : null;
    const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;
    container.innerHTML = `
      <div class="lesson-foot">
        ${prev ? `<a href="../${prev.file}">
          <span class="dir">← ${prev.n} Previous</span>
          <span class="title">${prev.title}</span>
        </a>` : `<div></div>`}
        ${next ? `<a href="../${next.file}" class="next">
          <span class="dir">${next.n} Next →</span>
          <span class="title">${next.title}</span>
        </a>` : `<a href="../index.html" class="next">
          <span class="dir">Back to course →</span>
          <span class="title">You finished. Legend.</span>
        </a>`}
      </div>
      <div style="margin-top:24px; text-align:center;">
        <button class="btn primary" id="btn-complete">Mark lesson complete (+25 XP)</button>
      </div>
    `;
    const btn = container.querySelector('#btn-complete');
    const lesson = window.Progress.getLesson(lessonId);
    if (lesson.completed) {
      btn.textContent = '✓ Lesson complete';
      btn.disabled = true;
      btn.style.opacity = '0.7';
    }
    btn.addEventListener('click', () => {
      if (window.Progress.markLessonDone(lessonId)) {
        btn.textContent = '✓ Lesson complete';
        btn.disabled = true;
      }
    });
  }

  window.initLesson = function (lessonId, sections) {
    mountTopbar({ lesson: true });
    mountTOC(sections);
    mountLessonFoot(lessonId);
  };
})();
