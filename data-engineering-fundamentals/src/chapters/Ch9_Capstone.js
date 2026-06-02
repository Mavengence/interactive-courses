(() => {
  const { useState, useEffect, useRef } = React;
  const STAGES = [
    { k: "merge", n: "01", ref: "Ch03 \xB7 Store", title: "Cumulative merge", sub: "FULL OUTER JOIN yesterday \u2295 today", color: "#7C5CFF", ink: "#6E4BFF" },
    { k: "write", n: "02", ref: "Ch05 \xB7 Orchestrate", title: "Idempotent write", sub: "INSERT OVERWRITE partition ds", color: "#2D7DFF", ink: "#0060FD" },
    { k: "watermark", n: "03", ref: "Ch02 \xB7 Streaming", title: "Watermark + dedup", sub: "ROW_NUMBER \xB7 event_ts \u2265 ds", color: "#22D3EE", ink: "#0B798A" },
    { k: "dq", n: "04", ref: "Ch06 \xB7 Quality", title: "Data-quality gate", sub: "row-count \xB7 freshness \xB7 unique", color: "#31A24C", ink: "#267E3B" },
    { k: "govern", n: "05", ref: "Ch09 \xB7 Govern", title: "Access Gateway deploy", sub: "PII actors \xB7 data_classification", color: "#B8770A", ink: "#986308" },
    { k: "semantic", n: "06", ref: "Ch08 \xB7 Serve", title: "Semantic binding", sub: "metric \u2192 physical column", color: "#E41E3F", ink: "#D81A39" }
  ];
  const USER_POOL = [
    // active — normal flow
    { id: "a1", kind: "paid", user_id: "u-A41", owner: "alice@example.com", sev: 2, late: false, dup: false },
    { id: "a2", kind: "paid", user_id: "u-B12", owner: "bob@example.com", sev: 4, late: false, dup: false },
    { id: "a3", kind: "paid", user_id: "u-C77", owner: "carol@example.com", sev: 1, late: false, dup: false },
    { id: "a4", kind: "paid", user_id: "u-D02", owner: "dan@example.com", sev: 3, late: false, dup: false },
    { id: "a5", kind: "paid", user_id: "u-E19", owner: "eve@example.com", sev: 2, late: false, dup: false },
    { id: "a6", kind: "paid", user_id: "u-F88", owner: "frank@example.com", sev: 5, late: false, dup: false },
    { id: "a7", kind: "paid", user_id: "u-G33", owner: "grace@example.com", sev: 2, late: false, dup: false },
    { id: "a8", kind: "paid", user_id: "u-H21", owner: "henry@example.com", sev: 1, late: false, dup: false },
    { id: "a9", kind: "paid", user_id: "u-J40", owner: "iris@example.com", sev: 4, late: false, dup: false },
    // churned (yesterday-only) — dropped by LEFT JOIN if merge broken
    { id: "r1", kind: "churned", user_id: "u-xX01", owner: "inactive@example.com", sev: 0, late: false, dup: false },
    { id: "r2", kind: "churned", user_id: "u-xX02", owner: "inactive@example.com", sev: 0, late: false, dup: false },
    // new (today-only) — always flow
    { id: "n1", kind: "new", user_id: "u-nN01", owner: "jack@example.com", sev: 3, late: false, dup: false },
    { id: "n2", kind: "new", user_id: "u-nN02", owner: "kate@example.com", sev: 1, late: false, dup: false },
    // late — watermark should spill these
    { id: "l1", kind: "late", user_id: "u-nL77", owner: "leo@example.com", sev: 2, late: true, dup: false },
    { id: "l2", kind: "late", user_id: "u-nL78", owner: "mia@example.com", sev: 3, late: true, dup: false },
    // duplicate — dedup should drop these
    { id: "d1", kind: "dup", user_id: "u-nA41", owner: "alice@example.com", sev: 2, late: false, dup: true }
    // dupe of a1
  ];
  const LANE_SECONDS = 9;
  const SPAWN_EVERY = 0.55;
  const GATE_X = { source: 2, merge: 16, write: 30, watermark: 44, dq: 58, govern: 72, semantic: 86, analyst: 98 };
  const TUTORIAL = [
    { stage: null, title: "Pipeline running clean", caption: "All six contracts hold. Rows flow source \u2192 analyst, every one arrives." },
    { stage: "merge", title: "Break the MERGE contract", caption: "LEFT JOIN drops yesterday-only users. Watch the churned (\xD7) rows vanish at gate 1." },
    { stage: "write", title: "Break the WRITE contract", caption: "INSERT (non-idempotent) doubles rows on retry. Phantom duplicates appear after gate 2." },
    { stage: "watermark", title: "Break the WATERMARK contract", caption: "Late rows pass through silently instead of spilling to the side table: bad data lands." },
    { stage: "dq", title: "Break the DQ contract", caption: "Quality checks miss the bad batch. Rows halt; signal never fires; downstream blocked." },
    { stage: "govern", title: "Break the GOVERN contract", caption: "Access Gateway rejects the deploy. Rows blocked at gate 5: nothing reaches the analyst." },
    { stage: "semantic", title: "Break the SEMANTIC contract", caption: "Metric layer broken. Rows arrive but the downstream query references an unbound column: wrong answer." },
    { stage: null, title: "All contracts restored", caption: "Pipeline back to clean. The lesson: every gate is load-bearing." }
  ];
  const TUTORIAL_STEP_MS = 6500;
  const EMPTY_BRK = { merge: false, write: false, watermark: false, dq: false, govern: false, semantic: false };
  function LivingPipeline({ internalMode, reduceMotion }) {
    const N = MMNames(internalMode);
    const [brk, setBrk] = useState(EMPTY_BRK);
    const [running, setRunning] = useState(true);
    const toggleBreak = (k) => setBrk((b) => ({ ...b, [k]: !b[k] }));
    const resetAll = () => setBrk({ ...EMPTY_BRK });
    const [tutorialStep, setTutorialStep] = useState(-1);
    const tutorial = tutorialStep >= 0 ? TUTORIAL[tutorialStep] : null;
    const startTutorial = () => {
      setBrk({ ...EMPTY_BRK });
      setRunning(true);
      setTutorialStep(0);
    };
    const stopTutorial = () => {
      setTutorialStep(-1);
      setBrk({ ...EMPTY_BRK });
    };
    const rows = useRef([]);
    const idSeq = useRef(0);
    const tSim = useRef(0);
    const spawnBank = useRef(0);
    const rafRef = useRef(null);
    const [stats, setStats] = useState({
      srcScanned: 0,
      merged: 0,
      dropped: 0,
      written: 0,
      dup: 0,
      lateSpilled: 0,
      onTime: 0,
      dqFails: 0,
      dqPass: 0,
      govPass: 0,
      govBlocked: 0,
      semHit: 0,
      semMiss: 0,
      analystAnswered: 0
    });
    const statsRef = useRef(stats);
    statsRef.current = stats;
    const [signalPulse, setSignalPulse] = useState(0);
    const rowLayerRef = useRef(null);
    const spillLayerRef = useRef(null);
    const reset = () => {
      rows.current = [];
      tSim.current = 0;
      spawnBank.current = 0;
      idSeq.current = 0;
      setStats({
        srcScanned: 0,
        merged: 0,
        dropped: 0,
        written: 0,
        dup: 0,
        lateSpilled: 0,
        onTime: 0,
        dqFails: 0,
        dqPass: 0,
        govPass: 0,
        govBlocked: 0,
        semHit: 0,
        semMiss: 0,
        analystAnswered: 0
      });
      if (rowLayerRef.current) rowLayerRef.current.innerHTML = "";
      if (spillLayerRef.current) spillLayerRef.current.innerHTML = "";
    };
    useEffect(() => {
      if (!running) return;
      let last = performance.now();
      let statBank = 0;
      const tick = (now) => {
        const dtMs = Math.min(64, now - last);
        last = now;
        const dt = dtMs / 1e3;
        tSim.current += dt;
        spawnBank.current += dt;
        while (spawnBank.current >= SPAWN_EVERY) {
          spawnBank.current -= SPAWN_EVERY;
          const user = USER_POOL[Math.floor(Math.random() * USER_POOL.length)];
          rows.current.push({
            id: ++idSeq.current,
            key: `${user.id}-${idSeq.current}`,
            user,
            t: 0,
            // 0 at source, 1 at analyst
            lane: 0.35 + Math.random() * 0.35,
            // vertical lane within the main conveyor (0..1 of lane height)
            state: "flowing",
            // flowing | spilled | dropped | answered
            spilled: null,
            // {y, yTarget, born}
            dq_failed_reason: null
          });
        }
        const speed = 1 / LANE_SECONDS;
        const newStats = { ...statsRef.current };
        let statsDirty = false;
        rows.current.forEach((r) => {
          if (r.state !== "flowing") return;
          const prevT = r.t;
          r.t = Math.min(1.01, r.t + dt * speed);
          const prevX = tToX(prevT);
          const x = tToX(r.t);
          if (prevX < GATE_X.source && x >= GATE_X.source) {
            newStats.srcScanned++;
            statsDirty = true;
          }
          if (prevX < GATE_X.merge && x >= GATE_X.merge) {
            if (brk.merge && r.user.kind === "churned") {
              r.state = "dropped";
              r.dropStage = "merge";
              r.dropT = tSim.current;
              newStats.dropped++;
              statsDirty = true;
              return;
            }
            newStats.merged++;
            statsDirty = true;
          }
          if (prevX < GATE_X.write && x >= GATE_X.write) {
            newStats.written++;
            if (brk.write && Math.random() < 0.32) {
              rows.current.push({
                id: ++idSeq.current,
                key: `phantom-${idSeq.current}`,
                user: r.user,
                t: r.t - 0.015,
                lane: r.lane + 0.08,
                state: "flowing",
                phantom: true
              });
              newStats.dup++;
            }
            statsDirty = true;
          }
          if (prevX < GATE_X.watermark && x >= GATE_X.watermark) {
            if (r.user.late && !brk.watermark) {
              r.state = "spilled";
              r.spilled = { born: tSim.current, yTarget: 0.92 };
              newStats.lateSpilled++;
              statsDirty = true;
              return;
            }
            if (r.user.dup && !brk.watermark) {
              r.state = "dropped";
              r.dropStage = "dedup";
              r.dropT = tSim.current;
              newStats.dup++;
              statsDirty = true;
              return;
            }
            if (brk.watermark && (r.user.late || r.user.dup)) {
              r.silentlyBad = true;
            }
            newStats.onTime++;
            statsDirty = true;
          }
          if (prevX < GATE_X.dq && x >= GATE_X.dq) {
            if (brk.dq) {
              r.state = "dqhold";
              r.dqHeldAt = tSim.current;
              newStats.dqFails++;
              statsDirty = true;
              return;
            }
            newStats.dqPass++;
            statsDirty = true;
          }
          if (prevX < GATE_X.govern && x >= GATE_X.govern) {
            if (brk.govern) {
              r.state = "govblocked";
              r.govAt = tSim.current;
              newStats.govBlocked++;
              statsDirty = true;
              return;
            }
            newStats.govPass++;
            statsDirty = true;
          }
          if (prevX < GATE_X.semantic && x >= GATE_X.semantic) {
            if (brk.semantic) {
              r.halluc = true;
              newStats.semMiss++;
            } else {
              newStats.semHit++;
            }
            statsDirty = true;
          }
          if (r.t >= 1 && r.state === "flowing") {
            r.state = "arrived";
            r.arrivedAt = tSim.current;
            if (!r.halluc && !r.phantom) newStats.analystAnswered++;
            statsDirty = true;
          }
        });
        rows.current = rows.current.filter((r) => {
          if (r.state === "arrived") return tSim.current - r.arrivedAt < 0.8;
          if (r.state === "dropped") return tSim.current - r.dropT < 0.6;
          if (r.state === "govblocked") return tSim.current - r.govAt < 1.1;
          if (r.state === "dqhold") return tSim.current - r.dqHeldAt < 1.4;
          if (r.state === "spilled") return tSim.current - r.spilled.born < 1.5;
          return true;
        });
        paintRows();
        statBank += dt;
        if (statBank > 0.12 && statsDirty) {
          statBank = 0;
          setStats(newStats);
          statsRef.current = newStats;
        } else if (statsDirty) {
          statsRef.current = newStats;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }, [running, brk.merge, brk.write, brk.watermark, brk.dq, brk.govern, brk.semantic]);
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
    function paintRows() {
      const layer = rowLayerRef.current;
      if (!layer) return;
      const list = rows.current;
      const need = list.length;
      let pool = layer.children;
      while (pool.length < need) {
        const el = document.createElement("div");
        el.className = "lp-row";
        const inner = document.createElement("span");
        el.appendChild(inner);
        layer.appendChild(el);
      }
      while (pool.length > need) layer.removeChild(pool[pool.length - 1]);
      list.forEach((r, i) => {
        const el = pool[i];
        let x, y;
        const LANE_TOP = 32;
        const LANE_H = 28;
        if (r.state === "spilled") {
          x = GATE_X.watermark;
          const age = tSim.current - r.spilled.born;
          y = LANE_TOP + LANE_H * r.lane + Math.min(1, age * 1.4) * 40;
        } else if (r.state === "dropped") {
          x = r.dropStage === "merge" ? GATE_X.merge : GATE_X.watermark;
          y = LANE_TOP + LANE_H * r.lane;
          const angle = r.id * 47 % 8 * 45;
          const sx = (Math.cos(angle * Math.PI / 180) * 9).toFixed(1);
          const sy = (Math.sin(angle * Math.PI / 180) * 9 - 4).toFixed(1);
          el.style.setProperty("--sx", `${sx}%`);
          el.style.setProperty("--sy", `${sy}%`);
        } else if (r.state === "govblocked") {
          x = GATE_X.govern;
          y = LANE_TOP + LANE_H * r.lane;
        } else if (r.state === "dqhold") {
          x = GATE_X.dq - 1.5;
          y = LANE_TOP + LANE_H * r.lane;
        } else {
          x = tToX(r.t);
          y = LANE_TOP + LANE_H * r.lane;
        }
        el.style.left = x.toFixed(2) + "%";
        el.style.top = y.toFixed(2) + "%";
        let cls = "lp-row";
        cls += " lp-k-" + r.user.kind;
        if (r.state === "dropped") cls += " lp-drop";
        if (r.state === "spilled") cls += " lp-spill";
        if (r.state === "govblocked") cls += " lp-govblock";
        if (r.state === "dqhold") cls += " lp-dqhold";
        if (r.state === "arrived") cls += " lp-arrived";
        if (r.halluc) cls += " lp-halluc";
        if (r.phantom) cls += " lp-phantom";
        if (r.silentlyBad) cls += " lp-silentbad";
        el.className = cls;
        const label = r.user.user_id;
        if (el.firstChild.textContent !== label) el.firstChild.textContent = label;
      });
    }
    function tToX(t) {
      return GATE_X.source + t * (GATE_X.analyst - GATE_X.source);
    }
    const pipelineGreen = !brk.merge && !brk.write && !brk.watermark && !brk.dq && !brk.govern && !brk.semantic;
    useEffect(() => {
      if (!pipelineGreen) return;
      const id = setInterval(() => setSignalPulse((p) => p + 1), 3e3);
      return () => clearInterval(id);
    }, [pipelineGreen]);
    const consumerView = (() => {
      if (brk.semantic) return {
        kind: "err",
        v: "ERROR",
        caption: "metric unbound \xB7 downstream query references a column that no longer exists"
      };
      if (brk.dq) return {
        kind: "wait",
        v: "-",
        caption: "DQ failed \xB7 signal never fired \xB7 dashboard frozen on yesterday\u2019s number"
      };
      if (brk.govern) return {
        kind: "wait",
        v: "-",
        caption: "Access Gateway blocked the deploy \xB7 no fresh data reached the consumer"
      };
      if (brk.merge) return {
        kind: "bad",
        v: "97.8%",
        caption: "churned users dropped \xB7 denominator undercount \xB7 ratio inflated"
      };
      if (brk.write) return {
        kind: "bad",
        v: "88.1%",
        caption: "retry double-counted rows \xB7 denominator inflated \xB7 ratio depressed"
      };
      if (brk.watermark) return {
        kind: "bad",
        v: "91.4%",
        caption: "late + duplicate rows slipped past the gate \xB7 drift in both directions"
      };
      return {
        kind: "good",
        v: "94.2%",
        caption: "source: analytics.conversion_7d \xB7 23 min ago \xB7 governed \xB7 traceable"
      };
    })();
    const ctlRowVis = stats.srcScanned > 0;
    return /* @__PURE__ */ React.createElement("div", { className: "lp-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "lp-stage" }, tutorial && /* @__PURE__ */ React.createElement("div", { className: "lp-tutorial-banner", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("div", { className: "lp-tutorial-step" }, /* @__PURE__ */ React.createElement("span", { className: "lp-tutorial-step-n" }, tutorialStep + 1), /* @__PURE__ */ React.createElement("span", { className: "lp-tutorial-step-of" }, "/ ", TUTORIAL.length)), /* @__PURE__ */ React.createElement("div", { className: "lp-tutorial-text" }, /* @__PURE__ */ React.createElement("div", { className: "lp-tutorial-title" }, tutorial.title), /* @__PURE__ */ React.createElement("div", { className: "lp-tutorial-caption" }, tutorial.caption)), /* @__PURE__ */ React.createElement("button", { className: "lp-tutorial-exit", onClick: stopTutorial, "aria-label": "Exit tutorial" }, "\u2715 exit"), /* @__PURE__ */ React.createElement("div", { className: "lp-tutorial-progress", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("div", { className: "lp-tutorial-progress-fill", key: tutorialStep }))), /* @__PURE__ */ React.createElement("svg", { className: "lp-bg-svg", viewBox: "0 0 100 100", preserveAspectRatio: "none" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("pattern", { id: "lp-grid", x: "0", y: "0", width: "4", height: "6", patternUnits: "userSpaceOnUse" }, /* @__PURE__ */ React.createElement("path", { d: "M 4 0 L 0 0 0 6", fill: "none", stroke: "rgba(11,18,31,0.05)", strokeWidth: "0.15", vectorEffect: "non-scaling-stroke" }))), /* @__PURE__ */ React.createElement("rect", { width: "100", height: "100", fill: "url(#lp-grid)" }), /* @__PURE__ */ React.createElement("rect", { x: "1", y: "32", width: "98", height: "28", rx: "0.8", fill: "rgba(45,125,255,0.04)" }), /* @__PURE__ */ React.createElement(
      "line",
      {
        x1: "1",
        y1: "46",
        x2: "99",
        y2: "46",
        stroke: "rgba(11,18,31,0.08)",
        strokeWidth: "0.3",
        strokeDasharray: "0.6 0.8",
        vectorEffect: "non-scaling-stroke"
      }
    ), /* @__PURE__ */ React.createElement(
      "rect",
      {
        x: GATE_X.watermark - 3,
        y: "78",
        width: "22",
        height: "14",
        rx: "0.8",
        fill: "rgba(184,119,10,0.06)",
        stroke: "rgba(184,119,10,0.35)",
        strokeWidth: "0.25",
        strokeDasharray: "1 0.8",
        vectorEffect: "non-scaling-stroke"
      }
    ), STAGES.map((s) => /* @__PURE__ */ React.createElement(
      "line",
      {
        key: s.k,
        x1: GATE_X[s.k],
        y1: "28",
        x2: GATE_X[s.k],
        y2: "64",
        stroke: brk[s.k] ? "#E41E3F" : s.color,
        strokeWidth: brk[s.k] ? "1.5" : "1",
        strokeDasharray: brk[s.k] ? "2 1" : "0",
        vectorEffect: "non-scaling-stroke"
      }
    )), /* @__PURE__ */ React.createElement("line", { x1: GATE_X.source, y1: "26", x2: GATE_X.source, y2: "66", stroke: "var(--fg-1)", strokeWidth: "1.2", vectorEffect: "non-scaling-stroke" }), /* @__PURE__ */ React.createElement("line", { x1: GATE_X.analyst, y1: "26", x2: GATE_X.analyst, y2: "66", stroke: "var(--fg-1)", strokeWidth: "1.2", vectorEffect: "non-scaling-stroke" })), /* @__PURE__ */ React.createElement("div", { className: "lp-labels" }, /* @__PURE__ */ React.createElement("div", { className: "lp-label lp-label-src", style: { left: `${GATE_X.source}%` } }, /* @__PURE__ */ React.createElement("div", { className: "lp-l-eyebrow" }, "raw source"), /* @__PURE__ */ React.createElement("div", { className: "lp-l-title" }, "events_today", /* @__PURE__ */ React.createElement("br", null), "+ users_yesterday")), STAGES.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.k, className: `lp-label lp-label-gate ${brk[s.k] ? "broken" : ""}`, style: { left: `${GATE_X[s.k]}%`, "--c": s.color, "--ink": s.ink } }, /* @__PURE__ */ React.createElement("div", { className: "lp-l-n" }, s.n), /* @__PURE__ */ React.createElement("div", { className: "lp-l-title" }, s.title), /* @__PURE__ */ React.createElement("div", { className: "lp-l-ref" }, s.ref), brk[s.k] && /* @__PURE__ */ React.createElement("div", { className: "lp-l-broken" }, "\u2715 BROKEN"))), /* @__PURE__ */ React.createElement("div", { className: "lp-label lp-label-analyst", style: { left: `${GATE_X.analyst}%` } }, /* @__PURE__ */ React.createElement("div", { className: "lp-l-eyebrow" }, "analyst"), /* @__PURE__ */ React.createElement("div", { className: "lp-l-title" }, "Jordan \xB7 Analyst"))), /* @__PURE__ */ React.createElement("div", { className: "lp-side-label", style: { left: `${GATE_X.watermark - 2}%` } }, /* @__PURE__ */ React.createElement("div", null, "fct_users_late"), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "late arrivals spill here: never dropped")), /* @__PURE__ */ React.createElement("div", { className: "lp-dataset" }, /* @__PURE__ */ React.createElement("div", { className: "lp-d-eyebrow" }, "dataset"), /* @__PURE__ */ React.createElement("div", { className: "lp-d-name" }, /* @__PURE__ */ React.createElement("code", null, "dim_users")), /* @__PURE__ */ React.createElement("div", { className: "lp-d-sub" }, "1,421,882 users \xB7 trial-to-paid journey \xB7 refreshed daily")), /* @__PURE__ */ React.createElement("div", { className: "lp-rows", ref: rowLayerRef }), /* @__PURE__ */ React.createElement("div", { className: "lp-gate-stats" }, /* @__PURE__ */ React.createElement("div", { className: "lp-gs", style: { left: `${GATE_X.merge}%` } }, /* @__PURE__ */ React.createElement("span", { className: "n" }, stats.merged.toLocaleString()), /* @__PURE__ */ React.createElement("span", { className: "lab" }, "merged"), brk.merge && /* @__PURE__ */ React.createElement("span", { className: "bad" }, "\u2212", stats.dropped, " churned dropped")), /* @__PURE__ */ React.createElement("div", { className: "lp-gs", style: { left: `${GATE_X.write}%` } }, /* @__PURE__ */ React.createElement("span", { className: "n" }, stats.written.toLocaleString()), /* @__PURE__ */ React.createElement("span", { className: "lab" }, "written"), brk.write && stats.dup > 0 && /* @__PURE__ */ React.createElement("span", { className: "bad" }, "+", stats.dup, " duped by retry")), /* @__PURE__ */ React.createElement("div", { className: "lp-gs", style: { left: `${GATE_X.watermark}%` } }, /* @__PURE__ */ React.createElement("span", { className: "n" }, stats.onTime.toLocaleString()), /* @__PURE__ */ React.createElement("span", { className: "lab" }, "on-time"), /* @__PURE__ */ React.createElement("span", { className: "sub" }, stats.lateSpilled, " spilled", brk.watermark ? ": BYPASSED" : "")), /* @__PURE__ */ React.createElement("div", { className: "lp-gs", style: { left: `${GATE_X.dq}%` } }, /* @__PURE__ */ React.createElement("span", { className: "n" }, stats.dqPass.toLocaleString()), /* @__PURE__ */ React.createElement("span", { className: "lab" }, "dq pass"), brk.dq && /* @__PURE__ */ React.createElement("span", { className: "bad" }, "signal not fired")), /* @__PURE__ */ React.createElement("div", { className: "lp-gs", style: { left: `${GATE_X.govern}%` } }, /* @__PURE__ */ React.createElement("span", { className: "n" }, stats.govPass.toLocaleString()), /* @__PURE__ */ React.createElement("span", { className: "lab" }, "deployed"), brk.govern && /* @__PURE__ */ React.createElement("span", { className: "bad" }, stats.govBlocked, " blocked")), /* @__PURE__ */ React.createElement("div", { className: "lp-gs", style: { left: `${GATE_X.semantic}%` } }, /* @__PURE__ */ React.createElement("span", { className: "n" }, stats.semHit.toLocaleString()), /* @__PURE__ */ React.createElement("span", { className: "lab" }, "bound"), brk.semantic && /* @__PURE__ */ React.createElement("span", { className: "bad" }, "no metric")))), /* @__PURE__ */ React.createElement("div", { className: "lp-console" }, /* @__PURE__ */ React.createElement("div", { className: "lp-console-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "lp-console-eyebrow" }, "sabotage console \xB7 break one contract, watch the blast radius"), /* @__PURE__ */ React.createElement("div", { className: "lp-console-title" }, "Six contracts. Every one is load-bearing.")), /* @__PURE__ */ React.createElement("div", { className: "lp-console-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: tutorial ? stopTutorial : startTutorial }, tutorial ? "\u2715 stop tutorial" : "\u25B6 guided tutorial"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: () => setRunning((r) => !r), disabled: !!tutorial }, running ? "\u23F8 pause" : "\u25B6 resume"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: () => {
      reset();
    }, disabled: !!tutorial }, "\u21BB reset counters"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: resetAll, disabled: pipelineGreen || !!tutorial }, "fix all"))), /* @__PURE__ */ React.createElement("div", { className: "lp-break-grid" }, STAGES.map((s) => {
      const contracts = BREAKAGE_COPY[s.k];
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: s.k,
          className: `lp-break ${brk[s.k] ? "on" : ""} ${tutorial ? "is-locked" : ""}`,
          style: { "--c": s.color, "--ink": s.ink },
          disabled: !!tutorial,
          onClick: () => toggleBreak(s.k)
        },
        /* @__PURE__ */ React.createElement("div", { className: "lp-break-head" }, /* @__PURE__ */ React.createElement("span", { className: "n" }, s.n), /* @__PURE__ */ React.createElement("span", { className: "title" }, s.title), /* @__PURE__ */ React.createElement("span", { className: `pill ${brk[s.k] ? "on" : ""}` }, brk[s.k] ? "broken" : "healthy")),
        /* @__PURE__ */ React.createElement("div", { className: "lp-break-good" }, /* @__PURE__ */ React.createElement("b", null, "if healthy:"), " ", contracts.good),
        /* @__PURE__ */ React.createElement("div", { className: "lp-break-bad" }, /* @__PURE__ */ React.createElement("b", null, "if broken:"), " ", contracts.bad),
        /* @__PURE__ */ React.createElement("div", { className: "lp-break-code" }, /* @__PURE__ */ React.createElement("code", null, contracts.code))
      );
    }))), /* @__PURE__ */ React.createElement("div", { className: "lp-downstream" }, /* @__PURE__ */ React.createElement("div", { className: "lp-signal" }, /* @__PURE__ */ React.createElement("div", { className: "lp-signal-head" }, /* @__PURE__ */ React.createElement("span", { className: "l-k" }, "signal table"), /* @__PURE__ */ React.createElement("span", { className: "l-v" }, /* @__PURE__ */ React.createElement("code", null, "users_signal"))), /* @__PURE__ */ React.createElement("div", { className: `lp-signal-body ${pipelineGreen ? "on" : "off"}` }, pipelineGreen ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "lp-pulse", key: signalPulse }, /* @__PURE__ */ React.createElement("span", { className: "d1" }), /* @__PURE__ */ React.createElement("span", { className: "d2" }), /* @__PURE__ */ React.createElement("span", { className: "d3" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "lp-sig-lab" }, "signal landed \xB7 downstream unblocked"), /* @__PURE__ */ React.createElement("div", { className: "lp-sig-sub" }, "every consumer wakes up now"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "lp-pulse-off" }, "\u2205"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "lp-sig-lab lp-sig-off" }, "signal never fired"), /* @__PURE__ */ React.createElement("div", { className: "lp-sig-sub" }, brk.dq ? "DQ failed \u2192 signal blocked." : brk.govern ? "Access Gateway blocked deploy \u2192 no signal." : brk.semantic ? "signal landed, but metric layer is broken." : brk.merge ? "signal landed, but dim is missing churned users." : brk.write ? "signal landed, but retry double-counted." : brk.watermark ? "signal landed, but late rows bypassed the gate." : "waiting\u2026"))))), /* @__PURE__ */ React.createElement("div", { className: "lp-consumer" }, /* @__PURE__ */ React.createElement("div", { className: "lp-consumer-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "lp-consumer-eyebrow" }, "downstream consumer \xB7 what Jordan sees"), /* @__PURE__ */ React.createElement("div", { className: "lp-consumer-title" }, "Conversion dashboard \xB7 last 7 days")), /* @__PURE__ */ React.createElement("code", { className: "lp-consumer-src" }, "analytics.conversion_7d")), /* @__PURE__ */ React.createElement("div", { className: `lp-consumer-body lp-consumer-${consumerView.kind}` }, /* @__PURE__ */ React.createElement("div", { className: "lp-consumer-v" }, consumerView.v), /* @__PURE__ */ React.createElement("div", { className: "lp-consumer-cap" }, consumerView.kind === "bad" && /* @__PURE__ */ React.createElement("span", { className: "lp-consumer-warn" }, "\u26A0 wrong by silent drift \xB7 "), consumerView.kind === "wait" && /* @__PURE__ */ React.createElement("span", { className: "lp-consumer-warn" }, "\u23F8 stale \xB7 "), consumerView.kind === "err" && /* @__PURE__ */ React.createElement("span", { className: "lp-consumer-warn" }, "\u2715 failed \xB7 "), consumerView.caption)))));
  }
  const BREAKAGE_COPY = {
    merge: {
      good: "FULL OUTER keeps churned and new users",
      bad: "LEFT JOIN silently drops every churned user",
      code: "FULL OUTER JOIN \u2192 LEFT JOIN"
    },
    write: {
      good: "INSERT OVERWRITE \xB7 retries are a no-op",
      bad: "INSERT INTO \xB7 retries double-count rows",
      code: "INSERT OVERWRITE \u2192 INSERT INTO"
    },
    watermark: {
      good: "late rows spill to __late table \xB7 dedup by event_id",
      bad: "late & duplicate rows slip through silently",
      code: "WHERE event_ts \u2265 ds \u2192 (removed)"
    },
    dq: {
      good: "row-count \xB7 freshness \xB7 unique: then signal",
      bad: "checks skipped \xB7 signal never lands \xB7 downstream blocks",
      code: 'on_failure="block_downstream"'
    },
    govern: {
      good: "PII actors declared \xB7 Access Gateway resolves",
      bad: "unannotated PII \xB7 Access Gateway refuses deploy",
      code: "actors: [PII_Person]"
    },
    semantic: {
      good: "metric bound to physical column \xB7 one definition",
      bad: "no binding \xB7 downstream queries hit an unbound column",
      code: "metrics: [conversion_7d]"
    }
  };
  function Ch9_Capstone({ chapter, internalMode, reduceMotion }) {
    const N = MMNames(internalMode);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.ink,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: `<span class='accent'>Break any one</span> of six contracts. Watch exactly what fails.`,
        hook: `<code>dim_users</code> is live. Six gates are running. Sabotage any one: MERGE drops churned users, dedup stops, watermark closes early. The downstream analyst still gets a number. Just the wrong one. That's why every gate exists.`,
        meta: [
          { k: "Dataset", v: "dim_users" },
          { k: "Contracts", v: "6 \xB7 all load-bearing" },
          { k: "Consumers", v: "dashboards \xB7 notebooks \xB7 analysts" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "10.1" }, "The living pipeline"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Rows flow left \u2192 right. Every gate is a chapter you read."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Each dot is a real user row streaming through ", /* @__PURE__ */ React.createElement("code", null, "dim_users"), ": on-time ones pass through all six gates to the analyst. Churned rows (from yesterday) only survive if MERGE uses ", /* @__PURE__ */ React.createElement("code", null, "FULL OUTER"), ". Late rows spill to the side-table ", /* @__PURE__ */ React.createElement("em", null, "only"), " if the watermark holds. Duplicate rows get dedupped ", /* @__PURE__ */ React.createElement("em", null, "only"), " if you didn't disable the guard. Every other contract has a twin failure mode."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Click any ", /* @__PURE__ */ React.createElement("strong", null, "sabotage button"), ' below the stage to break that contract. The break happens live: rows start dropping, stalling, or lying. Hit "ask the question" to watch what the analyst gets in return.'), /* @__PURE__ */ React.createElement(LivingPipeline, { internalMode, reduceMotion })), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>A pipeline is six contracts, not one SQL file.</b> Break any one and the whole downstream thesis falls.",
      "<b>Wait on the signal, not the data.</b> The signal table is the gate between <em>written</em> and <em>trusted</em>. Without DQ, it never fires.",
      "<b>Wrong answers look identical to right answers.</b> The MERGE/WRITE/WATERMARK breaks still return a number: just the wrong one. That's why the contracts exist.",
      `<b>Every file in this pipeline is a chapter you read.</b> When one feels confusing, re-open its chapter: don't patch around it.`
    ] }));
  }
  window.Ch9_Capstone = Ch9_Capstone;
})();
