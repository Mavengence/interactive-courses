// Toast notifications
(function () {
  let container;
  function ensure() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toasts';
      document.body.appendChild(container);
    }
    return container;
  }
  function toast(msg, opts = {}) {
    const c = ensure();
    const el = document.createElement('div');
    el.className = 'toast';
    const xpPart = opts.xp ? `<span class="xp">+${opts.xp} XP</span>` : '';
    el.innerHTML = `${xpPart}<span>${msg}</span>`;
    c.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 320);
    }, opts.duration || 3200);
  }
  window.toast = toast;
  document.addEventListener('cc:xp', (ev) => {
    const xp = ev.detail && ev.detail.xp;
    toast('Nice — checkpoint cleared', xp ? { xp } : {});
  });
  document.addEventListener('cc:lesson-done', (ev) => {
    toast('Lesson complete!', { xp: 25, duration: 4000 });
  });
})();
