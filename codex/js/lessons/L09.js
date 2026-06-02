window.CX = window.CX || {};
window.CX.L09 = {
  id: 'L09',
  title: 'Toolbelt builder',
  mount: function (root, ctx) {
    const stylesId = 'cx-L09-styles';
    if (document.getElementById(stylesId)) return;

    const style = document.createElement('style');
    style.id = stylesId;
    style.innerHTML = `
      .cx-L09-root {
        --cyan: #39aaeb;
        --ink-1: #111;
        --ink-2: #555;
        --ink-3: #999;
        --paper: #fefefe;
        --canvas: #f4f4f4;
        --rule-2: #ddd;
        --ok: #2ecc71;
        --warn: #f39c12;
        --bad: #e74c3c;
        --mono: 'IBM Plex Mono', monospace;
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: sans-serif;
      }
      .cx-L09-header {
        font-family: var(--mono);
        font-size: 14px;
        color: var(--ink-2);
        margin-bottom: 24px;
      }
      .cx-L09-main {
        display: flex;
        flex: 1;
      }
      .cx-L09-rack {
        width: 200px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .cx-L09-tool-card {
        border: 1px solid var(--rule-2);
        padding: 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(.2,.7,.2,1);
      }
      .cx-L09-tool-card:hover {
        transform: scale(1.05);
        background: var(--paper);
      }
      .cx-L09-tool-card .name {
        font-family: var(--mono);
        font-weight: bold;
      }
      .cx-L09-tool-card .purpose {
        font-size: 12px;
        color: var(--ink-2);
      }
      .cx-L09-belt {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      .cx-L09-slot {
        width: 200px;
        height: 50px;
        border: 1px dashed var(--rule-2);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ink-3);
        font-family: var(--mono);
        font-size: 14px;
      }
      .cx-L09-terminal {
        width: 300px;
        background: #000;
        color: #eee;
        padding: 16px;
        font-family: var(--mono);
        font-size: 13px;
        border-radius: 4px;
        overflow-y: auto;
      }
      .cx-L09-badge-ok {
        color: var(--ok);
        font-size: 10px;
        font-family: var(--mono);
      }
      .cx-L09-badge-warn {
        color: var(--warn);
        font-size: 10px;
        font-family: var(--mono);
      }
    `;
    document.head.appendChild(style);

    root.classList.add('cx-L09-root');
    root.innerHTML = `
      <div class="cx-L09-header">scenario: medium Node.js service, PG database, docker-based CI</div>
      <div class="cx-L09-main">
        <div class="cx-L09-rack">
          <div class="cx-L09-tool-card" data-tool="pytest"><div class="name">pytest</div><div class="purpose">python tests</div></div>
          <div class="cx-L09-tool-card" data-tool="vitest"><div class="name">vitest</div><div class="purpose">js tests</div></div>
          <div class="cx-L09-tool-card" data-tool="eslint"><div class="name">eslint</div><div class="purpose">js linter</div></div>
          <div class="cx-L09-tool-card" data-tool="ruff"><div class="name">ruff</div><div class="purpose">python linter</div></div>
          <div class="cx-L09-tool-card" data-tool="mypy"><div class="name">mypy</div><div class="purpose">python types</div></div>
          <div class="cx-L09-tool-card" data-tool="docker-compose"><div class="name">docker-compose</div><div class="purpose">container orchestration</div></div>
          <div class="cx-L09-tool-card" data-tool="postgres-test-db"><div class="name">postgres-test-db</div><div class="purpose">isolated test database</div></div>
          <div class="cx-L09-tool-card" data-tool="make ci"><div class="name">make ci</div><div class="purpose">CI entrypoint</div></div>
        </div>
        <div class="cx-L09-belt">
          <div class="cx-L09-slot"></div>
          <div class="cx-L09-slot"></div>
          <div class="cx-L09-slot"></div>
          <div class="cx-L09-slot"></div>
          <div class="cx-L09-slot"></div>
        </div>
        <div class="cx-L09-terminal"></div>
      </div>
    `;

    const tools = {
      pytest: { needed: false, name: 'pytest', purpose: 'python tests' },
      vitest: { needed: true, name: 'vitest', purpose: 'js tests', command: 'npx vitest run 34 passed' },
      eslint: { needed: true, name: 'eslint', purpose: 'js linter', command: 'npx eslint 0 errors' },
      ruff: { needed: false, name: 'ruff', purpose: 'python linter' },
      mypy: { needed: false, name: 'mypy', purpose: 'python types' },
      'docker-compose': { needed: true, name: 'docker-compose', purpose: 'container orchestration', command: 'docker compose up test-db OK' },
      'postgres-test-db': { needed: true, name: 'postgres-test-db', purpose: 'isolated test database', command: 'pg_ctl start · test-db ready' },
      'make ci': { needed: true, name: 'make ci', purpose: 'CI entrypoint', command: 'make ci green OK' },
    };

    const neededTools = Object.values(tools).filter(t => t.needed).map(t => t.name);
    let beltState = [];

    const rackEl = root.querySelector('.cx-L09-rack');
    const beltSlots = Array.from(root.querySelectorAll('.cx-L09-slot'));
    const terminalEl = root.querySelector('.cx-L09-terminal');

    const typeLine = (line, delay = 0) => {
      setTimeout(() => {
        const p = document.createElement('p');
        p.textContent = `> ${line}`;
        terminalEl.appendChild(p);
        terminalEl.scrollTop = terminalEl.scrollHeight;
      }, delay);
    };

    const checkCompletion = () => {
      if (beltState.length === 5 && beltState.every(t => neededTools.includes(t))) {
        typeLine('READY FOR CODEX', 250);
        if (ctx.Progress) {
          ctx.Progress.markCheckpoint(ctx.lessonId, ctx.cpId, 'bespoke');
        }
        if (ctx.emitXp) ctx.emitXp();
        if (ctx.confetti) ctx.confetti(root.querySelector('.cx-L09-belt'));
      }
    };

    const handleToolClick = (e) => {
      const card = e.currentTarget;
      const toolName = card.dataset.tool;
      const tool = tools[toolName];
      const emptySlot = beltSlots.find(s => !s.hasChildNodes());

      if (!emptySlot) return;

      const cardClone = card.cloneNode(true);
      emptySlot.appendChild(cardClone);
      card.style.visibility = 'hidden';

      if (tool.needed) {
        emptySlot.style.borderColor = 'var(--cyan)';
        cardClone.innerHTML += '<span class="cx-L09-badge-ok">&#10003; fit: 100%</span>';
        beltState.push(toolName);
        typeLine(tool.command);
        checkCompletion();
      } else {
        emptySlot.style.borderColor = 'var(--warn)';
        cardClone.innerHTML += '<span class="cx-L09-badge-warn">&#9888; fit: overkill</span>';
        setTimeout(() => {
          emptySlot.removeChild(cardClone);
          emptySlot.style.borderColor = 'var(--rule-2)';
          card.style.visibility = 'visible';
        }, 1000);
      }
    };

    root.querySelectorAll('.cx-L09-tool-card').forEach(card => {
      card.addEventListener('click', handleToolClick);
    });
  }
};
