(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  function ABSim() {
    const [trueLift, setTrueLift] = useState(0.02);
    const [baseline, setBaseline] = useState(0.12);
    const [dailyN, setDailyN] = useState(2e3);
    const [speed, setSpeed] = useState(1);
    const [running, setRunning] = useState(true);
    const [tick, setTick] = useState(0);
    const stateRef = useRef(null);
    if (!stateRef.current) stateRef.current = fresh();
    function fresh() {
      return {
        rng: mulberry32(Math.floor(Math.random() * 1e9)),
        day: 0,
        nC: 0,
        cC: 0,
        // visits / conversions control
        nV: 0,
        cV: 0,
        history: []
        // {day, lift, pLow, pHigh, pval}
      };
    }
    function reset() {
      stateRef.current = fresh();
      setTick((t) => t + 1);
    }
    useEffect(() => {
      if (!running) return;
      let raf, last = performance.now();
      const loop = (now) => {
        const dt = (now - last) / 1e3;
        last = now;
        const s2 = stateRef.current;
        const daysToAdd = dt * speed;
        if (s2.day + daysToAdd <= 28) {
          let remaining = daysToAdd;
          while (remaining > 0 && s2.day < 28) {
            const step = Math.min(0.1, remaining);
            const users = Math.round(dailyN * step);
            for (let i = 0; i < users; i++) {
              const toControl = s2.rng() < 0.5;
              if (toControl) {
                s2.nC++;
                if (s2.rng() < baseline) s2.cC++;
              } else {
                s2.nV++;
                if (s2.rng() < baseline + trueLift) s2.cV++;
              }
            }
            s2.day += step;
            remaining -= step;
          }
          const pC = s2.cC / (s2.nC || 1);
          const pV = s2.cV / (s2.nV || 1);
          const lift = pV - pC;
          const se = Math.sqrt(pC * (1 - pC) / (s2.nC || 1) + pV * (1 - pV) / (s2.nV || 1));
          const z = se > 0 ? lift / se : 0;
          const pval = 2 * (1 - normCdf(Math.abs(z)));
          s2.history.push({
            day: s2.day,
            pC,
            pV,
            lift,
            low: lift - 1.96 * se,
            high: lift + 1.96 * se,
            pval
          });
          if (s2.history.length > 400) s2.history.shift();
        }
        setTick((t) => t + 1);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [running, speed, dailyN, baseline, trueLift]);
    const s = stateRef.current;
    const latest = s.history[s.history.length - 1] || { pC: baseline, pV: baseline, lift: 0, low: 0, high: 0, pval: 1 };
    const p1 = baseline, p2 = baseline + trueLift;
    const nPerArm = trueLift !== 0 ? Math.ceil((1.96 + 0.84) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (trueLift * trueLift)) : Infinity;
    const daysNeeded = nPerArm * 2 / dailyN;
    const progress = Math.min(1, (s.nC + s.nV) / (nPerArm * 2 || 1));
    const W = 560, H = 180;
    const xMap = (d) => 30 + d / 28 * (W - 60);
    const yMin = -0.04, yMax = 0.06;
    const yMap = (v) => 160 - (v - yMin) / (yMax - yMin) * 140;
    const bandPath = useMemo(() => {
      if (s.history.length < 2) return "";
      const top = s.history.map((h) => `${xMap(h.day)},${yMap(h.high)}`).join(" L ");
      const bot = [...s.history].reverse().map((h) => `${xMap(h.day)},${yMap(h.low)}`).join(" L ");
      return `M ${top} L ${bot} Z`;
    }, [tick]);
    const linePath = useMemo(() => {
      if (s.history.length < 2) return "";
      return "M " + s.history.map((h) => `${xMap(h.day)},${yMap(h.lift)}`).join(" L ");
    }, [tick]);
    const significant = latest.pval < 0.05;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "LIVE \xB7 A/B TEST",
        title: "Running experiment",
        meta: `Day ${s.day.toFixed(1)} / 28`,
        caption: "Set a true lift, press play, watch visits stream in. The shaded band is the 95% CI on \u0394conversion. When it crosses zero for good, you have significance."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sim-row", style: { gridTemplateColumns: "280px 1fr" } }, /* @__PURE__ */ React.createElement("div", { className: "sim-controls" }, /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "True lift ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, (trueLift * 100).toFixed(1), " pp")), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "-0.03",
          max: "0.05",
          step: "0.002",
          "aria-label": "True lift",
          value: trueLift,
          onChange: (e) => {
            setTrueLift(+e.target.value);
            reset();
          }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Baseline CVR ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, (baseline * 100).toFixed(0), "%")), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0.02",
          max: "0.30",
          step: "0.01",
          "aria-label": "Baseline conversion rate",
          value: baseline,
          onChange: (e) => {
            setBaseline(+e.target.value);
            reset();
          }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Daily visitors ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, dailyN)), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "500",
          max: "10000",
          step: "500",
          "aria-label": "Daily visitors",
          value: dailyN,
          onChange: (e) => setDailyN(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl" }, /* @__PURE__ */ React.createElement("label", null, "Speed ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, speed, "\xD7")), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0.5",
          max: "8",
          step: "0.5",
          "aria-label": "Simulation speed",
          value: speed,
          onChange: (e) => setSpeed(+e.target.value)
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "sim-ctrl-row" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: `btn btn-sm ${running ? "btn-primary" : ""}`,
          onClick: () => setRunning((r) => !r)
        },
        running ? "\u275A\u275A Pause" : "\u25B6 Play"
      ), /* @__PURE__ */ React.createElement("button", { className: "btn btn-sm", onClick: reset }, "\u21BB Reset")), /* @__PURE__ */ React.createElement("div", { className: "sim-stats", style: { gridTemplateColumns: "1fr 1fr" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "CONTROL"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { fontSize: 22 } }, (latest.pC * 100).toFixed(2), "%"), /* @__PURE__ */ React.createElement("div", { className: "sub mono" }, s.cC, "/", s.nC)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "k" }, "VARIANT"), /* @__PURE__ */ React.createElement("div", { className: "v", style: { fontSize: 22, color: "var(--violet)" } }, (latest.pV * 100).toFixed(2), "%"), /* @__PURE__ */ React.createElement("div", { className: "sub mono" }, s.cV, "/", s.nV))), /* @__PURE__ */ React.createElement("div", { className: "ab-verdict", "data-sig": significant ? "yes" : "no" }, /* @__PURE__ */ React.createElement("div", { className: "ab-verdict-k" }, "p-value"), /* @__PURE__ */ React.createElement("div", { className: "ab-verdict-v" }, latest.pval < 1e-3 ? "<0.001" : latest.pval.toFixed(3)), /* @__PURE__ */ React.createElement("div", { className: "ab-verdict-note" }, significant ? /* @__PURE__ */ React.createElement(React.Fragment, null, "\u2713 significant (\u03B1=0.05)") : /* @__PURE__ */ React.createElement(React.Fragment, null, "\u2014 not yet significant"))), /* @__PURE__ */ React.createElement("div", { className: "ab-power" }, /* @__PURE__ */ React.createElement("div", { className: "ab-power-head" }, /* @__PURE__ */ React.createElement("span", null, "Sample progress \xB7 80% power"), /* @__PURE__ */ React.createElement("span", { className: "mono" }, Math.min(99, Math.floor(progress * 100)), "%")), /* @__PURE__ */ React.createElement("div", { className: "ab-power-bar" }, /* @__PURE__ */ React.createElement("div", { className: "ab-power-fill", style: { width: `${Math.min(100, progress * 100)}%` } })), /* @__PURE__ */ React.createElement("div", { className: "ab-power-note" }, "Need ", /* @__PURE__ */ React.createElement("span", { className: "mono" }, Number.isFinite(nPerArm) ? nPerArm.toLocaleString() : "\u221E"), " per arm \xB7 ~", /* @__PURE__ */ React.createElement("span", { className: "mono" }, Number.isFinite(daysNeeded) ? daysNeeded.toFixed(1) : "\u221E"), " days"))), /* @__PURE__ */ React.createElement("div", { className: "sim-plots" }, /* @__PURE__ */ React.createElement("div", { className: "plot-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "sim-plot-head" }, "Observed lift with 95% CI", /* @__PURE__ */ React.createElement("span", { className: "hint" }, "true lift = ", (trueLift * 100).toFixed(1), "pp")), /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}` }, [-0.04, -0.02, 0, 0.02, 0.04, 0.06].map((v) => /* @__PURE__ */ React.createElement("g", { key: v }, /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: "30",
          y1: yMap(v),
          x2: W - 10,
          y2: yMap(v),
          stroke: v === 0 ? "#A49D9A" : "#E6E1D8",
          strokeWidth: v === 0 ? 1 : 0.5,
          strokeDasharray: v === 0 ? "0" : "2 3"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: "26",
          y: yMap(v) + 3,
          textAnchor: "end",
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono', monospace"
        },
        (v * 100).toFixed(0),
        "pp"
      ))), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: "30",
          y1: yMap(trueLift),
          x2: W - 10,
          y2: yMap(trueLift),
          stroke: "#E8A031",
          strokeWidth: "1",
          strokeDasharray: "4 4",
          opacity: "0.7"
        }
      ), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: W - 12,
          y: yMap(trueLift) - 4,
          textAnchor: "end",
          fontSize: "9",
          fill: "#E8A031",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700"
        },
        "truth \xB7 ",
        (trueLift * 100).toFixed(1),
        "pp"
      ), bandPath && /* @__PURE__ */ React.createElement("path", { d: bandPath, fill: "#5B3EE8", opacity: "0.12" }), linePath && /* @__PURE__ */ React.createElement("path", { d: linePath, fill: "none", stroke: "#5B3EE8", strokeWidth: "1.6" }), s.history.length > 0 && /* @__PURE__ */ React.createElement(
        "circle",
        {
          cx: xMap(latest.day),
          cy: yMap(latest.lift),
          r: "3.5",
          fill: significant ? "#1FAF7E" : "#5B3EE8"
        }
      ), [0, 7, 14, 21, 28].map((d) => /* @__PURE__ */ React.createElement("g", { key: d }, /* @__PURE__ */ React.createElement("line", { x1: xMap(d), y1: "160", x2: xMap(d), y2: "164", stroke: "#A49D9A" }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: xMap(d),
          y: "175",
          textAnchor: "middle",
          fontSize: "9",
          fill: "#6A6270",
          fontFamily: "'JetBrains Mono', monospace"
        },
        "d",
        d
      )))))))
    );
  }
  function Ch08_Experiment() {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        eyebrow: "Chapter 08 \xB7 Experiment",
        title: 'A/B is <em>how</em> you learn. <span class="accent">Power is how</span> fast.',
        hook: "Randomize. Pre-declare metric + MDE + sample size. Don't peek. This is the discipline that separates product from vibes.",
        meta: [{ k: "Read", v: "9 min" }, { k: "Focus", v: "Power \xB7 CI \xB7 MDE" }, { k: "Sims", v: "1 live A/B" }]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "08.1" }, "The experiment, live"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Run the test ", /* @__PURE__ */ React.createElement("em", null, "before"), " you run the test."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A single A/B run doesn't tell you much. Move the ", /* @__PURE__ */ React.createElement("em", null, "true lift"), " slider to 0 \u2014 watch the CI wobble around zero, never resolve. Now set it to +2pp \u2014 watch it drift upward and the band finally clear zero. ", /* @__PURE__ */ React.createElement("strong", null, 'That is what "we need more users" means.')), /* @__PURE__ */ React.createElement(ABSim, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "08.2" }, "The four pre-commits"), /* @__PURE__ */ React.createElement("ol", { className: "prose", style: { paddingLeft: 20 } }, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Primary metric"), " \u2014 one number. Declare it. Log it."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "MDE"), " \u2014 the smallest lift you care about. Smaller MDE \u2192 huge sample size."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Power"), " \u2014 80% is standard. Below 50% and you're gambling."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "Duration"), " \u2014 at least 1 full week for weekly seasonality. 2 is safer."))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Peeking.</b> Checking p-values daily and stopping when significant inflates FPR to ~25% (see Ch 10).",
      "<b>HARKing.</b> Hypothesizing after results are known \u2014 slicing until something pops.",
      "<b>Multiple comparisons without correction.</b> 20 independent metrics at \u03B1=0.05 \u2192 ~64% chance at least one is a false positive."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Sample size = (noise / effect)\xB2.</b> Halve the MDE \u2192 4\xD7 the users.",
      "<b>CIs beat p-values.</b> A 95% CI shows magnitude AND uncertainty at once.",
      '<b>Neutral result is a result.</b> "No detectable effect at our MDE" is useful information.'
    ] }));
  }
  window.Ch08_Experiment = Ch08_Experiment;
})();
