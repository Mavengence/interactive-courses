(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  const CV_STAGE_SECONDS = 30;
  const CV_WATERMARK_LAG = 4;
  const CV_GATE_X = 70;
  const CV_BASELINE_Y = 78;
  function ConveyorSim({ reduceMotion, internalMode }) {
    const N = MMNames(internalMode);
    const [rate, setRate] = useState(10);
    const [dupPct, setDupPct] = useState(22);
    const [latePct, setLatePct] = useState(15);
    const [dedupOn, setDedupOn] = useState(true);
    const [lateGateOn, setLateGateOn] = useState(true);
    const [beginner, setBeginner] = useState(true);
    const [running, setRunning] = useState(true);
    const [ledger, setLedger] = useState([]);
    const [lateDrawer, setLateDrawer] = useState([]);
    const [rtCount, setRtCount] = useState(0);
    const [whCount, setWhCount] = useState(0);
    const [rtTotal, setRtTotal] = useState(0);
    const [snapped, setSnapped] = useState(0);
    const [droppedLate, setDroppedLate] = useState(0);
    const [driftSeries, setDriftSeries] = useState([]);
    const simT = useRef(0);
    const events = useRef([]);
    const seenIds = useRef(/* @__PURE__ */ new Set());
    const seenOrder = useRef([]);
    const passedStamps = useRef([]);
    const lastSecondPassed = useRef(0);
    const twinLinks = useRef([]);
    const stageRef = useRef(null);
    const svgRef = useRef(null);
    const rafRef = useRef(null);
    const reset = () => {
      simT.current = 0;
      events.current = [];
      seenIds.current = /* @__PURE__ */ new Set();
      seenOrder.current = [];
      passedStamps.current = [];
      lastSecondPassed.current = 0;
      twinLinks.current = [];
      setLedger([]);
      setLateDrawer([]);
      setRtCount(0);
      setWhCount(0);
      setRtTotal(0);
      setSnapped(0);
      setDroppedLate(0);
      setDriftSeries([]);
    };
    const POOL = useRef([]);
    const nextId = () => {
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
    useEffect(() => {
      if (!running) return;
      let last = performance.now();
      let spawnBank = 0;
      let rtBank = 0;
      let rtWindow = [];
      const tick = (now) => {
        const dtMs = Math.min(64, now - last);
        last = now;
        const dt = (reduceMotion ? 16 : dtMs) / 1e3;
        simT.current += dt;
        spawnBank += dt * rate;
        while (spawnBank >= 1) {
          spawnBank -= 1;
          const isLate = Math.random() * 100 < latePct;
          const isDup = Math.random() * 100 < dupPct;
          let et;
          if (isLate) {
            const wm2 = simT.current - CV_WATERMARK_LAG;
            et = wm2 - (0.4 + Math.random() * 3.5);
          } else {
            et = simT.current - Math.random() * 0.6;
          }
          const id = isDup ? reuseId() : nextId();
          const lane = Math.floor(Math.random() * 5);
          events.current.push({
            id,
            et,
            at: simT.current,
            lane,
            y: 20 + Math.random() * 15,
            // spawn y (above baseline)
            targetY: CV_BASELINE_Y - 10 + lane * 5,
            // baseline lane
            state: "falling",
            bornReal: now
          });
        }
        const wm = simT.current - CV_WATERMARK_LAG;
        events.current.forEach((e) => {
          if (e.state === "falling") {
            const targetY = e.targetY ?? CV_BASELINE_Y;
            e.y = Math.min(targetY, e.y + dt * 80);
            if (e.y >= targetY) {
              e.state = "onbelt";
              e.onBeltAt = simT.current;
            }
          }
          if (e.state === "onbelt") {
            const x = eventTimeToX(e.et, simT.current);
            if (x <= CV_GATE_X + 0.4 && !e.gated) {
              e.gated = true;
              if (lateGateOn && e.et < wm) {
                e.state = "late";
                e.endedAt = simT.current;
                setLateDrawer((arr) => [{ id: e.id, et: e.et, at: e.at, lag: e.at - e.et }, ...arr].slice(0, 6));
                setDroppedLate((n) => n + 1);
                return;
              }
              if (dedupOn && seenIds.current.has(e.id)) {
                e.state = "dup";
                e.endedAt = simT.current;
                e.twinLedgerIdx = seenOrder.current.indexOf(e.id);
                twinLinks.current.push({
                  id: e.id,
                  fromT: simT.current,
                  ledgerIdx: e.twinLedgerIdx
                });
                setSnapped((n) => n + 1);
                return;
              }
              e.state = "passed";
              seenIds.current.add(e.id);
              seenOrder.current.unshift(e.id);
              if (seenOrder.current.length > 18) {
                const dropped = seenOrder.current.pop();
                seenIds.current.delete(dropped);
              }
              passedStamps.current.push(e.et);
              rtWindow.push(simT.current);
              setRtTotal((n) => n + 1);
            }
          }
        });
        events.current = events.current.filter((e) => {
          if (e.state === "dup" || e.state === "late") {
            return simT.current - e.endedAt < 0.55;
          }
          if (e.state === "passed") {
            const x = eventTimeToX(e.et, simT.current);
            return x > -4;
          }
          return true;
        });
        twinLinks.current = twinLinks.current.filter((l) => simT.current - l.fromT < 0.55);
        while (passedStamps.current.length > 0 && passedStamps.current[0] <= wm - 0.05) {
          passedStamps.current.shift();
          setWhCount((n) => n + 1);
        }
        const oneAgo = simT.current - 1;
        while (rtWindow.length > 0 && rtWindow[0] < oneAgo) rtWindow.shift();
        rtBank += dt;
        if (rtBank > 0.2) {
          rtBank = 0;
          setRtCount(rtWindow.length);
          setDriftSeries((prev) => {
            const next = [...prev, { t: simT.current, rt: rtWindow.length }];
            return next.slice(-90);
          });
        }
        if (Math.floor(simT.current * 10) % 2 === 0) {
          setLedger([...seenOrder.current]);
        }
        renderStage(null, events.current, simT.current, twinLinks.current);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }, [running, rate, dupPct, latePct, dedupOn, lateGateOn, reduceMotion]);
    useEffect(() => {
      reset();
    }, [dedupOn, lateGateOn]);
    function eventTimeToX(et, now) {
      const age = now - et;
      return 100 - age / CV_STAGE_SECONDS * 100;
    }
    const eventsLayerRef = useRef(null);
    const linksSvgRef = useRef(null);
    function renderStage(_svg, list, now, links) {
      const layer = eventsLayerRef.current;
      if (layer) {
        const need = list.length;
        let pool = layer.children;
        while (pool.length < need) {
          const el = document.createElement("div");
          el.className = "cv-ev";
          const inner = document.createElement("span");
          el.appendChild(inner);
          layer.appendChild(el);
        }
        while (pool.length > need) layer.removeChild(pool[pool.length - 1]);
        list.forEach((e, i) => {
          const el = pool[i];
          const x = eventTimeToX(e.et, now);
          el.style.left = x.toFixed(2) + "%";
          el.style.top = e.y.toFixed(2) + "%";
          el.className = `cv-ev cv-${e.state}${e.state === "dup" ? " cv-dup" : ""}`;
          const inner = el.firstChild;
          if (inner.textContent !== e.id) inner.textContent = e.id;
        });
      }
      const lyr2 = linksSvgRef.current;
      if (lyr2) {
        for (let i = lyr2.childNodes.length - 1; i >= 0; i--) lyr2.removeChild(lyr2.childNodes[i]);
        const ns = "http://www.w3.org/2000/svg";
        links.forEach((l) => {
          const path = document.createElementNS(ns, "path");
          const age = now - l.fromT;
          const op = Math.max(0, 1 - age / 0.55);
          const fromX = CV_GATE_X, fromY = CV_BASELINE_Y;
          const toX = 99.5;
          const toY = 6 + l.ledgerIdx * 4.6;
          path.setAttribute("d", `M ${fromX} ${fromY} Q 92 ${fromY - 25} ${toX} ${toY}`);
          path.setAttribute("stroke", "#E41E3F");
          path.setAttribute("stroke-width", "0.45");
          path.setAttribute("fill", "none");
          path.setAttribute("stroke-dasharray", "1.2 0.8");
          path.setAttribute("vector-effect", "non-scaling-stroke");
          path.setAttribute("opacity", op.toFixed(2));
          lyr2.appendChild(path);
        });
      }
    }
    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
    const watermarkX = 100 - CV_WATERMARK_LAG / CV_STAGE_SECONDS * 100;
    const gateColor = "#2D7DFF";
    const drift = rtTotal - whCount;
    const spark = useMemo(() => {
      if (driftSeries.length < 2) return "";
      const xs = driftSeries;
      const max = Math.max(1, ...xs.map((p) => p.rt));
      const min = Math.min(0, ...xs.map((p) => p.rt));
      const range = max - min || 1;
      return xs.map((p, i) => {
        const x = i / (xs.length - 1) * 100;
        const y = 100 - (p.rt - min) / range * 100;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ");
    }, [driftSeries]);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live simulator \xB7 streaming boundary",
        title: "The Ingestion Conveyor Belt",
        meta: `${rate}/s \xB7 dup ${dupPct}% \xB7 late ${latePct}%`,
        caption: `Time advances left\u2192right. The watermark trails ~${CV_WATERMARK_LAG}s behind "now". Two independent guards: dedup by event_id, drop-late by watermark: protect the warehouse boundary.`
      },
      /* @__PURE__ */ React.createElement("div", { className: "cv-stage", ref: stageRef }, /* @__PURE__ */ React.createElement("div", { className: "cv-field" }, /* @__PURE__ */ React.createElement("svg", { className: "cv-bg-svg", viewBox: "0 0 100 100", preserveAspectRatio: "none" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("pattern", { id: "cv-grid", x: "0", y: "0", width: "5", height: "10", patternUnits: "userSpaceOnUse" }, /* @__PURE__ */ React.createElement("path", { d: "M 5 0 L 0 0 0 10", fill: "none", stroke: "rgba(11,18,31,0.05)", strokeWidth: "0.15", vectorEffect: "non-scaling-stroke" }))), /* @__PURE__ */ React.createElement("rect", { width: "100", height: "100", fill: "url(#cv-grid)" }), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: "0",
          y1: CV_BASELINE_Y,
          x2: "100",
          y2: CV_BASELINE_Y,
          stroke: "rgba(11,18,31,0.14)",
          strokeWidth: "1",
          strokeDasharray: "2 2",
          vectorEffect: "non-scaling-stroke"
        }
      ), /* @__PURE__ */ React.createElement("rect", { x: "0", y: "0", width: watermarkX, height: "100", fill: "rgba(49,162,76,0.04)" }), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: watermarkX,
          y1: "0",
          x2: watermarkX,
          y2: "100",
          stroke: "#B8770A",
          strokeWidth: "1.5",
          strokeDasharray: "3 2",
          vectorEffect: "non-scaling-stroke"
        }
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: CV_GATE_X,
          y1: "0",
          x2: CV_GATE_X,
          y2: "100",
          stroke: "#2D7DFF",
          strokeWidth: "1.8",
          vectorEffect: "non-scaling-stroke"
        }
      ), /* @__PURE__ */ React.createElement(
        "rect",
        {
          x: CV_GATE_X - 3,
          y: "60",
          width: "6",
          height: "18",
          fill: "rgba(45,125,255,0.12)",
          stroke: "#2D7DFF",
          strokeWidth: "0.8",
          vectorEffect: "non-scaling-stroke"
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "cv-labels" }, /* @__PURE__ */ React.createElement("div", { className: "cv-label-settled", style: { left: 0, width: `${watermarkX}%` } }, "\u25C4 SETTLED \xB7 behind watermark"), /* @__PURE__ */ React.createElement("div", { className: "cv-label-watermark", style: { left: `${watermarkX}%` } }, "WATERMARK", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", null, "now \u2212 ", CV_WATERMARK_LAG, "s")), /* @__PURE__ */ React.createElement("div", { className: "cv-label-gate", style: { left: `${CV_GATE_X}%` } }, /* @__PURE__ */ React.createElement("div", { className: "g" }, "GATE"), /* @__PURE__ */ React.createElement("div", { className: "gsub" }, dedupOn && lateGateOn ? "dedup \xB7 late" : dedupOn ? "dedup only" : lateGateOn ? "late only" : "pass-all")), /* @__PURE__ */ React.createElement("div", { className: "cv-label-now" }, "NOW \u25BA")), /* @__PURE__ */ React.createElement("div", { className: "cv-events-layer", ref: eventsLayerRef }), /* @__PURE__ */ React.createElement("svg", { className: "cv-links-svg", viewBox: "0 0 100 100", preserveAspectRatio: "none", ref: linksSvgRef })), /* @__PURE__ */ React.createElement("div", { className: "cv-ledger" }, /* @__PURE__ */ React.createElement("div", { className: "cv-ledger-head" }, /* @__PURE__ */ React.createElement("span", null, "SEEN"), /* @__PURE__ */ React.createElement("span", { className: "n" }, ledger.length)), /* @__PURE__ */ React.createElement("div", { className: "cv-ledger-body" }, ledger.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty" }, "ledger empty") : ledger.map((id, i) => /* @__PURE__ */ React.createElement("div", { key: id + "-" + i, className: "cv-ledger-row" }, /* @__PURE__ */ React.createElement("span", { className: "i" }, i + 1), /* @__PURE__ */ React.createElement("code", null, id)))), /* @__PURE__ */ React.createElement("div", { className: "cv-ledger-foot" }, dedupOn ? "dedup by event_id \xB7 on" : "dedup \xB7 OFF"))),
      !beginner && /* @__PURE__ */ React.createElement("div", { className: "cv-drawer-2" }, /* @__PURE__ */ React.createElement("div", { className: "cv-drawer-head" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "LATE DRAWER"), /* @__PURE__ */ React.createElement("span", { className: "c" }, lateDrawer.length), /* @__PURE__ */ React.createElement("span", { className: "h" }, "events arrived after their window closed")), /* @__PURE__ */ React.createElement("div", { className: "cv-drawer-rows" }, lateDrawer.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty" }, "no late events in the window") : lateDrawer.map((e, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "cv-late-row" }, /* @__PURE__ */ React.createElement("code", null, e.id), /* @__PURE__ */ React.createElement("span", { className: "et" }, "event-time t=", e.et.toFixed(1), "s"), /* @__PURE__ */ React.createElement("span", { className: "lag" }, "+", e.lag.toFixed(1), "s late"))))),
      /* @__PURE__ */ React.createElement("div", { className: `cv-readouts ${beginner ? "cv-readouts-beginner" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "cv-r cv-r-rt" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Real-time (events/s)"), /* @__PURE__ */ React.createElement("div", { className: "v" }, rtCount), /* @__PURE__ */ React.createElement("div", { className: "s" }, "1-second rolling window \xB7 jittery")), /* @__PURE__ */ React.createElement("div", { className: "cv-r cv-r-wh" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Warehouse \xB7 settled rows"), /* @__PURE__ */ React.createElement("div", { className: "v" }, whCount.toLocaleString()), /* @__PURE__ */ React.createElement("div", { className: "s" }, "event-time \u2264 watermark \xB7 stable")), !beginner && /* @__PURE__ */ React.createElement("div", { className: `cv-r ${Math.abs(drift) > 8 ? "warn" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Passed \u2212 settled"), /* @__PURE__ */ React.createElement("div", { className: "v" }, drift >= 0 ? "+" : "", drift), /* @__PURE__ */ React.createElement("div", { className: "s" }, "in-flight (passed, not yet behind watermark)"), /* @__PURE__ */ React.createElement("svg", { className: "cv-spark", viewBox: "0 0 100 100", preserveAspectRatio: "none" }, /* @__PURE__ */ React.createElement("path", { d: spark, stroke: "var(--accent)", strokeWidth: "1.2", fill: "none" }))), /* @__PURE__ */ React.createElement("div", { className: `cv-r cv-r-gate ${snapped + droppedLate > 0 ? "danger" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Gate actions"), /* @__PURE__ */ React.createElement("div", { className: "v cv-gate-nums" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, snapped), " dedup"), !beginner && /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, droppedLate), " late")), /* @__PURE__ */ React.createElement("div", { className: "s" }, "blocked at the boundary"))),
      /* @__PURE__ */ React.createElement("label", { className: "cv-mode" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: beginner, onChange: (e) => setBeginner(e.target.checked) }), /* @__PURE__ */ React.createElement("span", { className: "cv-mode-name" }, "Beginner mode"), /* @__PURE__ */ React.createElement("span", { className: "cv-mode-sub" }, beginner ? "focus on dedup only \xB7 late drawer hidden" : "all guards visible")),
      /* @__PURE__ */ React.createElement("div", { className: "cv-ctls" }, /* @__PURE__ */ React.createElement("div", { className: "cv-guards" }, /* @__PURE__ */ React.createElement("label", { className: `cv-guard ${dedupOn ? "on" : ""}` }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: dedupOn, onChange: (e) => setDedupOn(e.target.checked) }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "n" }, "Dedup by ", /* @__PURE__ */ React.createElement("code", null, "event_id")), /* @__PURE__ */ React.createElement("div", { className: "d" }, "Suppress events whose id the gate has already passed"))), !beginner && /* @__PURE__ */ React.createElement("label", { className: `cv-guard ${lateGateOn ? "on" : ""}` }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: lateGateOn, onChange: (e) => setLateGateOn(e.target.checked) }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "n" }, "Drop late (past watermark)"), /* @__PURE__ */ React.createElement("div", { className: "d" }, "Events whose event-time trails the watermark at arrival")))), /* @__PURE__ */ React.createElement("div", { className: "cv-sliders" }, /* @__PURE__ */ React.createElement("div", { className: "cv-slider" }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Event rate"), /* @__PURE__ */ React.createElement("span", { className: "val" }, rate, "/s")), /* @__PURE__ */ React.createElement("input", { type: "range", min: 3, max: 60, value: rate, onChange: (e) => setRate(+e.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "cv-slider warn" }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Duplicate %"), /* @__PURE__ */ React.createElement("span", { className: "val" }, dupPct, "%")), /* @__PURE__ */ React.createElement("input", { type: "range", min: 0, max: 45, value: dupPct, onChange: (e) => setDupPct(+e.target.value) })), !beginner && /* @__PURE__ */ React.createElement("div", { className: "cv-slider warn" }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Late %"), /* @__PURE__ */ React.createElement("span", { className: "val" }, latePct, "%")), /* @__PURE__ */ React.createElement("input", { type: "range", min: 0, max: 35, value: latePct, onChange: (e) => setLatePct(+e.target.value) }))), /* @__PURE__ */ React.createElement("div", { className: "cv-btns" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => setRunning((r) => !r) }, running ? "\u23F8 Pause" : "\u25B6 Resume"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: reset }, "\u21BB Reset")))
    );
  }
  function Ch1_5_Streaming({ chapter, internalMode }) {
    const N = MMNames(internalMode);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.ink,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: `Streaming: <span class='accent'>real-time</span> and <span class='accent'>accurate</span> are pick-two.`,
        hook: `Events arrive continuously: clicks, impressions, heartbeats. <strong>${N.flink}</strong> on top of <strong>${N.kafkastreams}</strong> gives you answers in seconds. ${N.snowflake} gives you answers you can bet a launch on. <em>They are not the same number.</em> Your job: know which one your decision needs, and bridge the two cleanly.`,
        meta: [
          { k: "Streaming engine", v: N.flink },
          { k: "Bus", v: N.kafka },
          { k: "Warehouse lag", v: "~4h typical" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "2.1" }, "Continuous processing"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Micro-batch vs continuous, exactly-once vs at-least-once."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Batch engines pull windows of events on a schedule. Streaming engines consume one event at a time, as it arrives. The trade-off is ", /* @__PURE__ */ React.createElement("strong", null, "latency vs correctness"), ": streams answer in seconds but hand you partial, possibly-duplicated data; batch settles for hours but hands you one row per event, dedupped, joined, and governed."), /* @__PURE__ */ React.createElement("div", { className: "cards-3" }, /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, "Latency"), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Seconds vs hours"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "Dashboards for on-call humans want seconds. Exec slides want hours (but correct).")), /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, "Delivery"), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Exactly-once \u2286 at-least-once + dedup"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, '"Exactly-once" is at-least-once with a deterministic dedup key applied at the warehouse boundary.')), /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, "Window"), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Tumbling \xB7 sliding \xB7 session"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "Pick a window, commit to the watermark. Late events either land in the next window or drop.")))), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "2.2" }, "The boundary problem"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Every stream hitting the warehouse needs a dedup gate and a watermark."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "The bus re-delivers. Producers retry. Networks flap. Clocks disagree. If you take streaming data and", /* @__PURE__ */ React.createElement("code", null, "INSERT INTO"), " a Snowflake fact table without guards, you will (a) double-count some events and (b) miscount any day whose late events arrive after the rollup runs. The two guards are independent: ", /* @__PURE__ */ React.createElement("strong", null, "dedup"), " fixes re-delivery, ", /* @__PURE__ */ React.createElement("strong", null, "watermark"), " fixes late arrival. Toggle each below and watch what it catches."), /* @__PURE__ */ React.createElement(ConveyorSim, { internalMode })), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "2.3" }, "The dedup template"), /* @__PURE__ */ React.createElement("div", { className: "code" }, /* @__PURE__ */ React.createElement("div", { className: "code-head" }, /* @__PURE__ */ React.createElement("span", null, "fct_events_dedup.sql \xB7 the warehouse boundary"), /* @__PURE__ */ React.createElement("span", { className: "lang" }, "SQL")), /* @__PURE__ */ React.createElement("div", { className: "code-body", dangerouslySetInnerHTML: {
      __html: `<span class="tok-c">-- Materialize one row per event_id, even when ${N.kafka} redelivers.</span>
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
    } }))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      `<b>Trusting sampled real-time as ground truth.</b> "${N.flink} says 4.2M, the deck says 4.2M." The deck will be cited in a launch review. The stream will have drifted 90 minutes later. Always reconcile with the warehouse count before anything permanent.`,
      `<b>"The producer promised exactly-once" \u2192 skipping dedup.</b> Producers lie, retry logic fires, and bus partitions re-order. Dedup at every warehouse boundary: this is non-negotiable.`,
      "<b>Processing day N before its watermark closes.</b> A daily rollup that runs at 00:05 will miss an hour of late-arriving events. Schedule against the watermark, not the wall clock."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      `<b>Signal table per stream.</b> A separate tiny table that records when a watermark closed for a (source, ds) pair. Downstream ${N.waitForSignal} waits on the <em>signal</em>, not the data.`,
      `<b>Dedup at every boundary.</b> <code>ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_ts DESC) = 1</code>. Same template everywhere.`,
      "<b>Weekly real-time vs warehouse reconciliation.</b> Compute the delta. Alert on drift &gt; X%. The drift itself is a bug-finder: a producer misbehaving, a bus partition stuck, a watermark misconfigured."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Real-time and accurate are pick-two.</b> Pick what your decision needs, not what feels impressive.",
      `<b>Every stream \u2192 warehouse boundary dedups AND watermarks.</b> Two independent guards; both required.`,
      "<b>Wait on the signal, not the data.</b> Data can land partial. Signal lands once, correctly, and only when the watermark closes."
    ] }));
  }
  window.Ch1_5_Streaming = Ch1_5_Streaming;
})();
