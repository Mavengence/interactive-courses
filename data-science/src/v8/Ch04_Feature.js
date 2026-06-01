(() => {
  const { useState, useMemo, useRef, useCallback } = React;
  const CITIES = ["New York", "London", "Tokyo", "Paris", "Berlin"];
  const CITY_TARGETS = [7.2, 6.8, 8.1, 7.5, 6.4];
  const CITY_COUNTS = [38, 22, 18, 12, 10];
  function EncodingComparison() {
    const [mode, setMode] = useState("onehot");
    const modes = [
      { key: "onehot", label: "One-Hot" },
      { key: "label", label: "Label" },
      { key: "target", label: "Target" },
      { key: "frequency", label: "Frequency" }
    ];
    const descriptions = {
      onehot: "Creates one binary column per category. Safe, interpretable. Explodes at high cardinality (1000 cities \u2192 1000 columns). No ordinal assumption.",
      label: 'Assigns each category an integer 1\u2013N. Compact but <strong>introduces false ordering</strong>: Berlin (5) is not "greater than" London (2). Breaks linear models.',
      target: "Replaces category with mean(target | category). Very powerful for tree models. <strong>Must be computed out-of-fold</strong> \u2014 computing on training data leaks the target.",
      frequency: "Replaces category with its frequency (count or ratio). Preserves cardinality signal without arbitrary ordering. Treats two equally-frequent cities as identical."
    };
    const tableData = useMemo(() => {
      if (mode === "onehot") {
        const headers2 = ["City (raw)", ...CITIES.map((c) => c.split(" ")[0])];
        const rows2 = CITIES.map((city, i) => {
          const cols = CITIES.map((_, j) => i === j ? "1" : "0");
          return [city, ...cols];
        });
        return { headers: headers2, rows: rows2 };
      }
      if (mode === "label") {
        const headers2 = ["City (raw)", "city_encoded"];
        const rows2 = CITIES.map((city, i) => [city, String(i + 1)]);
        return { headers: headers2, rows: rows2 };
      }
      if (mode === "target") {
        const headers2 = ["City (raw)", "city_target_enc"];
        const rows2 = CITIES.map((city, i) => [city, CITY_TARGETS[i].toFixed(2)]);
        return { headers: headers2, rows: rows2 };
      }
      const total = CITY_COUNTS.reduce((a, v) => a + v, 0);
      const headers = ["City (raw)", "city_count", "city_freq"];
      const rows = CITIES.map((city, i) => [
        city,
        String(CITY_COUNTS[i]),
        (CITY_COUNTS[i] / total).toFixed(2)
      ]);
      return { headers, rows };
    }, [mode]);
    const colorFor = (mode2, val, colIdx) => {
      if (mode2 === "onehot") return val === "1" ? "#D1FF3A" : "#2a2a2a";
      if (mode2 === "label") return colIdx === 1 ? `hsl(${Number(val) * 40}, 65%, 52%)` : "transparent";
      if (mode2 === "target") return colIdx === 1 ? `hsl(${(Number(val) - 6) * 120}, 60%, 48%)` : "transparent";
      if (mode2 === "frequency") return colIdx === 2 ? `hsl(200, 70%, ${70 - Number(val) * 80}%)` : "transparent";
      return "transparent";
    };
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Categorical encoding methods",
        meta: "City column \xB7 5 categories",
        caption: "One-hot is the safe default. Target encoding is the sharp knife \u2014 always out-of-fold. Label encoding silently breaks linear models."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Encoding strategy"), /* @__PURE__ */ React.createElement("div", { className: "seg" }, modes.map((m) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: m.key,
          className: mode === m.key ? "on" : "",
          onClick: () => setMode(m.key)
        },
        m.label
      )))), /* @__PURE__ */ React.createElement(
        "p",
        {
          className: "prose",
          style: { fontSize: 12.5, margin: 0 },
          dangerouslySetInnerHTML: { __html: descriptions[mode] }
        }
      ))),
      /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto", marginTop: 16 } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, tableData.headers.map((h, i) => /* @__PURE__ */ React.createElement("th", { key: i, style: {
        padding: "6px 10px",
        borderBottom: "1px solid #333",
        textAlign: "left",
        color: "#8A8680",
        fontWeight: 600,
        whiteSpace: "nowrap"
      } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, tableData.rows.map((row, ri) => /* @__PURE__ */ React.createElement("tr", { key: ri, style: { borderBottom: "1px solid #1e1e1e" } }, row.map((cell, ci) => {
        const bg = colorFor(mode, cell, ci);
        const isHighlight = bg !== "transparent" && bg !== "#2a2a2a";
        return /* @__PURE__ */ React.createElement("td", { key: ci, style: {
          padding: "5px 10px",
          background: ci === 0 ? "transparent" : bg,
          color: isHighlight ? "#0a0a0a" : bg === "#2a2a2a" ? "#444" : "#e0e0e0",
          fontWeight: ci === 0 ? 400 : 600,
          transition: "background 0.3s"
        } }, cell);
      })))))),
      mode === "label" && /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: 12,
        padding: "8px 12px",
        background: "#3a1a1a",
        border: "1px solid #7a2020",
        borderRadius: 6,
        fontSize: 12,
        color: "#ff8080"
      } }, "\u26A0 Linear models will treat Berlin (5) as 5\xD7 New York (1). This ordering is meaningless and injects noise."),
      mode === "target" && /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: 12,
        padding: "8px 12px",
        background: "#1a2a1a",
        border: "1px solid #2a6a2a",
        borderRadius: 6,
        fontSize: 12,
        color: "#80cc80"
      } }, "\u2713 Computed out-of-fold (correct). Values shown are held-out fold means \u2014 no target leakage.")
    );
  }
  function fitPoly(pts, degree) {
    const n = pts.length;
    const d = degree + 1;
    const X = pts.map((p) => Array.from({ length: d }, (_, k) => p.x ** k));
    const XtX = Array.from({ length: d }, (_, i) => Array.from(
      { length: d },
      (_2, j) => X.reduce((s, row) => s + row[i] * row[j], 0)
    ));
    const Xty = Array.from(
      { length: d },
      (_, i) => X.reduce((s, row, r) => s + row[i] * pts[r].y, 0)
    );
    const A = XtX.map((row, i) => [...row, Xty[i]]);
    for (let col = 0; col < d; col++) {
      let maxRow = col;
      for (let row = col + 1; row < d; row++) {
        if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
      }
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      const pivot = A[col][col];
      if (Math.abs(pivot) < 1e-12) continue;
      for (let row = col + 1; row < d; row++) {
        const f = A[row][col] / pivot;
        for (let k = col; k <= d; k++) A[row][k] -= f * A[col][k];
      }
    }
    const coeffs = new Array(d).fill(0);
    for (let i = d - 1; i >= 0; i--) {
      let s = A[i][d];
      for (let j = i + 1; j < d; j++) s -= A[i][j] * coeffs[j];
      coeffs[i] = A[i][i] !== 0 ? s / A[i][i] : 0;
    }
    return coeffs;
  }
  function evalPoly(coeffs, x) {
    return coeffs.reduce((s, c, k) => s + c * x ** k, 0);
  }
  function computeR2(pts, coeffs) {
    const yMean = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const ssTot = pts.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
    const ssRes = pts.reduce((s, p) => s + (p.y - evalPoly(coeffs, p.x)) ** 2, 0);
    return ssTot < 1e-10 ? 1 : 1 - ssRes / ssTot;
  }
  function PolynomialExpansion() {
    const [degree, setDegree] = useState(2);
    const pts = useMemo(() => {
      const rng = mulberry32(42);
      return Array.from({ length: 40 }, () => {
        const x = rng() * 2 - 1;
        const y = x * x + 0.25 * randn(rng);
        return { x, y };
      });
    }, []);
    const coeffs = useMemo(() => fitPoly(pts, degree), [pts, degree]);
    const r2 = useMemo(() => round(computeR2(pts, coeffs), 3), [pts, coeffs]);
    const W = 460, H = 210;
    const PAD = { l: 36, r: 14, t: 14, b: 28 };
    const xScale = (x) => PAD.l + (x + 1) / 2 * (W - PAD.l - PAD.r);
    const yScale = (y) => PAD.t + (1.4 - y) / 2.2 * (H - PAD.t - PAD.b);
    const curvePath = useMemo(() => {
      const steps = 100;
      return Array.from({ length: steps + 1 }, (_, i) => {
        const x = -1 + i / steps * 2;
        const y = clamp(evalPoly(coeffs, x), -0.8, 1.35);
        const px = xScale(x), py = yScale(y);
        return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
      }).join(" ");
    }, [coeffs]);
    const complexityLabel = degree === 1 ? "Underfits (high bias)" : degree === 2 ? "Good fit" : "Slight overfit (high complexity)";
    const complexityColor = degree === 1 ? "#ff6b6b" : degree === 2 ? "#D1FF3A" : "#ffa94d";
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Polynomial feature expansion",
        meta: `Degree ${degree} \xB7 Train R\xB2 = ${r2}`,
        caption: "Degree 1 cannot capture the parabola (bias). Degree 2 fits well. Degree 3 starts chasing noise (variance)."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-controls", style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Polynomial degree"), /* @__PURE__ */ React.createElement("div", { className: "seg" }, [1, 2, 3].map((d) => /* @__PURE__ */ React.createElement("button", { key: d, className: degree === d ? "on" : "", onClick: () => setDegree(d) }, "Degree ", d)))), /* @__PURE__ */ React.createElement("div", { style: {
        display: "flex",
        gap: 24,
        marginTop: 8,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace"
      } }, /* @__PURE__ */ React.createElement("span", { style: { color: complexityColor } }, complexityLabel), /* @__PURE__ */ React.createElement("span", { style: { color: "#8A8680" } }, "Features: ", degree === 1 ? "x" : degree === 2 ? "x, x\xB2" : "x, x\xB2, x\xB3"), /* @__PURE__ */ React.createElement("span", { style: { color: "#8A8680" } }, "Complexity: ", "\u25CF".repeat(degree), "\u25CB".repeat(3 - degree)))),
      /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", display: "block" } }, [-0.5, 0, 0.5, 1].map((yv) => /* @__PURE__ */ React.createElement(
        "line",
        {
          key: yv,
          x1: PAD.l,
          x2: W - PAD.r,
          y1: yScale(yv),
          y2: yScale(yv),
          stroke: "#2a2a2a",
          strokeWidth: "1"
        }
      )), [-0.75, -0.25, 0.25, 0.75].map((xv) => /* @__PURE__ */ React.createElement(
        "line",
        {
          key: xv,
          x1: xScale(xv),
          x2: xScale(xv),
          y1: PAD.t,
          y2: H - PAD.b,
          stroke: "#2a2a2a",
          strokeWidth: "1"
        }
      )), [-0.5, 0, 0.5, 1].map((yv) => /* @__PURE__ */ React.createElement(
        "text",
        {
          key: yv,
          x: PAD.l - 4,
          y: yScale(yv) + 4,
          textAnchor: "end",
          fontSize: "9",
          fontFamily: "'JetBrains Mono', monospace",
          fill: "#555"
        },
        yv
      )), /* @__PURE__ */ React.createElement(
        "path",
        {
          d: Array.from({ length: 101 }, (_, i) => {
            const x = -1 + i / 100 * 2;
            const y = clamp(x * x, -0.8, 1.35);
            return `${i === 0 ? "M" : "L"}${xScale(x).toFixed(1)},${yScale(y).toFixed(1)}`;
          }).join(" "),
          stroke: "#444",
          strokeWidth: "1.5",
          fill: "none",
          strokeDasharray: "4 3"
        }
      ), pts.map((p, i) => /* @__PURE__ */ React.createElement(
        "circle",
        {
          key: i,
          cx: xScale(p.x),
          cy: yScale(clamp(p.y, -0.8, 1.35)),
          r: "3",
          fill: "#4a7fa5",
          opacity: "0.7"
        }
      )), /* @__PURE__ */ React.createElement(
        "path",
        {
          d: curvePath,
          stroke: complexityColor,
          strokeWidth: "2.2",
          fill: "none",
          style: { transition: "stroke 0.3s" }
        }
      ), /* @__PURE__ */ React.createElement("line", { x1: W - 130, x2: W - 110, y1: 22, y2: 22, stroke: "#444", strokeWidth: "1.5", strokeDasharray: "4 3" }), /* @__PURE__ */ React.createElement("text", { x: W - 105, y: 26, fontSize: "9", fontFamily: "'JetBrains Mono', monospace", fill: "#555" }, "true y=x\xB2"), /* @__PURE__ */ React.createElement("line", { x1: W - 130, x2: W - 110, y1: 36, y2: 36, stroke: complexityColor, strokeWidth: "2.2" }), /* @__PURE__ */ React.createElement("text", { x: W - 105, y: 40, fontSize: "9", fontFamily: "'JetBrains Mono', monospace", fill: complexityColor }, "degree ", degree, " fit"))
    );
  }
  const FEATURES = [
    { name: "user_age", corr: 0.72, mi: 0.68, lasso: 0.41 },
    { name: "session_dur", corr: 0.85, mi: 0.81, lasso: 0.53 },
    { name: "page_views", corr: 0.88, mi: 0.76, lasso: 0 },
    // correlated with session_dur → dropped by corr filter
    { name: "ad_relevance", corr: 0.31, mi: 0.72, lasso: 0.38 },
    { name: "random_noise_1", corr: 0.04, mi: 0.06, lasso: 0 },
    { name: "random_noise_2", corr: 0.02, mi: 0.03, lasso: 0 },
    { name: "device_type", corr: 0.55, mi: 0.49, lasso: 0.22 },
    { name: "time_of_day", corr: 0.38, mi: 0.61, lasso: 0.15 }
  ];
  const CORR_KEEP = [true, true, false, true, false, false, true, true];
  const MI_THRESHOLD = 0.1;
  const LASSO_THRESHOLD = 0.01;
  function FeatureSelectionSim() {
    const [method, setMethod] = useState("corr");
    const methods = [
      { key: "corr", label: "Correlation Filter" },
      { key: "mi", label: "Mutual Information" },
      { key: "lasso", label: "LASSO" }
    ];
    const kept = useMemo(() => {
      if (method === "corr") return CORR_KEEP;
      if (method === "mi") return FEATURES.map((f) => f.mi > MI_THRESHOLD);
      return FEATURES.map((f) => f.lasso > LASSO_THRESHOLD);
    }, [method]);
    const scores = useMemo(() => {
      if (method === "corr") return FEATURES.map((f) => f.corr);
      if (method === "mi") return FEATURES.map((f) => f.mi);
      return FEATURES.map((f) => f.lasso);
    }, [method]);
    const scoreLabel = method === "corr" ? "|corr with target|" : method === "mi" ? "MI score" : "LASSO coef";
    const methodDesc = {
      corr: "Remove features with low correlation to the target, then remove pairwise-correlated duplicates (keep highest corr). Fast but misses nonlinear relationships.",
      mi: "Measures how much knowing a feature reduces uncertainty about the target. Captures nonlinear dependencies. More expensive but rarely misses a useful feature.",
      lasso: "Fit a regularized linear model; features with zero coefficient are discarded. Jointly considers all features \u2014 handles multicollinearity. Assumes linearity."
    };
    const keptCount = kept.filter(Boolean).length;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Feature selection methods",
        meta: `${keptCount}/8 features kept`,
        caption: "No method dominates. LASSO sees interactions between features. MI catches nonlinearity. Correlation is fast but blind to nonlinear signals."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-controls", style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Selection method"), /* @__PURE__ */ React.createElement("div", { className: "seg" }, methods.map((m) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: m.key,
          className: method === m.key ? "on" : "",
          onClick: () => setMethod(m.key)
        },
        m.label
      )))), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 12.5, margin: "8px 0 0" } }, methodDesc[method])),
      /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 } }, FEATURES.map((f, i) => {
        const isKept = kept[i];
        const score = scores[i];
        const barW = Math.round(score * 100);
        return /* @__PURE__ */ React.createElement("div", { key: f.name, style: {
          padding: "10px 12px",
          border: `1.5px solid ${isKept ? "#3a5a1a" : "#3a1a1a"}`,
          borderRadius: 8,
          background: isKept ? "#0f1f08" : "#1a0808",
          transition: "background 0.35s, border-color 0.35s",
          position: "relative",
          overflow: "hidden"
        } }, /* @__PURE__ */ React.createElement("div", { style: {
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 3,
          width: `${barW}%`,
          background: isKept ? "#D1FF3A" : "#4a1a1a",
          transition: "width 0.4s, background 0.35s"
        } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: {
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: isKept ? "#D1FF3A" : "#6a3a3a"
        } }, f.name), /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: isKept ? "#aaa" : "#5a2a2a"
        } }, score.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: isKept ? "#5a8a30" : "#6a3030", marginTop: 3 } }, isKept ? "\u2713 KEEP" : "\u2717 DROP", " \xB7 ", scoreLabel));
      })),
      method === "corr" && /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: 10,
        padding: "7px 11px",
        background: "#1a1a2a",
        border: "1px solid #3a3a6a",
        borderRadius: 6,
        fontSize: 12,
        color: "#8080cc"
      } }, "page_views dropped: highly correlated with session_dur (r = 0.93). Keeping both adds no information.")
    );
  }
  function InteractionTerms() {
    const [featureA, setFeatureA] = useState(5);
    const [featureB, setFeatureB] = useState(5);
    const [view, setView] = useState("interaction");
    const GRID = 10;
    const W = 240, H = 240;
    const cellW = W / GRID, cellH = H / GRID;
    const grid = useMemo(() => {
      return Array.from({ length: GRID }, (_, row) => {
        const b = GRID - 1 - row;
        return Array.from({ length: GRID }, (_2, col) => {
          const a = col;
          return view === "interaction" ? a * b : a + b;
        });
      });
    }, [view]);
    const maxVal = view === "interaction" ? (GRID - 1) ** 2 : (GRID - 1) * 2;
    const heatColor = (val, max) => {
      const t = val / max;
      const r = Math.round(clamp(t * 2 - 0.5, 0, 1) * 210 + 20);
      const g = Math.round(clamp(t * 1.8 - 0.3, 0, 1) * 200 + 10);
      const b = Math.round(clamp((1 - t) * 1.5, 0, 1) * 180 + 20);
      return `rgb(${r},${g},${b})`;
    };
    const currentInteraction = featureA * featureB;
    const currentAdditive = featureA + featureB;
    const delta = currentInteraction - currentAdditive;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Interaction terms: A\xD7B vs A+B",
        meta: `A=${featureA}, B=${featureB}`,
        caption: "When the effect of A depends on B, you need A\xD7B \u2014 the additive A+B misses it. CTR example: a highly relevant ad shown to a young user converts far more than either signal predicts alone."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls", style: { flex: "0 0 200px" } }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Feature A (e.g. user age score): ", featureA), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "9",
          value: featureA,
          "aria-label": "Feature A (user age score)",
          onChange: (e) => setFeatureA(Number(e.target.value)),
          style: { width: "100%" }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Feature B (e.g. ad relevance): ", featureB), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "9",
          value: featureB,
          "aria-label": "Feature B (ad relevance)",
          onChange: (e) => setFeatureB(Number(e.target.value)),
          style: { width: "100%" }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl", style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("label", null, "Heatmap view"), /* @__PURE__ */ React.createElement("div", { className: "seg" }, /* @__PURE__ */ React.createElement("button", { className: view === "interaction" ? "on" : "", onClick: () => setView("interaction") }, "A\xD7B"), /* @__PURE__ */ React.createElement("button", { className: view === "additive" ? "on" : "", onClick: () => setView("additive") }, "A+B"))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#8A8680" } }, "A + B = ", /* @__PURE__ */ React.createElement("span", { style: { color: "#e0e0e0" } }, currentAdditive)), /* @__PURE__ */ React.createElement("div", { style: { color: "#8A8680", marginTop: 4 } }, "A \xD7 B = ", /* @__PURE__ */ React.createElement("span", { style: { color: "#D1FF3A" } }, currentInteraction)), /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: 6,
        padding: "6px 8px",
        background: "#1a1a1a",
        borderRadius: 5,
        fontSize: 11,
        color: delta > 0 ? "#D1FF3A" : "#ff8080"
      } }, delta > 0 ? `Interaction adds +${delta} signal` : delta < 0 ? `Interaction gives ${delta} vs additive` : "Equal at this point")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontSize: 11, color: "#6a6a6a", lineHeight: 1.5 } }, "Real example:", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { color: "#8a8a8a" } }, "CTR \u2248 user_age_score \xD7 ad_relevance"), /* @__PURE__ */ React.createElement("br", null), "High relevance + wrong age = low CTR", /* @__PURE__ */ React.createElement("br", null), "Both high = ", /* @__PURE__ */ React.createElement("span", { style: { color: "#D1FF3A" } }, "disproportionate lift"))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: 11,
        color: "#8A8680",
        marginBottom: 6,
        fontFamily: "'JetBrains Mono', monospace"
      } }, view === "interaction" ? "A \xD7 B output" : "A + B output", " (A\u2192 B\u2191)"), /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W + 20} ${H + 20}`, style: { width: Math.min(280, W + 20), display: "block" } }, grid.map(
        (row, ri) => row.map((val, ci) => {
          const isCurrentA = ci === featureA;
          const isCurrentB = ri === GRID - 1 - featureB;
          const isCurrent = isCurrentA && isCurrentB;
          return /* @__PURE__ */ React.createElement("g", { key: `${ri}-${ci}` }, /* @__PURE__ */ React.createElement(
            "rect",
            {
              x: ci * cellW,
              y: ri * cellH,
              width: cellW,
              height: cellH,
              fill: heatColor(val, maxVal),
              stroke: isCurrent ? "#fff" : "none",
              strokeWidth: isCurrent ? 2 : 0
            }
          ), isCurrent && /* @__PURE__ */ React.createElement(
            "text",
            {
              x: ci * cellW + cellW / 2,
              y: ri * cellH + cellH / 2 + 4,
              textAnchor: "middle",
              fontSize: "9",
              fontWeight: "700",
              fontFamily: "'JetBrains Mono', monospace",
              fill: "#fff"
            },
            val
          ));
        })
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: W / 2,
          y: H + 16,
          textAnchor: "middle",
          fontSize: "9",
          fontFamily: "'JetBrains Mono', monospace",
          fill: "#555"
        },
        "Feature A \u2192"
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: W + 14,
          y: H / 2,
          textAnchor: "middle",
          fontSize: "9",
          fontFamily: "'JetBrains Mono', monospace",
          fill: "#555",
          transform: `rotate(-90, ${W + 14}, ${H / 2})`
        },
        "Feature B \u2191"
      ))))
    );
  }
  function Ch04_Feature({ chapter, goTo }) {
    return /* @__PURE__ */ React.createElement("div", { className: "chapter-root" }, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 04 \xB7 Feature Engineering",
        title: "Better features beat <em>fancier models.</em>",
        hook: "A gradient boosted tree with thoughtful features outperforms a transformer on raw inputs 9 times out of 10. <strong>Feature engineering is where domain knowledge becomes competitive advantage.</strong>",
        meta: [
          { k: "Read", v: "12 min" },
          { k: "Focus", v: "Encode \xB7 Expand \xB7 Select \xB7 Interact" },
          { k: "Sims", v: "4 interactive" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "04.1" }, "Encoding categorical features"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Four strategies. One common mistake."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Every ML model ingests numbers, but your data is full of strings. How you encode a categorical feature changes what the model can learn. ", /* @__PURE__ */ React.createElement("strong", null, "One-hot"), " is the safe default. ", /* @__PURE__ */ React.createElement("strong", null, "Target encoding"), " is the sharp knife \u2014 powerful but leaks the label if done naively. ", /* @__PURE__ */ React.createElement("strong", null, "Label encoding"), " is almost always wrong for nominal categories. ", /* @__PURE__ */ React.createElement("strong", null, "Frequency encoding"), " is the underrated middle ground."), /* @__PURE__ */ React.createElement(EncodingComparison, null)), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Label encoding nominals.</b> Berlin (5) is not 5\xD7 New York (1). Breaks linear models silently \u2014 the model trains without error, just learns nonsense.",
      "<b>Target encoding on the full training set.</b> You are telling the model the answer. Always compute target means out-of-fold.",
      "<b>One-hotting 10,000 zip codes.</b> Dimensionality explosion. Use target or frequency encoding above ~50 categories."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Default to one-hot</b> for low-cardinality nominals (&lt;20 categories). Explicit, interpretable, no assumptions.",
      "<b>Target encoding with k-fold</b> for high-cardinality features. Compute means only on out-of-fold rows.",
      "<b>Frequency encoding</b> when you need the cardinality signal but cannot risk target leakage."
    ] }), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "04.2" }, "Polynomial feature expansion"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Adding x\xB2 teaches the model to bend."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A linear model can only draw straight lines. Adding ", /* @__PURE__ */ React.createElement("code", null, "x\xB2"), " or ", /* @__PURE__ */ React.createElement("code", null, "x\xB3"), " as explicit features lets it fit curves \u2014 without changing the model at all. The tradeoff is the bias-variance knife edge: too few terms and you underfit (miss the signal), too many and you overfit (chase the noise)."), /* @__PURE__ */ React.createElement(PolynomialExpansion, null)), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Use R\xB2 on a held-out validation set</b>, not training set, to pick degree. Training R\xB2 always improves with degree.",
      "<b>Standardize features before expanding.</b> x\xB2 with x \u2208 [0, 1000] creates astronomically large values.",
      "<b>Tree models do not need polynomial features.</b> They already model interactions and nonlinearities. This pattern is for linear/logistic regression."
    ] }), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "04.3" }, "Feature selection"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "More features \u2260 better model."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Irrelevant features add noise. Correlated duplicates dilute coefficients. Dimensionality increases memory, slows training, and can genuinely hurt generalization. Use a principled selection method rather than adding everything available and hoping regularization handles it."), /* @__PURE__ */ React.createElement(FeatureSelectionSim, null)), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Selecting features on the full dataset before train/test split.</b> You have used future information. The selected subset will look better than it is.",
      "<b>Dropping features because they have low correlation.</b> Correlation is linear only. A feature with r=0.04 can have high mutual information (e.g. day_of_week vs. weekend_sales).",
      "<b>Engineering 300 features then hoping LASSO handles it.</b> Add, measure, keep \u2014 one or a small batch at a time. Random noise features still occasionally survive regularization."
    ] }), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "04.4" }, "Interaction terms"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "When A \xD7 B is not A + B."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Interaction effects are everywhere in real data: the effect of an ad's relevance depends on who is seeing it. The effect of a drug depends on patient age. A linear model can't capture this \u2014 the A\xD7B term must be explicitly constructed as a new feature. Tree models learn interactions automatically; linear models need your help."), /* @__PURE__ */ React.createElement(InteractionTerms, null)), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Hypothesize before you compute.</b> A\xD7B only makes sense if domain knowledge predicts the interaction. Mining all pairs is expensive and mostly noise.",
      "<b>Interaction terms require standardization.</b> Multiply two large-scale features and you create numerical instability. Normalize first.",
      "<b>Use tree-based feature importance to find candidates.</b> Split-based importance in a GBDT reveals which pairs of features co-occur at decision boundaries."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Encoding is a model choice, not a preprocessing step.</b> Target encoding with leakage is a silent bug that inflates cross-validation scores and fails in production.",
      "<b>Polynomial expansion \u2194 bias-variance tradeoff.</b> Degree 1 = underfit, degree 3+ on 40 points = overfit. Always validate on held-out data.",
      "<b>Feature selection must happen inside cross-validation.</b> Selecting features before splitting is a form of data leakage \u2014 the same kind as target encoding on the full set.",
      "<b>Interaction terms encode domain knowledge.</b> You can't mine every pair at scale. Hypothesize, compute one term, measure lift, repeat.",
      "<b>Inference parity is the hard constraint.</b> Every feature, encoding, and interaction must be computable at serve time with the data you will actually have \u2014 before the label is known."
    ] }));
  }
  window.Ch04_Feature = Ch04_Feature;
})();
