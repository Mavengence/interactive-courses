(() => {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const BAD = "#C92424";
  const MINT = "#0E7250";
  const BLUE = "#2257C7";
  const AMB = "#935C00";
  const INK3 = "#5C5650";
  const HAIR = "rgba(20,18,22,0.10)";
  const BGHT = "var(--panel-hi)";
  function Bar({ label, value, max, color, annotation }) {
    const pct = max > 0 ? clamp(value / max, 0, 1) * 100 : 0;
    return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3, color: "var(--ink-2)" } }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("span", { style: { color, fontWeight: 600 } }, annotation || `${round(value, 1)}%`)), /* @__PURE__ */ React.createElement("div", { style: { height: 10, background: HAIR, borderRadius: 5, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { width: `${pct}%`, height: "100%", background: color, borderRadius: 5, transition: "width 0.5s ease" } })));
  }
  function PeekingSimulator() {
    const FREQ_OPTIONS = [
      { label: "Daily (every 100 obs)", step: 100 },
      { label: "Every 3 days (every 300 obs)", step: 300 },
      { label: "Weekly (every 700 obs)", step: 700 },
      { label: "End-only (no peeking)", step: 5e3 }
    ];
    const ALPHA_OPTIONS = [0.05, 0.01];
    const N_SIMS = 1e3;
    const MAX_N = 5e3;
    const BASE_CONV = 0.1;
    const [freqIdx, setFreqIdx] = useState(0);
    const [alphaIdx, setAlphaIdx] = useState(0);
    const [results, setResults] = useState(null);
    const [running, setRunning] = useState(false);
    const [seed, setSeed] = useState(42);
    const runSim = useCallback(() => {
      setRunning(true);
      setTimeout(() => {
        const step = FREQ_OPTIONS[freqIdx].step;
        const alpha = ALPHA_OPTIONS[alphaIdx];
        const zCrit = normInv(1 - alpha / 2);
        const rng = mulberry32(seed);
        const obsVar = 2 * BASE_CONV * (1 - BASE_CONV);
        let falsePos = 0;
        for (let s = 0; s < N_SIMS; s++) {
          let hit = false;
          let sumDiff = 0;
          for (let n = step; n <= MAX_N; n += step) {
            sumDiff += randn(rng) * Math.sqrt(step * obsVar);
            const se = Math.sqrt(obsVar / n);
            const z = sumDiff / n / se;
            if (Math.abs(z) > zCrit) {
              hit = true;
              break;
            }
          }
          if (hit) falsePos++;
        }
        const fpr = falsePos / N_SIMS * 100;
        const nomPct = alpha * 100;
        setResults({ fpr, nomPct, alpha, step, n: N_SIMS, falsePos });
        setSeed((s) => s + 1);
        setRunning(false);
      }, 20);
    }, [freqIdx, alphaIdx, seed]);
    const inflation = results ? round(results.fpr / results.nomPct, 2) : null;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Peeking False-Positive Inflator",
        caption: `1 000 A/A tests (no real effect). Counts how many times p < \u03B1 appears at any interim look.`
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: INK3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 } }, "Check frequency"), FREQ_OPTIONS.map((f, i) => /* @__PURE__ */ React.createElement("label", { key: i, style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer", fontSize: 13 } }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "freq", checked: freqIdx === i, onChange: () => setFreqIdx(i) }), f.label))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: INK3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 } }, "Significance threshold (\u03B1)"), ALPHA_OPTIONS.map((a, i) => /* @__PURE__ */ React.createElement("label", { key: i, style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer", fontSize: 13 } }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "alpha", checked: alphaIdx === i, onChange: () => setAlphaIdx(i) }), "\u03B1 = ", a))), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary btn-sm", onClick: runSim, disabled: running, style: { width: "100%" } }, running ? "Simulating\u2026" : "Run 1 000 A/A tests")), /* @__PURE__ */ React.createElement("div", { style: { padding: 16, background: BGHT, borderRadius: 10, border: `1px solid ${HAIR}` } }, !results ? /* @__PURE__ */ React.createElement("div", { style: { color: INK3, fontSize: 13, marginTop: 20 } }, "Run the simulation to see results.") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: MINT, letterSpacing: "0.1em", textTransform: "uppercase" } }, "Nominal \u03B1"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-serif,serif)", fontSize: 34, color: MINT } }, round(results.nomPct, 1), "%"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: INK3 } }, "stated threshold")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: BAD, letterSpacing: "0.1em", textTransform: "uppercase" } }, "Actual FPR"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-serif,serif)", fontSize: 34, color: BAD } }, round(results.fpr, 1), "%"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: INK3 } }, "observed in sim"))), /* @__PURE__ */ React.createElement(Bar, { label: "Nominal FPR", value: results.nomPct, max: 50, color: MINT }), /* @__PURE__ */ React.createElement(Bar, { label: "Peeking FPR", value: results.fpr, max: 50, color: BAD }), inflation !== null && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8, fontSize: 12.5, color: BAD } }, /* @__PURE__ */ React.createElement("strong", null, inflation, "\xD7 inflation"), " \u2014 peeking multiplied your false-positive rate by ", inflation, "\xD7"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, fontSize: 11.5, color: INK3 } }, results.falsePos, " / ", results.n, ' A/A tests showed a "significant" result despite no real effect.'))))
    );
  }
  function MultipleTesting() {
    const [n, setN] = useState(10);
    const alpha = 0.05;
    const fwer = useMemo(() => (1 - Math.pow(1 - alpha, n)) * 100, [n]);
    const bonferroni = useMemo(() => round(alpha / n, 6), [n]);
    const expectedFP = useMemo(() => round(alpha * n, 2), [n]);
    const pValues = useMemo(() => {
      const rng = mulberry32(n * 17 + 3);
      return Array.from({ length: n }, (_, i) => {
        const z = randn(rng);
        const p = 2 * (1 - normCdf(Math.abs(z)));
        return p;
      });
    }, [n]);
    const nomSig = pValues.filter((p) => p < alpha).length;
    const bonfSig = pValues.filter((p) => p < bonferroni).length;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Multiple Testing & FWER",
        caption: "All hypotheses are null (no real effect). How many do we accidentally call significant?"
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 6, fontSize: 11, color: INK3, textTransform: "uppercase", letterSpacing: "0.08em" } }, "Number of hypotheses tested: ", /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--ink-1)" } }, n)), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: 1,
          max: 50,
          value: n,
          onChange: (e) => setN(+e.target.value),
          "aria-label": "Number of hypotheses tested",
          style: { width: "100%", marginBottom: 16 }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 } }, [
        { label: "FWER", value: `${round(fwer, 1)}%`, sub: "1\u2212(1\u2212\u03B1)\u207F", color: BAD },
        { label: "Bonferroni \u03B1", value: bonferroni, sub: "\u03B1 / n", color: BLUE },
        { label: "Expected FP", value: expectedFP, sub: "\u03B1 \xD7 n", color: AMB },
        { label: "Nominal \u03B1", value: "5%", sub: "per test", color: MINT }
      ].map(({ label, value, sub, color }) => /* @__PURE__ */ React.createElement("div", { key: label, style: { padding: "10px 12px", background: BGHT, borderRadius: 8, border: `1px solid ${HAIR}` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color, textTransform: "uppercase", letterSpacing: "0.08em" } }, label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontFamily: "var(--font-serif,serif)", color, marginTop: 2 } }, value), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: INK3 } }, sub)))), /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px", background: "rgba(245,158,11,0.08)", borderRadius: 8, fontSize: 12.5, color: AMB, lineHeight: 1.6 } }, "Out of ", /* @__PURE__ */ React.createElement("strong", null, n), " tests, expect ", /* @__PURE__ */ React.createElement("strong", null, "~", expectedFP), " false positives by chance at \u03B1=0.05.")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: INK3, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" } }, "Simulated p-values (all null)"), /* @__PURE__ */ React.createElement("svg", { width: "100%", viewBox: `0 0 220 ${Math.max(n * 14 + 30, 60)}`, style: { overflow: "visible" } }, /* @__PURE__ */ React.createElement("line", { x1: alpha * 200, y1: 0, x2: alpha * 200, y2: n * 14 + 10, stroke: MINT, strokeWidth: 1, strokeDasharray: "3,2", opacity: 0.7 }), /* @__PURE__ */ React.createElement("line", { x1: Math.min(bonferroni * 200, 200), y1: 0, x2: Math.min(bonferroni * 200, 200), y2: n * 14 + 10, stroke: BLUE, strokeWidth: 1, strokeDasharray: "3,2", opacity: 0.7 }), /* @__PURE__ */ React.createElement("text", { x: alpha * 200 + 2, y: 10, fontSize: 8, fill: MINT }, "\u03B1=0.05"), /* @__PURE__ */ React.createElement("text", { x: 0, y: n * 14 + 26, fontSize: 8, fill: MINT }, nomSig, " sig (uncorrected)"), /* @__PURE__ */ React.createElement("text", { x: 100, y: n * 14 + 26, fontSize: 8, fill: BLUE }, bonfSig, " sig (Bonferroni)"), pValues.map((p, i) => {
        const x = clamp(p * 200, 1, 199);
        const y = i * 14 + 20;
        const sigNom = p < alpha;
        const sigBonf = p < bonferroni;
        const color = sigBonf ? BLUE : sigNom ? BAD : INK3;
        return /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement("rect", { x: 0, y: y - 5, width: x, height: 8, rx: 2, fill: color, opacity: sigNom ? 0.4 : 0.15 }), /* @__PURE__ */ React.createElement("circle", { cx: x, cy: y, r: 3, fill: color }));
      }))))
    );
  }
  function CUPEDExplainer() {
    const [cupedOn, setCupedOn] = useState(false);
    const N = 30;
    const data = useMemo(() => {
      const rng = mulberry32(99);
      const rows = [];
      for (let i = 0; i < N * 2; i++) {
        const group = i < N ? 0 : 1;
        const x = 0.15 + randn(rng) * 0.08;
        const noise = randn(rng) * 0.12;
        const effect = group === 1 ? 0.02 : 0;
        const y = 0.5 * x + 0.25 + noise + effect;
        rows.push({ group, x, y });
      }
      return rows;
    }, []);
    const { ctrl, trt, theta, varRaw, varCuped, pctReduction } = useMemo(() => {
      const ctrl2 = data.filter((d) => d.group === 0);
      const trt2 = data.filter((d) => d.group === 1);
      const allX = data.map((d) => d.x);
      const xBar = allX.reduce((a, b) => a + b, 0) / allX.length;
      const allY = data.map((d) => d.y);
      const covXY = data.reduce((s, d) => s + (d.x - xBar) * (d.y - allY.reduce((a, b) => a + b, 0) / allY.length), 0) / data.length;
      const varX = data.reduce((s, d) => s + (d.x - xBar) ** 2, 0) / data.length;
      const theta2 = covXY / varX;
      const yCupedAll = data.map((d) => ({ ...d, yc: d.y - theta2 * (d.x - xBar) }));
      const ctrlC = yCupedAll.filter((d) => d.group === 0);
      const trtC = yCupedAll.filter((d) => d.group === 1);
      const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const vari = (arr) => {
        const m = mean(arr);
        return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
      };
      const rawVals = [...ctrl2.map((d) => d.y), ...trt2.map((d) => d.y)];
      const cupedVals = [...ctrlC.map((d) => d.yc), ...trtC.map((d) => d.yc)];
      const varRaw2 = vari(rawVals);
      const varCuped2 = vari(cupedVals);
      const pctReduction2 = (1 - varCuped2 / varRaw2) * 100;
      const meanCtrl = mean(ctrl2.map((d) => d.y));
      const meanTrt = mean(trt2.map((d) => d.y));
      const meanCtrlC = mean(ctrlC.map((d) => d.yc));
      const meanTrtC = mean(trtC.map((d) => d.yc));
      return {
        ctrl: ctrl2,
        trt: trt2,
        theta: round(theta2, 3),
        varRaw: round(varRaw2, 5),
        varCuped: round(varCuped2, 5),
        pctReduction: round(pctReduction2, 1),
        meanCtrl: round(meanCtrl, 3),
        meanTrt: round(meanTrt, 3),
        meanCtrlC: round(meanCtrlC, 3),
        meanTrtC: round(meanTrtC, 3)
      };
    }, [data]);
    const barsData = useMemo(() => {
      const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const vari = (arr) => {
        const m = mean(arr);
        return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
      };
      const allX = data.map((d) => d.x);
      const xBar = allX.reduce((a, b) => a + b, 0) / allX.length;
      const allY = data.map((d) => d.y);
      const yBar = allY.reduce((a, b) => a + b, 0) / allY.length;
      const covXY = data.reduce((s, d) => s + (d.x - xBar) * (d.y - yBar), 0) / data.length;
      const varX = data.reduce((s, d) => s + (d.x - xBar) ** 2, 0) / data.length;
      const th = covXY / varX;
      const groups = [0, 1].map((g) => {
        const rows = data.filter((d) => d.group === g);
        const rawY = rows.map((d) => d.y);
        const cupY = rows.map((d) => d.y - th * (d.x - xBar));
        const mRaw = mean(rawY);
        const seRaw = Math.sqrt(vari(rawY) / rows.length);
        const mCup = mean(cupY);
        const seCup = Math.sqrt(vari(cupY) / rows.length);
        return { g, mRaw, seRaw, mCup, seCup };
      });
      return groups;
    }, [data]);
    const W = 280, H = 160, PAD = 40;
    const domain = [0.2, 0.4];
    const scale = (v) => PAD + (v - domain[0]) / (domain[1] - domain[0]) * (W - PAD - 20);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "EXPLAINER",
        title: "CUPED \u2014 Variance Reduction via Covariates",
        caption: "Toggle CUPED to see how pre-experiment covariates shrink confidence intervals without changing the point estimate."
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 24, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 200px", padding: 16, background: BGHT, borderRadius: 10, border: `1px solid ${HAIR}`, fontSize: 12.5, lineHeight: 1.8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-mono,monospace)", fontSize: 11, color: BLUE, marginBottom: 8 } }, "CUPED FORMULA"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-mono,monospace)", color: "var(--ink-1)" } }, "\u03B8 = Cov(Y, X) / Var(X)", /* @__PURE__ */ React.createElement("br", null), "\u0176 = Y \u2212 \u03B8(X \u2212 X\u0304)"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, color: INK3, fontSize: 12 } }, /* @__PURE__ */ React.createElement("div", null, "\u03B8 estimated: ", /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--ink-1)" } }, theta)), /* @__PURE__ */ React.createElement("div", null, "Var (raw): ", /* @__PURE__ */ React.createElement("strong", { style: { color: BAD } }, varRaw)), /* @__PURE__ */ React.createElement("div", null, "Var (CUPED): ", /* @__PURE__ */ React.createElement("strong", { style: { color: MINT } }, varCuped))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, padding: "8px 10px", background: "rgba(16,185,129,0.1)", borderRadius: 6, color: MINT, fontWeight: 600, fontSize: 13 } }, "\u2193 ", pctReduction, "% variance"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: cupedOn, onChange: (e) => setCupedOn(e.target.checked) }), "Apply CUPED"))), /* @__PURE__ */ React.createElement("div", { style: { flex: "2 1 280px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: INK3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" } }, cupedOn ? "CUPED-adjusted metric (narrower CIs)" : "Raw metric (wide CIs)"), /* @__PURE__ */ React.createElement("svg", { width: "100%", viewBox: `0 0 ${W} ${H + 20}`, style: { overflow: "visible" } }, barsData.map((b, i) => {
        const m = cupedOn ? b.mCup : b.mRaw;
        const se = cupedOn ? b.seCup : b.seRaw;
        const ci = 1.96 * se;
        const x = scale(m);
        const y = 40 + i * 50;
        const color = i === 0 ? BLUE : MINT;
        const label = i === 0 ? "Control" : "Treatment";
        return /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement("text", { x: 35, y: y + 5, fontSize: 11, fill: "#d1d5db", textAnchor: "end" }, label), /* @__PURE__ */ React.createElement(
          "line",
          {
            x1: scale(m - ci),
            y1: y,
            x2: scale(m + ci),
            y2: y,
            stroke: color,
            strokeWidth: 3,
            strokeLinecap: "round",
            style: { transition: "all 0.5s ease" }
          }
        ), /* @__PURE__ */ React.createElement(
          "line",
          {
            x1: scale(m - ci),
            y1: y - 6,
            x2: scale(m - ci),
            y2: y + 6,
            stroke: color,
            strokeWidth: 2,
            style: { transition: "all 0.5s ease" }
          }
        ), /* @__PURE__ */ React.createElement(
          "line",
          {
            x1: scale(m + ci),
            y1: y - 6,
            x2: scale(m + ci),
            y2: y + 6,
            stroke: color,
            strokeWidth: 2,
            style: { transition: "all 0.5s ease" }
          }
        ), /* @__PURE__ */ React.createElement("circle", { cx: x, cy: y, r: 5, fill: color, style: { transition: "all 0.5s ease" } }), /* @__PURE__ */ React.createElement(
          "text",
          {
            x,
            y: y - 12,
            fontSize: 10,
            fill: color,
            textAnchor: "middle",
            style: { transition: "all 0.5s ease" }
          },
          round(m, 3),
          " \xB1 ",
          round(ci, 3)
        ));
      }), /* @__PURE__ */ React.createElement("line", { x1: PAD, y1: H - 10, x2: W - 10, y2: H - 10, stroke: HAIR, strokeWidth: 1 }), [0.22, 0.26, 0.3, 0.34, 0.38].map((v) => /* @__PURE__ */ React.createElement("g", { key: v }, /* @__PURE__ */ React.createElement("line", { x1: scale(v), y1: H - 15, x2: scale(v), y2: H - 5, stroke: INK3, strokeWidth: 1 }), /* @__PURE__ */ React.createElement("text", { x: scale(v), y: H + 8, fontSize: 9, fill: INK3, textAnchor: "middle" }, v))))))
    );
  }
  function PowerCalculator() {
    const [mde, setMde] = useState(0.05);
    const [n, setN] = useState(2e3);
    const [alpha, setAlpha] = useState(0.05);
    const baseRate = 0.1;
    const power = useMemo(() => {
      const delta = baseRate * mde;
      const p1 = baseRate, p2 = baseRate + delta;
      const se = Math.sqrt(p1 * (1 - p1) / n + p2 * (1 - p2) / n);
      const zCrit = normInv(1 - alpha / 2);
      const z = delta / se - zCrit;
      return clamp(normCdf(z) * 100, 0, 99.99);
    }, [mde, n, alpha]);
    const minN = useMemo(() => {
      const delta = baseRate * mde;
      const p1 = baseRate, p2 = baseRate + delta;
      const zAlpha = normInv(1 - alpha / 2);
      const zBeta = normInv(0.8);
      const nReq = Math.ceil(
        Math.pow(zAlpha * Math.sqrt(2 * baseRate * (1 - baseRate)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / (delta * delta)
      );
      return nReq;
    }, [mde, alpha]);
    const curveData = useMemo(() => {
      const nVals = [];
      const step = Math.max(100, Math.floor(minN * 4 / 40 / 100) * 100);
      for (let ni = 100; ni <= minN * 4; ni += step) nVals.push(ni);
      const delta = baseRate * mde;
      const p1 = baseRate, p2 = baseRate + delta;
      const zCrit = normInv(1 - alpha / 2);
      return nVals.map((ni) => {
        const se = Math.sqrt(p1 * (1 - p1) / ni + p2 * (1 - p2) / ni);
        const z = delta / se - zCrit;
        return { n: ni, power: clamp(normCdf(z) * 100, 0, 99.99) };
      });
    }, [mde, alpha, minN]);
    const SVG_W = 300, SVG_H = 140, PL = 38, PR = 10, PT = 10, PB = 28;
    const maxN = curveData.length ? curveData[curveData.length - 1].n : n * 4;
    const xS = (ni) => PL + ni / maxN * (SVG_W - PL - PR);
    const yS = (pw) => PT + (1 - pw / 100) * (SVG_H - PT - PB);
    const pathD = curveData.map((d, i) => `${i === 0 ? "M" : "L"}${round(xS(d.n), 1)},${round(yS(d.power), 1)}`).join(" ");
    const currentX = xS(n);
    const currentY = yS(power);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "CALCULATOR",
        title: "Statistical Power",
        caption: `Base conversion rate: ${(baseRate * 100).toFixed(0)}%. Power = probability of detecting a real effect.`
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 } }, /* @__PURE__ */ React.createElement("div", null, [
        { label: "Minimum detectable effect (MDE)", val: mde, min: 0.01, max: 0.5, step: 0.01, fmt: (v) => `${round(v * 100, 1)}% relative`, set: setMde },
        { label: "Sample size per arm (n)", val: n, min: 100, max: 2e4, step: 100, fmt: (v) => v.toLocaleString(), set: setN },
        { label: "Significance level (\u03B1)", val: alpha, min: 0.01, max: 0.1, step: 0.01, fmt: (v) => v, set: setAlpha }
      ].map(({ label, val, min, max, step, fmt, set }) => /* @__PURE__ */ React.createElement("div", { key: label, style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--ink-2)" } }, label), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--ink-1)", fontWeight: 600 } }, fmt(val))), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min,
          max,
          step,
          value: val,
          "aria-label": label,
          onChange: (e) => set(+e.target.value),
          style: { width: "100%" }
        }
      ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 12px", background: BGHT, borderRadius: 8, border: `1px solid ${HAIR}` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: BLUE, textTransform: "uppercase", letterSpacing: "0.08em" } }, "Power"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, fontFamily: "var(--font-serif,serif)", color: power >= 80 ? MINT : power >= 60 ? AMB : BAD } }, round(power, 1), "%")), /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 12px", background: BGHT, borderRadius: 8, border: `1px solid ${HAIR}` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: BLUE, textTransform: "uppercase", letterSpacing: "0.08em" } }, "Min n (80%)"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontFamily: "var(--font-serif,serif)", color: "var(--ink-1)" } }, minN.toLocaleString()), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: INK3 } }, "per arm")))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: INK3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" } }, "Power curve"), /* @__PURE__ */ React.createElement("svg", { width: "100%", viewBox: `0 0 ${SVG_W} ${SVG_H + 4}`, style: { overflow: "visible" } }, /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: PL,
          y1: yS(80),
          x2: SVG_W - PR,
          y2: yS(80),
          stroke: MINT,
          strokeWidth: 1,
          strokeDasharray: "4,3",
          opacity: 0.6
        }
      ), /* @__PURE__ */ React.createElement("text", { x: PL + 2, y: yS(80) - 3, fontSize: 8, fill: MINT }, "80% power"), /* @__PURE__ */ React.createElement(
        "path",
        {
          d: `${pathD} L${xS(maxN)},${yS(0)} L${xS(100)},${yS(0)} Z`,
          fill: BLUE,
          opacity: 0.07
        }
      ), /* @__PURE__ */ React.createElement("path", { d: pathD, fill: "none", stroke: BLUE, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: currentX,
          y1: PT,
          x2: currentX,
          y2: SVG_H - PB,
          stroke: AMB,
          strokeWidth: 1,
          strokeDasharray: "3,2",
          opacity: 0.8
        }
      ), /* @__PURE__ */ React.createElement("circle", { cx: currentX, cy: currentY, r: 5, fill: AMB, stroke: "#1f2937", strokeWidth: 2 }), /* @__PURE__ */ React.createElement("text", { x: currentX, y: currentY - 9, fontSize: 9, fill: AMB, textAnchor: "middle" }, round(power, 1), "%"), /* @__PURE__ */ React.createElement("line", { x1: PL, y1: PT, x2: PL, y2: SVG_H - PB, stroke: HAIR, strokeWidth: 1 }), /* @__PURE__ */ React.createElement("line", { x1: PL, y1: SVG_H - PB, x2: SVG_W - PR, y2: SVG_H - PB, stroke: HAIR, strokeWidth: 1 }), [0, 25, 50, 75, 100].map((pw) => /* @__PURE__ */ React.createElement("text", { key: pw, x: PL - 3, y: yS(pw) + 3, fontSize: 8, fill: INK3, textAnchor: "end" }, pw, "%")), /* @__PURE__ */ React.createElement("text", { x: SVG_W / 2, y: SVG_H + 4, fontSize: 8, fill: INK3, textAnchor: "middle" }, "Sample size per arm"))))
    );
  }
  function Ch10_Peeking() {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 10 \xB7 Peeking & Experimental Integrity",
        title: 'How <em>p-values</em> <span class="accent">lie.</span>',
        hook: "Peeking. Multiple comparisons. Optional stopping. Variance inflation. The subtle ways significance gets manufactured \u2014 and the statistical tools to prevent it.",
        meta: [
          { k: "Read", v: "12 min" },
          { k: "Focus", v: "Peeking \xB7 CUPED \xB7 Power \xB7 MC" },
          { k: "Sims", v: "4 interactive" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "10.1" }, "Peeking & Optional Stopping"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Every interim look inflates your false-positive rate."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Suppose you run an A/B test and check the p-value each day. If it ever dips below 0.05 you stop and declare victory. The problem: even when H\u2080 is ", /* @__PURE__ */ React.createElement("em", null, "exactly true"), ", you will find p<0.05 ~22\u201330% of the time with daily checks over 7 weeks \u2014 not the 5% you budgeted. This is ", /* @__PURE__ */ React.createElement("strong", null, "optional stopping bias"), "."), /* @__PURE__ */ React.createElement(PeekingSimulator, null), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<strong>Continuous monitoring with naive \u03B1</strong> \u2014 checking significance every day and stopping at first p&lt;0.05 breaks the Type-I error guarantee.",
      '<strong>"It was significant yesterday"</strong> \u2014 the p-value is a random variable; a single dip below threshold is not a discovery.',
      "<strong>HARKing (Hypothesising After Results are Known)</strong> \u2014 writing a hypothesis after seeing the data guarantees inflated FPR."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<strong>Pre-register</strong> sample size, primary metric, and test duration before data collection begins.",
      "<strong>Sequential testing</strong> (mSPRT, always-valid p-values) formally allows interim looks with \u03B1 spending.",
      "<strong>Bayesian A/B testing</strong> with explicit stopping rules is naturally coherent under optional stopping."
    ] })), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "10.2" }, "Multiple Comparisons"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Test 20 metrics. Expect 1 false positive \u2014 by construction."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "The family-wise error rate (FWER) for ", /* @__PURE__ */ React.createElement("em", null, "n"), " independent tests at \u03B1 = 0.05 is 1 \u2212 (1 \u2212 0.05)\u207F. At n = 20 that is 64%. Slide the dial below to see how fast this compounds."), /* @__PURE__ */ React.createElement(MultipleTesting, null), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<strong>Reporting every green metric</strong> without FWER correction turns noise into a press release.",
      "<strong>Post-hoc segmentation fishing</strong> \u2014 slicing by 20 segments until one looks good is the same as 20 tests."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<strong>Bonferroni correction</strong>: use \u03B1/n per test. Conservative but simple.",
      "<strong>Benjamini-Hochberg</strong> (FDR): less conservative, controls expected proportion of false discoveries.",
      "<strong>Nominate a primary metric</strong> before the test. Secondary metrics inform; they do not decide."
    ] })), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "10.3" }, "CUPED"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Same data, higher power \u2014 for free."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "CUPED (Controlled-experiment Using Pre-Experiment Data) uses a pre-period covariate X correlated with the outcome Y to construct an adjusted metric \u0176 with lower variance. The point estimate is unbiased and the confidence interval shrinks \u2014 you reach significance faster or need fewer users. Variance reductions of 20\u201360% are common."), /* @__PURE__ */ React.createElement(CUPEDExplainer, null), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<strong>Always apply CUPED</strong> when you have pre-period data. It is never harmful.",
      "Good covariates: prior purchase rate, prior visit frequency, account age, prior metric value.",
      "\u03B8 is estimated on the <em>combined</em> data (not per arm) to avoid leakage from treatment assignment.",
      "CUPED is compatible with any test statistic \u2014 just replace Y with \u0176."
    ] })), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "10.4" }, "Statistical Power"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Underpowered tests waste time and money."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Power = P(reject H\u2080 | H\u2081 true). An underpowered study will miss a real effect and waste the experiment slot. The minimum detectable effect (MDE) drives everything: halving the MDE quadruples the required sample size. Calculate power ", /* @__PURE__ */ React.createElement("em", null, "before"), " you start."), /* @__PURE__ */ React.createElement(PowerCalculator, null), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<strong>Running until significant</strong> \u2014 equivalent to peeking; confounds effect size and luck.",
      "<strong>Ignoring MDE when setting duration</strong> \u2014 a test with 30% power is mostly noise.",
      '<strong>Reporting underpowered null results</strong> as "no effect found" \u2014 absence of evidence \u2260 evidence of absence.'
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "Target \u2265 80% power (industry standard). 90% for high-stakes decisions.",
      "Use historical variance and conversion rate to size tests ahead of time.",
      "Reduce required n by applying CUPED (lowers \u03C3\xB2) or by increasing \u03B1 for exploration.",
      "Use a power calculator \u2014 not intuition \u2014 every time."
    ] })), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Peeking is not harmless curiosity.</b> Each interim look multiplies your false-positive risk. Pre-register or use sequential tests.",
      "<b>Multiple comparisons compound fast.</b> 20 tests at \u03B1=0.05 \u2192 64% chance of at least one false positive. Correct with Bonferroni or BH.",
      "<b>CUPED is almost free.</b> Apply it whenever you have pre-period data. Variance drops 20\u201360% with zero bias cost.",
      "<b>Power first.</b> Calculate minimum sample size before collecting data. Underpowered tests are expensive noise.",
      "<b>The pre-registration contract.</b> Committing to metric, sample size, and duration before seeing data is the single highest-leverage habit in experimentation."
    ] }));
  }
  window.Ch10_Peeking = Ch10_Peeking;
})();
