/* global React, Hero, SectionLabel, AntiPatterns, BestPractices, Takeaway, Panel, MMNames */
const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
 * Ch1.5 · Streaming & Real-time — Conveyor Belt v2
 *
 * Honest simulation of a stream → warehouse boundary.
 *
 *   Time axis (x):         event-time. 30-second rolling window.
 *   Watermark:             advancing vertical line. Behind it = "settled".
 *   Arrival jitter (y):    events appear above the baseline and fall to it.
 *                          Late events spawn already behind the watermark.
 *   Dedup ledger:          visible list of last ~18 event_ids the gate has seen.
 *                          A duplicate's id matches one in the ledger; a line
 *                          visibly connects the duplicate to its twin.
 *   Late drawer:           events whose event-time is behind watermark when
 *                          they arrive.
 *   Real-time counter:     events that passed the gate in the last ~1s.
 *   Warehouse counter:     events whose event-time ≤ watermark AND that made
 *                          it past the gate. Settled; never unsettles.
 *   Drift sparkline:       rolling (rt − wh) over 30s.
 *
 *   Two guards, independent toggles:
 *     ☐ Dedup by event_id    ☐ Drop late (past watermark)
 * ============================================================ */

const CV_STAGE_SECONDS = 30;   // width of the time window in event-seconds
const CV_WATERMARK_LAG = 4;    // seconds: watermark trails newest event-time
const CV_GATE_X = 70;          // % of stage where the gate sits
const CV_BASELINE_Y = 78;      // % of stage where events land

function CoveyorSim_Unused() {}

function ConveyorSim({ reduceMotion, internalMode }) {
  const N = MMNames(internalMode);

  // ---- controls ------------------------------------------------------
  const [rate, setRate] = useState(10);          // events/sec
  const [dupPct, setDupPct] = useState(22);
  const [latePct, setLatePct] = useState(15);
  const [dedupOn, setDedupOn] = useState(true);
  const [lateGateOn, setLateGateOn] = useState(true);
  // beginner mode: hide late drawer + drift sparkline + late slider/guard so
  // first-time learners can focus on dedup as the single concept.
  const [beginner, setBeginner] = useState(true);
  const [running, setRunning] = useState(true);

  // ---- counters & surfaces (React state) ----------------------------
  const [ledger, setLedger] = useState([]);        // last ~18 ids the gate saw
  const [lateDrawer, setLateDrawer] = useState([]); // {id, et, at}
  const [rtCount, setRtCount] = useState(0);       // events/s through gate
  const [whCount, setWhCount] = useState(0);       // cumulative settled rows
  const [rtTotal, setRtTotal] = useState(0);       // cumulative passed
  const [snapped, setSnapped] = useState(0);       // dupes killed by gate
  const [droppedLate, setDroppedLate] = useState(0);
  const [driftSeries, setDriftSeries] = useState([]); // for sparkline

  // ---- sim refs (don't cause re-render) ----------------------------
  const simT = useRef(0);                // seconds of sim time elapsed
  const events = useRef([]);             // {id, et, at, y, state}
  const seenIds = useRef(new Set());     // for dedup check
  const seenOrder = useRef([]);          // for visible ledger
  const passedStamps = useRef([]);       // event-times of passed events (for wh count)
  const lastSecondPassed = useRef(0);    // for rt window
  const twinLinks = useRef([]);          // {from: {x,y}, to: ledgerIdx, born}
  const stageRef = useRef(null);
  const svgRef = useRef(null);
  const rafRef = useRef(null);

  // ---- reset --------------------------------------------------------
  const reset = () => {
    simT.current = 0;
    events.current = [];
    seenIds.current = new Set();
    seenOrder.current = [];
    passedStamps.current = [];
    lastSecondPassed.current = 0;
    twinLinks.current = [];
    setLedger([]);
    setLateDrawer([]);
    setRtCount(0); setWhCount(0); setRtTotal(0);
    setSnapped(0); setDroppedLate(0);
    setDriftSeries([]);
  };

  // ---- event id generator (deterministic pool for dupes) ------------
  const POOL = useRef([]);
  const nextId = () => {
    // small pool; duplicates come from reusing a recent id
    const id = `E${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    POOL.current.push(id);
    if (POOL.current.length > 60) POOL.current.shift();
    return id;
  };
  const reuseId = () => {
    if (POOL.current.length < 2) return nextId();
    const idx = Math.max(0, POOL.current.length - 1 - Math.floor(Math.random() * 20));
    return POOL.current[idx];
  };

  // ---- main tick ----------------------------------------------------
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let spawnBank = 0;
    let rtBank = 0;          // time since last rt counter flush
    let rtWindow = [];       // recent gate-pass timestamps

    const tick = (now) => {
      const dtMs = Math.min(64, now - last);
      last = now;
      const dt = (reduceMotion ? 16 : dtMs) / 1000; // seconds of sim time per frame
      simT.current += dt;

      // --- spawn --------------------------------------------------
      spawnBank += dt * rate;
      while (spawnBank >= 1) {
        spawnBank -= 1;
        const isLate = Math.random() * 100 < latePct;
        const isDup = Math.random() * 100 < dupPct;

        // event-time: where on the x-axis it belongs
        let et;
        if (isLate) {
          // late: event-time is somewhere behind the watermark
          const wm = simT.current - CV_WATERMARK_LAG;
          et = wm - (0.4 + Math.random() * 3.5); // 0.4..3.9s behind wm
        } else {
          // on-time: event-time near "now", small +/- skew
          et = simT.current - (Math.random() * 0.6);
        }

        const id = isDup ? reuseId() : nextId();
        // assign a lane (0..4) for vertical staggering on the belt baseline
        const lane = Math.floor(Math.random() * 5);
        events.current.push({
          id,
          et,
          at: simT.current,
          lane,
          y: 20 + Math.random() * 15, // spawn y (above baseline)
          targetY: CV_BASELINE_Y - 10 + lane * 5, // baseline lane
          state: 'falling',
          bornReal: now,
        });
      }

      // --- advance & gate -----------------------------------------
      const wm = simT.current - CV_WATERMARK_LAG;
      events.current.forEach(e => {
        // y: drop toward target lane
        if (e.state === 'falling') {
          const targetY = e.targetY ?? CV_BASELINE_Y;
          e.y = Math.min(targetY, e.y + dt * 80);
          if (e.y >= targetY) {
            e.state = 'onbelt';
            e.onBeltAt = simT.current;
          }
        }
        // once on belt, check gate based on current x-position
        if (e.state === 'onbelt') {
          const x = eventTimeToX(e.et, simT.current);
          if (x <= CV_GATE_X + 0.4 && !e.gated) {
            e.gated = true;
            // 1) late check
            if (lateGateOn && e.et < wm) {
              e.state = 'late';
              e.endedAt = simT.current;
              setLateDrawer(arr => [{ id: e.id, et: e.et, at: e.at, lag: (e.at - e.et) }, ...arr].slice(0, 6));
              setDroppedLate(n => n + 1);
              return;
            }
            // 2) dedup check
            if (dedupOn && seenIds.current.has(e.id)) {
              e.state = 'dup';
              e.endedAt = simT.current;
              e.twinLedgerIdx = seenOrder.current.indexOf(e.id); // for link
              // register a visible link pulse
              twinLinks.current.push({
                id: e.id,
                fromT: simT.current,
                ledgerIdx: e.twinLedgerIdx,
              });
              setSnapped(n => n + 1);
              return;
            }
            // 3) passes!
            e.state = 'passed';
            seenIds.current.add(e.id);
            seenOrder.current.unshift(e.id);
            if (seenOrder.current.length > 18) {
              const dropped = seenOrder.current.pop();
              // keep seenIds bounded too (assume id reappearance after 18 is rare)
              seenIds.current.delete(dropped);
            }
            passedStamps.current.push(e.et);
            rtWindow.push(simT.current);
            setRtTotal(n => n + 1);
          }
        }
      });

      // cleanup old events visually
      events.current = events.current.filter(e => {
        if (e.state === 'dup' || e.state === 'late') {
          return (simT.current - e.endedAt) < 0.55;
        }
        if (e.state === 'passed') {
          const x = eventTimeToX(e.et, simT.current);
          return x > -4;
        }
        return true;
      });

      // trim twinLinks after fade
      twinLinks.current = twinLinks.current.filter(l => simT.current - l.fromT < 0.55);

      // warehouse count: events whose event-time is settled (≤ watermark)
      while (passedStamps.current.length > 0 && passedStamps.current[0] <= wm - 0.05) {
        passedStamps.current.shift();
        setWhCount(n => n + 1);
      }

      // rt window = last 1s
      const oneAgo = simT.current - 1.0;
      while (rtWindow.length > 0 && rtWindow[0] < oneAgo) rtWindow.shift();
      rtBank += dt;
      if (rtBank > 0.2) {
        rtBank = 0;
        setRtCount(rtWindow.length);
        // drift series
        setDriftSeries(prev => {
          const next = [...prev, { t: simT.current, rt: rtWindow.length }];
          return next.slice(-90);
        });
      }

      // update ledger (throttled-ish)
      if (Math.floor(simT.current * 10) % 2 === 0) {
        setLedger([...seenOrder.current]);
      }

      renderStage(null, events.current, simT.current, twinLinks.current);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, rate, dupPct, latePct, dedupOn, lateGateOn, reduceMotion]);

  // clear sim when toggling critical gate options (so user sees effect fresh)
  useEffect(() => { reset(); /* eslint-disable-next-line */ }, [dedupOn, lateGateOn]);

  // ---- coordinate helper --------------------------------------------
  function eventTimeToX(et, now) {
    // newest events are at x=100, events CV_STAGE_SECONDS ago are at x=0
    const age = now - et; // seconds behind "now"
    return 100 - (age / CV_STAGE_SECONDS) * 100;
  }

  // ---- stage renderer ----
  // Events: positioned HTML divs (pool reuse). Links: imperative SVG overlay.
  const eventsLayerRef = useRef(null);
  const linksSvgRef = useRef(null);
  function renderStage(_svg, list, now, links) {
    // Events layer ----
    const layer = eventsLayerRef.current;
    if (layer) {
      // Rebuild children efficiently: reuse pool of divs
      const need = list.length;
      let pool = layer.children;
      while (pool.length < need) {
        const el = document.createElement('div');
        el.className = 'cv-ev';
        const inner = document.createElement('span');
        el.appendChild(inner);
        layer.appendChild(el);
      }
      while (pool.length > need) layer.removeChild(pool[pool.length - 1]);

      list.forEach((e, i) => {
        const el = pool[i];
        const x = eventTimeToX(e.et, now);
        el.style.left = x.toFixed(2) + '%';
        el.style.top = e.y.toFixed(2) + '%';
        el.className = `cv-ev cv-${e.state}${e.state === 'dup' ? ' cv-dup' : ''}`;
        const inner = el.firstChild;
        if (inner.textContent !== e.id) inner.textContent = e.id;
      });
    }

    // Links (SVG overlay with viewBox 0 0 100 100 + preserveAspectRatio=none) ----
    const lyr2 = linksSvgRef.current;
    if (lyr2) {
      for (let i = lyr2.childNodes.length - 1; i >= 0; i--) lyr2.removeChild(lyr2.childNodes[i]);
      const ns = 'http://www.w3.org/2000/svg';
      links.forEach(l => {
        const path = document.createElementNS(ns, 'path');
        const age = now - l.fromT;
        const op = Math.max(0, 1 - age / 0.55);
        const fromX = CV_GATE_X, fromY = CV_BASELINE_Y;
        // ledger is outside the svg; we draw to the right edge (x=100) and vertically aim at the ledger row
        const toX = 99.5;
        const toY = 6 + l.ledgerIdx * 4.6;
        path.setAttribute('d', `M ${fromX} ${fromY} Q 92 ${fromY - 25} ${toX} ${toY}`);
        path.setAttribute('stroke', '#E41E3F');
        path.setAttribute('stroke-width', '0.45');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '1.2 0.8');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        path.setAttribute('opacity', op.toFixed(2));
        lyr2.appendChild(path);
      });
    }
  }

  // cleanup on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // watermark x
  const watermarkX = 100 - (CV_WATERMARK_LAG / CV_STAGE_SECONDS) * 100;
  const gateColor = '#2D7DFF';
  const drift = rtTotal - whCount;

  // sparkline path
  const spark = useMemo(() => {
    if (driftSeries.length < 2) return '';
    const xs = driftSeries;
    const max = Math.max(1, ...xs.map(p => p.rt));
    const min = Math.min(0, ...xs.map(p => p.rt));
    const range = max - min || 1;
    return xs.map((p, i) => {
      const x = (i / (xs.length - 1)) * 100;
      const y = 100 - ((p.rt - min) / range) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [driftSeries]);

  return (
    <Panel eyebrow="live simulator · streaming boundary"
           title="The Ingestion Conveyor Belt"
           meta={`${rate}/s · dup ${dupPct}% · late ${latePct}%`}
           caption={`Time advances left→right. The watermark trails ~${CV_WATERMARK_LAG}s behind "now". Two independent guards: dedup by event_id, drop-late by watermark: protect the warehouse boundary.`}>

      <div className="cv-stage" ref={stageRef}>
        <div className="cv-field">
          {/* Backing SVG: grid, watermark, gate, labels */}
          <svg className="cv-bg-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="cv-grid" x="0" y="0" width="5" height="10" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 10" fill="none" stroke="rgba(11,18,31,0.05)" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#cv-grid)" />
            {/* baseline */}
            <line x1="0" y1={CV_BASELINE_Y} x2="100" y2={CV_BASELINE_Y}
                  stroke="rgba(11,18,31,0.14)" strokeWidth="1"
                  strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
            {/* settled band on the left of watermark */}
            <rect x="0" y="0" width={watermarkX} height="100" fill="rgba(49,162,76,0.04)" />
            {/* watermark vertical line */}
            <line x1={watermarkX} y1="0" x2={watermarkX} y2="100"
                  stroke="#B8770A" strokeWidth="1.5" strokeDasharray="3 2"
                  vectorEffect="non-scaling-stroke" />
            {/* gate vertical line */}
            <line x1={CV_GATE_X} y1="0" x2={CV_GATE_X} y2="100"
                  stroke="#2D7DFF" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            <rect x={CV_GATE_X - 3} y="60" width="6" height="18" fill="rgba(45,125,255,0.12)"
                  stroke="#2D7DFF" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* HTML overlay for labels (positioned over backing SVG) */}
          <div className="cv-labels">
            <div className="cv-label-settled" style={{left: 0, width: `${watermarkX}%`}}>◄ SETTLED · behind watermark</div>
            <div className="cv-label-watermark" style={{left: `${watermarkX}%`}}>WATERMARK<br/><span>now − {CV_WATERMARK_LAG}s</span></div>
            <div className="cv-label-gate" style={{left: `${CV_GATE_X}%`}}>
              <div className="g">GATE</div>
              <div className="gsub">{dedupOn && lateGateOn ? 'dedup · late' : dedupOn ? 'dedup only' : lateGateOn ? 'late only' : 'pass-all'}</div>
            </div>
            <div className="cv-label-now">NOW ►</div>
          </div>

          {/* HTML events layer */}
          <div className="cv-events-layer" ref={eventsLayerRef} />

          {/* SVG overlay: twin links */}
          <svg className="cv-links-svg" viewBox="0 0 100 100" preserveAspectRatio="none" ref={linksSvgRef} />
        </div>

        {/* overlay ledger panel on the right side */}
        <div className="cv-ledger">
          <div className="cv-ledger-head">
            <span>SEEN</span><span className="n">{ledger.length}</span>
          </div>
          <div className="cv-ledger-body">
            {ledger.length === 0
              ? <div className="empty">ledger empty</div>
              : ledger.map((id, i) => (
                <div key={id + '-' + i} className="cv-ledger-row">
                  <span className="i">{i + 1}</span>
                  <code>{id}</code>
                </div>
              ))}
          </div>
          <div className="cv-ledger-foot">
            {dedupOn ? 'dedup by event_id · on' : 'dedup · OFF'}
          </div>
        </div>
      </div>

      {/* late drawer (advanced mode only) */}
      {!beginner && (
        <div className="cv-drawer-2">
          <div className="cv-drawer-head">
            <span className="k">LATE DRAWER</span>
            <span className="c">{lateDrawer.length}</span>
            <span className="h">events arrived after their window closed</span>
          </div>
          <div className="cv-drawer-rows">
            {lateDrawer.length === 0
              ? <div className="empty">no late events in the window</div>
              : lateDrawer.map((e, i) => (
                <div key={i} className="cv-late-row">
                  <code>{e.id}</code>
                  <span className="et">event-time t={e.et.toFixed(1)}s</span>
                  <span className="lag">+{e.lag.toFixed(1)}s late</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* counters */}
      <div className={`cv-readouts ${beginner ? 'cv-readouts-beginner' : ''}`}>
        <div className="cv-r cv-r-rt">
          <div className="k">Real-time (events/s)</div>
          <div className="v">{rtCount}</div>
          <div className="s">1-second rolling window · jittery</div>
        </div>
        <div className="cv-r cv-r-wh">
          <div className="k">Warehouse · settled rows</div>
          <div className="v">{whCount.toLocaleString()}</div>
          <div className="s">event-time ≤ watermark · stable</div>
        </div>
        {!beginner && (
          <div className={`cv-r ${Math.abs(drift) > 8 ? 'warn' : ''}`}>
            <div className="k">Passed − settled</div>
            <div className="v">{drift >= 0 ? '+' : ''}{drift}</div>
            <div className="s">in-flight (passed, not yet behind watermark)</div>
            <svg className="cv-spark" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d={spark} stroke="var(--accent)" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
        )}
        <div className={`cv-r cv-r-gate ${snapped + droppedLate > 0 ? 'danger' : ''}`}>
          <div className="k">Gate actions</div>
          <div className="v cv-gate-nums">
            <span><b>{snapped}</b> dedup</span>
            {!beginner && <span><b>{droppedLate}</b> late</span>}
          </div>
          <div className="s">blocked at the boundary</div>
        </div>
      </div>

      {/* mode toggle */}
      <label className="cv-mode">
        <input type="checkbox" checked={beginner} onChange={e => setBeginner(e.target.checked)} />
        <span className="cv-mode-name">Beginner mode</span>
        <span className="cv-mode-sub">{beginner ? 'focus on dedup only · late drawer hidden' : 'all guards visible'}</span>
      </label>

      {/* controls */}
      <div className="cv-ctls">
        <div className="cv-guards">
          <label className={`cv-guard ${dedupOn ? 'on' : ''}`}>
            <input type="checkbox" checked={dedupOn} onChange={e => setDedupOn(e.target.checked)} />
            <div>
              <div className="n">Dedup by <code>event_id</code></div>
              <div className="d">Suppress events whose id the gate has already passed</div>
            </div>
          </label>
          {!beginner && (
            <label className={`cv-guard ${lateGateOn ? 'on' : ''}`}>
              <input type="checkbox" checked={lateGateOn} onChange={e => setLateGateOn(e.target.checked)} />
              <div>
                <div className="n">Drop late (past watermark)</div>
                <div className="d">Events whose event-time trails the watermark at arrival</div>
              </div>
            </label>
          )}
        </div>

        <div className="cv-sliders">
          <div className="cv-slider">
            <div className="row"><span className="lab">Event rate</span><span className="val">{rate}/s</span></div>
            <input type="range" min={3} max={60} value={rate} onChange={e => setRate(+e.target.value)} />
          </div>
          <div className="cv-slider warn">
            <div className="row"><span className="lab">Duplicate %</span><span className="val">{dupPct}%</span></div>
            <input type="range" min={0} max={45} value={dupPct} onChange={e => setDupPct(+e.target.value)} />
          </div>
          {!beginner && (
            <div className="cv-slider warn">
              <div className="row"><span className="lab">Late %</span><span className="val">{latePct}%</span></div>
              <input type="range" min={0} max={35} value={latePct} onChange={e => setLatePct(+e.target.value)} />
            </div>
          )}
        </div>

        <div className="cv-btns">
          <button className="btn btn-primary" onClick={() => setRunning(r => !r)}>
            {running ? '⏸ Pause' : '▶ Resume'}
          </button>
          <button className="btn" onClick={reset}>↻ Reset</button>
        </div>
      </div>
    </Panel>
  );
}

function Ch1_5_Streaming({ chapter, internalMode }) {
  const N = MMNames(internalMode);
  return (
    <>
      <Hero accent={chapter.hex}
            eyebrow={`Chapter ${chapter.n} · ${chapter.time}`}
            title={`Streaming: <span class='accent'>real-time</span> and <span class='accent'>accurate</span> are pick-two.`}
            hook={`Events arrive continuously: clicks, impressions, heartbeats. <strong>${N.flink}</strong> on top of <strong>${N.kafkastreams}</strong> gives you answers in seconds. ${N.snowflake} gives you answers you can bet a launch on. <em>They are not the same number.</em> Your job: know which one your decision needs, and bridge the two cleanly.`}
            meta={[
              { k: 'Streaming engine', v: N.flink },
              { k: 'Bus', v: N.kafka },
              { k: 'Warehouse lag', v: '~4h typical' },
            ]} />

      <section className="section">
        <SectionLabel n="2.1">Continuous processing</SectionLabel>
        <h2 className="h2">Micro-batch vs continuous, exactly-once vs at-least-once.</h2>
        <p className="prose">
          Batch engines pull windows of events on a schedule. Streaming engines consume one event at a time,
          as it arrives. The trade-off is <strong>latency vs correctness</strong>: streams answer in seconds
          but hand you partial, possibly-duplicated data; batch settles for hours but hands you one row per
          event, dedupped, joined, and governed.
        </p>
        <div className="cards-3">
          <div className="ccard">
            <div className="ccard-t">Latency</div>
            <div className="ccard-n">Seconds vs hours</div>
            <div className="ccard-d">Dashboards for on-call humans want seconds. Exec slides want hours (but correct).</div>
          </div>
          <div className="ccard">
            <div className="ccard-t">Delivery</div>
            <div className="ccard-n">Exactly-once ⊆ at-least-once + dedup</div>
            <div className="ccard-d">"Exactly-once" is at-least-once with a deterministic dedup key applied at the warehouse boundary.</div>
          </div>
          <div className="ccard">
            <div className="ccard-t">Window</div>
            <div className="ccard-n">Tumbling · sliding · session</div>
            <div className="ccard-d">Pick a window, commit to the watermark. Late events either land in the next window or drop.</div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionLabel n="2.2">The boundary problem</SectionLabel>
        <h2 className="h2">Every stream hitting the warehouse needs a dedup gate and a watermark.</h2>
        <p className="prose">
          The bus re-delivers. Producers retry. Networks flap. Clocks disagree. If you take streaming data and
          <code>INSERT INTO</code> a Snowflake fact table without guards, you will (a) double-count some events and
          (b) miscount any day whose late events arrive after the rollup runs. The two guards are
          independent: <strong>dedup</strong> fixes re-delivery, <strong>watermark</strong> fixes late arrival.
          Toggle each below and watch what it catches.
        </p>
        <ConveyorSim internalMode={internalMode} />
      </section>

      <section className="section">
        <SectionLabel n="2.3">The dedup template</SectionLabel>
        <div className="code">
          <div className="code-head"><span>fct_events_dedup.sql · the warehouse boundary</span><span className="lang">SQL</span></div>
          <div className="code-body" dangerouslySetInnerHTML={{__html:
`<span class="tok-c">-- Materialize one row per event_id, even when ${N.kafka} redelivers.</span>
<span class="tok-k">INSERT OVERWRITE TABLE</span> fct_events <span class="tok-k">PARTITION</span> (ds=<span class="tok-s">'&lt;DATEID&gt;'</span>)
<span class="tok-k">SELECT</span> event_id, user_id, event_name, event_ts, received_ts
<span class="tok-k">FROM</span> (
  <span class="tok-k">SELECT</span> *,
    <span class="tok-f">ROW_NUMBER</span>() <span class="tok-k">OVER</span> (
      <span class="tok-k">PARTITION BY</span> event_id
      <span class="tok-k">ORDER BY</span> received_ts <span class="tok-k">DESC</span>
    ) <span class="tok-k">AS</span> rn
  <span class="tok-k">FROM</span> stg_events_raw
  <span class="tok-k">WHERE</span> ds = <span class="tok-s">'&lt;DATEID&gt;'</span>
    <span class="tok-k">AND</span> received_ts &gt;= event_ts                  <span class="tok-c">-- guard against clock skew</span>
) <span class="tok-k">WHERE</span> rn = <span class="tok-n">1</span>;                               <span class="tok-c">-- keep the latest copy</span>`
          }} />
        </div>
      </section>

      <AntiPatterns items={[
        `<b>Trusting sampled real-time as ground truth.</b> "${N.flink} says 4.2M, the deck says 4.2M." The deck will be cited in a launch review. The stream will have drifted 90 minutes later. Always reconcile with the warehouse count before anything permanent.`,
        `<b>"The producer promised exactly-once" → skipping dedup.</b> Producers lie, retry logic fires, and bus partitions re-order. Dedup at every warehouse boundary: this is non-negotiable.`,
        "<b>Processing day N before its watermark closes.</b> A daily rollup that runs at 00:05 will miss an hour of late-arriving events. Schedule against the watermark, not the wall clock.",
      ]} />

      <BestPractices items={[
        `<b>Signal table per stream.</b> A separate tiny table that records when a watermark closed for a (source, ds) pair. Downstream ${N.waitForSignal} waits on the <em>signal</em>, not the data.`,
        `<b>Dedup at every boundary.</b> <code>ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_ts DESC) = 1</code>. Same template everywhere.`,
        "<b>Weekly real-time vs warehouse reconciliation.</b> Compute the delta. Alert on drift &gt; X%. The drift itself is a bug-finder: a producer misbehaving, a bus partition stuck, a watermark misconfigured.",
      ]} />

      <Takeaway items={[
        "<b>Real-time and accurate are pick-two.</b> Pick what your decision needs, not what feels impressive.",
        `<b>Every stream → warehouse boundary dedups AND watermarks.</b> Two independent guards; both required.`,
        "<b>Wait on the signal, not the data.</b> Data can land partial. Signal lands once, correctly, and only when the watermark closes.",
      ]} />
    </>
  );
}

window.Ch1_5_Streaming = Ch1_5_Streaming;
