(() => {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  function DistributionExplorer() {
    const [shape, setShape] = useState("normal");
    const [n, setN] = useState(500);
    const [bins, setBins] = useState(30);
    const W = 480, H = 260;
    const PADL = 30, PADR = 12, PADT = 16, PADB = 28;
    const plotW = W - PADL - PADR;
    const plotH = H - PADT - PADB;
    const data = useMemo(() => {
      const rng = mulberry32(shape.charCodeAt(0) * 17 + n);
      const pts = [];
      for (let i = 0; i < n; i++) {
        let v;
        if (shape === "normal") v = randn(rng);
        else if (shape === "skewed") {
          v = Math.exp(0.6 * randn(rng)) - 1.2;
        } else if (shape === "bimodal") {
          v = rng() < 0.5 ? randn(rng) - 2.2 : randn(rng) + 2.2;
        } else {
          v = (rng() - 0.5) * 6;
        }
        pts.push(v);
      }
      return pts;
    }, [shape, n]);
    const stats = useMemo(() => {
      const sorted = [...data].sort((a, b) => a - b);
      const mean = data.reduce((s, v) => s + v, 0) / data.length;
      const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];
      const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length;
      const sd = Math.sqrt(variance);
      const skewness = data.reduce((s, v) => s + ((v - mean) / sd) ** 3, 0) / data.length;
      const kurtosis = data.reduce((s, v) => s + ((v - mean) / sd) ** 4, 0) / data.length - 3;
      const min = sorted[0], max = sorted[sorted.length - 1];
      return { mean, median, sd, skewness, kurtosis, min, max, sorted };
    }, [data]);
    const histogram = useMemo(() => {
      const { min, max } = stats;
      const bw = (max - min) / bins;
      const counts = new Array(bins).fill(0);
      data.forEach((v) => {
        const idx = Math.min(Math.floor((v - min) / bw), bins - 1);
        counts[idx]++;
      });
      return { counts, bw, min, max };
    }, [data, bins, stats]);
    const modeCenter = useMemo(() => {
      const maxIdx = histogram.counts.indexOf(Math.max(...histogram.counts));
      return histogram.min + (maxIdx + 0.5) * histogram.bw;
    }, [histogram]);
    const xScale = (v) => PADL + (v - histogram.min) / (histogram.max - histogram.min) * plotW;
    const maxCount = Math.max(...histogram.counts);
    const yScale = (count) => PADT + plotH - count / maxCount * plotH;
    const barW = plotW / bins;
    const meanX = xScale(stats.mean);
    const medianX = xScale(stats.median);
    const modeX = xScale(modeCenter);
    const SHAPES = ["normal", "skewed", "bimodal", "uniform"];
    const NS = [50, 500, 5e3];
    const skewLabel = (s) => Math.abs(s) < 0.3 ? "symmetric" : s > 0 ? "right-skewed" : "left-skewed";
    const kurtLabel = (k) => k > 1 ? "leptokurtic (heavy tails)" : k < -1 ? "platykurtic (light tails)" : "mesokurtic (normal)";
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATOR",
        title: "Distribution Explorer",
        meta: "shape \xB7 N \xB7 bins",
        caption: "Mean (purple), median (teal), mode (orange). Skewness and excess kurtosis shown below."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Shape"), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl-row", style: { flexWrap: "wrap", gap: 4 } }, SHAPES.map((s) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: s,
          className: `btn btn-sm${shape === s ? " active" : ""}`,
          onClick: () => setShape(s)
        },
        s
      )))), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "N ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, n)), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl-row", style: { gap: 4 } }, NS.map((v) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: v,
          className: `btn btn-sm${n === v ? " active" : ""}`,
          onClick: () => setN(v)
        },
        v
      )))), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Bins ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, bins)), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "10",
          max: "60",
          step: "1",
          value: bins,
          "aria-label": "Number of histogram bins",
          onChange: (e) => setBins(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-stats" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Mean"), /* @__PURE__ */ React.createElement("div", { className: "v mono" }, round(stats.mean, 3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Median"), /* @__PURE__ */ React.createElement("div", { className: "v mono" }, round(stats.median, 3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "SD"), /* @__PURE__ */ React.createElement("div", { className: "v mono" }, round(stats.sd, 3))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Skew"), /* @__PURE__ */ React.createElement("div", { className: "v mono" }, round(stats.skewness, 2))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Kurt"), /* @__PURE__ */ React.createElement("div", { className: "v mono" }, round(stats.kurtosis, 2)))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, opacity: 0.5, lineHeight: 1.4, marginTop: 4 } }, skewLabel(stats.skewness), /* @__PURE__ */ React.createElement("br", null), kurtLabel(stats.kurtosis))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: PADL,
          y1: PADT + plotH,
          x2: PADL + plotW,
          y2: PADT + plotH,
          stroke: "rgba(244,242,236,0.15)",
          strokeWidth: "1"
        }
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: PADL,
          y1: PADT,
          x2: PADL,
          y2: PADT + plotH,
          stroke: "rgba(244,242,236,0.15)",
          strokeWidth: "1"
        }
      ), histogram.counts.map((c, i) => {
        const bx = PADL + i * barW;
        const bh = c / maxCount * plotH;
        const by = PADT + plotH - bh;
        return /* @__PURE__ */ React.createElement(
          "rect",
          {
            key: i,
            x: bx + 0.5,
            y: by,
            width: Math.max(barW - 1, 1),
            height: bh,
            fill: "#5B3EE8",
            opacity: "0.7",
            rx: "1"
          }
        );
      }), meanX > PADL && meanX < PADL + plotW && /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: meanX,
          y1: PADT,
          x2: meanX,
          y2: PADT + plotH,
          stroke: "#A78BFA",
          strokeWidth: "1.5",
          strokeDasharray: "4 2"
        }
      ), medianX > PADL && medianX < PADL + plotW && /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: medianX,
          y1: PADT,
          x2: medianX,
          y2: PADT + plotH,
          stroke: "#2DD4BF",
          strokeWidth: "1.5",
          strokeDasharray: "4 2"
        }
      ), modeX > PADL && modeX < PADL + plotW && /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: modeX,
          y1: PADT,
          x2: modeX,
          y2: PADT + plotH,
          stroke: "#FB923C",
          strokeWidth: "1.5",
          strokeDasharray: "4 2"
        }
      ), /* @__PURE__ */ React.createElement("circle", { cx: PADL + 8, cy: PADT + 8, r: 4, fill: "#A78BFA" }), /* @__PURE__ */ React.createElement("text", { x: PADL + 16, y: PADT + 12, fill: "#A78BFA", fontSize: "9" }, "mean"), /* @__PURE__ */ React.createElement("circle", { cx: PADL + 52, cy: PADT + 8, r: 4, fill: "#2DD4BF" }), /* @__PURE__ */ React.createElement("text", { x: PADL + 60, y: PADT + 12, fill: "#2DD4BF", fontSize: "9" }, "median"), /* @__PURE__ */ React.createElement("circle", { cx: PADL + 104, cy: PADT + 8, r: 4, fill: "#FB923C" }), /* @__PURE__ */ React.createElement("text", { x: PADL + 112, y: PADT + 12, fill: "#FB923C", fontSize: "9" }, "mode"), [0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const val = histogram.min + frac * (histogram.max - histogram.min);
        const tx = PADL + frac * plotW;
        return /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement(
          "line",
          {
            x1: tx,
            y1: PADT + plotH,
            x2: tx,
            y2: PADT + plotH + 4,
            stroke: "rgba(244,242,236,0.25)",
            strokeWidth: "1"
          }
        ), /* @__PURE__ */ React.createElement(
          "text",
          {
            x: tx,
            y: H - 4,
            textAnchor: "middle",
            fill: "rgba(244,242,236,0.4)",
            fontSize: "8"
          },
          round(val, 1)
        ));
      }))))
    );
  }
  function OutlierDetector() {
    var _a, _b;
    const [method, setMethod] = useState("zscore");
    const W = 380, H = 260;
    const PADL = 28, PADR = 12, PADT = 16, PADB = 28;
    const plotW = W - PADL - PADR;
    const plotH = H - PADT - PADB;
    const { points, meanX, sdX, meanY, sdY, q1X, q3X, q1Y, q3Y } = useMemo(() => {
      const rng = mulberry32(99);
      const rawX = [], rawY = [];
      for (let i = 0; i < 44; i++) {
        rawX.push(randn(rng) * 1);
        rawY.push(randn(rng) * 1);
      }
      const outlierCoords = [
        [4.1, 0.3],
        [-3.8, 0.5],
        [0.2, 4.2],
        [3.5, 3.5],
        [-3, -3.2],
        [0.5, -4.5]
      ];
      outlierCoords.forEach(([ox, oy]) => {
        rawX.push(ox);
        rawY.push(oy);
      });
      const meanX2 = rawX.reduce((s, v) => s + v, 0) / rawX.length;
      const meanY2 = rawY.reduce((s, v) => s + v, 0) / rawY.length;
      const sdX2 = Math.sqrt(rawX.reduce((s, v) => s + (v - meanX2) ** 2, 0) / rawX.length);
      const sdY2 = Math.sqrt(rawY.reduce((s, v) => s + (v - meanY2) ** 2, 0) / rawY.length);
      const sortedX = [...rawX].sort((a, b) => a - b);
      const sortedY = [...rawY].sort((a, b) => a - b);
      const q1X2 = sortedX[Math.floor(sortedX.length * 0.25)];
      const q3X2 = sortedX[Math.floor(sortedX.length * 0.75)];
      const q1Y2 = sortedY[Math.floor(sortedY.length * 0.25)];
      const q3Y2 = sortedY[Math.floor(sortedY.length * 0.75)];
      const points2 = rawX.map((x, i) => ({ x, y: rawY[i], isOutlier: i >= 44 }));
      return { points: points2, meanX: meanX2, sdX: sdX2, meanY: meanY2, sdY: sdY2, q1X: q1X2, q3X: q3X2, q1Y: q1Y2, q3Y: q3Y2 };
    }, []);
    const flagged = useMemo(() => {
      return points.map((p) => {
        if (method === "zscore") {
          const zx = Math.abs((p.x - meanX) / sdX);
          const zy = Math.abs((p.y - meanY) / sdY);
          return zx > 3 || zy > 3;
        }
        if (method === "iqr") {
          const iqrX = q3X - q1X, iqrY = q3Y - q1Y;
          const outX = p.x < q1X - 1.5 * iqrX || p.x > q3X + 1.5 * iqrX;
          const outY = p.y < q1Y - 1.5 * iqrY || p.y > q3Y + 1.5 * iqrY;
          return outX || outY;
        }
        const dist = Math.sqrt((p.x - meanX) ** 2 + (p.y - meanY) ** 2);
        return dist > 3.2;
      });
    }, [method, points, meanX, sdX, meanY, sdY, q1X, q3X, q1Y, q3Y]);
    const numFlagged = flagged.filter(Boolean).length;
    const xMin = -5.5, xMax = 5.5, yMin = -5.5, yMax = 5.5;
    const px = (v) => PADL + (v - xMin) / (xMax - xMin) * plotW;
    const py = (v) => PADT + plotH - (v - yMin) / (yMax - yMin) * plotH;
    const METHODS = [
      { id: "zscore", label: "Z-score", desc: "Flag points more than 3 standard deviations from the mean. Fast and interpretable, but assumes normality." },
      { id: "iqr", label: "IQR", desc: "Flag points beyond 1.5 \xD7 IQR from the quartiles (Tukey fences). Robust to skew; no normality assumption." },
      { id: "isoforest", label: "Isolation Forest", desc: "Isolates anomalies by random partitioning. Points that require fewer splits are anomalies. Works in high dimensions." }
    ];
    const activeDesc = (_b = (_a = METHODS.find((m) => m.id === method)) == null ? void 0 : _a.desc) != null ? _b : "";
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATOR",
        title: "Outlier Detector",
        meta: "toggle method \u2192 see highlights",
        caption: `Flagged: ${numFlagged} / ${points.length} points.  ${activeDesc}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Method"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, METHODS.map((m) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: m.id,
          className: `btn btn-sm${method === m.id ? " active" : ""}`,
          onClick: () => setMethod(m.id),
          style: { textAlign: "left" }
        },
        m.label
      )))), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Flagged"), /* @__PURE__ */ React.createElement("div", { className: "v mono", style: { color: "var(--coral-ink)" } }, numFlagged)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Clean"), /* @__PURE__ */ React.createElement("div", { className: "v mono", style: { color: "var(--good-ink)" } }, points.length - numFlagged))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: "#4ADE80", display: "inline-block" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, opacity: 0.6 } }, "inlier")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: "#F87171", display: "inline-block" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, opacity: 0.6 } }, "flagged outlier")))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: px(0),
          y1: PADT,
          x2: px(0),
          y2: PADT + plotH,
          stroke: "rgba(244,242,236,0.08)",
          strokeWidth: "1"
        }
      ), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: PADL,
          y1: py(0),
          x2: PADL + plotW,
          y2: py(0),
          stroke: "rgba(244,242,236,0.08)",
          strokeWidth: "1"
        }
      ), method === "zscore" && /* @__PURE__ */ React.createElement(
        "ellipse",
        {
          cx: px(meanX),
          cy: py(meanY),
          rx: 3 * sdX / (xMax - xMin) * plotW,
          ry: 3 * sdY / (yMax - yMin) * plotH,
          fill: "none",
          stroke: "#A78BFA",
          strokeWidth: "1",
          strokeDasharray: "5 3",
          opacity: "0.4"
        }
      ), method === "iqr" && (() => {
        const iqrX = q3X - q1X, iqrY = q3Y - q1Y;
        const lx = px(q1X - 1.5 * iqrX), rx = px(q3X + 1.5 * iqrX);
        const ty = py(q3Y + 1.5 * iqrY), by = py(q1Y - 1.5 * iqrY);
        return /* @__PURE__ */ React.createElement(
          "rect",
          {
            x: lx,
            y: ty,
            width: rx - lx,
            height: by - ty,
            fill: "none",
            stroke: "#FBBF24",
            strokeWidth: "1",
            strokeDasharray: "5 3",
            opacity: "0.4"
          }
        );
      })(), points.map((p, i) => /* @__PURE__ */ React.createElement(
        "circle",
        {
          key: i,
          cx: px(p.x),
          cy: py(p.y),
          r: flagged[i] ? 5 : 3.5,
          fill: flagged[i] ? "#F87171" : "#4ADE80",
          opacity: flagged[i] ? 0.95 : 0.65,
          style: { transition: "fill 0.3s, r 0.3s" }
        }
      )), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: PADL + plotW / 2,
          y: H - 4,
          textAnchor: "middle",
          fill: "rgba(244,242,236,0.3)",
          fontSize: "8"
        },
        "Feature X"
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: 8,
          y: PADT + plotH / 2,
          textAnchor: "middle",
          fill: "rgba(244,242,236,0.3)",
          fontSize: "8",
          transform: `rotate(-90,8,${PADT + plotH / 2})`
        },
        "Feature Y"
      ))))
    );
  }
  function CorrelationMatrix() {
    const [noise, setNoise] = useState(0);
    const VARS = ["Age", "Income", "Score", "Satisf."];
    const N_VARS = 4;
    const N_OBS = 300;
    const TRUE_CORR = [
      [1, 0.65, -0.2, 0.1],
      [0.65, 1, 0.4, 0.55],
      [-0.2, 0.4, 1, 0.7],
      [0.1, 0.55, 0.7, 1]
    ];
    const computedCorr = useMemo(() => {
      const rng = mulberry32(42 + Math.round(noise * 100));
      const raw = Array.from({ length: N_VARS }, () => []);
      for (let i = 0; i < N_OBS; i++) {
        const z = Array.from({ length: N_VARS }, () => randn(rng));
        const noiseFactor = noise;
        const age = z[0];
        const income = TRUE_CORR[0][1] * (1 - noiseFactor) * z[0] + Math.sqrt(1 - (TRUE_CORR[0][1] * (1 - noiseFactor)) ** 2) * z[1];
        const score = TRUE_CORR[0][2] * (1 - noiseFactor) * z[0] + TRUE_CORR[1][2] * (1 - noiseFactor) * z[1] * 0.5 + Math.sqrt(0.5) * z[2];
        const sat = TRUE_CORR[0][3] * (1 - noiseFactor) * z[0] + TRUE_CORR[1][3] * (1 - noiseFactor) * z[1] * 0.5 + TRUE_CORR[2][3] * (1 - noiseFactor) * z[2] * 0.5 + Math.sqrt(0.3) * z[3];
        raw[0].push(age);
        raw[1].push(income);
        raw[2].push(score);
        raw[3].push(sat);
      }
      const means = raw.map((col) => col.reduce((s, v) => s + v, 0) / N_OBS);
      const sds = raw.map((col, ci) => Math.sqrt(col.reduce((s, v) => s + (v - means[ci]) ** 2, 0) / N_OBS));
      const mat = Array.from(
        { length: N_VARS },
        (_, i) => Array.from({ length: N_VARS }, (_2, j) => {
          if (i === j) return 1;
          const cov = raw[i].reduce((s, v, k) => s + (v - means[i]) * (raw[j][k] - means[j]), 0) / N_OBS;
          return round(cov / (sds[i] * sds[j]), 2);
        })
      );
      return mat;
    }, [noise]);
    const corrColor = (r) => {
      if (r >= 0) {
        const t = r;
        const rb = Math.round(lerp(30, 91, 1 - t));
        const gb = Math.round(lerp(30, 62, 1 - t));
        const bb = Math.round(lerp(30, 232, 1 - t));
        return `rgb(${rb},${gb},${bb})`;
      } else {
        const t = -r;
        const rr = Math.round(lerp(30, 239, 1 - t));
        const gr = Math.round(lerp(30, 68, 1 - t));
        const br = Math.round(lerp(30, 68, 1 - t));
        return `rgb(${rr},${gr},${br})`;
      }
    };
    const CELL = 72;
    const LABEL_W = 52;
    const SVG_W = LABEL_W + N_VARS * CELL + 8;
    const SVG_H = LABEL_W + N_VARS * CELL + 8;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "SIMULATOR",
        title: "Correlation Matrix",
        meta: "drag noise \u2192 watch r decay",
        caption: "Pearson r per cell. Blue = positive, red = negative. Drag noise to simulate measurement error."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row" }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Noise ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, round(noise, 2))), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "1",
          step: "0.01",
          value: noise,
          "aria-label": "Noise level",
          onChange: (e) => setNoise(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, opacity: 0.5, lineHeight: 1.6, marginTop: 8 } }, "0 = true structure", /* @__PURE__ */ React.createElement("br", null), "1 = pure noise", /* @__PURE__ */ React.createElement("br", null), "Watch r shrink toward 0."), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Max |r|"), /* @__PURE__ */ React.createElement("div", { className: "v mono" }, round(Math.max(...computedCorr.flatMap((row, i) => row.map((v, j) => i !== j ? Math.abs(v) : 0))), 2))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Strong pairs"), /* @__PURE__ */ React.createElement("div", { className: "v mono" }, computedCorr.flatMap((row, i) => row.map((v, j) => i < j && Math.abs(v) >= 0.5 ? 1 : 0)).reduce((a, b) => a + b, 0)))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, opacity: 0.4, marginBottom: 4 } }, "Color scale"), /* @__PURE__ */ React.createElement("svg", { width: 80, height: 14 }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "corrGrad", x1: "0", x2: "1", y1: "0", y2: "0" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "rgb(239,68,68)" }), /* @__PURE__ */ React.createElement("stop", { offset: "50%", stopColor: "rgb(30,30,30)" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "rgb(91,62,232)" }))), /* @__PURE__ */ React.createElement("rect", { x: 0, y: 0, width: 80, height: 10, fill: "url(#corrGrad)", rx: 2 }), /* @__PURE__ */ React.createElement("text", { x: 0, y: 14, fill: "rgba(244,242,236,0.4)", fontSize: "7" }, "\u22121"), /* @__PURE__ */ React.createElement("text", { x: 34, y: 14, fill: "rgba(244,242,236,0.4)", fontSize: "7" }, "0"), /* @__PURE__ */ React.createElement("text", { x: 68, y: 14, fill: "rgba(244,242,236,0.4)", fontSize: "7" }, "+1")))), /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${SVG_W} ${SVG_H}` }, VARS.map((v, j) => /* @__PURE__ */ React.createElement(
        "text",
        {
          key: j,
          x: LABEL_W + j * CELL + CELL / 2,
          y: LABEL_W - 6,
          textAnchor: "middle",
          fill: "rgba(244,242,236,0.6)",
          fontSize: "10"
        },
        v
      )), VARS.map((v, i) => /* @__PURE__ */ React.createElement(
        "text",
        {
          key: i,
          x: LABEL_W - 6,
          y: LABEL_W + i * CELL + CELL / 2 + 4,
          textAnchor: "end",
          fill: "rgba(244,242,236,0.6)",
          fontSize: "10"
        },
        v
      )), computedCorr.map(
        (row, i) => row.map((r, j) => {
          const cx = LABEL_W + j * CELL;
          const cy = LABEL_W + i * CELL;
          const isDiag = i === j;
          return /* @__PURE__ */ React.createElement("g", { key: `${i}-${j}` }, /* @__PURE__ */ React.createElement(
            "rect",
            {
              x: cx + 1,
              y: cy + 1,
              width: CELL - 2,
              height: CELL - 2,
              fill: isDiag ? "rgba(244,242,236,0.06)" : corrColor(r),
              rx: 3,
              style: { transition: "fill 0.4s" }
            }
          ), /* @__PURE__ */ React.createElement(
            "text",
            {
              x: cx + CELL / 2,
              y: cy + CELL / 2 + 5,
              textAnchor: "middle",
              fill: isDiag ? "rgba(244,242,236,0.4)" : Math.abs(r) > 0.5 ? "rgba(255,255,255,0.9)" : "rgba(244,242,236,0.6)",
              fontSize: "11",
              fontWeight: "600"
            },
            isDiag ? "\u2014" : r.toFixed(2)
          ));
        })
      ))))
    );
  }
  function Ch02_Explore({ chapter, goTo }) {
    return /* @__PURE__ */ React.createElement("div", { className: "chapter-root" }, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 02",
        title: "Exploratory Data Analysis \u2014 <em>look before you leap.</em>",
        hook: "Thirty minutes of plots save thirty days of debugging. Before a single <code>.fit()</code>, answer: what shape, what outliers, what correlations? This chapter is the checklist.",
        meta: [
          { k: "Topics", v: "Distributions \xB7 Outliers \xB7 Correlations" },
          { k: "Time", v: "10 min" },
          { k: "Sims", v: "3 interactive" },
          { k: "Level", v: "Core" }
        ]
      }
    ), /* @__PURE__ */ React.createElement(SectionLabel, { n: "01" }, "Distribution Shapes"), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "The histogram is the first thing you draw on any new dataset \u2014 not a mean, not a scatter plot. A histogram tells you at a glance whether your data is roughly bell-shaped (safe to use parametric tests), skewed (log-transform candidate), bimodal (hidden sub-populations?), or uniform (likely a synthetic key, not a real measurement)."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, /* @__PURE__ */ React.createElement("strong", null, "Skewness"), " measures asymmetry. Positive skew (long right tail) pushes the mean above the median \u2014 classic for income, latency, claim sizes.", /* @__PURE__ */ React.createElement("strong", null, " Kurtosis"), " (excess) measures tail weight. Heavy-tailed distributions (kurtosis > 0) produce more extreme events than a normal, which matters for risk and anomaly detection. Change N to see how estimation stabilises with more data."), /* @__PURE__ */ React.createElement(DistributionExplorer, null), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Always plot a histogram before computing statistics.</b> Summary stats can be identical for wildly different distributions (Anscombe's Quartet is the classic proof).",
      "<b>If skewness &gt; 1, consider log-transforming</b> before fitting linear models or computing Pearson r.",
      "<b>Vary bin count.</b> Freedman-Diaconis rule (bin width \u221D IQR \xB7 n<sup>\u22121/3</sup>) is a solid automatic choice.",
      "<b>Compare mean vs. median.</b> A large gap signals skew or heavy outliers contaminating the mean."
    ], title: "Best practices \u2014 distributions" }), /* @__PURE__ */ React.createElement(SectionLabel, { n: "02" }, "Outlier Detection"), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Outliers are not bugs \u2014 they are signals. A transaction 50\xD7 the typical value could be fraud, a test-account flush, or a genuine whale customer. The right move is to detect, investigate, and then decide: remove, cap (winsorise), or model separately. Never silently drop outliers without documenting why."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Three detection strategies dominate in practice.", /* @__PURE__ */ React.createElement("strong", null, " Z-score"), " (threshold = 3\u03C3) is fast but assumes normality \u2014 it collapses on heavily skewed data.", /* @__PURE__ */ React.createElement("strong", null, " IQR fences"), " (Tukey, 1.5 \xD7 IQR) are distribution-free and robust to skew. They are the default in most box-plot implementations.", /* @__PURE__ */ React.createElement("strong", null, " Isolation Forest"), " recursively partitions the feature space at random; anomalies require fewer splits to isolate. It scales to high dimensions where distance-based methods fail."), /* @__PURE__ */ React.createElement(OutlierDetector, null), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Removing outliers to improve R\xB2.</b> Outliers contain information. Deleting them without investigation is data falsification.",
      "<b>Using only Z-score on skewed data.</b> When data is right-skewed, Z-score almost never flags right-tail extremes because the mean and SD are already pulled right.",
      "<b>Treating multivariate outliers as univariate ones.</b> A point at (x=1.5\u03C3, y=1.5\u03C3) looks fine on each axis but can be a genuine outlier in 2D joint space (Mahalanobis distance catches this)."
    ], title: "Outlier anti-patterns" }), /* @__PURE__ */ React.createElement(SectionLabel, { n: "03" }, "Correlation Structure"), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A correlation matrix gives you a bird's-eye view of linear relationships across all feature pairs. It answers: which features move together, which are independent, and which might be proxies for the same underlying cause. This matters for feature selection (collinear features add noise) and for understanding the domain (high income\u2013satisfaction correlation hints at a mechanism worth investigating)."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Drag the ", /* @__PURE__ */ React.createElement("strong", null, "noise slider"), " to simulate measurement noise or a smaller effective sample. Watch Pearson r decay toward 0 \u2014 this is the attenuation bias that plagues survey data, wearable sensors, and self-reported measurements. Correcting for attenuation (disattenuation) is an underused technique in applied ML."), /* @__PURE__ */ React.createElement(CorrelationMatrix, null), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Equating high correlation with causation.</b> Spurious correlates are everywhere. Always ask: is there a common cause? (Ch 09 covers causal graphs.)",
      "<b>Computing Pearson r on non-linear relationships.</b> Two variables with a perfect U-shape have r \u2248 0. Use Spearman rank correlation or mutual information instead.",
      "<b>Ignoring multicollinearity.</b> Two features with r = 0.95 carry almost the same information. Keeping both inflates variance in linear models and makes coefficients unstable.",
      "<b>Reading a correlation matrix and skipping the scatter plots.</b> Always spot-check the highest correlations visually \u2014 outliers can manufacture or destroy Pearson r."
    ], title: "Correlation anti-patterns" }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Plot the correlation matrix as a heatmap</b> \u2014 not a table of numbers. The visual makes high/low clusters obvious at a glance.",
      "<b>For non-normal or ordinal data, use Spearman's \u03C1</b> instead of Pearson r.",
      "<b>After finding strong correlations, cluster features</b> (hierarchical clustering on the distance matrix 1\u2212|r|) to reveal groups of redundant predictors.",
      "<b>Check the target variable last.</b> Strong correlation with the target is useful; strong correlation between two features you plan to use together is a red flag."
    ], title: "Best practices \u2014 correlations" }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Histogram first, stats second.</b> Mean and variance are summaries of a shape you haven't seen yet \u2014 look at the shape first.",
      "<b>Outliers are signals, not noise.</b> Detect with Z-score for normal data, IQR for skewed data, and Isolation Forest for high-dimensional data. Then investigate before deleting.",
      "<b>Correlation r measures linear association only.</b> Always complement with scatter plots and consider Spearman for ordinal or non-normal data.",
      "<b>Noise attenuates correlations.</b> Measurement error biases r toward zero \u2014 the true relationship is stronger than your matrix suggests.",
      "<b>EDA is a checklist, not a one-time event.</b> Rerun it after every data join, imputation step, or feature engineering pass. New transformations create new distributions."
    ] }));
  }
  window.Ch02_Explore = Ch02_Explore;
})();
