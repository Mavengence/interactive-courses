(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  const PART_COUNT = 7;
  const baseDate = (i) => `04-${String(10 + i).padStart(2, "0")}`;
  function BackfillSim() {
    const [mode, setMode] = useState("overwrite");
    const [concurrency, setConcurrency] = useState(3);
    const [failureRate, setFailureRate] = useState(15);
    const [state, setState] = useState(() => initialState());
    const logRef = useRef(null);
    function initialState() {
      return {
        parts: Array.from({ length: PART_COUNT }, (_, i) => ({
          i,
          date: baseDate(i),
          status: "pending",
          // pending | writing | success | failed | doubled
          attempts: 0,
          rows: null,
          fill: 0
        })),
        running: false,
        log: [{ t: "00:00", k: "info", m: "Scheduler idle. Press \u25B6 Run backfill to queue 7 partitions.", _seq: 0 }],
        t0: null
      };
    }
    const logSeqRef = useRef(0);
    const append = (entry) => {
      const seq = ++logSeqRef.current;
      setState((s) => ({ ...s, log: [...s.log, { ...entry, _seq: seq }].slice(-40) }));
    };
    useEffect(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [state.log]);
    function timestamp() {
      if (!state.t0) return "00:00";
      const ms = Date.now() - state.t0;
      const s = Math.floor(ms / 1e3), m = Math.floor(s / 60);
      return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }
    const runBackfill = () => {
      setState((s) => ({ ...s, running: true, t0: Date.now(), parts: s.parts.map((p) => ({ ...p, status: "pending", attempts: 0, rows: null, fill: 0 })) }));
      append({ t: "00:00", k: "info", m: "\u25B6 Backfill dispatched \xB7 7 partitions \xB7 mode=" + mode.toUpperCase() });
      const queue = Array.from({ length: PART_COUNT }, (_, i) => i);
      let active = 0, index = 0;
      const launch = () => {
        while (active < concurrency && index < queue.length) {
          const pi = queue[index++];
          active++;
          runPartition(pi).then(() => {
            active--;
            if (index < queue.length) launch();
            else if (active === 0) {
              setState((s) => ({ ...s, running: false }));
              append({ t: timestampLive(), k: "ok", m: "\u2713 Backfill complete" });
            }
          });
        }
      };
      const timestampLive = () => {
        const ms = Date.now() - (state.t0 || Date.now());
        const s = Math.floor(ms / 1e3), m = Math.floor(s / 60);
        return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      };
      launch();
    };
    const runPartition = (pi) => new Promise((resolve) => {
      setState((s) => ({ ...s, parts: s.parts.map((p) => p.i === pi ? { ...p, status: "writing", attempts: p.attempts + 1, fill: 0 } : p) }));
      append({ t: "  \u2022  ", k: "info", m: `task.${baseDate(pi)} \u2192 writing (attempt ${1})` });
      const totalMs = 1400 + Math.random() * 800;
      const shouldFail = Math.random() * 100 < failureRate;
      const failAt = shouldFail ? 0.45 + Math.random() * 0.3 : null;
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const frac = Math.min(1, elapsed / totalMs);
        if (failAt && frac >= failAt) {
          setState((s) => ({ ...s, parts: s.parts.map((p) => p.i === pi ? { ...p, status: "failed", fill: failAt * 100 } : p) }));
          append({ t: "  \u2022  ", k: "err", m: `task.${baseDate(pi)} \u2192 FAILED at ${Math.round(failAt * 100)}% (network timeout)` });
          setTimeout(() => retryPartition(pi, resolve), 900);
          return;
        }
        setState((s) => ({ ...s, parts: s.parts.map((p) => p.i === pi ? { ...p, fill: frac * 100 } : p) }));
        if (frac < 1) requestAnimationFrame(tick);
        else commitPartition(pi, false, resolve);
      };
      requestAnimationFrame(tick);
    });
    const retryPartition = (pi, resolve) => {
      setState((s) => ({ ...s, parts: s.parts.map((p) => p.i === pi ? { ...p, status: "writing", attempts: p.attempts + 1, fill: 0 } : p) }));
      append({ t: "  \u2022  ", k: "info", m: `task.${baseDate(pi)} \u2192 retrying (attempt 2)` });
      const start = Date.now();
      const totalMs = 1300 + Math.random() * 500;
      const tick = () => {
        const elapsed = Date.now() - start;
        const frac = Math.min(1, elapsed / totalMs);
        setState((s) => ({ ...s, parts: s.parts.map((p) => p.i === pi ? { ...p, fill: frac * 100 } : p) }));
        if (frac < 1) requestAnimationFrame(tick);
        else commitPartition(pi, true, resolve);
      };
      requestAnimationFrame(tick);
    };
    const commitPartition = (pi, wasRetried, resolve) => {
      setState((s) => {
        const p = s.parts.find((x) => x.i === pi);
        const baseRows = 100 + pi * 8;
        if (mode === "overwrite") {
          const parts = s.parts.map((x) => x.i === pi ? { ...x, status: "success", rows: baseRows, fill: 100 } : x);
          return { ...s, parts };
        } else {
          const doubled = wasRetried;
          const rows = doubled ? baseRows * 2 : baseRows;
          const parts = s.parts.map((x) => x.i === pi ? { ...x, status: doubled ? "doubled" : "success", rows, fill: 100 } : x);
          return { ...s, parts };
        }
      });
      if (mode === "overwrite") {
        append({ t: "  \u2022  ", k: "ok", m: `task.${baseDate(pi)} \u2192 COMMIT \xB7 rows=${100 + pi * 8} ${wasRetried ? "(retry OK)" : ""}` });
      } else {
        if (wasRetried) append({ t: "  \u2022  ", k: "err", m: `task.${baseDate(pi)} \u2192 INSERT appended DOUBLED rows (${(100 + pi * 8) * 2}): no idempotency` });
        else append({ t: "  \u2022  ", k: "ok", m: `task.${baseDate(pi)} \u2192 INSERT committed \xB7 rows=${100 + pi * 8}` });
      }
      resolve();
    };
    const reset = () => setState(initialState());
    const totalRows = state.parts.reduce((a, p) => a + (p.rows || 0), 0);
    const expected = state.parts.reduce((a, p, i) => a + (p.rows !== null ? 100 + i * 8 : 0), 0);
    const drift = totalRows - expected;
    const anyFailed = state.parts.some((p) => p.status === "failed");
    const anyDoubled = state.parts.some((p) => p.status === "doubled");
    const allDone = state.parts.every((p) => p.status === "success" || p.status === "doubled");
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live simulator \xB7 retry semantics",
        title: mode === "overwrite" ? "Backfill with INSERT OVERWRITE (idempotent)" : "Backfill with INSERT (non-idempotent)",
        meta: `${concurrency} workers \xB7 ${failureRate}% fail rate`,
        caption: "Overwrite = the partition's contents AFTER the job, regardless of how many times it ran. Insert = every run appends, so retry = duplicates."
      },
      /* @__PURE__ */ React.createElement("div", { className: "bf-parts" }, state.parts.map((p) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: p.i,
          className: `bf-part ${p.status}`,
          style: p.status === "writing" ? { "--fill": `${p.fill}%` } : {}
        },
        /* @__PURE__ */ React.createElement("div", { className: "date" }, "ds=", p.date),
        /* @__PURE__ */ React.createElement("div", { className: "rows" }, p.rows != null ? p.rows.toLocaleString() : "-"),
        /* @__PURE__ */ React.createElement("div", { className: "sub" }, p.status === "pending" && "queued", p.status === "writing" && `writing ${Math.round(p.fill)}%`, p.status === "failed" && `failed \xB7 retrying`, p.status === "success" && (p.attempts > 1 ? `\u2713 retry OK` : `\u2713 ok`), p.status === "doubled" && `\u26A0 doubled`)
      ))),
      /* @__PURE__ */ React.createElement("div", { ref: logRef, className: "sched-log", style: { marginTop: 18, maxHeight: 200, overflowY: "auto" } }, state.log.map((e) => /* @__PURE__ */ React.createElement("div", { key: e._seq }, /* @__PURE__ */ React.createElement("span", { className: "t" }, "[", e.t, "]"), " ", /* @__PURE__ */ React.createElement("span", { className: e.k }, e.m)))),
      /* @__PURE__ */ React.createElement("div", { className: "readout-grid" }, /* @__PURE__ */ React.createElement("div", { className: `readout ${allDone ? anyDoubled ? "danger" : "ok" : "blue"}` }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Pipeline status"), /* @__PURE__ */ React.createElement("div", { className: "r-v", style: { fontSize: 18, textTransform: "uppercase" } }, allDone ? anyDoubled ? "corrupt" : "clean" : state.running ? "running" : "idle"), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, state.parts.filter((p) => p.status === "success" || p.status === "doubled").length, "/", PART_COUNT, " committed")), /* @__PURE__ */ React.createElement("div", { className: "readout" }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Actual rows"), /* @__PURE__ */ React.createElement("div", { className: "r-v" }, totalRows.toLocaleString()), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, "sum across partitions")), /* @__PURE__ */ React.createElement("div", { className: `readout ${drift > 0 ? "danger" : "ok"}` }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Drift vs expected"), /* @__PURE__ */ React.createElement("div", { className: "r-v" }, drift > 0 ? "+" : "", drift.toLocaleString()), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, drift > 0 ? "duplicate rows" : drift < 0 ? "missing rows" : "matches expected")), /* @__PURE__ */ React.createElement("div", { className: "readout blue" }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Retries"), /* @__PURE__ */ React.createElement("div", { className: "r-v" }, state.parts.reduce((a, p) => a + Math.max(0, p.attempts - 1), 0)), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, "attempts > 1"))),
      /* @__PURE__ */ React.createElement("div", { className: "ctl-row" }, /* @__PURE__ */ React.createElement("div", { className: "ctl-group", style: { flex: 1.2 } }, /* @__PURE__ */ React.createElement("div", { className: "ctl-lab" }, "Write mode"), /* @__PURE__ */ React.createElement("div", { className: "pill-row" }, /* @__PURE__ */ React.createElement("button", { className: `pill ${mode === "overwrite" ? "on" : ""}`, onClick: () => setMode("overwrite") }, "OVERWRITE", /* @__PURE__ */ React.createElement("span", { className: "ps" }, "idempotent")), /* @__PURE__ */ React.createElement("button", { className: `pill ${mode === "insert" ? "on" : ""}`, onClick: () => setMode("insert") }, "INSERT", /* @__PURE__ */ React.createElement("span", { className: "ps" }, "appends")))), /* @__PURE__ */ React.createElement("div", { className: "ctl-slider", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Concurrency"), /* @__PURE__ */ React.createElement("span", { className: "val" }, concurrency)), /* @__PURE__ */ React.createElement("input", { type: "range", min: 1, max: 7, value: concurrency, onChange: (e) => setConcurrency(+e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "hint" }, "parallel workers")), /* @__PURE__ */ React.createElement("div", { className: "ctl-slider warn", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Failure rate"), /* @__PURE__ */ React.createElement("span", { className: "val" }, failureRate, "%")), /* @__PURE__ */ React.createElement("input", { type: "range", min: 0, max: 60, step: 5, value: failureRate, onChange: (e) => setFailureRate(+e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "hint" }, "simulated transient errors")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", disabled: state.running, onClick: runBackfill }, "\u25B6 Run backfill"), /* @__PURE__ */ React.createElement("button", { className: "btn", disabled: state.running, onClick: reset }, "Reset"))
    );
  }
  function DAGDiagram() {
    const nodes = [
      { id: "raw", x: 80, y: 150, label: "raw_events", kind: "source" },
      { id: "clean", x: 300, y: 80, label: "clean_events", kind: "etl" },
      { id: "dedup", x: 300, y: 220, label: "deduped_sessions", kind: "etl" },
      { id: "agg", x: 540, y: 150, label: "daily_rollup", kind: "etl" },
      { id: "dash", x: 780, y: 80, label: "exec_dashboard", kind: "sink" },
      { id: "ml", x: 780, y: 220, label: "ml_features", kind: "sink" }
    ];
    const edges = [
      ["raw", "clean"],
      ["raw", "dedup"],
      ["clean", "agg"],
      ["dedup", "agg"],
      ["agg", "dash"],
      ["agg", "ml"]
    ];
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    return /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "1px solid var(--theme-gray-200)", borderRadius: 10, padding: 14 } }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 860 300", style: { width: "100%", display: "block", aspectRatio: "860/300" } }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("marker", { id: "arr4", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto" }, /* @__PURE__ */ React.createElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--theme-gray-400)" }))), edges.map(([a, b], i) => {
      const n1 = byId[a], n2 = byId[b];
      return /* @__PURE__ */ React.createElement("line", { key: i, x1: n1.x + 60, y1: n1.y, x2: n2.x - 60, y2: n2.y, stroke: "var(--theme-gray-300)", strokeWidth: "1.5", markerEnd: "url(#arr4)" });
    }), nodes.map((n) => {
      const fill = n.kind === "source" ? "#FFFBF2" : n.kind === "sink" ? "#F4FBF5" : "#F3F8FF";
      const stroke = n.kind === "source" ? "#F7B928" : n.kind === "sink" ? "var(--theme-green)" : "var(--theme-blue)";
      return /* @__PURE__ */ React.createElement("g", { key: n.id }, /* @__PURE__ */ React.createElement("rect", { x: n.x - 66, y: n.y - 24, width: 132, height: 50, rx: 9, fill, stroke, strokeWidth: "1.6" }), /* @__PURE__ */ React.createElement("text", { x: n.x, y: n.y - 4, textAnchor: "middle", style: { fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, fill: "var(--fg-1)" } }, n.label), /* @__PURE__ */ React.createElement("text", { x: n.x, y: n.y + 14, textAnchor: "middle", style: { fontFamily: "var(--font-mono)", fontSize: 10.5, fill: "var(--fg-2)", letterSpacing: "0.1em", textTransform: "uppercase" } }, n.kind));
    })));
  }
  function Ch4_Orchestrate({ chapter }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.ink,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: "Orchestrate: <span class='accent'>retries are a feature.</span> Only if the write is idempotent.",
        hook: "Airflow is the scheduler that runs every pipeline at a modern tech company. Its contract is simple and ruthless: <strong>any task may run more than once.</strong> Crashes, timeouts, backfills: the scheduler will retry. Your job is to make sure retries don't corrupt the table.",
        meta: [
          { k: "Scheduler", v: "Airflow \xB7 cron + DAG" },
          { k: "Unit", v: "task (op on 1 partition)" },
          { k: "Core primitive", v: "<code>INSERT OVERWRITE</code>" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "5.1" }, "Pipelines are graphs"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "A DAG of tasks, one partition at a time."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Every pipeline is a ", /* @__PURE__ */ React.createElement("strong", null, "directed acyclic graph"), ". Nodes are tasks (read a table, write a partition). Edges are data dependencies (", /* @__PURE__ */ React.createElement("em", null, "agg"), " needs ", /* @__PURE__ */ React.createElement("em", null, "clean"), " to have landed). The scheduler walks the graph, runs what's ready, retries what fails, and invalidates downstreams when an upstream is re-materialized."), /* @__PURE__ */ React.createElement(DAGDiagram, null), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { marginTop: 18 } }, "The scheduler has exactly one guarantee: ", /* @__PURE__ */ React.createElement("em", null, "given the same inputs, re-running a task must produce the same output"), ". If you break that, every retry, backfill, and late-arriving upstream turns into a silent data bug.")), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "5.2" }, "Idempotency, visualized"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Flip OVERWRITE \u2192 INSERT. Watch the rows double."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Seven-day backfill. Failure rate knob simulates transient errors: timeouts, spot-instance evictions, OOM kills. With ", /* @__PURE__ */ React.createElement("code", null, "INSERT OVERWRITE"), ", a retry replaces the partition wholesale: the final row count is correct no matter how many attempts happened. With plain ", /* @__PURE__ */ React.createElement("code", null, "INSERT"), ", every failed attempt left rows behind, and the successful retry piles more on top. That's how a pipeline silently ships 2\xD7 the truth."), /* @__PURE__ */ React.createElement(BackfillSim, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "5.3" }, "The contract"), /* @__PURE__ */ React.createElement("div", { className: "code" }, /* @__PURE__ */ React.createElement("div", { className: "code-head" }, /* @__PURE__ */ React.createElement("span", null, "pipeline.py \xB7 the Airflow-approved write"), /* @__PURE__ */ React.createElement("span", { className: "lang" }, "Spark")), /* @__PURE__ */ React.createElement("div", { className: "code-body", dangerouslySetInnerHTML: {
      __html: `<span class="tok-c"># \u2713 Idempotent: rerunning produces the same partition.</span>
<span class="tok-k">INSERT OVERWRITE TABLE</span> daily_rollup <span class="tok-k">PARTITION</span> (ds=<span class="tok-s">'&lt;DATEID&gt;'</span>)
<span class="tok-k">SELECT</span> user_id, <span class="tok-f">SUM</span>(events) <span class="tok-k">AS</span> n
<span class="tok-k">FROM</span> clean_events <span class="tok-k">WHERE</span> ds = <span class="tok-s">'&lt;DATEID&gt;'</span>
<span class="tok-k">GROUP BY</span> user_id;

<span class="tok-c"># \u2717 NEVER do this in a scheduled job:</span>
<span class="tok-k">INSERT INTO</span> daily_rollup
<span class="tok-k">SELECT</span> * <span class="tok-k">FROM</span> clean_events <span class="tok-k">WHERE</span> ds = <span class="tok-f">CURRENT_DATE</span>();
<span class="tok-c"># Two problems: (a) INSERT appends on retry \u2192 duplicates.</span>
<span class="tok-c">#               (b) CURRENT_DATE is non-deterministic \u2192 backfills are broken.</span>`
    } }))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Using <code>INSERT INTO</code> in a scheduled task.</b> The scheduler will retry you. You will double-write. Ask every DE who has on-called which bug they've seen most: it's this one.",
      "<b>Side effects with no undo.</b> Sending a push notification inside an ETL task is not re-runnable. Separate side effects into their own dedicated tasks, and log what was sent so replay can skip it.",
      "<b>Reading <code>CURRENT_DATE</code> / <code>NOW()</code> inside task bodies.</b> A backfill in May for last Tuesday will land under this Tuesday's partition. Use the <code>&lt;DATEID&gt;</code> macro.",
      "<b>Skipping SLA annotations.</b> A task that should finish by 06:00 but doesn't tell the scheduler so won't page anyone when it silently slips to 14:00."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "Every scheduled task: <b><code>INSERT OVERWRITE TABLE \u2026 PARTITION(ds='&lt;DATEID&gt;')</code></b>. Full stop. No exceptions.",
      "Stamp every partition with the <b><code>DATEID</code> macro</b>: never wall clock. A task running today must produce the same bytes as a rerun next year.",
      "Tag SLAs and alerts at the <b>DAG node level</b>. The scheduler pages on missed SLAs; don't rely on dashboards to catch late pipelines.",
      "For unavoidable side effects (emails, pushes, external API writes), <b>isolate them in a dedicated terminal task</b> and maintain an external ledger so replays can skip already-sent work."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Airflow retries tasks.</b> Always. The only question is whether retries corrupt your table.",
      "<code>INSERT OVERWRITE</code> + <code>&lt;DATEID&gt;</code> = idempotent. That pattern is the whole chapter.",
      "<b>Side effects must be isolated and replayable.</b> A pipeline that can email twice will, eventually, email twice."
    ] }));
  }
  window.Ch4_Orchestrate = Ch4_Orchestrate;
})();
