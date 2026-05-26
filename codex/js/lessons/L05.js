window.CX = window.CX || {};
window.CX.L05 = {
  id: 'L05',
  title: 'Scope slider',
  mount: function (root, ctx) {
    const LNN = 'L05';
    const ns = (cls) => `cx-${LNN}-${cls}`;

    let completed = false;
    let sweetSpotDwellTimeout = null;

    const injectStyles = () => {
      if (document.getElementById(`cx-${LNN}-styles`)) return;
      const style = document.createElement('style');
      style.id = `cx-${LNN}-styles`;
      style.innerHTML = `
        .${ns('container')} {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-family: var(--mono);
        }
        .${ns('avatar-container')} {
          margin-bottom: 20px;
          position: relative;
        }
        .${ns('avatar')} {
          width: 40px;
          height: 40px;
          background: var(--ink-2);
          border-radius: 4px;
          position: relative;
        }
        .${ns('eye')} {
          position: absolute;
          width: 6px;
          height: 6px;
          background: var(--paper);
          top: 12px;
        }
        .${ns('eye-left')} { left: 8px; }
        .${ns('eye-right')} { right: 8px; }
        .${ns('confusion')} {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 24px;
          color: var(--ink-2);
          transition: transform 0.3s cubic-bezier(.2,.7,.2,1);
        }
        .${ns('slider-container')} {
          width: 100%;
          position: relative;
          padding: 20px 0;
        }
        .${ns('track')} {
          width: 100%;
          height: 8px;
          background: var(--ink-3);
          border-radius: 4px;
          position: relative;
        }
        .${ns('sweet-spot')} {
          position: absolute;
          height: 100%;
          left: 0;
          width: 33.33%;
          background: rgba(57, 170, 235, 0.2);
          border-radius: 4px;
          transition: background 0.3s;
        }
        .${ns('sweet-spot-pulse')} { background: rgba(0, 255, 150, 0.4); }
        .${ns('handle')} {
          width: 48px;
          height: 24px;
          background: var(--cyan);
          border-radius: 12px;
          position: absolute;
          top: -8px;
          left: 0;
          cursor: grab;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .${ns('handle')}:active { cursor: grabbing; }
        .${ns('handle')}:focus {
          outline: 2px solid var(--cyan);
          outline-offset: 2px;
        }
        .${ns('notches')} {
          display: flex;
          justify-content: space-between;
          width: 100%;
          padding: 0 10px;
          box-sizing: border-box;
          margin-top: 8px;
        }
        .${ns('notch')} {
          font-size: 12px;
          color: var(--ink-2);
        }
        .${ns('readout-container')} {
          margin-top: 20px;
          text-align: center;
        }
        .${ns('probability-curve')} {
          width: 100%;
          height: 100px;
        }
        .${ns('probability-path')} {
          fill: none;
          stroke-width: 3;
          stroke-linecap: round;
          transition: stroke 0.3s;
        }
        .${ns('readout')} {
          font-size: 16px;
          font-weight: bold;
          transition: color 0.3s;
        }
        .${ns('toast')} {
          position: absolute;
          bottom: 20px;
          background: var(--ink-1);
          color: var(--paper);
          padding: 8px 16px;
          border-radius: 4px;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.3s, transform 0.3s;
        }
        .${ns('toast-show')} {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .${ns('confusion')}, .${ns('sweet-spot')}, .${ns('probability-path')}, .${ns('readout')}, .${ns('toast')} {
            transition: none;
          }
        }
      `;
      document.head.appendChild(style);
    };

    const render = () => {
      const container = document.createElement('div');
      container.className = ns('container');

      container.innerHTML = `
        <div class="${ns('avatar-container')}">
          <div class="${ns('avatar')}">
            <div class="${ns('eye')} ${ns('eye-left')}"></div>
            <div class="${ns('eye')} ${ns('eye-right')}"></div>
          </div>
          <div class="${ns('confusion')}">?</div>
        </div>
        <div class="${ns('slider-container')}">
          <div class="${ns('track')}">
            <div class="${ns('sweet-spot')}"></div>
            <div class="${ns('handle')}" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
          </div>
          <div class="${ns('notches')}">
            <div class="${ns('notch')}">1h</div>
            <div class="${ns('notch')}">1d</div>
            <div class="${ns('notch')}">3d</div>
            <div class="${ns('notch')}">1w</div>
          </div>
        </div>
        <div class="${ns('readout-container')}">
          <svg class="${ns('probability-curve')}" viewBox="0 0 100 50"></svg>
          <div class="${ns('readout')}"></div>
        </div>
        <div class="${ns('toast')}">sweet spot locked</div>
      `;
      root.appendChild(container);
      return container;
    };

    injectStyles();
    const container = render();

    const handle = container.querySelector(`.${ns('handle')}`);
    const track = container.querySelector(`.${ns('track')}`);
    const confusion = container.querySelector(`.${ns('confusion')}`);
    const sweetSpot = container.querySelector(`.${ns('sweet-spot')}`);
    const probabilityCurve = container.querySelector(`.${ns('probability-curve')}`);
    const probabilityPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    probabilityPath.setAttribute('class', ns('probability-path'));
    probabilityCurve.appendChild(probabilityPath);
    const readout = container.querySelector(`.${ns('readout')}`);
    const toast = container.querySelector(`.${ns('toast')}`);

    let value = 0;

    const updateUI = (val) => {
      const successProb = 0.92 * Math.pow(1 - val, 2.5) + 0.08;
      const successPercent = Math.round(successProb * 100);

      handle.style.left = `${val * 100}%`;
      handle.setAttribute('aria-valuenow', Math.round(val * 100));

      const confusionAmount = val * 20;
      confusion.style.transform = `translateX(-50%) rotate(${Math.sin(Date.now() / 100) * confusionAmount}deg)`;

      const pathD = `M 0,50 C 20,${50 - successProb * 40} 80,${50 - successProb * 40} 100,${50 - (0.18 * 100 * 0.8)} `;
      probabilityPath.setAttribute('d', pathD);

      readout.textContent = `success: ${successPercent}%`;
      if (successPercent > 70) {
        readout.style.color = 'var(--ok)';
        probabilityPath.style.stroke = 'var(--ok)';
      } else if (successPercent > 40) {
        readout.style.color = 'var(--warn)';
        probabilityPath.style.stroke = 'var(--warn)';
      } else {
        readout.style.color = 'var(--bad)';
        probabilityPath.style.stroke = 'var(--bad)';
      }

      if (val >= 0 && val <= 1/3) {
        if (!sweetSpotDwellTimeout && !completed) {
          sweetSpotDwellTimeout = setTimeout(() => {
            if (completed) return;
            completed = true;
            sweetSpot.classList.add(ns('sweet-spot-pulse'));
            toast.classList.add(ns('toast-show'));
            if (ctx.Progress) ctx.Progress.markCheckpoint(ctx.lessonId, ctx.cpId, 'bespoke');
            if (ctx.emitXp) ctx.emitXp();
            if (ctx.confetti) ctx.confetti(handle);
          }, 800);
        }
      } else {
        clearTimeout(sweetSpotDwellTimeout);
        sweetSpotDwellTimeout = null;
      }
    };

    const handleMove = (clientX) => {
      const rect = track.getBoundingClientRect();
      let newVal = (clientX - rect.left) / rect.width;
      newVal = Math.max(0, Math.min(1, newVal));
      value = newVal;
      updateUI(value);
    };

    let isDragging = false;
    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      handle.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) handleMove(e.clientX);
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
      handle.style.cursor = 'grab';
    });

    handle.addEventListener('keydown', (e) => {
      let step = 0.05;
      if (e.key === 'ArrowLeft') {
        value = Math.max(0, value - step);
        updateUI(value);
      } else if (e.key === 'ArrowRight') {
        value = Math.min(1, value + step);
        updateUI(value);
      }
    });

    updateUI(0);
    requestAnimationFrame(function animate() {
      updateUI(value);
      requestAnimationFrame(animate);
    });
  }
};
