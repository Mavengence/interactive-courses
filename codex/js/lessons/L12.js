window.CX = window.CX || {};
window.CX.L12 = {
  id: 'L12',
  title: 'The daily loop',
  mount: function (root, ctx) {
    const lessonId = ctx.lessonId || '12';
    const cpId = ctx.cpId || 'L12-main';

    const styles = `
      .cx-L12-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: var(--mono);
      }
      .cx-L12-left-column {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .cx-L12-block {
        padding: 10px;
        background: var(--paper);
        border: 1px solid var(--rule-2);
        cursor: grab;
        text-align: center;
      }
      .cx-L12-clock-container {
        position: relative;
        width: 400px;
        height: 400px;
      }
      .cx-L12-clock-svg {
        width: 100%;
        height: 100%;
      }
      .cx-L12-timer {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
      }
      .cx-L12-certificate {
        display: none;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--paper);
        border: 1px solid var(--rule-2);
        padding: 40px;
        text-align: center;
        font-size: 24px;
      }
    `;

    if (!document.getElementById('cx-L12-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'cx-L12-styles';
      styleSheet.innerHTML = styles;
      document.head.appendChild(styleSheet);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'cx-L12-wrapper';
    root.appendChild(wrapper);

    const leftColumn = document.createElement('div');
    leftColumn.className = 'cx-L12-left-column';
    wrapper.appendChild(leftColumn);

    const blocks = [
      { name: 'triage', duration: '15m' },
      { name: 'spec', duration: '30m' },
      { name: 'launch', duration: '5m' },
      { name: 'async review', duration: '20m' },
      { name: 'iterate', duration: '15m' },
      { name: 'merge', duration: '10m' },
    ];

    blocks.forEach(block => {
      const blockEl = document.createElement('div');
      blockEl.className = 'cx-L12-block';
      blockEl.textContent = `${block.name} (${block.duration})`;
      blockEl.draggable = true;
      blockEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', block.name);
      });
      leftColumn.appendChild(blockEl);
    });

    const clockContainer = document.createElement('div');
    clockContainer.className = 'cx-L12-clock-container';
    wrapper.appendChild(clockContainer);

    const clockSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    clockSVG.classList.add('cx-L12-clock-svg');
    clockSVG.setAttribute('viewBox', '0 0 100 100');
    clockContainer.appendChild(clockSVG);

    const timer = document.createElement('div');
    timer.className = 'cx-L12-timer';
    let startTime = 9 * 60;
    let currentTime = startTime;
    let timerInterval;

    function updateTimer() {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      timer.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function startTimer() {
      timerInterval = setInterval(() => {
        currentTime++;
        updateTimer();
        animateAgent();
      }, 100);
    }

    updateTimer();
    startTimer();
    clockContainer.appendChild(timer);

    const validHours = {
      triage: [9, 9.5],
      spec: [9.25, 10],
      launch: [10, 10.25],
      'async review': [10.5, 12],
      iterate: [14, 15],
      merge: [15.5, 16]
    };

    const placedBlocks = new Set();
    const certificate = document.createElement('div');
    certificate.className = 'cx-L12-certificate';
    certificate.innerHTML = '<h2>You are Codex-fluent.</h2>';
    root.appendChild(certificate);

    const centerX = 50;
    const centerY = 50;
    const radius = 40;

    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', centerX);
    ring.setAttribute('cy', centerY);
    ring.setAttribute('r', radius);
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', 'var(--rule-2)');
    ring.setAttribute('stroke-width', 1);
    ring.setAttribute('stroke-dasharray', '1, 1');
    clockSVG.appendChild(ring);

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + (radius + 5) * Math.cos(angle);
      const y = centerY + (radius + 5) * Math.sin(angle);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-size', '4');
      text.setAttribute('fill', 'var(--ink-2)');
      text.textContent = i;
      clockSVG.appendChild(text);
    }

    const agentAvatar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    agentAvatar.setAttribute('cx', centerX + radius * Math.cos(-Math.PI / 2));
    agentAvatar.setAttribute('cy', centerY + radius * Math.sin(-Math.PI / 2));
    agentAvatar.setAttribute('r', 3);
    agentAvatar.setAttribute('fill', 'var(--cyan)');
    clockSVG.appendChild(agentAvatar);

    function animateAgent() {
      const totalMinutes = 24 * 60;
      const currentMinute = currentTime % totalMinutes;
      const angle = (currentMinute / totalMinutes) * 2 * Math.PI - Math.PI / 2;
      const agentX = centerX + radius * Math.cos(angle);
      const agentY = centerY + radius * Math.sin(angle);
      agentAvatar.setAttribute('cx', agentX);
      agentAvatar.setAttribute('cy', agentY);
    }

    clockContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    clockContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      const blockName = e.dataTransfer.getData('text/plain');
      const rect = clockContainer.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      const dropAngle = Math.atan2(dropY - rect.height / 2, dropX - rect.width / 2);
      let dropHour = (dropAngle * 12 / Math.PI) + 6;
      if (dropHour < 0) dropHour += 24;

      if (isValidDrop(blockName, dropHour)) {
        const block = blocks.find(b => b.name === blockName);
        const startAngle = (validHours[blockName][0] - 6) * Math.PI / 12;
        const endAngle = (validHours[blockName][1] - 6) * Math.PI / 12;
        const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const startX = centerX + radius * Math.cos(startAngle);
        const startY = centerY + radius * Math.sin(startAngle);
        const endX = centerX + radius * Math.cos(endAngle);
        const endY = centerY + radius * Math.sin(endAngle);
        const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
        const d = [
          'M', startX, startY,
          'A', radius, radius, 0, largeArcFlag, 1, endX, endY
        ].join(' ');
        arc.setAttribute('d', d);
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', 'var(--cyan)');
        arc.setAttribute('stroke-width', 2);
        clockSVG.appendChild(arc);

        const blockEl = Array.from(leftColumn.children).find(c => c.textContent.startsWith(blockName));
        if (blockEl) {
          blockEl.style.display = 'none';
        }

        placedBlocks.add(blockName);
        if (placedBlocks.size === blocks.length) {
          certificate.style.display = 'block';
          if (ctx.Progress) {
            ctx.Progress.markCheckpoint(lessonId, cpId, 'bespoke');
          }
          if (ctx.emitXp) {
            ctx.emitXp();
          }
          if (ctx.confetti) {
            ctx.confetti(certificate);
          }
          document.dispatchEvent(new CustomEvent('cc:lesson-complete'));
        }
      } else {
        const wedge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dropAngleRad = dropAngle;
        const startAngle = dropAngleRad - Math.PI / 24;
        const endAngle = dropAngleRad + Math.PI / 24;

        const startX = centerX + radius * Math.cos(startAngle);
        const startY = centerY + radius * Math.sin(startAngle);
        const endX = centerX + radius * Math.cos(endAngle);
        const endY = centerY + radius * Math.sin(endAngle);

        const d = `M ${centerX},${centerY} L ${startX},${startY} A ${radius},${radius} 0 0 1 ${endX},${endY} Z`;
        wedge.setAttribute('d', d);
        wedge.setAttribute('fill', 'var(--bad)');
        wedge.style.opacity = 0.5;
        clockSVG.appendChild(wedge);

        setTimeout(() => wedge.remove(), 500);

        const tooltip = document.createElement('div');
        tooltip.textContent = 'Cannot place block here.';
        tooltip.style.position = 'absolute';
        tooltip.style.background = 'var(--bad)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px';
        tooltip.style.borderRadius = '3px';
        tooltip.style.left = e.clientX + 'px';
        tooltip.style.top = e.clientY + 'px';
        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
      }
    });

    function isValidDrop(blockName, dropHour) {
      if (!validHours[blockName]) return false;
      return dropHour >= validHours[blockName][0] && dropHour <= validHours[blockName][1];
    }
  }
};
