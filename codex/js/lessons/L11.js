window.CX = window.CX || {};
window.CX.L11 = {
  id: 'L11',
  title: 'Pattern cards lab',
  mount: function (root, ctx) {
    const L_ID = '11';
    const NS = `cx-${L_ID}`;
    const STYLE_ID = `${NS}-styles`;

    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.innerHTML = `
      @media (prefers-reduced-motion: reduce) {
        .${NS}-card-inner {
          transition: none !important;
        }
      }

      .${NS}-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: var(--mono);
      }

      .${NS}-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        perspective: 1000px;
        margin-bottom: 24px;
      }

      .${NS}-card {
        aspect-ratio: 3 / 2;
        background-color: transparent;
        cursor: pointer;
        border: none;
        padding: 0;
      }

      .${NS}-card-inner {
        position: relative;
        width: 100%;
        height: 100%;
        text-align: center;
        transition: transform 0.8s;
        transform-style: preserve-3d;
        transition-timing-function: cubic-bezier(.2,.8,.4,1.2);
      }

      .${NS}-card.flipped .${NS}-card-inner {
        transform: rotateY(180deg);
      }

      .${NS}-card-front, .${NS}-card-back {
        position: absolute;
        width: 100%;
        height: 100%;
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--rule-2);
        border-radius: 8px;
      }

      .${NS}-card-front {
        background-color: var(--paper);
        color: var(--ink-1);
        font-size: 24px;
      }

      .${NS}-card-back {
        background-color: var(--paper);
        color: var(--ink-1);
        transform: rotateY(180deg);
        flex-direction: column;
        padding: 12px;
        font-size: 14px;
      }

      .${NS}-card-back h4 {
        margin: 0 0 4px 0;
        font-size: 16px;
        color: var(--cyan);
      }

      .${NS}-card-back p {
        margin: 0;
        font-size: 12px;
        color: var(--ink-2);
      }

      .${NS}-drop-area {
        display: flex;
        justify-content: space-around;
        gap: 24px;
        flex-grow: 1;
      }

      .${NS}-drop-zone {
        flex: 1;
        border: 2px dashed var(--rule-2);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, border-color 0.2s;
      }

      .${NS}-drop-zone h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
      }

      .${NS}-drop-zone.proven {
        border-color: var(--ok);
      }
      .${NS}-drop-zone.proven.drag-over {
        background-color: rgba(0, 255, 0, 0.1);
      }

      .${NS}-drop-zone.avoid {
        border-color: var(--bad);
      }
      .${NS}-drop-zone.avoid.drag-over {
        background-color: rgba(255, 0, 0, 0.1);
      }

      .${NS}-scoreboard {
        text-align: center;
        margin-bottom: 16px;
        font-size: 16px;
        color: var(--ink-2);
      }

      .${NS}-card.dragging {
        opacity: 0.5;
      }

      .${NS}-card.shake {
        animation: ${NS}-shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
      }

      @keyframes ${NS}-shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(2px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
        40%, 60% { transform: translate3d(4px, 0, 0); }
      }

      .${NS}-final-banner {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--paper);
        color: var(--cyan);
        padding: 20px 40px;
        border-radius: 10px;
        font-size: 24px;
        border: 1px solid var(--cyan);
        display: none;
      }
    `;
    document.head.appendChild(style);

    const cardsData = [
      { id: 1, type: 'proven', title: 'the AGENTS.md handshake', desc: 'Start every repo with a tight AGENTS.md before the first Codex run.' },
      { id: 2, type: 'proven', title: 'one PR one scope', desc: 'Each Codex task ships exactly one coherent change.' },
      { id: 3, type: 'proven', title: 'tests as contract', desc: 'Your test suite is the spec Codex optimizes against.' },
      { id: 4, type: 'proven', title: 'parallel with git worktrees', desc: 'Run independent tasks in isolated worktrees.' },
      { id: 5, type: 'proven', title: 'Codex reviews Codex', desc: 'Use a second Codex pass to critique the first.' },
      { id: 6, type: 'anti', title: 'vague roving refactor', desc: 'Clean up the codebase.' },
      { id: 7, type: 'anti', title: 'interactive pair programming', desc: 'Treating Codex like live autocomplete.' },
      { id: 8, type: 'anti', title: 'skip the sandbox', desc: 'Disabling the sandbox to just make it work.' },
    ].sort(() => Math.random() - 0.5);

    let sortedCount = 0;
    let mistakes = 0;
    let draggedCard = null;

    const container = document.createElement('div');
    container.className = `${NS}-container`;
    root.appendChild(container);

    container.innerHTML = `
      <div class="${NS}-grid"></div>
      <div class="${NS}-scoreboard">sorted: 0/8 &middot; mistakes: 0</div>
      <div class="${NS}-drop-area">
        <div class="${NS}-drop-zone proven" data-type="proven"><h3>PROVEN</h3></div>
        <div class="${NS}-drop-zone avoid" data-type="avoid"><h3>AVOID</h3></div>
      </div>
      <div class="${NS}-final-banner">Pattern library locked in</div>
    `;

    const grid = container.querySelector(`.${NS}-grid`);
    const scoreboard = container.querySelector(`.${NS}-scoreboard`);
    const dropZones = container.querySelectorAll(`.${NS}-drop-zone`);

    cardsData.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = `${NS}-card`;
      cardEl.dataset.id = card.id;
      cardEl.dataset.type = card.type;
      cardEl.setAttribute('draggable', 'false');
      cardEl.setAttribute('tabindex', '0');
      cardEl.innerHTML = `
        <div class="${NS}-card-inner">
          <div class="${NS}-card-front">${String(index + 1).padStart(2, '0')}</div>
          <div class="${NS}-card-back">
            <h4>${card.title}</h4>
            <p>${card.desc}</p>
          </div>
        </div>
      `;
      grid.appendChild(cardEl);

      cardEl.addEventListener('click', () => flipCard(cardEl));
      cardEl.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          flipCard(cardEl);
        }
      });

      cardEl.addEventListener('dragstart', (e) => {
        if (!cardEl.classList.contains('flipped')) {
          e.preventDefault();
          return;
        }
        draggedCard = cardEl;
        setTimeout(() => cardEl.classList.add('dragging'), 0);
      });

      cardEl.addEventListener('dragend', () => {
        draggedCard = null;
        cardEl.classList.remove('dragging');
      });
    });

    function flipCard(cardEl) {
      if (cardEl.classList.contains('sorted')) return;
      cardEl.classList.toggle('flipped');
      if (cardEl.classList.contains('flipped')) {
        cardEl.setAttribute('draggable', 'true');
      }
    }

    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (!draggedCard) return;

        const cardType = draggedCard.dataset.type;
        const zoneType = zone.dataset.type;

        if (cardType === zoneType) {
          draggedCard.classList.add('sorted');
          draggedCard.setAttribute('draggable', 'false');
          draggedCard.style.visibility = 'hidden';
          sortedCount++;
          updateScoreboard();
          checkCompletion();
        } else {
          mistakes++;
          updateScoreboard();
          draggedCard.classList.add('shake');
          setTimeout(() => draggedCard.classList.remove('shake'), 500);
        }
      });
    });

    function updateScoreboard() {
      scoreboard.innerHTML = `sorted: ${sortedCount}/8 &middot; mistakes: ${mistakes}`;
    }

    function checkCompletion() {
      if (sortedCount === 8) {
        container.querySelector(`.${NS}-final-banner`).style.display = 'block';
        if (ctx.Progress) {
          ctx.Progress.markCheckpoint(ctx.lessonId, ctx.cpId, 'bespoke');
        }
        if (ctx.emitXp) ctx.emitXp();
        if (ctx.confetti) ctx.confetti(root);
      }
    }
  }
};
