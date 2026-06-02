(() => {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }
  const LOAN_FEATURES = [
    { key: "income", label: "Annual income ($k)", min: 20, max: 200, step: 1, mean: 70, weight: 4e-3 },
    { key: "age", label: "Age (years)", min: 18, max: 75, step: 1, mean: 38, weight: 55e-4 },
    { key: "debt_ratio", label: "Debt ratio (%)", min: 0, max: 80, step: 1, mean: 35, weight: -7e-3 },
    { key: "employment_years", label: "Employment years", min: 0, max: 30, step: 1, mean: 8, weight: 9e-3 },
    { key: "credit_score", label: "Credit score", min: 300, max: 850, step: 5, mean: 640, weight: 28e-4 },
    { key: "savings", label: "Savings ($k)", min: 0, max: 150, step: 1, mean: 25, weight: 5e-3 }
  ];
  const LOAN_BASE = 0.42;
  function SHAPWaterfallSim() {
    const defaults = useMemo(() => Object.fromEntries(LOAN_FEATURES.map((f) => [f.key, f.mean])), []);
    const [vals, setVals] = useState(defaults);
    const { rows, finalScore } = useMemo(() => {
      let running = LOAN_BASE;
      const rows2 = LOAN_FEATURES.map((f) => {
        const contrib = (vals[f.key] - f.mean) * f.weight;
        const from = running;
        running = clamp(running + contrib, 0.01, 0.99);
        return { ...f, contrib, from, to: running };
      });
      return { rows: rows2, finalScore: running };
    }, [vals]);
    const W = 440, H = 240;
    const BAR_H = 14, ROW_H = 36, PAD_LEFT = 148, PAD_RIGHT = 40;
    const xScale = (v) => PAD_LEFT + v * (W - PAD_LEFT - PAD_RIGHT);
    const baseX = xScale(LOAN_BASE);
    const approved = finalScore >= 0.5;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "SHAP waterfall \xB7 loan approval",
        meta: `score ${round(finalScore, 3)} \xB7 ${approved ? "APPROVED" : "DECLINED"}`,
        caption: "Each feature's contribution = (your value \u2212 population mean) \xD7 weight. Bars extend right (positive) or left (negative) from the running total, which is clamped to a valid [0.01, 0.99] probability."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls", style: { minWidth: 220 } }, LOAN_FEATURES.map((f) => /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl", key: f.key }, /* @__PURE__ */ React.createElement("label", null, f.label, " ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, vals[f.key])), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: f.min,
          max: f.max,
          step: f.step,
          value: vals[f.key],
          "aria-label": f.label,
          onChange: (e) => setVals((v) => ({ ...v, [f.key]: +e.target.value }))
        }
      ))), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "btn btn-sm",
          style: { marginTop: 8 },
          onClick: () => setVals(defaults)
        },
        "Reset to means"
      )), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-plot-head" }, "SHAP waterfall", /* @__PURE__ */ React.createElement("span", { className: "hint" }, "baseline ", LOAN_BASE.toFixed(2), " \u2192 score ", round(finalScore, 3))), /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H + 30}`, style: { width: "100%" } }, /* @__PURE__ */ React.createElement(
        "text",
        {
          x: baseX,
          y: 12,
          textAnchor: "middle",
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "BASE ",
        LOAN_BASE.toFixed(2)
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: baseX,
          y1: 16,
          x2: baseX,
          y2: H - 10,
          stroke: "rgba(164,157,154,0.25)",
          strokeDasharray: "3 3",
          strokeWidth: "1"
        }
      ), rows.map((f, i) => {
        const y = 22 + i * ROW_H;
        const pos = f.contrib >= 0;
        const barX = pos ? xScale(f.from) : xScale(f.to);
        const barW = Math.abs(xScale(f.to) - xScale(f.from));
        const color = pos ? "#1FAF7E" : "#D83A3A";
        const labelX = pos ? xScale(f.to) + 5 : xScale(f.to) - 5;
        const anchor = pos ? "start" : "end";
        return /* @__PURE__ */ React.createElement("g", { key: f.key }, /* @__PURE__ */ React.createElement(
          "text",
          {
            x: PAD_LEFT - 6,
            y: y + 11,
            textAnchor: "end",
            fontSize: "10",
            fill: "#C7C4BC",
            fontFamily: "'JetBrains Mono',monospace"
          },
          f.label
        ), i > 0 && /* @__PURE__ */ React.createElement(
          "line",
          {
            x1: xScale(f.from),
            y1: y - ROW_H + BAR_H + 4,
            x2: xScale(f.from),
            y2: y + 4,
            stroke: "rgba(164,157,154,0.18)",
            strokeWidth: "1",
            strokeDasharray: "2 2"
          }
        ), /* @__PURE__ */ React.createElement(
          "rect",
          {
            x: barX,
            y,
            width: Math.max(barW, 1),
            height: BAR_H,
            fill: color,
            rx: "2",
            style: { transition: "all 200ms ease" }
          }
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: labelX,
            y: y + 11,
            textAnchor: anchor,
            fontSize: "10",
            fill: color,
            fontFamily: "'JetBrains Mono',monospace"
          },
          f.contrib >= 0 ? "+" : "",
          round(f.contrib, 3)
        ));
      }), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xScale(finalScore),
          y1: 18,
          x2: xScale(finalScore),
          y2: H - 4,
          stroke: approved ? "#1FAF7E" : "#D83A3A",
          strokeWidth: "2"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: xScale(finalScore),
          y: H + 14,
          textAnchor: "middle",
          fontSize: "10",
          fill: approved ? "#1FAF7E" : "#D83A3A",
          fontFamily: "'JetBrains Mono',monospace",
          fontWeight: "700"
        },
        round(finalScore, 3),
        " \xB7 ",
        approved ? "APPROVED" : "DECLINED"
      ), [0, 0.25, 0.5, 0.75, 1].map((v) => /* @__PURE__ */ React.createElement("g", { key: v }, /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xScale(v),
          y1: H - 4,
          x2: xScale(v),
          y2: H,
          stroke: "#A49D9A",
          strokeWidth: "0.6"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: xScale(v),
          y: H + 10,
          textAnchor: "middle",
          fontSize: "8",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono',monospace"
        },
        v.toFixed(2)
      ))), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: PAD_LEFT,
          y1: H - 4,
          x2: W - PAD_RIGHT,
          y2: H - 4,
          stroke: "#A49D9A",
          strokeWidth: "0.6"
        }
      ))))
    );
  }
  function LIMEExplainer() {
    const [qx, setQx] = useState(0.55);
    const [qy, setQy] = useState(0.45);
    const RADIUS = 0.22;
    const trueProb = useCallback((x, y) => sigmoid(6 * (x - 0.5) + 1.5 * (y - 0.5)), []);
    const localExplanation = useMemo(() => {
      const rng = mulberry32(42);
      const N = 80;
      const samples = [];
      for (let i = 0; i < N; i++) {
        const sx = clamp(qx + (rng() - 0.5) * RADIUS * 2, 0, 1);
        const sy = clamp(qy + (rng() - 0.5) * RADIUS * 2, 0, 1);
        const dist = Math.sqrt((sx - qx) ** 2 + (sy - qy) ** 2);
        if (dist > RADIUS) continue;
        const w = Math.exp(-((dist / (RADIUS * 0.5)) ** 2));
        const prob = trueProb(sx, sy);
        samples.push({ sx, sy, w, prob });
      }
      let sw = 0, swx = 0, swy = 0, swp = 0;
      samples.forEach(({ sx, sy, w, prob }) => {
        sw += w;
        swx += w * (sx - qx);
        swy += w * (sy - qy);
        swp += w * prob;
      });
      const swInv = sw || 1;
      const mx = swx / swInv, my = swy / swInv, mp = swp / swInv;
      let cxx = 0, cyy = 0, cxy = 0, cpx = 0, cpy = 0;
      samples.forEach(({ sx, sy, w, prob }) => {
        const dx = sx - qx - mx, dy = sy - qy - my, dp = prob - mp;
        cxx += w * dx * dx;
        cyy += w * dy * dy;
        cxy += w * dx * dy;
        cpx += w * dp * dx;
        cpy += w * dp * dy;
      });
      const det = (cxx + 1e-3) * (cyy + 1e-3) - cxy * cxy;
      const a12 = det !== 0 ? ((cyy + 1e-3) * cpx - cxy * cpy) / det : 0;
      const a22 = det !== 0 ? ((cxx + 1e-3) * cpy - cxy * cpx) / det : 0;
      const a02 = mp - a12 * mx - a22 * my;
      return { a0: a02, a1: a12, a2: a22, prob: trueProb(qx, qy) };
    }, [qx, qy, trueProb]);
    const SW = 300, SH = 280;
    const toSvg = (v, dim) => v * (dim === "x" ? SW : SH);
    const qsvgX = toSvg(qx, "x"), qsvgY = toSvg(1 - qy, "y");
    const rSvg = RADIUS * SW;
    const CELLS = 30;
    const cells = useMemo(() => {
      const out = [];
      for (let iy = 0; iy < CELLS; iy++) {
        for (let ix = 0; ix < CELLS; ix++) {
          const cx = (ix + 0.5) / CELLS, cy = (iy + 0.5) / CELLS;
          out.push({ cx, cy, p: trueProb(cx, cy) });
        }
      }
      return out;
    }, [trueProb]);
    const { a0, a1, a2 } = localExplanation;
    const localBndX = a1 !== 0 ? qx + (0.5 - a0) / a1 : null;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "LIME \xB7 local linear explanation",
        meta: `P(class B) = ${round(localExplanation.prob, 3)}`,
        caption: "LIME samples points around the query (dashed circle), weights them by distance, and fits a simple linear model locally. The dotted line is the local decision boundary \u2014 valid only within the circle."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls", style: { minWidth: 200 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Query X ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, round(qx, 2))), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0.05",
          max: "0.95",
          step: "0.01",
          value: qx,
          "aria-label": "Query point X",
          onChange: (e) => setQx(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Query Y ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, round(qy, 2))), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0.05",
          max: "0.95",
          step: "0.01",
          value: qy,
          "aria-label": "Query point Y",
          onChange: (e) => setQy(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "P(class B)"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--violet-ink)" } }, round(localExplanation.prob, 3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Local \u2202/\u2202x"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: a1 >= 0 ? "var(--good-ink)" : "var(--bad-ink)" } }, a1 >= 0 ? "+" : "", round(a1, 3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Local \u2202/\u2202y"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: a2 >= 0 ? "var(--good-ink)" : "var(--bad-ink)" } }, a2 >= 0 ? "+" : "", round(a2, 3)))), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 11, marginTop: 8, lineHeight: 1.5 } }, Math.abs(a1) > Math.abs(a2) ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("strong", null, "Feature X"), " drives this prediction more than Y locally.") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("strong", null, "Feature Y"), " drives this prediction more than X locally."))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-plot-head" }, "Decision boundary", /* @__PURE__ */ React.createElement("span", { className: "hint" }, "class A (blue) \xB7 class B (pink) \xB7 locality circle (dashed)")), /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${SW} ${SH}`, style: { width: "100%", cursor: "crosshair" } }, cells.map(({ cx, cy, p }, i) => {
        const r = Math.round(91 + p * 164), g = Math.round(62 + (1 - p) * 100), b = Math.round(232 * (1 - p) + 164 * p);
        return /* @__PURE__ */ React.createElement(
          "rect",
          {
            key: i,
            x: cx * SW - SW / CELLS / 2,
            y: (1 - cy) * SH - SH / CELLS / 2,
            width: SW / CELLS + 1,
            height: SH / CELLS + 1,
            fill: `rgb(${r},${g},${b})`,
            opacity: "0.35"
          }
        );
      }), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: 0.5 * SW,
          y1: 0,
          x2: 0.5 * SW,
          y2: SH,
          stroke: "rgba(244,242,236,0.4)",
          strokeWidth: "1.5",
          strokeDasharray: "5 3"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: 0.5 * SW + 4,
          y: 14,
          fontSize: "9",
          fill: "rgba(244,242,236,0.5)",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "global boundary"
      ), /* @__PURE__ */ React.createElement(
        "circle",
        {
          cx: qsvgX,
          cy: qsvgY,
          r: rSvg,
          fill: "rgba(244,242,236,0.05)",
          stroke: "rgba(244,242,236,0.7)",
          strokeWidth: "1.5",
          strokeDasharray: "6 4"
        }
      ), localBndX !== null && localBndX > 0 && localBndX < 1 && /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: localBndX * SW,
          y1: qsvgY - rSvg * 0.9,
          x2: localBndX * SW,
          y2: qsvgY + rSvg * 0.9,
          stroke: "#E8A031",
          strokeWidth: "2",
          strokeDasharray: "4 3"
        }
      ), /* @__PURE__ */ React.createElement(
        "circle",
        {
          cx: qsvgX,
          cy: qsvgY,
          r: "7",
          fill: localExplanation.prob >= 0.5 ? "#E8318F" : "#5B3EE8",
          stroke: "#FBF8F1",
          strokeWidth: "2"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: qsvgX + 10,
          y: qsvgY + 4,
          fontSize: "10",
          fill: "#FBF8F1",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "query"
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: SW - 4,
          y: SH - 4,
          textAnchor: "end",
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "X \u2192"
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: 4,
          y: 14,
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "Y \u2191"
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: 8,
          y: SH / 2,
          fontSize: "9",
          fill: "rgba(91,62,232,0.7)",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "A"
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: SW - 16,
          y: SH / 2,
          fontSize: "9",
          fill: "rgba(232,49,143,0.7)",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "B"
      ))))
    );
  }
  const PERM_FEATURES = [
    { key: "credit_score", label: "Credit score", trueImportance: 0.21 },
    { key: "income", label: "Annual income", trueImportance: 0.14 },
    { key: "debt_ratio", label: "Debt ratio", trueImportance: 0.11 },
    { key: "employment_yrs", label: "Employment yrs", trueImportance: 0.07 },
    { key: "savings", label: "Savings", trueImportance: 0.04 }
  ];
  const PERM_BASELINE = 0.847;
  function PermutationImportance() {
    const [seed, setSeed] = useState(1);
    const [running, setRunning] = useState(false);
    const results = useMemo(() => {
      const rng = mulberry32(seed * 31337);
      return PERM_FEATURES.map((f) => {
        const noise = (rng() - 0.5) * 0.025;
        const drop = clamp(f.trueImportance + noise, 5e-3, 0.35);
        const shuffledAcc = clamp(PERM_BASELINE - drop, 0.45, 0.99);
        return { ...f, drop, shuffledAcc };
      });
    }, [seed]);
    const maxDrop = Math.max(...results.map((r) => r.drop));
    const BAR_W = 280;
    function handleShuffle() {
      setRunning(true);
      setTimeout(() => {
        setSeed((s) => s + 1);
        setRunning(false);
      }, 600);
    }
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Permutation importance",
        meta: `baseline accuracy ${PERM_BASELINE.toFixed(3)}`,
        caption: "Shuffle one feature column at random \u2192 model loses access to it \u2192 accuracy drops. The bigger the drop, the more the model relied on that feature. Hit Shuffle to resample noise."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls", style: { minWidth: 180 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-stats" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Baseline acc"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--good-ink)" } }, PERM_BASELINE.toFixed(3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Top feature"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--warn-ink)", fontSize: 11 } }, results.reduce((a, b) => a.drop > b.drop ? a : b).label))), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: `btn btn-sm ${running ? "btn-primary" : ""}`,
          style: { marginTop: 16 },
          onClick: handleShuffle,
          disabled: running
        },
        running ? "\u27F3 Shuffling\u2026" : "\u229E Shuffle features"
      ), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 11, marginTop: 10, lineHeight: 1.5 } }, "Each run adds small random noise to simulate repeated permutations. The ranking stays stable \u2014 that's the signal.")), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-plot-head" }, "Accuracy after shuffle", /* @__PURE__ */ React.createElement("span", { className: "hint" }, "red = post-shuffle \xB7 line = baseline")), /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${BAR_W + 80} ${results.length * 46 + 30}`, style: { width: "100%" } }, results.map((f, i) => {
        const barFull = f.shuffledAcc / PERM_BASELINE * BAR_W;
        const baseBarFull = BAR_W;
        const y = 16 + i * 46;
        const isTop = f.drop === maxDrop;
        return /* @__PURE__ */ React.createElement("g", { key: f.key }, /* @__PURE__ */ React.createElement(
          "text",
          {
            x: 0,
            y: y + 12,
            fontSize: "10",
            fill: isTop ? "#E8A031" : "#C7C4BC",
            fontFamily: "'JetBrains Mono',monospace",
            fontWeight: isTop ? "700" : "400"
          },
          f.label
        ), /* @__PURE__ */ React.createElement(
          "rect",
          {
            x: 0,
            y: y + 17,
            width: baseBarFull,
            height: 10,
            fill: "rgba(164,157,154,0.15)",
            rx: "2"
          }
        ), /* @__PURE__ */ React.createElement(
          "rect",
          {
            x: 0,
            y: y + 17,
            width: Math.max(barFull, 2),
            height: 10,
            fill: isTop ? "#E8A031" : "#D83A3A",
            rx: "2",
            opacity: "0.85",
            style: { transition: "width 400ms ease" }
          }
        ), /* @__PURE__ */ React.createElement(
          "line",
          {
            x1: baseBarFull,
            y1: y + 14,
            x2: baseBarFull,
            y2: y + 30,
            stroke: "rgba(244,242,236,0.5)",
            strokeWidth: "1.5",
            strokeDasharray: "3 2"
          }
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: baseBarFull + 4,
            y: y + 26,
            fontSize: "10",
            fill: isTop ? "#E8A031" : "#D83A3A",
            fontFamily: "'JetBrains Mono',monospace"
          },
          "\u2212",
          round(f.drop, 3)
        ));
      }), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: 0,
          y1: results.length * 46 + 10,
          x2: BAR_W,
          y2: results.length * 46 + 10,
          stroke: "#A49D9A",
          strokeWidth: "0.6"
        }
      ))))
    );
  }
  const GVL_FEATURES = ["credit_score", "income", "debt_ratio", "employment_yrs"];
  const GVL_WEIGHTS = [0.38, 0.26, -0.22, 0.14];
  function GlobalVsLocal() {
    const [selected, setSelected] = useState(null);
    const points = useMemo(() => {
      const rng = mulberry32(999);
      return Array.from({ length: 20 }, (_, i) => {
        const x = 0.08 + rng() * 0.84;
        const y = 0.08 + rng() * 0.84;
        const featureVals = GVL_FEATURES.map(() => rng() * 2 - 1);
        const score = clamp(0.5 + featureVals.reduce((s, v, j) => s + v * GVL_WEIGHTS[j], 0), 0.05, 0.95);
        return { id: i, x, y, score, featureVals };
      });
    }, []);
    const globalImportance = GVL_WEIGHTS.map((w, j) => ({
      label: GVL_FEATURES[j],
      importance: Math.abs(w)
    }));
    const localShap = useMemo(() => {
      if (selected === null) return null;
      const pt = points[selected];
      return GVL_FEATURES.map((label, j) => ({
        label,
        contrib: pt.featureVals[j] * GVL_WEIGHTS[j]
      }));
    }, [selected, points]);
    const SW = 260, SH = 260;
    const BAR_MAX = 120;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATION",
        title: "Global vs local explanations",
        meta: selected !== null ? `point #${selected} selected \xB7 score ${round(points[selected].score, 3)}` : "20 data points \xB7 click one",
        caption: "Global importance is the same for every prediction \u2014 it describes the model overall. Local SHAP values change for every data point. Click any dot to see how its explanation differs from the global view."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "plot-wrap", style: { flex: "0 0 auto", width: SW + 20 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-plot-head" }, "Data points ", /* @__PURE__ */ React.createElement("span", { className: "hint" }, "click any dot")), /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${SW} ${SH}`, style: { width: "100%", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("rect", { x: 0, y: 0, width: SW, height: SH, fill: "rgba(20,18,22,0.3)", rx: "4" }), points.map((pt) => {
        const cx = pt.x * SW, cy = (1 - pt.y) * SH;
        const isSel = selected === pt.id;
        const color = pt.score >= 0.5 ? "#1FAF7E" : "#D83A3A";
        return /* @__PURE__ */ React.createElement("g", { key: pt.id, onClick: () => setSelected(pt.id), style: { cursor: "pointer" } }, isSel && /* @__PURE__ */ React.createElement(
          "circle",
          {
            cx,
            cy,
            r: "13",
            fill: "none",
            stroke: "#E8A031",
            strokeWidth: "2",
            opacity: "0.7"
          }
        ), /* @__PURE__ */ React.createElement(
          "circle",
          {
            cx,
            cy,
            r: isSel ? 7 : 5,
            fill: color,
            stroke: isSel ? "#FBF8F1" : "none",
            strokeWidth: "1.5",
            opacity: "0.9"
          }
        ), isSel && /* @__PURE__ */ React.createElement(
          "text",
          {
            x: cx + 10,
            y: cy + 4,
            fontSize: "10",
            fill: "#E8A031",
            fontFamily: "'JetBrains Mono',monospace"
          },
          "#",
          pt.id
        ));
      }))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "sim-plot-head" }, "Global importance", /* @__PURE__ */ React.createElement("span", { className: "hint" }, "same for every point")), /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${BAR_MAX + 100} ${GVL_FEATURES.length * 28 + 8}`, style: { width: "100%" } }, globalImportance.map((f, i) => /* @__PURE__ */ React.createElement("g", { key: f.label }, /* @__PURE__ */ React.createElement(
        "text",
        {
          x: 0,
          y: i * 28 + 15,
          fontSize: "10",
          fill: "#C7C4BC",
          fontFamily: "'JetBrains Mono',monospace"
        },
        f.label
      ), /* @__PURE__ */ React.createElement(
        "rect",
        {
          x: 0,
          y: i * 28 + 19,
          width: f.importance * BAR_MAX,
          height: 9,
          fill: "#5B3EE8",
          rx: "2",
          opacity: "0.8"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: f.importance * BAR_MAX + 4,
          y: i * 28 + 27,
          fontSize: "9",
          fill: "#5B3EE8",
          fontFamily: "'JetBrains Mono',monospace"
        },
        round(f.importance, 3)
      ))))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "sim-plot-head" }, "Local SHAP", /* @__PURE__ */ React.createElement("span", { className: "hint" }, selected === null ? "click a point above" : `point #${selected}`)), localShap === null ? /* @__PURE__ */ React.createElement("p", { className: "prose", style: { fontSize: 11, padding: "8px 0", opacity: 0.5 } }, "Select a data point to see its local explanation.") : /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${BAR_MAX * 2 + 100} ${GVL_FEATURES.length * 28 + 8}`, style: { width: "100%" } }, /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: BAR_MAX + 0,
          y1: 0,
          x2: BAR_MAX + 0,
          y2: GVL_FEATURES.length * 28 + 8,
          stroke: "rgba(164,157,154,0.3)",
          strokeWidth: "1"
        }
      ), localShap.map((f, i) => {
        const pos = f.contrib >= 0;
        const barW = Math.abs(f.contrib) * BAR_MAX * 1.8;
        const barX = pos ? BAR_MAX : BAR_MAX - barW;
        const color = pos ? "#1FAF7E" : "#D83A3A";
        return /* @__PURE__ */ React.createElement("g", { key: f.label }, /* @__PURE__ */ React.createElement(
          "text",
          {
            x: 0,
            y: i * 28 + 15,
            fontSize: "10",
            fill: "#C7C4BC",
            fontFamily: "'JetBrains Mono',monospace"
          },
          f.label
        ), /* @__PURE__ */ React.createElement(
          "rect",
          {
            x: barX,
            y: i * 28 + 19,
            width: Math.max(barW, 2),
            height: 9,
            fill: color,
            rx: "2",
            opacity: "0.85",
            style: { transition: "all 300ms ease" }
          }
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: pos ? BAR_MAX + barW + 4 : BAR_MAX - barW - 4,
            y: i * 28 + 27,
            textAnchor: pos ? "start" : "end",
            fontSize: "9",
            fill: color,
            fontFamily: "'JetBrains Mono',monospace"
          },
          f.contrib >= 0 ? "+" : "",
          round(f.contrib, 3)
        ));
      })))))
    );
  }
  function Ch07_Interpret() {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 07 \xB7 Interpret",
        title: "A model you can&rsquo;t explain is a <em>liability.</em>",
        hook: "A 0.91 AUC model is worthless to the business until you can answer <strong>&ldquo;why did it say yes?&rdquo;</strong>. SHAP, LIME, permutation importance \u2014 the toolkit for accountability.",
        meta: [{ k: "Read", v: "10 min" }, { k: "Focus", v: "SHAP \xB7 LIME \xB7 Permutation" }, { k: "Sims", v: "4 interactive" }]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "07.1" }, "Per-instance explanations \u2014 SHAP"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "SHAP: game theory meets ML."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, 'SHAP (SHapley Additive exPlanations) distributes "prediction credit" across features using cooperative game theory. For each prediction, see exactly which features pushed it toward approval \u2014 and by how much. The waterfall chart shows the running total from baseline to final score. Slide each feature to see contributions shift in real time.'), /* @__PURE__ */ React.createElement(SHAPWaterfallSim, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "07.2" }, "Local approximation \u2014 LIME"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Complex model, simple explanation \u2014 nearby."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "LIME (Local Interpretable Model-agnostic Explanations) sidesteps the global complexity by asking a simpler question: ", /* @__PURE__ */ React.createElement("em", null, "what linear model fits the model's behavior around this one point?"), "It samples nearby points, weights them by proximity, and fits a lightweight proxy. Move the query point and watch the local boundary shift."), /* @__PURE__ */ React.createElement(LIMEExplainer, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "07.3" }, "Global feature importance \u2014 permutation"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Corrupt one column. Measure the damage."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Permutation importance breaks the relationship between a feature and the target by randomly shuffling its column \u2014 the model still runs, but that feature is now noise. The accuracy drop tells you how much the model relied on it. Unlike impurity-based importances (which favour high-cardinality features), permutation importance is robust across model types."), /* @__PURE__ */ React.createElement(PermutationImportance, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "07.4" }, "Global \u2260 local"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "The model's average behaviour can be wrong for ", /* @__PURE__ */ React.createElement("em", null, "your"), " user."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A feature can rank high globally yet barely move a specific individual's prediction \u2014 or vice versa. Click any data point and compare its local SHAP to the global importance bar. This is why fairness audits, regulatory explanations, and high-stakes decisions require", /* @__PURE__ */ React.createElement("em", null, " local"), " explanations, not just global summaries."), /* @__PURE__ */ React.createElement(GlobalVsLocal, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Using feature importance as causation.</b> A high SHAP value means the model <em>uses</em> the feature, not that changing it will change the outcome (see Ch 09).",
      "<b>Trusting global importance alone for individual decisions.</b> Global rankings can completely misrepresent what drives a single prediction.",
      "<b>LIME radius too large.</b> If the locality is too wide, the linear approximation covers non-linear territory and the explanation misleads.",
      "<b>Permutation on training data.</b> Always permute on held-out data \u2014 shuffling on train can underestimate importance if the model memorised the column."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>SHAP for audit trails:</b> per-decision, additive, and guaranteed to sum to the prediction gap.",
      "<b>Permutation for global sense-checking:</b> model-agnostic, catches surprises, scales to any architecture.",
      '<b>LIME for stakeholder demos:</b> easy to explain \u2014 "we zoomed in on the neighbourhood around your application."',
      "<b>Always show confidence / variance</b> of importance estimates \u2014 run permutation multiple times and report the spread."
    ] })), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Accountability is the price of deployment.</b> Stakeholders will ask why \u2014 prepare the answer before launch.",
      "<b>SHAP for audits, permutation for global sense, LIME for local proxies.</b> Tools are complementary, not competing.",
      "<b>Correlation \u2260 mechanism.</b> Feature importance does not equal causal influence (Ch 09). Do not confuse them in executive presentations.",
      "<b>Global \u2260 local.</b> A model that is fair on average can be unfair for a specific subgroup. Always audit at both levels."
    ] }));
  }
  window.Ch07_Interpret = Ch07_Interpret;
})();
