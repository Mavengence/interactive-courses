window.CX = window.CX || {};
window.CX.L10 = {
  id: 'L10',
  title: 'Git Graph Orchestrator',
  mount: function (root, ctx) {
    const lessonId = '10';
    const cpId = 'git-graph-orchestrator';

    const styles = `
      .cx-L10-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: var(--mono);
        color: var(--ink-1);
      }
      .cx-L10-task-board {
        display: flex;
        justify-content: space-around;
        margin-bottom: 24px;
      }
      .cx-L10-task-card {
        border: 1px solid var(--rule-2);
        padding: 12px;
        width: 30%;
        text-align: center;
      }
      .cx-L10-task-card button {
        background-color: var(--cyan);
        color: var(--paper);
        border: none;
        padding: 8px 12px;
        cursor: pointer;
      }
      .cx-L10-git-graph {
        flex-grow: 1;
        position: relative;
      }
      .cx-L10-status-bar {
        border-top: 1px solid var(--rule-2);
        padding-top: 12px;
        text-align: center;
      }
      .cx-L10-conflict-panel {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: var(--paper);
        border: 1px solid var(--rule-2);
        padding: 24px;
        z-index: 10;
      }
    `;

    if (!document.getElementById('cx-L10-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'cx-L10-styles';
      styleEl.innerHTML = styles;
      document.head.appendChild(styleEl);
    }

    const html = `
      <div class="cx-L10-wrapper">
        <div class="cx-L10-task-board">
          <div class="cx-L10-task-card" id="task-1">
            <h3>T1: add health endpoint</h3>
            <p>(tiny, 2 min)</p>
            <button>Launch</button>
          </div>
          <div class="cx-L10-task-card" id="task-2">
            <h3>T2: refactor logger</h3>
            <p>(medium, 6 min)</p>
            <button>Launch</button>
          </div>
          <div class="cx-L10-task-card" id="task-3">
            <h3>T3: typed config loader</h3>
            <p>(medium, 5 min)</p>
            <button>Launch</button>
          </div>
        </div>
        <div class="cx-L10-git-graph">
          <svg width="100%" height="100%"></svg>
        </div>
        <div class="cx-L10-status-bar">
          <p>Ready</p>
        </div>
      </div>
    `;

    root.innerHTML = html;

    const svg = root.querySelector('.cx-L10-git-graph svg');
    const statusBar = root.querySelector('.cx-L10-status-bar p');
    const tasks = {
        t1: { id: 'T1', name: 'add health endpoint', duration: 2, commits: 3, element: root.querySelector('#task-1'), button: root.querySelector('#task-1 button'), lane: 1, status: 'queued' },
        t2: { id: 'T2', name: 'refactor logger', duration: 6, commits: 8, element: root.querySelector('#task-2'), button: root.querySelector('#task-2 button'), lane: 2, status: 'queued' },
        t3: { id: 'T3', name: 'typed config loader', duration: 5, commits: 6, element: root.querySelector('#task-3'), button: root.querySelector('#task-3 button'), lane: 3, status: 'queued' },
    };

    let completedTasks = 0;

    function _cxL10_initGraph() {
        svg.innerHTML = '<line x1="30" y1="0" x2="30" y2="100%" stroke="var(--ink-3)" stroke-width="2"/>';
    }

    function _cxL10_startTask(task) {
        task.status = 'inprogress';
        task.button.disabled = true;
        statusBar.textContent = `${task.id}: in-progress... 0 commits`;

        let commitCount = 0;
        const commitInterval = setInterval(() => {
            commitCount++;
            statusBar.textContent = `${task.id}: in-progress... ${commitCount} commits`;
            if (commitCount >= task.commits) {
                clearInterval(commitInterval);
                task.status = 'done';
                statusBar.textContent = `${task.id}: completed.`;
                completedTasks++;
                _cxL10_checkCompletion();
            }
        }, (task.duration * 1000) / task.commits);
    }

    function _cxL10_checkCompletion() {
        if (tasks.t2.status === 'done' && tasks.t3.status === 'done') {
            _cxL10_handleConflict();
        }
        if (completedTasks === 3) {
            statusBar.textContent = 'All tasks completed! 3 agents, 17 commits, 1 conflict resolved, wall-clock time 6m';
            if (ctx.Progress) {
                ctx.Progress.markCheckpoint(lessonId, cpId, 'bespoke');
            }
            ctx.emitXp();
            ctx.confetti(statusBar);
        }
    }

    function _cxL10_handleConflict() {
        const conflictPanel = document.createElement('div');
        conflictPanel.className = 'cx-L10-conflict-panel';
        conflictPanel.innerHTML = `
            <h3>Merge Conflict</h3>
            <p><<<<<<< T2</p>
            <p>log.info</p>
            <p>========</p>
            <p>logger.info</p>
            <p>>>>>>>>> T3</p>
            <button id="rebase-btn">Rebase T3 on T2</button>
            <button id="manual-merge-btn">Manual Merge</button>
        `;
        root.appendChild(conflictPanel);

        root.querySelector('#rebase-btn').addEventListener('click', () => {
            conflictPanel.remove();
            _cxL10_checkCompletion();
        });

        root.querySelector('#manual-merge-btn').addEventListener('click', () => {
            conflictPanel.innerHTML = `
                <h3>Manual Merge</h3>
                <p><<<<<<< T2</p>
                <p>log.info</p>
                <p>========</p>
                <p>logger.info</p>
                <p>>>>>>>>> T3</p>
                <button id="keep-t3-btn">Keep T3</button>
            `;
            root.querySelector('#keep-t3-btn').addEventListener('click', () => {
                conflictPanel.remove();
                _cxL10_checkCompletion();
            });
        });
    }

    _cxL10_initGraph();

    tasks.t1.button.addEventListener('click', () => _cxL10_startTask(tasks.t1));
    tasks.t2.button.addEventListener('click', () => _cxL10_startTask(tasks.t2));
    tasks.t3.button.addEventListener('click', () => _cxL10_startTask(tasks.t3));
  }
};
