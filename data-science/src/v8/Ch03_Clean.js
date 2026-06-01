(() => {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  function MissingnessSim() {
    const [pattern, setPattern] = useState("MCAR");
    const ROWS = 8;
    const COLS = ["Age", "Income", "Score", "Clicks", "Region", "Churn"];
    const base = useMemo(() => {
      const rng = mulberry32(77);
      return Array.from({ length: ROWS }, (_, r) => ({
        Age: Math.floor(22 + rng() * 48),
        Income: Math.floor(25e3 + rng() * 18e4),
        Score: Math.floor(rng() * 100),
        Clicks: Math.floor(rng() * 300),
        Region: ["EU", "US", "APAC", "LATAM"][Math.floor(rng() * 4)],
        Churn: rng() > 0.6 ? 1 : 0
      }));
    }, []);
    const missing = useMemo(() => {
      const rng = mulberry32(42);
      return base.map((row, r) => {
        const m = {};
        if (pattern === "MCAR") {
          COLS.forEach((c) => {
            m[c] = rng() < 0.22;
          });
        } else if (pattern === "MAR") {
          COLS.forEach((c) => {
            if (c === "Income" || c === "Score") {
              m[c] = row.Region === "EU" ? rng() < 0.6 : rng() < 0.08;
            } else {
              m[c] = rng() < 0.05;
            }
          });
        } else {
          COLS.forEach((c) => {
            if (c === "Income") {
              m[c] = row.Income > 12e4 ? rng() < 0.8 : rng() < 0.05;
            } else if (c === "Score") {
              m[c] = row.Score < 30 ? rng() < 0.75 : rng() < 0.06;
            } else {
              m[c] = rng() < 0.04;
            }
          });
        }
        return m;
      });
    }, [base, pattern]);
    const pctMissing = useMemo(
      () => COLS.map((c) => round(missing.filter((r) => r[c]).length / ROWS * 100, 0)),
      [missing]
    );
    const COLORS = { MCAR: "#4DE2FF", MAR: "#D1FF3A", MNAR: "#FF6B80" };
    const color = COLORS[pattern];
    const desc = {
      MCAR: "Sensor dropped a packet. Missingness is unrelated to any value \u2014 coin flip. Safe to drop rows or impute.",
      MAR: "Income & Score go missing more in the EU region (observed in other columns). Impute carefully; missingness is explainable.",
      MNAR: "High earners omit income; low scorers skip the score field. The missing value predicts its own absence. Dangerous \u2014 imputation will be biased."
    };
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Missingness Patterns",
        meta: `${ROWS} rows \xB7 ${COLS.length} columns`,
        caption: "Pattern determines what you can safely do about it. MCAR \u2192 drop or impute freely. MAR \u2192 model the missingness. MNAR \u2192 you may need to model the mechanism itself."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Pattern"), /* @__PURE__ */ React.createElement("div", { className: "seg" }, ["MCAR", "MAR", "MNAR"].map((p) => /* @__PURE__ */ React.createElement("button", { key: p, className: pattern === p ? "on" : "", onClick: () => setPattern(p) }, p)))), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 12.5, margin: 0 } }, desc[pattern]), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { marginTop: 12 } }, COLS.map((c, i) => /* @__PURE__ */ React.createElement("div", { key: c }, /* @__PURE__ */ React.createElement("div", { className: "k" }, c), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: pctMissing[i] > 30 ? color : "inherit" } }, pctMissing[i], "%"))))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap", style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: {
        borderCollapse: "collapse",
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        minWidth: 380
      } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { padding: "4px 8px", textAlign: "left", color: "#6A6270", fontWeight: 700, letterSpacing: "0.1em" } }, "#"), COLS.map((c) => /* @__PURE__ */ React.createElement("th", { key: c, style: { padding: "4px 8px", textAlign: "right", color: "#6A6270", fontWeight: 700 } }, c)))), /* @__PURE__ */ React.createElement("tbody", null, base.map((row, r) => /* @__PURE__ */ React.createElement("tr", { key: r, style: { borderTop: "1px solid #E8E2DA" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "4px 8px", color: "#A49D9A" } }, r + 1), COLS.map((c) => {
        const isMissing = missing[r][c];
        return /* @__PURE__ */ React.createElement("td", { key: c, style: {
          padding: "4px 8px",
          textAlign: "right",
          background: isMissing ? `${color}22` : "transparent",
          color: isMissing ? color : "#3A3540",
          fontWeight: isMissing ? 700 : 400,
          borderRadius: 3
        } }, isMissing ? "\u2014" : c === "Income" ? row[c].toLocaleString() : row[c]);
      })))))))
    );
  }
  function ImputationRace() {
    const [method, setMethod] = useState("mean");
    const truth = useMemo(() => {
      const rng = mulberry32(19);
      return Array.from({ length: 50 }, (_, i) => ({
        x: i,
        y: 20 + 0.9 * i + 7 * randn(rng)
      }));
    }, []);
    const observed = useMemo(() => {
      const rng = mulberry32(55);
      return truth.map((d) => ({ ...d, missing: rng() < 0.2 }));
    }, [truth]);
    const obs = observed.filter((d) => !d.missing).map((d) => d.y);
    const mean = obs.reduce((a, b) => a + b, 0) / obs.length;
    const sorted = [...obs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const imputed = useMemo(() => observed.map((d) => {
      if (!d.missing) return null;
      if (method === "mean") return mean;
      if (method === "median") return median;
      if (method === "ffill") {
        let last = null;
        for (let i = d.x - 1; i >= 0; i--) {
          if (!observed[i].missing) {
            last = observed[i].y;
            break;
          }
        }
        return last !== null ? last : obs[0];
      }
      if (method === "knn") {
        const neighbors = observed.filter((o) => !o.missing).map((o) => ({ dist: Math.abs(o.x - d.x), y: o.y })).sort((a, b) => a.dist - b.dist).slice(0, 3);
        return neighbors.reduce((a, n) => a + n.y, 0) / neighbors.length;
      }
      return mean;
    }), [observed, method, mean, median]);
    const W = 400, H = 180;
    const PAD = 20;
    const xScale = (x) => PAD + x * ((W - PAD * 2) / 50);
    const yMin = 10, yMax = 75;
    const yScale = (y) => H - PAD - (y - yMin) / (yMax - yMin) * (H - PAD * 2);
    const mae = useMemo(() => {
      const errs = observed.map((d, i) => d.missing ? Math.abs(imputed[i] - d.y) : null).filter((e) => e !== null);
      return errs.length ? round(errs.reduce((a, b) => a + b, 0) / errs.length, 1) : 0;
    }, [observed, imputed]);
    const methodDesc = {
      mean: "Replaces every gap with the global mean. Fast, but erases trend and shrinks variance.",
      median: "Robust to outliers, still ignores structure. Better than mean when distribution is skewed.",
      ffill: "Copies the last known value forward. Great for slowly-changing time series, bad for sparse gaps.",
      knn: "Averages the 3 nearest observed neighbors by index. Tracks local trend; best accuracy here."
    };
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Imputation Race",
        meta: `20% MCAR \xB7 MAE vs truth`,
        caption: "Yellow dots = imputed values. Hollow circles = true missing values underneath. Lower MAE = closer to truth."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Method"), /* @__PURE__ */ React.createElement("div", { className: "seg", style: { flexWrap: "wrap" } }, ["mean", "median", "ffill", "knn"].map((m) => /* @__PURE__ */ React.createElement("button", { key: m, className: method === m ? "on" : "", onClick: () => setMethod(m) }, m)))), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 12.5, margin: 0 } }, methodDesc[method]), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "MAE (imputed vs true)"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: mae < 5 ? "#D1FF3A" : "#FF6B80" } }, mae)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Missing pts"), /* @__PURE__ */ React.createElement("div", { className: "v" }, observed.filter((d) => d.missing).length))), /* @__PURE__ */ React.createElement("div", { className: "galton-note" }, /* @__PURE__ */ React.createElement("span", { className: "tag-pill" }, "Tip"), "KNN tracks the linear trend. Mean/median ignore it \u2014 notice the flat cluster of yellow dots.")), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, /* @__PURE__ */ React.createElement("line", { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: "#A49D9A", strokeWidth: "0.8" }), /* @__PURE__ */ React.createElement("line", { x1: PAD, y1: PAD, x2: PAD, y2: H - PAD, stroke: "#A49D9A", strokeWidth: "0.8" }), observed.filter((d) => !d.missing).map((d) => /* @__PURE__ */ React.createElement("circle", { key: d.x, cx: xScale(d.x), cy: yScale(d.y), r: "2.5", fill: "#4DE2FF", opacity: "0.85" })), observed.filter((d) => d.missing).map((d) => /* @__PURE__ */ React.createElement(
        "circle",
        {
          key: "t" + d.x,
          cx: xScale(d.x),
          cy: yScale(d.y),
          r: "3.5",
          fill: "none",
          stroke: "#A49D9A",
          strokeWidth: "1.2",
          strokeDasharray: "2 2"
        }
      )), observed.map((d, i) => d.missing && imputed[i] != null ? /* @__PURE__ */ React.createElement(
        "circle",
        {
          key: "imp" + d.x,
          cx: xScale(d.x),
          cy: yScale(imputed[i]),
          r: "4",
          fill: "#D1FF3A",
          opacity: "0.9"
        }
      ) : null))))
    );
  }
  function ScalerDemo() {
    const [scaler, setScaler] = useState("raw");
    const features = useMemo(() => [
      { name: "Age", values: [23, 45, 31, 67, 28, 52], unit: "yrs" },
      { name: "Income", values: [28e3, 95e3, 42e3, 18e4, 35e3, 12e4], unit: "$" },
      { name: "Score", values: [45, 82, 60, 15, 91, 37], unit: "pts" },
      { name: "Clicks", values: [3, 120, 22, 450, 8, 230], unit: "n" },
      { name: "Days", values: [1, 7, 3, 30, 2, 14], unit: "d" },
      { name: "Spend", values: [5, 299, 49, 1200, 12, 599], unit: "$" }
    ], []);
    function standardize(vals) {
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length) || 1;
      return vals.map((v) => (v - m) / sd);
    }
    function minmax(vals) {
      const lo = Math.min(...vals), hi = Math.max(...vals);
      return vals.map((v) => hi === lo ? 0 : (v - lo) / (hi - lo));
    }
    function robust(vals) {
      const sorted = [...vals].sort((a, b) => a - b);
      const n = sorted.length;
      const q1 = sorted[Math.floor(n * 0.25)];
      const q2 = sorted[Math.floor(n * 0.5)];
      const q3 = sorted[Math.floor(n * 0.75)];
      const iqr = q3 - q1 || 1;
      return vals.map((v) => (v - q2) / iqr);
    }
    const transform = (vals) => {
      if (scaler === "raw") return vals;
      if (scaler === "standard") return standardize(vals);
      if (scaler === "minmax") return minmax(vals);
      if (scaler === "robust") return robust(vals);
      return vals;
    };
    const scalerFormula = {
      raw: "No transformation \u2014 raw values keep their original scale.",
      standard: "z = (x \u2212 \u03BC) / \u03C3   \u2192  mean=0, std=1. Sensitive to outliers.",
      minmax: "x\u2032 = (x \u2212 min) / (max \u2212 min)   \u2192  range [0, 1]. Crushed by outliers.",
      robust: "x\u2032 = (x \u2212 Q2) / IQR   \u2192  median-centered, ignores tail extremes. Best with outliers."
    };
    const allTransformed = features.map((f) => transform(f.values));
    const globalMin = Math.min(...allTransformed.flat());
    const globalMax = Math.max(...allTransformed.flat()) || 1;
    const W = 400, H = 200;
    const PAD_L = 48, PAD_R = 12, PAD_T = 16, PAD_B = 24;
    const nFeatures = features.length;
    const nBars = features[0].values.length;
    const groupW = (W - PAD_L - PAD_R) / nFeatures;
    const barW = groupW / (nBars + 1);
    const barH = (v) => {
      if (scaler === "raw") {
        const allRaw = features.map((f) => Math.max(...f.values));
        const gMax = Math.max(...allRaw) || 1;
        return Math.max(0, v / gMax) * (H - PAD_T - PAD_B);
      }
      const range = globalMax - globalMin;
      if (range === 0) return 0;
      return Math.max(0, (v - globalMin) / range) * (H - PAD_T - PAD_B);
    };
    const COLORS = ["#4DE2FF", "#D1FF3A", "#FF6B80", "#B89DFF", "#FFA500", "#00E5A0"];
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Feature Scaling",
        meta: "6 features \xB7 6 samples each",
        caption: "Without scaling, income (\u20AC200 k) dominates age (67). Regularized models and distance-based models (kNN, SVM, PCA) require features on comparable scales."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Scaler"), /* @__PURE__ */ React.createElement("div", { className: "seg", style: { flexWrap: "wrap" } }, ["raw", "standard", "minmax", "robust"].map((s) => /* @__PURE__ */ React.createElement("button", { key: s, className: scaler === s ? "on" : "", onClick: () => setScaler(s) }, s)))), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 12.5, margin: 0 } }, scalerFormula[scaler]), /* @__PURE__ */ React.createElement("div", { className: "galton-note", style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("span", { className: "tag-pill" }, "Rule"), "Always fit scaler on ", /* @__PURE__ */ React.createElement("strong", null, "train"), " only \u2014 then transform train and test. Fitting on the full dataset leaks test statistics into training.")), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, /* @__PURE__ */ React.createElement("line", { x1: PAD_L, y1: H - PAD_B, x2: W - PAD_R, y2: H - PAD_B, stroke: "#A49D9A", strokeWidth: "0.8" }), scaler !== "raw" && scaler !== "minmax" && /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: PAD_L,
          y1: H - PAD_B - (0 - globalMin) / (globalMax - globalMin || 1) * (H - PAD_T - PAD_B),
          x2: W - PAD_R,
          y2: H - PAD_B - (0 - globalMin) / (globalMax - globalMin || 1) * (H - PAD_T - PAD_B),
          stroke: "#A49D9A",
          strokeDasharray: "3 3",
          strokeWidth: "0.8"
        }
      ), features.map((feat, fi) => {
        const transformed = transform(feat.values);
        const gx = PAD_L + fi * groupW;
        return /* @__PURE__ */ React.createElement("g", { key: feat.name }, transformed.map((v, si) => {
          const h = barH(v);
          const bx = gx + (si + 0.5) * barW;
          const by = H - PAD_B - h;
          return /* @__PURE__ */ React.createElement(
            "rect",
            {
              key: si,
              x: bx,
              y: by,
              width: barW - 1,
              height: h,
              fill: COLORS[si],
              opacity: "0.75",
              rx: "1"
            }
          );
        }), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: gx + groupW / 2,
            y: H - 6,
            textAnchor: "middle",
            fontSize: "9",
            fontFamily: "'JetBrains Mono', monospace",
            fill: "#6A6270"
          },
          feat.name
        ));
      }))))
    );
  }
  const FEATURE_POOL = [
    { name: "user_age", leaky: false, reason: "" },
    { name: "session_duration", leaky: false, reason: "" },
    { name: "plan_type", leaky: false, reason: "" },
    { name: "support_tickets", leaky: false, reason: "" },
    { name: "last_login_days_ago", leaky: false, reason: "" },
    { name: "target_mean_encoded", leaky: true, reason: "Computed using the target label across all rows \u2014 the model literally sees the answer." },
    { name: "days_after_churn", leaky: true, reason: "A post-event feature: it's only defined if the user already churned. Instant 100% accuracy, zero prod value." },
    { name: "customer_id_hash", leaky: true, reason: "High-cardinality ID proxy. Model memorises IDs that churn \u2014 perfectly fitted to training set, useless on new users." },
    { name: "total_revenue_lifetime", leaky: true, reason: "If computed using future periods, revenue after the churn date leaks into the label window." },
    { name: "email_domain_target", leaky: true, reason: "Target-encoded without out-of-fold splits \u2014 each row saw its own label during encoding." }
  ];
  function LeakageDetector() {
    const [selected, setSelected] = useState(/* @__PURE__ */ new Set(["user_age", "session_duration", "plan_type"]));
    const [revealed, setReveal] = useState(false);
    const toggle = (name) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          if (next.size > 1) next.delete(name);
        } else {
          if (next.size < 5) next.add(name);
        }
        return next;
      });
      setReveal(false);
    };
    const selectedFeatures = FEATURE_POOL.filter((f) => selected.has(f.name));
    const leakyCount = selectedFeatures.filter((f) => f.leaky).length;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Leakage Detector",
        meta: `${selected.size} features selected \xB7 ${leakyCount} leaky`,
        caption: "Pick up to 5 features for your churn model, then click Audit. Leaky features will be exposed."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row", style: { flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 } }, FEATURE_POOL.map((f) => {
        const isSelected = selected.has(f.name);
        const isLeaky = revealed && isSelected && f.leaky;
        const isSafe = revealed && isSelected && !f.leaky;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: f.name,
            onClick: () => toggle(f.name),
            style: {
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 4,
              border: isLeaky ? "1.5px solid #FF6B80" : isSafe ? "1.5px solid #D1FF3A" : isSelected ? "1.5px solid #4DE2FF" : "1.5px solid #E8E2DA",
              background: isLeaky ? "#FF6B8018" : isSafe ? "#D1FF3A18" : isSelected ? "#4DE2FF12" : "transparent",
              color: isLeaky ? "#FF6B80" : isSafe ? "#D1FF3A" : isSelected ? "#4DE2FF" : "#6A6270",
              cursor: "pointer",
              transition: "all 0.2s"
            }
          },
          f.name
        );
      })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-sm btn-primary", onClick: () => setReveal(true) }, "Audit features"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-sm btn-ghost", onClick: () => {
        setSelected(/* @__PURE__ */ new Set(["user_age", "session_duration", "plan_type"]));
        setReveal(false);
      } }, "Reset"), revealed && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12.5, color: leakyCount > 0 ? "#FF6B80" : "#D1FF3A", fontFamily: "'JetBrains Mono', monospace" } }, leakyCount > 0 ? `${leakyCount} leaky feature${leakyCount > 1 ? "s" : ""} found` : "All clear")), revealed && leakyCount > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, selectedFeatures.filter((f) => f.leaky).map((f) => /* @__PURE__ */ React.createElement("div", { key: f.name, style: {
        background: "#FF6B8012",
        border: "1px solid #FF6B8040",
        borderLeft: "3px solid #FF6B80",
        borderRadius: 6,
        padding: "10px 14px"
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#FF6B80", fontWeight: 700, marginBottom: 4 } }, f.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: "#3A3540" } }, f.reason)))), revealed && leakyCount === 0 && /* @__PURE__ */ React.createElement("div", { style: {
        background: "#D1FF3A10",
        border: "1px solid #D1FF3A40",
        borderLeft: "3px solid #D1FF3A",
        borderRadius: 6,
        padding: "10px 14px",
        fontSize: 12.5,
        color: "#3A3540"
      } }, "Clean feature set. No leakage detected \u2014 none of the selected features encode future information or the target directly."))
    );
  }
  function Ch03_Clean() {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 03 \xB7 Clean",
        title: 'Most of \u201Cmodeling\u201D is actually <em><span class="accent">cleaning</span></em>.',
        hook: "Missing values. Outliers. Units. Timezones. Leaky joins. The difference between a senior DS and a junior one is <strong>noticing the boring things</strong>.",
        meta: [
          { k: "Read", v: "12 min" },
          { k: "Focus", v: "Missingness \xB7 imputation \xB7 scaling \xB7 leakage" },
          { k: "Sims", v: "4 interactive" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "03.1" }, "Missingness"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Not all missing is missing the same way."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Rubin (1976) categorized missing data into three mechanisms that completely change how you should respond. ", /* @__PURE__ */ React.createElement("strong", null, "MCAR"), " (missing completely at random) means a sensor dropped a packet \u2014 the gap is unrelated to any value in the dataset. You can drop or impute without bias.", /* @__PURE__ */ React.createElement("strong", null, " MAR"), " (missing at random) means missingness depends on ", /* @__PURE__ */ React.createElement("em", null, "other observed columns"), ": income data might be missing more often for EU users if the survey skipped a page in German. You can impute, but you need to model the relationship. ", /* @__PURE__ */ React.createElement("strong", null, "MNAR"), " (missing not at random) is the dangerous one: the missing value predicts its own absence \u2014 high earners skip the income field, low scorers skip the score. Imputation will be systematically biased unless you model the missingness process itself."), /* @__PURE__ */ React.createElement(MissingnessSim, null), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { marginTop: 18 } }, "Notice how MNAR dramatically increases the missing rate in the high-value tail. If you impute with the observed mean, you'll underestimate the true mean. The pattern of absence is data \u2014 always add a ", /* @__PURE__ */ React.createElement("code", null, "feature_was_missing"), " indicator column before you fill any gaps.")), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "03.2" }, "Imputation"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Filling the blanks without lying to your model."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "The wrong imputation strategy doesn't just add noise \u2014 it systematically biases your model toward the wrong answer. Mean imputation compresses variance, making your model underestimate uncertainty. Forward-fill in time series creates temporal artifacts. KNN imputation is slower but tracks local structure. The benchmark is always: how far off are imputed values from the truth?"), /* @__PURE__ */ React.createElement(ImputationRace, null), /* @__PURE__ */ React.createElement(AntiPatterns, { title: "Imputation anti-patterns", items: [
      "<b>Imputing with the full-dataset mean.</b> Fit imputer on train only. The test mean is future information.",
      "<b>Single-value imputation for skewed distributions.</b> Replacing salary gaps with the mean drags every imputed value toward the center of a right-skewed distribution. Use median.",
      "<b>Not flagging imputed cells.</b> Your model has no way to know which values were synthetic. Add a <code>_was_missing</code> binary feature for every imputed column.",
      "<b>KNN on high-cardinality data without scaling.</b> KNN distances are meaningless when income (range 170k) dominates age (range 50). Scale first."
    ] })), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "03.3" }, "Feature Scaling"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Income at 150,000. Age at 34. ", /* @__PURE__ */ React.createElement("em", null, "Same model, totally different worlds.")), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Many algorithms are sensitive to the raw magnitude of features. Regularized linear models penalize large coefficients \u2014 but a coefficient for income in raw dollars will naturally be tiny compared to one for age, so L2 regularization ignores income entirely. Distance-based models like kNN, SVM, and PCA are even more exposed: Euclidean distance in a 200,000-dollar space dwarfs anything in age-space. Scaling puts features on comparable footing."), /* @__PURE__ */ React.createElement(ScalerDemo, null), /* @__PURE__ */ React.createElement(BestPractices, { title: "Scaling rules", items: [
      "<b>StandardScaler for Gaussian-ish features.</b> Zero mean, unit variance. Works best when the feature's distribution is roughly symmetric. Affected by outliers.",
      "<b>MinMaxScaler when you need bounded output [0, 1].</b> Good for neural networks. A single extreme outlier will crush all other values toward zero.",
      "<b>RobustScaler when outliers are real and informative.</b> Uses median and IQR. The outliers still exist in the data \u2014 they're just not ruining the scale for everyone else.",
      "<b>Never scale tree-based models.</b> Decision trees split on threshold values, not distances. Scaling changes nothing for Random Forests, XGBoost, or LightGBM."
    ] })), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "03.4" }, "Data Leakage"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "The number-one reason your model looks amazing in dev and dies in prod."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, /* @__PURE__ */ React.createElement("strong", null, "Leakage"), " is when information that wouldn't be available at prediction time sneaks into your training features. It's invisible until deployment. The symptoms are seductive: 99% AUC, SHAP plots that look like they're capturing real signal, stakeholders impressed by the numbers. Then prod accuracy drops to 60% and nobody knows why."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "There are three main flavors: ", /* @__PURE__ */ React.createElement("strong", null, "target leakage"), " (a feature encodes the label directly),", /* @__PURE__ */ React.createElement("strong", null, " temporal leakage"), " (you used data from after the event you're predicting), and", /* @__PURE__ */ React.createElement("strong", null, " train/test contamination"), " (your preprocessing saw the test set). Pick features below and audit for leakage."), /* @__PURE__ */ React.createElement(LeakageDetector, null), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Fitting the scaler on the full dataset.</b> Your test set just saw the training mean. Fit on train only, transform both.",
      '<b>Target encoding without out-of-fold.</b> "Mean target per category" computed across all rows lets each row see its own label.',
      "<b>Post-event features.</b> <code>total_purchases_lifetime</code> used to predict <code>will_churn</code> \u2014 if computed after the churn date, you've time-traveled.",
      "<b>Snooping the test set during EDA.</b> You look at test, see a pattern, adjust train. You just leaked your test set through your eyeballs."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Split before you touch anything.</b> First line of every notebook: <code>train, test = split(df)</code>. Then lock the test set.",
      "<b>Use sklearn Pipelines.</b> <code>Pipeline</code> forces fit-on-train, transform-on-both. It's not boilerplate \u2014 it's a safety guarantee.",
      "<b>Time splits for temporal data.</b> Random splits let future data train on past labels. Use <code>TimeSeriesSplit</code> or a fixed cutoff date.",
      `<b>Ask: would this feature exist at prediction time?</b> For every feature, state the exact moment it would be computed in production. If the answer is "after we already know the outcome," it's leaky.`
    ] })), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Missingness is information.</b> A <code>was_missing</code> flag is free and often predictive. Never impute silently.",
      "<b>The mechanism matters.</b> MCAR \u2192 drop freely. MAR \u2192 impute with a model. MNAR \u2192 model the missingness itself or accept the bias.",
      "<b>Scaling is algorithm-dependent.</b> Distance-based and regularized models need it. Trees don't care.",
      "<b>Leakage is invisible until prod.</b> Assume it exists; prove it doesn't with time-based splits and feature provenance checks.",
      "<b>Clean data is a process, not a step.</b> Every new feature, join, or aggregation is a fresh opportunity to introduce bugs, leaks, or biased imputation."
    ] }));
  }
  window.Ch03_Clean = Ch03_Clean;
})();
