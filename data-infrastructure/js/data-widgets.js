// Data Infrastructure widgets — simulations, animations, drills.
// Mounts into a target element. Reports checkpoints to Progress for XP.
(function () {
  // Respect prefers-reduced-motion: when set, animation loops render a single
  // static frame instead of running an unbounded requestAnimationFrame loop.
  const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // RAF: drop-in for requestAnimationFrame used by the self-rescheduling loops.
  // - prefers-reduced-motion: re-schedule at a slow ~4fps cadence instead of
  //   60fps. The canvases stop visibly animating (idle frames look static) and
  //   still repaint correctly after a resize, while CPU/battery cost drops ~94%.
  // - hidden tab: pause entirely until the tab is visible again, so background
  //   tabs don't burn CPU repainting offscreen canvases.
  function RAF(fn) {
    if (document.hidden) {
      document.addEventListener('visibilitychange', function once() {
        document.removeEventListener('visibilitychange', once);
        RAF(fn);
      });
      return 0;
    }
    if (REDUCED_MOTION) {
      return setTimeout(() => requestAnimationFrame(fn), 250);
    }
    return requestAnimationFrame(fn);
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const E = (tag, attrs={}, html='') => { const el = document.createElement(tag); for (const k in attrs) el.setAttribute(k, attrs[k]); el.innerHTML = html; return el; };
  const head = (kind, title, xp=15, earned=false) => `
    <div class="w-head">
      <span class="w-kind">${kind}</span>
      <span class="w-title">${esc(title||'')}</span>
      <span class="w-xp ${earned?'earned':''}">${earned?'+'+xp+' XP ✓':'+'+xp+' XP'}</span>
    </div>`;
  const award = (el, lessonId, cpId, kind='widget') => {
    const earned = window.Progress.markCheckpoint(lessonId, cpId, kind);
    if (earned) {
      const x = el.querySelector('.w-xp');
      if (x) { x.classList.add('earned'); x.textContent = x.textContent.replace(/\+(\d+) XP.*/, '+$1 XP ✓'); }
    }
  };

  // ============================================================
  // 1. STACK FLOW — canvas-driven cinematic packet flow
  // ============================================================
  function StackFlow(target, opts) {
    const { lessonId, cpId, layers } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = head('Sim', 'The stack, in motion', 20, earned) + `
      <div class="sf-frame">
        <div class="sf-canvas-wrap">
          <canvas class="sf-canvas" width="1200" height="520" role="img" aria-label="Animated diagram of an event flowing top-to-bottom through the data stack: source, log, process, store, serve, consume."></canvas>
          <div class="sf-overlay" id="sf-overlay"></div>
        </div>
        <div class="sf-controls">
          <button class="btn primary sm" data-act="play">▶ trace 1 event</button>
          <button class="btn sm" data-act="burst">▶▶ burst</button>
          <button class="btn sm" data-act="storm">⚡ storm</button>
          <span class="sf-counter">processed <b data-c="n">0</b> · flowing <b data-c="live">0</b> · throughput <b data-c="tps">0</b>/s</span>
        </div>
      </div>`;
    target.replaceWith(el);
    const overlay = $('#sf-overlay', el);
    const N = layers.length;
    layers.forEach((l, i) => {
      const row = E('div', {class:'sf-lane', 'data-i':i}, `
        <div class="sf-lane-l">
          <span class="sf-num">${String(i+1).padStart(2,'0')}</span>
          <div><div class="sf-name">${esc(l.name)}</div>
            <div class="sf-tools">${l.tools.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>
        </div>
        <div class="sf-pulse"></div>`);
      overlay.appendChild(row);
    });

    const cvs = el.querySelector('.sf-canvas');
    const ctx = cvs.getContext('2d');
    const PALETTE = ['#cf8a3f','#5b8a8f','#a8632c','#7a4a8a','#3f8264','#b85a4a','#3a6b8c'];
    let particles = [];
    let pulses = []; // lane glow {lane, t}
    let n=0, ticks=[];
    const counters = {
      n: el.querySelector('[data-c="n"]'),
      live: el.querySelector('[data-c="live"]'),
      tps: el.querySelector('[data-c="tps"]')
    };

    function lanePos(i) {
      const lane = overlay.querySelector(`.sf-lane[data-i="${i}"]`);
      const r = lane.getBoundingClientRect();
      const wrapR = cvs.getBoundingClientRect();
      const scaleX = cvs.width / wrapR.width;
      const scaleY = cvs.height / wrapR.height;
      return {
        x0: (r.left - wrapR.left + 280) * scaleX,
        x1: (r.right - wrapR.left - 16) * scaleX,
        y: (r.top - wrapR.top + r.height/2) * scaleY,
        h: r.height * scaleY
      };
    }

    function fire(speedMul=1) {
      n++;
      counters.n.textContent = n;
      ticks.push(performance.now());
      const color = PALETTE[n % PALETTE.length];
      const baseDelay = 160 / speedMul;
      const travel = 700 / speedMul;
      for (let i=0; i<N; i++) {
        const head = i===0;
        setTimeout(() => {
          const p = lanePos(i);
          // 3 jittered particles per lane for body
          for (let k=0; k<3; k++) {
            particles.push({
              x: p.x0, y: p.y + (k-1)*4 + (Math.random()-0.5)*3,
              x0: p.x0, x1: p.x1, y0: p.y, lane: i,
              t: 0, dur: travel * (0.85 + Math.random()*0.3),
              size: k===1 ? 4 : 2.5,
              color, alpha: k===1 ? 1 : 0.55,
              trail: [], born: performance.now()
            });
          }
          // lane pulse on entry
          pulses.push({ lane: i, t: 0 });
          const lane = overlay.querySelector(`.sf-lane[data-i="${i}"]`);
          lane.classList.remove('hit'); void lane.offsetWidth; lane.classList.add('hit');
        }, i * baseDelay);
      }
      if (n >= 3) award(el, lessonId, cpId, 'stack-flow');
    }

    function loop() {
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);
      // backdrop rails
      for (let i=0; i<N; i++) {
        const p = lanePos(i);
        const grd = ctx.createLinearGradient(p.x0, 0, p.x1, 0);
        grd.addColorStop(0, 'rgba(91,138,143,0.05)');
        grd.addColorStop(0.5,'rgba(91,138,143,0.18)');
        grd.addColorStop(1, 'rgba(91,138,143,0.05)');
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x0, p.y); ctx.lineTo(p.x1, p.y); ctx.stroke();
        // tick marks
        ctx.fillStyle = 'rgba(91,138,143,0.18)';
        for (let x = p.x0; x < p.x1; x += 30) {
          ctx.fillRect(x, p.y-1, 2, 2);
        }
      }
      // pulses (lane wash)
      pulses = pulses.filter(pu => {
        pu.t += 0.04;
        if (pu.t >= 1) return false;
        const p = lanePos(pu.lane);
        const a = (1-pu.t) * 0.18;
        const grd = ctx.createLinearGradient(p.x0, 0, p.x1, 0);
        grd.addColorStop(0, `rgba(207,138,63,0)`);
        grd.addColorStop(pu.t, `rgba(207,138,63,${a})`);
        grd.addColorStop(Math.min(1, pu.t+0.15), `rgba(207,138,63,0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(p.x0, p.y - p.h*0.45, p.x1-p.x0, p.h*0.9);
        return true;
      });
      // particles
      const now = performance.now();
      particles = particles.filter(pt => {
        const dt = now - pt.born;
        pt.t = Math.min(1, dt / pt.dur);
        // ease-out cubic
        const e = 1 - Math.pow(1-pt.t, 3);
        pt.x = pt.x0 + (pt.x1 - pt.x0) * e;
        pt.trail.push({x: pt.x, y: pt.y, a: pt.alpha});
        if (pt.trail.length > 18) pt.trail.shift();
        // trail
        for (let i=0; i<pt.trail.length; i++) {
          const tr = pt.trail[i];
          const f = i / pt.trail.length;
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = f * tr.a * 0.5;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, pt.size * (0.3 + f*0.7), 0, Math.PI*2);
          ctx.fill();
        }
        // head
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.shadowBlur = 12; ctx.shadowColor = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        return pt.t < 1;
      });
      counters.live.textContent = Math.ceil(particles.length / 3);
      // tps over last 2s
      const cutoff = now - 2000;
      ticks = ticks.filter(t => t > cutoff);
      counters.tps.textContent = (ticks.length / 2).toFixed(1);
      RAF(loop);
    }
    loop();

    // resize canvas to wrap
    function resize() {
      const wrap = el.querySelector('.sf-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(800, r.width * 2);
      cvs.height = r.height * 2;
    }
    new ResizeObserver(resize).observe(el.querySelector('.sf-canvas-wrap'));
    setTimeout(resize, 50);

    el.querySelector('[data-act="play"]').onclick = () => fire(1);
    el.querySelector('[data-act="burst"]').onclick = () => {
      for (let i=0;i<10;i++) setTimeout(()=>fire(1), i*180);
    };
    el.querySelector('[data-act="storm"]').onclick = () => {
      for (let i=0;i<40;i++) setTimeout(()=>fire(1.6), i*60);
    };
  }

  // ============================================================
  // 2. CAP TRIANGLE — interactive constraint picker
  // ============================================================
  function CapTriangle(target, opts) {
    const { lessonId, cpId } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = head('Sim', 'CAP — pick the partition you accept', 20, earned) + `
      <div class="capx-frame">
        <div class="capx-canvas-wrap">
          <canvas class="capx-canvas" width="1400" height="600" role="img" aria-label="Interactive CAP theorem triangle showing the trade-off between consistency, availability, and partition tolerance."></canvas>
        </div>
        <div class="capx-controls">
          <button class="btn sm" data-act="CP">CP — consistent + partition-tolerant</button>
          <button class="btn sm" data-act="AP">AP — available + partition-tolerant</button>
          <button class="btn sm" data-act="CA">CA — single-node only</button>
          <button class="btn primary sm" data-act="split">⚡ inject network split</button>
          <span class="capx-stat" data-stat>Pick a pair · then inject a partition to see the trade in action.</span>
        </div>
      </div>`;
    target.replaceWith(el);
    const cvs = el.querySelector('.capx-canvas');
    const ctx = cvs.getContext('2d');
    const stat = el.querySelector('[data-stat]');
    let pick = null; // 'CP'|'AP'|'CA'
    let split = false;
    let splitT = 0; // 0..1 animation
    let picks = 0;
    let particles = []; // client request flights
    let lastEmit = 0;

    const triangleVerts = () => {
      const cx = 380, cy = 320;
      const R = 230;
      return {
        C: { x: cx,        y: cy - R },                          // top
        A: { x: cx - R*0.866, y: cy + R*0.5 },                   // bottom-left
        P: { x: cx + R*0.866, y: cy + R*0.5 }                    // bottom-right
      };
    };
    const clusterPos = () => {
      const baseX = 920, cy = 320;
      const offset = splitT * 110;
      return {
        n1: { x: baseX - 100 - offset, y: cy - 80 },
        n2: { x: baseX - 60 - offset,  y: cy + 60 },
        n3: { x: baseX + 60 + offset,  y: cy - 80 },
        n4: { x: baseX + 100 + offset, y: cy + 60 },
        client: { x: 1280, y: cy }
      };
    };

    function loop(){
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);
      // backdrop
      ctx.fillStyle = 'rgba(91,138,143,0.5)'; ctx.font = '600 36px JetBrains Mono';
      ctx.fillText('CAP THEOREM · pick any TWO during a partition', 30, 28);
      ctx.fillText('LIVE CLUSTER', 880, 28);

      // animate splitT toward target
      const target = split ? 1 : 0;
      splitT += (target - splitT) * 0.06;

      // ============= triangle =============
      const V = triangleVerts();
      // edges
      const edges = [
        { a:'C', b:'A', label:'CA' },
        { a:'C', b:'P', label:'CP' },
        { a:'A', b:'P', label:'AP' }
      ];
      edges.forEach(e => {
        const va = V[e.a], vb = V[e.b];
        const isPick = pick === e.label;
        ctx.strokeStyle = isPick ? '#cf8a3f' : 'rgba(91,138,143,0.3)';
        ctx.lineWidth = isPick ? 5 : 2;
        ctx.lineCap = 'round';
        if (isPick){
          ctx.shadowBlur = 18; ctx.shadowColor = '#cf8a3f';
        }
        ctx.beginPath(); ctx.moveTo(va.x, va.y); ctx.lineTo(vb.x, vb.y); ctx.stroke();
        ctx.shadowBlur = 0;
        // edge label midpoint
        const mx = (va.x+vb.x)/2, my = (va.y+vb.y)/2;
        ctx.fillStyle = isPick ? '#cf8a3f' : 'rgba(91,138,143,0.55)';
        ctx.font = isPick ? '700 14px JetBrains Mono' : '600 12px JetBrains Mono';
        ctx.fillText(e.label, mx - 12, my + 4);
      });
      // vertices
      const labels = {
        C: { name:'Consistency',    sub:'every read sees latest write' },
        A: { name:'Availability',   sub:'every request gets a non-error response' },
        P: { name:'Partition tol.', sub:'system survives network split' }
      };
      Object.keys(V).forEach(k => {
        const p = V[k];
        const inPick = pick && pick.includes(k);
        ctx.fillStyle = inPick ? '#5b8a8f' : 'oklch(0.985 0.003 240)';
        ctx.strokeStyle = inPick ? '#3a6b70' : 'rgba(91,138,143,0.5)';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = inPick ? 14 : 0; ctx.shadowColor = '#5b8a8f';
        ctx.beginPath(); ctx.arc(p.x, p.y, 44, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = inPick ? 'white' : 'rgba(91,138,143,0.85)';
        ctx.font = '700 62px JetBrains Mono';
        ctx.fillText(k, p.x-9, p.y+8);
        // label below
        ctx.fillStyle = 'rgba(91,138,143,0.85)'; ctx.font = '600 34px JetBrains Mono';
        const tw = ctx.measureText(labels[k].name).width;
        const ly = k === 'C' ? p.y - 60 : p.y + 70;
        ctx.fillText(labels[k].name, p.x - tw/2, ly);
        ctx.fillStyle = 'rgba(91,138,143,0.6)'; ctx.font = '500 29px JetBrains Mono';
        const tw2 = ctx.measureText(labels[k].sub).width;
        ctx.fillText(labels[k].sub, p.x - tw2/2, ly + 16);
      });

      // ============= live cluster =============
      const C = clusterPos();
      // draw network "split" line
      if (splitT > 0.05){
        const baseX = 920;
        ctx.strokeStyle = 'rgba(184,90,74,0.55)';
        ctx.lineWidth = 2; ctx.setLineDash([6,4]);
        ctx.beginPath(); ctx.moveTo(baseX, 100); ctx.lineTo(baseX, 540); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#b85a4a'; ctx.globalAlpha = 0.85;
        ctx.font = '700 29px JetBrains Mono';
        ctx.fillText('PARTITION', baseX-32, 96);
        ctx.globalAlpha = 1;
      }
      // edges between nodes (intra-cluster)
      ctx.strokeStyle = 'rgba(91,138,143,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(C.n1.x, C.n1.y); ctx.lineTo(C.n2.x, C.n2.y);
      ctx.moveTo(C.n3.x, C.n3.y); ctx.lineTo(C.n4.x, C.n4.y);
      ctx.stroke();
      // cross-cluster (the split severs these)
      ctx.strokeStyle = splitT > 0.5 ? 'rgba(184,90,74,0.4)' : 'rgba(91,138,143,0.3)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash(splitT > 0.5 ? [3,4] : []);
      ctx.beginPath();
      ctx.moveTo(C.n1.x, C.n1.y); ctx.lineTo(C.n3.x, C.n3.y);
      ctx.moveTo(C.n2.x, C.n2.y); ctx.lineTo(C.n4.x, C.n4.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // nodes
      [C.n1, C.n2, C.n3, C.n4].forEach((n, i) => {
        ctx.fillStyle = 'oklch(0.985 0.003 240)';
        ctx.strokeStyle = '#5b8a8f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, 28, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5b8a8f'; ctx.font = '700 31px JetBrains Mono';
        ctx.fillText('n'+(i+1), n.x-9, n.y+5);
      });
      // client
      ctx.fillStyle = '#cf8a3f'; ctx.strokeStyle = '#a8632c'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(C.client.x-50, C.client.y-22, 100, 44, 6);
      else ctx.rect(C.client.x-50, C.client.y-22, 100, 44);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'white'; ctx.font = '600 31px JetBrains Mono';
      ctx.fillText('client', C.client.x-22, C.client.y+5);

      // emit client requests periodically
      const now = performance.now();
      if (now - lastEmit > 800){
        lastEmit = now;
        // pick target node
        const target = [C.n3, C.n4][Math.floor(Math.random()*2)];
        const partitionedSide = target.x < 920;
        let outcome;
        if (!split) outcome = 'ok';
        else if (pick === 'CP') outcome = partitionedSide ? 'reject' : 'ok';
        else if (pick === 'AP') outcome = 'stale';
        else if (pick === 'CA') outcome = partitionedSide ? 'fail' : 'ok';
        else outcome = 'ok';
        particles.push({
          x0: C.client.x-50, y0: C.client.y, x1: target.x, y1: target.y,
          t:0, dur: 700, born: now, outcome, returning: false
        });
      }
      // particles
      particles = particles.filter(pt => {
        const dt = now - pt.born;
        if (!pt.returning){
          pt.t = Math.min(1, dt/pt.dur);
          const e = 1 - Math.pow(1-pt.t, 3);
          pt.x = pt.x0 + (pt.x1-pt.x0)*e;
          pt.y = pt.y0 + (pt.y1-pt.y0)*e;
          if (pt.t >= 1){
            pt.returning = true; pt.born = now;
            pt.x0 = pt.x1; pt.y0 = pt.y1;
            pt.x1 = C.client.x-50; pt.y1 = C.client.y;
          }
        } else {
          pt.t = Math.min(1, dt/pt.dur);
          const e = 1 - Math.pow(1-pt.t, 3);
          pt.x = pt.x0 + (pt.x1-pt.x0)*e;
          pt.y = pt.y0 + (pt.y1-pt.y0)*e;
        }
        const col = pt.outcome === 'ok' ? '#3f8264'
                  : pt.outcome === 'stale' ? '#cf8a3f'
                  : '#b85a4a';
        ctx.fillStyle = col; ctx.shadowBlur = 10; ctx.shadowColor = col;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        // outcome label on return
        if (pt.returning && pt.t > 0.2 && pt.t < 0.9){
          ctx.fillStyle = col; ctx.font = '600 26px JetBrains Mono';
          const lbl = pt.outcome === 'ok' ? '200 OK' : pt.outcome === 'stale' ? '200 STALE' : pt.outcome === 'reject' ? '503 REJECT' : '⨯ FAIL';
          ctx.fillText(lbl, pt.x + 8, pt.y - 8);
        }
        return !(pt.returning && pt.t >= 1);
      });

      RAF(loop);
    }
    loop();

    function setPick(p){
      pick = p; picks++;
      const text = {
        CP: 'CP — refuses writes on the minority side during partition. <i>HBase, MongoDB(default), Spanner</i>',
        AP: 'AP — both sides keep serving; reads may be stale, will reconcile later. <i>Cassandra, DynamoDB, Riak</i>',
        CA: 'CA — only safe on a single node. Real distributed systems must pick CP or AP. <i>single-node Postgres</i>'
      }[p];
      stat.innerHTML = text;
      if (picks >= 2) award(el, lessonId, cpId, 'cap');
    }
    el.querySelector('[data-act="CP"]').onclick = () => setPick('CP');
    el.querySelector('[data-act="AP"]').onclick = () => setPick('AP');
    el.querySelector('[data-act="CA"]').onclick = () => setPick('CA');
    el.querySelector('[data-act="split"]').onclick = (e) => {
      split = !split;
      e.target.textContent = split ? '✓ heal partition' : '⚡ inject network split';
    };

    function resize(){
      const wrap = el.querySelector('.capx-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(900, r.width*2);
      cvs.height = Math.max(540, r.height*2);
    }
    new ResizeObserver(resize).observe(el.querySelector('.capx-canvas-wrap'));
    setTimeout(resize, 60);
  }

  // ============================================================
  // 3. ROW vs COLUMN — animated storage layout, query scan
  // ============================================================
  function RowColumn(target, opts) {
    const { lessonId, cpId } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    const ROWS = 12;
    const data = [];
    const countries = ['US','UK','JP','BR','DE','FR'];
    const names = ['alice','bob','cara','dan','eve','finn','gabe','hana','ivy','jon','kim','leo'];
    for (let i=0;i<ROWS;i++) data.push([1000+i, names[i], countries[i%6], (5 + Math.random()*90).toFixed(2)]);
    el.innerHTML = head('Sim', "SELECT SUM(amount) WHERE country='US' — row vs column", 20, earned) + `
      <div class="rc-frame">
        <div class="rc-canvas-wrap">
          <canvas class="rc-canvas" width="1400" height="540" role="img" aria-label="Diagram comparing row-oriented and column-oriented storage layouts and which columns a query reads."></canvas>
        </div>
        <div class="rc-controls">
          <button class="btn primary sm" data-act="run">▶ run query</button>
          <button class="btn sm" data-act="reset">reset</button>
          <span class="rc-counter">row store <b data-c="rb">—</b> · column store <b data-c="cb">—</b> · saved <b data-c="sv">—</b></span>
        </div>
      </div>`;
    target.replaceWith(el);
    const cvs = el.querySelector('.rc-canvas');
    const ctx = cvs.getContext('2d');
    const headers = ['id','user','country','amount'];
    let sweepRow = -1, sweepCol = -1;
    let particles = [];
    let running = false;
    const counters = {
      rb: el.querySelector('[data-c="rb"]'),
      cb: el.querySelector('[data-c="cb"]'),
      sv: el.querySelector('[data-c="sv"]')
    };

    function rowLayout(){
      const w = cvs.width, h = cvs.height;
      const padX = 30, padY = 50;
      const halfW = (w/2) - padX*1.5;
      const colW = halfW / 4;
      const rowH = (h - padY*2 - 28) / (ROWS+1);
      return { x: padX, y: padY, colW, rowH, halfW };
    }
    function colLayout(){
      const w = cvs.width, h = cvs.height;
      const padX = 30, padY = 50;
      const startX = w/2 + padX/2;
      const halfW = (w/2) - padX*1.5;
      const colW = halfW / 4;
      const rowH = (h - padY*2 - 28) / (ROWS+1);
      return { x: startX, y: padY, colW, rowH, halfW };
    }

    function run(){
      sweepRow = -1; sweepCol = -1;
      running = true;
      // row scan: sweep every row top to bottom
      for (let r=0;r<ROWS;r++){
        setTimeout(() => { sweepRow = r; }, r*120);
      }
      // column scan: sweep only country (col 2) and amount (col 3)
      setTimeout(() => {
        for (let r=0;r<ROWS;r++){
          setTimeout(() => { sweepCol = r; }, r*70);
        }
      }, 200);
      // results count
      const rowBytes = ROWS * 4 * 8;
      const colBytes = ROWS * 2 * 8;
      counters.rb.textContent = rowBytes + 'B (4 cols)';
      counters.cb.textContent = colBytes + 'B (2 cols)';
      counters.sv.textContent = Math.round((1 - colBytes/rowBytes)*100) + '% less';
      // launch particles to indicate matched US rows summing into a result
      const lay = colLayout();
      data.forEach((row, i) => {
        if (row[2]==='US'){
          setTimeout(() => {
            const x = lay.x + lay.colW*3.5;
            const y = lay.y + 28 + (i+1)*lay.rowH;
            for (let k=0;k<3;k++){
              particles.push({
                x, y, x0:x, y0:y,
                x1: cvs.width - 80, y1: 50,
                color: '#3f8264', size: k===1?4:2.5, alpha: k===1?1:0.5,
                t:0, dur: 700, born: performance.now(), trail: []
              });
            }
          }, 1200 + i*60);
        }
      });
      setTimeout(() => { running = false; award(el, lessonId, cpId, 'rowcol'); }, ROWS*120 + 1500);
    }
    function reset(){ sweepRow = -1; sweepCol = -1; particles = []; counters.rb.textContent='—'; counters.cb.textContent='—'; counters.sv.textContent='—'; }

    function loop(){
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);
      // section labels
      ctx.fillStyle = 'oklch(0.4 0.13 220)'; ctx.font = '700 57px JetBrains Mono';
      ctx.fillText('row store · Postgres', 30, 30);
      ctx.fillText('column store · Parquet', w/2 + 20, 30);
      // ROW
      const rl = rowLayout();
      // header row
      ctx.fillStyle = 'oklch(0.94 0.007 240)';
      ctx.fillRect(rl.x, rl.y, rl.colW*4, rl.rowH);
      headers.forEach((hd, c) => {
        ctx.fillStyle = 'oklch(0.22 0.012 250)'; ctx.font = '600 42px JetBrains Mono';
        ctx.fillText(hd, rl.x + c*rl.colW + 8, rl.y + rl.rowH/2 + 5);
      });
      // body rows: rendered as a single horizontal strip per row to emphasize "row contiguous"
      data.forEach((row, r) => {
        const y = rl.y + rl.rowH + r*rl.rowH;
        // row contiguous strip (subtle background)
        const isSwept = r <= sweepRow && sweepRow >= 0;
        ctx.fillStyle = isSwept ? 'oklch(0.93 0.045 215)' : 'oklch(0.985 0.003 240)';
        ctx.fillRect(rl.x, y, rl.colW*4, rl.rowH-1);
        // bracket showing contiguous row
        ctx.strokeStyle = isSwept ? '#cf8a3f' : 'rgba(91,138,143,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rl.x, y, rl.colW*4, rl.rowH-1);
        // cells
        row.forEach((cell, c) => {
          const x = rl.x + c*rl.colW;
          ctx.fillStyle = isSwept && row[2]==='US' && (c===2||c===3) ? 'oklch(0.4 0.13 155)' : 'oklch(0.38 0.01 250)';
          ctx.font = '36px JetBrains Mono';
          ctx.fillText(String(cell), x + 8, y + rl.rowH/2 + 5);
          // separators
          if (c < 3) {
            ctx.strokeStyle = 'rgba(91,138,143,0.15)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x+rl.colW, y); ctx.lineTo(x+rl.colW, y+rl.rowH); ctx.stroke();
          }
        });
        // sweep arrow on active row
        if (r === sweepRow){
          ctx.strokeStyle = '#cf8a3f'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(rl.x - 12, y + rl.rowH/2); ctx.lineTo(rl.x - 4, y + rl.rowH/2); ctx.stroke();
          ctx.fillStyle = '#cf8a3f';
          ctx.beginPath(); ctx.moveTo(rl.x - 12, y + rl.rowH/2 - 4); ctx.lineTo(rl.x - 4, y + rl.rowH/2); ctx.lineTo(rl.x - 12, y + rl.rowH/2 + 4); ctx.closePath(); ctx.fill();
        }
      });
      // wasted cols indicator
      ctx.fillStyle = 'rgba(184,90,74,0.18)';
      ctx.fillRect(rl.x, rl.y, rl.colW*2, rl.rowH*(ROWS+1));
      ctx.fillStyle = 'rgba(184,90,74,0.7)'; ctx.font = '29px JetBrains Mono';
      ctx.fillText('wasted (read but unused)', rl.x + 4, rl.y + rl.rowH*(ROWS+1) + 16);

      // COLUMN
      const cl = colLayout();
      ctx.fillStyle = 'oklch(0.94 0.007 240)';
      ctx.fillRect(cl.x, cl.y, cl.colW*4, cl.rowH);
      headers.forEach((hd, c) => {
        const usedCol = (c===2||c===3);
        ctx.fillStyle = usedCol ? 'oklch(0.3 0.13 155)' : 'oklch(0.5 0.01 250)'; ctx.font = '600 42px JetBrains Mono';
        ctx.fillText(hd, cl.x + c*cl.colW + 8, cl.y + cl.rowH/2 + 5);
      });
      // each column rendered as a continuous stripe (column-contiguous)
      for (let c=0;c<4;c++){
        const x = cl.x + c*cl.colW;
        const usedCol = (c===2 || c===3);
        // stripe background
        ctx.fillStyle = usedCol ? 'oklch(0.94 0.04 155)' : 'oklch(0.985 0.003 240)';
        ctx.fillRect(x, cl.y + cl.rowH, cl.colW-2, cl.rowH*ROWS);
        ctx.strokeStyle = usedCol ? '#3f8264' : 'rgba(91,138,143,0.2)';
        ctx.lineWidth = usedCol ? 1.5 : 1;
        ctx.strokeRect(x, cl.y + cl.rowH, cl.colW-2, cl.rowH*ROWS);
        // sweep highlight only on used cols
        if (usedCol && sweepCol >= 0){
          const yT = cl.y + cl.rowH + 0;
          const yB = cl.y + cl.rowH + (sweepCol+1) * cl.rowH;
          ctx.fillStyle = 'oklch(0.93 0.045 215)';
          ctx.fillRect(x, yT, cl.colW-2, yB - yT);
        }
        // cells
        data.forEach((row, r) => {
          const y = cl.y + cl.rowH + (r+1)*cl.rowH - cl.rowH;
          const isHit = usedCol && row[2]==='US';
          ctx.fillStyle = isHit ? 'oklch(0.3 0.13 155)' : usedCol ? 'oklch(0.32 0.012 250)' : 'oklch(0.7 0.01 250)';
          ctx.font = '36px JetBrains Mono';
          ctx.fillText(String(row[c]), x + 8, y + cl.rowH/2 + 5);
        });
      }

      // particles
      const now = performance.now();
      particles = particles.filter(pt => {
        const dt = now - pt.born;
        pt.t = Math.min(1, dt/pt.dur);
        const e = 1 - Math.pow(1-pt.t,3);
        pt.x = pt.x0 + (pt.x1-pt.x0)*e;
        pt.y = pt.y0 + (pt.y1-pt.y0)*e;
        pt.trail.push({x:pt.x, y:pt.y});
        if (pt.trail.length > 12) pt.trail.shift();
        for (let i=0;i<pt.trail.length;i++){
          const tr = pt.trail[i];
          const f = i/pt.trail.length;
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = f*pt.alpha*0.5;
          ctx.beginPath(); ctx.arc(tr.x, tr.y, pt.size*(0.3+f*0.7), 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.shadowBlur = 12; ctx.shadowColor = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        return pt.t < 1;
      });
      // result badge
      if (counters.rb.textContent !== '—'){
        ctx.fillStyle = 'oklch(0.62 0.14 155)'; ctx.font = '600 47px JetBrains Mono';
        ctx.fillText('SUM →', cvs.width - 130, 50);
      }
      RAF(loop);
    }
    loop();
    function resize(){
      const wrap = el.querySelector('.rc-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(900, r.width*2);
      cvs.height = Math.max(420, r.height*2);
    }
    new ResizeObserver(resize).observe(el.querySelector('.rc-canvas-wrap'));
    setTimeout(resize, 60);

    el.querySelector('[data-act="run"]').onclick = run;
    el.querySelector('[data-act="reset"]').onclick = reset;
  }

  // ============================================================
  // 4. PARTITION SIM — pick partition key, see scan size
  // ============================================================
  function PartitionSim(target, opts){
    const { lessonId, cpId } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = head('Sim', 'Partition the orders table — pick a key', 20, earned) + `
      <div class="ps-frame">
        <div class="ps-canvas-wrap">
          <canvas class="ps-canvas" width="1400" height="500" role="img" aria-label="Visualization of how a partitioning strategy prunes data files scanned for a query."></canvas>
        </div>
        <div class="ps-controls">
          <code class="ps-q">SELECT * FROM orders WHERE order_date = '2026-04-15'</code>
          <span class="ps-spacer"></span>
          <select class="ps-sel" data-sel aria-label="Partition strategy">
            <option value="none">— no partition (full scan)</option>
            <option value="date" selected>order_date (daily)</option>
            <option value="user">user_id (hash 24)</option>
            <option value="country">country (skewed)</option>
            <option value="hour">order_hour (over-partitioned)</option>
          </select>
          <button class="btn primary sm" data-act="scan">▶ scan</button>
        </div>
        <div class="ps-stat">
          <span>files scanned</span><b data-st="f">—</b>
          <span>bytes read</span><b data-st="b">—</b>
          <span>verdict</span><b data-st="v">—</b>
          <span>skew</span><b data-st="s">—</b>
        </div>
      </div>`;
    target.replaceWith(el);
    const cvs = el.querySelector('.ps-canvas');
    const ctx = cvs.getContext('2d');
    let parts = [], hit = [], scanWaves = [], particles = [];
    let scanT = 0, scanning = false;
    const meta = {
      none:    { bytes:'100 GB', verdict:['full scan — 30× wasted','bad'], skew:'n/a' },
      date:    { bytes:'3.3 GB', verdict:['perfect prune (1 of 30)','ok'], skew:'even' },
      user:    { bytes:'100 GB', verdict:['no prune — query doesn\'t mention user','bad'], skew:'even' },
      country: { bytes:'100 GB', verdict:['no prune — also: heavy US skew','bad'], skew:'⚠ US 62%' },
      hour:    { bytes:'3.3 GB', verdict:['small-file problem · 720 files for 3.3 GB','warn'], skew:'over-split' }
    };

    function build(key){
      parts = []; hit = [];
      if (key==='none'){ parts = [{label:'all data', bytes:100, weight:1}]; hit=[0]; }
      else if (key==='date'){
        for (let i=0;i<30;i++) parts.push({label:'2026-04-'+String(i+1).padStart(2,'0'), bytes:3.3, weight:1});
        hit=[14];
      }
      else if (key==='user'){
        for(let i=0;i<24;i++) parts.push({label:'hash_'+i, bytes:4.2, weight:1});
        hit = parts.map((_,i)=>i);
      }
      else if (key==='country'){
        const cs = [['US',62],['UK',8],['DE',6],['FR',5],['JP',4],['BR',3.5],['IN',3],['CA',2.5],['AU',2],['MX',2],['SG',1],['ES',1]];
        cs.forEach(([c,w])=>parts.push({label:c, bytes:w, weight:w}));
        hit = parts.map((_,i)=>i);
      }
      else if (key==='hour'){
        for (let d=0;d<30;d++) for(let h=0;h<24;h++) parts.push({label:String(d+1).padStart(2,'0')+'/'+String(h).padStart(2,'0'), bytes:0.14, weight:0.14});
        hit = []; for(let h=0;h<24;h++) hit.push(14*24+h);
      }
      const m = meta[key];
      el.querySelector('[data-st="f"]').textContent = hit.length + ' / ' + parts.length;
      el.querySelector('[data-st="b"]').textContent = m.bytes;
      const v = el.querySelector('[data-st="v"]');
      v.textContent = m.verdict[0]; v.className = 'v-'+m.verdict[1];
      el.querySelector('[data-st="s"]').textContent = m.skew;
    }

    function gridLayout(){
      // grid layout for parts, fitted to canvas
      const w = cvs.width, h = cvs.height;
      const pad = 30;
      const n = parts.length;
      // try to fit as columns
      const cols = Math.ceil(Math.sqrt(n * (w-2*pad)/(h-2*pad)));
      const rows = Math.ceil(n / cols);
      const cw = (w - 2*pad) / cols;
      const ch = (h - 2*pad) / rows;
      return parts.map((p,i) => ({
        ...p, idx:i,
        x: pad + (i%cols)*cw + 4,
        y: pad + Math.floor(i/cols)*ch + 4,
        w: cw - 8, h: ch - 8
      }));
    }

    function scan(){
      scanning = true; scanT = 0;
      // emit a "query" particle from top-left that radiates over hits
      const layout = gridLayout();
      hit.forEach((idx, k) => {
        const cell = layout[idx];
        setTimeout(() => {
          for (let i=0;i<5;i++){
            particles.push({
              x: 30, y: 30,
              x1: cell.x + cell.w/2 + (Math.random()-0.5)*cell.w*0.4,
              y1: cell.y + cell.h/2 + (Math.random()-0.5)*cell.h*0.4,
              x0: 30, y0: 30,
              color: '#cf8a3f', size: i===0?4:2.5, alpha: i===0?1:0.5,
              t:0, dur: 600 + Math.random()*200, born: performance.now(), trail:[],
              cellIdx: idx
            });
          }
        }, k * (hit.length>50 ? 8 : 30));
      });
      // sweep wave for 'none'/full-scan effect: animate scan line
      scanWaves.push({ t:0, born: performance.now() });
      award(el, lessonId, cpId, 'part');
      setTimeout(()=>{ scanning = false; }, 1400);
    }

    function loop(){
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);
      const layout = gridLayout();
      const maxBytes = Math.max(...parts.map(p=>p.bytes), 0.01);
      // cells
      layout.forEach((p, i) => {
        const isHit = hit.includes(i);
        const intensity = p.bytes / maxBytes; // for skew vis
        // base cell
        ctx.fillStyle = isHit ? 'oklch(0.94 0.04 155)' : 'oklch(0.96 0.005 240)';
        if (parts.length === 12) {
          // country: fill saturation by weight (skew)
          ctx.fillStyle = isHit ? `oklch(${0.92 - intensity*0.15} ${0.04 + intensity*0.1} 155)` : 'oklch(0.96 0.005 240)';
        }
        ctx.strokeStyle = isHit ? '#3f8264' : 'rgba(91,138,143,0.25)';
        ctx.lineWidth = isHit ? 1.5 : 1;
        ctx.globalAlpha = isHit ? 1 : 0.4;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(p.x, p.y, p.w, p.h, 4);
        else ctx.rect(p.x, p.y, p.w, p.h);
        ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
        // skew bar inside cell (relative weight)
        if (parts.length === 12){
          const bh = (p.h-12) * intensity;
          ctx.fillStyle = isHit ? '#3f8264' : '#5b8a8f';
          ctx.globalAlpha = 0.4;
          ctx.fillRect(p.x+4, p.y + p.h - 6 - bh, p.w-8, bh);
          ctx.globalAlpha = 1;
        }
        // labels (only if cell big enough)
        if (p.w > 28){
          ctx.fillStyle = isHit ? 'oklch(0.3 0.13 155)' : 'rgba(91,138,143,0.6)';
          ctx.font = `${Math.min(13, p.w/8)}px JetBrains Mono`;
          const label = p.label.length > 12 ? p.label.slice(-8) : p.label;
          ctx.fillText(label, p.x+5, p.y+14);
          if (p.h > 30){
            ctx.font = `${Math.min(11, p.w/10)}px JetBrains Mono`;
            ctx.fillStyle = 'rgba(91,138,143,0.5)';
            ctx.fillText(p.bytes.toFixed(1)+' GB', p.x+5, p.y + p.h - 6);
          }
        }
      });
      // scan particles
      const now = performance.now();
      particles = particles.filter(pt => {
        const dt = now - pt.born;
        pt.t = Math.min(1, dt / pt.dur);
        const e = 1 - Math.pow(1-pt.t, 3);
        pt.x = pt.x0 + (pt.x1-pt.x0)*e;
        pt.y = pt.y0 + (pt.y1-pt.y0)*e;
        pt.trail.push({x:pt.x, y:pt.y});
        if (pt.trail.length > 12) pt.trail.shift();
        for (let i=0;i<pt.trail.length;i++){
          const tr = pt.trail[i];
          const f = i/pt.trail.length;
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = f * pt.alpha * 0.5;
          ctx.beginPath(); ctx.arc(tr.x, tr.y, pt.size*(0.3+f*0.7), 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.shadowBlur = 12; ctx.shadowColor = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        // splash on landing
        if (pt.t >= 0.99 && pt.cellIdx !== undefined && layout[pt.cellIdx]){
          const cell = layout[pt.cellIdx];
          ctx.strokeStyle = '#3f8264'; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cell.x-2, cell.y-2, cell.w+4, cell.h+4, 5);
          else ctx.rect(cell.x-2, cell.y-2, cell.w+4, cell.h+4);
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        return pt.t < 1;
      });
      // query origin (top-left badge)
      ctx.fillStyle = '#cf8a3f';
      ctx.beginPath(); ctx.arc(30, 30, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(91,138,143,0.6)';
      ctx.font = '47px JetBrains Mono';
      ctx.fillText('query', 44, 36);
      RAF(loop);
    }
    loop();
    function resize(){
      const wrap = el.querySelector('.ps-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(900, r.width*2);
      cvs.height = Math.max(360, r.height*2);
    }
    new ResizeObserver(resize).observe(el.querySelector('.ps-canvas-wrap'));
    setTimeout(resize, 60);

    build('date');
    el.querySelector('[data-sel]').onchange = (e) => { build(e.target.value); };
    el.querySelector('[data-act="scan"]').onclick = scan;
  }

  // ============================================================
  // 5. KAFKA TOPIC — canvas-driven partitioned log + consumers
  // ============================================================
  function KafkaTopic(target, opts){
    const { lessonId, cpId } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = head('Sim', 'Kafka topic · 4 partitions · 3 consumers', 20, earned) + `
      <div class="kt-frame">
        <div class="kt-canvas-wrap">
          <canvas class="kt-canvas" width="1200" height="520" role="img" aria-label="Animated Kafka topic showing messages routed by key into ordered, partitioned logs consumed by consumer groups."></canvas>
          <div class="kt-overlay">
            <div class="kt-band kt-band-prod">
              <span class="kt-lbl">producer</span>
              <span class="kt-prod-box" data-prod>● live</span>
            </div>
            <div class="kt-band kt-band-parts">
              <span class="kt-lbl">partitions (commit log)</span>
              <div class="kt-pgroup">
                <div class="kt-part" data-p="0"><span class="kt-pname">p0</span><span class="kt-pnum" data-poff="0">0</span></div>
                <div class="kt-part" data-p="1"><span class="kt-pname">p1</span><span class="kt-pnum" data-poff="1">0</span></div>
                <div class="kt-part" data-p="2"><span class="kt-pname">p2</span><span class="kt-pnum" data-poff="2">0</span></div>
                <div class="kt-part" data-p="3"><span class="kt-pname">p3</span><span class="kt-pnum" data-poff="3">0</span></div>
              </div>
            </div>
            <div class="kt-band kt-band-cons">
              <span class="kt-lbl">consumer group</span>
              <div class="kt-cgroup">
                <div class="kt-cons-box" data-c="0"><div class="kt-cn">c0</div><div class="kt-cassign" data-assign="0">p0, p1</div><div class="kt-clag"><span data-lag="0">0</span> lag</div></div>
                <div class="kt-cons-box" data-c="1"><div class="kt-cn">c1</div><div class="kt-cassign" data-assign="1">p2</div><div class="kt-clag"><span data-lag="1">0</span> lag</div></div>
                <div class="kt-cons-box" data-c="2"><div class="kt-cn">c2</div><div class="kt-cassign" data-assign="2">p3</div><div class="kt-clag"><span data-lag="2">0</span> lag</div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="kt-controls">
          <button class="btn primary sm" data-act="send">▶ send 1</button>
          <button class="btn sm" data-act="burst">▶▶ burst</button>
          <button class="btn sm" data-act="storm">⚡ storm</button>
          <button class="btn sm" data-act="kill">⚠ kill c1 (rebalance)</button>
          <span class="kt-counter">produced <b data-c="prod">0</b> · consumed <b data-c="cons">0</b> · lag <b data-c="lag">0</b></span>
        </div>
      </div>`;
    target.replaceWith(el);
    const cvs = el.querySelector('.kt-canvas');
    const ctx = cvs.getContext('2d');
    const overlay = el.querySelector('.kt-overlay');
    const PALETTE = ['#cf8a3f','#5b8a8f','#a8632c','#7a4a8a'];
    const counters = {
      prod: el.querySelector('[data-c="prod"]'),
      cons: el.querySelector('[data-c="cons"]'),
      lag:  el.querySelector('[data-c="lag"]')
    };

    let particles = []; // produce-flight
    let consumed  = []; // consume-flight
    let pulses = []; // {el-rect cached, t, color}
    let assigns = {0:0, 1:0, 2:1, 3:2};
    let dead = new Set();
    let offsets = [0,0,0,0]; // produced
    let cOffsets = [0,0,0,0]; // consumed by per-partition
    let nProd = 0, nCons = 0;
    let rebalanceFlash = 0;

    function rect(elNode){
      const r = elNode.getBoundingClientRect();
      const wrapR = cvs.getBoundingClientRect();
      const sx = cvs.width / wrapR.width;
      const sy = cvs.height / wrapR.height;
      return { x:(r.left-wrapR.left)*sx, y:(r.top-wrapR.top)*sy, w:r.width*sx, h:r.height*sy, cx:(r.left-wrapR.left+r.width/2)*sx, cy:(r.top-wrapR.top+r.height/2)*sy };
    }

    function send(speed=1){
      nProd++;
      const key = ['user_'+(nProd%9), 'order_'+nProd, 'click_'+nProd][nProd%3];
      const p = (key.charCodeAt(0)+key.length+nProd) % 4;
      offsets[p]++;
      counters.prod.textContent = nProd;
      el.querySelector(`[data-poff="${p}"]`).textContent = offsets[p];
      const color = PALETTE[p];
      const prodEl = el.querySelector('[data-prod]');
      const partEl = el.querySelector(`.kt-part[data-p="${p}"]`);
      const pProd = rect(prodEl);
      const pPart = rect(partEl);
      // 3 jittered particles per produce
      for (let k=0; k<3; k++){
        particles.push({
          x: pProd.cx, y: pProd.cy + (k-1)*3,
          x0: pProd.cx, y0: pProd.cy,
          x1: pPart.cx + (Math.random()-0.5)*pPart.w*0.3,
          y1: pPart.cy + (Math.random()-0.5)*4,
          partition: p, color,
          size: k===1 ? 4 : 2.6,
          alpha: k===1 ? 1 : 0.55,
          t: 0, dur: 700/speed * (0.85 + Math.random()*0.3),
          born: performance.now(), trail: [],
          stage: 'produce'
        });
      }
      pulses.push({ node: partEl, t: 0, color });
      partEl.classList.remove('hit'); void partEl.offsetWidth; partEl.classList.add('hit');
      if (nProd >= 3) award(el, lessonId, cpId, 'kafka');
    }

    function tickConsume(){
      // each consumer pulls from its assigned partitions, one event per tick if lag exists
      [0,1,2].forEach(c => {
        if (dead.has(c)) return;
        // find assigned partitions for this consumer
        const assigned = [];
        for (let p=0;p<4;p++) if (assigns[p]===c) assigned.push(p);
        // pick the partition with the most lag
        let best = -1, bestLag = 0;
        assigned.forEach(p => { const lag = offsets[p]-cOffsets[p]; if (lag>bestLag){ bestLag=lag; best=p; } });
        if (best === -1) return;
        cOffsets[best]++;
        nCons++;
        const partEl = el.querySelector(`.kt-part[data-p="${best}"]`);
        const consEl = el.querySelector(`.kt-cons-box[data-c="${c}"]`);
        const pPart = rect(partEl), pCons = rect(consEl);
        const color = PALETTE[best];
        for (let k=0;k<2;k++){
          consumed.push({
            x0: pPart.cx, y0: pPart.cy + (Math.random()-0.5)*4,
            x1: pCons.cx + (Math.random()-0.5)*pCons.w*0.3, y1: pCons.cy,
            x: pPart.cx, y: pPart.cy,
            color, size: k===0 ? 3.5 : 2,
            alpha: k===0 ? 0.95 : 0.5,
            t: 0, dur: 580 * (0.85 + Math.random()*0.3),
            born: performance.now(), trail: [], stage:'consume',
            consumer: c
          });
        }
        consEl.classList.remove('flash'); void consEl.offsetWidth; consEl.classList.add('flash');
      });
    }
    let consumeTimer = setInterval(tickConsume, 200);

    function loop(){
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);

      // backdrop: producer→partitions rails
      const prodEl = el.querySelector('[data-prod]');
      if (prodEl){
        const p = rect(prodEl);
        for (let i=0;i<4;i++){
          const part = rect(el.querySelector(`.kt-part[data-p="${i}"]`));
          const grd = ctx.createLinearGradient(p.cx, p.cy, part.cx, part.cy);
          grd.addColorStop(0, 'rgba(91,138,143,0.18)');
          grd.addColorStop(0.5, 'rgba(91,138,143,0.55)');
          grd.addColorStop(1, 'rgba(91,138,143,0.18)');
          ctx.strokeStyle = grd; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(p.cx, p.cy+p.h/4); ctx.lineTo(part.cx, part.cy-part.h/4); ctx.stroke();
        }
        // partitions→consumers rails
        for (let pi=0; pi<4; pi++){
          const c = assigns[pi]; if (dead.has(c)) continue;
          const part = rect(el.querySelector(`.kt-part[data-p="${pi}"]`));
          const cons = rect(el.querySelector(`.kt-cons-box[data-c="${c}"]`));
          const cgrd = ctx.createLinearGradient(part.cx, part.cy, cons.cx, cons.cy);
          cgrd.addColorStop(0, 'rgba(91,138,143,0.18)');
          cgrd.addColorStop(0.5, 'rgba(91,138,143,0.45)');
          cgrd.addColorStop(1, 'rgba(91,138,143,0.18)');
          ctx.strokeStyle = cgrd; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(part.cx, part.cy + part.h/4); ctx.lineTo(cons.cx, cons.cy - cons.h/4); ctx.stroke();
        }
      }

      // partition backlog ticks (each unconsumed offset = bar)
      for (let pi=0; pi<4; pi++){
        const part = rect(el.querySelector(`.kt-part[data-p="${pi}"]`));
        const lag = offsets[pi]-cOffsets[pi];
        const color = PALETTE[pi];
        for (let i=0;i<Math.min(lag,18);i++){
          const x = part.x + part.w*0.55 + i*5;
          const y = part.cy - 3;
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.35 + 0.5 * (1-i/18);
          ctx.fillRect(x, y, 3, 6);
        }
        ctx.globalAlpha = 1;
      }

      // pulses
      pulses = pulses.filter(pu => {
        pu.t += 0.045;
        if (pu.t >= 1) return false;
        const r = rect(pu.node);
        ctx.strokeStyle = pu.color;
        ctx.globalAlpha = (1-pu.t) * 0.5;
        ctx.lineWidth = 2;
        const expand = pu.t * 14;
        ctx.strokeRect(r.x - expand, r.y - expand, r.w + expand*2, r.h + expand*2);
        ctx.globalAlpha = 1;
        return true;
      });

      // particles (produce flights)
      const now = performance.now();
      const stepP = (arr) => arr.filter(pt => {
        const dt = now - pt.born;
        pt.t = Math.min(1, dt / pt.dur);
        const e = 1 - Math.pow(1-pt.t, 3);
        pt.x = pt.x0 + (pt.x1-pt.x0)*e;
        pt.y = pt.y0 + (pt.y1-pt.y0)*e;
        pt.trail.push({x:pt.x, y:pt.y, a:pt.alpha});
        if (pt.trail.length > 16) pt.trail.shift();
        for (let i=0;i<pt.trail.length;i++){
          const tr = pt.trail[i];
          const f = i / pt.trail.length;
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = f * tr.a * 0.5;
          ctx.beginPath(); ctx.arc(tr.x, tr.y, pt.size*(0.3+f*0.7), 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.shadowBlur = 12; ctx.shadowColor = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        return pt.t < 1;
      });
      particles = stepP(particles);
      consumed = stepP(consumed);
      counters.cons.textContent = nCons;
      let totalLag = 0;
      for (let i=0;i<4;i++) totalLag += offsets[i]-cOffsets[i];
      counters.lag.textContent = totalLag;
      counters.lag.style.color = totalLag>30 ? 'var(--bad)' : (totalLag>10?'var(--warn)':'var(--ink)');

      // per-consumer lag display
      [0,1,2].forEach(c => {
        if (dead.has(c)) { el.querySelector(`[data-lag="${c}"]`).textContent = '—'; return; }
        let lag = 0;
        for (let p=0;p<4;p++) if (assigns[p]===c) lag += offsets[p]-cOffsets[p];
        el.querySelector(`[data-lag="${c}"]`).textContent = lag;
      });

      // rebalance flash overlay
      if (rebalanceFlash > 0){
        ctx.fillStyle = `rgba(207,138,63,${rebalanceFlash*0.12})`;
        ctx.fillRect(0,0,w,h);
        rebalanceFlash *= 0.93;
      }

      RAF(loop);
    }
    loop();

    function resize(){
      const wrap = el.querySelector('.kt-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(800, r.width*2);
      cvs.height = Math.max(420, r.height*2);
    }
    new ResizeObserver(resize).observe(el.querySelector('.kt-canvas-wrap'));
    setTimeout(resize, 60);

    el.querySelector('[data-act="send"]').onclick = () => send(1);
    el.querySelector('[data-act="burst"]').onclick = () => { for(let i=0;i<20;i++) setTimeout(()=>send(1), i*120); };
    el.querySelector('[data-act="storm"]').onclick = () => { for(let i=0;i<60;i++) setTimeout(()=>send(1.5), i*55); };
    el.querySelector('[data-act="kill"]').onclick = () => {
      if (dead.has(1)) return;
      dead.add(1);
      const cb = el.querySelector('.kt-cons-box[data-c="1"]');
      cb.classList.add('dead');
      cb.querySelector('[data-assign="1"]').textContent = '— dead —';
      assigns = {0:0, 1:0, 2:0, 3:2};
      el.querySelector('[data-assign="0"]').textContent = 'p0, p1, p2';
      rebalanceFlash = 1;
      // ripple all consumer boxes
      el.querySelectorAll('.kt-cons-box').forEach((b,i)=>{
        if (dead.has(i)) return;
        setTimeout(()=>{ b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }, i*120);
      });
    };
  }

  // ============================================================
  // 6. WATERMARK — canvas event-time vs processing-time
  // ============================================================
  function Watermark(target, opts){
    const { lessonId, cpId } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = head('Sim', 'Event time vs processing time · watermark', 20, earned) + `
      <div class="wm-frame">
        <div class="wm-canvas-wrap">
          <canvas class="wm-canvas" width="1400" height="520" role="img" aria-label="Stream-processing watermark visualization showing event time versus processing time and which late events are dropped."></canvas>
        </div>
        <div class="wm-controls">
          <button class="btn primary sm" data-act="run">▶ run stream</button>
          <button class="btn sm" data-act="storm">⚡ chaos (lots late)</button>
          <button class="btn sm" data-act="reset">reset</button>
          <label class="wm-toggle"><input type="checkbox" data-late checked/> allow late</label>
          <span class="wm-counter">on-time <b data-c="ok">0</b> · late <b data-c="late">0</b> · dropped <b data-c="drop">0</b> · watermark <b data-c="wm">t=0</b></span>
        </div>
        <div class="wm-legend">
          <span><i class="dot ok"></i> on time</span>
          <span><i class="dot late"></i> late, within 3s budget</span>
          <span><i class="dot drop"></i> dropped (past budget)</span>
          <span class="muted">y = event_time · x = processing_time</span>
        </div>
      </div>`;
    target.replaceWith(el);
    const cvs = el.querySelector('.wm-canvas');
    const ctx = cvs.getContext('2d');
    const counters = {
      ok: el.querySelector('[data-c="ok"]'),
      late: el.querySelector('[data-c="late"]'),
      drop: el.querySelector('[data-c="drop"]'),
      wm: el.querySelector('[data-c="wm"]')
    };
    let evs = [];   // {pt, et, processed, kind, x, y, born?}
    let particles = []; // falling event glyphs
    let pt = 0, timer = null, watermark = 0;
    let onT=0, late=0, drop=0;
    let chaosMode = false;

    function reset(){
      if (timer) clearInterval(timer); timer = null;
      evs = []; particles = []; pt = 0; watermark = 0;
      onT=0; late=0; drop=0;
      counters.ok.textContent = 0; counters.late.textContent = 0; counters.drop.textContent = 0;
      counters.wm.textContent = 't=0';
    }

    function run(chaos){
      reset();
      chaosMode = !!chaos;
      const allowLate = el.querySelector('[data-late]').checked;
      for (let i=0;i<28;i++){
        const ptT = i*0.7 + Math.random()*0.3;
        let et = ptT - Math.random()*1.5;
        const lateChance = chaos ? 0.55 : 0.32;
        if (allowLate && Math.random() < lateChance) et = ptT - 2.5 - Math.random()*(chaos?5:3);
        evs.push({ pt:ptT, et, processed:false });
      }
      timer = setInterval(()=>{
        pt += 0.35;
        // arrived events this tick
        evs.filter(e => !e.processed && e.pt <= pt).forEach(e => {
          e.processed = true;
          const lateness = e.pt - e.et;
          let kind;
          if (lateness > 4) { kind='drop'; drop++; }
          else if (lateness > 1) { kind='late'; late++; }
          else { kind='ok'; onT++; }
          e.kind = kind;
          // particle: falls from top (processing time arrival) to its event-time row
          particles.push({
            ev:e, kind, t:0, dur: 700, born: performance.now()
          });
        });
        // watermark = max(event_time) - 1 over seen events
        const seen = evs.filter(e => e.processed);
        if (seen.length) watermark = Math.max(0, Math.max(...seen.map(e=>e.et)) - 1);
        counters.ok.textContent = onT; counters.late.textContent = late; counters.drop.textContent = drop;
        counters.wm.textContent = 't=' + watermark.toFixed(1);
        if (pt > 22) { clearInterval(timer); timer=null; award(el, lessonId, cpId, 'watermark'); }
      }, 200);
    }

    function loop(){
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);
      // axes
      const padL = 140, padR = 50, padT = 50, padB = 110;
      const plotW = w - padL - padR, plotH = h - padT - padB;
      const tMax = 24, etMax = 22;
      const tx = (t) => padL + (t/tMax)*plotW;
      const ty = (t) => padT + (1 - t/etMax)*plotH;
      // plot border
      ctx.strokeStyle = 'rgba(91,138,143,0.45)'; ctx.lineWidth = 2;
      ctx.strokeRect(padL, padT, plotW, plotH);
      // grid
      ctx.strokeStyle = 'rgba(91,138,143,0.22)'; ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(91,138,143,0.7)';
      ctx.font = '36px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      for (let i=0;i<=tMax;i+=4){
        const X = tx(i);
        ctx.beginPath(); ctx.moveTo(X, padT); ctx.lineTo(X, padT+plotH); ctx.stroke();
        ctx.fillText(i+'s', X, padT+plotH+44);
      }
      ctx.textAlign = 'right';
      for (let i=0;i<=etMax;i+=4){
        const Y = ty(i);
        ctx.beginPath(); ctx.moveTo(padL, Y); ctx.lineTo(padL+plotW, Y); ctx.stroke();
        ctx.fillText(i+'s', padL-12, Y+12);
      }
      ctx.textAlign = 'left';
      // diagonal "perfect" line (et = pt)
      ctx.strokeStyle = 'rgba(91,138,143,0.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([6,6]);
      ctx.beginPath(); ctx.moveTo(tx(0), ty(0)); ctx.lineTo(tx(tMax), ty(tMax)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(91,138,143,0.6)';
      ctx.font = 'italic 42px JetBrains Mono, monospace';
      ctx.save();
      ctx.translate(tx(tMax-2), ty(tMax-2));
      ctx.rotate(-Math.atan2(plotH/etMax, plotW/tMax));
      ctx.fillText('event_time = processing_time (no lag)', -540, -16);
      ctx.restore();
      // axis labels
      ctx.fillStyle = 'rgba(91,138,143,0.95)';
      ctx.font = '600 32px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('processing time →', padL + plotW/2, h - padB + 92);
      ctx.save();
      ctx.translate(padL - 88, padT + plotH/2);
      ctx.rotate(-Math.PI/2);
      ctx.fillText('↑ event time', 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
      // empty-state hint
      if (evs.length === 0 && particles.length === 0){
        ctx.fillStyle = 'rgba(91,138,143,0.55)';
        ctx.font = 'italic 38px Source Serif 4, serif';
        ctx.textAlign = 'center';
        ctx.fillText('press ▶ run stream to fire events', padL + plotW/2, padT + plotH/2 - 14);
        ctx.font = '28px JetBrains Mono, monospace';
        ctx.fillText('events on the diagonal arrived on time · events below are late', padL + plotW/2, padT + plotH/2 + 28);
        ctx.textAlign = 'left';
      }
      // current pt cursor (processing time line)
      const xPt = tx(Math.min(tMax, pt));
      const grdC = ctx.createLinearGradient(xPt-30, 0, xPt+30, 0);
      grdC.addColorStop(0, 'rgba(207,138,63,0)');
      grdC.addColorStop(0.5, 'rgba(207,138,63,0.20)');
      grdC.addColorStop(1, 'rgba(207,138,63,0)');
      ctx.fillStyle = grdC;
      ctx.fillRect(xPt-30, padT, 60, plotH);
      ctx.strokeStyle = '#cf8a3f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xPt, padT); ctx.lineTo(xPt, padT+plotH); ctx.stroke();
      ctx.fillStyle = '#cf8a3f'; ctx.font = '52px JetBrains Mono'; ctx.fillText('now', xPt+6, padT+22);
      // watermark line (horizontal at event_time = watermark)
      const yWm = ty(watermark);
      ctx.strokeStyle = 'rgba(91,138,143,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
      ctx.beginPath(); ctx.moveTo(padL, yWm); ctx.lineTo(padL+plotW, yWm); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'oklch(0.4 0.13 220)'; ctx.font = '52px JetBrains Mono';
      ctx.fillText(`watermark t=${watermark.toFixed(1)}`, padL+plotW-260, yWm-8);
      // particles (falling event glyphs)
      const now = performance.now();
      particles = particles.filter(p => {
        const e = p.ev;
        const dt = now - p.born;
        p.t = Math.min(1, dt / p.dur);
        const easeT = 1 - Math.pow(1-p.t, 3);
        // start: top of plot at x=tx(e.pt). end: y=ty(e.et).
        const x = tx(Math.min(tMax,e.pt));
        const y0 = padT - 20;
        const y1 = ty(Math.max(0, Math.min(etMax, e.et)));
        const y = y0 + (y1-y0)*easeT;
        // trail
        const colorMap = { ok:'#3f8264', late:'#cf8a3f', drop:'#b85a4a' };
        const color = colorMap[p.kind];
        for (let i=0;i<6;i++){
          const f = i/6;
          ctx.fillStyle = color;
          ctx.globalAlpha = f * 0.35 * (1 - p.t*0.5);
          ctx.beginPath(); ctx.arc(x, y - (1-f)*20, 4*(0.4+f*0.6), 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.shadowBlur = 12; ctx.shadowColor = color;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        // arc connecting processing-x to event-y after it lands
        if (p.t >= 1){
          ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.setLineDash([2,3]);
          ctx.beginPath(); ctx.moveTo(x, padT+plotH); ctx.lineTo(x, y1); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
        return p.t < 1.001 ? true : (() => {
          // freeze final dot — push into a "rest" array? Simpler: keep but mark rest.
          // Done: keep drawing the dot every frame with rest mode
          return false;
        })();
      });
      // rest dots: redraw landed events
      evs.filter(e => e.processed).forEach(e => {
        const colorMap = { ok:'#3f8264', late:'#cf8a3f', drop:'#b85a4a' };
        const color = colorMap[e.kind];
        const x = tx(Math.min(tMax, e.pt));
        const y = ty(Math.max(0, Math.min(etMax, e.et)));
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 0.25; ctx.setLineDash([2,3]);
        ctx.strokeStyle = color;
        ctx.beginPath(); ctx.moveTo(x, padT+plotH); ctx.lineTo(x, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      });
      RAF(loop);
    }
    loop();

    function resize(){
      const wrap = el.querySelector('.wm-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(900, r.width*2);
      cvs.height = Math.max(420, r.height*2);
    }
    new ResizeObserver(resize).observe(el.querySelector('.wm-canvas-wrap'));
    setTimeout(resize, 60);

    el.querySelector('[data-act="run"]').onclick = () => run(false);
    el.querySelector('[data-act="storm"]').onclick = () => run(true);
    el.querySelector('[data-act="reset"]').onclick = reset;
  }

  // ============================================================
  // 7. SNAPSHOT TIMELINE — Iceberg/Delta time travel
  // ============================================================
  function SnapshotTimeline(target, opts){
    const { lessonId, cpId } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    const snaps = [
      { t:'10:00', op:'CREATE', desc:'initial load · 1.2 TB · 4,800 files', files: 4800, bytes:'1.2 TB' },
      { t:'10:42', op:'INSERT', desc:'+ 12 GB clickstream · adds 48 files', files: 4848, bytes:'1.21 TB' },
      { t:'11:15', op:'UPDATE', desc:'GDPR delete for 412 users · 6 files rewritten (CoW)', files: 4854, bytes:'1.21 TB' },
      { t:'11:50', op:'COMPACT', desc:'small-file compaction · 4,854 → 1,920 files', files: 1920, bytes:'1.21 TB' },
      { t:'12:33', op:'INSERT', desc:'hourly batch · +14 GB · adds 56 files', files: 1976, bytes:'1.22 TB' },
      { t:'13:01', op:'BAD WRITE', desc:'⚠  bad transformation · NULLs in price column', files: 2010, bytes:'1.22 TB' },
      { t:'13:08', op:'ROLLBACK', desc:'rolled back to snap @12:33 · time travel', files: 1976, bytes:'1.22 TB' },
    ];
    el.innerHTML = head('Sim', 'Iceberg snapshots · git-style time travel', 20, earned) + `
      <div class="st-frame">
        <div class="st-canvas-wrap">
          <canvas class="st-canvas" width="1400" height="320" role="img" aria-label="Lakehouse snapshot timeline; selecting a snapshot shows the table state at that point in time."></canvas>
        </div>
        <div class="st-state-grid">
          <div class="st-cur" id="st-cur"></div>
          <pre class="st-meta" id="st-meta"></pre>
        </div>
        <div class="st-controls">
          <button class="btn sm" data-act="prev">◀ prev</button>
          <button class="btn sm" data-act="next">next ▶</button>
          <button class="btn primary sm" data-act="rb">⏎ rollback to 12:33</button>
          <span class="st-help">click any node · drag through time</span>
        </div>
      </div>`;
    target.replaceWith(el);
    const cvs = el.querySelector('.st-canvas');
    const ctx = cvs.getContext('2d');
    const opCol = {
      'CREATE':   '#5b8a8f',
      'INSERT':   '#3f8264',
      'UPDATE':   '#cf8a3f',
      'COMPACT':  '#7a4a8a',
      'BAD WRITE':'#b85a4a',
      'ROLLBACK': '#cf8a3f'
    };
    let cur = 0;
    let hoverIdx = -1;
    let rollbackAnim = null; // {t0, dur}

    function nodeX(i){
      const pad = 80;
      const w = cvs.width;
      return pad + (i+0.5) * ((w - 2*pad) / snaps.length);
    }
    function nodeY(i){
      // Bad-write branch sits below; rollback returns to main line
      if (snaps[i].op === 'BAD WRITE') return cvs.height/2 + 60;
      return cvs.height/2 - 10;
    }

    function loop(){
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);
      // backdrop
      ctx.fillStyle = 'rgba(91,138,143,0.5)'; ctx.font = '600 36px JetBrains Mono';
      ctx.fillText('SNAPSHOT LOG · each commit is an immutable manifest', 30, 28);
      // main timeline
      ctx.strokeStyle = 'rgba(91,138,143,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(60, cvs.height/2 - 10); ctx.lineTo(cvs.width - 60, cvs.height/2 - 10); ctx.stroke();

      // edges between snapshots (parent links)
      for (let i=0;i<snaps.length;i++){
        if (i===0) continue;
        const a = i-1, b = i;
        // ROLLBACK creates a virtual edge from BAD WRITE → ROLLBACK and from snap@12:33 → ROLLBACK
        if (snaps[b].op === 'ROLLBACK'){
          // bezier from bad-write back up
          const px = nodeX(a), py = nodeY(a);
          const cx = nodeX(b), cy = nodeY(b);
          ctx.strokeStyle = '#b85a4a'; ctx.lineWidth = 2; ctx.setLineDash([4,3]);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.bezierCurveTo(px+30, py-20, cx-30, cy+20, cx, cy);
          ctx.stroke();
          ctx.setLineDash([]);
          // arrow from snap@12:33 to ROLLBACK (the actual parent)
          const par = 4; // index of snap@12:33
          const sx = nodeX(par), sy = nodeY(par);
          ctx.strokeStyle = '#cf8a3f'; ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 24);
          ctx.bezierCurveTo(sx+50, sy-80, cx-50, cy-80, cx, cy-24);
          ctx.stroke();
          // arrowhead
          ctx.fillStyle = '#cf8a3f';
          ctx.beginPath();
          ctx.moveTo(cx, cy-22);
          ctx.lineTo(cx-6, cy-32);
          ctx.lineTo(cx+6, cy-32);
          ctx.closePath(); ctx.fill();
          // label
          ctx.fillStyle = '#cf8a3f'; ctx.font = '600 29px JetBrains Mono';
          ctx.fillText('parent ← snap@12:33', (sx+cx)/2 - 70, sy - 70);
        } else if (snaps[a].op === 'INSERT' && snaps[b].op === 'BAD WRITE'){
          const ax = nodeX(a), ay = nodeY(a);
          const bx = nodeX(b), by = nodeY(b);
          ctx.strokeStyle = 'rgba(184,90,74,0.5)'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.bezierCurveTo(ax+30, ay+20, bx-30, by-20, bx, by);
          ctx.stroke();
        } else if (snaps[a].op === 'BAD WRITE'){
          // skip — handled by ROLLBACK above
        } else {
          const ax = nodeX(a), ay = nodeY(a);
          const bx = nodeX(b), by = nodeY(b);
          ctx.strokeStyle = 'rgba(91,138,143,0.5)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
      }

      // file-count bars under each node (visualizing compaction)
      const maxFiles = 5000;
      for (let i=0;i<snaps.length;i++){
        const s = snaps[i];
        const x = nodeX(i);
        const barH = 50 * (s.files / maxFiles);
        const baseY = cvs.height - 60;
        ctx.fillStyle = 'rgba(91,138,143,0.18)';
        ctx.fillRect(x-22, baseY-50, 44, 50);
        ctx.fillStyle = opCol[s.op] || '#5b8a8f';
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x-22, baseY - barH, 44, barH);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(91,138,143,0.7)'; ctx.font = '600 26px JetBrains Mono';
        ctx.fillText(s.files.toLocaleString()+' f', x-20, baseY+12);
      }

      // nodes
      for (let i=0;i<snaps.length;i++){
        const s = snaps[i];
        const x = nodeX(i), y = nodeY(i);
        const r = 24;
        const isCur = i===cur;
        const isHover = i===hoverIdx;
        ctx.save();
        if (isCur || isHover) {
          ctx.shadowBlur = 18; ctx.shadowColor = opCol[s.op] || '#5b8a8f';
        }
        ctx.fillStyle = isCur ? (opCol[s.op] || '#5b8a8f') : 'oklch(0.985 0.003 240)';
        ctx.strokeStyle = opCol[s.op] || '#5b8a8f';
        ctx.lineWidth = isCur ? 2.5 : 2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.restore();

        // op badge
        ctx.fillStyle = isCur ? 'white' : (opCol[s.op] || '#5b8a8f');
        ctx.font = '700 26px JetBrains Mono';
        const op = s.op.length > 6 ? s.op.slice(0,4) : s.op;
        const tw = ctx.measureText(op).width;
        ctx.fillText(op, x - tw/2, y + 4);

        // time label
        ctx.fillStyle = 'rgba(91,138,143,0.8)'; ctx.font = '600 29px JetBrains Mono';
        ctx.fillText(s.t, x - 16, y - r - 8);

        // snap-id label
        ctx.fillStyle = 'rgba(91,138,143,0.5)'; ctx.font = '500 26px JetBrains Mono';
        ctx.fillText('snap-'+(1000+i), x-22, y - r - 22);
      }

      // rollback animation arc
      if (rollbackAnim){
        const dt = performance.now() - rollbackAnim.t0;
        const t = Math.min(1, dt / rollbackAnim.dur);
        // travel from current → snap-1004 along the orange parent arc
        const par = 4, src = 6;
        const sx = nodeX(src), sy = nodeY(src);
        const dx = nodeX(par), dy = nodeY(par);
        const ctrl1x = sx-50, ctrl1y = sy-80;
        const ctrl2x = dx+50, ctrl2y = dy-80;
        const e = 1 - Math.pow(1-t, 3);
        // bezier sample
        const u = 1-e;
        const px = u*u*u*sx + 3*u*u*e*ctrl1x + 3*u*e*e*ctrl2x + e*e*e*dx;
        const py = u*u*u*sy + 3*u*u*e*ctrl1y + 3*u*e*e*ctrl2y + e*e*e*dy;
        ctx.fillStyle = '#cf8a3f'; ctx.shadowBlur = 18; ctx.shadowColor = '#cf8a3f';
        ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        if (t >= 1) { rollbackAnim = null; cur = par; redraw(); }
      }
      RAF(loop);
    }
    loop();

    function pickAt(mx, my){
      for (let i=0;i<snaps.length;i++){
        const x = nodeX(i), y = nodeY(i);
        if ((mx-x)**2 + (my-y)**2 < 28*28) return i;
      }
      return -1;
    }
    cvs.addEventListener('mousemove', (e) => {
      const r = cvs.getBoundingClientRect();
      const mx = (e.clientX - r.left) * cvs.width / r.width;
      const my = (e.clientY - r.top) * cvs.height / r.height;
      hoverIdx = pickAt(mx, my);
      cvs.style.cursor = hoverIdx >= 0 ? 'pointer' : 'default';
    });
    cvs.addEventListener('click', (e) => {
      const r = cvs.getBoundingClientRect();
      const mx = (e.clientX - r.left) * cvs.width / r.width;
      const my = (e.clientY - r.top) * cvs.height / r.height;
      const i = pickAt(mx, my);
      if (i >= 0) select(i);
    });

    function select(i){
      cur = i;
      const s = snaps[i];
      $('#st-cur', el).innerHTML = `<div class="st-h"><b>snapshot @ ${s.t}</b><span class="op op-${s.op.replace(/[^A-Z]/g,'').toLowerCase()}">${s.op}</span></div><p>${s.desc}</p>`;
      $('#st-meta', el).textContent = `manifest_list: snap-${1000+i}.avro\nfiles:        ${s.files.toLocaleString()}\nbytes:        ${s.bytes}\nschema_id:    ${s.op==='UPDATE'?'2':'1'}\nparent:       ${i>0?('snap-'+(999+i)):'(none)'}`;
      award(el, lessonId, cpId, 'snapshot');
    }
    function redraw(){ select(cur); }
    select(0);
    el.querySelector('[data-act="prev"]').onclick = () => select(Math.max(0, cur-1));
    el.querySelector('[data-act="next"]').onclick = () => select(Math.min(snaps.length-1, cur+1));
    el.querySelector('[data-act="rb"]').onclick = () => {
      cur = 6; select(6);
      rollbackAnim = { t0: performance.now(), dur: 1100 };
    };

    function resize(){
      const wrap = el.querySelector('.st-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(900, r.width*2);
      cvs.height = Math.max(280, r.height*2);
    }
    new ResizeObserver(resize).observe(el.querySelector('.st-canvas-wrap'));
    setTimeout(resize, 60);
  }

  // ============================================================
  // 8. BLOOM FILTER — animated probabilistic membership
  // ============================================================
  function BloomFilter(target, opts){
    const { lessonId, cpId } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = head('Sim', 'Bloom filter — fast "definitely no" checks', 18, earned) + `
      <div class="bfx-frame">
        <div class="bfx-canvas-wrap">
          <canvas class="bfx-canvas" width="1400" height="440" role="img" aria-label="Bloom filter visualization showing how membership tests can return false positives but never false negatives."></canvas>
        </div>
        <div class="bfx-controls">
          <input class="bfx-in" placeholder="key to add…" data-add value="user_42"/>
          <button class="btn sm" data-act="add">+ add</button>
          <input class="bfx-in" placeholder="key to check…" data-check value="user_99"/>
          <button class="btn primary sm" data-act="check">? check</button>
          <button class="btn sm" data-act="reset">reset</button>
          <span class="bfx-stat">added <b data-c="ad">0</b> · bits set <b data-c="bs">0</b>/<b data-c="bn">32</b> · est FPR <b data-c="fpr">0.0%</b></span>
        </div>
        <div class="bfx-out" data-out>Try adding a few keys and then checking new ones. Bloom can say <b style="color:var(--ok)">"definitely no"</b> instantly, or <b style="color:var(--warn)">"maybe"</b> — never a false negative, only false positives.</div>
      </div>`;
    target.replaceWith(el);
    const cvs = el.querySelector('.bfx-canvas');
    const ctx = cvs.getContext('2d');
    const N = 32, K = 3;
    const bits = new Array(N).fill(0);
    let added = 0;
    let particles = []; // {x0,y0,x1,y1,t,dur,born,color,kind, label, hashIdx}
    let bitFlashes = new Map(); // i -> {born, dur, color}
    let outcome = null; // {kind:'maybe'|'no'|'add', key, hs}
    const counters = {
      ad: el.querySelector('[data-c="ad"]'),
      bs: el.querySelector('[data-c="bs"]'),
      bn: el.querySelector('[data-c="bn"]'),
      fpr: el.querySelector('[data-c="fpr"]')
    };
    counters.bn.textContent = N;

    function hashes(s){
      let h1=2166136261, h2=5381;
      for (let i=0;i<s.length;i++){ h1 ^= s.charCodeAt(i); h1 = (h1*16777619)|0; h2 = ((h2<<5)+h2 + s.charCodeAt(i))|0; }
      return [Math.abs(h1)%N, Math.abs(h2)%N, Math.abs(h1+h2)%N];
    }
    function bitPos(i){
      const cols = 16;
      const padX = 80, padY = 220;
      const w = cvs.width - 2*padX;
      const cellW = w / cols;
      const c = i % cols, r = Math.floor(i/cols);
      return { x: padX + c*cellW + cellW/2, y: padY + r*52, w: cellW-6, h: 44 };
    }
    function inputPos(){ return { x: cvs.width/2, y: 70 }; }
    function hashFnPos(k){
      const cx = cvs.width/2;
      const xs = [-180, 0, 180];
      return { x: cx + xs[k], y: 140 };
    }

    function loop(){
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);
      // backdrop
      ctx.fillStyle = 'rgba(91,138,143,0.5)'; ctx.font = '600 36px JetBrains Mono';
      ctx.fillText('BLOOM FILTER · 32 bits · 3 hash functions · O(1) membership', 30, 28);

      // input box
      const ip = inputPos();
      ctx.fillStyle = 'oklch(0.985 0.003 240)'; ctx.strokeStyle = '#5b8a8f'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(ip.x-130, ip.y-22, 260, 44, 8);
      else ctx.rect(ip.x-130, ip.y-22, 260, 44);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(91,138,143,0.6)'; ctx.font = '600 29px JetBrains Mono';
      ctx.fillText('input key', ip.x-128, ip.y-28);
      ctx.fillStyle = outcome ? (outcome.kind === 'no' ? '#3f8264' : outcome.kind === 'maybe' ? '#cf8a3f' : '#5b8a8f') : 'rgba(91,138,143,0.85)';
      ctx.font = '600 42px JetBrains Mono';
      const lbl = outcome?.key || '—';
      const tw = ctx.measureText(lbl).width;
      ctx.fillText(lbl, ip.x - tw/2, ip.y + 6);

      // hash function nodes
      for (let k=0;k<K;k++){
        const p = hashFnPos(k);
        ctx.fillStyle = 'oklch(0.96 0.02 215)'; ctx.strokeStyle = '#5b8a8f'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(p.x-50, p.y-20, 100, 40, 6);
        else ctx.rect(p.x-50, p.y-20, 100, 40);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'oklch(0.4 0.13 220)'; ctx.font = '600 34px JetBrains Mono';
        ctx.fillText('h'+(k+1)+'(x)', p.x-22, p.y+5);
        // line from input to hash function
        ctx.strokeStyle = 'rgba(91,138,143,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ip.x, ip.y+22); ctx.lineTo(p.x, p.y-20); ctx.stroke();
      }

      // bit array
      const now = performance.now();
      for (let i=0;i<N;i++){
        const p = bitPos(i);
        const flash = bitFlashes.get(i);
        let fill = bits[i] ? '#5b8a8f' : 'oklch(0.985 0.003 240)';
        let stroke = bits[i] ? '#3a6b70' : 'rgba(91,138,143,0.3)';
        if (flash){
          const t = (now - flash.born)/flash.dur;
          if (t > 1) bitFlashes.delete(i);
          else {
            const intensity = 1 - t;
            ctx.shadowBlur = 16 * intensity;
            ctx.shadowColor = flash.color;
            fill = flash.color; stroke = flash.color;
          }
        }
        ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(p.x-p.w/2, p.y-p.h/2, p.w, p.h, 4);
        else ctx.rect(p.x-p.w/2, p.y-p.h/2, p.w, p.h);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = bits[i] ? 'white' : 'rgba(91,138,143,0.55)';
        ctx.font = '700 36px JetBrains Mono';
        const t = String(bits[i]);
        const tw2 = ctx.measureText(t).width;
        ctx.fillText(t, p.x - tw2/2, p.y + 5);
        // index below
        ctx.fillStyle = 'rgba(91,138,143,0.45)'; ctx.font = '500 23px JetBrains Mono';
        ctx.fillText(String(i).padStart(2,'0'), p.x-9, p.y + p.h/2 + 11);
      }

      // particles (hash → bit)
      particles = particles.filter(pt => {
        const dt = now - pt.born;
        pt.t = Math.min(1, dt/pt.dur);
        const e = 1 - Math.pow(1-pt.t, 3);
        // bezier so it arcs nicely
        const cx = (pt.x0 + pt.x1)/2;
        const cy = pt.y0 + (pt.y1 - pt.y0) * 0.3 - 30;
        const u = 1 - e;
        const px = u*u*pt.x0 + 2*u*e*cx + e*e*pt.x1;
        const py = u*u*pt.y0 + 2*u*e*cy + e*e*pt.y1;
        // trail
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = 0.7 * (1 - pt.t*0.5);
        ctx.shadowBlur = 12; ctx.shadowColor = pt.color;
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        // when reaches target, flash bit
        if (pt.t >= 1 && !pt.fired){
          pt.fired = true;
          bitFlashes.set(pt.bitIdx, { born: now, dur: 600, color: pt.color });
          if (pt.kind === 'add'){ bits[pt.bitIdx] = 1; }
        }
        return pt.t < 1;
      });

      // outcome banner
      if (outcome){
        const oc = outcome;
        const cx = cvs.width/2;
        const y0 = 380;
        let lbl = '', col = '#5b8a8f';
        if (oc.kind === 'no'){ lbl = '✓ DEFINITELY NOT  →  skip the file'; col = '#3f8264'; }
        else if (oc.kind === 'maybe'){ lbl = '? MAYBE PRESENT  →  go check the file'; col = '#cf8a3f'; }
        else if (oc.kind === 'add'){ lbl = '+ ADDED · '+oc.hs.length+' bits set'; col = '#5b8a8f'; }
        ctx.fillStyle = col; ctx.globalAlpha = 0.12;
        ctx.fillRect(cx-300, y0-22, 600, 36);
        ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.font = '700 42px JetBrains Mono';
        const tw3 = ctx.measureText(lbl).width;
        ctx.fillText(lbl, cx - tw3/2, y0+3);
      }

      // counters
      const setCount = bits.reduce((a,b)=>a+b,0);
      counters.bs.textContent = setCount;
      counters.ad.textContent = added;
      const fpr = Math.pow(setCount/N, K);
      counters.fpr.textContent = (fpr*100).toFixed(1)+'%';

      RAF(loop);
    }
    loop();

    function fire(key, kind){
      const hs = hashes(key);
      const ip = inputPos();
      hs.forEach((h, k) => {
        const fp = hashFnPos(k);
        const bp = bitPos(h);
        // input → hash function
        particles.push({
          x0: ip.x, y0: ip.y+22, x1: fp.x, y1: fp.y-20,
          t:0, dur:280, born: performance.now(),
          color: kind === 'check' ? '#cf8a3f' : '#5b8a8f',
          kind, bitIdx: -1, fired: true
        });
        // hash → bit (delayed)
        setTimeout(() => {
          particles.push({
            x0: fp.x, y0: fp.y+20, x1: bp.x, y1: bp.y,
            t:0, dur:400, born: performance.now(),
            color: kind === 'check' ? (bits[h] ? '#cf8a3f' : '#3f8264') : '#5b8a8f',
            kind, bitIdx: h, fired: false
          });
        }, 280);
      });
      return hs;
    }

    el.querySelector('[data-act="add"]').onclick = () => {
      const v = el.querySelector('[data-add]').value.trim(); if (!v) return;
      const hs = fire(v, 'add');
      added++;
      outcome = { kind:'add', key: v, hs };
      el.querySelector('[data-out]').innerHTML = `<b>added "${esc(v)}"</b> · 3 hashes → bits ${hs.join(', ')} are now 1`;
      award(el, lessonId, cpId, 'bloom');
    };
    el.querySelector('[data-act="check"]').onclick = () => {
      const v = el.querySelector('[data-check]').value.trim(); if (!v) return;
      const hs = fire(v, 'check');
      const allSet = hs.every(h => bits[h]);
      setTimeout(() => {
        outcome = { kind: allSet ? 'maybe' : 'no', key: v, hs };
        el.querySelector('[data-out]').innerHTML = allSet
          ? `<b style="color:var(--warn)">"maybe"</b> · all 3 bits set at ${hs.join(', ')}. Real hit or false positive — go check the actual file.`
          : `<b style="color:var(--ok)">"definitely not"</b> · at least one bit was 0. <i>Skip the file entirely.</i>`;
      }, 700);
    };
    el.querySelector('[data-act="reset"]').onclick = () => {
      bits.fill(0); added = 0; outcome = null; particles = []; bitFlashes.clear();
      el.querySelector('[data-out]').innerHTML = 'Reset.';
    };
    function resize(){
      const wrap = el.querySelector('.bfx-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(900, r.width*2);
      cvs.height = Math.max(380, r.height*2);
    }
    new ResizeObserver(resize).observe(el.querySelector('.bfx-canvas-wrap'));
    setTimeout(resize, 60);
  }

  // ============================================================
  // 9. CDC FLOW — canvas-driven WAL → debezium → kafka → sink
  // ============================================================
  function CDCFlow(target, opts){
    const { lessonId, cpId } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);

    const VIEWS = {
      kappa: {
        label: 'Kappa — single stream',
        rail: ['Postgres (OLTP)', 'WAL / replication slot', 'Debezium / Kafka Connect', 'Kafka topic · cdc.public.users', 'Streaming consumer (Flink)', 'Iceberg · analytics.dim_users'],
        note: 'One pipeline. Re-process by replaying the topic from offset 0 of a long-retention compacted topic.'
      },
      lambda: {
        label: 'Lambda — speed + batch',
        rail: ['Postgres (OLTP)', 'WAL / replication slot', 'Debezium', 'Kafka topic', null, 'Iceberg · merged view'],
        speed: 'Speed layer · Flink (approximate, fresh)',
        batch: 'Batch layer · Spark (correct, hourly)',
        note: 'Two pipelines computing the same logic, then merged. Killer flaw: two codebases for one transform.'
      }
    };

    function diagram(mode){
      const W = 1100, H = 360;
      const padL = 30, padR = 30, padT = 30;
      const innerW = W - padL - padR;
      let svg = `<svg class="cdc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
      // arrow marker
      svg += `<defs>
        <marker id="cdc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-3)"/>
        </marker>
        <marker id="cdc-arrow-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="oklch(0.55 0.10 215)"/>
        </marker>
      </defs>`;

      if (mode === 'kappa') {
        const V = VIEWS.kappa;
        const stages = V.rail;
        const cellW = (innerW - 5*16) / 6;
        const cellH = 70;
        const y = padT + 30;
        stages.forEach((s, i) => {
          const x = padL + i*(cellW + 16);
          const accent = (i === 0) ? '#5b8a8f' : (i === 5) ? '#3f8264' : '#cf8a3f';
          svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="var(--paper)" stroke="${accent}" stroke-width="1.2" rx="6"/>`;
          // step number
          svg += `<text x="${x + 10}" y="${y + 16}" class="cdc-svg-num">${i+1}</text>`;
          // wrap label
          const words = s.split(' ');
          let line1 = '', line2 = '';
          for (const w of words) {
            if ((line1 + ' ' + w).trim().length <= 22) line1 = (line1 + ' ' + w).trim();
            else line2 = (line2 + ' ' + w).trim();
          }
          svg += `<text x="${x + cellW/2}" y="${y + 38}" class="cdc-svg-stage" text-anchor="middle">${line1}</text>`;
          if (line2) svg += `<text x="${x + cellW/2}" y="${y + 54}" class="cdc-svg-stage-2" text-anchor="middle">${line2}</text>`;
          if (i < 5) {
            const ax = x + cellW + 1, ay = y + cellH/2;
            svg += `<line x1="${ax}" y1="${ay}" x2="${ax + 12}" y2="${ay}" stroke="var(--ink-3)" stroke-width="1.2" marker-end="url(#cdc-arrow)"/>`;
          }
        });

        // sample event payload card
        const ey = y + cellH + 36;
        const ex = padL;
        const ew = innerW * 0.55;
        const eh = 200;
        svg += `<rect x="${ex}" y="${ey}" width="${ew}" height="${eh}" fill="var(--paper-2)" stroke="var(--rule)" rx="6"/>`;
        svg += `<text x="${ex + 14}" y="${ey + 20}" class="cdc-svg-h">Event payload (Debezium-style)</text>`;
        const lines = [
          ['"op":', '"u"', '— c·u·d·r (create / update / delete / read=snapshot)'],
          ['"ts_ms":', '1714233601000', '— commit time on source'],
          ['"source":', '{ db, schema, lsn, ... }', '— provenance'],
          ['"before":', '{ id:42, plan:"free" }', '— prior row state (UPDATE / DELETE only)'],
          ['"after":', '{ id:42, plan:"pro" }', '— new row state (INSERT / UPDATE only)']
        ];
        lines.forEach((parts, i) => {
          const ly = ey + 42 + i*28;
          svg += `<text x="${ex + 22}" y="${ly}" class="cdc-svg-key">${parts[0]}</text>`;
          svg += `<text x="${ex + 80}" y="${ly}" class="cdc-svg-val">${parts[1]}</text>`;
          svg += `<text x="${ex + 280}" y="${ly}" class="cdc-svg-note">${parts[2]}</text>`;
        });

        // properties / guarantees card
        const px = ex + ew + 24;
        const pw = innerW - ew - 24;
        svg += `<rect x="${px}" y="${ey}" width="${pw}" height="${eh}" fill="var(--paper-2)" stroke="var(--rule)" rx="6"/>`;
        svg += `<text x="${px + 14}" y="${ey + 20}" class="cdc-svg-h">Why this wins over polling</text>`;
        const props = [
          'captures DELETEs (no row to SELECT)',
          'no load on source — reads WAL directly',
          'ordered, gap-free by LSN',
          'replayable from any offset'
        ];
        props.forEach((p, i) => {
          const ly = ey + 50 + i*30;
          svg += `<circle cx="${px + 22}" cy="${ly - 4}" r="3" fill="#3f8264"/>`;
          svg += `<text x="${px + 32}" y="${ly}" class="cdc-svg-prop">${p}</text>`;
        });
      } else {
        // LAMBDA — split path
        const V = VIEWS.lambda;
        const cellH = 60;
        const cellW = 130;
        const gap = 14;
        // shared start: Postgres → WAL → Debezium → Kafka  (positions 0..3)
        const sharedY = padT + 100;
        const sharedStages = ['Postgres (OLTP)', 'WAL', 'Debezium', 'Kafka topic'];
        sharedStages.forEach((s, i) => {
          const x = padL + i*(cellW + gap);
          svg += `<rect x="${x}" y="${sharedY}" width="${cellW}" height="${cellH}" fill="var(--paper)" stroke="#5b8a8f" stroke-width="1.2" rx="6"/>`;
          svg += `<text x="${x + cellW/2}" y="${sharedY + 36}" class="cdc-svg-stage" text-anchor="middle">${s}</text>`;
          if (i < 3) {
            const ax = x + cellW + 1, ay = sharedY + cellH/2;
            svg += `<line x1="${ax}" y1="${ay}" x2="${ax + 10}" y2="${ay}" stroke="var(--ink-3)" stroke-width="1.2" marker-end="url(#cdc-arrow)"/>`;
          }
        });
        // Branch from Kafka (position 3) into speed (top) and batch (bottom)
        const branchX = padL + 4*(cellW + gap) + 30;
        const speedY = padT + 30;
        const batchY = padT + 200;
        const branchW = cellW + 30;
        // speed
        svg += `<rect x="${branchX}" y="${speedY}" width="${branchW}" height="${cellH}" fill="var(--paper)" stroke="#cf8a3f" stroke-width="1.2" rx="6"/>`;
        svg += `<text x="${branchX + branchW/2}" y="${speedY + 24}" class="cdc-svg-stage" text-anchor="middle">Speed layer</text>`;
        svg += `<text x="${branchX + branchW/2}" y="${speedY + 42}" class="cdc-svg-stage-2" text-anchor="middle">Flink · approximate</text>`;
        // batch
        svg += `<rect x="${branchX}" y="${batchY}" width="${branchW}" height="${cellH}" fill="var(--paper)" stroke="#7a4a8a" stroke-width="1.2" rx="6"/>`;
        svg += `<text x="${branchX + branchW/2}" y="${batchY + 24}" class="cdc-svg-stage" text-anchor="middle">Batch layer</text>`;
        svg += `<text x="${branchX + branchW/2}" y="${batchY + 42}" class="cdc-svg-stage-2" text-anchor="middle">Spark · correct, hourly</text>`;
        // branch lines from Kafka right-edge to both
        const kx = padL + 4*(cellW + gap) - gap;
        const ky = sharedY + cellH/2;
        svg += `<path d="M ${kx} ${ky} C ${kx+15} ${ky}, ${branchX-15} ${speedY+cellH/2}, ${branchX} ${speedY+cellH/2}" stroke="var(--ink-3)" fill="none" stroke-width="1.2" marker-end="url(#cdc-arrow)"/>`;
        svg += `<path d="M ${kx} ${ky} C ${kx+15} ${ky}, ${branchX-15} ${batchY+cellH/2}, ${branchX} ${batchY+cellH/2}" stroke="var(--ink-3)" fill="none" stroke-width="1.2" marker-end="url(#cdc-arrow)"/>`;
        // merge node
        const mx = branchX + branchW + 28;
        const my = sharedY;
        const mw = W - padR - mx;
        const mh = cellH + 20;
        svg += `<rect x="${mx}" y="${my-10}" width="${mw}" height="${mh}" fill="var(--paper-2)" stroke="#3f8264" stroke-width="1.4" rx="6"/>`;
        svg += `<text x="${mx + mw/2}" y="${my + 18}" class="cdc-svg-stage" text-anchor="middle">Merge / serve</text>`;
        svg += `<text x="${mx + mw/2}" y="${my + 38}" class="cdc-svg-stage-2" text-anchor="middle">batch ⊕ recent-speed-delta</text>`;
        svg += `<text x="${mx + mw/2}" y="${my + 54}" class="cdc-svg-stage-2" text-anchor="middle">→ Iceberg / serving DB</text>`;
        // merge incoming arrows
        svg += `<path d="M ${branchX + branchW} ${speedY + cellH/2} C ${branchX + branchW + 14} ${speedY + cellH/2}, ${mx-14} ${my + mh/2 - 5}, ${mx} ${my + mh/2 - 5}" stroke="var(--ink-3)" fill="none" stroke-width="1.2" marker-end="url(#cdc-arrow)"/>`;
        svg += `<path d="M ${branchX + branchW} ${batchY + cellH/2} C ${branchX + branchW + 14} ${batchY + cellH/2}, ${mx-14} ${my + mh/2 + 5}, ${mx} ${my + mh/2 + 5}" stroke="var(--ink-3)" fill="none" stroke-width="1.2" marker-end="url(#cdc-arrow)"/>`;
        // killer-flaw callout
        const cx = padL, cy = padT + 280;
        svg += `<text x="${cx}" y="${cy}" class="cdc-svg-flaw">⚠ Two codebases. Every aggregation expressed twice — once as a streaming job, once as a batch job. Drift between the two is the dominant operational pain.</text>`;
      }

      svg += '</svg>';
      return svg;
    }

    el.innerHTML = head('Diagram', 'CDC pipeline · Kappa vs. Lambda', 20, earned) + `
      <div class="cdc-frame">
        <div class="cdc-tabs">
          <button class="cdc-tab active" data-mode="kappa">Kappa (one stream)</button>
          <button class="cdc-tab" data-mode="lambda">Lambda (speed + batch)</button>
        </div>
        <div class="cdc-svg-wrap">${diagram('kappa')}</div>
        <div class="cdc-legend">
          <div class="cdc-legend-text" id="cdc-legend">${VIEWS.kappa.note}</div>
          <button class="btn primary sm" data-act="ack">Got it · claim XP</button>
        </div>
      </div>`;
    target.replaceWith(el);

    const wrap = el.querySelector('.cdc-svg-wrap');
    const legend = el.querySelector('#cdc-legend');
    let claimed = false;
    el.querySelectorAll('.cdc-tab').forEach(t => {
      t.onclick = () => {
        el.querySelectorAll('.cdc-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const mode = t.dataset.mode;
        wrap.innerHTML = diagram(mode);
        legend.textContent = VIEWS[mode].note;
      };
    });
    el.querySelector('[data-act="ack"]').onclick = (e) => {
      if (claimed) return;
      claimed = true;
      award(el, lessonId, cpId, 'cdc');
      e.target.disabled = true;
      e.target.textContent = '✓ claimed';
    };
  }


  // ============================================================
  // 10. BACKFILL DAG — dependency-aware reprocessing
  // ============================================================
  function BackfillDAG(target, opts){
    const { lessonId, cpId } = opts;
    const el = E("div", {class:"w"});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);

    // Pre-compute three deterministic schedules for 30 days at 1/4/10 workers,
    // each with realistic retries on specific days.
    const N = 30;
    const RETRIES = new Set([6, 14, 22]);
    function schedule(W){
      const free = new Array(W).fill(0);
      const tasks = [];
      const baseDur = 60;
      for (let i=1;i<=N;i++){
        let w = 0;
        for (let j=1;j<W;j++) if (free[j] < free[w]) w = j;
        let cursor = free[w];
        const retries = [];
        if (RETRIES.has(i)) {
          const failDur = Math.round(baseDur*0.55);
          retries.push({ start: cursor, end: cursor + failDur });
          cursor += failDur + 8;
        }
        const start = cursor;
        const end = start + baseDur;
        free[w] = end;
        tasks.push({ day: i, worker: w, start, end, retries });
      }
      const total = Math.max(...free);
      return { tasks, total, workers: W };
    }
    const SCHEDULES = { 1: schedule(1), 4: schedule(4), 10: schedule(10) };
    const maxTotal = Math.max(SCHEDULES[1].total, SCHEDULES[4].total, SCHEDULES[10].total);

    // ONE big SVG: three horizontal bands sharing a single time axis.
    const W_SVG = 1100;
    const H_HEADER = 38;
    const H_AXIS = 32;
    // band heights scale with worker count so each task row gets ≥18px
    const ROW_H = { 1: 36, 4: 22, 10: 18 };
    const BAND_PAD = 12;  // padding above/below the bars in each band
    const TITLE_W = 130;  // left gutter for "1 worker" label + speedup
    const padR = 24;
    const innerW = W_SVG - TITLE_W - padR;
    const xs = t => TITLE_W + (t / maxTotal) * innerW;

    function band(W, yTop){
      const sch = SCHEDULES[W];
      const bandH = W * ROW_H[W] + 2*BAND_PAD;
      const speedup = (SCHEDULES[1].total / sch.total).toFixed(1);
      let s = "";
      // band background
      s += `<rect x="0" y="${yTop}" width="${W_SVG}" height="${bandH}" fill="var(--paper)" stroke="var(--rule)" stroke-width="0.6"/>`;
      // title gutter
      s += `<rect x="0" y="${yTop}" width="${TITLE_W}" height="${bandH}" fill="var(--paper-2)"/>`;
      s += `<text x="16" y="${yTop + 24}" class="bf-svg-bandtitle">${W} worker${W>1?"s":""}</text>`;
      s += `<text x="16" y="${yTop + 42}" class="bf-svg-bandsub">elapsed ${sch.total}</text>`;
      s += `<text x="16" y="${yTop + 58}" class="bf-svg-bandspeed">${speedup}× speedup</text>`;
      // worker rail labels & rules
      for (let i=0;i<W;i++){
        const yRow = yTop + BAND_PAD + i*ROW_H[W];
        const yMid = yRow + ROW_H[W]/2;
        s += `<line x1="${TITLE_W}" y1="${yMid}" x2="${TITLE_W + innerW}" y2="${yMid}" stroke="var(--rule)" stroke-width="0.4" stroke-dasharray="1 3"/>`;
        if (W <= 4 || i % 2 === 0 || i === W-1) {
          s += `<text x="${TITLE_W - 6}" y="${yMid + 3.5}" class="bf-svg-wlabel" text-anchor="end">w${i}</text>`;
        }
      }
      // tasks
      const taskH = Math.max(11, ROW_H[W] - 6);
      sch.tasks.forEach(t => {
        const yRow = yTop + BAND_PAD + t.worker*ROW_H[W];
        const yBar = yRow + ROW_H[W]/2 - taskH/2;
        // retries (red, before)
        t.retries.forEach(r => {
          const rx = xs(r.start), rw = Math.max(2, xs(r.end) - xs(r.start));
          s += `<rect x="${rx}" y="${yBar}" width="${rw}" height="${taskH}" fill="oklch(0.86 0.10 25)" stroke="#b85a4a" stroke-width="0.7" rx="2"/>`;
          if (rw > 10) s += `<text x="${rx + rw/2}" y="${yBar + taskH/2 + 3.5}" class="bf-svg-retrymark" text-anchor="middle">✗</text>`;
        });
        // success bar
        const sx = xs(t.start), sw = Math.max(3, xs(t.end) - xs(t.start));
        s += `<rect x="${sx}" y="${yBar}" width="${sw}" height="${taskH}" fill="oklch(0.91 0.05 155)" stroke="#3f8264" stroke-width="0.7" rx="2"/>`;
        if (sw > 14 && taskH >= 12) {
          s += `<text x="${sx + sw/2}" y="${yBar + taskH/2 + 3.5}" class="bf-svg-day" text-anchor="middle">${t.day}</text>`;
        } else if (sw > 8 && W === 10 && t.day % 5 === 0) {
          s += `<text x="${sx + sw/2}" y="${yBar + taskH/2 + 3.5}" class="bf-svg-day" text-anchor="middle">${t.day}</text>`;
        }
      });
      return { svg: s, height: bandH };
    }

    function diagram(){
      let svg = "";
      // Three bands stacked
      let y = H_HEADER;
      const b1 = band(1, y); y += b1.height + 4;
      const b4 = band(4, y); y += b4.height + 4;
      const b10 = band(10, y); y += b10.height;
      // x-axis below the last band
      const axisY = y + 16;
      const tickStep = 240;
      let axisSvg = `<line x1="${TITLE_W}" y1="${axisY}" x2="${TITLE_W + innerW}" y2="${axisY}" stroke="var(--ink-3)" stroke-width="1"/>`;
      for (let t=0; t<=maxTotal; t+=tickStep){
        const x = xs(t);
        axisSvg += `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY+5}" stroke="var(--ink-3)" stroke-width="1"/>`;
        axisSvg += `<text x="${x}" y="${axisY+18}" class="bf-svg-tick" text-anchor="middle">${t}</text>`;
      }
      axisSvg += `<text x="${TITLE_W + innerW/2}" y="${axisY+34}" class="bf-svg-axislbl" text-anchor="middle">wall time →</text>`;
      const totalH = axisY + 44;

      // Header
      let headerSvg = `<text x="0" y="22" class="bf-svg-h">Backfill of 30 daily partitions · same workload, different worker counts</text>`;

      svg = `<svg class="bf-svg" viewBox="0 0 ${W_SVG} ${totalH}" preserveAspectRatio="xMidYMid meet">` +
            headerSvg + b1.svg + b4.svg + b10.svg + axisSvg + "</svg>";
      return svg;
    }

    el.innerHTML = head("Diagram", "Backfill 30 days · workers vs. wall time", 20, earned) +
      `<div class="bf-d-frame">` +
      `<div class="bf-d-svg-wrap">${diagram()}</div>` +
      `<div class="bf-d-legend">` +
        `<div class="bf-d-legend-grid">` +
          `<div><span class="bf-sw bf-sw-ok"></span><b>green bar</b> · successful run of one day</div>` +
          `<div><span class="bf-sw bf-sw-fail"></span><b>red ✗ bar</b> · first-attempt failure, then retry</div>` +
          `<div><b>3 retries</b> on days <code>06</code>, <code>14</code>, <code>22</code> — typical flake rate</div>` +
          `<div><b>Independent per day</b>: any worker can take any day, so wall time scales near-linearly with worker count until variance dominates.</div>` +
        `</div>` +
        `<button class="btn primary sm" data-act="ack">Got it · claim XP</button>` +
      `</div>` +
      `</div>`;
    target.replaceWith(el);

    let claimed = false;
    el.querySelector("[data-act=\"ack\"]").onclick = (e) => {
      if (claimed) return;
      claimed = true;
      award(el, lessonId, cpId, "backfill");
      e.target.disabled = true;
      e.target.textContent = "✓ claimed";
    };
  }

  // ============================================================
  // 11. SLA DASHBOARD — animated freshness/volume/quality
  // ============================================================
  function SLAdash(target, opts){
    const { lessonId, cpId } = opts;
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = head('Sim', 'Pipeline observability · NOC dashboard', 20, earned) + `
      <div class="slax-frame">
        <div class="slax-canvas-wrap">
          <canvas class="slax-canvas" width="1400" height="540" role="img" aria-label="SLA dashboard showing pipeline freshness against its service-level objective and error budget."></canvas>
        </div>
        <div class="slax-feed" id="sla-feed"></div>
        <div class="slax-controls">
          <button class="btn primary sm" data-act="play">▶ play 1 hour</button>
          <button class="btn sm" data-act="incident">⚠ inject incident</button>
          <button class="btn sm" data-act="pause">⏸ pause</button>
          <span class="slax-clock">t = <b data-c="clk">12:00</b> · status <b data-c="st">healthy</b></span>
        </div>
      </div>`;
    target.replaceWith(el);
    const cvs = el.querySelector('.slax-canvas');
    const ctx = cvs.getContext('2d');
    const series = { fresh:[], vol:[], null:[], lag:[] };
    let t = 0, incident = false, timer = null;
    let alertPulse = []; // {panel, born}
    const PANELS = [
      { key:'fresh', title:'freshness',     unit:'min',     slo:10,    fmt:(v)=>v.toFixed(1)+' min',      higherWorse:true,  color:'#cf8a3f', accent:'#a8632c' },
      { key:'vol',   title:'row volume',    unit:'rows/min',slo:80000, fmt:(v)=>Math.round(v).toLocaleString(),higherWorse:false, color:'#3f8264', accent:'#2a5a45' },
      { key:'null',  title:'null rate',     unit:'%',       slo:1,     fmt:(v)=>v.toFixed(2)+'%',         higherWorse:true,  color:'#b85a4a', accent:'#8a3f30' },
      { key:'lag',   title:'consumer lag',  unit:'msgs',    slo:500,   fmt:(v)=>Math.round(v)+' msgs',    higherWorse:true,  color:'#7a4a8a', accent:'#5a2f6a' }
    ];
    const clk = el.querySelector('[data-c="clk"]');
    const stEl = el.querySelector('[data-c="st"]');

    function panelRect(i){
      const cols = 2, rows = 2;
      const padX = 30, padY = 50, gap = 24;
      const cw = (cvs.width - 2*padX - gap)/cols;
      const ch = (cvs.height - 2*padY - gap - 30)/rows;
      const c = i%cols, r = Math.floor(i/cols);
      return { x: padX + c*(cw+gap), y: padY + r*(ch+gap), w: cw, h: ch };
    }

    function loop(){
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);
      // backdrop
      ctx.fillStyle = 'rgba(91,138,143,0.55)'; ctx.font = '600 36px JetBrains Mono';
      ctx.fillText('OBSERVABILITY · 4 SLOs · live tail · alerts page on threshold cross', 30, 28);

      const now = performance.now();
      // remove old alert pulses
      alertPulse = alertPulse.filter(a => (now - a.born) < 1500);

      PANELS.forEach((P, idx) => {
        const r = panelRect(idx);
        const arr = series[P.key];
        // panel bg
        ctx.fillStyle = 'oklch(0.985 0.003 240)';
        ctx.strokeStyle = 'rgba(91,138,143,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 8);
        else ctx.rect(r.x, r.y, r.w, r.h);
        ctx.fill(); ctx.stroke();
        // alert pulse halo
        const pulse = alertPulse.find(a=>a.panel===idx);
        if (pulse){
          const f = (now - pulse.born)/1500;
          ctx.strokeStyle = '#b85a4a'; ctx.lineWidth = 3;
          ctx.globalAlpha = 1 - f;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(r.x-3, r.y-3, r.w+6, r.h+6, 10);
          else ctx.rect(r.x-3, r.y-3, r.w+6, r.h+6);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // title
        ctx.fillStyle = P.accent; ctx.font = '700 34px JetBrains Mono';
        ctx.fillText(P.title.toUpperCase(), r.x+16, r.y+24);
        // SLO label
        ctx.fillStyle = 'rgba(91,138,143,0.55)'; ctx.font = '500 29px JetBrains Mono';
        ctx.fillText('SLO ' + (P.higherWorse?'<':'>') + ' ' + (P.slo>=1000?P.slo.toLocaleString():P.slo) + ' ' + P.unit, r.x+16, r.y+42);

        // chart bounds
        const cx0 = r.x + 16, cy0 = r.y + 60;
        const cw = r.w - 32, ch = r.h - 100;
        // axes baseline
        ctx.strokeStyle = 'rgba(91,138,143,0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx0, cy0+ch); ctx.lineTo(cx0+cw, cy0+ch); ctx.stroke();
        // gridlines
        for (let g=1;g<4;g++){
          const gy = cy0 + ch*(g/4);
          ctx.strokeStyle = 'rgba(91,138,143,0.08)';
          ctx.beginPath(); ctx.moveTo(cx0, gy); ctx.lineTo(cx0+cw, gy); ctx.stroke();
        }

        // determine y range
        let maxV = arr.length ? Math.max(...arr) : P.slo*1.5;
        let minV = arr.length ? Math.min(...arr, 0) : 0;
        if (P.key === 'vol'){ maxV = Math.max(maxV, 110000); minV = 60000; }
        if (P.key === 'fresh'){ maxV = Math.max(maxV, 16); }
        if (P.key === 'null'){ maxV = Math.max(maxV, 2); }
        if (P.key === 'lag'){ maxV = Math.max(maxV, 700); }
        const range = (maxV - minV) || 1;

        // SLO threshold line
        if (P.slo >= minV && P.slo <= maxV){
          const ty = cy0 + ch - ((P.slo - minV)/range)*ch;
          ctx.strokeStyle = 'rgba(184,90,74,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,3]);
          ctx.beginPath(); ctx.moveTo(cx0, ty); ctx.lineTo(cx0+cw, ty); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(184,90,74,0.7)'; ctx.font = '500 26px JetBrains Mono';
          ctx.fillText('SLO', cx0+cw - 30, ty - 4);
        }

        // line
        if (arr.length > 1){
          // gradient fill below line
          const pts = arr.map((v,i) => ({
            x: cx0 + (i/(arr.length-1))*cw,
            y: cy0 + ch - ((v - minV)/range)*ch
          }));
          // area fill
          ctx.beginPath();
          ctx.moveTo(pts[0].x, cy0+ch);
          pts.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.lineTo(pts[pts.length-1].x, cy0+ch);
          ctx.closePath();
          ctx.fillStyle = P.color; ctx.globalAlpha = 0.12; ctx.fill(); ctx.globalAlpha = 1;
          // line
          ctx.strokeStyle = P.color; ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          ctx.stroke();
          // last-point glow
          const last = pts[pts.length-1];
          ctx.fillStyle = P.color; ctx.shadowBlur = 12; ctx.shadowColor = P.color;
          ctx.beginPath(); ctx.arc(last.x, last.y, 5, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
        }

        // current value (bottom)
        const cur = arr[arr.length-1];
        const breached = cur != null && (P.higherWorse ? cur > P.slo : cur < P.slo);
        ctx.fillStyle = breached ? '#b85a4a' : P.accent; ctx.font = '700 57px JetBrains Mono';
        const valLbl = cur != null ? P.fmt(cur) : '—';
        ctx.fillText(valLbl, r.x+16, r.y+r.h-14);
        // breach badge
        if (breached){
          ctx.fillStyle = '#b85a4a'; ctx.font = '700 29px JetBrains Mono';
          ctx.fillText('▲ BREACH', r.x+r.w-90, r.y+r.h-14);
        } else if (cur != null) {
          ctx.fillStyle = '#3f8264'; ctx.font = '600 29px JetBrains Mono';
          ctx.fillText('● OK', r.x+r.w-50, r.y+r.h-14);
        }
      });
      RAF(loop);
    }
    loop();

    function tick(){
      t++;
      const fr = 4 + Math.random()*2 + (incident && t>20 ? Math.min(15, (t-20)*1.2) : 0);
      const vo = 95000 + Math.random()*8000 - (incident && t>22 ? (t-22)*4500 : 0);
      const nu = 0.4 + Math.random()*0.3 + (incident && t>24 ? (t-24)*0.4 : 0);
      const la = 200 + Math.random()*120 + (incident && t>20 ? (t-20)*40 : 0);
      const wasBreach = {
        fresh: series.fresh.length && series.fresh[series.fresh.length-1] > 10,
        null:  series.null.length && series.null[series.null.length-1] > 1,
        lag:   series.lag.length && series.lag[series.lag.length-1] > 500,
        vol:   series.vol.length && series.vol[series.vol.length-1] < 80000
      };
      series.fresh.push(fr); series.vol.push(vo); series.null.push(nu); series.lag.push(la);
      // cap to last 60 ticks
      ['fresh','vol','null','lag'].forEach(k => { if (series[k].length > 60) series[k].shift(); });
      // alert pulses on first crossing
      if (!wasBreach.fresh && fr > 10) alertPulse.push({panel:0, born: performance.now()});
      if (!wasBreach.vol && vo < 80000) alertPulse.push({panel:1, born: performance.now()});
      if (!wasBreach.null && nu > 1) alertPulse.push({panel:2, born: performance.now()});
      if (!wasBreach.lag && la > 500) alertPulse.push({panel:3, born: performance.now()});

      const mins = (12*60 + t).toString();
      clk.textContent = String(Math.floor((12*60+t)/60)).padStart(2,'0')+':'+String((12*60+t)%60).padStart(2,'0');
      const anyBreach = fr>10 || nu>1 || la>500 || vo<80000;
      stEl.textContent = anyBreach ? 'INCIDENT' : 'healthy';
      stEl.style.color = anyBreach ? '#b85a4a' : '#3f8264';

      const feed = $('#sla-feed', el);
      if (incident && t===22) feed.innerHTML = '<div class="sla-alert bad">[12:22] PAGE · freshness above SLO (10 min) · on-call paged</div>' + feed.innerHTML;
      if (incident && t===26) feed.innerHTML = '<div class="sla-alert bad">[12:26] PAGE · null_rate(price) > 1% · upstream schema changed</div>' + feed.innerHTML;
      if (incident && t===34) feed.innerHTML = '<div class="sla-alert ok">[12:34] paused downstream consumers · investigating</div>' + feed.innerHTML;
      if (t > 60) { clearInterval(timer); timer=null; award(el, lessonId, cpId, 'sla'); }
    }
    function start(withIncident){
      incident = withIncident; t = 0;
      series.fresh.length = series.vol.length = series.null.length = series.lag.length = 0;
      $('#sla-feed', el).innerHTML='';
      if (timer) clearInterval(timer);
      timer = setInterval(tick, 200);
    }
    el.querySelector('[data-act="play"]').onclick = () => start(false);
    el.querySelector('[data-act="incident"]').onclick = () => start(true);
    el.querySelector('[data-act="pause"]').onclick = () => { if (timer) { clearInterval(timer); timer = null; } };
    function resize(){
      const wrap = el.querySelector('.slax-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(900, r.width*2);
      cvs.height = Math.max(440, r.height*2);
    }
    new ResizeObserver(resize).observe(el.querySelector('.slax-canvas-wrap'));
    setTimeout(resize, 60);
  }
  // expose alias
  window.SlaDashboard = SLAdash;

  // ============================================================
  // 12. INTERVIEW MOVE — step through an IC5 design
  // ============================================================
  function InterviewMove(target, opts){
    const { lessonId, cpId } = opts;
    const moves = (opts.moves && opts.moves.length) ? opts.moves : [
      { tag:'clarify', title:'Walkthrough not configured',
        body:'<p>Pass a <code>moves</code> array to <code>D.InterviewMove</code>.</p>' }
    ];
    const el = E('div', {class:'w'});
    const earned = window.Progress.hasCheckpoint(lessonId, cpId);
    el.innerHTML = head('Walkthrough', 'IC5 design · step through the moves', 25, earned) + `
      <div class="ivx-frame">
        <div class="ivx-canvas-wrap">
          <canvas class="ivx-canvas" width="1400" height="180" role="img" aria-label="Interview-replay progress track showing the current move in a system-design walkthrough."></canvas>
        </div>
        <div class="ivx-stage" id="iv-stage"></div>
        <div class="ivx-controls">
          <button class="btn sm" data-act="prev">◀ prev move</button>
          <span class="ivx-progress">move <b data-c="cur">1</b> / <b data-c="tot">${moves.length}</b> · <span data-c="phase"></span></span>
          <button class="btn primary sm" data-act="next">next move ▶</button>
        </div>
      </div>`;
    target.replaceWith(el);
    const cvs = el.querySelector('.ivx-canvas');
    const ctx = cvs.getContext('2d');
    const stage = $('#iv-stage', el);
    let cur = 0;
    let curT = 0; // animated progress 0..moves.length-1
    let hoverIdx = -1;
    let particles = [];
    let lastEmit = 0;

    const TAG_COLOR = {
      'clarify':   '#5b8a8f',
      'scope':     '#5b8a8f',
      'estimate':  '#cf8a3f',
      'api':       '#3f8264',
      'data model':'#3f8264',
      'storage':   '#7a4a8a',
      'compute':   '#7a4a8a',
      'streaming': '#a8632c',
      'serving':   '#cf8a3f',
      'tradeoff':  '#b85a4a',
      'scale':     '#b85a4a',
      'follow-up': '#5b8a8f'
    };
    function tagColor(t){
      if (!t) return '#5b8a8f';
      const k = (t||'').toLowerCase();
      for (const key in TAG_COLOR) if (k.includes(key.split(' ')[0])) return TAG_COLOR[key];
      return '#5b8a8f';
    }
    // Darker variants for the .ivx-tag badge so white label text meets WCAG AA.
    // Canvas accents keep the lighter TAG_COLOR palette; only badge text needs >= 4.5:1.
    const TAG_BADGE_DARK = { '#5b8a8f': '#4a767b', '#cf8a3f': '#a8641f' };
    function tagBadgeColor(t){
      const c = tagColor(t);
      return TAG_BADGE_DARK[c] || c;
    }

    function dotPos(i){
      const padX = 80, w = cvs.width;
      const x = padX + (i / Math.max(1, moves.length-1)) * (w - 2*padX);
      // slight wave for visual rhythm
      const y = cvs.height/2 + Math.sin(i * 0.7) * 18;
      return { x, y };
    }

    function loop(){
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0,0,w,h);
      // backdrop
      ctx.fillStyle = 'rgba(91,138,143,0.5)'; ctx.font = '600 34px JetBrains Mono';
      ctx.fillText('INTERVIEW MOVES · ' + moves.length + ' steps', 30, 28);

      // animate curT toward cur
      curT += (cur - curT) * 0.18;

      // path through dots
      ctx.strokeStyle = 'rgba(91,138,143,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i=0;i<moves.length;i++){
        const p = dotPos(i);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else {
          const prev = dotPos(i-1);
          const mx = (prev.x + p.x)/2;
          ctx.bezierCurveTo(mx, prev.y, mx, p.y, p.x, p.y);
        }
      }
      ctx.stroke();
      // progress overlay (filled portion)
      ctx.strokeStyle = '#cf8a3f'; ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 12; ctx.shadowColor = '#cf8a3f';
      ctx.beginPath();
      const fullIdx = Math.floor(curT);
      const frac = curT - fullIdx;
      for (let i=0;i<=fullIdx && i<moves.length;i++){
        const p = dotPos(i);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else {
          const prev = dotPos(i-1);
          const mx = (prev.x + p.x)/2;
          ctx.bezierCurveTo(mx, prev.y, mx, p.y, p.x, p.y);
        }
      }
      // partial segment
      if (frac > 0.01 && fullIdx+1 < moves.length){
        const a = dotPos(fullIdx), b = dotPos(fullIdx+1);
        // sample the bezier
        const mx = (a.x+b.x)/2;
        const t = frac;
        // we'll just lineTo since the bezier is short
        ctx.lineTo(a.x + (b.x-a.x)*t, a.y + (b.y-a.y)*t);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // dots
      for (let i=0;i<moves.length;i++){
        const p = dotPos(i);
        const m = moves[i];
        const col = tagColor(m.tag);
        const isCur = i === cur;
        const isPast = i < cur;
        const isHover = i === hoverIdx;
        ctx.save();
        if (isCur) { ctx.shadowBlur = 22; ctx.shadowColor = col; }
        else if (isHover) { ctx.shadowBlur = 12; ctx.shadowColor = col; }
        ctx.fillStyle = isPast || isCur ? col : 'oklch(0.985 0.003 240)';
        ctx.strokeStyle = col;
        ctx.lineWidth = isCur ? 3 : 2;
        ctx.beginPath();
        const r = isCur ? 22 : (isPast ? 16 : 14);
        ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.restore();
        // index inside
        ctx.fillStyle = isPast || isCur ? 'white' : col;
        ctx.font = '700 31px JetBrains Mono';
        const lbl = String(i+1).padStart(2,'0');
        const tw = ctx.measureText(lbl).width;
        ctx.fillText(lbl, p.x - tw/2, p.y + 4);
        // tag below
        if (m.tag){
          ctx.fillStyle = isCur ? col : 'rgba(91,138,143,0.6)';
          ctx.font = isCur ? '700 11px JetBrains Mono' : '500 10px JetBrains Mono';
          const tg = m.tag.length > 14 ? m.tag.slice(0,12)+'…' : m.tag;
          const tw2 = ctx.measureText(tg).width;
          ctx.fillText(tg, p.x - tw2/2, p.y + r + 16);
        }
      }

      // sparks at current dot
      const now = performance.now();
      if (now - lastEmit > 80){
        lastEmit = now;
        const p = dotPos(cur);
        const col = tagColor(moves[cur].tag);
        const ang = Math.random()*Math.PI*2;
        const sp = 30 + Math.random()*30;
        particles.push({
          x: p.x, y: p.y, vx: Math.cos(ang)*sp/30, vy: Math.sin(ang)*sp/30,
          color: col, born: now, dur: 800
        });
      }
      particles = particles.filter(pt => {
        const dt = now - pt.born;
        if (dt > pt.dur) return false;
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vx *= 0.96; pt.vy *= 0.96;
        const a = 1 - dt/pt.dur;
        ctx.fillStyle = pt.color; ctx.globalAlpha = a*0.7;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      RAF(loop);
    }
    loop();

    function pickAt(mx, my){
      for (let i=0;i<moves.length;i++){
        const p = dotPos(i);
        if ((mx-p.x)**2 + (my-p.y)**2 < 26*26) return i;
      }
      return -1;
    }
    cvs.addEventListener('mousemove', (e) => {
      const r = cvs.getBoundingClientRect();
      const mx = (e.clientX-r.left)*cvs.width/r.width;
      const my = (e.clientY-r.top)*cvs.height/r.height;
      hoverIdx = pickAt(mx,my);
      cvs.style.cursor = hoverIdx >= 0 ? 'pointer' : 'default';
    });
    cvs.addEventListener('click', (e) => {
      const r = cvs.getBoundingClientRect();
      const mx = (e.clientX-r.left)*cvs.width/r.width;
      const my = (e.clientY-r.top)*cvs.height/r.height;
      const i = pickAt(mx,my);
      if (i >= 0) show(i);
    });

    function show(i){
      const prev = cur;
      cur = Math.max(0, Math.min(moves.length-1, i));
      const m = moves[cur];
      const col = tagBadgeColor(m.tag);
      const direction = cur > prev ? 1 : -1;
      stage.style.opacity = '0';
      stage.style.transform = `translateX(${direction*16}px)`;
      setTimeout(() => {
        stage.innerHTML = `
          <div class="ivx-tag" style="background:${col};">${esc(m.tag||'move')}</div>
          <h3 class="ivx-title">${esc(m.title)}</h3>
          <div class="ivx-body">${m.body}</div>
          ${m.note ? '<div class="ivx-note">'+m.note+'</div>' : ''}
        `;
        stage.style.transform = `translateX(${-direction*8}px)`;
        requestAnimationFrame(() => {
          stage.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          stage.style.opacity = '1';
          stage.style.transform = 'translateX(0)';
        });
      }, 140);
      el.querySelector('[data-c="cur"]').textContent = cur+1;
      el.querySelector('[data-c="tot"]').textContent = moves.length;
      el.querySelector('[data-c="phase"]').textContent = m.tag || '';
      if (cur === moves.length-1) award(el, lessonId, cpId, 'interview');
    }
    el.querySelector('[data-act="prev"]').onclick = () => show(cur-1);
    el.querySelector('[data-act="next"]').onclick = () => show(cur+1);
    show(0);

    function resize(){
      const wrap = el.querySelector('.ivx-canvas-wrap');
      const r = wrap.getBoundingClientRect();
      cvs.width = Math.max(900, r.width*2);
      cvs.height = Math.max(160, r.height*2);
    }
    new ResizeObserver(resize).observe(el.querySelector('.ivx-canvas-wrap'));
    setTimeout(resize, 60);
  }

  // expose
  window.D = window.D || {};
  Object.assign(window.D, {
    StackFlow, CapTriangle, RowColumn, PartitionSim, KafkaTopic,
    Watermark, SnapshotTimeline, BloomFilter, CDCFlow, BackfillDAG, SLAdash, InterviewMove,
    SLADash: SLAdash, SlaDashboard: SLAdash
  });
})();
