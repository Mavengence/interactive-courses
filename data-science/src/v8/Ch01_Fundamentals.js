(() => {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  function GaltonSim() {
    const [n, setN] = useState(25);
    const [rate, setRate] = useState(8);
    const [pop, setPop] = useState("bell");
    const [running, setRunning] = useState(true);
    const [tick, setTick] = useState(0);
    const ballsRef = useRef([]);
    const stackRef = useRef(new Array(32).fill(0));
    const sampleBufRef = useRef([]);
    const meansRef = useRef([]);
    const meanStackRef = useRef(new Array(32).fill(0));
    const meanBallsRef = useRef([]);
    const rngRef = useRef(mulberry32(42));
    const W = 520, H = 620;
    const BOARD_TOP = 30, BOARD_BOT = 280;
    const POP_TOP = 290, POP_BOT = 400;
    const MEAN_TOP = 450, MEAN_BOT = 590;
    const BIN_W = W / 32;
    const PEG_ROWS = 11;
    const pegs = useMemo(() => {
      const p = [];
      for (let row = 0; row < PEG_ROWS; row++) {
        const cy = BOARD_TOP + 10 + row / (PEG_ROWS - 1) * (BOARD_BOT - BOARD_TOP - 40);
        const cols = row + 2;
        const spacing = W / (cols + 1);
        for (let col = 0; col < cols; col++) {
          p.push({ x: (col + 1) * spacing, y: cy });
        }
      }
      return p;
    }, []);
    const spawnBall = (sampleBatchId) => {
      ballsRef.current.push({
        x: W / 2 + (rngRef.current() - 0.5) * 8,
        y: BOARD_TOP - 8,
        vx: 0,
        vy: 0,
        row: -1,
        hue: sampleBatchId % 2 === 0 ? "#5B3EE8" : "#E8318F",
        batchId: sampleBatchId,
        landed: false,
        age: 0
      });
    };
    const biasAt = (row, x) => {
      const r = rngRef.current();
      if (pop === "bell") return r < 0.5 ? -1 : 1;
      if (pop === "skew") return r < 0.35 ? -1 : 1;
      const leanCenter = (x - W / 2) / (W / 2);
      const pushProb = 0.5 + 0.28 * Math.sign(leanCenter || r - 0.5);
      return r < pushProb ? leanCenter >= 0 ? 1 : -1 : leanCenter >= 0 ? -1 : 1;
    };
    useEffect(() => {
      if (!running) return;
      let raf;
      let last = performance.now();
      let ballAccum = 0;
      let sampleBatchId = 0;
      let inBatch = 0;
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1e3);
        last = now;
        ballAccum += dt * rate;
        while (ballAccum >= 1) {
          ballAccum -= 1;
          spawnBall(sampleBatchId);
          inBatch++;
          if (inBatch >= n) {
            sampleBatchId++;
            inBatch = 0;
          }
        }
        const balls = ballsRef.current;
        for (const b of balls) {
          if (b.landed) {
            b.age += dt;
            continue;
          }
          const rowF = (b.y - BOARD_TOP - 10) / ((BOARD_BOT - BOARD_TOP - 40) / (PEG_ROWS - 1));
          const rowIdx = Math.max(-1, Math.floor(rowF));
          if (rowIdx > b.row) {
            b.row = rowIdx;
            const dir = biasAt(rowIdx, b.x);
            const spacing = W / (rowIdx + 3);
            b.vx = dir * spacing * 2.8;
            b.vy = Math.max(b.vy, 180);
          }
          b.vy += 520 * dt;
          b.x += b.vx * dt;
          b.vx *= 0.93;
          b.y += b.vy * dt;
          if (b.y >= POP_TOP - 6) {
            b.landed = true;
            b.y = POP_TOP - 6;
            const binIdx = Math.max(0, Math.min(31, Math.floor(b.x / BIN_W)));
            const prevH = stackRef.current[binIdx];
            stackRef.current[binIdx]++;
            sampleBufRef.current.push(binIdx);
            if (sampleBufRef.current.length >= n) {
              const mean = sampleBufRef.current.reduce((a, v) => a + v, 0) / sampleBufRef.current.length;
              meansRef.current.push(mean);
              meanBallsRef.current.push({
                x: b.x,
                y: POP_BOT + 4,
                tx: (mean + 0.5) * BIN_W,
                ty: MEAN_BOT - 8,
                t: 0,
                dur: 0.9,
                hue: "#E8318F",
                meanVal: mean
              });
              sampleBufRef.current = [];
            }
            b.binIdx = binIdx;
            b.stackIdx = prevH;
          }
        }
        for (const m of meanBallsRef.current) {
          m.t += dt;
          const u = clamp(m.t / m.dur, 0, 1);
          const eased = 1 - Math.pow(1 - u, 3);
          m.x = m.x + (m.tx - m.x) * (eased - clamp((m.t - dt) / m.dur, 0, 1) + eased * 1e-3);
          const arcLift = -60 * Math.sin(eased * Math.PI);
          m.cy = m.y + (m.ty - m.y) * eased + arcLift;
          if (u >= 1) {
            m.done = true;
            const binIdx = Math.max(0, Math.min(31, Math.floor(m.tx / BIN_W)));
            meanStackRef.current[binIdx]++;
          }
        }
        ballsRef.current = balls.filter((b) => !b.landed || b.age < 0.12);
        meanBallsRef.current = meanBallsRef.current.filter((m) => !m.done);
        setTick((k) => k + 1);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [running, rate, n, pop]);
    const reset = useCallback(() => {
      stackRef.current = new Array(32).fill(0);
      meanStackRef.current = new Array(32).fill(0);
      ballsRef.current = [];
      meanBallsRef.current = [];
      meansRef.current = [];
      sampleBufRef.current = [];
      rngRef.current = mulberry32(42);
      setTick((k) => k + 1);
    }, []);
    useEffect(() => {
      reset();
    }, [pop, reset]);
    const totalSamples = meansRef.current.length;
    const totalBalls = stackRef.current.reduce((a, v) => a + v, 0);
    const meanOfMeans = totalSamples ? meansRef.current.reduce((a, v) => a + v, 0) / totalSamples : null;
    const seEmpirical = totalSamples > 1 ? Math.sqrt(meansRef.current.reduce((a, v) => a + (v - meanOfMeans) ** 2, 0) / (totalSamples - 1)) : null;
    const popMax = Math.max(6, ...stackRef.current);
    const meanMax = Math.max(4, ...meanStackRef.current);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "LIVE \xB7 PHYSICS",
        title: "Galton Board \xB7 Sampling Distribution",
        meta: `n = ${n} \xB7 ${totalSamples} samples \xB7 ${totalBalls} balls`,
        caption: "Top: balls drop through a peg grid, stacking into the population shape. Bottom: every n balls, their mean drops into the sampling distribution. Watch the bottom curve narrow and become bell-shaped \u2014 that's the CLT, live."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row galton-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Population"), /* @__PURE__ */ React.createElement("div", { className: "seg" }, ["bell", "skew", "bimodal"].map((p) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: p,
          className: pop === p ? "on" : "",
          onClick: () => setPop(p)
        },
        p
      )))), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Sample size ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, "n = ", n)), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "2",
          max: "100",
          value: n,
          "aria-label": "Sample size",
          onChange: (e) => setN(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Drop rate ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, rate, "/s")), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "2",
          max: "40",
          value: rate,
          "aria-label": "Drop rate per second",
          onChange: (e) => setRate(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl-row" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: `btn btn-sm ${running ? "" : "btn-primary"}`,
          onClick: () => setRunning((r) => !r)
        },
        running ? "Pause" : "Play"
      ), /* @__PURE__ */ React.createElement("button", { className: "btn btn-sm btn-ghost", onClick: reset }, "Reset")), /* @__PURE__ */ React.createElement("div", { className: "sim-stats" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Mean of means"), /* @__PURE__ */ React.createElement("div", { className: "v" }, meanOfMeans != null ? round(meanOfMeans, 2) : "\u2014")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "SE (empirical)"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--magenta)" } }, seEmpirical != null ? round(seEmpirical, 2) : "\u2014")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Samples"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--violet)" } }, totalSamples))), /* @__PURE__ */ React.createElement("div", { className: "galton-note" }, /* @__PURE__ */ React.createElement("span", { className: "tag-pill" }, "CLT"), "As ", /* @__PURE__ */ React.createElement("code", { className: "mono" }, "n"), " grows, ", /* @__PURE__ */ React.createElement("strong", null, "SE shrinks"), " by", /* @__PURE__ */ React.createElement("strong", null, " 1/\u221An"), ". At n=4 \u2192 SE\u22481.7. At n=100 \u2192 SE\u22480.35.")), /* @__PURE__ */ React.createElement("div", { className: "galton-stage" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "galton-svg" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "galton-fade", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "#FBF8F1", stopOpacity: "0" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "#FBF8F1", stopOpacity: "1" }))), /* @__PURE__ */ React.createElement(
        "path",
        {
          d: `M ${W / 2 - 40} 6 L ${W / 2 - 14} 28 L ${W / 2 + 14} 28 L ${W / 2 + 40} 6`,
          fill: "none",
          stroke: "#3A3540",
          strokeWidth: "1.4"
        }
      ), pegs.map((p, i) => /* @__PURE__ */ React.createElement("circle", { key: i, cx: p.x, cy: p.y, r: 2.2, fill: "#A49D9A" })), ballsRef.current.map((b, i) => {
        if (b.landed) {
          const binX = (b.binIdx + 0.5) * BIN_W;
          const binBarH = (b.stackIdx + 1) / popMax * (POP_BOT - POP_TOP - 10);
          const y = POP_BOT - binBarH + 4;
          return /* @__PURE__ */ React.createElement(
            "circle",
            {
              key: i,
              cx: binX,
              cy: y,
              r: 2.4,
              fill: b.hue,
              opacity: Math.max(0, 1 - b.age * 8)
            }
          );
        }
        return /* @__PURE__ */ React.createElement(
          "circle",
          {
            key: i,
            cx: b.x,
            cy: b.y,
            r: 3,
            fill: b.hue,
            stroke: "#14121688",
            strokeWidth: "0.5"
          }
        );
      }), stackRef.current.map((v, i) => {
        const h = v / popMax * (POP_BOT - POP_TOP - 10);
        return /* @__PURE__ */ React.createElement(
          "rect",
          {
            key: i,
            x: i * BIN_W + 0.5,
            y: POP_BOT - h,
            width: BIN_W - 1,
            height: h,
            fill: "#1CA5D9",
            opacity: "0.45"
          }
        );
      }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "8",
          y: POP_TOP - 8,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10",
          fontWeight: "700",
          letterSpacing: "0.14em",
          fill: "#6A6270",
          style: { textTransform: "uppercase" }
        },
        "Population \xB7 ",
        totalBalls,
        " balls"
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: "0",
          y1: POP_BOT + 12,
          x2: W,
          y2: POP_BOT + 12,
          stroke: "#A49D9A",
          strokeDasharray: "3 4",
          strokeWidth: "0.8"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "8",
          y: MEAN_TOP - 6,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10",
          fontWeight: "700",
          letterSpacing: "0.14em",
          fill: "#6A6270",
          style: { textTransform: "uppercase" }
        },
        "Sampling distribution of the mean \xB7 n = ",
        n
      ), meanBallsRef.current.map((m, i) => /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement(
        "circle",
        {
          cx: m.x,
          cy: m.cy || m.y,
          r: 4,
          fill: m.hue,
          opacity: "0.9"
        }
      ), /* @__PURE__ */ React.createElement(
        "circle",
        {
          cx: m.x,
          cy: m.cy || m.y,
          r: 8,
          fill: "none",
          stroke: m.hue,
          strokeWidth: "1",
          opacity: "0.4"
        }
      ))), meanStackRef.current.map((v, i) => {
        const h = v / meanMax * (MEAN_BOT - MEAN_TOP - 10);
        if (v === 0) return null;
        return /* @__PURE__ */ React.createElement(
          "rect",
          {
            key: i,
            x: i * BIN_W + 0.5,
            y: MEAN_BOT - h,
            width: BIN_W - 1,
            height: h,
            fill: "#E8318F",
            opacity: "0.65"
          }
        );
      }), totalSamples > 20 && seEmpirical > 0 && /* @__PURE__ */ React.createElement(
        "path",
        {
          d: normalPath(meanOfMeans, seEmpirical, meanMax, MEAN_TOP, MEAN_BOT, BIN_W, W),
          fill: "none",
          stroke: "#5B3EE8",
          strokeWidth: "2",
          opacity: "0.85",
          strokeDasharray: "0"
        }
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: "0",
          y1: MEAN_BOT,
          x2: W,
          y2: MEAN_BOT,
          stroke: "#A49D9A",
          strokeWidth: "0.8"
        }
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: "0",
          y1: POP_BOT,
          x2: W,
          y2: POP_BOT,
          stroke: "#A49D9A",
          strokeWidth: "0.8"
        }
      ))))
    );
  }
  function normalPath(mu, sigma, maxBin, top, bot, binW, width) {
    const pts = [];
    for (let x = 0; x <= width; x += 4) {
      const binIdx = x / binW;
      const z = (binIdx - mu) / Math.max(0.5, sigma);
      const y = Math.exp(-0.5 * z * z);
      const py = bot - y * (bot - top - 10);
      pts.push(`${x},${py}`);
    }
    return "M " + pts.join(" L ");
  }
  function Ch01_Fundamentals() {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 01 \xB7 Fundamentals",
        title: 'The data scientist <em>turns noise</em> <span class="accent">into decisions.</span>',
        hook: "Before any model, any SQL, any dashboard \u2014 there are three ideas. <strong>Sample vs population.</strong> <strong>Signal vs noise.</strong> <strong>Correlation vs causation.</strong> Get these and half the field clicks into place.",
        meta: [
          { k: "Read", v: "7 min" },
          { k: "Focus", v: "CLT \xB7 sampling \xB7 the DS loop" },
          { k: "Sims", v: "1 physics-based \xB7 live" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "01.1" }, "Sample vs population"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "You never see the truth. ", /* @__PURE__ */ React.createElement("em", null, "You see a shadow of it.")), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Your company has ", /* @__PURE__ */ React.createElement("strong", null, "44 million users"), ". Your A/B test touched ", /* @__PURE__ */ React.createElement("strong", null, "180,000"), ` of them over two weeks. The result you report \u2014 "retention went up 2.3%" \u2014 isn't a measurement of reality. It's a `, /* @__PURE__ */ React.createElement("em", null, "guess"), ", informed by a sliver of reality, wrapped in uncertainty."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Every data scientist lives in this gap: we work from ", /* @__PURE__ */ React.createElement("code", null, "samples"), ", but we make claims about ", /* @__PURE__ */ React.createElement("code", null, "populations"), ". Everything else in this course \u2014 confidence intervals, p-values, A/B tests, model accuracy \u2014 is machinery for honestly quantifying how much that gap matters."), /* @__PURE__ */ React.createElement(GaltonSim, null), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { marginTop: 22 } }, "Crank ", /* @__PURE__ */ React.createElement("code", null, "n"), " from 2 to 100. Watch the pink distribution narrow \u2014 its spread shrinks by", /* @__PURE__ */ React.createElement("code", null, " 1/\u221An"), ". Switch from ", /* @__PURE__ */ React.createElement("em", null, "bell"), " to ", /* @__PURE__ */ React.createElement("em", null, "skew"), " to ", /* @__PURE__ */ React.createElement("em", null, "bimodal"), ": the ", /* @__PURE__ */ React.createElement("strong", null, "population"), "can be any ugly shape, yet the ", /* @__PURE__ */ React.createElement("strong", null, "sampling distribution"), " tracks the violet normal curve. That's the central limit theorem, and it's why A/B tests work at all.")), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "01.2" }, "The DS loop"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Six stages. One feedback loop. ", /* @__PURE__ */ React.createElement("em", null, "No skipping.")), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Every serious DS project runs through the same loop:", /* @__PURE__ */ React.createElement("strong", null, " Data \u2192 Explore \u2192 Clean \u2192 Feature \u2192 Model \u2192 Evaluate"), ", then back around. Each chapter covers one stage, plus the meta-skills on top \u2014 experimentation, causal reasoning, deployment."), /* @__PURE__ */ React.createElement("div", { className: "loop-mini" }, ["Data", "Explore", "Clean", "Feature", "Model", "Evaluate"].map((s, i) => /* @__PURE__ */ React.createElement("div", { className: "loop-mini-stage", key: s }, /* @__PURE__ */ React.createElement("div", { className: "loop-mini-n" }, String(i + 1).padStart(2, "0")), /* @__PURE__ */ React.createElement("div", { className: "loop-mini-t" }, s)))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Fitting before looking.</b> Running <code>model.fit()</code> on a dataset you haven't <em>plotted</em> is how you ship a model that learned the index column.",
      "<b>Optimizing a number nobody asked for.</b> Great accuracy on the wrong metric is worse than decent accuracy on the right one.",
      '<b>Confusing correlation with causation.</b> "Users who see feature X retain better" does not mean feature X causes retention. It may just mean engaged users see X.'
    ] })), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Sample, not truth.</b> Every number you report is a guess with uncertainty attached. Quantify it.",
      "<b>CLT is a gift.</b> Regardless of ugly populations, sample means trend toward normal. This is why A/B tests work.",
      "<b>The loop is non-negotiable.</b> Skipping explore \u2192 leakage. Skipping evaluate \u2192 false confidence. Skipping feedback \u2192 stale models."
    ] }));
  }
  window.Ch01_Fundamentals = Ch01_Fundamentals;
})();
