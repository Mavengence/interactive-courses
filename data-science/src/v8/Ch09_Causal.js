(() => {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  function pearsonR(xs, ys) {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx, dy = ys[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    return num / (Math.sqrt(dx2 * dy2) || 1);
  }
  function ConfoundingSimulator() {
    const [scenario, setScenario] = useState("icecream");
    const [revealed, setRevealed] = useState(false);
    const SCENARIOS = {
      icecream: {
        label: "Ice cream & drowning",
        xLab: "Ice cream sales (units/day)",
        yLab: "Drowning deaths / week",
        zLab: "Temperature (\xB0C)",
        zGroups: ["Cool  (10\u201317\xB0C)", "Warm  (18\u201324\xB0C)", "Hot   (25\u201332\xB0C)"],
        zColors: ["#5B9BE8", "#E8A031", "#FF4DA2"],
        generate: (rng) => {
          const pts2 = [];
          for (let g = 0; g < 3; g++) {
            const tempBase = 12 + g * 8;
            for (let i = 0; i < 30; i++) {
              const z = tempBase + randn(rng) * 2;
              const x = 20 + g * 40 + randn(rng) * 10;
              const y = 0.5 + g * 1.2 + randn(rng) * 0.3;
              pts2.push({ x, y, z: g });
            }
          }
          return pts2;
        }
      },
      reading: {
        label: "Shoe size & reading",
        xLab: "Shoe size (EU)",
        yLab: "Reading score (0\u2013100)",
        zLab: "Age group",
        zGroups: ["Age 6\u20138", "Age 9\u201311", "Age 12\u201314"],
        zColors: ["#5B9BE8", "#9A6BFF", "#1FAF7E"],
        generate: (rng) => {
          const pts2 = [];
          for (let g = 0; g < 3; g++) {
            for (let i = 0; i < 30; i++) {
              const x = 26 + g * 6 + randn(rng) * 2;
              const y = 35 + g * 22 + randn(rng) * 8;
              pts2.push({ x, y, z: g });
            }
          }
          return pts2;
        }
      }
    };
    const sc = SCENARIOS[scenario];
    const pts = useMemo(() => {
      const rng = mulberry32(scenario === "icecream" ? 42 : 77);
      return sc.generate(rng);
    }, [scenario]);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const rAll = pearsonR(xs, ys);
    const rPerGroup = [0, 1, 2].map((g) => {
      const sub = pts.filter((p) => p.z === g);
      return pearsonR(sub.map((p) => p.x), sub.map((p) => p.y));
    });
    const W = 420, H = 260;
    const pad = { l: 48, r: 16, t: 16, b: 40 };
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const xRange = xMax - xMin || 1, yRange = yMax - yMin || 1;
    const px = (v) => pad.l + (v - xMin) / xRange * (W - pad.l - pad.r);
    const py = (v) => H - pad.b - (v - yMin) / yRange * (H - pad.t - pad.b);
    const mxAll = xs.reduce((a, b) => a + b) / xs.length;
    const myAll = ys.reduce((a, b) => a + b) / ys.length;
    let num = 0, den = 0;
    xs.forEach((x, i) => {
      num += (x - mxAll) * (ys[i] - myAll);
      den += (x - mxAll) ** 2;
    });
    const slope = num / (den || 1);
    const inter = myAll - slope * mxAll;
    const lx1 = xMin, lx2 = xMax;
    const ly1 = slope * lx1 + inter, ly2 = slope * lx2 + inter;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Confounding \xB7 the lurking variable",
        meta: sc.label,
        caption: "Both variables really do correlate \u2014 they share a common cause. Stratify by the confounder and each group's correlation collapses toward zero."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row", style: { gridTemplateColumns: "220px 1fr" } }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Scenario"), /* @__PURE__ */ React.createElement("div", { className: "seg", style: { flexDirection: "column", gap: 4 } }, Object.entries(SCENARIOS).map(([k, v]) => /* @__PURE__ */ React.createElement("button", { key: k, className: scenario === k ? "on" : "", onClick: () => {
        setScenario(k);
        setRevealed(false);
      } }, v.label)))), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl", style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: `btn btn-sm ${revealed ? "btn-primary" : ""}`,
          onClick: () => setRevealed((r) => !r)
        },
        revealed ? "\u2713 Confounder visible" : "Reveal confounder"
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { marginTop: 12, gridTemplateColumns: "1fr" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "OVERALL r"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { fontSize: 24, color: "var(--magenta-ink)" } }, round(rAll, 2)), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "looks causal!")), revealed && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10 } }, rPerGroup.map((r, g) => /* @__PURE__ */ React.createElement("div", { key: g, style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: inkOf(sc.zColors[g]), fontFamily: "'JetBrains Mono',monospace" } }, sc.zGroups[g]), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-3)" } }, "r = ", round(r, 2)))), /* @__PURE__ */ React.createElement("div", { className: "sub", style: { marginTop: 6 } }, "within-group r \u2248 0"))), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 11.5, marginTop: 10, color: "var(--ink-3)" } }, sc.zLab, " drives both axes. Remove its influence and the correlation vanishes.")), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, /* @__PURE__ */ React.createElement("line", { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: "#4A4540", strokeWidth: "1" }), /* @__PURE__ */ React.createElement("line", { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: "#4A4540", strokeWidth: "1" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: W / 2,
          y: H - 4,
          textAnchor: "middle",
          fontSize: "10",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono',monospace"
        },
        sc.xLab
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: 10,
          y: H / 2,
          textAnchor: "middle",
          fontSize: "10",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono',monospace",
          transform: `rotate(-90,10,${H / 2})`
        },
        sc.yLab
      ), !revealed && /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: px(lx1),
          y1: py(ly1),
          x2: px(lx2),
          y2: py(ly2),
          stroke: "#FF4DA2",
          strokeWidth: "1.5",
          strokeDasharray: "5 4",
          opacity: "0.7"
        }
      ), revealed && [0, 1, 2].map((g) => {
        const sub = pts.filter((p) => p.z === g);
        const gxs = sub.map((p) => p.x), gys = sub.map((p) => p.y);
        const gxm = gxs.reduce((a, b) => a + b) / gxs.length;
        const gym = gys.reduce((a, b) => a + b) / gys.length;
        let gn = 0, gd = 0;
        gxs.forEach((x, i) => {
          gn += (x - gxm) * (gys[i] - gym);
          gd += (x - gxm) ** 2;
        });
        const gs = gn / (gd || 1);
        const gi = gym - gs * gxm;
        const gx1 = Math.min(...gxs), gx2 = Math.max(...gxs);
        return /* @__PURE__ */ React.createElement(
          "line",
          {
            key: g,
            x1: px(gx1),
            y1: py(gs * gx1 + gi),
            x2: px(gx2),
            y2: py(gs * gx2 + gi),
            stroke: sc.zColors[g],
            strokeWidth: "1.5",
            opacity: "0.7",
            strokeDasharray: "4 3"
          }
        );
      }), pts.map((p, i) => /* @__PURE__ */ React.createElement(
        "circle",
        {
          key: i,
          cx: px(p.x),
          cy: py(p.y),
          r: "4",
          fill: revealed ? sc.zColors[p.z] : "#9A6BFF",
          opacity: 0.8,
          stroke: "rgba(0,0,0,0.2)",
          strokeWidth: "0.5"
        }
      )), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: W - pad.r - 4,
          y: pad.t + 14,
          textAnchor: "end",
          fontSize: "13",
          fill: "#FF4DA2",
          fontFamily: "'JetBrains Mono',monospace",
          fontWeight: "700"
        },
        "r = ",
        round(rAll, 2)
      ))))
    );
  }
  function DAGBuilder() {
    const [active, setActive] = useState(0);
    const DAGS = [
      {
        title: "Direct effect",
        tag: "X \u2192 Y",
        nodes: [
          { id: "X", x: 0.2, y: 0.5, label: "X", role: "treatment" },
          { id: "Y", x: 0.8, y: 0.5, label: "Y", role: "outcome" }
        ],
        edges: [{ from: "X", to: "Y", type: "causal" }],
        question: "Can we estimate X \u2192 Y?",
        answer: "Yes \u2014 directly.",
        adjustZ: null,
        adjustIcon: "\u2014",
        explanation: "No confounders, no colliders. A simple regression of Y on X recovers the causal effect. This is the ideal scenario."
      },
      {
        title: "Fork / Confounder",
        tag: "X \u2190 Z \u2192 Y",
        nodes: [
          { id: "Z", x: 0.5, y: 0.15, label: "Z", role: "confounder" },
          { id: "X", x: 0.2, y: 0.75, label: "X", role: "treatment" },
          { id: "Y", x: 0.8, y: 0.75, label: "Y", role: "outcome" }
        ],
        edges: [
          { from: "Z", to: "X", type: "causal" },
          { from: "Z", to: "Y", type: "causal" },
          { from: "X", to: "Y", type: "spurious" }
        ],
        question: "Can we estimate X \u2192 Y?",
        answer: "Yes \u2014 but only after controlling for Z.",
        adjustZ: true,
        adjustIcon: "\u2713 Adjust for Z",
        explanation: "Z opens a backdoor path X \u2190 Z \u2192 Y. Including Z in the regression blocks this path and isolates the X \u2192 Y effect. Classic omitted-variable bias if you skip it."
      },
      {
        title: "Mediator",
        tag: "X \u2192 Z \u2192 Y",
        nodes: [
          { id: "X", x: 0.15, y: 0.5, label: "X", role: "treatment" },
          { id: "Z", x: 0.5, y: 0.5, label: "Z", role: "mediator" },
          { id: "Y", x: 0.85, y: 0.5, label: "Y", role: "outcome" }
        ],
        edges: [
          { from: "X", to: "Z", type: "causal" },
          { from: "Z", to: "Y", type: "causal" },
          { from: "X", to: "Y", type: "direct" }
        ],
        question: "Can we estimate X \u2192 Y total effect?",
        answer: "Yes \u2014 but do NOT control for Z.",
        adjustZ: false,
        adjustIcon: "\u2717 Do not adjust for Z",
        explanation: "Z is on the causal path from X to Y. Conditioning on it blocks the indirect pathway and you measure only the direct effect \u2014 not the total. Control for Z only when you explicitly want the direct effect."
      },
      {
        title: "Collider",
        tag: "X \u2192 Z \u2190 Y",
        nodes: [
          { id: "X", x: 0.2, y: 0.25, label: "X", role: "treatment" },
          { id: "Y", x: 0.8, y: 0.25, label: "Y", role: "outcome" },
          { id: "Z", x: 0.5, y: 0.75, label: "Z", role: "collider" }
        ],
        edges: [
          { from: "X", to: "Z", type: "causal" },
          { from: "Y", to: "Z", type: "causal" },
          { from: "X", to: "Y", type: "spurious" }
        ],
        question: "Can we estimate X \u2192 Y?",
        answer: "Yes \u2014 but NEVER condition on Z.",
        adjustZ: false,
        adjustIcon: "\u2717 Do not adjust for Z",
        explanation: 'Z is a collider: both X and Y point into it. Conditioning on Z opens a fake association between X and Y. This is selection bias \u2014 e.g., conditioning on "hired by top firm" creates spurious talent-looks tradeoff.'
      }
    ];
    const dag = DAGS[active];
    const W = 360, H = 200;
    const ROLE_COLOR = {
      treatment: "#5B9BE8",
      outcome: "#1FAF7E",
      confounder: "#FFC266",
      mediator: "#9A6BFF",
      collider: "#FF4DA2"
    };
    const EDGE_COLOR = { causal: "#C7C4BC", spurious: "#FF4DA2", direct: "#D1FF3A" };
    const markerFor = (type) => type === "spurious" ? "arr-red9" : type === "direct" ? "arr-lime9" : "arr9";
    function edgePath(from, to, nodes) {
      const nf = nodes.find((n) => n.id === from);
      const nt = nodes.find((n) => n.id === to);
      const r = 26;
      const dx = nt.x * W - nf.x * W, dy = nt.y * H - nf.y * H;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / dist, uy = dy / dist;
      return {
        x1: nf.x * W + ux * r,
        y1: nf.y * H + uy * r,
        x2: nt.x * W - ux * r,
        y2: nt.y * H - uy * r
      };
    }
    const adjustColor = dag.adjustZ === null ? "#8A8680" : dag.adjustZ ? "#1FAF7E" : "#FF4DA2";
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "DAG patterns \xB7 should you adjust for Z?",
        meta: dag.tag,
        caption: "Four structural patterns. Each has a different answer to 'should I include Z in my regression?' The answer is never obvious from data alone \u2014 only the DAG tells you."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row", style: { gridTemplateColumns: "1fr 1fr" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "seg", style: { flexDirection: "column", gap: 4 } }, DAGS.map((d, i) => /* @__PURE__ */ React.createElement("button", { key: i, className: active === i ? "on" : "", onClick: () => setActive(i) }, d.title, " ", /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.55, fontSize: 10 } }, d.tag)))), /* @__PURE__ */ React.createElement("div", { style: {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8,
        padding: "12px 14px",
        marginTop: 4
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--ink-3)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 } }, dag.question), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 8 } }, dag.answer), /* @__PURE__ */ React.createElement("div", { style: {
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono',monospace",
        background: `${adjustColor}22`,
        color: inkOf(adjustColor),
        border: `1px solid ${adjustColor}66`,
        marginBottom: 8
      } }, dag.adjustIcon), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 11.5, margin: 0, color: "var(--ink-3)" } }, dag.explanation))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, /* @__PURE__ */ React.createElement("defs", null, ["arr9", "arr-red9", "arr-lime9"].map((id, idx) => {
        const colors = ["#C7C4BC", "#FF4DA2", "#D1FF3A"];
        return /* @__PURE__ */ React.createElement("marker", { key: id, id, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "5", markerHeight: "5", orient: "auto" }, /* @__PURE__ */ React.createElement("path", { d: "M0,0 L10,5 L0,10 z", fill: colors[idx] }));
      })), dag.edges.map((e, i) => {
        const { x1, y1, x2, y2 } = edgePath(e.from, e.to, dag.nodes);
        return /* @__PURE__ */ React.createElement(
          "line",
          {
            key: i,
            x1,
            y1,
            x2,
            y2,
            stroke: EDGE_COLOR[e.type],
            strokeWidth: 1.8,
            strokeDasharray: e.type === "spurious" ? "5 4" : "",
            markerEnd: `url(#${markerFor(e.type)})`,
            opacity: 0.85
          }
        );
      }), dag.nodes.map((n) => {
        const col = ROLE_COLOR[n.role] || "#C7C4BC";
        return /* @__PURE__ */ React.createElement("g", { key: n.id }, /* @__PURE__ */ React.createElement(
          "circle",
          {
            cx: n.x * W,
            cy: n.y * H,
            r: "26",
            fill: `${col}18`,
            stroke: col,
            strokeWidth: "2"
          }
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: n.x * W,
            y: n.y * H + 5,
            textAnchor: "middle",
            fill: "#F4F2EC",
            fontSize: "15",
            fontFamily: "'JetBrains Mono',monospace",
            fontWeight: "700"
          },
          n.label
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: n.x * W,
            y: n.y * H + 42,
            textAnchor: "middle",
            fill: col,
            fontSize: "9",
            fontFamily: "'JetBrains Mono',monospace",
            style: { textTransform: "uppercase", letterSpacing: "0.06em" }
          },
          n.role
        ));
      }))))
    );
  }
  function DifferenceInDifferences() {
    const [effect, setEffect] = useState(8);
    const [parallelOk, setParallelOk] = useState(true);
    const C_pre = 40, C_post = 46;
    const T_pre = 38;
    const commonTrend = C_post - C_pre;
    const T_counterfactual = T_pre + commonTrend;
    const T_actual = T_pre + commonTrend + effect + (parallelOk ? 0 : 5);
    const DiD = T_actual - T_counterfactual;
    const W = 440, H = 240;
    const PAD = { l: 50, r: 20, t: 20, b: 40 };
    const xPre = PAD.l + 80, xPost = W - PAD.r - 60;
    const yMin = 25, yMax = 75;
    const py = (v) => H - PAD.b - (v - yMin) / (yMax - yMin) * (H - PAD.t - PAD.b);
    const xTick = (x, label, y) => /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("line", { x1: x, y1: H - PAD.b, x2: x, y2: H - PAD.b + 4, stroke: "#6A6270" }), /* @__PURE__ */ React.createElement(
      "text",
      {
        x,
        y: H - PAD.b + 16,
        textAnchor: "middle",
        fontSize: "10",
        fill: "#6A6270",
        fontFamily: "'JetBrains Mono',monospace"
      },
      label
    ));
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Difference-in-Differences",
        meta: `DiD estimate = ${round(DiD, 1)}`,
        caption: "The key assumption is parallel trends: in the absence of treatment, both groups would have moved the same way. Drag the effect slider to see what DiD measures."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row", style: { gridTemplateColumns: "220px 1fr" } }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "True treatment effect ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, effect, " pts")), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "-10",
          max: "25",
          step: "1",
          "aria-label": "True treatment effect",
          value: effect,
          onChange: (e) => setEffect(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Parallel trends"), /* @__PURE__ */ React.createElement("div", { className: "seg", style: { gap: 4 } }, /* @__PURE__ */ React.createElement("button", { className: parallelOk ? "on" : "", onClick: () => setParallelOk(true) }, "Hold"), /* @__PURE__ */ React.createElement("button", { className: !parallelOk ? "on" : "", onClick: () => setParallelOk(false) }, "Violated"))), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { gridTemplateColumns: "1fr 1fr", marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "T_post \u2212 T_pre"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { fontSize: 18 } }, round(T_actual - T_pre, 1))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "C_post \u2212 C_pre"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { fontSize: 18 } }, round(C_post - C_pre, 1)))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(91,158,232,0.08)", border: "1px solid rgba(91,158,232,0.2)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "var(--ink-3)", fontFamily: "'JetBrains Mono',monospace" } }, "DiD estimate"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 700, color: DiD > 0 ? "var(--good-ink)" : "var(--magenta-ink)", fontFamily: "'JetBrains Mono',monospace" } }, round(DiD, 1), " pts"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "var(--ink-3)", marginTop: 4 } }, "= (T_post \u2212 T_pre) \u2212 (C_post \u2212 C_pre)")), !parallelOk && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "rgba(255,77,162,0.08)", border: "1px solid rgba(255,77,162,0.3)", fontSize: 11, color: "var(--magenta-ink)" } }, "Parallel trends violated \u2014 DiD is biased by +5 pts.")), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, [30, 40, 50, 60, 70].map((v) => /* @__PURE__ */ React.createElement("g", { key: v }, /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: PAD.l,
          y1: py(v),
          x2: W - PAD.r,
          y2: py(v),
          stroke: "#2A2520",
          strokeWidth: "1",
          strokeDasharray: "2 4"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: PAD.l - 6,
          y: py(v) + 4,
          textAnchor: "end",
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono',monospace"
        },
        v
      ))), /* @__PURE__ */ React.createElement("line", { x1: PAD.l, y1: H - PAD.b, x2: W - PAD.r, y2: H - PAD.b, stroke: "#4A4540" }), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: (xPre + xPost) / 2,
          y1: PAD.t,
          x2: (xPre + xPost) / 2,
          y2: H - PAD.b,
          stroke: "#6A6270",
          strokeWidth: "1",
          strokeDasharray: "3 4",
          opacity: "0.6"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: (xPre + xPost) / 2,
          y: PAD.t + 10,
          textAnchor: "middle",
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "treatment"
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xPre,
          y1: py(C_pre),
          x2: xPost,
          y2: py(C_post),
          stroke: "#5B9BE8",
          strokeWidth: "2.5"
        }
      ), /* @__PURE__ */ React.createElement("circle", { cx: xPre, cy: py(C_pre), r: "5", fill: "#5B9BE8" }), /* @__PURE__ */ React.createElement("circle", { cx: xPost, cy: py(C_post), r: "5", fill: "#5B9BE8" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: xPost + 8,
          y: py(C_post) + 4,
          fontSize: "10",
          fill: "#5B9BE8",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "Control"
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xPre,
          y1: py(T_pre),
          x2: xPost,
          y2: py(T_counterfactual),
          stroke: "#E8A031",
          strokeWidth: "1.5",
          strokeDasharray: "5 4",
          opacity: "0.7"
        }
      ), /* @__PURE__ */ React.createElement("circle", { cx: xPost, cy: py(T_counterfactual), r: "4", fill: "#E8A031", opacity: "0.7" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: xPost + 8,
          y: py(T_counterfactual) + 4,
          fontSize: "10",
          fill: "#E8A031",
          opacity: "0.8",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "Counterfactual"
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xPre,
          y1: py(T_pre),
          x2: xPost,
          y2: py(T_actual),
          stroke: "#1FAF7E",
          strokeWidth: "2.5"
        }
      ), /* @__PURE__ */ React.createElement("circle", { cx: xPre, cy: py(T_pre), r: "5", fill: "#1FAF7E" }), /* @__PURE__ */ React.createElement("circle", { cx: xPost, cy: py(T_actual), r: "5", fill: "#1FAF7E" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: xPost + 8,
          y: py(T_actual) + 4,
          fontSize: "10",
          fill: "#1FAF7E",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "Treated"
      ), T_actual !== T_counterfactual && /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xPost + 45,
          y1: py(T_counterfactual),
          x2: xPost + 45,
          y2: py(T_actual),
          stroke: "#9A6BFF",
          strokeWidth: "1.5",
          markerEnd: "url(#arr9)"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: xPost + 52,
          y: (py(T_counterfactual) + py(T_actual)) / 2 + 4,
          fontSize: "10",
          fill: "#9A6BFF",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "DiD=",
        round(DiD, 1)
      )), xTick(xPre, "Pre", 0), xTick(xPost, "Post", 0))))
    );
  }
  function InstrumentalVariable() {
    const [strength, setStrength] = useState(1);
    const [showBias, setShowBias] = useState(false);
    const STRENGTHS = [
      { label: "Weak", corr: 0.12, fStat: 4.2, ivEst: 0.31, olesBias: 0.18 },
      { label: "Moderate", corr: 0.38, fStat: 22.1, ivEst: 0.62, olesBias: 0.18 },
      { label: "Strong", corr: 0.71, fStat: 89.4, ivEst: 0.68, olesBias: 0.18 }
    ];
    const s = STRENGTHS[strength];
    const trueEffect = 0.65;
    const bias = Math.abs(s.ivEst - trueEffect);
    const W = 400, H = 220;
    const nodes = {
      Z: { x: 0.08, y: 0.5, label: "Z", sub: "Proximity\nto college", color: "var(--warn-ink)" },
      X: { x: 0.45, y: 0.5, label: "X", sub: "Education", color: "var(--blue-ink)" },
      Y: { x: 0.82, y: 0.5, label: "Y", sub: "Earnings", color: "var(--good-ink)" },
      U: { x: 0.63, y: 0.1, label: "U", sub: "Unobserved\nconfounders", color: "var(--magenta-ink)" }
    };
    const r = 26;
    function arrow(from, to, color, dashed = false, curved = false) {
      const nf = nodes[from], nt = nodes[to];
      const dx = nt.x * W - nf.x * W, dy = nt.y * H - nf.y * H;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / dist, uy = dy / dist;
      const x1 = nf.x * W + ux * r, y1 = nf.y * H + uy * r;
      const x2 = nt.x * W - ux * r, y2 = nt.y * H - uy * r;
      if (curved) {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 30;
        return /* @__PURE__ */ React.createElement(
          "path",
          {
            d: `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`,
            stroke: color,
            strokeWidth: "1.5",
            fill: "none",
            strokeDasharray: dashed ? "5 4" : "",
            opacity: 0.85,
            markerEnd: `url(#iv-arr-${color.replace("#", "")})`
          }
        );
      }
      return /* @__PURE__ */ React.createElement(
        "line",
        {
          x1,
          y1,
          x2,
          y2,
          stroke: color,
          strokeWidth: from === "Z" ? 2 + strength * 0.6 : 1.8,
          strokeDasharray: dashed ? "5 4" : "",
          opacity: dashed ? 0.65 : 0.9,
          markerEnd: `url(#iv-arr-${color.replace("#", "")})`
        }
      );
    }
    const markerColors = ["#E8A031", "#5B9BE8", "#FF4DA2", "#C7C4BC"];
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Instrumental Variables",
        meta: `F-stat: ${s.fStat}`,
        caption: "An instrument (Z) must: (1) affect X (relevance), (2) be unrelated to unobserved confounders (exogeneity), (3) affect Y only through X (exclusion restriction). Weak instruments cause IV estimates to be nearly as biased as OLS."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row", style: { gridTemplateColumns: "220px 1fr" } }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Instrument strength"), /* @__PURE__ */ React.createElement("div", { className: "seg", style: { flexDirection: "column", gap: 4 } }, STRENGTHS.map((st, i) => /* @__PURE__ */ React.createElement("button", { key: i, className: strength === i ? "on" : "", onClick: () => setStrength(i) }, st.label, " ", /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.5, fontSize: 10 } }, "r=", st.corr))))), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl", style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: `btn btn-sm ${showBias ? "btn-primary" : ""}`,
          onClick: () => setShowBias((b) => !b)
        },
        showBias ? "Hide OLS bias" : "Compare OLS"
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { gridTemplateColumns: "1fr 1fr", marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "IV estimate"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { fontSize: 20, color: "var(--blue-ink)" } }, s.ivEst.toFixed(2)), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "bias: ", bias.toFixed(2))), showBias && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "OLS estimate"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { fontSize: 20, color: "var(--magenta-ink)" } }, (trueEffect + s.olesBias).toFixed(2)), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "bias: ", s.olesBias.toFixed(2)))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 11 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "var(--ink-3)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 } }, "F-statistic (first stage)"), /* @__PURE__ */ React.createElement("div", { style: { color: s.fStat < 10 ? "var(--magenta-ink)" : "var(--good-ink)", fontWeight: 700, fontSize: 16, fontFamily: "'JetBrains Mono',monospace" } }, s.fStat, " ", s.fStat < 10 ? "\u26A0 weak" : "\u2713"), /* @__PURE__ */ React.createElement("div", { style: { color: "var(--ink-3)", fontSize: 10, marginTop: 4 } }, "Rule of thumb: F > 10 for valid IV"))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, /* @__PURE__ */ React.createElement("defs", null, markerColors.map((c) => /* @__PURE__ */ React.createElement(
        "marker",
        {
          key: c,
          id: `iv-arr-${c.replace("#", "")}`,
          viewBox: "0 0 10 10",
          refX: "8",
          refY: "5",
          markerWidth: "5",
          markerHeight: "5",
          orient: "auto"
        },
        /* @__PURE__ */ React.createElement("path", { d: "M0,0 L10,5 L0,10 z", fill: c })
      ))), arrow("Z", "X", "#E8A031"), arrow("X", "Y", "#C7C4BC"), arrow("U", "X", "#FF4DA2", true), arrow("U", "Y", "#FF4DA2", true), Object.entries(nodes).map(([id, n]) => {
        const lines = n.sub.split("\n");
        return /* @__PURE__ */ React.createElement("g", { key: id }, /* @__PURE__ */ React.createElement(
          "circle",
          {
            cx: n.x * W,
            cy: n.y * H,
            r,
            fill: `${n.color}18`,
            stroke: n.color,
            strokeWidth: "2",
            strokeDasharray: id === "U" ? "4 3" : ""
          }
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: n.x * W,
            y: n.y * H + 5,
            textAnchor: "middle",
            fill: "#F4F2EC",
            fontSize: "15",
            fontFamily: "'JetBrains Mono',monospace",
            fontWeight: "700"
          },
          n.label
        ), lines.map((line, li) => /* @__PURE__ */ React.createElement(
          "text",
          {
            key: li,
            x: n.x * W,
            y: n.y * H + r + 14 + li * 13,
            textAnchor: "middle",
            fill: n.color,
            fontSize: "9",
            fontFamily: "'JetBrains Mono',monospace",
            opacity: 0.8
          },
          line
        )));
      }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: (nodes.Z.x * W + nodes.X.x * W) / 2,
          y: nodes.Z.y * H - 14,
          textAnchor: "middle",
          fontSize: "10",
          fill: "#E8A031",
          fontFamily: "'JetBrains Mono',monospace"
        },
        s.label,
        " \xB7 r=",
        s.corr
      ), /* @__PURE__ */ React.createElement("g", { transform: `translate(${W - 130}, ${H - 50})` }, /* @__PURE__ */ React.createElement("rect", { width: "120", height: "42", rx: "4", fill: "rgba(0,0,0,0.25)" }), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "12", x2: "28", y2: "12", stroke: "#E8A031", strokeWidth: "2" }), /* @__PURE__ */ React.createElement("text", { x: "32", y: "16", fontSize: "9", fill: "#C7C4BC", fontFamily: "'JetBrains Mono',monospace" }, "causal path"), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "30", x2: "28", y2: "30", stroke: "#FF4DA2", strokeWidth: "1.5", strokeDasharray: "4 3" }), /* @__PURE__ */ React.createElement("text", { x: "32", y: "34", fontSize: "9", fill: "#C7C4BC", fontFamily: "'JetBrains Mono',monospace" }, "unobserved")))))
    );
  }
  function DAGViewer() {
    const [scenario, setScenario] = useState("confounder");
    const scenarios = {
      confounder: {
        name: "Confounding",
        blurb: `"Coffee correlates with heart disease" \u2014 but age causes both. Age is the confounder. Control for it and coffee's effect vanishes.`,
        nodes: [
          { id: "age", lab: "Age", x: 0.5, y: 0.15, role: "confounder" },
          { id: "cof", lab: "Coffee", x: 0.2, y: 0.65 },
          { id: "hd", lab: "Heart disease", x: 0.8, y: 0.65, role: "outcome" }
        ],
        edges: [["age", "cof"], ["age", "hd"], ["cof", "hd", "spurious"]]
      },
      collider: {
        name: "Collider bias",
        blurb: '"Talent is negatively correlated with looks in Hollywood." Both cause success \u2014 conditioning on success creates a fake negative link.',
        nodes: [
          { id: "tal", lab: "Talent", x: 0.2, y: 0.25 },
          { id: "loo", lab: "Looks", x: 0.8, y: 0.25 },
          { id: "suc", lab: "Success", x: 0.5, y: 0.75, role: "collider" }
        ],
        edges: [["tal", "suc"], ["loo", "suc"], ["tal", "loo", "spurious"]]
      },
      mediator: {
        name: "Mediation",
        blurb: '"Exercise \u2192 better sleep \u2192 weight loss." Sleep is a mediator. Controlling for it hides the true effect of exercise on weight.',
        nodes: [
          { id: "ex", lab: "Exercise", x: 0.15, y: 0.5 },
          { id: "sl", lab: "Sleep", x: 0.5, y: 0.5, role: "mediator" },
          { id: "wl", lab: "Weight loss", x: 0.85, y: 0.5, role: "outcome" }
        ],
        edges: [["ex", "sl"], ["sl", "wl"], ["ex", "wl", "direct"]]
      }
    };
    const s = scenarios[scenario];
    const W = 400, H = 240;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "REFERENCE",
        title: "DAGs \xB7 the three patterns",
        meta: s.name,
        caption: "Every causal mistake is one of these three. Learn to spot them on paper before you code anything."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Pattern"), /* @__PURE__ */ React.createElement("div", { className: "seg", style: { flexDirection: "column", gap: 4 } }, Object.entries(scenarios).map(([k, v]) => /* @__PURE__ */ React.createElement("button", { key: k, className: scenario === k ? "on" : "", onClick: () => setScenario(k) }, v.name)))), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 12.5, margin: 0 } }, s.blurb)), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("marker", { id: "arr", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto" }, /* @__PURE__ */ React.createElement("path", { d: "M0,0 L10,5 L0,10 z", fill: "#C7C4BC" })), /* @__PURE__ */ React.createElement("marker", { id: "arr-red", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto" }, /* @__PURE__ */ React.createElement("path", { d: "M0,0 L10,5 L0,10 z", fill: "#FF4DA2" })), /* @__PURE__ */ React.createElement("marker", { id: "arr-lime", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto" }, /* @__PURE__ */ React.createElement("path", { d: "M0,0 L10,5 L0,10 z", fill: "#D1FF3A" }))), s.edges.map(([a, b, type], i) => {
        const na = s.nodes.find((n) => n.id === a), nb = s.nodes.find((n) => n.id === b);
        const color = type === "spurious" ? "#FF4DA2" : type === "direct" ? "#D1FF3A" : "#C7C4BC";
        const marker = type === "spurious" ? "arr-red" : type === "direct" ? "arr-lime" : "arr";
        return /* @__PURE__ */ React.createElement(
          "line",
          {
            key: i,
            x1: na.x * W,
            y1: na.y * H,
            x2: nb.x * W,
            y2: nb.y * H,
            stroke: color,
            strokeWidth: type ? 2 : 1.5,
            strokeDasharray: type === "spurious" ? "5 4" : "",
            markerEnd: `url(#${marker})`,
            opacity: type === "spurious" ? 0.7 : 0.9
          }
        );
      }), s.nodes.map((n) => /* @__PURE__ */ React.createElement("g", { key: n.id }, /* @__PURE__ */ React.createElement(
        "circle",
        {
          cx: n.x * W,
          cy: n.y * H,
          r: "28",
          fill: n.role === "confounder" ? "rgba(255,194,102,0.15)" : n.role === "collider" ? "rgba(255,77,162,0.15)" : n.role === "mediator" ? "rgba(154,107,255,0.15)" : "rgba(244,242,236,0.05)",
          stroke: n.role === "confounder" ? "#FFC266" : n.role === "collider" ? "#FF4DA2" : n.role === "mediator" ? "#9A6BFF" : "#C7C4BC",
          strokeWidth: "2"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: n.x * W,
          y: n.y * H + 4,
          textAnchor: "middle",
          fill: "#F4F2EC",
          fontSize: "11",
          fontFamily: "'JetBrains Mono',monospace",
          fontWeight: "600"
        },
        n.lab
      ), n.role && /* @__PURE__ */ React.createElement(
        "text",
        {
          x: n.x * W,
          y: n.y * H + 44,
          textAnchor: "middle",
          fill: "#8A8680",
          fontSize: "9",
          fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: "0.1em",
          style: { textTransform: "uppercase" }
        },
        n.role
      ))))))
    );
  }
  function Ch09_Causal() {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 09 \xB7 Causal",
        title: 'Correlation is a <em>hypothesis.</em><br/>Causation takes <span class="accent">work.</span>',
        hook: "When you can't run an experiment, you need causal inference. DAGs, backdoor adjustment, difference-in-differences, instrumental variables. The math is harder; the judgment is harder still.",
        meta: [{ k: "Read", v: "14 min" }, { k: "Focus", v: "DAGs \xB7 DiD \xB7 IV" }, { k: "Sims", v: "4 interactive" }]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "09.1" }, "The lurking variable"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "The correlation that ", /* @__PURE__ */ React.createElement("em", null, "looks"), " causal."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Ice cream sales and drowning deaths are correlated at r \u2248 0.85 \u2014 yet nobody believes ice cream causes drowning. The driver is temperature: hot weather increases both. Stratify by temperature and each group's correlation collapses toward zero. This is the confounder in action."), /* @__PURE__ */ React.createElement(ConfoundingSimulator, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "09.2" }, "Causal graphs"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Draw the DAG ", /* @__PURE__ */ React.createElement("em", null, "before"), " the regression."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A Directed Acyclic Graph (DAG) is a causal model. Every node is a variable; every arrow is a direct causal claim. The structure tells you which variables to adjust for \u2014 and which to leave out. The four structural patterns cover almost every mistake you'll encounter."), /* @__PURE__ */ React.createElement(DAGBuilder, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "09.3" }, "Classic DAG patterns"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Confounder. Collider. Mediator."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Nearly every causal mistake in DS is one of these three. Memorise them. Your regression software will never warn you which pattern you're in."), /* @__PURE__ */ React.createElement(DAGViewer, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "09.4" }, "Quasi-experiments"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "When randomisation is impossible, find the ", /* @__PURE__ */ React.createElement("em", null, "natural experiment.")), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Difference-in-Differences (DiD) compares the change in a treated group to the change in an untreated control group over the same period. The control's trend becomes the counterfactual for what would have happened to the treated group without treatment. The critical assumption: both groups would have followed the same trend in the absence of treatment."), /* @__PURE__ */ React.createElement(DifferenceInDifferences, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "09.5" }, "Instrumental variables"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Find a lever that moves X but ", /* @__PURE__ */ React.createElement("em", null, "nothing else.")), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "When unmeasured confounders bias OLS, an instrumental variable (IV) can save you. The instrument Z must affect X (relevance) without directly affecting Y (exclusion restriction) and without being related to the unobserved confounders (exogeneity). Angrist and Krueger's classic: proximity to college as an instrument for years of education."), /* @__PURE__ */ React.createElement(InstrumentalVariable, null)), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Controlling for a collider.</b> Opens a fake correlation between its parents \u2014 selection bias in disguise.",
      "<b>Controlling for a mediator.</b> Zeros out the very effect you're trying to measure.",
      "<b>Regressing on everything.</b> More controls \u2260 better estimate. The DAG determines the adjustment set.",
      "<b>Using a weak instrument.</b> F-stat < 10 means IV estimates inherit OLS bias while adding variance.",
      "<b>Violating parallel trends silently.</b> Always plot the pre-period trends for treatment and control before running DiD."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Draw the DAG first.</b> On paper, before any code. Share it with domain experts \u2014 they'll spot wrong arrows.",
      "<b>Use the backdoor criterion.</b> Find the minimal adjustment set that blocks all non-causal paths.",
      "<b>Test pre-period trends for DiD.</b> If control and treated diverge before treatment, the design is invalid.",
      "<b>Always report the first-stage F-stat for IV.</b> Rule of thumb: F > 10 means the instrument is relevant.",
      "<b>Be explicit about which effect you want.</b> Total effect? Direct effect? Local Average Treatment Effect (LATE)?"
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Draw the DAG before the regression.</b> The DAG tells you what to include \u2014 not stepwise selection, not VIF.",
      `<b>"Controlling for X" is not harmless.</b> It depends entirely on X's structural role.`,
      "<b>Causal inference from observational data requires strong assumptions.</b> State them. Defend them.",
      "<b>When in doubt, run an experiment.</b> All quasi-experimental methods are second-best to randomisation."
    ] }));
  }
  window.Ch09_Causal = Ch09_Causal;
})();
