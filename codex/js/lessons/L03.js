window.CX = window.CX || {};
window.CX.L03 = {
  id: 'L03',
  title: 'AGENTS.md crystal',
  mount: function (root, ctx) {
    if (!document.getElementById('cx-L03-styles')) {
      const style = document.createElement('style');
      style.id = 'cx-L03-styles';
      style.textContent = `
        .cx-L03-container {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          height: 100%;
          gap: 24px;
          font-family: var(--mono, monospace);
          color: var(--ink-1, #333);
          box-sizing: border-box;
          padding: 10px;
        }
        .cx-L03-left {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 200px;
          justify-content: center;
        }
        .cx-L03-card {
          background: var(--paper, #fff);
          border: 1px solid var(--rule-2, #ddd);
          border-left: 4px solid var(--cyan, #39aaeb);
          padding: 12px;
          font-size: 13px;
          cursor: pointer;
          user-select: none;
          transition: transform 0.2s cubic-bezier(.2,.8,.4,1.2), opacity 0.2s, box-shadow 0.2s;
          border-radius: 4px;
          position: relative;
          z-index: 10;
        }
        .cx-L03-card:hover {
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .cx-L03-card.cx-L03-absorbed {
          opacity: 0;
          pointer-events: none;
          transform: scale(0.8) translateX(50px);
        }
        .cx-L03-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .cx-L03-crystal-svg {
          width: 180px;
          height: 180px;
          transition: opacity 0.5s, filter 0.5s;
          opacity: 0.3;
          filter: drop-shadow(0 0 2px var(--cyan, #39aaeb));
          animation: cx-L03-pulse 3s infinite alternate ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .cx-L03-crystal-svg { animation: none; }
          .cx-L03-card { transition: none; }
          .cx-L03-card:hover { transform: none; }
          .cx-L03-card.cx-L03-absorbed { transform: none; }
        }
        @keyframes cx-L03-pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.02); }
        }
        .cx-L03-facet {
          stroke: var(--cyan, #39aaeb);
          stroke-width: 2;
          fill: rgba(57, 170, 235, 0.1);
          opacity: 0;
          transition: opacity 0.5s;
        }
        .cx-L03-facet.cx-L03-visible {
          opacity: 1;
        }
        .cx-L03-count {
          margin-top: 20px;
          font-size: 14px;
          color: var(--ink-2, #666);
        }
        .cx-L03-right {
          width: 320px;
          background: var(--paper, #fff);
          border: 1px solid var(--rule-2, #ddd);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-size: 12px;
          position: relative;
        }
        .cx-L03-pr-header {
          background: var(--canvas, #f5f5f5);
          padding: 12px;
          border-bottom: 1px solid var(--rule-2, #ddd);
        }
        .cx-L03-pr-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 4px;
          transition: color 0.3s;
        }
        .cx-L03-pr-branch {
          color: var(--ink-3, #999);
          font-size: 11px;
          display: inline-block;
          background: var(--rule-2, #ddd);
          padding: 2px 6px;
          border-radius: 3px;
        }
        .cx-L03-pr-body {
          padding: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cx-L03-diff-line {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 4px;
          border-radius: 3px;
          position: relative;
          overflow: hidden;
        }
        .cx-L03-diff-line::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: var(--cyan, #39aaeb);
          opacity: 0;
          pointer-events: none;
        }
        .cx-L03-diff-line.cx-L03-highlight::after {
          animation: cx-L03-sweep 0.5s ease-out;
        }
        @keyframes cx-L03-sweep {
          0% { opacity: 0.3; transform: translateX(-100%); }
          100% { opacity: 0; transform: translateX(100%); }
        }
        .cx-L03-diff-icon {
          color: var(--ink-3, #999);
          user-select: none;
        }
        .cx-L03-diff-content {
          white-space: pre-wrap;
          word-break: break-all;
        }
        .cx-L03-badge {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: var(--ok, #4caf50);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 14px;
          transform: scale(0);
          opacity: 0;
          transition: transform 0.5s cubic-bezier(.2,.8,.4,1.2), opacity 0.5s;
        }
        .cx-L03-badge.cx-L03-show {
          transform: scale(1);
          opacity: 1;
        }
        .cx-L03-particles {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none;
          z-index: 20;
        }
        .cx-L03-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--cyan, #39aaeb);
          opacity: 0;
        }
      `;
      document.head.appendChild(style);
    }

    const conventions = [
      { id: 'test', label: 'test layout' },
      { id: 'error', label: 'error handling' },
      { id: 'lint', label: 'lint command' },
      { id: 'branch', label: 'branch naming' },
      { id: 'review', label: 'review voice' }
    ];

    let absorbedCount = 0;

    root.innerHTML = `
      <div class="cx-L03-container">
        <div class="cx-L03-left" id="cx-L03-cards">
          ${conventions.map(c => `<div class="cx-L03-card" data-id="${c.id}" draggable="true" tabindex="0" aria-label="Add ${c.label}">${c.label}</div>`).join('')}
        </div>
        <div class="cx-L03-center">
          <svg class="cx-L03-crystal-svg" viewBox="0 0 100 100" id="cx-L03-crystal">
            <!-- Base Hexagon -->
            <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="var(--cyan, #39aaeb)" stroke-width="2" />
            <!-- Facets -->
            <polygon class="cx-L03-facet" id="cx-L03-facet-test" points="50,5 90,25 50,50" />
            <polygon class="cx-L03-facet" id="cx-L03-facet-error" points="90,25 90,75 50,50" />
            <polygon class="cx-L03-facet" id="cx-L03-facet-lint" points="90,75 50,95 50,50" />
            <polygon class="cx-L03-facet" id="cx-L03-facet-branch" points="50,95 10,75 50,50" />
            <polygon class="cx-L03-facet" id="cx-L03-facet-review" points="10,75 10,25 50,50" />
            <polygon class="cx-L03-facet" id="cx-L03-facet-base" points="10,25 50,5 50,50" />
          </svg>
          <div class="cx-L03-count" id="cx-L03-count">conventions: 0/5</div>
          <div class="cx-L03-particles" id="cx-L03-particles"></div>
        </div>
        <div class="cx-L03-right">
          <div class="cx-L03-pr-header">
            <div class="cx-L03-pr-title" id="cx-L03-pr-title">Refactor auth</div>
            <div class="cx-L03-pr-branch" id="cx-L03-pr-branch">generic codex-refactor</div>
          </div>
          <div class="cx-L03-pr-body">
            <div class="cx-L03-diff-line" id="cx-L03-diff-test">
              <span class="cx-L03-diff-icon">M</span>
              <span class="cx-L03-diff-content" id="cx-L03-content-test">test_underscore.js</span>
            </div>
            <div class="cx-L03-diff-line" id="cx-L03-diff-error">
              <span class="cx-L03-diff-icon">+</span>
              <span class="cx-L03-diff-content" id="cx-L03-content-error">throw new Error("fail");</span>
            </div>
            <div class="cx-L03-diff-line" id="cx-L03-diff-lint" style="display: none;">
              <span class="cx-L03-diff-icon">*</span>
              <span class="cx-L03-diff-content" id="cx-L03-content-lint"></span>
            </div>
          </div>
          <div class="cx-L03-badge" id="cx-L03-badge">STYLE CONFORMANT</div>
        </div>
      </div>
    `;

    const cards = root.querySelectorAll('.cx-L03-card');
    const crystal = root.querySelector('#cx-L03-crystal');
    const countEl = root.querySelector('#cx-L03-count');
    const particlesContainer = root.querySelector('#cx-L03-particles');

    const prTitle = root.querySelector('#cx-L03-pr-title');
    const prBranch = root.querySelector('#cx-L03-pr-branch');
    const contentTest = root.querySelector('#cx-L03-content-test');
    const contentError = root.querySelector('#cx-L03-content-error');
    const diffLint = root.querySelector('#cx-L03-diff-lint');
    const contentLint = root.querySelector('#cx-L03-content-lint');
    const badge = root.querySelector('#cx-L03-badge');

    const triggerHighlight = (elId) => {
      const el = root.querySelector('#' + elId);
      if (el) {
        el.classList.remove('cx-L03-highlight');
        void el.offsetWidth; // trigger reflow
        el.classList.add('cx-L03-highlight');
      }
    };

    const absorb = (id, cardEl) => {
      if (cardEl.classList.contains('cx-L03-absorbed')) return;
      cardEl.classList.add('cx-L03-absorbed');
      
      absorbedCount++;
      countEl.textContent = `conventions: ${absorbedCount}/5`;
      
      const facet = root.querySelector('#cx-L03-facet-' + id);
      if (facet) facet.classList.add('cx-L03-visible');
      
      const opacity = 0.3 + (absorbedCount * 0.14);
      crystal.style.opacity = opacity;
      crystal.style.filter = `drop-shadow(0 0 ${2 + absorbedCount * 2}px var(--cyan, #39aaeb))`;

      if (id === 'test') {
        contentTest.textContent = 'tests/spec.js';
        triggerHighlight('cx-L03-diff-test');
      } else if (id === 'error') {
        contentError.textContent = 'throw new ServiceError("fail");';
        triggerHighlight('cx-L03-diff-error');
      } else if (id === 'lint') {
        diffLint.style.display = 'flex';
        contentLint.textContent = '// lint eslint fix applied';
        triggerHighlight('cx-L03-diff-lint');
      } else if (id === 'branch') {
        prBranch.textContent = 'feat codex-refactor-auth';
        triggerHighlight('cx-L03-pr-branch');
      } else if (id === 'review') {
        prTitle.textContent = 'feat auth tighten rate-limit and error boundaries';
        triggerHighlight('cx-L03-pr-title');
      }

      if (absorbedCount === 5) {
        setTimeout(() => {
          badge.classList.add('cx-L03-show');
          burstParticles();
          if (ctx && ctx.Progress && ctx.Progress.markCheckpoint) {
            ctx.Progress.markCheckpoint(ctx.lessonId, ctx.cpId, 'bespoke');
          }
          if (ctx && ctx.emitXp) ctx.emitXp();
          if (ctx && ctx.confetti) ctx.confetti(crystal);
        }, 300);
      }
    };

    const burstParticles = () => {
      const rect = crystal.getBoundingClientRect();
      const centerX = 100; // relative to center container
      const centerY = 100;
      
      for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'cx-L03-particle';
        particlesContainer.appendChild(p);
        
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 60;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        
        p.style.left = '50%';
        p.style.top = '50%';
        
        p.animate([
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
        ], {
          duration: 600 + Math.random() * 400,
          easing: 'cubic-bezier(.2,.8,.4,1.2)',
          fill: 'forwards'
        });
      }
    };

    cards.forEach(card => {
      card.addEventListener('click', () => absorb(card.dataset.id, card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          absorb(card.dataset.id, card);
        }
      });
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
      });
    });

    crystal.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    crystal.addEventListener('drop', (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const card = root.querySelector(`.cx-L03-card[data-id="${id}"]`);
      if (card) absorb(id, card);
    });
  }
};
