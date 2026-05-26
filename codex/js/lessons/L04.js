window.CX = window.CX || {};
window.CX.L04 = {
  id: 'L04',
  title: 'Spec surgeon',
  mount: function (root, ctx) {
    const self = this;
    let score = 0;
    const sections = {
      goal: { on: false, title: 'Goal', content: 'Add per-IP rate limiting to POST auth login endpoint. 5 requests per 60 seconds. Redis-backed.' },
      constraints: { on: false, title: 'Constraints', content: 'Do not modify user model. Reuse existing Redis client at src folder redis module.' },
      acceptance: { on: false, title: 'Acceptance Criteria', content: '<ul><li>all 34 existing tests pass</li><li>new tests cover under-limit at-limit over-limit TTL reset</li><li>returns 429 with Retry-After header on over-limit</li></ul>' },
      outOfScope: { on: false, title: 'Out-of-scope', content: 'Do not touch other auth endpoints. No new deps.' },
      context: { on: false, title: 'Context', content: 'See docs folder rate-limits doc. Pattern used elsewhere in repo: src folder rateLimit module.' },
    };

    const injectStyles = () => {
      if (document.getElementById('cx-L04-styles')) return;
      const style = document.createElement('style');
      style.id = 'cx-L04-styles';
      style.innerHTML = `
        .cx-L04-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          font-family: var(--mono);
        }
        .cx-L04-panes {
          display: flex;
          gap: 24px;
          flex-grow: 1;
        }
        .cx-L04-left-pane, .cx-L04-right-pane {
          flex: 1;
          border: 1px solid var(--rule-2);
          padding: 16px;
          overflow-y: auto;
        }
        .cx-L04-left-pane {
          background: var(--canvas);
          color: var(--ink-2);
          font-size: 1.1em;
        }
        .cx-L04-right-pane {
          position: relative;
          transition: border-color 0.3s;
        }
        .cx-L04-right-pane.completed {
            border-color: var(--ok);
        }
        .cx-L04-toggles {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }
        .cx-L04-spec-toggle {
          padding: 8px 16px;
          border: 1px solid var(--rule-2);
          background: var(--paper);
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .cx-L04-spec-toggle.on {
          background: var(--cyan);
          color: var(--paper);
          border-color: var(--cyan);
        }
        .cx-L04-score-bar {
            height: 24px;
            background: var(--canvas);
            border-bottom: 1px solid var(--rule-2);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            padding: 0 8px;
            font-size: 0.9em;
        }
        .cx-L04-score-meter {
            width: 0%;
            height: 100%;
            background: var(--bad);
            transition: width 0.5s cubic-bezier(.2,.7,.2,1), background-color 0.5s;
        }
        .cx-L04-score-text {
            margin-left: 8px;
        }
        .cx-L04-spec-section {
            margin-bottom: 16px;
            animation: cx-L04-typewriter-reveal 0.5s steps(40, end);
            overflow: hidden;
            white-space: pre-wrap;
            border-left: 2px solid transparent;
            padding-left: 8px;
        }
        .cx-L04-spec-section.glow {
            animation: cx-L04-glow 0.6s ease-out;
        }
        .cx-L04-xray-scan {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--cyan);
            box-shadow: 0 0 10px var(--cyan);
            animation: cx-L04-scan 0.6s cubic-bezier(.2,.7,.2,1) forwards;
            opacity: 0;
        }
        .cx-L04-complete-banner {
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            padding: 4px 0;
            text-align: center;
            background: linear-gradient(90deg, transparent, var(--ok), transparent);
            color: var(--paper);
            animation: cx-L04-sweep-banner 0.8s cubic-bezier(.2,.7,.2,1) forwards;
        }

        @keyframes cx-L04-typewriter-reveal {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes cx-L04-glow {
          0% { border-left-color: var(--cyan); }
          100% { border-left-color: transparent; }
        }
        @keyframes cx-L04-scan {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(400px); }
        }
        @keyframes cx-L04-sweep-banner {
            0% { left: -100%; }
            100% { left: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cx-L04-spec-section, .cx-L04-xray-scan, .cx-L04-complete-banner, .cx-L04-score-meter {
            animation: none;
            transition: none;
          }
        }
      `;
      document.head.appendChild(style);
    };

    const updateScore = () => {
        score = Object.values(sections).filter(s => s.on).length;
        const meter = root.querySelector('.cx-L04-score-meter');
        const text = root.querySelector('.cx-L04-score-text');
        const percentage = (score / 5) * 100;
        meter.style.width = `${percentage}%`;

        let status = 'ambiguous';
        let color = 'var(--bad)';
        if (score >= 2) { status = 'thin'; color = 'var(--warn)'; }
        if (score >= 3) { status = 'ok'; color = 'var(--ok)'; }
        if (score >= 4) { status = 'strong'; }
        if (score === 5) { status = 'surgical'; }

        meter.style.backgroundColor = color;
        text.textContent = `${score}/5 ${status}`;

        if (score === 5) {
            root.querySelector('.cx-L04-right-pane').classList.add('completed');
            const banner = document.createElement('div');
            banner.className = 'cx-L04-complete-banner';
            banner.textContent = 'surgery complete';
            root.querySelector('.cx-L04-right-pane').appendChild(banner);

            if (ctx.Progress) {
                ctx.Progress.markCheckpoint(ctx.lessonId, ctx.cpId, 'bespoke');
            }
            if (ctx.emitXp) ctx.emitXp();
            if (ctx.confetti) ctx.confetti(root.querySelector('.cx-L04-right-pane'));
        }
    };

    const toggleSection = (key) => {
        if (score === 5) return;
        sections[key].on = !sections[key].on;
        const button = root.querySelector(`[data-key='${key}']`);
        button.classList.toggle('on');

        const rightPane = root.querySelector('.cx-L04-right-pane .cx-L04-content');
        rightPane.innerHTML = '';

        Object.values(sections).forEach(section => {
            if (section.on) {
                const sectionEl = document.createElement('div');
                sectionEl.className = 'cx-L04-spec-section';
                sectionEl.innerHTML = `<h4>${section.title}</h4><div>${section.content}</div>`;
                rightPane.appendChild(sectionEl);
            }
        });

        const scanLine = document.createElement('div');
        scanLine.className = 'cx-L04-xray-scan';
        root.querySelector('.cx-L04-right-pane').appendChild(scanLine);
        scanLine.addEventListener('animationend', () => scanLine.remove());

        const lastAdded = rightPane.querySelector('.cx-L04-spec-section:last-child');
        if(lastAdded) {
            lastAdded.classList.add('glow');
            lastAdded.addEventListener('animationend', () => lastAdded.classList.remove('glow'));
        }

        updateScore();
    };

    root.innerHTML = `
      <div class="cx-L04-container">
        <div class="cx-L04-panes">
          <div class="cx-L04-left-pane">refactor our auth module</div>
          <div class="cx-L04-right-pane">
            <div class="cx-L04-score-bar">
                <div class="cx-L04-score-meter"></div>
                <div class="cx-L04-score-text">0/5 ambiguous</div>
            </div>
            <div class="cx-L04-content"></div>
          </div>
        </div>
        <div class="cx-L04-toggles">
          ${Object.keys(sections).map(key => `<button class="cx-L04-spec-toggle" data-key="${key}">${sections[key].title}</button>`).join('')}
        </div>
      </div>
    `;

    injectStyles();

    root.querySelectorAll('.cx-L04-spec-toggle').forEach(button => {
      button.addEventListener('click', () => toggleSection(button.dataset.key));
    });
  }
};
