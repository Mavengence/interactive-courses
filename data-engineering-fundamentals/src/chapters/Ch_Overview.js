(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  const OV_STAGES = [
    { id: "ingest", chap: "ingest", n: "01", title: "Ingest", tag: "where data is born", hex: "#7C5CFF", ink: "#6E4BFF", icon: "ingest", body: "Two clocks per event: when it happened, when you saw it. Mobile lag decides what you lose, and you can't see what you dropped." },
    { id: "stream", chap: "stream", n: "02", title: "Streaming", tag: "real-time bridge", hex: "#22D3EE", ink: "#0B798A", icon: "stream", body: "Sub-second dashboards via ClickHouse. Watermarks close windows. Fast loses on completeness; slow loses on latency." },
    { id: "store", chap: "store", n: "03", title: "Store", tag: "where data lives", hex: "#2D7DFF", ink: "#0060FD", icon: "store", body: "Yesterday \u2295 today, forever forward. One bug on Day 3 compounds invisibly until someone backtracks and backfills every row." },
    { id: "comp", chap: "comp", n: "04", title: "Compute", tag: "how data is read", hex: "#FF7A59", ink: "#D32A00", icon: "comp", body: "The planner bets on stale statistics. One hot join key routes 80% of traffic to worker 0: two minutes becomes two hours." },
    { id: "orch", chap: "orch", n: "05", title: "Orchestrate", tag: "Airflow & idempotency", hex: "#31A24C", ink: "#267E3B", icon: "orch", body: "Python DAGs. INSERT OVERWRITE. A task that ran twice must equal a task that ran once: non-negotiable." },
    { id: "qual", chap: "qual", n: "06", title: "Quality", tag: "ran \u2260 right", hex: "#E41E3F", ink: "#D81A39", icon: "qual", body: "Row counts, freshness, uniqueness. A bad row is worse than a missing row: the bad one ships to the exec deck." },
    { id: "disc", chap: "disc", n: "07", title: "Discover", tag: "six shortcuts, four hours", hex: "#B8770A", ink: "#986308", icon: "disc", body: "DataHub + OpenLineage. Owners in the catalog. Grepping dashboards for a metric definition in 2025? Doing it wrong." },
    { id: "serve", chap: "serve", n: "08", title: "Serve", tag: "metrics & semantic", hex: "#0091FF", ink: "#0070C5", icon: "serve", body: "Five teams, five DAU numbers, one meeting. The metrics layer is why that sentence is past tense." },
    { id: "gov", chap: "gov", n: "09", title: "Govern", tag: "the deploy gate", hex: "#8B5CF6", ink: "#7D48F5", icon: "gov", body: "An unannotated PII column never ships. The deploy gate reads the spec, not the PR author's intentions." },
    { id: "cap", chap: "cap", n: "10", title: "Capstone", tag: "one pipeline, six gates", hex: "#E85D04", ink: "#BB4B03", icon: "cap", body: "All six contracts, live and sabotage-able. Break one: the analyst still gets a number. Wrong number." }
  ];
  function StageIcon({ kind, color, size = 18 }) {
    const s = size;
    switch (kind) {
      case "ingest":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("path", { d: "M4 16 L8 11 L14 13 L20 7", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("circle", { cx: "4", cy: "16", r: "1.6", fill: color }), /* @__PURE__ */ React.createElement("circle", { cx: "8", cy: "11", r: "1.6", fill: color }), /* @__PURE__ */ React.createElement("circle", { cx: "14", cy: "13", r: "1.6", fill: color }), /* @__PURE__ */ React.createElement("circle", { cx: "20", cy: "7", r: "1.6", fill: color }));
      case "stream":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("path", { d: "M3 8 Q8 2 12 8 T21 8", stroke: color, strokeWidth: "1.8", fill: "none", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("path", { d: "M3 16 Q8 10 12 16 T21 16", stroke: color, strokeWidth: "1.8", fill: "none", strokeLinecap: "round", opacity: ".55" }));
      case "store":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("rect", { x: "4", y: "6", width: "16", height: "3", rx: "1", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("rect", { x: "4", y: "11", width: "16", height: "3", rx: "1", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("rect", { x: "4", y: "16", width: "16", height: "3", rx: "1", stroke: color, strokeWidth: "1.6" }));
      case "comp":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("path", { d: "M10 6.5 L14 6.5 M10 17.5 L14 17.5 M6.5 10 L6.5 14 M17.5 10 L17.5 14", stroke: color, strokeWidth: "1.2", strokeDasharray: "1.5 1.5" }));
      case "orch":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("circle", { cx: "5", cy: "6", r: "2.2", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("circle", { cx: "19", cy: "6", r: "2.2", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "18", r: "2.2", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("path", { d: "M6.8 7.3 L10.5 16.5 M17.2 7.3 L13.5 16.5", stroke: color, strokeWidth: "1.4" }));
      case "qual":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("path", { d: "M12 3 L20 6 V12 Q20 17 12 21 Q4 17 4 12 V6 Z", stroke: color, strokeWidth: "1.6", fill: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M8 12 L11 15 L16 9", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }));
      case "disc":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("circle", { cx: "11", cy: "11", r: "6", stroke: color, strokeWidth: "1.8" }), /* @__PURE__ */ React.createElement("path", { d: "M15.5 15.5 L20 20", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" }));
      case "serve":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("path", { d: "M4 19 V10 M10 19 V5 M16 19 V13 M22 19 V7", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "20", x2: "23", y2: "20", stroke: color, strokeWidth: "1.2" }));
      case "gov":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("rect", { x: "5", y: "10", width: "14", height: "10", rx: "1.5", stroke: color, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("path", { d: "M8 10 V7 a4 4 0 0 1 8 0 V10", stroke: color, strokeWidth: "1.6", fill: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "15", r: "1.4", fill: color }));
      case "cap":
        return /* @__PURE__ */ React.createElement("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("path", { d: "M12 3 L19 7 V14 Q19 19 12 21 Q5 19 5 14 V7 Z", stroke: color, strokeWidth: "1.6", fill: "none" }), /* @__PURE__ */ React.createElement("path", { d: "M9 12 L11 14 L15 9", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }));
      default:
        return null;
    }
  }
  function PipelineBar({ goTo, activeId, setActiveId }) {
    const W = 1e3, H = 70;
    const PAD_L = 24, PAD_R = 24;
    const trackY = H / 2;
    const positions = useMemo(() => {
      const span = W - PAD_L - PAD_R;
      return OV_STAGES.map((s, i) => ({ ...s, x: PAD_L + span * i / (OV_STAGES.length - 1), y: trackY }));
    }, []);
    const STAGE_HUES = useMemo(() => OV_STAGES.map((s) => s.hex), []);
    const [tokens, setTokens] = useState([]);
    const tRef = useRef(0);
    const rafRef = useRef(null);
    const idSeq = useRef(0);
    const [, setTick] = useState(0);
    useEffect(() => {
      let last = performance.now();
      let spawn = 0.2;
      const step = (now) => {
        const dt = Math.min(0.06, (now - last) / 1e3);
        last = now;
        tRef.current += dt;
        spawn += dt;
        const EVERY = 1.6;
        while (spawn >= EVERY) {
          spawn -= EVERY;
          setTokens((prev) => [...prev.slice(-12), {
            id: idSeq.current++,
            t0: tRef.current,
            dur: 11 + Math.random() * 3,
            hue: STAGE_HUES[Math.floor(Math.random() * STAGE_HUES.length)],
            wobble: (Math.random() - 0.5) * 3.5
          }]);
        }
        setTick((k) => k + 1);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
      return () => cancelAnimationFrame(rafRef.current);
    }, [STAGE_HUES]);
    useEffect(() => {
      const iv = setInterval(() => {
        setTokens((prev) => prev.filter((tk) => tRef.current - tk.t0 < tk.dur));
      }, 1500);
      return () => clearInterval(iv);
    }, []);
    const pulse = {};
    for (const tk of tokens) {
      const u = Math.max(0, Math.min(1, (tRef.current - tk.t0) / tk.dur));
      const x = PAD_L + u * (W - PAD_L - PAD_R);
      for (const p of positions) {
        const d = Math.abs(p.x - x);
        if (d < 22) pulse[p.id] = Math.max(pulse[p.id] || 0, 1 - d / 22);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "ov-pipe" }, /* @__PURE__ */ React.createElement("svg", { className: "ov-pipe-svg", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "ovTrack", x1: "0", y1: "0", x2: "1", y2: "0" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#7C5CFF", stopOpacity: "0.4" }), /* @__PURE__ */ React.createElement("stop", { offset: "50%", stopColor: "#2D7DFF", stopOpacity: "0.55" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#E85D04", stopOpacity: "0.4" })), /* @__PURE__ */ React.createElement("filter", { id: "ovTokGlow" }, /* @__PURE__ */ React.createElement("feGaussianBlur", { stdDeviation: "1.6" }))), /* @__PURE__ */ React.createElement(
      "line",
      {
        x1: PAD_L,
        y1: trackY,
        x2: W - PAD_R,
        y2: trackY,
        stroke: "url(#ovTrack)",
        strokeWidth: "2",
        vectorEffect: "non-scaling-stroke",
        strokeLinecap: "round"
      }
    ), tokens.map((tk) => {
      const u = Math.max(0, Math.min(1, (tRef.current - tk.t0) / tk.dur));
      const x = PAD_L + u * (W - PAD_L - PAD_R);
      const y = trackY + Math.sin(u * 12 + tk.id) * tk.wobble;
      const fadeIn = Math.min(1, u * 8);
      const fadeOut = Math.min(1, (1 - u) * 8);
      const op = Math.max(0, Math.min(1, fadeIn * fadeOut));
      return /* @__PURE__ */ React.createElement("g", { key: tk.id, opacity: op }, /* @__PURE__ */ React.createElement("circle", { cx: x, cy: y, r: "2.8", fill: tk.hue, filter: "url(#ovTokGlow)", opacity: "0.6" }), /* @__PURE__ */ React.createElement("circle", { cx: x, cy: y, r: "1.6", fill: tk.hue }));
    })), /* @__PURE__ */ React.createElement("div", { className: "ov-pipe-stops" }, positions.map((p) => {
      const isActive = activeId === p.id;
      const pulseV = pulse[p.id] || 0;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: p.id,
          className: `ov-stop ${isActive ? "on" : ""}`,
          style: { "--hex": p.hex, "--ink": p.ink },
          onMouseEnter: () => setActiveId(p.id),
          onFocus: () => setActiveId(p.id),
          onClick: () => goTo(p.chap),
          "aria-label": `Chapter ${p.n} \xB7 ${p.title}`,
          "aria-current": isActive ? "step" : void 0
        },
        /* @__PURE__ */ React.createElement("div", { className: "ov-stop-n" }, p.n),
        /* @__PURE__ */ React.createElement("div", { className: "ov-stop-dot", style: { boxShadow: pulseV > 0.15 ? `0 0 0 ${3 + pulseV * 6}px color-mix(in oklab, ${p.hex} ${Math.round(pulseV * 40)}%, transparent)` : void 0 } }, /* @__PURE__ */ React.createElement(StageIcon, { kind: p.icon, color: p.hex, size: 16 })),
        /* @__PURE__ */ React.createElement("div", { className: "ov-stop-title" }, p.title),
        /* @__PURE__ */ React.createElement("div", { className: "ov-stop-tag" }, p.tag)
      );
    })));
  }
  function Ch_Overview({ chapter, internalMode, goTo }) {
    const [activeId, setActiveId] = useState("ingest");
    const active = OV_STAGES.find((s) => s.id === activeId) || OV_STAGES[0];
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("section", { className: "ov2-hero" }, /* @__PURE__ */ React.createElement("div", { className: "ov2-eyebrow" }, /* @__PURE__ */ React.createElement("span", { className: "ov2-pill" }, "DE \xB7 v6"), /* @__PURE__ */ React.createElement("span", { className: "ov2-dot" }, "\xB7"), /* @__PURE__ */ React.createElement("span", null, "The industry-standard crash course")), /* @__PURE__ */ React.createElement("h1", { className: "ov2-title" }, "Think like a ", /* @__PURE__ */ React.createElement("em", null, "data engineer"), " by lunch."), /* @__PURE__ */ React.createElement("p", { className: "ov2-sub" }, "The system, not the tools. ", /* @__PURE__ */ React.createElement("b", null, "10 chapters \xB7 15 live simulators \xB7 one capstone you can break."), "No slides, no toy code: by the end, you'll know where a pipeline fails before it does."), /* @__PURE__ */ React.createElement("div", { className: "ov2-cta" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary ov2-btn-primary", onClick: () => goTo("fund") }, "Begin with Chapter 00\xA0\u2192"), /* @__PURE__ */ React.createElement("button", { className: "ov2-btn-ghost", onClick: () => goTo("cap") }, "Peek at the capstone"), /* @__PURE__ */ React.createElement("span", { className: "ov2-meta" }, /* @__PURE__ */ React.createElement("span", { className: "ov2-meta-dot" }), " ~90\xA0min \xB7 no signup \xB7 runs in your browser"))), /* @__PURE__ */ React.createElement("section", { className: "ov2-flow" }, /* @__PURE__ */ React.createElement("div", { className: "ov2-flow-head" }, /* @__PURE__ */ React.createElement("div", { className: "ov2-kicker" }, "The conveyor"), /* @__PURE__ */ React.createElement("h2", { className: "ov2-h2" }, "One pipeline. Ten chapters. Every dot is a real row."), /* @__PURE__ */ React.createElement("p", { className: "ov2-lede" }, "Hover a stop to preview. Click to open. Each stands alone; the capstone stitches all ten together.")), /* @__PURE__ */ React.createElement(PipelineBar, { goTo, activeId, setActiveId }), /* @__PURE__ */ React.createElement("div", { className: "ov2-detail", style: { "--hex": active.hex, "--ink": active.ink } }, /* @__PURE__ */ React.createElement("div", { className: "ov2-detail-n" }, active.n), /* @__PURE__ */ React.createElement("div", { className: "ov2-detail-main" }, /* @__PURE__ */ React.createElement("div", { className: "ov2-detail-title" }, active.title, /* @__PURE__ */ React.createElement("span", { className: "ov2-detail-tag" }, "\xA0\xB7 ", active.tag)), /* @__PURE__ */ React.createElement("div", { className: "ov2-detail-body" }, active.body)), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary ov2-detail-btn", onClick: () => goTo(active.chap) }, "Open chapter\xA0\u2192"))), /* @__PURE__ */ React.createElement("section", { className: "ov2-tools" }, /* @__PURE__ */ React.createElement("span", { className: "ov2-tools-lab" }, "Real tools, real behavior:"), ["Kafka", "Flink", "Spark", "Trino", "Snowflake", "ClickHouse", "Airflow", "dbt", "Great Expectations", "DataHub", "Cube", "Apache Ranger"].map((n) => /* @__PURE__ */ React.createElement("span", { key: n, className: "ov2-chip" }, n))));
  }
  window.Ch_Overview = Ch_Overview;
})();
