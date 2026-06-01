// Editorial toast for XP / badges — paper card, amber rail, serif score.
(function(){
  // inject styles once
  const css = document.createElement('style');
  css.textContent = `
    #toast-root {
      position: fixed; right: 24px; bottom: 24px; z-index: 1000;
      display: flex; flex-direction: column-reverse; gap: 12px;
      pointer-events: none;
      max-width: min(360px, calc(100vw - 48px));
    }
    .toast {
      pointer-events: auto;
      position: relative;
      background: var(--paper, #f7f0e3);
      color: var(--ink, #2a2520);
      border: 1px solid var(--rule, #d9cfb8);
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(30,20,10,.05), 0 12px 32px -8px rgba(30,20,10,.22);
      padding: 14px 18px 14px 18px;
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 14px;
      font-family: var(--sans);
      overflow: hidden;
      transform: translateY(14px) scale(.96);
      opacity: 0;
      transition: transform .45s cubic-bezier(.2,.85,.25,1), opacity .25s ease;
      will-change: transform, opacity;
    }
    .toast::before {
      /* left accent rail */
      content: "";
      position: absolute; left: 0; top: 10px; bottom: 10px;
      width: 3px; border-radius: 0 2px 2px 0;
      background: linear-gradient(180deg, var(--amber-ink, #b06a1a), var(--amber, #d9911e));
    }
    .toast.toast-enter { transform: translateY(0) scale(1); opacity: 1; }
    .toast.toast-leave { transform: translateY(6px) scale(.98); opacity: 0; }

    .toast-xp .tx-badge {
      width: 42px; height: 42px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at 30% 30%, #fbd89b, var(--amber, #d9911e) 70%);
      color: #3a1e05;
      font-family: var(--serif, Georgia, serif);
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: -.02em;
      line-height: 1;
      box-shadow: inset 0 0 0 1px rgba(174,106,26,.35), 0 2px 6px rgba(174,106,26,.22);
      flex-shrink: 0;
      position: relative;
    }
    .toast-xp .tx-badge small {
      font-family: var(--mono, ui-monospace, monospace);
      font-size: .5rem;
      letter-spacing: .1em;
      text-transform: uppercase;
      opacity: .7;
      display: block;
      margin-top: 1px;
      font-weight: 600;
    }
    .toast-xp .tx-body { min-width: 0; }
    .toast-xp .tx-eyebrow {
      font-family: var(--mono, ui-monospace, monospace);
      font-size: .62rem; letter-spacing: .14em; text-transform: uppercase;
      color: var(--amber-ink, #b06a1a); font-weight: 600;
    }
    .toast-xp .tx-reason {
      font-size: .92rem; line-height: 1.35; color: var(--ink, #2a2520);
      margin-top: 2px; font-weight: 500;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }

    .toast-badge {
      padding: 16px 20px 16px 22px;
      grid-template-columns: 52px 1fr;
      background: linear-gradient(135deg, var(--paper, #f7f0e3) 0%, #fbe9c2 100%);
    }
    .toast-badge::before {
      background: linear-gradient(180deg, #8a4a12, var(--amber-ink, #b06a1a));
    }
    .toast-badge .tb-medal {
      width: 52px; height: 52px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background:
        radial-gradient(circle at 32% 28%, #ffe4a8, #d9911e 55%, #8a4a12 100%);
      box-shadow:
        inset 0 0 0 2px rgba(138,74,18,.45),
        inset 0 -3px 6px rgba(138,74,18,.35),
        0 4px 14px rgba(138,74,18,.28);
      position: relative;
      flex-shrink: 0;
    }
    .toast-badge .tb-medal::after {
      content: "";
      position: absolute; inset: 6px;
      border-radius: 50%;
      border: 1px dashed rgba(255,240,210,.55);
    }
    .toast-badge .tb-medal svg {
      width: 22px; height: 22px;
      color: #fff6dd;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,.25));
      position: relative; z-index: 1;
    }
    .toast-badge .tb-eyebrow {
      font-family: var(--mono, ui-monospace, monospace);
      font-size: .62rem; letter-spacing: .14em; text-transform: uppercase;
      color: var(--amber-ink, #b06a1a); font-weight: 700;
    }
    .toast-badge .tb-title {
      font-family: var(--serif, Georgia, serif);
      font-size: 1.05rem; line-height: 1.2; font-weight: 600;
      color: var(--ink, #2a2520);
      margin-top: 2px; letter-spacing: -.01em;
    }
    .toast-badge .tb-sub {
      font-size: .78rem; color: var(--ink-3, #8a7f6c);
      margin-top: 3px; line-height: 1.4;
    }

    .toast-plain { font-size: .9rem; grid-template-columns: 1fr; padding: 12px 16px; }

    .toast-progress {
      position: absolute; left: 0; right: 0; bottom: 0;
      height: 2px; background: var(--amber-ink, #b06a1a);
      transform-origin: left center;
      opacity: .5;
    }
    @keyframes toast-progress-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }

    @media (max-width: 600px) {
      #toast-root { right: 12px; bottom: 12px; left: 12px; max-width: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .toast { transition: opacity .2s; transform: none !important; }
    }
  `;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'toast-root';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(root));

  const BADGE_DATA = {
    'first-light':   { title: 'First Light',   sub: 'Your first lesson is in the books.' },
    'apprentice':    { title: 'Apprentice',    sub: 'Three lessons down. Patterns forming.' },
    'journeyman':    { title: 'Journeyman',    sub: 'Halfway through. The craft is sticking.' },
    'maestro':       { title: 'Maestro',       sub: 'All twelve lessons complete.' },
    'streak-3':      { title: '3-day streak',  sub: 'Momentum is its own multiplier.' },
    'streak-7':      { title: '7-day streak',  sub: 'A week straight. The habit is real.' },
    'good-prompter': { title: 'Good Prompter', sub: 'Scored 80+ on the grader.' },
    'debugger':      { title: 'Debugger',      sub: 'Solved a broken prompt.' },
    'architect':     { title: 'Architect',     sub: 'Built a CLAUDE.md from scratch.' },
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function toast(text, opts={}) {
    const el = document.createElement('div');
    el.className = 'toast';
    const duration = opts.duration || (opts.kind === 'badge' ? 4200 : 2800);

    if (opts.kind === 'xp') {
      el.classList.add('toast-xp');
      el.innerHTML = `
        <div class="tx-badge">+${opts.amount}<small>xp</small></div>
        <div class="tx-body">
          <div class="tx-eyebrow">earned</div>
          <div class="tx-reason">${escapeHtml(text || 'Experience points')}</div>
        </div>
        <div class="toast-progress" style="animation: toast-progress-drain ${duration}ms linear forwards"></div>
      `;
    } else if (opts.kind === 'badge') {
      el.classList.add('toast-badge');
      const data = BADGE_DATA[opts.id] || { title: text, sub: '' };
      el.innerHTML = `
        <div class="tb-medal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="6"/>
            <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/>
          </svg>
        </div>
        <div>
          <div class="tb-eyebrow">badge earned</div>
          <div class="tb-title">${escapeHtml(data.title)}</div>
          ${data.sub ? `<div class="tb-sub">${escapeHtml(data.sub)}</div>` : ''}
        </div>
        <div class="toast-progress" style="animation: toast-progress-drain ${duration}ms linear forwards"></div>
      `;
    } else {
      el.classList.add('toast-plain');
      el.textContent = text;
    }

    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-enter'));

    setTimeout(() => {
      el.classList.remove('toast-enter');
      el.classList.add('toast-leave');
      setTimeout(() => el.remove(), 450);
    }, duration);
  }

  window.toast = toast;
  window.addEventListener('xp-gained', e => toast(e.detail.reason || 'Experience points', { kind: 'xp', amount: e.detail.amount }));
  window.addEventListener('badge-earned', e => toast(null, { kind: 'badge', id: e.detail.id, duration: 4200 }));
})();
