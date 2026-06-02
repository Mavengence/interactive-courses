(() => {
  const { useState, useMemo } = React;
  function BiasVarianceSim() {
    const [complexity, setComplexity] = useState(5);
    const [dataSeed, setDataSeed] = useState(17);
    const [svgKey, setSvgKey] = useState(0);
    const truth = (x) => Math.sin(x * Math.PI * 2) * 0.7;
    const train = useMemo(() => {
      const r = mulberry32(dataSeed);
      return Array.from({ length: 22 }, (_, i) => {
        const x = i / 21;
        return { x, y: truth(x) + 0.22 * randn(r) };
      });
    }, [dataSeed]);
    const resampleFits = useMemo(() => {
      const out = [];
      for (let s = 0; s < 24; s++) {
        const r = mulberry32(dataSeed * 31 + s * 7 + 1);
        const pts = Array.from({ length: 22 }, (_, i) => {
          const x = i / 21;
          return { x, y: truth(x) + 0.22 * randn(r) };
        });
        out.push(fitPoly(pts, complexity));
      }
      return out;
    }, [dataSeed, complexity]);
    const mainCoeffs = useMemo(() => fitPoly(train, complexity), [train, complexity]);
    const predictWith = (coeffs, x) => coeffs.reduce((a, c, k) => a + c * x ** k, 0);
    const predict = (x) => predictWith(mainCoeffs, x);
    const testPts = useMemo(() => {
      const r = mulberry32(99);
      return Array.from({ length: 200 }, () => {
        const x = r();
        return { x, y: truth(x) + 0.22 * randn(r) };
      });
    }, []);
    const trainErr = train.reduce((a, p) => a + (p.y - predict(p.x)) ** 2, 0) / train.length;
    const testErr = testPts.reduce((a, p) => a + (p.y - predict(p.x)) ** 2, 0) / testPts.length;
    const { bias2, variance } = useMemo(() => {
      const GRID = 40;
      let bias22 = 0, variance2 = 0;
      for (let i = 0; i < GRID; i++) {
        const x = i / (GRID - 1);
        const ys = resampleFits.map((c) => predictWith(c, x));
        const meanY = ys.reduce((a, v) => a + v, 0) / ys.length;
        bias22 += (meanY - truth(x)) ** 2;
        variance2 += ys.reduce((a, v) => a + (v - meanY) ** 2, 0) / ys.length;
      }
      return { bias2: bias22 / GRID, variance: variance2 / GRID };
    }, [resampleFits]);
    const W = 600, H = 200;
    const xMap = (x) => 40 + x * 520;
    const yMap = (y) => 100 - y * 60;
    const pathFor = (coeffs) => {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const x = i / 120;
        const y = clamp(predictWith(coeffs, x), -1.6, 1.6);
        pts.push(`${xMap(x).toFixed(2)},${yMap(y).toFixed(2)}`);
      }
      return "M " + pts.join(" L ");
    };
    const truthPath = useMemo(() => {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const x = i / 120;
        pts.push(`${xMap(x).toFixed(2)},${yMap(truth(x)).toFixed(2)}`);
      }
      return "M " + pts.join(" L ");
    }, []);
    const regimeLabel = complexity <= 1 ? "underfit (high bias)" : complexity >= 10 ? "overfit (high variance)" : "good fit";
    const reshuffle = () => {
      setDataSeed((s) => s + 17);
      setSvgKey((k) => k + 1);
    };
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "LIVE \xB7 ENSEMBLE",
        title: "Bias\u2013variance dance",
        meta: `degree ${complexity} \xB7 ${resampleFits.length} bootstraps`,
        caption: "Gray cloud = the range of fits you'd get from resampling. Narrow cloud + close to truth = good. Narrow + far = bias. Wide & wild = variance. The tradeoff is the dance."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row", style: { gridTemplateColumns: "280px 1fr" } }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Model complexity ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, "deg ", complexity)), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "15",
          value: complexity,
          "aria-label": "Model complexity (polynomial degree)",
          onChange: (e) => setComplexity(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("button", { className: "btn btn-sm btn-primary", onClick: reshuffle }, "\u27F2 New training data"), /* @__PURE__ */ React.createElement("div", { className: "sim-stats" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Train MSE"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--cyan-ink)" } }, round(trainErr, 3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Test MSE"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--magenta)" } }, round(testErr, 3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Regime"), /* @__PURE__ */ React.createElement("div", { className: "v serif", style: { fontStyle: "italic", fontSize: 15 } }, regimeLabel))), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { marginTop: 2 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Bias\xB2"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--warn-ink)" } }, round(bias2, 3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Variance"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--violet)" } }, round(variance, 3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Bias\xB2+Var"), /* @__PURE__ */ React.createElement("div", { className: "v" }, round(bias2 + variance, 3)))), /* @__PURE__ */ React.createElement("div", { className: "galton-note" }, /* @__PURE__ */ React.createElement("span", { className: "tag-pill" }, "tip"), "At low ", /* @__PURE__ */ React.createElement("code", { className: "mono" }, "deg"), ", bias is huge (stiff line misses curve). At high ", /* @__PURE__ */ React.createElement("code", { className: "mono" }, "deg"), ", bias collapses but variance explodes \u2014 the gray cloud fans wildly.")), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap", style: { padding: 16 } }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, key: `${svgKey}-${complexity}` }, /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xMap(0),
          y1: yMap(0),
          x2: xMap(1),
          y2: yMap(0),
          stroke: "#A49D9A",
          strokeWidth: "0.6",
          strokeDasharray: "3 3",
          opacity: "0.5"
        }
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xMap(0),
          y1: yMap(-1.5),
          x2: xMap(0),
          y2: yMap(1.5),
          stroke: "#A49D9A",
          strokeWidth: "0.6"
        }
      ), /* @__PURE__ */ React.createElement(
        "path",
        {
          d: truthPath,
          fill: "none",
          stroke: "#14121655",
          strokeWidth: "1.2",
          strokeDasharray: "4 3"
        }
      ), resampleFits.map((c, i) => /* @__PURE__ */ React.createElement(
        "path",
        {
          key: i,
          d: pathFor(c),
          fill: "none",
          stroke: "#5B3EE8",
          strokeWidth: "1.1",
          opacity: 0.08,
          style: {
            strokeDasharray: 3e3,
            strokeDashoffset: 3e3,
            animation: `drawPath 1.2s cubic-bezier(.4,0,.2,1) ${i * 0.04}s forwards`
          }
        }
      )), /* @__PURE__ */ React.createElement(
        "path",
        {
          d: pathFor(mainCoeffs),
          fill: "none",
          stroke: "#E8318F",
          strokeWidth: "2.4",
          style: {
            strokeDasharray: 3e3,
            strokeDashoffset: 3e3,
            animation: `drawPath 1.1s cubic-bezier(.4,0,.2,1) 0s forwards`
          }
        }
      ), train.map((p, i) => /* @__PURE__ */ React.createElement(
        "circle",
        {
          key: i,
          cx: xMap(p.x),
          cy: yMap(clamp(p.y, -1.6, 1.6)),
          r: "3.2",
          fill: "#141216",
          stroke: "#FBF8F1",
          strokeWidth: "1",
          style: {
            opacity: 0,
            animation: `fadeIn 280ms cubic-bezier(.4,0,.2,1) ${0.6 + i * 0.02}s forwards`
          }
        }
      )), /* @__PURE__ */ React.createElement("g", { transform: "translate(48 16)" }, /* @__PURE__ */ React.createElement("line", { x1: "0", y1: "0", x2: "20", y2: "0", stroke: "#14121655", strokeWidth: "1.2", strokeDasharray: "4 3" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "26",
          y: "4",
          fontSize: "10",
          fill: "#3A3540",
          fontFamily: "'JetBrains Mono', monospace"
        },
        "truth"
      ), /* @__PURE__ */ React.createElement("line", { x1: "100", y1: "0", x2: "120", y2: "0", stroke: "#E8318F", strokeWidth: "2.4" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "126",
          y: "4",
          fontSize: "10",
          fill: "#3A3540",
          fontFamily: "'JetBrains Mono', monospace"
        },
        "this fit"
      ), /* @__PURE__ */ React.createElement("g", { transform: "translate(220 0)" }, /* @__PURE__ */ React.createElement("line", { x1: "0", y1: "0", x2: "20", y2: "0", stroke: "#5B3EE8", strokeWidth: "1.4", opacity: "0.5" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "26",
          y: "4",
          fontSize: "10",
          fill: "#3A3540",
          fontFamily: "'JetBrains Mono', monospace"
        },
        "24 resamples"
      ))))))
    );
  }
  function fitPoly(pts, deg) {
    const n = pts.length;
    const D = deg + 1;
    const X = pts.map((p) => Array.from({ length: D }, (_, k) => p.x ** k));
    const y = pts.map((p) => p.y);
    const XTX = Array.from({ length: D }, () => new Array(D).fill(0));
    const XTy = new Array(D).fill(0);
    for (let i = 0; i < D; i++) {
      for (let j = 0; j < D; j++) {
        let s2 = 0;
        for (let k = 0; k < n; k++) s2 += X[k][i] * X[k][j];
        XTX[i][j] = s2 + (i === j ? 1e-5 : 0);
      }
      let s = 0;
      for (let k = 0; k < n; k++) s += X[k][i] * y[k];
      XTy[i] = s;
    }
    const m = XTX.map((r, i) => [...r, XTy[i]]);
    for (let i = 0; i < D; i++) {
      let max = i;
      for (let k = i + 1; k < D; k++) if (Math.abs(m[k][i]) > Math.abs(m[max][i])) max = k;
      [m[i], m[max]] = [m[max], m[i]];
      for (let k = i + 1; k < D; k++) {
        const f = m[k][i] / (m[i][i] || 1e-12);
        for (let j = i; j <= D; j++) m[k][j] -= f * m[i][j];
      }
    }
    const b = new Array(D).fill(0);
    for (let i = D - 1; i >= 0; i--) {
      let s = m[i][D];
      for (let j = i + 1; j < D; j++) s -= m[i][j] * b[j];
      b[i] = s / (m[i][i] || 1e-12);
    }
    return b;
  }
  function Ch05_Model() {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 05 \xB7 Model",
        title: 'The <em>bias / variance</em> <span class="accent">dance.</span>',
        hook: "Every model lives on a spectrum. Too simple \u2192 underfits, misses the pattern. Too flexible \u2192 memorizes the noise. <strong>Cross-validation is how you find the sweet spot.</strong>",
        meta: [{ k: "Read", v: "9 min" }, { k: "Focus", v: "Fit \xB7 CV \xB7 tune" }, { k: "Sims", v: "1 live ensemble" }]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "05.1" }, "The tradeoff, made physical"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Slide the knob. Reshuffle the data. ", /* @__PURE__ */ React.createElement("em", null, "Watch the cloud fan out.")), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "At low complexity, every resample lands on almost the same stiff line \u2014 low variance, but high bias (the line can't bend to match the truth). At high complexity, each resample finds a different wild curve through the same-ish noise \u2014 bias falls toward zero, but variance explodes."), /* @__PURE__ */ React.createElement(BiasVarianceSim, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "05.2" }, "Choosing a model"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Start simple. ", /* @__PURE__ */ React.createElement("em", null, "Escalate only with evidence.")), /* @__PURE__ */ React.createElement("ul", { className: "prose", style: { paddingLeft: 20 } }, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Logistic / linear regression"), " \u2014 interpretable, fast, hard to beat on tabular with good features."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Gradient-boosted trees (XGBoost, LightGBM)"), " \u2014 the tabular workhorse. Rarely a wrong answer."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Random forest"), " \u2014 robust, low-tuning, good first escalation."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Deep nets"), " \u2014 unstructured data (text, images, audio). Rarely the right call for tabular."))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Tuning on the test set.</b> That's just a slower way to overfit.",
      "<b>Leaderboard chasing.</b> 0.01 AUC on CV is not a real gain if your CV has leakage.",
      "<b>Deep learning as default.</b> For 90% of business tabular problems, GBDT wins on time, metric, and interpretability."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Generalization is the goal, not fit.</b> Always measure on held-out data.",
      "<b>Cross-validation is non-optional</b> \u2014 single split lies about variance.",
      "<b>Total error = Bias\xB2 + Variance + irreducible noise.</b> You can only move the first two \u2014 noise is a floor."
    ] }));
  }
  window.Ch05_Model = Ch05_Model;
})();
