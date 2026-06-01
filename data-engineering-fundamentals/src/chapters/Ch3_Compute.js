(() => {
  const { useState, useEffect, useMemo } = React;
  function ShuffleSim() {
    const [skew, setSkew] = useState(20);
    const [workers, setWorkers] = useState(6);
    const [strategy, setStrategy] = useState("hash");
    const [running, setRunning] = useState(true);
    const [tick, setTick] = useState(0);
    useEffect(() => {
      if (!running) return;
      const iv = setInterval(() => setTick((t) => t + 1), 380);
      return () => clearInterval(iv);
    }, [running]);
    const loads = useMemo(() => {
      const n = workers;
      const arr = Array.from({ length: n }, () => 100);
      if (strategy === "hash") {
        const extra = skew * 10;
        arr[0] += extra;
        for (let i = 1; i < n; i++) arr[i] -= extra / (n - 1);
      } else {
        for (let i = 0; i < n; i++) arr[i] += 40;
      }
      return arr.map((v) => Math.max(30, v));
    }, [skew, workers, strategy]);
    const max = Math.max(...loads);
    const overloaded = loads.map((l) => l > 260);
    const particles = useMemo(() => {
      const arr = [];
      const count = strategy === "broadcast" ? 14 : 12;
      for (let i = 0; i < count; i++) {
        let target;
        if (strategy === "hash") target = Math.random() < skew / 100 ? 0 : Math.floor(Math.random() * workers);
        else target = Math.floor(Math.random() * workers);
        arr.push({ id: `${tick}-${i}`, target, delay: i * 40 % 400, side: i % 2 });
      }
      return arr;
    }, [tick, skew, workers, strategy]);
    const workerX = (i) => 140 + i * ((880 - 140) / Math.max(1, workers - 1));
    const leftSrcX = 70, rightSrcX = 920;
    const p95 = Math.round(max * 2);
    const health = overloaded.some((x) => x) ? "overloaded" : loads.every((l) => l < 180) ? "healthy" : "busy";
    const healthColor = health === "overloaded" ? "danger" : health === "busy" ? "warn" : "ok";
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live simulator \xB7 query planner",
        title: "Shuffles & joins, in motion",
        meta: `${workers} workers`,
        caption: "Rows fly from source tables to workers. Push skew up until worker 0 chokes: that's the hashtag doing 80% of impressions."
      },
      /* @__PURE__ */ React.createElement("div", { className: "qp-stage" }, /* @__PURE__ */ React.createElement("svg", { className: "qp-svg", viewBox: "0 0 1000 500", preserveAspectRatio: "xMidYMid meet" }, /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("rect", { x: leftSrcX - 50, y: 60, width: 100, height: 40, rx: 8, fill: "#fff", stroke: "var(--theme-gray-300)" }), /* @__PURE__ */ React.createElement("text", { x: leftSrcX, y: 85, textAnchor: "middle", className: "qp-lab-big" }, "events"), /* @__PURE__ */ React.createElement("text", { x: leftSrcX, y: 115, textAnchor: "middle", className: "qp-lab-small" }, "50M rows")), /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("rect", { x: rightSrcX - 50, y: 60, width: 100, height: 40, rx: 8, fill: "#fff", stroke: "var(--theme-gray-300)" }), /* @__PURE__ */ React.createElement("text", { x: rightSrcX, y: 85, textAnchor: "middle", className: "qp-lab-big" }, "users"), /* @__PURE__ */ React.createElement("text", { x: rightSrcX, y: 115, textAnchor: "middle", className: "qp-lab-small" }, strategy === "broadcast" ? "~10K (small)" : "2.1B rows")), /* @__PURE__ */ React.createElement("text", { x: 500, y: 150, textAnchor: "middle", className: "qp-lab-small", fill: "var(--theme-blue)", style: { fontWeight: 700, letterSpacing: "0.08em" } }, strategy === "hash" ? "HASH PARTITION ON user_id" : "BROADCAST (small side replicated)"), loads.map((load, i) => {
        const x = workerX(i);
        const h = Math.min(180, Math.max(40, load * 0.6));
        const y = 420 - h;
        const isOverloaded = overloaded[i];
        const col = isOverloaded ? "var(--theme-red)" : load > 180 ? "#F7B928" : "var(--theme-blue)";
        const barOpacity = isOverloaded ? 0.9 : overloaded.some(Boolean) ? 0.38 : 0.85;
        return /* @__PURE__ */ React.createElement("g", { key: i, className: isOverloaded ? "qp-overload" : "" }, /* @__PURE__ */ React.createElement("rect", { x: x - 30, y, width: 60, height: h, rx: 6, fill: col, opacity: barOpacity }), /* @__PURE__ */ React.createElement("rect", { x: x - 30, y: 420, width: 60, height: 14, rx: 3, fill: "var(--theme-gray-300)" }), isOverloaded && /* @__PURE__ */ React.createElement("text", { x, y: y - 28, textAnchor: "middle", className: "qp-overload-label" }, "OVERLOADED"), /* @__PURE__ */ React.createElement("text", { x, y: 460, textAnchor: "middle", className: "qp-lab-big" }, "W", i), /* @__PURE__ */ React.createElement("text", { x, y: 478, textAnchor: "middle", className: "qp-lab-small" }, Math.round(load), "MB"));
      }), particles.map((p) => {
        const tx = workerX(p.target);
        const srcX = p.side === 0 ? leftSrcX : rightSrcX;
        return /* @__PURE__ */ React.createElement("circle", { key: p.id, cx: srcX, cy: 100, r: 4, fill: "var(--theme-blue)" }, /* @__PURE__ */ React.createElement(
          "animate",
          {
            attributeName: "cx",
            from: srcX,
            to: tx,
            dur: "0.9s",
            begin: `${p.delay}ms`,
            fill: "freeze",
            calcMode: "spline",
            keyTimes: "0;1",
            keySplines: "0.32 0.72 0 1"
          }
        ), /* @__PURE__ */ React.createElement(
          "animate",
          {
            attributeName: "cy",
            from: 100,
            to: 400 - loads[p.target] * 0.6 + 8,
            dur: "0.9s",
            begin: `${p.delay}ms`,
            fill: "freeze",
            calcMode: "spline",
            keyTimes: "0;1",
            keySplines: "0.32 0.72 0 1"
          }
        ), /* @__PURE__ */ React.createElement("animate", { attributeName: "opacity", values: "1;1;0", keyTimes: "0;0.85;1", dur: "0.9s", begin: `${p.delay}ms`, fill: "freeze" }));
      }))),
      /* @__PURE__ */ React.createElement("div", { className: "readout-grid" }, /* @__PURE__ */ React.createElement("div", { className: `readout ${healthColor}` }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Status"), /* @__PURE__ */ React.createElement("div", { className: "r-v", style: { fontSize: 18, textTransform: "uppercase" } }, health), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, overloaded.filter((x) => x).length, " node(s) overloaded")), /* @__PURE__ */ React.createElement("div", { className: "readout" }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Max shuffle"), /* @__PURE__ */ React.createElement("div", { className: "r-v" }, Math.round(max), /* @__PURE__ */ React.createElement("small", null, "MB")), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, "worker 0")), /* @__PURE__ */ React.createElement("div", { className: "readout" }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "p95 latency"), /* @__PURE__ */ React.createElement("div", { className: "r-v" }, p95, /* @__PURE__ */ React.createElement("small", null, "ms")), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, "sim estimate")), /* @__PURE__ */ React.createElement("div", { className: "readout blue" }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Strategy"), /* @__PURE__ */ React.createElement("div", { className: "r-v", style: { fontSize: 17, textTransform: "uppercase" } }, strategy), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, strategy === "hash" ? "network heavy" : "memory heavy"))),
      /* @__PURE__ */ React.createElement("div", { className: "ctl-row" }, /* @__PURE__ */ React.createElement("div", { className: "ctl-slider", style: { flex: 1.2 } }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Key skew"), /* @__PURE__ */ React.createElement("span", { className: "val" }, skew, "%")), /* @__PURE__ */ React.createElement("input", { type: "range", min: 0, max: 90, step: 1, value: skew, onChange: (e) => setSkew(+e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "hint" }, "% of rows landing on the hot key")), /* @__PURE__ */ React.createElement("div", { className: "ctl-slider", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Workers"), /* @__PURE__ */ React.createElement("span", { className: "val" }, workers)), /* @__PURE__ */ React.createElement("input", { type: "range", min: 2, max: 12, step: 1, value: workers, onChange: (e) => setWorkers(+e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "hint" }, "parallelism")), /* @__PURE__ */ React.createElement("div", { className: "ctl-group" }, /* @__PURE__ */ React.createElement("div", { className: "ctl-lab" }, "Join strategy"), /* @__PURE__ */ React.createElement("div", { className: "pill-row" }, /* @__PURE__ */ React.createElement("button", { className: `pill ${strategy === "hash" ? "on" : ""}`, onClick: () => setStrategy("hash") }, "Hash"), /* @__PURE__ */ React.createElement("button", { className: `pill ${strategy === "broadcast" ? "on" : ""}`, onClick: () => setStrategy("broadcast") }, "Broadcast"))), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: () => setRunning((r) => !r) }, running ? "\u23F8 Pause" : "\u25B6 Run"))
    );
  }
  function EngineMatrix() {
    const rows = [
      { n: "Presto", s: "Interactive SQL", d: "In-memory MPP. Seconds, not minutes. Great for dashboards. Dies on massive joins: no spill-to-disk." },
      { n: "Spark", s: "ETL & pipelines", d: "The workhorse. DataFrame/SQL, spills to disk, fault-tolerant. Most Airflow jobs are Spark." },
      { n: "Snowflake", s: "Cloud OLAP DWH", d: "Columnar storage, virtual warehouses, auto-scale. Great for large ad-hoc queries and batch rewrites; cost scales with compute time." }
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "cards-3" }, rows.map((e) => /* @__PURE__ */ React.createElement("div", { key: e.n, className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, e.s), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, e.n), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, e.d))));
  }
  function Ch3_Compute({ chapter }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.hex,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: "Compute: <span class='accent'>the planner bets on statistics.</span> Wrong stats, wrong plan.",
        hook: "Every JOIN is a bet the planner makes against table statistics. Broadcast or shuffle. If the stats are stale, it broadcasts a 5 GB table and OOMs 400 workers simultaneously. The SQL didn't change. The statistics did.",
        meta: [
          { k: "Engines", v: '<span class="chip">Presto</span><span class="chip">Spark</span><span class="chip">Snowflake</span>' },
          { k: "Planners", v: "CBO \xB7 statistics-driven" },
          { k: "#1 failure", v: "key skew" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "4.1" }, "Pick the engine for the query."), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Three engines, one set of bytes."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Decoupled storage means the same Parquet files can be read by any engine. Pick the one that fits the query. Interactive & < 100 GB? ", /* @__PURE__ */ React.createElement("b", null, "Presto"), ". Durable and repeatable ETL?", /* @__PURE__ */ React.createElement("b", null, " Spark"), ". Large ad-hoc rewrites or analyst-heavy workloads? ", /* @__PURE__ */ React.createElement("b", null, "Snowflake"), " \u2014 spin up a bigger virtual warehouse, run it, tear it down."), /* @__PURE__ */ React.createElement(EngineMatrix, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "4.2" }, "The planner, visualized"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Watch a join actually happen."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A ", /* @__PURE__ */ React.createElement("strong", null, "hash join"), " partitions both sides by the join key and ships each partition to one worker: cheap when keys are uniform, lethal when one key is hot. A ", /* @__PURE__ */ React.createElement("strong", null, "broadcast join"), ' copies the small side to every worker: cheap when one side fits in memory, ruinous when the planner thinks 5 GB is "small."'), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Push the skew slider up. Watch worker 0 turn red while the rest idle. That's what", /* @__PURE__ */ React.createElement("code", null, " user_id = 0"), " (unauthenticated traffic) does to every analytics pipeline that forgets to filter it."), /* @__PURE__ */ React.createElement(ShuffleSim, null)), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      '<b>Broadcasting a 5 GB "small" table.</b> The planner will agree. Then 400 workers OOM at the same instant. Check the build-side size before trusting the hint.',
      "<b>Hash-joining on a column with a single hot key.</b> Classic: <code>user_id = 0</code> for logged-out traffic. Salt the key, or filter first.",
      "<b>Running an exploratory 2 TB scan on Presto.</b> Presto has no spill. It will die at minute 18. Every time. Use Spark.",
      "<b>Stale table statistics.</b> The planner makes decisions on row counts it thinks are right. Re-analyze after every big write or the CBO plans blind."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Inspect your join keys</b> before shipping. A <code>COUNT(*) GROUP BY</code> on the key takes 30 seconds and saves you a Saturday.",
      "Use <b>broadcast hints</b> only when you've measured the small side. <code>/*+ BROADCAST(x) */</code> is a contract with the planner.",
      "For sustained skew, <b>salt the hot key</b> (<code>key || rand(0,N)</code>), join on salted, then aggregate. Classic fix, always works."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "The planner decides <b>shuffle vs broadcast</b> from table stats. Bad stats \u2192 bad plan \u2192 worker explodes.",
      "<b>Skew is the #1 cause of pipeline failure at a modern tech company scale.</b> Always inspect your join keys.",
      "Engine choice is part of job design: it's not the scheduler's job to rescue Presto from a 10 TB rewrite."
    ] }));
  }
  window.Ch3_Compute = Ch3_Compute;
})();
