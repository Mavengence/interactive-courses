(() => {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  function DatasetExplorer() {
    const [strategy, setStrategy] = useState("none");
    const strategies = {
      none: { label: "None (raw)", fraudRatio: 17e-4, legit: 284315, fraud: 492 },
      smote: { label: "SMOTE (oversample)", fraudRatio: 0.5, legit: 284315, fraud: 284315 },
      undersample: { label: "Undersampling", fraudRatio: 0.5, legit: 492, fraud: 492 }
    };
    const s = strategies[strategy];
    const total = s.legit + s.fraud;
    const fraudPct = (s.fraud / total * 100).toFixed(2);
    const legitPct = (s.legit / total * 100).toFixed(2);
    const W = 380, H = 120;
    const legitW = clamp(s.legit / Math.max(total, 1) * W, 2, W - 2);
    const fraudW = clamp(s.fraud / Math.max(total, 1) * W, 2, W);
    const naiveAcc = (284315 / 284807 * 100).toFixed(2);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATOR",
        title: "Dataset explorer \u2014 class imbalance",
        meta: `Strategy: ${s.label}`,
        caption: "Real-world fraud datasets are severely imbalanced. A naive model predicting 'always legitimate' scores 99.83% accuracy \u2014 a useless metric here."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Sampling strategy"), Object.entries(strategies).map(([k, v]) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: k,
          onClick: () => setStrategy(k),
          style: {
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "8px 12px",
            marginBottom: 6,
            borderRadius: 6,
            background: strategy === k ? "var(--bg-hi)" : "transparent",
            border: strategy === k ? "1px solid var(--hair-2)" : "1px solid var(--hair)",
            color: strategy === k ? "var(--lime-ink)" : "var(--ink-3)",
            font: "inherit",
            fontSize: 12.5,
            cursor: "pointer"
          }
        },
        v.label
      ))), /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: 8,
        background: "rgba(209,255,58,0.07)",
        border: "1px solid rgba(209,255,58,0.15)"
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--lime-ink)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: 6
      } }, "Naive model"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 } }, "Predict all-legit \u2192 ", /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--ink-1)" } }, naiveAcc, "% accuracy"), /* @__PURE__ */ React.createElement("br", null), "Catches ", /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--coral-ink)" } }, "0 of 492 frauds")))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H + 60}`, style: { width: "100%" } }, /* @__PURE__ */ React.createElement("text", { x: "0", y: "18", fill: "var(--ink-3)", fontSize: "10", fontFamily: "'JetBrains Mono',monospace" }, "Legitimate"), /* @__PURE__ */ React.createElement(
        "rect",
        {
          x: "0",
          y: "24",
          width: legitW,
          height: "28",
          rx: "4",
          fill: "rgba(100,226,181,0.35)",
          stroke: "rgba(100,226,181,0.6)",
          strokeWidth: "1",
          style: { transition: "width 0.5s ease" }
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: Math.min(legitW + 4, W - 60),
          y: "43",
          fill: "var(--mint)",
          fontSize: "10",
          fontFamily: "'JetBrains Mono',monospace"
        },
        legitPct,
        "%"
      ), /* @__PURE__ */ React.createElement("text", { x: "0", y: "76", fill: "var(--ink-3)", fontSize: "10", fontFamily: "'JetBrains Mono',monospace" }, "Fraud"), /* @__PURE__ */ React.createElement(
        "rect",
        {
          x: "0",
          y: "82",
          width: fraudW,
          height: "28",
          rx: "4",
          fill: "rgba(255,107,128,0.35)",
          stroke: "rgba(255,107,128,0.6)",
          strokeWidth: "1",
          style: { transition: "width 0.5s ease" }
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: Math.min(fraudW + 4, W - 60),
          y: "101",
          fill: "#FF6B80",
          fontSize: "10",
          fontFamily: "'JetBrains Mono',monospace"
        },
        fraudPct,
        "%"
      ), /* @__PURE__ */ React.createElement("text", { x: "0", y: "148", fill: "var(--ink-4)", fontSize: "9.5", fontFamily: "'JetBrains Mono',monospace" }, "Legit: ", s.legit.toLocaleString(), "   Fraud: ", s.fraud.toLocaleString(), "   Total: ", total.toLocaleString())), strategy === "smote" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--mint-ink)" } }, "SMOTE:"), " Synthetic Minority Oversampling \u2014 interpolates new fraud samples between existing ones. Balanced dataset, but adds synthetic data risk."), strategy === "undersample" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--lime-ink)" } }, "Undersampling:"), " Drops majority class to match minority. Fast and clean, but discards 99.8% of your legitimate transaction data."), strategy === "none" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--ink-2)" } }, "Raw data:"), " 0.17% fraud rate. Use PR-AUC, not accuracy. Weight classes during training.")))
    );
  }
  const PIPELINE_STEPS = [
    {
      label: "Load & Inspect",
      icon: "\u{1F4E6}",
      log: [
        "> Loading creditcard.csv \u2026",
        "> Rows: 284,807  Columns: 31",
        "> Features: Time, V1-V28 (PCA), Amount, Class",
        "> Fraud transactions: 492 (0.172%)",
        "> No missing values detected.",
        "\u2713 Dataset loaded."
      ]
    },
    {
      label: "Feature Engineering",
      icon: "\u{1F527}",
      log: [
        "> V1\u2013V28: PCA-transformed (already anonymised)",
        "> Amount: raw transaction value in EUR",
        "> Time: seconds elapsed since first transaction",
        "> Adding: log1p(Amount) to reduce skew",
        "> Adding: hour_of_day from Time feature",
        "\u2713 Feature matrix shape: (284807, 33)"
      ]
    },
    {
      label: "Scale Amount & Time",
      icon: "\u2696\uFE0F",
      log: [
        "> StandardScaler on Amount and Time (not V1\u2013V28)",
        "> Amount mean: 88.35 \u2192 scaled: 0.00",
        "> Amount std:  250.12",
        "> Time mean:   94813 \u2192 scaled: 0.00",
        "> Scaler fitted on train split only (no leakage)",
        "\u2713 Scaling complete."
      ]
    },
    {
      label: "Train/Test Split",
      icon: "\u2702\uFE0F",
      log: [
        "> Stratified split: 80% train / 20% test",
        "> Train: 227,845 rows  (fraud: 394)",
        "> Test:   56,962 rows  (fraud:  98)",
        "> Fraud rate train: 0.173%  test: 0.172%",
        "> Stratification preserved class ratio \u2713",
        "\u2713 Split complete."
      ]
    },
    {
      label: "Fit XGBoost",
      icon: "\u{1F332}",
      log: [
        "> XGBClassifier(n_estimators=300, max_depth=6,",
        '    scale_pos_weight=578, eval_metric="aucpr")',
        "> Training \u2026",
        "> [100]  train-aucpr: 0.8812",
        "> [200]  train-aucpr: 0.9143",
        "> [300]  train-aucpr: 0.9271",
        "\u2713 Model fitted in 18.4s"
      ]
    },
    {
      label: "Evaluate",
      icon: "\u{1F4CA}",
      log: [
        "> Threshold: 0.30",
        "> Precision:  0.871",
        "> Recall:     0.918",
        "> F1:         0.894",
        "> PR-AUC:     0.934",
        "> ROC-AUC:    0.981",
        "\u2713 Model ready for threshold tuning."
      ]
    }
  ];
  function PipelineProgress() {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState(/* @__PURE__ */ new Set());
    const [logLines, setLogLines] = useState([]);
    const [running, setRunning] = useState(false);
    const logRef = useRef(null);
    const runStep = useCallback(() => {
      if (running) return;
      const step = PIPELINE_STEPS[currentStep];
      setRunning(true);
      setLogLines([]);
      let i = 0;
      const interval = setInterval(() => {
        if (i < step.log.length) {
          setLogLines((prev) => [...prev, step.log[i]]);
          i++;
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
        } else {
          clearInterval(interval);
          setCompletedSteps((prev) => /* @__PURE__ */ new Set([...prev, currentStep]));
          setRunning(false);
          if (currentStep < PIPELINE_STEPS.length - 1) setCurrentStep((c) => c + 1);
        }
      }, 200);
    }, [currentStep, running]);
    const reset = () => {
      setCurrentStep(0);
      setCompletedSteps(/* @__PURE__ */ new Set());
      setLogLines([]);
      setRunning(false);
    };
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATOR",
        title: "ML pipeline \u2014 step-by-step",
        meta: `Step ${currentStep + 1} / ${PIPELINE_STEPS.length}`,
        caption: "Each step is a real decision point. Run them in order \u2014 the output of each step feeds the next."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 170 } }, PIPELINE_STEPS.map((step, i) => {
        const done = completedSteps.has(i);
        const active = i === currentStep;
        return /* @__PURE__ */ React.createElement("div", { key: i, style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 6,
          background: active ? "var(--bg-hi)" : "transparent",
          border: active ? "1px solid var(--hair-2)" : "1px solid transparent"
        } }, /* @__PURE__ */ React.createElement("div", { style: {
          width: 22,
          height: 22,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          background: done ? "rgba(100,226,181,0.2)" : active ? "rgba(209,255,58,0.15)" : "rgba(255,255,255,0.05)",
          border: done ? "1px solid rgba(100,226,181,0.5)" : active ? "1px solid rgba(209,255,58,0.4)" : "1px solid var(--hair)",
          color: done ? "var(--mint)" : active ? "var(--lime)" : "var(--ink-4)"
        } }, done ? "\u2713" : i + 1), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: done ? "var(--mint)" : active ? "var(--ink-1)" : "var(--ink-4)" } }, step.label));
      })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { ref: logRef, style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.8,
        color: "#D8D3CC",
        background: "#17151C",
        borderRadius: 8,
        border: "1px solid var(--hair)",
        padding: "14px 16px",
        minHeight: 160,
        maxHeight: 200,
        overflowY: "auto"
      } }, logLines.length === 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#A39E98" } }, '// Click "Run step" to execute: ', PIPELINE_STEPS[currentStep].label), logLines.map((line, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
        color: line.startsWith("\u2713") ? "#64E2B5" : line.startsWith(">") ? "#D8D3CC" : "#9FE06B"
      } }, line)), running && /* @__PURE__ */ React.createElement("span", { style: { color: "#9FE06B", animation: "none" } }, "\u258B")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: runStep,
          disabled: running || completedSteps.size === PIPELINE_STEPS.length,
          style: {
            padding: "10px 22px",
            borderRadius: 7,
            cursor: running ? "wait" : "pointer",
            background: running ? "var(--bg-hi)" : "var(--lime)",
            color: "#000",
            border: "none",
            font: "inherit",
            fontSize: 13,
            fontWeight: 700,
            opacity: completedSteps.size === PIPELINE_STEPS.length ? 0.4 : 1
          }
        },
        running ? "Running\u2026" : completedSteps.size === PIPELINE_STEPS.length ? "Done \u2713" : `Run step ${currentStep + 1}`
      ), /* @__PURE__ */ React.createElement("button", { onClick: reset, style: {
        padding: "10px 18px",
        borderRadius: 7,
        cursor: "pointer",
        background: "transparent",
        color: "var(--ink-3)",
        border: "1px solid var(--hair)",
        font: "inherit",
        fontSize: 13
      } }, "Reset"))))
    );
  }
  function PrecisionRecallTradeoff() {
    const [threshold, setThreshold] = useState(0.3);
    const [missedFraudCost, setMissedFraudCost] = useState(500);
    const [falseAlertCost, setFalseAlertCost] = useState(20);
    const prCurve = useMemo(() => {
      const pts = [];
      for (let t = 0.01; t <= 0.99; t += 0.01) {
        const recall = Math.max(0, 1 - Math.pow(t, 0.6) * 0.98);
        const precision = Math.min(1, 0.05 + 0.95 * Math.pow(t, 0.25));
        pts.push({ t: round(t, 2), precision, recall });
      }
      return pts;
    }, []);
    const current = useMemo(() => {
      const closest = prCurve.reduce((best, p) => Math.abs(p.t - threshold) < Math.abs(best.t - threshold) ? p : best, prCurve[0]);
      const f1 = closest.precision + closest.recall > 0 ? 2 * closest.precision * closest.recall / (closest.precision + closest.recall) : 0;
      return { ...closest, f1 };
    }, [threshold, prCurve]);
    const totalFraudTxns = 492;
    const totalLegitTxns = 284315;
    const missedFraud = Math.round(totalFraudTxns * (1 - current.recall));
    const falseAlerts = Math.round(totalLegitTxns * (1 - current.precision) * current.recall);
    const totalCost = missedFraud * missedFraudCost + falseAlerts * falseAlertCost;
    const W = 300, H = 200;
    const px = (recall) => recall * W;
    const py = (precision) => H - precision * H;
    const pathD = prCurve.map(
      (p, i) => `${i === 0 ? "M" : "L"} ${px(p.recall).toFixed(1)} ${py(p.precision).toFixed(1)}`
    ).join(" ");
    const dotX = px(current.recall);
    const dotY = py(current.precision);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATOR",
        title: "Precision\u2013recall tradeoff",
        meta: `Threshold: ${threshold.toFixed(2)} \xB7 F1: ${round(current.f1, 3)}`,
        caption: "In fraud detection, a missed fraud costs far more than a false alarm. Choose your threshold based on business costs, not just F1."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row", style: { alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { className: "plot-wrap", style: { minWidth: 320 } }, /* @__PURE__ */ React.createElement("svg", { viewBox: `-24 -10 ${W + 40} ${H + 34}`, style: { width: "100%" } }, /* @__PURE__ */ React.createElement("line", { x1: "0", y1: "0", x2: "0", y2: H, stroke: "var(--hair-2)", strokeWidth: "1" }), /* @__PURE__ */ React.createElement("line", { x1: "0", y1: H, x2: W, y2: H, stroke: "var(--hair-2)", strokeWidth: "1" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: W / 2,
          y: H + 22,
          textAnchor: "middle",
          fill: "var(--ink-4)",
          fontSize: "9",
          fontFamily: "'JetBrains Mono',monospace"
        },
        "Recall"
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "-16",
          y: H / 2,
          textAnchor: "middle",
          fill: "var(--ink-4)",
          fontSize: "9",
          fontFamily: "'JetBrains Mono',monospace",
          transform: `rotate(-90, -16, ${H / 2})`
        },
        "Precision"
      ), [0, 0.5, 1].map((v) => /* @__PURE__ */ React.createElement("g", { key: v }, /* @__PURE__ */ React.createElement(
        "text",
        {
          x: px(v),
          y: H + 12,
          textAnchor: "middle",
          fill: "var(--ink-4)",
          fontSize: "8",
          fontFamily: "'JetBrains Mono',monospace"
        },
        v
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "-4",
          y: py(v) + 3,
          textAnchor: "end",
          fill: "var(--ink-4)",
          fontSize: "8",
          fontFamily: "'JetBrains Mono',monospace"
        },
        v
      ))), /* @__PURE__ */ React.createElement("path", { d: pathD, stroke: "var(--lime)", strokeWidth: "2", fill: "none", opacity: "0.8" }), /* @__PURE__ */ React.createElement("circle", { cx: dotX, cy: dotY, r: "6", fill: "var(--lime)", opacity: "0.9" }), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: dotX,
          y1: dotY,
          x2: dotX,
          y2: H,
          stroke: "var(--lime)",
          strokeWidth: "1",
          strokeDasharray: "3 3",
          opacity: "0.5"
        }
      ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14, flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Decision threshold \xA0", /* @__PURE__ */ React.createElement("span", { className: "mono" }, threshold.toFixed(2))), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0.05",
          max: "0.95",
          step: "0.01",
          "aria-label": "Decision threshold",
          value: threshold,
          onChange: (e) => setThreshold(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 } }, [
        { k: "Precision", v: round(current.precision, 3), color: "var(--mint-ink)" },
        { k: "Recall", v: round(current.recall, 3), color: "var(--coral-ink)" },
        { k: "F1", v: round(current.f1, 3), color: "var(--lime-ink)" }
      ].map((m) => /* @__PURE__ */ React.createElement("div", { key: m.k, style: {
        padding: "10px 12px",
        borderRadius: 7,
        background: "var(--bg-hi)",
        border: "1px solid var(--hair)",
        textAlign: "center"
      } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        color: "var(--ink-4)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 4
      } }, m.k), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: m.color } }, m.v)))), /* @__PURE__ */ React.createElement("div", { style: { background: "var(--panel-hi)", borderRadius: 8, border: "1px solid var(--hair-2)", padding: "12px 14px" } }, /* @__PURE__ */ React.createElement("div", { style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--lime-ink)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: 10
      } }, "Business cost calculator"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl", style: { margin: 0 } }, /* @__PURE__ */ React.createElement("label", null, "Cost / missed fraud ($)", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "mono" }, "$", missedFraudCost)), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "50",
          max: "2000",
          step: "50",
          "aria-label": "Cost per missed fraud in dollars",
          value: missedFraudCost,
          onChange: (e) => setMissedFraudCost(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl", style: { margin: 0 } }, /* @__PURE__ */ React.createElement("label", null, "Cost / false alert ($)", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "mono" }, "$", falseAlertCost)), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "1",
          max: "200",
          step: "1",
          "aria-label": "Cost per false alert in dollars",
          value: falseAlertCost,
          onChange: (e) => setFalseAlertCost(+e.target.value)
        }
      ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "var(--ink-3)" } }, "Missed frauds", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--coral-ink)", fontSize: 16 } }, missedFraud)), /* @__PURE__ */ React.createElement("div", { style: { color: "var(--ink-3)" } }, "False alerts", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--ink-2)", fontSize: 16 } }, falseAlerts.toLocaleString())), /* @__PURE__ */ React.createElement("div", { style: { color: "var(--ink-3)" } }, "Total cost", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--lime-ink)", fontSize: 16 } }, "$", totalCost.toLocaleString())))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 } }, threshold <= 0.25 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--coral-ink)" } }, "Low threshold:"), " Catches most fraud but flags many legitimate transactions. High operational cost."), threshold > 0.25 && threshold <= 0.45 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--lime-ink)" } }, "Sweet spot (0.25\u20130.45):"), " Threshold ", threshold.toFixed(2), " catches ~", round(current.recall * 100, 0), "% of fraud with manageable false-positive rate."), threshold > 0.45 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--mint-ink)" } }, "High threshold:"), " Very precise \u2014 catches only the most obvious fraud. Misses edge cases."))))
    );
  }
  const CHECKLIST_ITEMS = [
    { id: "model_card", label: "Model card written", desc: "Document intended use, limitations, training data, and known failure modes." },
    { id: "fairness", label: "Fairness audit done", desc: "Check fraud flag rates across demographic segments. Disparate impact threshold: 0.8 ratio." },
    { id: "drift", label: "Feature drift monitoring set up", desc: "PSI or KS test on V1\u2013V28 distributions weekly. Alert at PSI > 0.2." },
    { id: "champion", label: "Champion/challenger pipeline", desc: "New model trained in shadow; replaces champion only if PR-AUC lifts by \u2265 0.5pp." },
    { id: "rollback", label: "Rollback plan documented", desc: "One-command revert to prior model version. Test it in staging before going live." },
    { id: "sla", label: "SLA defined", desc: "Scoring latency p99 < 50ms. Batch inference: 100k txns in < 2 minutes." },
    { id: "alerts", label: "Alert thresholds set", desc: "PagerDuty alert if: PR-AUC drops < 0.85, daily fraud flag rate changes > 30%, or scoring errors > 0.1%." },
    { id: "shadow", label: "Shadow mode first (2 weeks)", desc: "Log predictions without acting on them. Verify distribution matches expectations before live routing." }
  ];
  function PostDeployChecklist() {
    const [checked, setChecked] = useState(/* @__PURE__ */ new Set());
    const [expanded, setExpanded] = useState(null);
    const toggle = (id) => setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    const pct = Math.round(checked.size / CHECKLIST_ITEMS.length * 100);
    const barColor = pct === 100 ? "var(--mint-ink)" : pct >= 50 ? "var(--lime-ink)" : "var(--coral-ink)";
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATOR",
        title: "Production readiness checklist",
        meta: `${checked.size} / ${CHECKLIST_ITEMS.length} complete`,
        caption: "No model should go live without clearing every item. Each checkbox is a class of production failure you're explicitly ruling out."
      },
      /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" } }, "Readiness"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11, color: barColor, fontWeight: 700 } }, pct, "%", pct === 100 ? " \u2014 ship it." : "")), /* @__PURE__ */ React.createElement("div", { style: { height: 6, background: "var(--bg-hi)", borderRadius: 3 } }, /* @__PURE__ */ React.createElement("div", { style: {
        height: "100%",
        borderRadius: 3,
        width: `${pct}%`,
        background: barColor,
        transition: "width 0.4s ease, background 0.3s ease"
      } }))),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, CHECKLIST_ITEMS.map((item) => {
        const done = checked.has(item.id);
        const open = expanded === item.id;
        return /* @__PURE__ */ React.createElement("div", { key: item.id, style: {
          borderRadius: 8,
          border: done ? "1px solid rgba(100,226,181,0.35)" : "1px solid var(--hair)",
          background: done ? "rgba(100,226,181,0.07)" : "var(--bg-hi)",
          overflow: "hidden",
          transition: "border-color 0.2s, background 0.2s"
        } }, /* @__PURE__ */ React.createElement(
          "div",
          {
            style: { display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", cursor: "pointer" },
            onClick: () => setExpanded(open ? null : item.id)
          },
          /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "checkbox",
              checked: done,
              onChange: () => toggle(item.id),
              onClick: (e) => e.stopPropagation(),
              style: { width: 16, height: 16, cursor: "pointer", accentColor: "var(--mint)" }
            }
          ),
          /* @__PURE__ */ React.createElement("span", { style: {
            flex: 1,
            fontSize: 13.5,
            color: done ? "var(--mint)" : "var(--ink-1)",
            textDecoration: done ? "line-through" : "none",
            transition: "color 0.2s"
          } }, item.label),
          /* @__PURE__ */ React.createElement("span", { style: { color: "var(--ink-4)", fontSize: 12 } }, open ? "\u25B2" : "\u25BC")
        ), open && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 14px 12px 42px", fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.6 } }, item.desc));
      }))
    );
  }
  function Ch12_Capstone({ goTo }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 12 \xB7 Capstone",
        title: '<em>Credit card fraud detection:</em> <span class="accent">the full DS loop.</span>',
        hook: "284,807 transactions. 0.17% fraud. One complete walkthrough \u2014 from raw data to a model in production. Every chapter earns its place here.",
        meta: [
          { k: "Dataset", v: "Kaggle \xB7 284K transactions" },
          { k: "Target", v: "Fraud \xB7 0.17% base rate" },
          { k: "Sims", v: "4 interactive" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "12.1" }, "The data \u2014 and why it's hard"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "284,807 transactions. 492 frauds. An 578:1 class imbalance."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "The Kaggle Credit Card Fraud dataset is a classic of applied ML \u2014 not because it's clean, but because it ", /* @__PURE__ */ React.createElement("em", null, "isn't"), ". The imbalance is so extreme that the naive baseline (predict everything as legitimate) achieves ", /* @__PURE__ */ React.createElement("strong", null, "99.83% accuracy"), "while catching zero fraud. Accuracy is the wrong metric. The right one is PR-AUC."), /* @__PURE__ */ React.createElement(DatasetExplorer, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "12.2" }, "The pipeline \u2014 step by step"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Six decisions. Each one a chapter in this course."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Run each pipeline step in order. The output of one becomes the input of the next. Watch the log. Notice where leakage could enter (scaling before the split is the classic mistake \u2014 we prevent it here)."), /* @__PURE__ */ React.createElement(PipelineProgress, null)), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Fitting the scaler on the full dataset.</b> Scaler must be fit on train only, then applied to test. Fitting on all data leaks test statistics into training.",
      "<b>Stratifying after scaling.</b> Split first, scale after. Order matters.",
      "<b>Using accuracy as the metric.</b> On a 0.17% fraud rate, accuracy is meaningless. Use PR-AUC or F1 at a chosen threshold.",
      "<b>Ignoring class_weight / scale_pos_weight.</b> Without reweighting, the model learns to ignore fraud entirely."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Split \u2192 Scale \u2192 Fit.</b> Never fit a preprocessor before the split.",
      "<b>Use scale_pos_weight = N_legit / N_fraud.</b> Tells XGBoost the relative importance of the minority class.",
      "<b>Optimise PR-AUC, then choose threshold by cost.</b> The curve is the product; the threshold is the business decision.",
      "<b>Log every experiment.</b> MLflow or wandb. You will forget what you tried."
    ] }), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "12.3" }, "Precision\u2013recall tradeoff \u2014 choose your threshold"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "The threshold is a business decision, not a ML decision."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Every fraud model produces a probability score per transaction. You decide the cutoff. Too low: you flag half your legitimate customers as fraudsters (ops cost explodes). Too high: you miss real fraud (revenue loss and reputational damage).", /* @__PURE__ */ React.createElement("strong", null, " Use the cost calculator to find your break-even threshold.")), /* @__PURE__ */ React.createElement(PrecisionRecallTradeoff, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "12.4" }, "Shipping to production \u2014 the checklist"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "A model in a notebook is a demo. A model in prod is an engineering system."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Before your fraud model touches a single live transaction, eight things must be true. Work through the checklist. Each item represents a class of production failure you have explicitly eliminated."), /* @__PURE__ */ React.createElement(PostDeployChecklist, null)), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Skipping shadow mode.</b> The first time you see a model's live distribution should never be in production.",
      "<b>No model card.</b> Without documentation, the next engineer (or regulator) has no idea what the model was designed for.",
      "<b>No drift monitor.</b> Fraud patterns shift \u2014 card skimming, online fraud, pandemic spending. Models stale faster than you think.",
      "<b>One threshold forever.</b> Business costs change. Revisit the threshold quarterly at minimum."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Shadow first, always.</b> Two weeks of shadow mode catches training\u2013serving skew before it harms users.",
      "<b>Champion/challenger every sprint.</b> Always have a challenger in shadow. Replace only on measurable lift.",
      "<b>Tie your alert threshold to business cost, not arbitrary quantiles.</b>",
      "<b>Model cards are compliance.</b> EU AI Act Art. 13 requires transparency documentation for high-risk systems."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Imbalance is the rule, not the exception.</b> PR-AUC over accuracy. Always.",
      "<b>The pipeline order is sacrosanct.</b> Split \u2192 scale \u2192 fit. Leakage is silent \u2014 it only shows up in prod.",
      "<b>The threshold is a business decision.</b> Minimise expected cost, not F1.",
      "<b>Production is a system, not a model.</b> Monitoring, rollback, drift alerts \u2014 the model is 20% of the work.",
      "<b>The loop never ends.</b> Retrain cadence, new features, new fraud patterns. Ship. Monitor. Iterate."
    ] }), /* @__PURE__ */ React.createElement("div", { className: "ov-cta-band", style: { marginTop: 40 } }, /* @__PURE__ */ React.createElement("div", { className: "ov-cta-eyebrow" }, "You've reached the end."), /* @__PURE__ */ React.createElement("div", { className: "ov-cta-title" }, "Go build something."), /* @__PURE__ */ React.createElement("div", { className: "ov-cta-sub" }, "Pick one real dataset. Run the full loop. Ship a v1. Come back and iterate. The fastest way to learn data science is to ", /* @__PURE__ */ React.createElement("em", null, "do"), " it on a problem you care about."), /* @__PURE__ */ React.createElement("div", { className: "ov-cta-row" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary ov-cta-btn", onClick: () => goTo && goTo("home") }, "Back to the overview \xA0\u21BA"))));
  }
  window.Ch12_Capstone = Ch12_Capstone;
})();
