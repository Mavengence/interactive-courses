/* global React, Hero, SectionLabel, Takeaway, MMNames */
const { useState, useEffect, useRef } = React;

/* ============================================================
 * Ch10 · Capstone — The Living Pipeline
 *
 * dim_users, animated end-to-end. Rows (signup events) stream
 * from source, through six contracts, out to the analyst.
 *
 *   SOURCE  →  [1 MERGE]  →  [2 WRITE]  →  [3 WATERMARK]
 *           →  [4 DQ]  →  [5 GOVERN]  →  [6 SEMANTIC]  →  ANALYST
 *
 * Every contract is a live gate. Break any of them (sabotage)
 * and see exactly what fails downstream:
 *
 *   Break MERGE      → LEFT JOIN drops churned users
 *   Break WRITE      → INSERT INTO → retries double-count
 *   Break WATERMARK  → late rows silently dropped
 *   Break DQ         → signal never lands, downstream blocks
 *   Break GOVERN     → Access Gateway rejects deploy
 *   Break SEMANTIC   → downstream queries hit an unbound column
 *
 * One sim. Six knobs. Zero explanation wall.
 * ============================================================ */

const STAGES = [
  { k: 'merge',     n: '01', ref: 'Ch03 · Store',       title: 'Cumulative merge',    sub: 'FULL OUTER JOIN yesterday ⊕ today',          color: '#7C5CFF' },
  { k: 'write',     n: '02', ref: 'Ch05 · Orchestrate', title: 'Idempotent write',    sub: 'INSERT OVERWRITE partition ds',              color: '#2D7DFF' },
  { k: 'watermark', n: '03', ref: 'Ch02 · Streaming',   title: 'Watermark + dedup',   sub: 'ROW_NUMBER · event_ts ≥ ds',                 color: '#22D3EE' },
  { k: 'dq',        n: '04', ref: 'Ch06 · Quality',     title: 'Data-quality gate',   sub: 'row-count · freshness · unique',             color: '#31A24C' },
  { k: 'govern',    n: '05', ref: 'Ch09 · Govern',      title: 'Access Gateway deploy',   sub: 'PII actors · data_classification',                   color: '#B8770A' },
  { k: 'semantic',  n: '06', ref: 'Ch08 · Serve',       title: 'Semantic binding',    sub: 'metric → physical column',                   color: '#E41E3F' },
];

// user "row" shape — 1,421,882 real rows, we'll animate ~22 representative ones
const USER_POOL = [
  // active — normal flow
  { id: 'a1', kind: 'paid',    user_id: 'u-A41',  owner: 'alice@example.com',    sev: 2, late: false, dup: false },
  { id: 'a2', kind: 'paid',    user_id: 'u-B12',  owner: 'bob@example.com',      sev: 4, late: false, dup: false },
  { id: 'a3', kind: 'paid',    user_id: 'u-C77',  owner: 'carol@example.com',    sev: 1, late: false, dup: false },
  { id: 'a4', kind: 'paid',    user_id: 'u-D02',  owner: 'dan@example.com',      sev: 3, late: false, dup: false },
  { id: 'a5', kind: 'paid',    user_id: 'u-E19',  owner: 'eve@example.com',      sev: 2, late: false, dup: false },
  { id: 'a6', kind: 'paid',    user_id: 'u-F88',  owner: 'frank@example.com',    sev: 5, late: false, dup: false },
  { id: 'a7', kind: 'paid',    user_id: 'u-G33',  owner: 'grace@example.com',    sev: 2, late: false, dup: false },
  { id: 'a8', kind: 'paid',    user_id: 'u-H21',  owner: 'henry@example.com',    sev: 1, late: false, dup: false },
  { id: 'a9', kind: 'paid',    user_id: 'u-J40',  owner: 'iris@example.com',     sev: 4, late: false, dup: false },
  // churned (yesterday-only) — dropped by LEFT JOIN if merge broken
  { id: 'r1', kind: 'churned',  user_id: 'u-xX01',  owner: 'inactive@example.com',  sev: 0, late: false, dup: false },
  { id: 'r2', kind: 'churned',  user_id: 'u-xX02',  owner: 'inactive@example.com',  sev: 0, late: false, dup: false },
  // new (today-only) — always flow
  { id: 'n1', kind: 'new',      user_id: 'u-nN01',  owner: 'jack@example.com',    sev: 3, late: false, dup: false },
  { id: 'n2', kind: 'new',      user_id: 'u-nN02',  owner: 'kate@example.com',    sev: 1, late: false, dup: false },
  // late — watermark should spill these
  { id: 'l1', kind: 'late',     user_id: 'u-nL77',  owner: 'leo@example.com',     sev: 2, late: true,  dup: false },
  { id: 'l2', kind: 'late',     user_id: 'u-nL78',  owner: 'mia@example.com',     sev: 3, late: true,  dup: false },
  // duplicate — dedup should drop these
  { id: 'd1', kind: 'dup',      user_id: 'u-nA41',  owner: 'alice@example.com',   sev: 2, late: false, dup: true  }, // dupe of a1
];

// rolling conveyor: how long from source → analyst in sim-seconds
const LANE_SECONDS = 9;
const SPAWN_EVERY  = 0.55; // sim-seconds between row spawns

// x positions (0–100%) for each stage gate along the conveyor
const GATE_X = { source: 2, merge: 16, write: 30, watermark: 44, dq: 58, govern: 72, semantic: 86, analyst: 98 };

// Guided tutorial — auto-walks through breaking each contract.
// Each step holds for ~6.5s so the visual consequence has time to land.
const TUTORIAL = [
  { stage: null,        title: 'Pipeline running clean',          caption: 'All six contracts hold. Rows flow source → analyst, every one arrives.' },
  { stage: 'merge',     title: 'Break the MERGE contract',        caption: 'LEFT JOIN drops yesterday-only users. Watch the churned (×) rows vanish at gate 1.' },
  { stage: 'write',     title: 'Break the WRITE contract',        caption: 'INSERT (non-idempotent) doubles rows on retry. Phantom duplicates appear after gate 2.' },
  { stage: 'watermark', title: 'Break the WATERMARK contract',    caption: 'Late rows pass through silently instead of spilling to the side table: bad data lands.' },
  { stage: 'dq',        title: 'Break the DQ contract',           caption: 'Quality checks miss the bad batch. Rows halt; signal never fires; downstream blocked.' },
  { stage: 'govern',    title: 'Break the GOVERN contract',       caption: 'Access Gateway rejects the deploy. Rows blocked at gate 5: nothing reaches the analyst.' },
  { stage: 'semantic',  title: 'Break the SEMANTIC contract',     caption: 'Metric layer broken. Rows arrive but the downstream query references an unbound column: wrong answer.' },
  { stage: null,        title: 'All contracts restored',          caption: 'Pipeline back to clean. The lesson: every gate is load-bearing.' },
];
const TUTORIAL_STEP_MS = 6500;
const EMPTY_BRK = { merge: false, write: false, watermark: false, dq: false, govern: false, semantic: false };

function LivingPipeline({ internalMode, reduceMotion }) {
  const N = MMNames(internalMode);

  // sabotage toggles
  const [brk, setBrk] = useState(EMPTY_BRK);
  const [running, setRunning] = useState(true);
  const toggleBreak = (k) => setBrk(b => ({ ...b, [k]: !b[k] }));
  const resetAll = () => setBrk({ ...EMPTY_BRK });

  // Tutorial mode — guided walk through every contract
  const [tutorialStep, setTutorialStep] = useState(-1);
  const tutorial = tutorialStep >= 0 ? TUTORIAL[tutorialStep] : null;
  const startTutorial = () => { setBrk({ ...EMPTY_BRK }); setRunning(true); setTutorialStep(0); };
  const stopTutorial  = () => { setTutorialStep(-1); setBrk({ ...EMPTY_BRK }); };

  // sim state
  const rows = useRef([]);           // {id, key, t:0..1 along lane, asset, state, stage, bornMs}
  const idSeq = useRef(0);
  const tSim = useRef(0);
  const spawnBank = useRef(0);
  const rafRef = useRef(null);

  // stats (React state, throttled)
  const [stats, setStats] = useState({
    srcScanned: 0, merged: 0, dropped: 0,
    written: 0, dup: 0,
    lateSpilled: 0, onTime: 0,
    dqFails: 0, dqPass: 0,
    govPass: 0, govBlocked: 0,
    semHit: 0, semMiss: 0,
    analystAnswered: 0,
  });
  const statsRef = useRef(stats);
  statsRef.current = stats;

  // signal indicator — pulses each time a run of rows finishes cleanly
  const [signalPulse, setSignalPulse] = useState(0);

  // imperative render target
  const rowLayerRef = useRef(null);
  const spillLayerRef = useRef(null);

  const reset = () => {
    rows.current = [];
    tSim.current = 0;
    spawnBank.current = 0;
    idSeq.current = 0;
    setStats({
      srcScanned: 0, merged: 0, dropped: 0,
      written: 0, dup: 0,
      lateSpilled: 0, onTime: 0,
      dqFails: 0, dqPass: 0,
      govPass: 0, govBlocked: 0,
      semHit: 0, semMiss: 0,
      analystAnswered: 0,
    });
    if (rowLayerRef.current) rowLayerRef.current.innerHTML = '';
    if (spillLayerRef.current) spillLayerRef.current.innerHTML = '';
  };

  // ---- the sim ----
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let statBank = 0;

    const tick = (now) => {
      const dtMs = Math.min(64, now - last);
      last = now;
      const dt = dtMs / 1000;
      tSim.current += dt;

      // spawn a row every SPAWN_EVERY seconds
      spawnBank.current += dt;
      while (spawnBank.current >= SPAWN_EVERY) {
        spawnBank.current -= SPAWN_EVERY;
        const user = USER_POOL[Math.floor(Math.random() * USER_POOL.length)];
        rows.current.push({
          id: ++idSeq.current,
          key: `${user.id}-${idSeq.current}`,
          user,
          t: 0,              // 0 at source, 1 at analyst
          lane: 0.35 + Math.random() * 0.35, // vertical lane within the main conveyor (0..1 of lane height)
          state: 'flowing',  // flowing | spilled | dropped | answered
          spilled: null,     // {y, yTarget, born}
          dq_failed_reason: null,
        });
      }

      // advance rows
      const speed = 1 / LANE_SECONDS; // t per second
      const newStats = { ...statsRef.current };
      let statsDirty = false;

      rows.current.forEach(r => {
        if (r.state !== 'flowing') return;

        const prevT = r.t;
        r.t = Math.min(1.01, r.t + dt * speed);

        const prevX = tToX(prevT);
        const x = tToX(r.t);

        // check gate crossings — in order

        // source scan (at x=GATE_X.source)
        if (prevX < GATE_X.source && x >= GATE_X.source) {
          newStats.srcScanned++; statsDirty = true;
        }

        // MERGE gate
        if (prevX < GATE_X.merge && x >= GATE_X.merge) {
          // If merge broken (LEFT JOIN), churned users are dropped
          if (brk.merge && r.user.kind === 'churned') {
            r.state = 'dropped';
            r.dropStage = 'merge';
            r.dropT = tSim.current;
            newStats.dropped++; statsDirty = true;
            return;
          }
          newStats.merged++; statsDirty = true;
        }

        // WRITE gate (idempotency) — if broken, every row counts double occasionally
        if (prevX < GATE_X.write && x >= GATE_X.write) {
          newStats.written++;
          if (brk.write && Math.random() < 0.32) {
            // Simulate retry double-count: emit a phantom duplicate behind
            rows.current.push({
              id: ++idSeq.current,
              key: `phantom-${idSeq.current}`,
              user: r.user,
              t: r.t - 0.015,
              lane: r.lane + 0.08,
              state: 'flowing',
              phantom: true,
            });
            newStats.dup++;
          }
          statsDirty = true;
        }

        // WATERMARK gate
        if (prevX < GATE_X.watermark && x >= GATE_X.watermark) {
          if (r.user.late && !brk.watermark) {
            // watermark ON: spill to side-table (correct behaviour)
            r.state = 'spilled';
            r.spilled = { born: tSim.current, yTarget: 0.92 };
            newStats.lateSpilled++; statsDirty = true;
            return;
          }
          if (r.user.dup && !brk.watermark) {
            // dedup killed it
            r.state = 'dropped';
            r.dropStage = 'dedup';
            r.dropT = tSim.current;
            newStats.dup++;
            statsDirty = true;
            return;
          }
          // if broken: late & dup both pass through silently (bad!)
          if (brk.watermark && (r.user.late || r.user.dup)) {
            r.silentlyBad = true;
          }
          newStats.onTime++; statsDirty = true;
        }

        // DQ gate — if any DQ breakage, BLOCK a % of rows from continuing
        if (prevX < GATE_X.dq && x >= GATE_X.dq) {
          if (brk.dq) {
            // DQ fail: row halts here, signal won't fire, everything stops at DQ
            r.state = 'dqhold';
            r.dqHeldAt = tSim.current;
            newStats.dqFails++; statsDirty = true;
            return;
          }
          newStats.dqPass++; statsDirty = true;
        }

        // GOVERN gate — if broken, row blocked by Access Gateway
        if (prevX < GATE_X.govern && x >= GATE_X.govern) {
          if (brk.govern) {
            r.state = 'govblocked';
            r.govAt = tSim.current;
            newStats.govBlocked++; statsDirty = true;
            return;
          }
          newStats.govPass++; statsDirty = true;
        }

        // SEMANTIC gate — if broken, mark row as referencing an unbound column (red tint)
        if (prevX < GATE_X.semantic && x >= GATE_X.semantic) {
          if (brk.semantic) { r.halluc = true; newStats.semMiss++; }
          else { newStats.semHit++; }
          statsDirty = true;
        }

        // ANALYST arrived
        if (r.t >= 1 && r.state === 'flowing') {
          r.state = 'arrived';
          r.arrivedAt = tSim.current;
          if (!r.halluc && !r.phantom) newStats.analystAnswered++;
          statsDirty = true;
        }
      });

      // clean up finished rows
      rows.current = rows.current.filter(r => {
        if (r.state === 'arrived') return tSim.current - r.arrivedAt < 0.8;
        if (r.state === 'dropped') return tSim.current - r.dropT < 0.6;
        if (r.state === 'govblocked') return tSim.current - r.govAt < 1.1;
        if (r.state === 'dqhold') return tSim.current - r.dqHeldAt < 1.4;
        if (r.state === 'spilled') return tSim.current - r.spilled.born < 1.5;
        return true;
      });

      // render
      paintRows();

      // throttled stats flush
      statBank += dt;
      if (statBank > 0.12 && statsDirty) {
        statBank = 0;
        setStats(newStats);
        statsRef.current = newStats;
      } else if (statsDirty) {
        // even without flush, keep ref current for next frame
        statsRef.current = newStats;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, brk.merge, brk.write, brk.watermark, brk.dq, brk.govern, brk.semantic]);

  // Tutorial sequencer — apply this step's break and auto-advance.
  useEffect(() => {
    if (tutorialStep < 0) return;
    const step = TUTORIAL[tutorialStep];
    setBrk(step.stage ? { ...EMPTY_BRK, [step.stage]: true } : { ...EMPTY_BRK });
    const timer = setTimeout(() => {
      if (tutorialStep + 1 < TUTORIAL.length) {
        setTutorialStep(tutorialStep + 1);
      } else {
        setTutorialStep(-1);
        setBrk({ ...EMPTY_BRK });
      }
    }, TUTORIAL_STEP_MS);
    return () => clearTimeout(timer);
  }, [tutorialStep]);

  // imperative painter (pool of divs)
  function paintRows() {
    const layer = rowLayerRef.current;
    if (!layer) return;
    const list = rows.current;
    const need = list.length;
    let pool = layer.children;
    while (pool.length < need) {
      const el = document.createElement('div');
      el.className = 'lp-row';
      const inner = document.createElement('span');
      el.appendChild(inner);
      layer.appendChild(el);
    }
    while (pool.length > need) layer.removeChild(pool[pool.length - 1]);

    list.forEach((r, i) => {
      const el = pool[i];
      let x, y;
      const LANE_TOP = 32; // % of stage
      const LANE_H  = 28;

      if (r.state === 'spilled') {
        x = GATE_X.watermark;
        const age = tSim.current - r.spilled.born;
        y = LANE_TOP + LANE_H * r.lane + Math.min(1, age * 1.4) * 40;
      } else if (r.state === 'dropped') {
        x = r.dropStage === 'merge' ? GATE_X.merge : GATE_X.watermark;
        y = LANE_TOP + LANE_H * r.lane;
        // Scatter direction: deterministic per row (hash on id), 8 direction quadrants
        const angle = ((r.id * 47) % 8) * 45;
        const sx = (Math.cos(angle * Math.PI / 180) * 9).toFixed(1);
        const sy = (Math.sin(angle * Math.PI / 180) * 9 - 4).toFixed(1);
        el.style.setProperty('--sx', `${sx}%`);
        el.style.setProperty('--sy', `${sy}%`);
      } else if (r.state === 'govblocked') {
        x = GATE_X.govern;
        y = LANE_TOP + LANE_H * r.lane;
      } else if (r.state === 'dqhold') {
        // held at DQ gate — they pile up slightly
        x = GATE_X.dq - 1.5;
        y = LANE_TOP + LANE_H * r.lane;
      } else {
        x = tToX(r.t);
        y = LANE_TOP + LANE_H * r.lane;
      }

      el.style.left = x.toFixed(2) + '%';
      el.style.top  = y.toFixed(2) + '%';

      // class
      let cls = 'lp-row';
      cls += ' lp-k-' + r.user.kind;
      if (r.state === 'dropped') cls += ' lp-drop';
      if (r.state === 'spilled') cls += ' lp-spill';
      if (r.state === 'govblocked') cls += ' lp-govblock';
      if (r.state === 'dqhold') cls += ' lp-dqhold';
      if (r.state === 'arrived') cls += ' lp-arrived';
      if (r.halluc) cls += ' lp-halluc';
      if (r.phantom) cls += ' lp-phantom';
      if (r.silentlyBad) cls += ' lp-silentbad';
      el.className = cls;

      const label = r.user.user_id;
      if (el.firstChild.textContent !== label) el.firstChild.textContent = label;
    });
  }

  function tToX(t) {
    // map t=0 → GATE_X.source, t=1 → GATE_X.analyst
    return GATE_X.source + t * (GATE_X.analyst - GATE_X.source);
  }

  // signal pulse when DQ is passing & nothing is broken downstream
  const pipelineGreen = !brk.merge && !brk.write && !brk.watermark && !brk.dq && !brk.govern && !brk.semantic;
  useEffect(() => {
    if (!pipelineGreen) return;
    const id = setInterval(() => setSignalPulse(p => p + 1), 3000);
    return () => clearInterval(id);
  }, [pipelineGreen]);

  // Compute what the downstream consumer sees, derived passively
  // from the current pipeline state. (No interactive "ask" — the
  // analyst's view simply reflects whichever contract is broken.)
  const consumerView = (() => {
    if (brk.semantic) return { kind: 'err',  v: 'ERROR',
      caption: 'metric unbound · downstream query references a column that no longer exists' };
    if (brk.dq)       return { kind: 'wait', v: '-',
      caption: 'DQ failed · signal never fired · dashboard frozen on yesterday’s number' };
    if (brk.govern)   return { kind: 'wait', v: '-',
      caption: 'Access Gateway blocked the deploy · no fresh data reached the consumer' };
    if (brk.merge)    return { kind: 'bad',  v: '97.8%',
      caption: 'churned users dropped · denominator undercount · ratio inflated' };
    if (brk.write)    return { kind: 'bad',  v: '88.1%',
      caption: 'retry double-counted rows · denominator inflated · ratio depressed' };
    if (brk.watermark)return { kind: 'bad',  v: '91.4%',
      caption: 'late + duplicate rows slipped past the gate · drift in both directions' };
    return            { kind: 'good', v: '94.2%',
      caption: 'source: analytics.conversion_7d · 23 min ago · governed · traceable' };
  })();

  const ctlRowVis = stats.srcScanned > 0;

  return (
    <div className="lp-wrap">
      {/* === STAGE DIAGRAM ================================================ */}
      <div className="lp-stage">
        {tutorial && (
          <div className="lp-tutorial-banner" role="status" aria-live="polite">
            <div className="lp-tutorial-step">
              <span className="lp-tutorial-step-n">{tutorialStep + 1}</span>
              <span className="lp-tutorial-step-of">/ {TUTORIAL.length}</span>
            </div>
            <div className="lp-tutorial-text">
              <div className="lp-tutorial-title">{tutorial.title}</div>
              <div className="lp-tutorial-caption">{tutorial.caption}</div>
            </div>
            <button className="lp-tutorial-exit" onClick={stopTutorial} aria-label="Exit tutorial">
              ✕ exit
            </button>
            <div className="lp-tutorial-progress" aria-hidden="true">
              <div className="lp-tutorial-progress-fill" key={tutorialStep} />
            </div>
          </div>
        )}
        <svg className="lp-bg-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="lp-grid" x="0" y="0" width="4" height="6" patternUnits="userSpaceOnUse">
              <path d="M 4 0 L 0 0 0 6" fill="none" stroke="rgba(11,18,31,0.05)" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#lp-grid)" />

          {/* main conveyor band */}
          <rect x="1" y="32" width="98" height="28" rx="0.8" fill="rgba(45,125,255,0.04)" />
          <line x1="1" y1="46" x2="99" y2="46" stroke="rgba(11,18,31,0.08)"
                strokeWidth="0.3" strokeDasharray="0.6 0.8" vectorEffect="non-scaling-stroke" />

          {/* late side-table below (visual only) */}
          <rect x={GATE_X.watermark - 3} y="78" width="22" height="14" rx="0.8"
                fill="rgba(184,119,10,0.06)" stroke="rgba(184,119,10,0.35)" strokeWidth="0.25"
                strokeDasharray="1 0.8" vectorEffect="non-scaling-stroke" />

          {/* gate lines */}
          {STAGES.map(s => (
            <line key={s.k} x1={GATE_X[s.k]} y1="28" x2={GATE_X[s.k]} y2="64"
                  stroke={brk[s.k] ? '#E41E3F' : s.color}
                  strokeWidth={brk[s.k] ? '1.5' : '1'}
                  strokeDasharray={brk[s.k] ? '2 1' : '0'}
                  vectorEffect="non-scaling-stroke" />
          ))}

          {/* source + analyst caps */}
          <line x1={GATE_X.source} y1="26" x2={GATE_X.source} y2="66" stroke="var(--fg-1)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <line x1={GATE_X.analyst} y1="26" x2={GATE_X.analyst} y2="66" stroke="var(--fg-1)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* stage labels (above conveyor) */}
        <div className="lp-labels">
          <div className="lp-label lp-label-src" style={{left: `${GATE_X.source}%`}}>
            <div className="lp-l-eyebrow">raw source</div>
            <div className="lp-l-title">events_today<br/>+ users_yesterday</div>
          </div>
          {STAGES.map(s => (
            <div key={s.k} className={`lp-label lp-label-gate ${brk[s.k] ? 'broken' : ''}`} style={{left: `${GATE_X[s.k]}%`, '--c': s.color}}>
              <div className="lp-l-n">{s.n}</div>
              <div className="lp-l-title">{s.title}</div>
              <div className="lp-l-ref">{s.ref}</div>
              {brk[s.k] && <div className="lp-l-broken">✕ BROKEN</div>}
            </div>
          ))}
          <div className="lp-label lp-label-analyst" style={{left: `${GATE_X.analyst}%`}}>
            <div className="lp-l-eyebrow">analyst</div>
            <div className="lp-l-title">Jordan · Analyst</div>
          </div>
        </div>

        {/* late table label */}
        <div className="lp-side-label" style={{left: `${GATE_X.watermark - 2}%`}}>
          <div>fct_users_late</div>
          <div className="sub">late arrivals spill here: never dropped</div>
        </div>

        {/* dataset title */}
        <div className="lp-dataset">
          <div className="lp-d-eyebrow">dataset</div>
          <div className="lp-d-name"><code>dim_users</code></div>
          <div className="lp-d-sub">1,421,882 users · trial-to-paid journey · refreshed daily</div>
        </div>

        {/* rows layer */}
        <div className="lp-rows" ref={rowLayerRef} />

        {/* per-stage live stats on hover / always below gate */}
        <div className="lp-gate-stats">
          <div className="lp-gs" style={{left: `${GATE_X.merge}%`}}>
            <span className="n">{stats.merged.toLocaleString()}</span>
            <span className="lab">merged</span>
            {brk.merge && <span className="bad">−{stats.dropped} churned dropped</span>}
          </div>
          <div className="lp-gs" style={{left: `${GATE_X.write}%`}}>
            <span className="n">{stats.written.toLocaleString()}</span>
            <span className="lab">written</span>
            {brk.write && stats.dup > 0 && <span className="bad">+{stats.dup} duped by retry</span>}
          </div>
          <div className="lp-gs" style={{left: `${GATE_X.watermark}%`}}>
            <span className="n">{stats.onTime.toLocaleString()}</span>
            <span className="lab">on-time</span>
            <span className="sub">{stats.lateSpilled} spilled{brk.watermark ? ': BYPASSED' : ''}</span>
          </div>
          <div className="lp-gs" style={{left: `${GATE_X.dq}%`}}>
            <span className="n">{stats.dqPass.toLocaleString()}</span>
            <span className="lab">dq pass</span>
            {brk.dq && <span className="bad">signal not fired</span>}
          </div>
          <div className="lp-gs" style={{left: `${GATE_X.govern}%`}}>
            <span className="n">{stats.govPass.toLocaleString()}</span>
            <span className="lab">deployed</span>
            {brk.govern && <span className="bad">{stats.govBlocked} blocked</span>}
          </div>
          <div className="lp-gs" style={{left: `${GATE_X.semantic}%`}}>
            <span className="n">{stats.semHit.toLocaleString()}</span>
            <span className="lab">bound</span>
            {brk.semantic && <span className="bad">no metric</span>}
          </div>
        </div>
      </div>

      {/* === SABOTAGE CONSOLE ============================================= */}
      <div className="lp-console">
        <div className="lp-console-head">
          <div>
            <div className="lp-console-eyebrow">sabotage console · break one contract, watch the blast radius</div>
            <div className="lp-console-title">Six contracts. Every one is load-bearing.</div>
          </div>
          <div className="lp-console-actions">
            <button className="btn btn-primary" onClick={tutorial ? stopTutorial : startTutorial}>
              {tutorial ? '✕ stop tutorial' : '▶ guided tutorial'}
            </button>
            <button className="btn" onClick={() => setRunning(r => !r)} disabled={!!tutorial}>
              {running ? '⏸ pause' : '▶ resume'}
            </button>
            <button className="btn" onClick={() => { reset(); }} disabled={!!tutorial}>↻ reset counters</button>
            <button className="btn" onClick={resetAll} disabled={pipelineGreen || !!tutorial}>fix all</button>
          </div>
        </div>

        <div className="lp-break-grid">
          {STAGES.map(s => {
            const contracts = BREAKAGE_COPY[s.k];
            return (
              <button key={s.k}
                      className={`lp-break ${brk[s.k] ? 'on' : ''} ${tutorial ? 'is-locked' : ''}`}
                      style={{ '--c': s.color }}
                      disabled={!!tutorial}
                      onClick={() => toggleBreak(s.k)}>
                <div className="lp-break-head">
                  <span className="n">{s.n}</span>
                  <span className="title">{s.title}</span>
                  <span className={`pill ${brk[s.k] ? 'on' : ''}`}>{brk[s.k] ? 'broken' : 'healthy'}</span>
                </div>
                <div className="lp-break-good">
                  <b>if healthy:</b> {contracts.good}
                </div>
                <div className="lp-break-bad">
                  <b>if broken:</b> {contracts.bad}
                </div>
                <div className="lp-break-code"><code>{contracts.code}</code></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* === SIGNAL + AGENT =============================================== */}
      <div className="lp-downstream">
        <div className="lp-signal">
          <div className="lp-signal-head">
            <span className="l-k">signal table</span>
            <span className="l-v"><code>users_signal</code></span>
          </div>
          <div className={`lp-signal-body ${pipelineGreen ? 'on' : 'off'}`}>
            {pipelineGreen ? (
              <>
                <div className="lp-pulse" key={signalPulse}>
                  <span className="d1" /><span className="d2" /><span className="d3" />
                </div>
                <div>
                  <div className="lp-sig-lab">signal landed · downstream unblocked</div>
                  <div className="lp-sig-sub">every consumer wakes up now</div>
                </div>
              </>
            ) : (
              <>
                <div className="lp-pulse-off">∅</div>
                <div>
                  <div className="lp-sig-lab lp-sig-off">signal never fired</div>
                  <div className="lp-sig-sub">
                    {brk.dq      ? 'DQ failed → signal blocked.' :
                     brk.govern  ? 'Access Gateway blocked deploy → no signal.' :
                     brk.semantic? 'signal landed, but metric layer is broken.' :
                     brk.merge   ? 'signal landed, but dim is missing churned users.' :
                     brk.write   ? 'signal landed, but retry double-counted.' :
                     brk.watermark ? 'signal landed, but late rows bypassed the gate.' :
                     'waiting…'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="lp-consumer">
          <div className="lp-consumer-head">
            <div>
              <div className="lp-consumer-eyebrow">downstream consumer · what Jordan sees</div>
              <div className="lp-consumer-title">Conversion dashboard · last 7 days</div>
            </div>
            <code className="lp-consumer-src">analytics.conversion_7d</code>
          </div>
          <div className={`lp-consumer-body lp-consumer-${consumerView.kind}`}>
            <div className="lp-consumer-v">{consumerView.v}</div>
            <div className="lp-consumer-cap">
              {consumerView.kind === 'bad' && <span className="lp-consumer-warn">⚠ wrong by silent drift · </span>}
              {consumerView.kind === 'wait' && <span className="lp-consumer-warn">⏸ stale · </span>}
              {consumerView.kind === 'err' && <span className="lp-consumer-warn">✕ failed · </span>}
              {consumerView.caption}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const BREAKAGE_COPY = {
  merge: {
    good: 'FULL OUTER keeps churned and new users',
    bad:  'LEFT JOIN silently drops every churned user',
    code: 'FULL OUTER JOIN → LEFT JOIN',
  },
  write: {
    good: 'INSERT OVERWRITE · retries are a no-op',
    bad:  'INSERT INTO · retries double-count rows',
    code: 'INSERT OVERWRITE → INSERT INTO',
  },
  watermark: {
    good: 'late rows spill to __late table · dedup by event_id',
    bad:  'late & duplicate rows slip through silently',
    code: 'WHERE event_ts ≥ ds → (removed)',
  },
  dq: {
    good: 'row-count · freshness · unique: then signal',
    bad:  'checks skipped · signal never lands · downstream blocks',
    code: 'on_failure="block_downstream"',
  },
  govern: {
    good: 'PII actors declared · Access Gateway resolves',
    bad:  'unannotated PII · Access Gateway refuses deploy',
    code: 'actors: [PII_Person]',
  },
  semantic: {
    good: 'metric bound to physical column · one definition',
    bad:  'no binding · downstream queries hit an unbound column',
    code: 'metrics: [conversion_7d]',
  },
};

/* ============================================================
 * Main export
 * ============================================================ */

function Ch9_Capstone({ chapter, internalMode, reduceMotion }) {
  const N = MMNames(internalMode);
  return (
    <>
      <Hero accent={chapter.hex}
            eyebrow={`Chapter ${chapter.n} · ${chapter.time}`}
            title={`<span class='accent'>Break any one</span> of six contracts. Watch exactly what fails.`}
            hook={`<code>dim_users</code> is live. Six gates are running. Sabotage any one: MERGE drops churned users, dedup stops, watermark closes early. The downstream analyst still gets a number. Just the wrong one. That's why every gate exists.`}
            meta={[
              { k: 'Dataset', v: 'dim_users' },
              { k: 'Contracts', v: '6 · all load-bearing' },
              { k: 'Consumers', v: 'dashboards · notebooks · analysts' },
            ]} />

      <section className="section">
        <SectionLabel n="10.1">The living pipeline</SectionLabel>
        <h2 className="h2">Rows flow left → right. Every gate is a chapter you read.</h2>
        <p className="prose">
          Each dot is a real user row streaming through <code>dim_users</code>: on-time ones
          pass through all six gates to the analyst. Churned rows (from yesterday) only survive if
          MERGE uses <code>FULL OUTER</code>. Late rows spill to the side-table <em>only</em> if the
          watermark holds. Duplicate rows get dedupped <em>only</em> if you didn't disable the guard.
          Every other contract has a twin failure mode.
        </p>
        <p className="prose">
          Click any <strong>sabotage button</strong> below the stage to break that contract. The break
          happens live: rows start dropping, stalling, or lying. Hit "ask the question" to watch
          what the analyst gets in return.
        </p>

        <LivingPipeline internalMode={internalMode} reduceMotion={reduceMotion} />
      </section>

      <Takeaway items={[
        "<b>A pipeline is six contracts, not one SQL file.</b> Break any one and the whole downstream thesis falls.",
        "<b>Wait on the signal, not the data.</b> The signal table is the gate between <em>written</em> and <em>trusted</em>. Without DQ, it never fires.",
        "<b>Wrong answers look identical to right answers.</b> The MERGE/WRITE/WATERMARK breaks still return a number: just the wrong one. That's why the contracts exist.",
        `<b>Every file in this pipeline is a chapter you read.</b> When one feels confusing, re-open its chapter: don't patch around it.`,
      ]} />
    </>
  );
}

window.Ch9_Capstone = Ch9_Capstone;
