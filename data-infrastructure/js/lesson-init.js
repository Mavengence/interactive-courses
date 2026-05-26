// Lesson-init: mounts topbar, TOC, scroll-spy, lesson footer
(function () {
  function mountTOC(sections) {
    const wrap = document.getElementById('toc');
    if (!wrap) return;
    // Convert legacy left-rail aside into a horizontal sticky strip placed
    // above the lesson body (below the topbar).
    wrap.classList.remove('lesson-sidebar');
    wrap.classList.add('lesson-subnav');
    wrap.innerHTML = `
      <div class="lesson-subnav-inner">
        <div class="subnav-track">
          ${sections.map((s, i) => `
            <a href="#${s.id}" data-toc="${s.id}" class="subnav-pill">
              <span class="n">${String(i+1).padStart(2,'0')}</span>
              <span class="lbl">${s.label}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
    // Move the strip out of .lesson-body so it spans full container width
    const body = document.querySelector('.lesson-body');
    if (body && wrap.parentElement === body) {
      const container = body.closest('.container') || body.parentElement;
      container.insertBefore(wrap, body);
    }
    const links = Array.from(wrap.querySelectorAll('a'));
    // Active pill auto-scrolls into view in the horizontal track
    const track = wrap.querySelector('.subnav-track');
    function scrollPillIntoView(pill) {
      if (!track || !pill) return;
      const tRect = track.getBoundingClientRect();
      const pRect = pill.getBoundingClientRect();
      if (pRect.left < tRect.left + 24) {
        track.scrollBy({ left: pRect.left - tRect.left - 24, behavior: 'smooth' });
      } else if (pRect.right > tRect.right - 24) {
        track.scrollBy({ left: pRect.right - tRect.right + 24, behavior: 'smooth' });
      }
    }
    // re-bind active class with our new logic that also nudges the track
    function setActive(id) {
      links.forEach(a => {
        const on = a.dataset.toc === id;
        a.classList.toggle('active', on);
        if (on) scrollPillIntoView(a);
      });
    }
    // Smooth-scroll on click
    links.forEach(a => {
      a.addEventListener('click', (e) => {
        const target = document.getElementById(a.dataset.toc);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setActive(e.target.id);
        }
      });
    }, { rootMargin: '-20% 0% -70% 0%' });
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
    if (!btn) return;
    const progress = window.Progress;
    if (progress) {
      const lesson = progress.getLesson(lessonId);
      if (lesson && lesson.completed) {
        btn.textContent = '✓ Lesson complete';
        btn.disabled = true;
        btn.style.opacity = '0.7';
      }
    }
    btn.addEventListener('click', () => {
      if (window.Progress && window.Progress.markLessonDone(lessonId)) {
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
