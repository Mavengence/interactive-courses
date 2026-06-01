(() => {
  const { useState, useMemo, useEffect } = React;
  function ThresholdSim() {
    const [thr, setThr] = useState(0.5);
    const [auto, setAuto] = useState(false);
    const data = useMemo(() => {
      const r = mulberry32(7);
      const out = [];
      for (let i = 0; i < 160; i++) {
        const pos = i < 80;
        const score = pos ? clamp(0.65 + 0.16 * randn(r), 0.02, 0.98) : clamp(0.32 + 0.16 * randn(r), 0.02, 0.98);
        out.push({ score, label: pos ? 1 : 0, jy: r() });
      }
      return out.sort((a, b) => a.score - b.score);
    }, []);
    useEffect(() => {
      if (!auto) return;
      let raf, start = performance.now();
      const loop = (now) => {
        const t = (now - start) / 1e3;
        setThr(0.5 + 0.45 * Math.sin(t * 0.7));
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [auto]);
    let tp = 0, fp = 0, fn = 0, tn = 0;
    data.forEach((d) => {
      const pred = d.score >= thr ? 1 : 0;
      if (pred === 1 && d.label === 1) tp++;
      else if (pred === 1 && d.label === 0) fp++;
      else if (pred === 0 && d.label === 1) fn++;
      else tn++;
    });
    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0;
    const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
    const tpr = rec;
    const roc = useMemo(() => {
      const pts = [];
      for (let i = 0; i <= 100; i++) {
        const t = 1 - i / 100;
        let a = 0, b = 0, c = 0, d2 = 0;
        data.forEach((x) => {
          const p = x.score >= t ? 1 : 0;
          if (p === 1 && x.label === 1) a++;
          else if (p === 1 && x.label === 0) b++;
          else if (p === 0 && x.label === 1) c++;
          else d2++;
        });
        pts.push([b + d2 > 0 ? b / (b + d2) : 0, a + c > 0 ? a / (a + c) : 0]);
      }
      return pts;
    }, [data]);
    const W = 560, H = 180;
    const xMap = (s) => 30 + s * (W - 60);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "LIVE \xB7 SWEEP",
        title: "Threshold \xB7 confusion \xB7 ROC",
        meta: `\u03C4 = ${thr.toFixed(2)}`,
        caption: "Drag \u03C4. Dots above flip to 'predicted positive' \u2014 some are right (violet), some are false alarms (orange). The ROC curve traces every possible \u03C4; the square is where you are now."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row", style: { gridTemplateColumns: "260px 1fr" } }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Threshold \u03C4 ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, thr.toFixed(2))), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "1",
          step: "0.01",
          value: thr,
          "aria-label": "Decision threshold",
          onChange: (e) => {
            setAuto(false);
            setThr(+e.target.value);
          }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl-row" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: `btn btn-sm ${auto ? "btn-primary" : ""}`,
          onClick: () => setAuto((a) => !a)
        },
        auto ? "\u25A0 Stop sweep" : "\u25B6 Auto-sweep \u03C4"
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-stats" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Precision"), /* @__PURE__ */ React.createElement("div", { className: "v" }, round(prec, 2))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Recall"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--magenta)" } }, round(rec, 2))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "F1"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { color: "var(--violet)" } }, round(f1, 2)))), /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: 9,
        color: "var(--muted)",
        fontFamily: "'JetBrains Mono',monospace",
        display: "grid",
        gridTemplateColumns: "28px 1fr 1fr",
        gap: 2,
        marginTop: 4
      } }, /* @__PURE__ */ React.createElement("div", null), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", paddingBottom: 2, borderBottom: "1px solid var(--hair-2)" } }, "PRED +"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", paddingBottom: 2, borderBottom: "1px solid var(--hair-2)" } }, "PRED \u2212"), /* @__PURE__ */ React.createElement("div", { style: {
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        textAlign: "center",
        paddingRight: 2,
        borderRight: "1px solid var(--hair-2)"
      } }, "ACT +"), /* @__PURE__ */ React.createElement("div", { className: "cm-cell", style: { background: "rgba(91,62,232,0.08)", border: "1px solid rgba(91,62,232,0.3)" } }, /* @__PURE__ */ React.createElement("div", { className: "cm-lab" }, "TP \xB7 caught"), /* @__PURE__ */ React.createElement("div", { className: "cm-val", style: { color: "var(--violet)" } }, tp)), /* @__PURE__ */ React.createElement("div", { className: "cm-cell", style: { background: "rgba(216,58,58,0.08)", border: "1px solid rgba(216,58,58,0.3)" } }, /* @__PURE__ */ React.createElement("div", { className: "cm-lab" }, "FN \xB7 missed"), /* @__PURE__ */ React.createElement("div", { className: "cm-val", style: { color: "var(--bad)" } }, fn)), /* @__PURE__ */ React.createElement("div", { style: {
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        textAlign: "center",
        paddingRight: 2,
        borderRight: "1px solid var(--hair-2)"
      } }, "ACT \u2212"), /* @__PURE__ */ React.createElement("div", { className: "cm-cell", style: { background: "rgba(232,160,49,0.08)", border: "1px solid rgba(232,160,49,0.3)" } }, /* @__PURE__ */ React.createElement("div", { className: "cm-lab" }, "FP \xB7 false alarm"), /* @__PURE__ */ React.createElement("div", { className: "cm-val", style: { color: "var(--amber)" } }, fp)), /* @__PURE__ */ React.createElement("div", { className: "cm-cell", style: { background: "rgba(20,18,22,0.04)", border: "1px solid var(--hair-2)" } }, /* @__PURE__ */ React.createElement("div", { className: "cm-lab" }, "TN \xB7 correct reject"), /* @__PURE__ */ React.createElement("div", { className: "cm-val" }, tn)))), /* @__PURE__ */ React.createElement("div", { className: "sim-plots" }, /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "sim-plot-head" }, "Score distribution", /* @__PURE__ */ React.createElement("span", { className: "hint" }, "upper band = positives \xB7 lower band = negatives \xB7 x = score")), /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, /* @__PURE__ */ React.createElement("line", { x1: "30", y1: "90", x2: W - 30, y2: "90", stroke: "#A49D9A", strokeWidth: "0.8" }), [0, 0.25, 0.5, 0.75, 1].map((v) => /* @__PURE__ */ React.createElement("g", { key: v }, /* @__PURE__ */ React.createElement("line", { x1: xMap(v), y1: "86", x2: xMap(v), y2: "94", stroke: "#A49D9A", strokeWidth: "0.6" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: xMap(v),
          y: "106",
          textAnchor: "middle",
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono', monospace"
        },
        v.toFixed(2)
      ))), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xMap(thr),
          y1: "10",
          x2: xMap(thr),
          y2: "170",
          stroke: "#141216",
          strokeWidth: "2"
        }
      ), /* @__PURE__ */ React.createElement(
        "rect",
        {
          x: xMap(thr) - 16,
          y: "4",
          width: "32",
          height: "14",
          rx: "3",
          fill: "#141216"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: xMap(thr),
          y: "14",
          textAnchor: "middle",
          fontSize: "10",
          fill: "#FBF8F1",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700"
        },
        "\u03C4=",
        thr.toFixed(2)
      ), /* @__PURE__ */ React.createElement(
        "rect",
        {
          x: xMap(thr),
          y: "20",
          width: xMap(1) - xMap(thr),
          height: "60",
          fill: "#5B3EE8",
          opacity: "0.05"
        }
      ), data.map((d, i) => {
        const pred = d.score >= thr;
        const isPos = d.label === 1;
        const baseY = isPos ? 20 + d.jy * 50 : 100 + d.jy * 50;
        const fill = isPos ? pred ? "#5B3EE8" : "#D83A3A" : pred ? "#E8A031" : "#1FAF7E";
        return /* @__PURE__ */ React.createElement(
          "circle",
          {
            key: i,
            cx: xMap(d.score),
            cy: baseY,
            r: "3.3",
            fill,
            opacity: "0.85",
            style: { transition: "fill 200ms" }
          }
        );
      }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "30",
          y: "18",
          fontSize: "10",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700"
        },
        "POSITIVES"
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "30",
          y: "124",
          fontSize: "10",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700"
        },
        "NEGATIVES"
      ))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "sim-plot-head" }, "ROC curve", /* @__PURE__ */ React.createElement("span", { className: "hint" }, "AUC \u2248 ", round(areaUnder(roc), 3))), /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 200 160" }, /* @__PURE__ */ React.createElement("rect", { x: "20", y: "10", width: "160", height: "130", fill: "none", stroke: "#A49D9A", strokeWidth: "0.6" }), /* @__PURE__ */ React.createElement("line", { x1: "20", y1: "140", x2: "180", y2: "10", stroke: "#A49D9A", strokeDasharray: "3 3", strokeWidth: "0.8" }), /* @__PURE__ */ React.createElement(
        "path",
        {
          d: "M " + roc.map(([x, y]) => `${20 + x * 160},${140 - y * 130}`).join(" L "),
          fill: "none",
          stroke: "#5B3EE8",
          strokeWidth: "1.8"
        }
      ), /* @__PURE__ */ React.createElement(
        "circle",
        {
          cx: 20 + fpr * 160,
          cy: 140 - tpr * 130,
          r: "6",
          fill: "none",
          stroke: "#E8318F",
          strokeWidth: "2"
        }
      ), /* @__PURE__ */ React.createElement(
        "circle",
        {
          cx: 20 + fpr * 160,
          cy: 140 - tpr * 130,
          r: "3.2",
          fill: "#E8318F"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "100",
          y: "158",
          textAnchor: "middle",
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono', monospace"
        },
        "FPR = ",
        fpr.toFixed(2)
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "10",
          y: "75",
          textAnchor: "middle",
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono', monospace",
          transform: "rotate(-90 10 75)"
        },
        "TPR = ",
        tpr.toFixed(2)
      )))))
    );
  }
  function areaUnder(roc) {
    let area = 0;
    for (let i = 1; i < roc.length; i++) {
      const [x1, y1] = roc[i - 1], [x2, y2] = roc[i];
      area += (x2 - x1) * (y1 + y2) / 2;
    }
    return Math.abs(area);
  }
  function Ch06_Evaluate() {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 06 \xB7 Evaluate",
        title: 'Pick the metric <em>before</em> <span class="accent">you pick the model.</span>',
        hook: "Accuracy is lazy. For fraud, cancer, churn, ads \u2014 <strong>precision, recall, or F1</strong>. Understand the tradeoff viscerally by sliding \u03C4.",
        meta: [{ k: "Read", v: "8 min" }, { k: "Focus", v: "Confusion \xB7 ROC \xB7 PR" }, { k: "Sims", v: "1 live sweep" }]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "06.1" }, "The confusion matrix"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Four cells. ", /* @__PURE__ */ React.createElement("em", null, "One thousand decisions.")), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Every classifier's output can be broken into four boxes: TP, FP, FN, TN. Every real metric \u2014 precision, recall, F1, ROC-AUC \u2014 is a ratio of these four."), /* @__PURE__ */ React.createElement(ThresholdSim, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "06.2" }, "Picking the right metric"), /* @__PURE__ */ React.createElement("ul", { className: "prose", style: { paddingLeft: 20 } }, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Fraud / cancer:"), " high cost of FN \u2192 prioritize ", /* @__PURE__ */ React.createElement("em", null, "recall"), "."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Spam filtering:"), " high cost of FP (flagging real mail) \u2192 prioritize ", /* @__PURE__ */ React.createElement("em", null, "precision"), "."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Balanced problem:"), " ", /* @__PURE__ */ React.createElement("em", null, "F1"), " or ", /* @__PURE__ */ React.createElement("em", null, "AUC"), " is fine."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Imbalanced (fraud at 0.1%):"), " ", /* @__PURE__ */ React.createElement("em", null, "PR-AUC"), " is more honest than ROC-AUC."))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      '<b>Reporting accuracy on imbalanced data.</b> Predict "not fraud" always \u2192 99.9% accuracy, zero utility.',
      "<b>Tuning on F1 but optimizing logloss.</b> Decide the metric upfront.",
      "<b>Default \u03C4=0.5.</b> Threshold should reflect your business cost ratio, not library defaults."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Metric = value judgement.</b> You're saying which mistake is worse.",
      "<b>Threshold is a lever, not a default.</b> Move it.",
      `<b>Calibration \u2260 accuracy.</b> A well-calibrated model's 0.7 means 70%, not just "higher than 0.5".`
    ] }));
  }
  window.Ch06_Evaluate = Ch06_Evaluate;
})();
