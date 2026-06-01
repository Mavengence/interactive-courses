// Shared lesson bootstrap. Each lesson HTML just sets a data-lesson-id and calls initLesson(sections).
(function(){
  function initLesson(lessonId, sections) {
    // Topbar
    const topbar = window.renderTopbar(lessonId);
    document.body.insertBefore(topbar, document.body.firstChild);

    // Sidebar TOC
    const sb = document.getElementById('toc');
    if (sb) {
      sb.innerHTML = `<div class="tiny">In this lesson</div><ol>${sections.map((s,i)=>`<li data-sec="${s.id}">${s.label}</li>`).join('')}</ol>`;
      sb.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
          const id = li.getAttribute('data-sec');
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      // Active-section highlight — pick the section whose top is closest to (but above) the scroll line
      const links = [...sb.querySelectorAll('li')];
      const els = sections.map(s => document.getElementById(s.id)).filter(Boolean);
      const setActive = () => {
        const line = window.scrollY + 140; // active when section top crosses this
        let activeId = els[0]?.id;
        for (const el of els) {
          if (el.offsetTop <= line) activeId = el.id;
          else break;
        }
        links.forEach(l => l.classList.toggle('active', l.getAttribute('data-sec') === activeId));
      };
      setActive();
      window.addEventListener('scroll', setActive, { passive: true });
      window.addEventListener('resize', setActive);
    }

    // Lesson-complete footer
    const footer = document.getElementById('lesson-footer');
    if (footer) {
      const lessons = window.LESSONS;
      const idx = lessons.findIndex(l => l.id === lessonId);
      const prev = lessons[idx - 1]; const next = lessons[idx + 1];
      const renderFooter = () => {
        const s = window.CourseProgress.get();
        const done = !!s.completed[lessonId];
        footer.innerHTML = `
          <div class="lesson-footer">
            <div>
              <h3>${done ? "You finished this lesson." : "Mark this lesson complete?"}</h3>
              <div class="small" style="margin-top:4px;">${done ? 'You can re-run the interactives any time.' : 'Claim your XP and move on.'}</div>
            </div>
            <button class="btn ${done?'ghost':'amber'}" id="complete-btn" ${done?'disabled':''}>
              ${done ? '✓ Lesson complete' : 'Mark lesson complete · +25 XP'}
            </button>
          </div>
          <div class="nav-prev-next">
            ${prev ? `<a href="${prev.id === lessonId ? '#' : prev.id}.html"><div class="tiny">← previous</div><div class="title">${prev.num} · ${prev.title}</div></a>` : `<a href="../index.html"><div class="tiny">← back</div><div class="title">Course map</div></a>`}
            ${next ? `<a class="next" href="${next.id === lessonId ? '#' : next.id}.html"><div class="tiny">next →</div><div class="title">${next.num} · ${next.title}</div></a>` : `<a class="next" href="../index.html"><div class="tiny">done →</div><div class="title">Course map</div></a>`}
          </div>
        `;
        // Fix relative links
        footer.querySelectorAll('a[href$=".html"]').forEach(a => {
          const href = a.getAttribute('href');
          const match = lessons.find(l => href.startsWith(l.id));
          if (match) a.setAttribute('href', match.file.replace('lessons/',''));
        });
        document.getElementById('complete-btn')?.addEventListener('click', () => {
          window.CourseProgress.completeLesson(lessonId, 25);
          renderFooter();
        });
      };
      renderFooter();
    }
  }
  window.initLesson = initLesson;
})();
