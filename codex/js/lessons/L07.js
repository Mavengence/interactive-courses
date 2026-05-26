window.CX = window.CX || {};
window.CX.L07 = {
  id: 'L07',
  title: 'PR x-ray',
  mount: function (root, ctx) {
    const lessonId = ctx.lessonId || '07';
    const cpId = ctx.cpId || 'pr-xray';

    const bugs = {
      4: { id: 1, found: false, description: 'TTL unit mismatch' },
      9: { id: 2, found: false, description: 'Off-by-one error' },
      12: { id: 3, found: false, description: 'Inconsistent units' },
    };
    const totalBugs = 3;
    let bugsFound = 0;
    let falseAlarms = 0;
    let gameWon = false;

    const codeLines = [
      { code: "const redis = require('redis');", reason: "Import Redis client library." },
      { code: "const client = redis.createClient();", reason: "Create a new Redis client instance." },
      { code: "", reason: "" },
      { code: "const WINDOW = 60000; // 1 minute in ms", reason: "Define the rate-limiting time window." },
      { code: "const MAX_REQUESTS = 100;", reason: "Set the maximum number of requests allowed." },
      { code: "", reason: "" },
      { code: "async function isRateLimited(userId) {", reason: "Define the rate limiting function." },
      { code: "  const key = `rate-limit:${userId}`;", reason: "Construct the Redis key for the user." },
      { code: "  const count = await client.incr(key);", reason: "Increment the user's request count." },
      { code: "", reason: "" },
      { code: "  if (count > MAX_REQUESTS) {", reason: "Check if the user has exceeded the limit." },
      { code: "    return true;", reason: "Return true if the user is rate-limited." },
      { code: "  }", reason: "" },
      { code: "  if (count === 1) {", reason: "If this is the first request in the window..." },
      { code: "    await client.expire(key, 60); // Expire per second", reason: "...set the key to expire after the window." },
      { code: "  }", reason: "" },
      { code: "  return false;", reason: "Return false if the user is not rate-limited." },
      { code: "}", reason: "" },
    ];

    function injectStyles() {
      const styleId = 'cx-L07-styles';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .cx-L07-wrapper {
          display: flex;
          gap: 24px;
          font-family: var(--mono);
          height: 100%;
        }
        .cx-L07-diff-container {
          flex-grow: 1;
          border: 1px solid var(--rule-2);
          border-radius: 8px;
          padding: 16px;
          background-color: var(--canvas);
          overflow-y: auto;
        }
        .cx-L07-line {
          display: flex;
          align-items: center;
          padding: 2px 8px;
          cursor: pointer;
          position: relative;
          transition: background-color 0.2s;
        }
        .cx-L07-line:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        .cx-L07-line.is-bug:hover::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 8px;
          right: 8px;
          height: 2px;
          background-color: var(--bad);
          animation: cx-L07-underline-appear 0.3s 0.3s forwards;
          opacity: 0;
        }
        @keyframes cx-L07-underline-appear {
          to { opacity: 0.6; }
        }
        .cx-L07-line.found {
          border: 1px solid var(--ok);
          background-color: rgba(0, 255, 0, 0.1);
          border-radius: 4px;
        }
        .cx-L07-line.false-alarm {
          animation: cx-L07-flash-bad 0.5s;
        }
        @keyframes cx-L07-flash-bad {
          50% { background-color: rgba(255, 0, 0, 0.2); }
        }
        .cx-L07-line-num {
          color: var(--ink-3);
          width: 30px;
          text-align: right;
          padding-right: 16px;
          user-select: none;
        }
        .cx-L07-code {
          white-space: pre;
        }
        .cx-L07-keyword { color: var(--cyan); }
        .cx-L07-string { color: #E6DB74; }
        .cx-L07-comment { color: var(--ink-3); }
        .cx-L07-sidebar {
          width: 220px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        .cx-L07-sidebar h3 {
          font-size: 16px;
          margin: 0 0 12px 0;
          color: var(--ink-1);
        }
        .cx-L07-stats, .cx-L07-caught-list {
          background: var(--canvas);
          border: 1px solid var(--rule-2);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .cx-L07-stat {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .cx-L07-stat-label { color: var(--ink-2); }
        .cx-L07-stat-value { color: var(--ink-1); }
        .cx-L07-caught-item {
          font-size: 13px;
          color: var(--ink-2);
          padding: 4px 0;
        }
        .cx-L07-badge {
          margin-top: auto;
          text-align: center;
          padding: 16px;
          border: 1px solid var(--rule-2);
          border-radius: 8px;
          background: var(--canvas);
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.5s, transform 0.5s;
        }
        .cx-L07-badge.unlocked {
          opacity: 1;
          transform: translateY(0);
          border-color: var(--ok);
        }
        .cx-L07-badge-title { font-weight: bold; color: var(--ok); }
        .cx-L07-reset-btn {
          margin-top: 16px;
          padding: 8px 12px;
          background: var(--rule-2);
          border: none;
          border-radius: 4px;
          color: var(--ink-2);
          cursor: pointer;
          width: 100%;
        }
        .cx-L07-reset-btn:hover { background: var(--ink-3); color: var(--paper); }
        .cx-L07-tooltip {
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 12px;
          background: var(--paper);
          color: var(--ink-1);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .cx-L07-line:hover .cx-L07-tooltip { opacity: 1; visibility: visible; transition-delay: 0.5s; }
        @media (prefers-reduced-motion: reduce) {
          .cx-L07-line.is-bug:hover::after, .cx-L07-line.false-alarm, .cx-L07-badge {
            animation: none;
            transition: none;
          }
        }
      `;
      document.head.appendChild(style);
    }

    function render() {
      root.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'cx-L07-wrapper';

      const diffContainer = document.createElement('div');
      diffContainer.className = 'cx-L07-diff-container';

      const sidebar = document.createElement('div');
      sidebar.className = 'cx-L07-sidebar';

      wrapper.appendChild(diffContainer);
      wrapper.appendChild(sidebar);
      root.appendChild(wrapper);

      updateSidebar();
      renderDiff();
    }

    function renderDiff() {
      const diffContainer = root.querySelector('.cx-L07-diff-container');
      diffContainer.innerHTML = '';

      codeLines.forEach((line, index) => {
        const lineEl = document.createElement('div');
        const lineNum = index + 1;
        lineEl.className = 'cx-L07-line';
        if (bugs[lineNum]) {
          lineEl.classList.add('is-bug');
        }
        if (bugs[lineNum] && bugs[lineNum].found) {
          lineEl.classList.add('found');
        }
        lineEl.dataset.line = lineNum;

        const lineNumEl = document.createElement('span');
        lineNumEl.className = 'cx-L07-line-num';
        lineNumEl.textContent = lineNum;

        const codeEl = document.createElement('span');
        codeEl.className = 'cx-L07-code';
        codeEl.innerHTML = syntaxHighlight(line.code);

        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'cx-L07-tooltip';
        tooltipEl.textContent = line.reason;

        lineEl.appendChild(lineNumEl);
        lineEl.appendChild(codeEl);
        if (line.reason) {
            lineEl.appendChild(tooltipEl);
        }

        lineEl.addEventListener('click', () => handleLineClick(lineEl, lineNum));

        diffContainer.appendChild(lineEl);
      });
    }

    function syntaxHighlight(code) {
        return code
            .replace(/const|async|function|return|if/g, '<span class="cx-L07-keyword">$&</span>')
            .replace(/('|`)[^\1]*?\1/g, '<span class="cx-L07-string">$&</span>')
            .replace(/\/\/.*$/g, '<span class="cx-L07-comment">$&</span>');
    }

    function updateSidebar() {
      const sidebar = root.querySelector('.cx-L07-sidebar');
      if (!sidebar) return;

      sidebar.innerHTML = `
        <h3>PR X-Ray</h3>
        <div class="cx-L07-stats">
          <div class="cx-L07-stat">
            <span class="cx-L07-stat-label">Bugs Caught</span>
            <span class="cx-L07-stat-value">${bugsFound} / ${totalBugs}</span>
          </div>
          <div class="cx-L07-stat">
            <span class="cx-L07-stat-label">False Alarms</span>
            <span class="cx-L07-stat-value">${falseAlarms}</span>
          </div>
        </div>
        <h3>Caught:</h3>
        <div class="cx-L07-caught-list">
          ${Object.values(bugs).filter(b => b.found).map(b => `<div class="cx-L07-caught-item">✓ ${b.description}</div>`).join('') || '<div class="cx-L07-caught-item" style="color: var(--ink-3);">None yet.</div>'}
        </div>
        <div class="cx-L07-badge ${gameWon ? 'unlocked' : ''}">
          <div class="cx-L07-badge-title">🏅 REVIEWER</div>
        </div>
        <button class="cx-L07-reset-btn">Reset</button>
      `;

      sidebar.querySelector('.cx-L07-reset-btn').addEventListener('click', resetGame);
    }

    function handleLineClick(lineEl, lineNum) {
      if (gameWon) return;

      const bug = bugs[lineNum];
      if (bug && !bug.found) {
        bug.found = true;
        bugsFound++;
        lineEl.classList.add('found');
        if (ctx.confetti) ctx.confetti(lineEl);

        if (bugsFound === totalBugs) {
          gameWon = true;
          if (ctx.Progress && typeof ctx.Progress.markCheckpoint === 'function') {
            ctx.Progress.markCheckpoint(lessonId, cpId, 'bespoke');
          }
          if (ctx.emitXp) ctx.emitXp();
          root.querySelector('.cx-L07-badge').classList.add('unlocked');
        }
      } else if (!bug) {
        falseAlarms++;
        lineEl.classList.add('false-alarm');
        setTimeout(() => lineEl.classList.remove('false-alarm'), 500);
      }

      updateSidebar();
    }

    function resetGame() {
      bugsFound = 0;
      falseAlarms = 0;
      gameWon = false;
      for (const key in bugs) {
        bugs[key].found = false;
      }
      render();
    }

    injectStyles();
    render();
  }
};
