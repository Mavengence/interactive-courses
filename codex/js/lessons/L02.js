window.CX = window.CX || {};
window.CX.L02 = {
  id: 'L02',
  title: 'The sandbox box',
  mount: function (root, ctx) {
    const ns = 'cx-L02';

    if (document.getElementById(`${ns}-styles`)) return;
    const style = document.createElement('style');
    style.id = `${ns}-styles`;
    style.innerHTML = `
      @media (prefers-reduced-motion: reduce) {
        .cx-L02-box, .cx-L02-wire, .cx-L02-pulse, .cx-L02-face {
          transition: none !important;
          animation: none !important;
        }
      }

      .${ns}-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        font-family: var(--mono);
        perspective: 1000px;
      }
      .${ns}-scene {
        transform-style: preserve-3d;
        transform: rotateX(60deg) rotateZ(-45deg);
      }
      .${ns}-box {
        width: 200px;
        height: 200px;
        position: relative;
        transform-style: preserve-3d;
      }
      .${ns}-face {
        position: absolute;
        width: 200px;
        height: 200px;
        border: 1px solid var(--ink-2);
        background: rgba(255, 255, 255, 0.1);
      }
      .${ns}-face-top {
        transform: rotateX(90deg) translateZ(100px);
      }
      .${ns}-face-left {
        transform: rotateY(-90deg) translateZ(100px);
      }
      .${ns}-face-right {
        transform: rotateY(0deg) translateZ(100px);
      }
      .${ns}-controls {
        position: absolute;
        left: 24px;
        top: 50%;
        transform: translateY(-50%);
      }
      .${ns}-toggle {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        cursor: pointer;
      }
      .${ns}-toggle-switch {
        width: 40px;
        height: 20px;
        background: var(--ink-3);
        border-radius: 10px;
        position: relative;
        margin-right: 8px;
        transition: background .2s ease;
      }
      .${ns}-toggle-switch::before {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        background: var(--paper);
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: transform .2s ease;
      }
      .${ns}-toggle input:checked + .${ns}-toggle-switch {
        background: var(--cyan);
      }
      .${ns}-toggle input:checked + .${ns}-toggle-switch::before {
        transform: translateX(20px);
      }
      .${ns}-toggle input {
        display: none;
      }
      .${ns}-status-panel {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--canvas);
        padding: 4px 8px;
        border: 1px solid var(--rule-2);
        font-size: 12px;
        color: var(--ink-2);
      }
      .${ns}-verification-panel {
        position: absolute;
        bottom: -40px;
        width: 100%;
        text-align: center;
        font-size: 14px;
      }
      .${ns}-wires {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      .${ns}-wire {
        stroke: var(--cyan);
        stroke-width: 1;
        fill: none;
        opacity: 0;
        transition: opacity .3s ease;
      }
      .${ns}-wire.active {
        opacity: 1;
      }
      .${ns}-pulse {
        fill: var(--cyan);
        animation: pulse-animation 2s infinite;
        opacity: 0;
      }
      .${ns}-wire.active + .${ns}-pulse {
        opacity: 1;
      }
      @keyframes pulse-animation {
        0% { motion-offset: 0%; offset-distance: 0%; }
        100% { motion-offset: 100%; offset-distance: 100%; }
      }
      .${ns}-box.net-warn .${ns}-face-left {
        background: var(--bad);
        animation: flash-red .5s;
      }
      .${ns}-box.secrets-warn .${ns}-face-left {
        background: var(--bad);
        animation: flash-red .5s;
      }
      @keyframes flash-red {
        50% { background: rgba(255, 0, 0, 0.5); }
      }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.className = `${ns}-wrapper`;
    wrapper.innerHTML = `
      <div class="${ns}-controls">
        <label class="${ns}-toggle" for="fs-toggle">filesystem
          <input type="checkbox" id="fs-toggle" data-cap="fs" checked>
          <span class="${ns}-toggle-switch"></span>
        </label>
        <label class="${ns}-toggle" for="tests-toggle">tests
          <input type="checkbox" id="tests-toggle" data-cap="tests" checked>
          <span class="${ns}-toggle-switch"></span>
        </label>
        <label class="${ns}-toggle" for="network-toggle">network
          <input type="checkbox" id="network-toggle" data-cap="net">
          <span class="${ns}-toggle-switch"></span>
        </label>
        <label class="${ns}-toggle" for="env-toggle">env vars
          <input type="checkbox" id="env-toggle" data-cap="env">
          <span class="${ns}-toggle-switch"></span>
        </label>
        <label class="${ns}-toggle" for="secrets-toggle">secrets
          <input type="checkbox" id="secrets-toggle" data-cap="secrets">
          <span class="${ns}-toggle-switch"></span>
        </label>
      </div>
      <div class="${ns}-scene">
        <div class="${ns}-box">
          <div class="${ns}-face ${ns}-face-top"></div>
          <div class="${ns}-face ${ns}-face-left"></div>
          <div class="${ns}-face ${ns}-face-right"></div>
        </div>
      </div>
      <div class="${ns}-status-panel"></div>
      <div class="${ns}-verification-panel"></div>
      <svg class="${ns}-wires" width="100%" height="100%"></svg>
    `;
    root.appendChild(wrapper);

    const toggles = Array.from(root.querySelectorAll(`.${ns}-toggle input`));
    const statusPanel = root.querySelector(`.${ns}-status-panel`);
    const verificationPanel = root.querySelector(`.${ns}-verification-panel`);
    const box = root.querySelector(`.${ns}-box`);
    const wiresSVG = root.querySelector(`.${ns}-wires`);

    const wirePoints = {
      fs: { x1: 100, y1: 150, x2: 350, y2: 200 },
      tests: { x1: 100, y1: 190, x2: 360, y2: 220 },
      net: { x1: 100, y1: 230, x2: 370, y2: 240 },
      env: { x1: 100, y1: 270, x2: 380, y2: 260 },
      secrets: { x1: 100, y1: 310, x2: 390, y2: 280 },
    };

    Object.keys(wirePoints).forEach(key => {
      const p = wirePoints[key];
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${p.x1},${p.y1} C${p.x1 + 100},${p.y1} ${p.x2 - 100},${p.y2} ${p.x2},${p.y2}`);
      path.id = `${ns}-wire-${key}`;
      path.classList.add(`${ns}-wire`);

      const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulse.setAttribute('r', '3');
      pulse.classList.add(`${ns}-pulse`);
      pulse.style.motionPath = `path('M${p.x1},${p.y1} C${p.x1 + 100},${p.y1} ${p.x2 - 100},${p.y2} ${p.x2},${p.y2}')`;
      pulse.style.offsetPath = `path('M${p.x1},${p.y1} C${p.x1 + 100},${p.y1} ${p.x2 - 100},${p.y2} ${p.x2},${p.y2}')`;

      wiresSVG.appendChild(path);
      wiresSVG.appendChild(pulse);
    });

    const toggledOnce = new Set();

    function updateStatus() {
      toggles.forEach(toggle => {
        const wire = document.getElementById(`${ns}-wire-${toggle.dataset.cap}`);
        if (toggle.checked) {
          wire.classList.add('active');
        } else {
          wire.classList.remove('active');
        }
      });
      const status = toggles.map(t => `${t.dataset.cap} ${t.checked ? 'y' : 'n'}`).join(' ');
      statusPanel.textContent = status;

      const testsOn = toggles.find(t => t.dataset.cap === 'tests').checked;
      if (testsOn) {
        verificationPanel.textContent = 'codex can verify work';
        verificationPanel.style.color = 'var(--ok)';
      } else {
        verificationPanel.textContent = 'codex cannot verify work — flying blind';
        verificationPanel.style.color = 'var(--warn)';
      }
    }

    toggles.forEach(toggle => {
      toggle.addEventListener('change', () => {
        toggledOnce.add(toggle.dataset.cap);
        updateStatus();

        if (toggle.dataset.cap === 'net' && toggle.checked) {
          box.classList.add('net-warn');
          verificationPanel.textContent = 'NET ON supply-chain risk';
          setTimeout(() => box.classList.remove('net-warn'), 1000);
        }
        if (toggle.dataset.cap === 'secrets' && toggle.checked) {
          box.classList.add('secrets-warn');
          verificationPanel.textContent = 'SECRETS EXPOSED rotate after run';
          setTimeout(() => box.classList.remove('secrets-warn'), 1000);
        }

        if (toggledOnce.size === 5) {
          if (ctx.Progress) {
            ctx.Progress.markCheckpoint(ctx.lessonId, ctx.cpId, 'bespoke');
          }
          if (ctx.emitXp) {
            ctx.emitXp();
          }
          if (ctx.confetti) {
            ctx.confetti(toggle);
          }
        }
      });
    });

    updateStatus();

  }
};
