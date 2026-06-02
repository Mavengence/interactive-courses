// Lesson L01: Three-body contract

window.CX = window.CX || {};
window.CX.L01 = {
  id: 'L01',
  title: 'Three-body contract',
  mount: function (root, ctx) {
    // ---
    // STATE
    // ---
    const state = {
      task: 1.0,
      repo: 1.0,
      sandbox: 1.0,
      weakened: new Set(),
    };

    // ---
    // RENDER
    // ---
    const checkCompletion = () => {
      if (state.weakened.size === 3) {
        if (ctx.Progress) {
          ctx.Progress.markCheckpoint(ctx.lessonId, ctx.cpId, 'bespoke');
        }
        if (ctx.emitXp) {
          ctx.emitXp();
        }
        if (ctx.confetti) {
          const meter = root.querySelector('.cx-L01-meter');
          ctx.confetti(meter);
        }
        root.querySelector('.cx-L01-completion-message').textContent = '$ contract-invariant confirmed +XP';
      }
    };

    const render = () => {
      const quality = (state.task * 0.4 + state.repo * 0.3 + state.sandbox * 0.3) * 95;
      const qualityInt = Math.round(quality);

      root.innerHTML = `
        <div class="cx-L01-container">
          <div class="cx-L01-diagram-container">
            <svg class="cx-L01-svg" viewBox="0 0 400 220">
              <defs>
                <filter id="glow" x="-150%" y="-150%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4 4" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <!-- Bonds -->
              <line class="cx-L01-bond" x1="200" y1="50" x2="90" y2="180" />
              <line class="cx-L01-bond" x1="90" y1="180" x2="310" y2="180" />
              <line class="cx-L01-bond" x1="310" y1="180" x2="200" y2="50" />

              <!-- Bodies -->
              <g class="cx-L01-body" transform="translate(200, 50)">
                <circle class="cx-L01-disc cx-L01-task-disc" r="${30 * state.task}" />
                <text class="cx-L01-label" y="-40">TASK</text>
                <title>The user's request, the prompt, and the overall goal.</title>
              </g>
              <g class="cx-L01-body" transform="translate(90, 180)">
                <circle class="cx-L01-disc cx-L01-repo-disc" r="${20 * state.repo}" />
                <text class="cx-L01-label" y="30">REPO</text>
                <title>The codebase, including documentation and existing patterns.</title>
              </g>
              <g class="cx-L01-body" transform="translate(310, 180)">
                <circle class="cx-L01-disc cx-L01-sandbox-disc" r="${20 * state.sandbox}" />
                <text class="cx-L01-label" y="30">SANDBOX</text>
                <title>The execution environment, including tests and dependencies.</title>
              </g>
            </svg>
          </div>
          <div class="cx-L01-controls-container">
            <div class="cx-L01-buttons">
              <button class="cx-L01-button" data-action="vague-task">Vague the task</button>
              <button class="cx-L01-button" data-action="drop-agents">Drop AGENTS.md</button>
              <button class="cx-L01-button" data-action="cut-tests">Cut sandbox tests</button>
              <button class="cx-L01-button cx-L01-reset-button" data-action="reset">Reset</button>
            </div>
          </div>
          <div class="cx-L01-meter-container">
            <div class="cx-L01-meter">
              <div class="cx-L01-meter-fill" style="height: ${qualityInt}%; background: ${qualityInt < 40 ? 'var(--bad)' : qualityInt < 70 ? 'var(--warn)' : 'var(--ok)'};"></div>
              <div class="cx-L01-meter-value">${qualityInt}</div>
              <div class="cx-L01-meter-label">PR QUALITY</div>
            </div>
          </div>
        </div>
        <div class="cx-L01-completion-message"></div>
      `;
    };

    // ---
    // STYLES
    // ---
    const injectStyles = () => {
      if (document.getElementById('cx-L01-styles')) return;
      const style = document.createElement('style');
      style.id = 'cx-L01-styles';
      style.innerHTML = `
        .cx-L01-container {
          display: flex;
          align-items: flex-start;
          gap: 24px;
          width: 100%;
          font-family: var(--mono);
        }
        .cx-L01-diagram-container {
          flex: 1;
        }
        .cx-L01-svg {
          width: 100%;
          max-width: 400px;
        }
        .cx-L01-controls-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 20px;
        }
        .cx-L01-buttons {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .cx-L01-button {
          padding: 8px 12px;
          background: var(--paper);
          border: 1px solid var(--rule-2);
          color: var(--ink-2);
          font-family: var(--mono);
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .cx-L01-button:hover {
          background: var(--ink-1);
          color: var(--paper);
        }
        .cx-L01-reset-button {
          margin-top: 12px;
          border-color: var(--cyan);
          color: var(--cyan);
        }
        .cx-L01-meter-container {
          width: 80px;
          padding-top: 20px;
        }
        .cx-L01-meter {
          position: relative;
          width: 24px;
          height: 180px;
          background: var(--paper);
          border: 1px solid var(--rule-2);
          margin: 0 auto;
        }
        .cx-L01-meter-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--ok);
          transition: height 0.5s cubic-bezier(.2,.7,.2,1), background 0.5s;
        }
        .cx-L01-meter-value {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.2rem;
          font-weight: bold;
        }
        .cx-L01-meter-label {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%) rotate(90deg);
          white-space: nowrap;
          font-size: 0.7rem;
          color: var(--ink-3);
        }
        .cx-L01-body .cx-L01-disc {
          fill: var(--cyan);
          transition: r 0.5s cubic-bezier(.2,.8,.4,1.2);
          animation: cx-L01-pulse 3s infinite alternate;
        }
        .cx-L01-label {
          font-size: 0.72rem;
          text-anchor: middle;
          fill: var(--ink-2);
          text-transform: uppercase;
        }
        .cx-L01-bond {
          stroke: var(--rule-2);
          stroke-width: 1;
          stroke-dasharray: 4 8;
          animation: cx-L01-dash 1s linear infinite;
        }
        .cx-L01-completion-message {
          margin-top: 16px;
          font-family: var(--mono);
          color: var(--ok);
          text-align: center;
        }

        @keyframes cx-L01-pulse {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }

        @keyframes cx-L01-dash {
          to {
            stroke-dashoffset: -12;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cx-L01-body .cx-L01-disc, .cx-L01-meter-fill, .cx-L01-bond {
            animation: none;
            transition: none;
          }
        }
      `;
      document.head.appendChild(style);
    };

    // ---
    // INIT
    // ---
    injectStyles();
    render();

    // Delegate on `root` (stable across renders); `.cx-L01-buttons` is
    // recreated by every render() so binding there loses the listener.
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.cx-L01-button');
      if (!btn) return;

      const action = btn.dataset.action;
      switch (action) {
        case 'vague-task':
          state.task = 0.3;
          state.weakened.add('task');
          break;
        case 'drop-agents':
          state.repo = 0.4;
          state.weakened.add('repo');
          break;
        case 'cut-tests':
          state.sandbox = 0.35;
          state.weakened.add('sandbox');
          break;
        case 'reset':
          state.task = 1.0;
          state.repo = 1.0;
          state.sandbox = 1.0;
          state.weakened.clear();
          break;
      }
      render();
      checkCompletion();
    });
  }
};
