(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  const STAGES = [
    { id: "fund", n: "01", title: "Fundamentals", tag: "sample vs population", blurb: "The CLT made physical. Watch the sampling distribution converge.", hue: "#5B3EE8" },
    { id: "explore", n: "02", title: "Explore", tag: "look before you leap", blurb: "Distributions, outliers, correlation mazes.", hue: "#1CA5D9" },
    { id: "clean", n: "03", title: "Clean", tag: "missing \xB7 drifting \xB7 leaky", blurb: "Impute. Scale. Protect the future from the present.", hue: "#1FAF7E" },
    { id: "feature", n: "04", title: "Feature", tag: "information, engineered", blurb: "Encode, interact, bucket, normalize.", hue: "#6BCF3F" },
    { id: "model", n: "05", title: "Model", tag: "the bias/variance dance", blurb: "Fit, cross-validate, tune \u2014 watch train and test separate.", hue: "#E8A031" },
    { id: "eval", n: "06", title: "Evaluate", tag: "the honest number", blurb: "Confusion, ROC, calibration, threshold sliders.", hue: "#F25F3A" },
    { id: "interp", n: "07", title: "Interpret", tag: "ask why", blurb: "SHAP waterfalls, permutation, partial dependence.", hue: "#E8318F" },
    { id: "exp", n: "08", title: "Experiment", tag: "the only proof", blurb: "A/B, power, MDE \u2014 watch 10k visitors roll in, live.", hue: "#5B3EE8" },
    { id: "causal", n: "09", title: "Causal", tag: "beyond correlation", blurb: "DAGs, confounders, backdoor paths.", hue: "#1CA5D9" },
    { id: "peek", n: "10", title: "Peeking", tag: "how p-values lie", blurb: "Run 50 experiments in parallel, watch false positives bloom.", hue: "#D83A3A" },
    { id: "deploy", n: "11", title: "Deploy", tag: "alive in production", blurb: "Monitor drift. Retrain on signal, not schedule.", hue: "#1FAF7E" },
    { id: "cap", n: "12", title: "Capstone", tag: "the whole loop", blurb: "Ship one end-to-end. Noise \u2192 decision \u2192 feedback.", hue: "#E8318F" }
  ];
  function FlowingPipeline({ onStageClick }) {
    const t = useTicker(true);
    const [hover, setHover] = useState(null);
    const rngRef = useRef(mulberry32(7));
    const W = 760, H = 540;
    const STATIONS = [
      { id: "fund", lab: "Data", n: "01", cx: 120, cy: 90, hue: "#5B3EE8", glyph: "cloud" },
      { id: "explore", lab: "Explore", n: "02", cx: 330, cy: 180, hue: "#1CA5D9", glyph: "scatter" },
      { id: "clean", lab: "Clean", n: "03", cx: 560, cy: 120, hue: "#1FAF7E", glyph: "filter" },
      { id: "feature", lab: "Feature", n: "04", cx: 640, cy: 300, hue: "#6BCF3F", glyph: "gears" },
      { id: "model", lab: "Model", n: "05", cx: 430, cy: 380, hue: "#E8A031", glyph: "curve" },
      { id: "eval", lab: "Evaluate", n: "06", cx: 180, cy: 440, hue: "#F25F3A", glyph: "target" }
      // Feedback loop comes back to Data
    ];
    const pathD = useMemo(() => {
      const pathPts = [
        [STATIONS[0].cx, STATIONS[0].cy],
        [STATIONS[1].cx, STATIONS[1].cy],
        [STATIONS[2].cx, STATIONS[2].cy],
        [STATIONS[3].cx, STATIONS[3].cy],
        [STATIONS[4].cx, STATIONS[4].cy],
        [STATIONS[5].cx, STATIONS[5].cy]
      ];
      return buildSmoothPath(pathPts) + ` C ${STATIONS[5].cx - 120} ${STATIONS[5].cy + 60}, ${STATIONS[0].cx - 60} ${STATIONS[0].cy + 200}, ${STATIONS[0].cx} ${STATIONS[0].cy}`;
    }, []);
    const pathRef = useRef(null);
    const [pathLen, setPathLen] = useState(0);
    useEffect(() => {
      if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
    }, [pathD]);
    const N_PARTICLES = 28;
    const particles = [];
    if (pathLen > 0 && pathRef.current) {
      for (let i = 0; i < N_PARTICLES; i++) {
        const speed = 0.05;
        const phase = (i / N_PARTICLES + t * speed) % 1;
        const pt = pathRef.current.getPointAtLength(phase * pathLen);
        const hue = i % 4 === 0 ? "#5B3EE8" : i % 4 === 1 ? "#E8318F" : i % 4 === 2 ? "#6BCF3F" : "#1CA5D9";
        const size = 2.4 + 1.1 * Math.sin(t * 3 + i * 0.7);
        particles.push({ x: pt.x, y: pt.y, hue, size, idx: i });
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "ov-loop-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "ov-loop" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "loop-grad-l", x1: "0", y1: "0", x2: "1", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "#5B3EE8", stopOpacity: "0.75" }), /* @__PURE__ */ React.createElement("stop", { offset: "0.5", stopColor: "#E8318F", stopOpacity: "0.75" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "#6BCF3F", stopOpacity: "0.75" })), /* @__PURE__ */ React.createElement("filter", { id: "soft-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, /* @__PURE__ */ React.createElement("feGaussianBlur", { stdDeviation: "2.2", result: "b" }), /* @__PURE__ */ React.createElement("feMerge", null, /* @__PURE__ */ React.createElement("feMergeNode", { in: "b" }), /* @__PURE__ */ React.createElement("feMergeNode", { in: "SourceGraphic" }))), /* @__PURE__ */ React.createElement("filter", { id: "paper-shadow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, /* @__PURE__ */ React.createElement("feGaussianBlur", { in: "SourceAlpha", stdDeviation: "3" }), /* @__PURE__ */ React.createElement("feOffset", { dy: "3" }), /* @__PURE__ */ React.createElement("feComponentTransfer", null, /* @__PURE__ */ React.createElement("feFuncA", { type: "linear", slope: "0.14" })), /* @__PURE__ */ React.createElement("feMerge", null, /* @__PURE__ */ React.createElement("feMergeNode", null), /* @__PURE__ */ React.createElement("feMergeNode", { in: "SourceGraphic" })))), /* @__PURE__ */ React.createElement(
      "path",
      {
        ref: pathRef,
        d: pathD,
        fill: "none",
        stroke: "url(#loop-grad-l)",
        strokeWidth: "2.5",
        opacity: "0.55"
      }
    ), /* @__PURE__ */ React.createElement(
      "path",
      {
        d: pathD,
        fill: "none",
        stroke: "url(#loop-grad-l)",
        strokeWidth: "10",
        opacity: "0.08",
        filter: "url(#soft-glow)"
      }
    ), particles.map((p) => /* @__PURE__ */ React.createElement(
      "circle",
      {
        key: p.idx,
        cx: p.x,
        cy: p.y,
        r: p.size,
        fill: p.hue,
        opacity: "0.85",
        filter: "url(#soft-glow)"
      }
    )), STATIONS.map((s, i) => {
      const h = hover === s.id;
      const pulseR = 34 + 1.5 * Math.sin(t * 1.4 + i);
      return /* @__PURE__ */ React.createElement(
        "g",
        {
          key: s.id,
          className: "ov-loop-node",
          onMouseEnter: () => setHover(s.id),
          onMouseLeave: () => setHover(null),
          onClick: () => onStageClick && onStageClick(s.id),
          transform: `translate(${s.cx} ${s.cy})`
        },
        /* @__PURE__ */ React.createElement(
          "circle",
          {
            r: pulseR + 6,
            fill: "none",
            stroke: s.hue,
            strokeWidth: h ? 1.6 : 0.8,
            opacity: h ? 0.6 : 0.22
          }
        ),
        /* @__PURE__ */ React.createElement(
          "circle",
          {
            r: pulseR,
            fill: "#FFFDF7",
            stroke: s.hue,
            strokeWidth: h ? 2.6 : 1.8,
            filter: "url(#paper-shadow)"
          }
        ),
        /* @__PURE__ */ React.createElement(StationGlyph, { kind: s.glyph, hue: s.hue, t, phase: i }),
        /* @__PURE__ */ React.createElement(
          "text",
          {
            y: pulseR + 18,
            textAnchor: "middle",
            fill: h ? s.hue : "#3A3540",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10",
            fontWeight: "700",
            letterSpacing: "0.14em",
            style: { textTransform: "uppercase" }
          },
          s.n,
          " \xB7 ",
          s.lab
        )
      );
    }), /* @__PURE__ */ React.createElement("g", { transform: "translate(70 330)" }, /* @__PURE__ */ React.createElement(
      "text",
      {
        fontFamily: "'Instrument Serif', serif",
        fontSize: "22",
        fontStyle: "italic",
        fill: "#3A3540",
        opacity: "0.5"
      },
      "feedback"
    ), /* @__PURE__ */ React.createElement(
      "text",
      {
        y: "18",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "9.5",
        fill: "#6A6270",
        letterSpacing: "0.14em",
        style: { textTransform: "uppercase" }
      },
      "the loop closes"
    ))));
  }
  function StationGlyph({ kind, hue, t, phase }) {
    const common = { fill: hue, stroke: "none" };
    switch (kind) {
      case "cloud": {
        const dots = [];
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2 + t * 0.6;
          const r = 8 + 2 * Math.sin(t * 2 + i + phase);
          dots.push(/* @__PURE__ */ React.createElement("circle", { key: i, cx: Math.cos(a) * r, cy: Math.sin(a) * r, r: 1.8, ...common }));
        }
        dots.push(/* @__PURE__ */ React.createElement("circle", { key: "c", cx: "0", cy: "0", r: 2.2, ...common }));
        return /* @__PURE__ */ React.createElement("g", null, dots);
      }
      case "scatter": {
        const dots = [];
        for (let i = 0; i < 6; i++) {
          const seed = (i * 13 + phase * 17) % 19;
          const x = -10 + seed / 19 * 20 + 0.8 * Math.sin(t + i);
          const y = 10 - seed * 7 % 19 / 19 * 20 + 0.8 * Math.cos(t + i);
          dots.push(/* @__PURE__ */ React.createElement("circle", { key: i, cx: x, cy: y, r: 1.6, ...common }));
        }
        return /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("line", { x1: "-14", y1: "12", x2: "14", y2: "12", stroke: hue, strokeWidth: "0.9", opacity: "0.5" }), /* @__PURE__ */ React.createElement("line", { x1: "-14", y1: "12", x2: "-14", y2: "-12", stroke: hue, strokeWidth: "0.9", opacity: "0.5" }), dots);
      }
      case "filter": {
        const drip1 = 6 + 12 * ((t * 0.6 + phase * 0.3) % 1);
        const drip2 = 6 + 12 * ((t * 0.6 + 0.33 + phase * 0.3) % 1);
        return /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement(
          "path",
          {
            d: "M -12 -10 L 12 -10 L 4 2 L 4 10 L -4 10 L -4 2 Z",
            fill: "none",
            stroke: hue,
            strokeWidth: "1.6"
          }
        ), /* @__PURE__ */ React.createElement("circle", { cx: "0", cy: drip1, r: 1.4, ...common }), /* @__PURE__ */ React.createElement("circle", { cx: "0", cy: drip2, r: 1.4, ...common, opacity: "0.6" }));
      }
      case "gears": {
        const rot = t * 40 % 360;
        const ticks = (r, dir) => Array.from({ length: 8 }).map((_, i) => {
          const a = i / 8 * Math.PI * 2 + dir * rot * Math.PI / 180;
          return /* @__PURE__ */ React.createElement(
            "line",
            {
              key: i,
              x1: Math.cos(a) * r,
              y1: Math.sin(a) * r,
              x2: Math.cos(a) * (r + 3),
              y2: Math.sin(a) * (r + 3),
              stroke: hue,
              strokeWidth: "1.2",
              strokeLinecap: "round"
            }
          );
        });
        return /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("g", { transform: "translate(-5 0)" }, /* @__PURE__ */ React.createElement("circle", { r: "7", fill: "none", stroke: hue, strokeWidth: "1.5" }), ticks(7, 1)), /* @__PURE__ */ React.createElement("g", { transform: "translate(5 0)" }, /* @__PURE__ */ React.createElement("circle", { r: "5", fill: "none", stroke: hue, strokeWidth: "1.5" }), ticks(5, -1)));
      }
      case "curve": {
        const off = Math.sin(t * 0.7) * 2;
        const pts = [];
        for (let i = 0; i <= 20; i++) {
          const x = -13 + i / 20 * 26;
          const s = Math.tanh((x + off) * 0.4);
          const y = -s * 8;
          pts.push(`${x},${y}`);
        }
        return /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("line", { x1: "-14", y1: "10", x2: "14", y2: "10", stroke: hue, strokeWidth: "0.9", opacity: "0.4" }), /* @__PURE__ */ React.createElement("polyline", { points: pts.join(" "), fill: "none", stroke: hue, strokeWidth: "1.8", strokeLinecap: "round" }));
      }
      case "target": {
        const rot = t * 60 % 360;
        return /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("circle", { r: "10", fill: "none", stroke: hue, strokeWidth: "1.2", opacity: "0.35" }), /* @__PURE__ */ React.createElement("circle", { r: "6", fill: "none", stroke: hue, strokeWidth: "1.4", opacity: "0.6" }), /* @__PURE__ */ React.createElement("circle", { r: "2.2", ...common }), /* @__PURE__ */ React.createElement("g", { transform: `rotate(${rot})` }, /* @__PURE__ */ React.createElement("line", { x1: "-13", y1: "0", x2: "-8", y2: "0", stroke: hue, strokeWidth: "1.5" }), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "0", x2: "13", y2: "0", stroke: hue, strokeWidth: "1.5" })));
      }
    }
    return null;
  }
  function buildSmoothPath(pts) {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }
  function Ch_Overview({ goTo }) {
    const outcomes = [
      { icon: "\u25C7", t: "Explore any dataset without flailing", d: "Distributions, missingness, correlation maps \u2014 a mental checklist for your first 30 minutes with new data." },
      { icon: "\u25CB", t: "Train a model that doesn't secretly cheat", d: "Spot leakage. Split honestly. Pick the metric before the algorithm." },
      { icon: "\u25B3", t: "Read a confusion matrix like a pro", d: "Threshold slider, precision/recall tradeoff, calibration, class imbalance." },
      { icon: "\u25A1", t: "Design an A/B test that holds up", d: "Power, MDE, sample size, novelty effects, SRM checks, CUPED." },
      { icon: "\u25C8", t: "Tell correlation from causation", d: "DAGs, confounders, backdoor paths, when regression adjustment saves you." },
      { icon: "\u2715", t: "Keep a model alive in production", d: "Drift monitoring, retraining cadence, shadow mode, rollback." }
    ];
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("section", { className: "ov-hero" }, /* @__PURE__ */ React.createElement("div", { className: "ov-hero-copy" }, /* @__PURE__ */ React.createElement("div", { className: "ov-hero-eyebrow" }, "Data Science Fundamentals \xB7 v8"), /* @__PURE__ */ React.createElement("h1", { className: "ov-hero-title" }, "A data scientist is ", /* @__PURE__ */ React.createElement("em", null, "a person who"), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "accent" }, "turns noise into decisions.")), /* @__PURE__ */ React.createElement("p", { className: "ov-hero-hook" }, "Twelve chapters. One animated loop. Built for the graduate who wants to ship real work \u2014 not memorize equations. Every chapter opens with a", /* @__PURE__ */ React.createElement("strong", null, " simulation you can break"), ", not a wall of text."), /* @__PURE__ */ React.createElement("div", { className: "ov-hero-cta" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary ov-cta-btn", onClick: () => goTo("fund") }, "Begin \xA0\u2192"), /* @__PURE__ */ React.createElement("button", { className: "ov-cta-ghost", onClick: () => goTo("cap") }, "Or skip to the capstone")), /* @__PURE__ */ React.createElement("div", { className: "ov-hero-stats" }, /* @__PURE__ */ React.createElement("div", { className: "ov-stat" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "12"), /* @__PURE__ */ React.createElement("div", { className: "v" }, "chapters")), /* @__PURE__ */ React.createElement("div", { className: "ov-stat" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "22"), /* @__PURE__ */ React.createElement("div", { className: "v" }, "live simulations")), /* @__PURE__ */ React.createElement("div", { className: "ov-stat" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "~2h"), /* @__PURE__ */ React.createElement("div", { className: "v" }, "end-to-end")))), /* @__PURE__ */ React.createElement("div", { className: "ov-hero-sim" }, /* @__PURE__ */ React.createElement(FlowingPipeline, { onStageClick: (id) => goTo(id) }))), /* @__PURE__ */ React.createElement("section", { className: "section ov-outcomes-section" }, /* @__PURE__ */ React.createElement("div", { className: "ov-section-head" }, /* @__PURE__ */ React.createElement("div", { className: "ov-kicker" }, "By the end"), /* @__PURE__ */ React.createElement("h2", { className: "ov-h2" }, "You'll know how to ", /* @__PURE__ */ React.createElement("em", null, "do the work"), ",", /* @__PURE__ */ React.createElement("br", null), "not just pass the interview.")), /* @__PURE__ */ React.createElement("div", { className: "ov-outcomes" }, outcomes.map((o, i) => /* @__PURE__ */ React.createElement("div", { className: "ov-outcome", key: i }, /* @__PURE__ */ React.createElement("div", { className: "ov-outcome-icon" }, o.icon), /* @__PURE__ */ React.createElement("div", { className: "ov-outcome-t" }, o.t), /* @__PURE__ */ React.createElement("div", { className: "ov-outcome-d" }, o.d))))), /* @__PURE__ */ React.createElement("section", { className: "section ov-curriculum-section" }, /* @__PURE__ */ React.createElement("div", { className: "ov-section-head" }, /* @__PURE__ */ React.createElement("div", { className: "ov-kicker" }, "The curriculum"), /* @__PURE__ */ React.createElement("h2", { className: "ov-h2" }, "Twelve chapters. Build the model.", /* @__PURE__ */ React.createElement("br", null), "Then prove it works."), /* @__PURE__ */ React.createElement("p", { className: "ov-lede" }, "Half the course is how to build a model. The other half is how to", /* @__PURE__ */ React.createElement("em", null, " know if it worked"), " \u2014 the part most courses skip.")), /* @__PURE__ */ React.createElement("div", { className: "ov-curriculum" }, STAGES.map((s, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "ov-course",
        key: s.id,
        style: { "--hue": s.hue },
        onClick: () => goTo(s.id)
      },
      /* @__PURE__ */ React.createElement("div", { className: "ov-course-top" }, /* @__PURE__ */ React.createElement("span", { className: "ov-course-n" }, s.n), /* @__PURE__ */ React.createElement("span", { className: "ov-course-dot", style: { background: s.hue, color: s.hue } })),
      /* @__PURE__ */ React.createElement("div", { className: "ov-course-title" }, s.title),
      /* @__PURE__ */ React.createElement("div", { className: "ov-course-tag" }, s.tag),
      /* @__PURE__ */ React.createElement("div", { className: "ov-course-blurb" }, s.blurb),
      /* @__PURE__ */ React.createElement("div", { className: "ov-course-cta" }, "Open chapter \xA0\u2192")
    )))), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement("div", { className: "ov-section-head ov-sh-tight" }, /* @__PURE__ */ React.createElement("div", { className: "ov-kicker" }, "Tools you'll see"), /* @__PURE__ */ React.createElement("h2", { className: "ov-h2" }, "Standard industry kit.", /* @__PURE__ */ React.createElement("br", null), "No proprietary gatekeeping."), /* @__PURE__ */ React.createElement("p", { className: "ov-lede" }, "The sims render the ", /* @__PURE__ */ React.createElement("em", null, "behavior"), " of these tools. Muscle memory transfers to whichever stack your employer uses.")), /* @__PURE__ */ React.createElement("div", { className: "ov-tools" }, [
      { n: "pandas", r: "dataframes" },
      { n: "scikit-learn", r: "classic ML" },
      { n: "numpy", r: "arrays" },
      { n: "PyTorch", r: "deep learning" },
      { n: "statsmodels", r: "inference + GLMs" },
      { n: "scipy.stats", r: "tests + distributions" },
      { n: "SHAP", r: "interpretability" },
      { n: "Jupyter \xB7 Hex", r: "notebooks" },
      { n: "MLflow", r: "tracking" },
      { n: "Feast", r: "feature store" },
      { n: "Great Expectations", r: "data quality" },
      { n: "A/B platform", r: "experiments" }
    ].map((t) => /* @__PURE__ */ React.createElement("div", { key: t.n, className: "ov-tool" }, /* @__PURE__ */ React.createElement("div", { className: "ov-tool-n" }, t.n), /* @__PURE__ */ React.createElement("div", { className: "ov-tool-r" }, t.r))))), /* @__PURE__ */ React.createElement("section", { className: "ov-cta-band" }, /* @__PURE__ */ React.createElement("div", { className: "ov-cta-eyebrow" }, "Ready?"), /* @__PURE__ */ React.createElement("div", { className: "ov-cta-title" }, "Chapter 01 opens with a falling-ball sampler."), /* @__PURE__ */ React.createElement("div", { className: "ov-cta-sub" }, "Drop a thousand samples through a physical Galton board. Watch the central limit theorem emerge from chaos. ", /* @__PURE__ */ React.createElement("em", null, "Seven minutes."), " Then you're in."), /* @__PURE__ */ React.createElement("div", { className: "ov-cta-row" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary ov-cta-btn", onClick: () => goTo("fund") }, "Begin with Chapter 01 \xA0\u2192"), /* @__PURE__ */ React.createElement("button", { className: "ov-cta-ghost", onClick: () => goTo("exp") }, "Or jump to Experimentation \u2192"))));
  }
  window.Ch_Overview = Ch_Overview;
})();
