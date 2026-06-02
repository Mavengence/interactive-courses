// Renders the shared topbar. Call window.renderTopbar('lesson-id' or null).
(function(){
  function renderTopbar(currentId) {
    // Determine path prefix by where the HTML actually lives, not which id was passed.
    // Anything under /lessons/ needs '../'; everything at the root uses ''.
    const inSub = /\/lessons\//.test(location.pathname);
    const up = inSub ? '../' : '';
    // Catalogue (course list) lives one level above the course root:
    //   course index  (<KEY>/index.html)      -> '../'
    //   lesson page    (<KEY>/lessons/*.html)  -> '../../'
    const catalogue = up + '../';
    const bar = document.createElement('div');
    bar.className = 'topbar';
    const state = window.CourseProgress ? window.CourseProgress.get() : { xp: 0, streak: { days: 0 } };
    bar.innerHTML = `
      <div class="topbar-inner">
        <a href="${up}index.html" class="brand" aria-label="Claude Course home">
          <span class="mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="38" height="38">
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"   stop-color="#e8924a"/>
                  <stop offset="100%" stop-color="#a84a15"/>
                </linearGradient>
                <linearGradient id="brandGradLight" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"   stop-color="#f3b377"/>
                  <stop offset="100%" stop-color="#d07a3a"/>
                </linearGradient>
              </defs>
              <!-- outer ring (subtle) -->
              <circle class="mk-ring" cx="20" cy="20" r="18.5"
                      fill="none" stroke="url(#brandGradLight)" stroke-width="1" opacity=".4"/>

              <!-- 8-point compass rose built as one solid star shape -->
              <!-- Cardinal points: N, E, S, W (long + pointed) each as 2-tone kite -->
              <g class="mk-rose-hover">
              <g class="mk-rose">
                <!-- NORTH -->
                <path class="mk-pt mk-n-l" d="M20 2.5 L20 20 L15.5 18 Z" fill="url(#brandGradLight)"/>
                <path class="mk-pt mk-n-r" d="M20 2.5 L20 20 L24.5 18 Z" fill="url(#brandGrad)"/>
                <!-- EAST -->
                <path class="mk-pt mk-e-l" d="M37.5 20 L20 20 L22 15.5 Z" fill="url(#brandGradLight)"/>
                <path class="mk-pt mk-e-r" d="M37.5 20 L20 20 L22 24.5 Z" fill="url(#brandGrad)"/>
                <!-- SOUTH -->
                <path class="mk-pt mk-s-l" d="M20 37.5 L20 20 L24.5 22 Z" fill="url(#brandGradLight)"/>
                <path class="mk-pt mk-s-r" d="M20 37.5 L20 20 L15.5 22 Z" fill="url(#brandGrad)"/>
                <!-- WEST -->
                <path class="mk-pt mk-w-l" d="M2.5 20 L20 20 L18 24.5 Z" fill="url(#brandGradLight)"/>
                <path class="mk-pt mk-w-r" d="M2.5 20 L20 20 L18 15.5 Z" fill="url(#brandGrad)"/>

                <!-- Intercardinal (shorter) points: NE, SE, SW, NW -->
                <g class="mk-inter" fill="url(#brandGrad)" opacity=".85">
                  <path d="M31 9 L20 20 L23.5 16.5 Z"/>
                  <path d="M31 31 L20 20 L23.5 23.5 Z"/>
                  <path d="M9 31 L20 20 L16.5 23.5 Z"/>
                  <path d="M9 9 L20 20 L16.5 16.5 Z"/>
                </g>
              </g>
              </g>

              <!-- Solid center disc -->
              <circle class="mk-hub" cx="20" cy="20" r="3.4" fill="url(#brandGrad)"/>
              <circle class="mk-pip" cx="20" cy="20" r="1.3" fill="var(--paper, #faf6ee)"/>
            </svg>
          </span>
          <span class="brand-word">
            <span class="brand-lockup">
              <span class="brand-word-1">Claude</span>
              <span class="brand-divider" aria-hidden="true"></span>
              <span class="brand-word-2">
                <span>C</span><span>o</span><span>u</span><span>r</span><span>s</span><span>e</span>
              </span>
            </span>
            <span class="brand-tagline" aria-hidden="true">an engineer&rsquo;s syllabus</span>
          </span>
        </a>
        <nav aria-label="Course navigation">
          <a href="${catalogue}" class="nav-back" aria-label="Back to all courses">
            <span aria-hidden="true">&larr;</span> All courses
          </a>
          <a href="${up}index.html#lessons">Lessons</a>
          <a href="${up}index.html#progress">Progress</a>
          <span class="xp-pill" title="Total XP">
            <span class="spark"></span>
            <span><b>${state.xp}</b> xp</span>
          </span>
          <span class="xp-pill" title="Daily streak" style="background:var(--amber-wash);border-color:oklch(0.85 0.06 75);">
            <span style="color:var(--amber-ink);font-weight:600;">🔥 ${state.streak.days || 0}</span>
          </span>
        </nav>
      </div>
    `;
    return bar;
  }
  window.renderTopbar = renderTopbar;
})();
