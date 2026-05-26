/*
 * motion.js — the interaction & motion layer for Codex Course.
 *
 * Responsibilities:
 *   · scroll reveals (IntersectionObserver adds .in on entering viewport)
 *   · number count-up for .stat .n (data-to attribute)
 *   · shrink-on-scroll topbar, reading-progress rail
 *   · XP pill burst animation (listens to window cc:xp events)
 *   · magnet/tilt 3D hover on .lesson-card
 *   · hero loop diagram: flowing SVG particles
 *   · flashcard flip polish (scan sweep on flip)
 *   · page transitions via View Transitions API (if supported)
 *
 * Every feature feature-detects and degrades silently.
 * Respects prefers-reduced-motion.
 */
(function () {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------
  // 1. Scroll reveal
  // ---------------------------------------------------------------
  function observeReveals(root = document) {
    const targets = root.querySelectorAll(
      '.reveal, .reveal-left, .reveal-scale, .reveal-stagger'
    );
    if (!targets.length) return;
    if (RM) {
      targets.forEach(t => t.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(t => io.observe(t));
  }

  // ---------------------------------------------------------------
  // 2. Count-up numbers  (elements with data-to)
  // ---------------------------------------------------------------
  function observeCountUp(root = document) {
    const nodes = root.querySelectorAll('[data-to]');
    if (!nodes.length) return;
    if (RM) {
      nodes.forEach(n => n.textContent = n.dataset.to);
      return;
    }
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const animate = (el) => {
      const to = parseFloat(el.dataset.to);
      const dur = parseInt(el.dataset.dur || '1200', 10);
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const v = to * easeOut(t);
        // if integer, render as integer; else render one decimal
        const isInt = Number.isInteger(to);
        el.textContent = isInt ? Math.round(v) : v.toFixed(1);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = el.dataset.to;
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animate(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    nodes.forEach(n => io.observe(n));
  }

  // ---------------------------------------------------------------
  // 3. Topbar shrink + reading rail
  // ---------------------------------------------------------------
  function mountTopbarBehaviors() {
    const tb = document.querySelector('.topbar');
    if (!tb) return;

    // reading rail element
    let rail = tb.querySelector('.reading-rail');
    if (!rail) {
      rail = document.createElement('div');
      rail.className = 'reading-rail';
      rail.innerHTML = '<span></span>';
      tb.appendChild(rail);
    }

    const onScroll = () => {
      const y = window.scrollY;
      tb.classList.toggle('shrunk', y > 16);
      const doc = document.documentElement;
      const h = doc.scrollHeight - doc.clientHeight;
      const p = h > 0 ? Math.min(1, y / h) : 0;
      rail.style.setProperty('--read', (p * 100).toFixed(2) + '%');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------------------------------------------------------------
  // 4. XP pill burst (listens to 'cc:xp')
  // ---------------------------------------------------------------
  function mountXpBurst() {
    const pill = document.querySelector('.xp-pill');
    if (!pill) return;
    let prev = parseInt((pill.textContent.match(/\d+/) || [0])[0], 10);
    document.addEventListener('cc:xp', (e) => {
      const now = (window.Progress && window.Progress.getXP && window.Progress.getXP()) || prev;
      const delta = now - prev;
      prev = now;
      if (delta <= 0) return;
      pill.classList.add('xp-bump');
      setTimeout(() => pill.classList.remove('xp-bump'), 380);
      const b = document.createElement('span');
      b.className = 'xp-burst';
      b.textContent = `+${delta} XP`;
      pill.appendChild(b);
      setTimeout(() => b.remove(), 980);
    });
  }

  // ---------------------------------------------------------------
  // 5. Lesson-card 3D tilt with magnet and glow
  // ---------------------------------------------------------------
  function mountCardTilt() {
    if (RM) return;
    const cards = document.querySelectorAll('.lesson-card');
    cards.forEach(card => {
      // ensure a .sweep overlay exists for the scanline pass
      if (!card.querySelector('.sweep')) {
        const sv = document.createElement('span');
        sv.className = 'sweep';
        card.appendChild(sv);
      }
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const dx = (x / r.width) - 0.5;
        const dy = (y / r.height) - 0.5;
        card.style.setProperty('--ty', (dx * 5).toFixed(2) + 'deg');
        card.style.setProperty('--tx', (-dy * 5).toFixed(2) + 'deg');
        card.style.setProperty('--sx', (dx * 6).toFixed(2) + 'px');
        card.classList.add('tilt');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilt');
        card.style.removeProperty('--tx');
        card.style.removeProperty('--ty');
        card.style.removeProperty('--sx');
      });
    });
  }

  // ---------------------------------------------------------------
  // 6. Hero loop diagram — particle flow
  // ---------------------------------------------------------------
  function mountHeroFlow() {
    const diag = document.querySelector('.hero-diagram');
    if (!diag) return;
    const body = diag.querySelector('.hd-body');
    if (!body) return;

    // Remove existing if re-running
    const old = diag.querySelector('.hd-flow');
    if (old) old.remove();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hd-flow');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = `
      <defs>
        <path id="hd-path-1" d="M 0 50 C 25 50, 25 50, 33 50 L 66 50 C 75 50, 75 50, 100 50" />
      </defs>
      <use href="#hd-path-1" />
      <circle class="particle"    r="1.4"><animateMotion dur="3.2s" repeatCount="indefinite"><mpath href="#hd-path-1"/></animateMotion></circle>
      <circle class="particle p2" r="1.2"><animateMotion dur="3.2s" repeatCount="indefinite" begin="-1.1s"><mpath href="#hd-path-1"/></animateMotion></circle>
      <circle class="particle p3" r="1.0"><animateMotion dur="3.2s" repeatCount="indefinite" begin="-2.2s"><mpath href="#hd-path-1"/></animateMotion></circle>
    `;
    body.appendChild(svg);
  }

  // ---------------------------------------------------------------
  // 7. Flashcard flip polish (adds a brief .flipping class for scan-line FX)
  // ---------------------------------------------------------------
  function enhanceFlashcards() {
    document.addEventListener('click', (e) => {
      const card = e.target.closest && e.target.closest('.flashcard');
      if (!card) return;
      card.classList.add('flipping');
      setTimeout(() => card.classList.remove('flipping'), 620);
    }, true);
  }

  // ---------------------------------------------------------------
  // 8. Reveal sections in lessons on scroll
  // ---------------------------------------------------------------
  function autoRevealLessonSections() {
    const sections = document.querySelectorAll('.lesson-content > section');
    if (!sections.length) return;
    if (RM) { sections.forEach(s => s.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    sections.forEach(s => io.observe(s));
  }

  // ---------------------------------------------------------------
  // 9. Decorate the homepage on load
  // ---------------------------------------------------------------
  function autoDecorate() {
    // stats: stamp data-to on the .stat .n that haven't already been stamped
    document.querySelectorAll('.stats-bar .stat .n').forEach(n => {
      const raw = n.textContent.trim();
      if (!n.dataset.to && /^\d+(\.\d+)?$/.test(raw)) {
        n.dataset.to = raw;
        n.textContent = '0';
      }
    });

    // Track heads and lesson grids: ensure they reveal on scroll
    document.querySelectorAll('.track').forEach(t => {
      if (!t.classList.contains('reveal')) t.classList.add('reveal');
    });
    document.querySelectorAll('.lesson-grid').forEach(g => {
      if (!g.classList.contains('reveal-stagger')) g.classList.add('reveal-stagger');
    });
    // section heads
    document.querySelectorAll('.section-head').forEach(s => s.classList.add('reveal'));
    // progress-panel and CTA band
    document.querySelectorAll('.progress-panel, .cta-inner').forEach(s => s.classList.add('reveal'));
    // badges
    const bg = document.getElementById('badges-grid');
    if (bg && !bg.classList.contains('reveal-stagger')) bg.classList.add('reveal-stagger');
  }

  // ---------------------------------------------------------------
  // 10. Kickoff
  // ---------------------------------------------------------------
  function init() {
    autoDecorate();
    observeReveals();
    observeCountUp();
    mountTopbarBehaviors();
    mountXpBurst();
    mountCardTilt();
    mountHeroFlow();
    enhanceFlashcards();
    autoRevealLessonSections();
  }

  // Run after DOM but also re-run after dynamic lists are built
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Expose so home.html and lesson-init can re-trigger after building cards
  window.Motion = { init, observeReveals, observeCountUp, mountCardTilt };
})();


/* ============================================================
 * v3 GLOBAL MOTION EXTENSIONS (appended)
 * ============================================================ */
(function () {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Ripple coord capture on every .btn */
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest && e.target.closest('.btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--rx', (e.clientX - r.left) + 'px');
    btn.style.setProperty('--ry', (e.clientY - r.top) + 'px');
  });

  /* 2. Page transition on internal .html link click */
  if (!RM) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('http') && !href.includes(location.host)) return;
      if (href.startsWith('#') || href.startsWith('mailto:')) return;
      if (a.target === '_blank') return;
      if (!/\.html(\?|#|$)/.test(href) && href !== '../' && href !== './') return;
      e.preventDefault();
      document.documentElement.classList.add('cx-page-leaving');
      setTimeout(() => { window.location.href = href; }, 300);
    });
    document.documentElement.classList.add('cx-page-entering');
    setTimeout(() => document.documentElement.classList.remove('cx-page-entering'), 500);
  }

  /* 3. Ambient canvas particle layer */
  function installParticles() {
    if (RM) return;
    if (!document.querySelector('.hero, .home-hero, .lesson-hero')) return;
    if (document.querySelector('.particle-layer')) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'particle-layer';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    const parts = Array.from({ length: 26 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - .5) * .18,
      vy: (Math.random() - .5) * .14 - .04,
      r: Math.random() * 1.3 + .35,
      a: Math.random() * .4 + .15
    }));
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(57, 170, 235, .6)';
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (document.readyState !== 'loading') installParticles();
  else document.addEventListener('DOMContentLoaded', installParticles);

  /* 4. Global confetti utility */
  window.Confetti = function (anchor, count = 18) {
    if (RM) return;
    const colors = ['#39aaeb', '#2a7fb8', '#71d184', '#f2c94c'];
    const r = (anchor || document.body).getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.style.cssText = `
        position:fixed;pointer-events:none;z-index:9999;
        left:${cx}px;top:${cy}px;width:7px;height:11px;
        background:${colors[i % colors.length]};
        border-radius:1px;
        transform:translate(-50%,-50%) rotate(${Math.random() * 360}deg);
        transition:transform 1s cubic-bezier(.2,.7,.2,1), opacity 1s linear;`;
      document.body.appendChild(p);
      requestAnimationFrame(() => {
        const a = (Math.random() - .5) * 2 * Math.PI;
        const d = 80 + Math.random() * 100;
        p.style.transform =
          `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 50}px)) rotate(${Math.random() * 720}deg)`;
        p.style.opacity = '0';
      });
      setTimeout(() => p.remove(), 1050);
    }
  };

  /* 5. Bespoke widget auto-mount
   * Any lesson page with <div data-bespoke="LNN"></div> will be wrapped
   * in a bespoke-host frame and mounted from window.CX[LNN]. */
  function mountBespoke() {
    document.querySelectorAll('[data-bespoke]').forEach(slot => {
      if (slot.dataset.mounted) return;
      const id = slot.dataset.bespoke;
      const widget = window.CX && window.CX[id];
      if (!widget) return;
      slot.dataset.mounted = '1';
      const host = document.createElement('div');
      host.className = 'bespoke-host';
      host.innerHTML = `
        <div class="bespoke-header">
          <span class="kind">Interactive</span>
          <span>${widget.title || 'bespoke'}</span>
        </div>
        <div class="bespoke-body"></div>
      `;
      slot.replaceWith(host);
      const body = host.querySelector('.bespoke-body');
      const ctx = {
        lessonId: id.replace(/^L/, ''),
        cpId: 'bespoke',
        Progress: window.Progress,
        emitXp: () => document.dispatchEvent(new CustomEvent('cc:xp')),
        confetti: (el) => window.Confetti(el || body, 20),
      };
      try { widget.mount(body, ctx); }
      catch (err) {
        body.innerHTML = `<div class="muted small">Bespoke widget failed to load: ${err.message}</div>`;
      }
    });
  }
  if (document.readyState !== 'loading') mountBespoke();
  else document.addEventListener('DOMContentLoaded', mountBespoke);
  new MutationObserver(() => mountBespoke())
    .observe(document.body, { childList: true, subtree: true });
})();
