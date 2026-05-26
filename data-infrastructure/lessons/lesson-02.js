/* ============================================================
 * Lesson 02 — CAP & PACELC
 * Four hand-crafted SVG diagram-toys.
 * ============================================================ */
(function () {
  const M2 = window.M2 = window.M2 || {};

  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, parent = null) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) {
      if (attrs[k] === undefined || attrs[k] === null) continue;
      el.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(el);
    return el;
  };

  /* ============================================================
   * Fig. 01 — The Partition Theatre
   * Three nodes (A, B, C). Client writes to A. Cable cut isolates A.
   * User picks CP or AP and we show the trade visually.
   * ============================================================ */
  M2.PartitionTheatre = function (root) {
    if (!root) return;
    const $ = (sel) => root.querySelector(sel);

    const state = {
      partitioned: false,
      choice: null,        // 'cp' | 'ap' | null
      versions: { A: 1, B: 1, C: 1 },
    };

    const linkAB = $('#th-l-ab');
    const linkBC = $('#th-l-bc');
    const linkAC = $('#th-l-ac');
    const pdiv   = $('#th-pdiv');
    const pdivLbl= $('#th-pdiv-lbl');

    const verA = $('#th-ver-a');
    const verB = $('#th-ver-b');
    const verC = $('#th-ver-c');

    const ringHost = $('#th-rings');

    const btnCut   = $('#th-btn-cut');
    const btnWrite = $('#th-btn-write');
    const btnReset = $('#th-btn-reset');

    const choices = root.querySelectorAll('.m2-th-choice');
    const readout = $('#th-readout');
    const body    = $('#th-body');
    const sysHost = $('#th-systems');

    const packets = $('#th-packets');
    const ackBadge= $('#th-ack');
    const ackText = $('#th-ack-text');

    function render() {
      // links — under partition, A↔B and A↔C are dead
      linkAB.classList.toggle('broken', state.partitioned);
      linkAC.classList.toggle('broken', state.partitioned);
      linkBC.classList.toggle('broken', false);

      pdiv.style.display    = state.partitioned ? '' : 'none';
      pdivLbl.style.display = state.partitioned ? '' : 'none';

      btnCut.textContent = state.partitioned ? 'Heal cable' : 'Cut cable';

      // version labels
      verA.textContent = 'v' + state.versions.A;
      verB.textContent = 'v' + state.versions.B;
      verC.textContent = 'v' + state.versions.C;

      // active choice
      choices.forEach(c => c.classList.toggle('active', c.dataset.c === state.choice));
      readout.classList.toggle('cp', state.choice === 'cp');
      readout.classList.toggle('ap', state.choice === 'ap');

      // ring overlay
      ringHost.innerHTML = '';
      if (state.partitioned && state.choice) {
        if (state.choice === 'cp') {
          // CP — quorum is the majority side {B, C}; A is shut out.
          // Draw a tight oval around B and C (top-right + bottom).
          const ring = svg('ellipse', {
            cx: 280, cy: 215, rx: 95, ry: 130,
            class: 'ring cp',
            transform: 'rotate(-22 280 215)',
          }, ringHost);
          // dashed shutout around A
          svg('circle', { cx: 130, cy: 110, r: 46,
            class: 'ring partitioned-out' }, ringHost);
          // legend text
          const txt = svg('text', { x: 280, y: 80, 'text-anchor': 'middle' }, ringHost);
          txt.setAttribute('font-family', 'var(--mono)');
          txt.setAttribute('font-size', '10');
          txt.setAttribute('font-weight', '600');
          txt.setAttribute('fill', 'oklch(0.52 0.18 260)');
          txt.textContent = 'quorum {B,C} — A refused';
        } else if (state.choice === 'ap') {
          // AP — both partitions stay live; ring around both, in crimson dashed
          svg('circle', { cx: 130, cy: 110, r: 46, class: 'ring ap' }, ringHost);
          const ring = svg('ellipse', { cx: 280, cy: 215, rx: 95, ry: 130,
            class: 'ring ap',
            transform: 'rotate(-22 280 215)' }, ringHost);
          const txt = svg('text', { x: 230, y: 410, 'text-anchor': 'middle' }, ringHost);
          txt.setAttribute('font-family', 'var(--mono)');
          txt.setAttribute('font-size', '10');
          txt.setAttribute('font-weight', '600');
          txt.setAttribute('fill', 'oklch(0.55 0.20 22)');
          txt.textContent = 'both halves live — versions diverge';
        }
      }

      // copy + system tags
      const text = describe(state);
      body.innerHTML = text.html;
      sysHost.innerHTML = '';
      text.systems.forEach(s => {
        const span = document.createElement('span');
        span.className = 'sys';
        span.textContent = s;
        sysHost.appendChild(span);
      });
    }

    function describe(s) {
      if (!s.partitioned && !s.choice) {
        return {
          html: 'Click <b>Cut cable</b> to introduce a partition between <b>{A}</b> and <b>{B, C}</b>. Then pick the trade-off you\'d live with.',
          systems: []
        };
      }
      if (s.partitioned && !s.choice) {
        return {
          html: '<b>Cable cut.</b> A is on one side; B and C are on the other. The next client write to A — does the system <em>refuse it</em> (CP) or <em>accept it locally</em> (AP)? Pick a side.',
          systems: []
        };
      }
      if (s.choice === 'cp') {
        return {
          html: 'Writes to A <b>fail fast</b> with an error — A can\'t replicate to a quorum, so it refuses. The {B, C} side keeps serving reads at the latest committed version. <b>No replica ever lies.</b> The price: a portion of clients see errors until the cable heals.',
          systems: ['Spanner', 'CockroachDB', 'etcd', 'ZooKeeper', 'HBase']
        };
      }
      if (s.choice === 'ap') {
        return {
          html: 'Both halves <b>keep accepting writes</b>. A bumps to v2 locally; B and C may bump to v2 (or v3) on their side. Reads never error. The price: <b>replicas diverge</b> until merge resolves the conflict — your app may briefly see stale or contradictory values.',
          systems: ['Cassandra', 'DynamoDB', 'Riak', 'Couchbase (AP mode)', 'CRDT-based stores']
        };
      }
      return { html: '', systems: [] };
    }

    function pulsePacket(fromX, fromY, toX, toY, color, dur = 700) {
      return new Promise((resolve) => {
        const c = svg('circle', { cx: fromX, cy: fromY, r: 5, fill: color }, packets);
        const start = performance.now();
        const tick = (t) => {
          const k = Math.min(1, (t - start) / dur);
          const e = 1 - Math.pow(1 - k, 3); // easeOut
          c.setAttribute('cx', fromX + (toX - fromX) * e);
          c.setAttribute('cy', fromY + (toY - fromY) * e);
          if (k < 1) requestAnimationFrame(tick);
          else { c.remove(); resolve(); }
        };
        requestAnimationFrame(tick);
      });
    }

    function showAck(x, y, ok, label) {
      ackBadge.style.display = '';
      ackBadge.setAttribute('transform', `translate(${x - 60} ${y - 36})`);
      ackText.textContent = label;
      ackText.setAttribute('fill', ok ? 'oklch(0.45 0.13 155)' : 'oklch(0.5 0.18 22)');
      const rect = ackBadge.querySelector('rect');
      rect.setAttribute('stroke', ok ? 'oklch(0.45 0.13 155)' : 'oklch(0.5 0.18 22)');
      rect.setAttribute('fill', ok ? 'oklch(0.94 0.05 155)' : 'oklch(0.95 0.05 22)');
      setTimeout(() => { ackBadge.style.display = 'none'; }, 1600);
    }

    async function doWrite() {
      // 1) packet from client → A
      await pulsePacket(60, 380, 130, 110, 'oklch(0.75 0.15 70)', 600);
      state.versions.A += 1;
      render();

      if (!state.partitioned) {
        // healthy: A replicates to B and C in parallel; both ack
        await Promise.all([
          pulsePacket(130, 110, 330, 110, 'oklch(0.75 0.15 70)', 500),
          pulsePacket(130, 110, 230, 320, 'oklch(0.75 0.15 70)', 500),
        ]);
        state.versions.B = state.versions.A;
        state.versions.C = state.versions.A;
        render();
        showAck(60, 380, true, 'commit ok · v' + state.versions.A);
        return;
      }
      // partitioned: depends on choice
      if (state.choice === 'cp') {
        // CP: A refuses (no quorum), revert; show error to client.
        state.versions.A -= 1;
        render();
        await pulsePacket(130, 110, 60, 380, 'oklch(0.55 0.20 22)', 500);
        showAck(60, 380, false, 'refused · no quorum');
      } else if (state.choice === 'ap') {
        // AP: A commits locally only — B/C don't see it until heal
        await pulsePacket(130, 110, 60, 380, 'oklch(0.6 0.14 155)', 400);
        showAck(60, 380, true, 'local ack · v' + state.versions.A);
      } else {
        // No choice yet — animation has happened locally; reset version
        state.versions.A -= 1;
        render();
        await pulsePacket(130, 110, 60, 380, 'oklch(0.5 0.02 250)', 400);
        showAck(60, 380, false, 'pick CP or AP');
      }
    }

    btnCut.addEventListener('click', () => {
      state.partitioned = !state.partitioned;
      if (!state.partitioned) {
        // heal: catch up B and C to A's version
        const max = Math.max(state.versions.A, state.versions.B, state.versions.C);
        state.versions.A = state.versions.B = state.versions.C = max;
      }
      render();
    });
    btnWrite.addEventListener('click', () => {
      btnWrite.disabled = true;
      doWrite().finally(() => { btnWrite.disabled = false; });
    });
    btnReset.addEventListener('click', () => {
      state.partitioned = false;
      state.choice = null;
      state.versions = { A: 1, B: 1, C: 1 };
      render();
    });
    choices.forEach(c => c.addEventListener('click', () => {
      state.choice = c.dataset.c;
      // auto-cut for the user if they haven't yet
      if (!state.partitioned) state.partitioned = true;
      render();
    }));

    render();
  };

  /* ============================================================
   * Fig. 02 — The PACELC Compass
   * 2D plane: x = latency↔consistency (else); y = avail↔consistency (P)
   * Click a quadrant or a system dot to update the side card.
   * ============================================================ */
  M2.PacelcCompass = function (root) {
    if (!root) return;
    const svgEl  = root.querySelector('#pc-svg');
    const card   = root.querySelector('#pc-card');
    const nameEl = root.querySelector('#pc-name');
    const descEl = root.querySelector('#pc-desc');
    const tagsEl = root.querySelector('#pc-tags');
    const pEl    = root.querySelector('#pc-p');
    const eEl    = root.querySelector('#pc-e');
    const dotsHost = root.querySelector('#pc-dots');
    const quadRects = root.querySelectorAll('.quad-rect');

    // Quadrant info
    const QUAD = {
      paec: {
        name: 'PA / EC',
        desc: '<b>Consistent in normal life, available under partition.</b> The popular default for user-state stores: writes are linearizable when the network is healthy, but if a region splits off, the system keeps accepting writes there and merges later. You trade some staleness for resilience.',
        tags: ['MongoDB (default)', 'Couchbase', 'YugabyteDB (some modes)'],
        p: 'availability', e: 'consistency'
      },
      pcec: {
        name: 'PC / EC',
        desc: '<b>Strict consistency always.</b> No write proceeds without a quorum. Reads tell the truth, on a good day or a bad one. The price is paid in latency — every write is a coordinated round-trip. The platonic ideal of an OLTP database.',
        tags: ['Spanner', 'CockroachDB', 'FoundationDB', 'etcd', 'ZooKeeper'],
        p: 'consistency', e: 'consistency'
      },
      pael: {
        name: 'PA / EL',
        desc: '<b>Always fast, eventually correct.</b> Both regimes prioritize availability and low latency. Reads come from the nearest replica without coordination. Useful for shopping carts, social feeds, telemetry — anywhere staleness is annoying but not catastrophic.',
        tags: ['Cassandra', 'DynamoDB (default)', 'Riak', 'Voldemort'],
        p: 'availability', e: 'latency'
      },
      pcel: {
        name: 'PC / EL',
        desc: '<b>Strict under partition, fast otherwise.</b> An unusual combination — the system blocks writes when the network is unhealthy, but skips coordination on the read path during normal operation. Mostly academic; some configurations of MongoDB approximate it.',
        tags: ['MongoDB (rare config)', 'Theory'],
        p: 'consistency', e: 'latency'
      },
    };

    // Plot real systems on the 2D plane.
    // x: 40..420  (left = low latency, right = strong consistency)
    // y: 40..420  (top = availability, bottom = consistency)
    const SYSTEMS = [
      { id: 'spanner', name: 'Spanner',     x: 360, y: 360, fill: 'oklch(0.62 0.16 258)', q: 'pcec' },
      { id: 'crdb',    name: 'CockroachDB', x: 340, y: 340, fill: 'oklch(0.55 0.18 260)', q: 'pcec' },
      { id: 'etcd',    name: 'etcd',        x: 380, y: 320, fill: 'oklch(0.5 0.16 260)',  q: 'pcec' },
      { id: 'mongo',   name: 'MongoDB',     x: 280, y: 130, fill: 'oklch(0.62 0.16 258)', q: 'paec' },
      { id: 'couch',   name: 'Couchbase',   x: 260, y: 110, fill: 'oklch(0.58 0.16 260)', q: 'paec' },
      { id: 'dynamo',  name: 'DynamoDB',    x: 110, y: 110, fill: 'oklch(0.55 0.20 22)',  q: 'pael' },
      { id: 'cass',    name: 'Cassandra',   x: 130, y: 90,  fill: 'oklch(0.6 0.18 22)',   q: 'pael' },
      { id: 'riak',    name: 'Riak',        x: 90,  y: 140, fill: 'oklch(0.65 0.18 22)',  q: 'pael' },
      { id: 'pg',      name: 'Postgres·HA', x: 320, y: 300, fill: 'oklch(0.55 0.18 260)', q: 'pcec' },
      { id: 'redis',   name: 'Redis Cluster', x: 100, y: 80, fill: 'oklch(0.55 0.20 22)', q: 'pael' },
    ];

    SYSTEMS.forEach(s => {
      const g = svg('g', { class: 'system-dot', transform: `translate(${s.x} ${s.y})` }, dotsHost);
      svg('circle', { r: 7, fill: s.fill }, g);
      // Labels render on the side that has more room: dots in the right half
      // (x > 270, the column halfway through the right quadrants) get a label
      // anchored to the right of the text, drawn on the left of the dot, so
      // the name stays inside the 40..420 plot frame regardless of dot x.
      const onRight = s.x > 270;
      const t = svg('text', {
        x: onRight ? -12 : 12,
        y: 4,
        'text-anchor': onRight ? 'end' : 'start',
      }, g);
      t.textContent = s.name;
      g.addEventListener('click', () => setQuad(s.q));
      g.addEventListener('mouseenter', () => {
        g.querySelector('circle').setAttribute('r', 9);
      });
      g.addEventListener('mouseleave', () => {
        g.querySelector('circle').setAttribute('r', 7);
      });
    });

    quadRects.forEach(r => {
      r.addEventListener('mouseenter', () => r.classList.add('hot'));
      r.addEventListener('mouseleave', () => r.classList.remove('hot'));
      r.addEventListener('click', () => setQuad(r.dataset.q));
    });

    function setQuad(q) {
      const Q = QUAD[q];
      if (!Q) return;
      card.dataset.q = q;
      // animate name change
      nameEl.style.opacity = 0;
      descEl.style.opacity = 0;
      requestAnimationFrame(() => {
        nameEl.innerHTML = Q.name.replace('/', '<span class="slash">/</span>');
        descEl.innerHTML = Q.desc;
        pEl.textContent = Q.p;
        eEl.textContent = Q.e;
        tagsEl.innerHTML = '';
        Q.tags.forEach(t => {
          const span = document.createElement('span');
          span.className = 't';
          span.textContent = t;
          tagsEl.appendChild(span);
        });
        nameEl.style.transition = 'opacity .25s';
        descEl.style.transition = 'opacity .25s';
        nameEl.style.opacity = 1;
        descEl.style.opacity = 1;
      });
    }

    setQuad('paec');
  };

  /* ============================================================
   * Fig. 03 — The Latency-Tax Frontier
   * Pareto curve of freshness vs. p99 latency. Drag a marker.
   * ============================================================ */
  M2.LatencyTax = function (root) {
    if (!root) return;
    const svgEl   = root.querySelector('#lt-svg');
    const curve   = root.querySelector('#lt-curve');
    const fill    = root.querySelector('#lt-fill');
    const stamps  = root.querySelector('#lt-stamps');
    const marker  = root.querySelector('#lt-marker');
    const vline   = root.querySelector('#lt-vline');
    const nameEl  = root.querySelector('#lt-name');
    const descEl  = root.querySelector('#lt-desc');
    const msEl    = root.querySelector('#lt-ms');
    const costEl  = root.querySelector('#lt-cost');
    const scopeEl = root.querySelector('#lt-scope');
    const scopeDescEl = root.querySelector('#lt-scope-desc');
    const presets = root.querySelectorAll('#lt-presets button');

    // x maps from 60..500 along five labeled levels:
    //  60 none, 170 eventual, 280 ryw, 390 causal, 500 linearizable
    // y is p99 ms, plotted with axis range 0..300 mapped to 300..60
    // We model ms = piecewise smooth: rises gently 60→280, then steeply 280→500
    function ms(x) {
      // anchors:
      // x=60 ms~1; x=170 ms~5; x=280 ms~10; x=390 ms~40; x=500 ms~250
      const anchors = [[60,1],[170,5],[280,10],[390,40],[500,250]];
      for (let i = 0; i < anchors.length - 1; i++) {
        const [x0, y0] = anchors[i], [x1, y1] = anchors[i+1];
        if (x >= x0 && x <= x1) {
          const t = (x - x0) / (x1 - x0);
          // smoothstep
          const s = t * t * (3 - 2 * t);
          return y0 + (y1 - y0) * s;
        }
      }
      return 250;
    }
    function yPx(msVal) {
      // y axis: ms 0→300 mapped to px 300→60 (height 240)
      // log-ish scale: piecewise linear with anchors
      // ms 0→y=300; 25→240; 75→180; 150→120; 300→60
      const anchors = [[0,300],[25,240],[75,180],[150,120],[300,60]];
      for (let i = 0; i < anchors.length - 1; i++) {
        const [m0, p0] = anchors[i], [m1, p1] = anchors[i+1];
        if (msVal >= m0 && msVal <= m1) {
          const t = (msVal - m0) / (m1 - m0);
          return p0 + (p1 - p0) * t;
        }
      }
      return 60;
    }

    // Build the curve path
    let d = '';
    let dFill = '';
    const pts = [];
    for (let x = 60; x <= 500; x += 4) {
      const y = yPx(ms(x));
      pts.push([x, y]);
    }
    pts.forEach(([x, y], i) => { d += (i === 0 ? 'M' : 'L') + x + ' ' + y + ' '; });
    // fill: curve down to baseline
    dFill = d + ' L 500 300 L 60 300 Z';
    curve.setAttribute('d', d);
    fill.setAttribute('d', dFill);

    // Labelled stamps along the curve
    const STAMPS = [
      { x: 60,  name: 'none',        offY: -14 },
      { x: 170, name: 'eventual',    offY: -14 },
      { x: 280, name: 'read-your-writes', offY: -16 },
      { x: 390, name: 'causal',      offY: -16 },
      { x: 500, name: 'linearizable',offY: -18 },
    ];
    STAMPS.forEach(s => {
      const y = yPx(ms(s.x));
      svg('circle', { cx: s.x, cy: y, r: 4, class: 'stamp-dot' }, stamps);
    });

    // Levels metadata
    const LEVELS = {
      60:  { name: 'no guarantee', desc: 'A read returns whatever the local replica has, including writes that may never have committed elsewhere. Useful for caches and monitoring counters; a footgun for anything user-facing.', cost: 'Free. Single-node, no coordination, no session.', scope: 'no contract', scopeDesc: 'No promises. Use only where wrongness is recoverable or invisible.' },
      170: { name: 'eventual',     desc: 'If writes stop, all replicas converge — eventually. Says nothing about <em>when</em>. Typical convergence is milliseconds; tail can stretch to minutes under load. Pair with read-your-writes for UX.', cost: 'Cheap. Local reads, async replication, periodic anti-entropy.', scope: 'multi-region', scopeDesc: 'Designed for this. Each region serves locally; gossip catches up the rest.' },
      280: { name: 'read-your-writes', desc: 'A client always sees its own most recent write. Other clients may see staler data. Implemented with sticky sessions or version pinning.', cost: 'Cheap. Local-replica read with a session token check.', scope: 'single region', scopeDesc: 'Stays inside one region\'s failure domain. No WAN coordination on the read path.' },
      390: { name: 'causal',       desc: 'If event A happens-before B, every observer sees A first. Concurrent events may be observed in either order. The strongest guarantee that doesn\'t require a global clock.', cost: 'Moderate. Vector clocks or Lamport timestamps; per-key dependency tracking.', scope: 'single region', scopeDesc: 'Workable cross-region with propagation delay; rarely deployed beyond one region for OLTP.' },
      500: { name: 'linearizable', desc: 'Every read returns a value at-least-as-fresh as any acknowledged write — globally, in real time. The strongest guarantee. The most expensive.', cost: 'Expensive. Quorum write + quorum read on every operation.', scope: 'cross-region quorum', scopeDesc: 'Wide-area RTT every read or write. Plan for 50–150 ms p99 in a 3-region cluster.' },
    };

    function snap(x) {
      // snap to nearest preset
      const xs = [60, 170, 280, 390, 500];
      let best = xs[0], bestD = Infinity;
      xs.forEach(p => { const d = Math.abs(p - x); if (d < bestD) { bestD = d; best = p; }});
      return best;
    }

    let currentX = 280;
    function setX(x, animate = true) {
      x = Math.max(60, Math.min(500, x));
      const snapped = snap(x);
      currentX = snapped;
      const y = yPx(ms(snapped));
      if (animate) {
        marker.style.transition = 'transform .35s cubic-bezier(.25,.7,.25,1)';
        vline.style.transition = 'transform .35s cubic-bezier(.25,.7,.25,1)';
      } else {
        marker.style.transition = '';
        vline.style.transition = '';
      }
      marker.setAttribute('transform', `translate(${snapped} ${y})`);
      vline.setAttribute('x1', snapped); vline.setAttribute('x2', snapped);
      vline.setAttribute('y1', y); vline.setAttribute('y2', 300);

      const L = LEVELS[snapped];
      nameEl.textContent = L.name;
      descEl.innerHTML   = L.desc;
      msEl.textContent   = Math.round(ms(snapped));
      costEl.textContent = L.cost;
      scopeEl.textContent = L.scope;
      scopeDescEl.textContent = L.scopeDesc;

      presets.forEach(b => b.classList.toggle('active', +b.dataset.x === snapped));
    }

    presets.forEach(b => b.addEventListener('click', () => setX(+b.dataset.x)));

    // drag
    let dragging = false;
    function svgX(evt) {
      const rect = svgEl.getBoundingClientRect();
      const px = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left;
      // viewBox 540 wide rendered at rect.width
      return (px / rect.width) * 540;
    }
    svgEl.addEventListener('mousedown', (e) => { dragging = true; setX(svgX(e), false); e.preventDefault(); });
    window.addEventListener('mousemove', (e) => { if (dragging) setX(svgX(e), false); });
    window.addEventListener('mouseup', () => { if (dragging) { dragging = false; setX(currentX, true); }});
    svgEl.addEventListener('touchstart', (e) => { dragging = true; setX(svgX(e), false); }, { passive: true });
    svgEl.addEventListener('touchmove', (e) => { if (dragging) setX(svgX(e), false); }, { passive: true });
    svgEl.addEventListener('touchend', () => { if (dragging) { dragging = false; setX(currentX, true); }});

    setX(280, false);
  };

  /* ============================================================
   * Fig. 04 — The Consistency Staircase
   * Five rows, one shared race (write x=1, write x=2, read x).
   * Each row's mini SVG shows what its level allows the reader to see.
   * ============================================================ */
  M2.ConsistencyStair = function (root) {
    if (!root) return;
    const stage = root.querySelector('#cs-stage');

    const ROWS = [
      {
        num: '01',
        name: 'Linearizable',
        strength: 'strongest · per-key real-time',
        cost: { pill: 'hi', text: 'high', detail: 'cross-region RTT, often 50–150 ms' },
        anim: 'lin',
        desc: '<b>Real-time global order.</b> Once any client sees <code>x=2</code>, every other client must see <code>x=2</code> or later, immediately. Implementing this means coordinating on every read — a quorum across regions. Spanner achieves it with TrueTime + Paxos; CockroachDB with HLC + Raft.'
      },
      {
        num: '02',
        name: 'Sequential',
        strength: 'agreed order · not real-time',
        cost: { pill: 'mid', text: 'medium', detail: 'coordinator, usually same-region quorum' },
        anim: 'seq',
        desc: '<b>All clients see writes in <em>some</em> order, agreed upon — but not necessarily the wall-clock order.</b> Strong enough for most app logic, cheaper than linearizable because you don\'t need a global clock. Realised via single-leader replication.'
      },
      {
        num: '03',
        name: 'Causal',
        strength: 'happens-before respected',
        cost: { pill: 'mid', text: 'medium', detail: 'vector clocks, version metadata' },
        anim: 'cau',
        desc: '<b>If write A causally precedes write B, every observer sees A before B.</b> Concurrent (independent) writes may be observed in either order. The strongest guarantee that doesn\'t need a global clock. Used in collaborative editing (CRDTs) and threaded discussions.'
      },
      {
        num: '04',
        name: 'Read-your-writes',
        strength: 'session-scoped',
        cost: { pill: 'lo', text: 'low', detail: 'sticky sessions, version pinning' },
        anim: 'ryw',
        desc: '<b>A client always sees its own most recent write.</b> Other clients may see stale data. The cheapest way to keep UX coherent ("user just hit save and sees their change") on top of an otherwise eventually-consistent store. Implementation: route the user back to the same replica, or pin a version token.'
      },
      {
        num: '05',
        name: 'Eventual',
        strength: 'convergence guarantee only',
        cost: { pill: 'lo', text: 'low', detail: 'async replication; gossip' },
        anim: 'eve',
        desc: '<b>If writes stop, replicas converge eventually.</b> The contract says nothing about how long. In practice convergence is milliseconds; in pathological cases (hot keys, cross-region, partitions) it can stretch to seconds or minutes. Always ask <em>"how long is eventual?"</em>'
      },
    ];

    // Build rows
    ROWS.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'm2-cs-row';
      row.dataset.idx = i;
      row.innerHTML = `
        <div class="m2-cs-rank">
          <div class="num">${r.num}</div>
          <div class="name">${r.name}</div>
          <div class="strength">${r.strength}</div>
        </div>
        <div class="m2-cs-anim" data-anim="${r.anim}">
          <svg viewBox="0 0 360 110" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="m2-cs-arrow-${r.anim}" viewBox="0 0 10 10" refX="9" refY="5"
                      markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.5 0.02 250)"/>
              </marker>
            </defs>
            ${csSvgFor(r.anim)}
          </svg>
        </div>
        <div class="m2-cs-cost">
          <span class="pill ${r.cost.pill}">cost · ${r.cost.text}</span>
          <span class="cost-sub">${r.cost.detail}</span>
        </div>
      `;
      stage.appendChild(row);

      const detail = document.createElement('div');
      detail.className = 'm2-cs-detail';
      detail.innerHTML = `<div class="body">${r.desc}</div>`;
      stage.appendChild(detail);

      row.addEventListener('click', () => {
        const open = row.classList.toggle('open');
        // close siblings
        stage.querySelectorAll('.m2-cs-row').forEach(other => {
          if (other !== row) other.classList.remove('open');
        });
      });
    });

    // mini-svg per anim type
    function csSvgFor(kind) {
      // Common: two lanes
      const baseLanes = `
        <text class="lane-label" x="6" y="22">A·writer</text>
        <text class="lane-label" x="6" y="84">B·reader</text>
        <line class="lane" x1="80" y1="22" x2="350" y2="22"/>
        <line class="lane" x1="80" y1="84" x2="350" y2="84"/>
      `;
      // Writes: A writes x=1 at t1, x=2 at t2
      const writes = `
        <circle class="write" cx="120" cy="22" r="9"/>
        <text class="event-text" x="120" y="22">1</text>
        <circle class="write" cx="200" cy="22" r="9"/>
        <text class="event-text" x="200" y="22">2</text>
      `;

      switch (kind) {
        case 'lin': // both reads see fresh value
          return baseLanes + writes + `
            <circle class="read-ok" cx="160" cy="84" r="9"/>
            <text class="event-text" x="160" y="84">1</text>
            <circle class="read-ok" cx="240" cy="84" r="9"/>
            <text class="event-text" x="240" y="84">2</text>
            <circle class="read-ok" cx="310" cy="84" r="9"/>
            <text class="event-text" x="310" y="84">2</text>
            <path class="arrow" d="M 120 30 Q 140 60 160 76" marker-end="url(#m2-cs-arrow-lin)"/>
            <path class="arrow" d="M 200 30 Q 220 60 240 76" marker-end="url(#m2-cs-arrow-lin)"/>
          `;
        case 'seq': // ordered, not real-time
          return baseLanes + writes + `
            <circle class="read-ok" cx="180" cy="84" r="9"/>
            <text class="event-text" x="180" y="84">1</text>
            <circle class="read-ok" cx="260" cy="84" r="9"/>
            <text class="event-text" x="260" y="84">2</text>
            <text class="event-stale-text" x="310" y="100">order respected, may lag</text>
          `;
        case 'cau': // independent ops can flip
          return baseLanes + `
            <text class="lane-label" x="6" y="50">C·writer</text>
            <line class="lane" x1="80" y1="50" x2="350" y2="50"/>
            <circle class="write" cx="120" cy="22" r="9"/>
            <text class="event-text" x="120" y="22">x=1</text>
            <circle class="write" cx="160" cy="50" r="9" style="fill:oklch(0.55 0.20 22)"/>
            <text class="event-text" x="160" y="50">y=2</text>
            <path class="arrow" d="M 130 22 Q 145 38 158 48" marker-end="url(#m2-cs-arrow-cau)"/>
            <circle class="read-ok" cx="240" cy="84" r="9"/>
            <text class="event-text" x="240" y="84">x=1</text>
            <circle class="read-ok" cx="280" cy="84" r="9"/>
            <text class="event-text" x="280" y="84">y=2</text>
            <text class="event-stale-text" x="320" y="100">if x→y, x first</text>
          `;
        case 'ryw': // own writes always visible; other readers can lag
          return baseLanes + writes + `
            <circle class="read-ok" cx="240" cy="84" r="9"/>
            <text class="event-text" x="240" y="84">2</text>
            <text class="event-stale-text" x="310" y="100">A's session always fresh</text>
            <circle class="read-stale" cx="310" cy="84" r="9" opacity="0.6"/>
            <text class="event-text" x="310" y="84">1</text>
          `;
        case 'eve': // staleness allowed
          return baseLanes + writes + `
            <circle class="read-stale" cx="160" cy="84" r="9"/>
            <text class="event-text" x="160" y="84">∅</text>
            <circle class="read-stale" cx="240" cy="84" r="9"/>
            <text class="event-text" x="240" y="84">1</text>
            <circle class="read-ok" cx="320" cy="84" r="9"/>
            <text class="event-text" x="320" y="84">2</text>
            <text class="event-stale-text" x="200" y="100">replicas converge later</text>
          `;
      }
      return baseLanes;
    }
  };

})();
