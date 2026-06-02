window.CX = window.CX || {};
window.CX.L06 = {
  id: 'L06',
  title: 'Done checklist engine',
  mount: function(root, ctx) {
    const ns = 'cx-L06';

    const criteria = [
      { ambiguous: 'should work well', options: ['works', 'all 47 unit tests pass', 'QA is happy'], correct: 1 },
      { ambiguous: 'handles edge cases', options: ['does not crash', 'empty input returns 400, null input returns 400, 2GB input is rejected with 413', 'tested some edges'], correct: 1 },
      { ambiguous: 'performant', options: ['fast enough', 'p95 latency under 200ms with 100 concurrent requests', 'no slow queries'], correct: 1 },
      { ambiguous: 'looks good', options: ['no broken layout', 'passes existing snapshot tests; new component has snapshot', 'design approved'], correct: 1 },
      { ambiguous: 'well-documented', options: ['has docs', 'new public functions have JSDoc; README section updated', 'self-explanatory'], correct: 1 },
      { ambiguous: 'tested', options: ['has tests', 'coverage on changed lines at least 85 percent measured by c8', 'manually verified'], correct: 1 },
      { ambiguous: 'secure', options: ['no bugs', 'passes npm audit with audit-level high; no new secrets in env logs', 'reviewed by security'], correct: 1 },
    ];

    const styles = `
      .cx-L06-container {
        display: flex;
        gap: 24px;
        font-family: var(--mono);
      }
      .cx-L06-checklist { flex-grow: 1; }
      .cx-L06-pr-card { flex-shrink: 0; width: 280px; border: 1px solid var(--rule-2); padding: 16px; border-radius: 8px; }
      .cx-L06-item { display: flex; align-items: center; margin-bottom: 12px; }
      .cx-L06-ambiguous { text-decoration: line-through; font-style: italic; margin-right: 16px; }
      .cx-L06-dropdown-btn { background: var(--paper); border: 1px solid var(--rule-2); padding: 4px 8px; border-radius: 4px; cursor: pointer; }
      .cx-L06-status { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--rule-2); margin-left: auto; }
      .cx-L06-status.correct { background-color: var(--ok); }
      .cx-L06-status.mediocre { background-color: var(--warn); }
      .cx-L06-scoreboard { margin-bottom: 24px; }
      .cx-L06-pr-header { font-weight: bold; margin-bottom: 16px; }
      .cx-L06-pr-check { margin-bottom: 8px; }
    `;

    if (!document.getElementById(`${ns}-styles`)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = `${ns}-styles`;
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);
    }

    const satisfied = new Set();
    let completed = false;

    const updateScoreboard = () => {
      const scoreboard = root.querySelector(`.${ns}-scoreboard`);
      scoreboard.innerHTML = `definition of done: ${satisfied.size}/7`;
    };

    const checkCompletion = () => {
      if (satisfied.size === 7 && !completed) {
        completed = true;
        const prHeader = root.querySelector(`.${ns}-pr-header`);
        prHeader.textContent = 'READY';
        if (ctx.Progress) {
          ctx.Progress.markCheckpoint(ctx.lessonId, ctx.cpId, 'bespoke');
        }
        ctx.emitXp();
        if (ctx.confetti) {
          ctx.confetti(prHeader);
        }
      }
    };

    root.innerHTML = `
      <div class="${ns}-container">
        <div class="${ns}-checklist">
          <div class="${ns}-scoreboard">definition of done: 0/7</div>
          ${criteria.map((item, i) => `
            <div class="${ns}-item">
              <div class="${ns}-ambiguous">${item.ambiguous}</div>
              <div class="${ns}-dropdown">
                <button class="${ns}-dropdown-btn">pick rewrite</button>
                <div class="${ns}-dropdown-content" style="display: none;">
                  ${item.options.map((opt, j) => `<a href="#" data-item="${i}" data-option="${j}">${opt}</a>`).join('')}
                </div>
              </div>
              <div class="${ns}-status"></div>
            </div>
          `).join('')}
        </div>
        <div class="${ns}-pr-card">
          <div class="${ns}-pr-header">DRAFT</div>
          ${criteria.map((_, i) => `<div class="${ns}-pr-check" id="pr-check-${i}">☐ Check ${i + 1}</div>`).join('')}
        </div>
      </div>
    `;

    root.querySelectorAll(`.${ns}-dropdown-btn`).forEach(btn => {
      btn.addEventListener('click', e => {
        const content = e.target.nextElementSibling;
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
      });
    });

    root.querySelectorAll(`.${ns}-dropdown-content a`).forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const itemIndex = e.target.dataset.item;
        const optionIndex = e.target.dataset.option;
        const item = criteria[itemIndex];
        const statusEl = root.querySelectorAll(`.${ns}-status`)[itemIndex];

        const idx = parseInt(itemIndex);
        if (parseInt(optionIndex) === item.correct) {
          statusEl.className = `${ns}-status correct`;
          satisfied.add(idx);
          root.querySelector(`#pr-check-${itemIndex}`).textContent = `☑ Check ${idx + 1}`;
        } else {
          statusEl.className = `${ns}-status mediocre`;
          satisfied.delete(idx);
          root.querySelector(`#pr-check-${itemIndex}`).textContent = `☐ Check ${idx + 1}`;
        }

        updateScoreboard();
        checkCompletion();

        const dropdownContent = e.target.parentElement;
        dropdownContent.style.display = 'none';
        const dropdownBtn = dropdownContent.previousElementSibling;
        dropdownBtn.textContent = e.target.textContent;
      });
    });
  }
};
