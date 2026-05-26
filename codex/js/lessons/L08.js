window.CX = window.CX || {};
window.CX.L08 = {
  id: 'L08',
  title: 'Decision branch',
  mount: function (root, ctx) {
    const scenarios = [
      {
        text: 'Tests 1 of 3 passing — the 2 failures look flaky.',
        correct: 'nudge',
        explanation: 'Correct. The failures might be transient. Ask Codex to investigate the flaky tests before attempting a fix.',
        wrongExplanation: 'Suboptimal. Nudging Codex to check for flakiness is a faster, lower-effort first step than rewriting or re-specifying.'
      },
      {
        text: 'Tests 3 of 3 pass, but the PR adds a 300-line refactor that was not requested.',
        correct: 're-spec',
        explanation: 'Correct. The agent went out of scope. Tighten the task specification to prevent unwanted refactoring.',
        wrongExplanation: 'Suboptimal. The agent is working but overeager. Re-specifying the scope is the best way to guide it.'
      },
      {
        text: 'The PR fundamentally misunderstands the module\'s purpose.',
        correct: 'rewrite',
        explanation: 'Correct. This is a conceptual error. It\'s faster for a human to rewrite it than to try and course-correct the agent.',
        wrongExplanation: 'Suboptimal. The agent lacks the right context. It\'s more efficient for a human to take over at this point.'
      }
    ];

    let currentScenarioIndex = 0;
    const clearedScenarios = new Set();

    const injectStyles = () => {
      if (document.getElementById('cx-L08-styles')) return;
      const style = document.createElement('style');
      style.id = 'cx-L08-styles';
      style.innerHTML = `
        .cx-L08-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          font-family: var(--mono);
        }
        .cx-L08-scenario-card {
          background: var(--paper);
          border: 1px solid var(--rule-2);
          padding: 16px;
          margin-bottom: 24px;
          text-align: center;
          width: 80%;
        }
        .cx-L08-svg {
          width: 100%;
          max-width: 600px;
          overflow: visible;
        }
        .cx-L08-node {
          transition: all 0.3s cubic-bezier(.2,.7,.2,1);
        }
        .cx-L08-node-text {
          font-size: 14px;
          fill: var(--ink-1);
          font-family: var(--mono);
        }
        .cx-L08-branch {
          stroke: var(--rule-2);
          stroke-width: 2;
          fill: none;
          transition: stroke 0.3s ease;
        }
        .cx-L08-branch-interactive:hover {
          stroke: var(--cyan);
          cursor: pointer;
        }
        .cx-L08-explanation {
          margin-top: 16px;
          height: 40px;
          color: var(--ink-2);
          text-align: center;
        }
        .cx-L08-summary {
            display: none; /* Initially hidden */
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .cx-L08-summary h2 {
            font-family: var(--mono);
            color: var(--ok);
        }
      `;
      document.head.appendChild(style);
    };

    const setupDOM = () => {
      root.innerHTML = `
        <div class="cx-L08-wrapper">
          <div class="cx-L08-scenario-card"></div>
          <svg class="cx-L08-svg" viewBox="0 0 600 250"></svg>
          <div class="cx-L08-explanation"></div>
          <div class="cx-L08-summary">
            <h2>Iteration compass aligned</h2>
            <p>You\'ve mastered the decision branch.</p>
          </div>
        </div>
      `;
      return {
        scenarioCard: root.querySelector('.cx-L08-scenario-card'),
        svg: root.querySelector('.cx-L08-svg'),
        explanation: root.querySelector('.cx-L08-explanation'),
        summary: root.querySelector('.cx-L08-summary'),
        wrapper: root.querySelector('.cx-L08-wrapper')
      };
    };

    const drawTree = (svg) => {
        svg.innerHTML = `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--rule-2)" />
                </marker>
            </defs>
            <g class="cx-L08-node" id="cx-L08-start-node">
                <rect x="10" y="105" width="120" height="40" rx="8" fill="var(--paper)" stroke="var(--rule-2)" stroke-width="2" />
                <text x="70" y="130" text-anchor="middle" class="cx-L08-node-text">Codex PR lands</text>
            </g>
            ${drawBranchAndNode('nudge', 180, 40, 'M 130 125 H 180 L 220 40')}
            ${drawBranchAndNode('re-spec', 180, 90, 'M 130 125 H 180 L 220 90')}
            ${drawBranchAndNode('rewrite', 180, 160, 'M 130 125 H 180 L 220 160')}
            ${drawBranchAndNode('revert', 180, 210, 'M 130 125 H 180 L 220 210')}
        `;
    };

    const drawBranchAndNode = (id, x, y, path) => `
        <g id="cx-L08-group-${id}">
            <path id="cx-L08-branch-${id}" class="cx-L08-branch cx-L08-branch-interactive" d="${path}" />
            <g class="cx-L08-node">
                <rect id="cx-L08-node-${id}" x="${x+40}" y="${y-20}" width="100" height="40" rx="8" fill="var(--paper)" stroke="var(--rule-2)" stroke-width="2" />
                <text x="${x+90}" y="${y+5}" text-anchor="middle" class="cx-L08-node-text">${id}</text>
            </g>
        </g>
    `;

    const showScenario = (index) => {
        elements.scenarioCard.textContent = scenarios[index].text;
        elements.explanation.textContent = 'Choose the best action.';
        resetTreeStyles();
    };

    const resetTreeStyles = () => {
        ['nudge', 're-spec', 'rewrite', 'revert'].forEach(id => {
            const branch = document.getElementById(`cx-L08-branch-${id}`);
            const node = document.getElementById(`cx-L08-node-${id}`);
            if(branch) branch.style.stroke = 'var(--rule-2)';
            if(node) node.style.fill = 'var(--paper)';
        });
    };

    const handleChoice = (choice) => {
        const scenario = scenarios[currentScenarioIndex];
        const isCorrect = choice === scenario.correct;
        const branch = document.getElementById(`cx-L08-branch-${choice}`);
        const node = document.getElementById(`cx-L08-node-${choice}`);

        if (isCorrect) {
            if(branch) branch.style.stroke = 'var(--ok)';
            if(node) node.style.fill = 'var(--ok)';
            elements.explanation.textContent = scenario.explanation;
            clearedScenarios.add(currentScenarioIndex);

            if (clearedScenarios.size === scenarios.length) {
                elements.summary.style.display = 'flex';
                elements.scenarioCard.style.display = 'none';
                elements.svg.style.display = 'none';
                elements.explanation.style.display = 'none';
                if (ctx.Progress) ctx.Progress.markCheckpoint(ctx.lessonId, ctx.cpId, 'bespoke');
                if (ctx.emitXp) ctx.emitXp();
                if (ctx.confetti) ctx.confetti(elements.summary);
            } else {
                setTimeout(() => {
                    currentScenarioIndex = (currentScenarioIndex + 1) % scenarios.length;
                    while(clearedScenarios.has(currentScenarioIndex)){
                        currentScenarioIndex = (currentScenarioIndex + 1) % scenarios.length;
                    }
                    showScenario(currentScenarioIndex);
                }, 2000);
            }
        } else {
            if(branch) branch.style.stroke = 'var(--bad)';
            if(node) node.style.fill = 'var(--bad)';
            elements.explanation.textContent = scenario.wrongExplanation;
        }
    };

    injectStyles();
    const elements = setupDOM();
    drawTree(elements.svg);
    showScenario(currentScenarioIndex);

    ['nudge', 're-spec', 'rewrite', 'revert'].forEach(id => {
        const group = document.getElementById(`cx-L08-group-${id}`);
        if(group) group.addEventListener('click', () => handleChoice(id));
    });
  }
};
