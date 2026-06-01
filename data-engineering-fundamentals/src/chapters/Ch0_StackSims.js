(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  const LAYERS = [
    { n: 7, key: "app", name: "Application", sub: "Hex \xB7 Mode \xB7 dashboards \xB7 notebooks \xB7 BI tools", api: "Natural language \xB7 SQL \xB7 REST", hue: "L7", fail: "User-facing surface dark. No new queries can enter the system." },
    { n: 6, key: "engine", name: "Query engine", sub: "Trino (interactive) \xB7 Spark (warehouse ETL) \xB7 Snowflake", api: "SQL \u2192 distributed plan", hue: "L6", fail: "Queries queue indefinitely. Planner never turns SQL into work." },
    { n: 5, key: "catalog", name: "Catalog / Metastore", sub: "Glue Catalog \xB7 schema + physical location of every table", api: "Thrift: getPartitions \xB7 getTableSchema", hue: "L5", fail: "Planning fails before any read happens: engine has no partition list to open." },
    { n: 4, key: "table", name: "Table abstraction", sub: "Namespaces \u2192 Tables \u2192 Partitions \u2192 Rows \xB7 ds-partitioned", api: "SELECT \u2026 WHERE ds = '2024-01-15'", hue: "L4", fail: "Partition resolution unreliable. Engine may scan too many or miss data." },
    { n: 3, key: "format", name: "File format", sub: "Parquet (ORC fork) \xB7 Parquet \xB7 Avro \xB7 TEXTFILE", api: "Read/write by stripe \xB7 predicate pushdown", hue: "L3", fail: "Footer corruption. Stripe skipping unavailable; full-file scans only." },
    { n: 2, key: "blob", name: "Blob layer", sub: "S3 \xB7 blob API \xB7 manages physical placement", api: "put(blob) \xB7 get(blob_id)", hue: "L2", fail: "Reads slow, retries kick in, timeouts cascade up to engine." },
    { n: 1, key: "physical", name: "Physical storage", sub: "SSD tier \xB7 flash tier \xB7 replicated", api: "Raw bytes", hue: "L1", fail: "Bytes unreachable. Everything above queues on I/O or errors out." }
  ];
  function LayerCake() {
    const [hover, setHover] = useState(null);
    const [pulse, setPulse] = useState(null);
    const [failMode, setFailMode] = useState(false);
    const [faulty, setFaulty] = useState(null);
    const rafRef = useRef(null);
    const trace = () => {
      if (pulse) return;
      cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      const duration = 3600;
      const step = (t) => {
        const p = Math.min(1, (t - start) / duration);
        let idx;
        let dir;
        if (p < 0.5) {
          idx = Math.floor(p * 2 * LAYERS.length);
          dir = "down";
        } else {
          idx = LAYERS.length - 1 - Math.floor((p - 0.5) * 2 * LAYERS.length);
          dir = "up";
        }
        idx = Math.max(0, Math.min(LAYERS.length - 1, idx));
        setPulse({ idx, dir, p });
        if (p < 1) rafRef.current = requestAnimationFrame(step);
        else setPulse(null);
      };
      rafRef.current = requestAnimationFrame(step);
    };
    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
    const faultyIdx = faulty ? LAYERS.findIndex((l) => l.key === faulty) : -1;
    const affected = (i) => failMode && faultyIdx >= 0 && i <= faultyIdx;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live \xB7 interactive",
        title: "The 7-layer stack",
        meta: "hover a layer \xB7 click trace \xB7 toggle failure mode",
        caption: "Every warehouse query touches all seven. Knowing the layer means knowing the failure mode."
      },
      /* @__PURE__ */ React.createElement("div", { className: "lc-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "lc-stack" }, LAYERS.map((L, i) => {
        const isHover = hover === L.key;
        const pulsing = pulse && pulse.idx === i;
        const broken = failMode && faulty === L.key;
        const impact = affected(i) && !broken;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: L.key,
            className: `lc-slab lc-${L.hue} ${isHover ? "on" : ""} ${pulsing ? "pulse " + pulse.dir : ""} ${broken ? "broken" : ""} ${impact ? "impact" : ""} ${failMode ? "fm" : ""}`,
            onMouseEnter: () => setHover(L.key),
            onMouseLeave: () => setHover(null),
            onClick: () => failMode && setFaulty((f) => f === L.key ? null : L.key),
            style: { zIndex: isHover ? 40 : 10 + (LAYERS.length - i) }
          },
          /* @__PURE__ */ React.createElement("div", { className: "lc-slab-num" }, "L", L.n),
          /* @__PURE__ */ React.createElement("div", { className: "lc-slab-name" }, L.name),
          /* @__PURE__ */ React.createElement("div", { className: "lc-slab-sub" }, L.sub),
          /* @__PURE__ */ React.createElement("div", { className: "lc-slab-api" }, L.api),
          pulsing && /* @__PURE__ */ React.createElement("div", { className: "lc-pulse-dot" }),
          broken && /* @__PURE__ */ React.createElement("div", { className: "lc-x" }, "\u2715")
        );
      })), /* @__PURE__ */ React.createElement("aside", { className: "lc-detail" }, hover ? (() => {
        const L = LAYERS.find((l) => l.key === hover);
        const above = LAYERS.find((l) => l.n === L.n + 1);
        const below = LAYERS.find((l) => l.n === L.n - 1);
        return /* @__PURE__ */ React.createElement("div", { className: "lc-detail-card" }, /* @__PURE__ */ React.createElement("div", { className: "lc-dc-eyebrow" }, "Layer ", L.n), /* @__PURE__ */ React.createElement("div", { className: "lc-dc-title" }, L.name), /* @__PURE__ */ React.createElement("div", { className: "lc-dc-row" }, /* @__PURE__ */ React.createElement("span", { className: "lc-dc-k" }, "Stores"), /* @__PURE__ */ React.createElement("span", { className: "lc-dc-v" }, L.sub)), /* @__PURE__ */ React.createElement("div", { className: "lc-dc-row" }, /* @__PURE__ */ React.createElement("span", { className: "lc-dc-k" }, "API"), /* @__PURE__ */ React.createElement("span", { className: "lc-dc-v" }, L.api)), /* @__PURE__ */ React.createElement("div", { className: "lc-dc-row" }, /* @__PURE__ */ React.createElement("span", { className: "lc-dc-k" }, "Above"), /* @__PURE__ */ React.createElement("span", { className: "lc-dc-v" }, above ? `L${above.n} ${above.name}` : "- (top of stack)")), /* @__PURE__ */ React.createElement("div", { className: "lc-dc-row" }, /* @__PURE__ */ React.createElement("span", { className: "lc-dc-k" }, "Below"), /* @__PURE__ */ React.createElement("span", { className: "lc-dc-v" }, below ? `L${below.n} ${below.name}` : "- (bare metal)")), failMode && /* @__PURE__ */ React.createElement("div", { className: "lc-dc-fail" }, /* @__PURE__ */ React.createElement("div", { className: "lc-dc-fail-lab" }, "If this layer is down"), /* @__PURE__ */ React.createElement("div", { className: "lc-dc-fail-v" }, L.fail)));
      })() : /* @__PURE__ */ React.createElement("div", { className: "lc-detail-empty" }, /* @__PURE__ */ React.createElement("div", { className: "lc-de-dot" }), /* @__PURE__ */ React.createElement("div", { className: "lc-de-lab" }, "Hover any layer"), /* @__PURE__ */ React.createElement("div", { className: "lc-de-sub" }, "See what it stores, the API it exposes, and what sits above & below.")))),
      /* @__PURE__ */ React.createElement("div", { className: "lc-ctrls" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: trace, disabled: !!pulse }, pulse ? pulse.dir === "down" ? "\u25BE descending\u2026" : "\u25B4 returning result\u2026" : "\u25B6 Trace a query"), /* @__PURE__ */ React.createElement("label", { className: "lc-fm" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: failMode, onChange: (e) => {
        setFailMode(e.target.checked);
        if (!e.target.checked) setFaulty(null);
      } }), /* @__PURE__ */ React.createElement("span", null, "Failure mode"), /* @__PURE__ */ React.createElement("span", { className: "lc-fm-sub" }, failMode ? "click any layer to mark it down" : "see what breaks when a layer fails")))
    );
  }
  const BT_STOPS = [
    { k: "sql", n: "SQL enters", d: "SELECT user_email \u2026", warm: 40, cold: 40 },
    { k: "plan", n: "Planner resolves", d: "column_id=7 in Parquet schema", warm: 120, cold: 120 },
    { k: "meta", n: "Metastore lookup", d: "partition list for ds='2024-01-15'", warm: 800, cold: 8e4 },
    { k: "foot", n: "Open Parquet footer", d: "stripe metadata \xB7 min/max index", warm: 260, cold: 2600 },
    { k: "skip", n: "Predicate pushdown", d: "stripe min/max says no match \u2192 skip", warm: 40, cold: 40 },
    { k: "blob", n: "S3 fetch", d: "blob for matching stripe", warm: 1800, cold: 18e4 },
    { k: "flash", n: "SSD tier read", d: "flash tier \xB7 replicated bytes", warm: 420, cold: 4200 },
    { k: "ret", n: "Decompress \u2192 return", d: "bytes \u2192 worker \u2192 coordinator \u2192 user", warm: 180, cold: 900 }
  ];
  function ByteTrace() {
    const [cache, setCache] = useState("warm");
    const [token, setToken] = useState(0);
    const [running, setRunning] = useState(false);
    const [pos, setPos] = useState(0);
    const rafRef = useRef(null);
    const run = () => {
      setPos(0);
      setToken((n) => n + 1);
    };
    useEffect(() => {
      if (token === 0) return;
      setRunning(true);
      cancelAnimationFrame(rafRef.current);
      const totalMs = cache === "warm" ? 3400 : 5800;
      const start = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - start) / totalMs);
        setPos(p * BT_STOPS.length);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
        else setRunning(false);
      };
      rafRef.current = requestAnimationFrame(step);
      return () => cancelAnimationFrame(rafRef.current);
    }, [token, cache]);
    const curIdx = Math.min(BT_STOPS.length - 1, Math.floor(pos));
    const cum = useMemo(() => {
      let total = 0;
      const arr = BT_STOPS.map((s) => {
        total += s[cache];
        return total;
      });
      return arr;
    }, [cache]);
    const cumNow = pos === 0 ? 0 : cum[curIdx];
    const totalAll = cum[cum.length - 1];
    const totalWarm = useMemo(() => BT_STOPS.reduce((a, s) => a + s.warm, 0), []);
    const totalCold = useMemo(() => BT_STOPS.reduce((a, s) => a + s.cold, 0), []);
    const speedupX = Math.round(totalCold / totalWarm);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live \xB7 trace",
        title: "A byte's journey",
        meta: "dim_users.user_email \xB7 warm vs cold cache",
        caption: "Each stop has its own latency budget. Cold Metastore and S3 dominate: that's why caching matters."
      },
      /* @__PURE__ */ React.createElement("div", { className: "bt-headline" }, /* @__PURE__ */ React.createElement("div", { className: `bt-headline-cell ${cache === "warm" ? "is-active" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "lab" }, "Warm cache"), /* @__PURE__ */ React.createElement("div", { className: "big" }, formatLat(totalWarm)), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "metastore + blobs hot")), /* @__PURE__ */ React.createElement("div", { className: "bt-headline-vs" }, "vs"), /* @__PURE__ */ React.createElement("div", { className: `bt-headline-cell is-cold ${cache === "cold" ? "is-active" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "lab" }, "Cold cache"), /* @__PURE__ */ React.createElement("div", { className: "big" }, formatLat(totalCold)), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "cold start \xB7 S3 round-trips")), /* @__PURE__ */ React.createElement("div", { className: "bt-headline-speedup" }, /* @__PURE__ */ React.createElement("div", { className: "big" }, speedupX, "\xD7"), /* @__PURE__ */ React.createElement("div", { className: "lab" }, "faster when warm"))),
      /* @__PURE__ */ React.createElement("div", { className: "bt-rail-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "bt-rail" }, BT_STOPS.map((s, i) => {
        const done = i < curIdx;
        const active = i === curIdx && pos > 0;
        const stripActive = s.k === "skip" && pos > 4.5;
        return /* @__PURE__ */ React.createElement("div", { key: s.k, className: `bt-stop ${done ? "done" : ""} ${active ? "on" : ""} ${s.k === "skip" ? "skip" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "bt-stop-num" }, String(i + 1).padStart(2, "0")), /* @__PURE__ */ React.createElement("div", { className: "bt-stop-node" }, s.k === "skip" && /* @__PURE__ */ React.createElement("div", { className: `bt-strip-skip ${stripActive ? "is-active" : ""}` }, "stripe 1 \xB7 stripe 2 \xB7 ", /* @__PURE__ */ React.createElement("s", null, "stripe 3"), " \xB7 stripe 4")), /* @__PURE__ */ React.createElement("div", { className: "bt-stop-name" }, s.n), /* @__PURE__ */ React.createElement("div", { className: "bt-stop-d" }, s.d), /* @__PURE__ */ React.createElement("div", { className: "bt-stop-lat" }, s[cache] >= 1e3 ? `${(s[cache] / 1e3).toFixed(1)} ms` : `${s[cache]} \u03BCs`));
      }), pos > 0 && /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "bt-particle",
          style: { left: `calc(${Math.min(pos, BT_STOPS.length) / BT_STOPS.length * 100}% - 6px)` }
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "bt-track", style: { width: `${Math.min(pos, BT_STOPS.length) / BT_STOPS.length * 100}%` } }))),
      /* @__PURE__ */ React.createElement("div", { className: "bt-readouts" }, /* @__PURE__ */ React.createElement("div", { className: "bt-ro" }, /* @__PURE__ */ React.createElement("div", { className: "bt-ro-k" }, "elapsed"), /* @__PURE__ */ React.createElement("div", { className: "bt-ro-v" }, formatLat(cumNow)), /* @__PURE__ */ React.createElement("div", { className: "bt-ro-s" }, "of ", formatLat(totalAll), " total")), /* @__PURE__ */ React.createElement("div", { className: `bt-ro ${cache === "cold" ? "warn" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "bt-ro-k" }, "cache"), /* @__PURE__ */ React.createElement("div", { className: "bt-ro-v" }, cache === "warm" ? "warm" : "cold"), /* @__PURE__ */ React.createElement("div", { className: "bt-ro-s" }, cache === "warm" ? "metastore + blobs cached" : "~100\xD7 on metastore + s3")), /* @__PURE__ */ React.createElement("div", { className: "bt-ro good" }, /* @__PURE__ */ React.createElement("div", { className: "bt-ro-k" }, "skipped stripes"), /* @__PURE__ */ React.createElement("div", { className: "bt-ro-v" }, pos > 4 ? "1 of 4" : "-"), /* @__PURE__ */ React.createElement("div", { className: "bt-ro-s" }, "predicate pushdown kicks in at step 05"))),
      /* @__PURE__ */ React.createElement("div", { className: "bt-ctrls" }, /* @__PURE__ */ React.createElement("div", { className: "sc-tabs" }, /* @__PURE__ */ React.createElement("button", { className: `sc-tab ${cache === "warm" ? "on" : ""}`, onClick: () => setCache("warm") }, "Warm cache", /* @__PURE__ */ React.createElement("span", { className: "sc-tab-sub" }, "metastore + blobs hot")), /* @__PURE__ */ React.createElement("button", { className: `sc-tab ${cache === "cold" ? "on" : ""}`, onClick: () => setCache("cold") }, "Cold cache", /* @__PURE__ */ React.createElement("span", { className: "sc-tab-sub" }, "~100\xD7 slower lookups"))), /* @__PURE__ */ React.createElement("div", { className: "sc-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: run, disabled: running }, "\u25B6 Trace byte")))
    );
  }
  function formatLat(us) {
    if (us < 1e3) return `${Math.round(us)} \u03BCs`;
    if (us < 1e6) return `${(us / 1e3).toFixed(us < 1e4 ? 1 : 0)} ms`;
    return `${(us / 1e6).toFixed(2)} s`;
  }
  const QUERIES = [
    {
      id: "scan",
      label: "Simple scan",
      sql: "SELECT id, revenue\nFROM sales\nWHERE ds = '2024-01-15'\n  AND region = 'EU';",
      logical: ["Scan \xB7 sales", "Filter \xB7 ds=2024-01-15 \u2227 region='EU'", "Project \xB7 id, revenue"],
      physical: ["TableScan(sales)", "Filter (pushed to scan)", "Project"],
      stages: [
        { k: "S0", ops: ["Scan", "Filter", "Project"], exch: null, color: "b1" }
      ]
    },
    {
      id: "hash",
      label: "Two-table hash join",
      sql: "SELECT u.country, SUM(s.revenue)\nFROM sales s\nJOIN users u ON s.user_id = u.user_id\nWHERE s.ds = '2024-01-15'\nGROUP BY u.country;",
      logical: ["Scan \xB7 sales", "Scan \xB7 users", "HashJoin \xB7 user_id", "Aggregate \xB7 GROUP BY country"],
      physical: ["TableScan(sales)", "TableScan(users)", "ExchangeHashPartitioned(user_id)", "HashJoin", "PartialAgg", "ExchangeHashPartitioned(country)", "FinalAgg"],
      stages: [
        { k: "S0", ops: ["Scan sales"], exch: "\u2192 hash(user_id)", color: "b1" },
        { k: "S1", ops: ["Scan users"], exch: "\u2192 hash(user_id)", color: "b1" },
        { k: "S2", ops: ["HashJoin", "PartialAgg"], exch: "\u2192 hash(country)", color: "b2" },
        { k: "S3", ops: ["FinalAgg"], exch: null, color: "b3" }
      ]
    },
    {
      id: "bcast",
      label: "Dimensional broadcast",
      sql: "SELECT s.*, c.country_name\nFROM sales s\nJOIN dim_country c ON s.country_id = c.id\nWHERE s.ds = '2024-01-15';",
      logical: ["Scan \xB7 sales", "Scan \xB7 dim_country", "BroadcastJoin \xB7 country_id", "Project"],
      physical: ["TableScan(sales)", "TableScan(dim_country)", "ExchangeBroadcast(dim_country)", "BroadcastJoin", "Project"],
      stages: [
        { k: "S0", ops: ["Scan sales", "BroadcastJoin", "Project"], exch: null, color: "b1" }
      ]
    }
  ];
  const DECODE_PHASES = [
    { k: "ast", t: "AST", sub: "parser \xB7 tokens \u2192 tree" },
    { k: "logical", t: "Logical plan", sub: "relational algebra \xB7 what to compute" },
    { k: "physical", t: "Physical plan", sub: "distributed \xB7 exchange types \xB7 worker count" },
    { k: "stages", t: "Stages", sub: "grouped operators \xB7 runtime DAG" }
  ];
  function SqlDecoderStage() {
    const [qid, setQid] = useState("hash");
    const Q = QUERIES.find((q) => q.id === qid);
    const [phase, setPhase] = useState(0);
    const [running, setRunning] = useState(false);
    const [skew, setSkew] = useState(false);
    const [salt, setSalt] = useState(false);
    const rafRef = useRef(null);
    const plan = () => {
      setPhase(0);
      setRunning(true);
      cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      const duration = 3600;
      const step = (t) => {
        const p = Math.min(1, (t - start) / duration);
        setPhase(p * DECODE_PHASES.length);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
        else setRunning(false);
      };
      rafRef.current = requestAnimationFrame(step);
    };
    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
    useEffect(() => {
      setPhase(0);
      setSkew(false);
      setSalt(false);
    }, [qid]);
    const phaseIdx = Math.min(DECODE_PHASES.length - 1, Math.floor(phase));
    const showLogical = phase >= 1;
    const showPhysical = phase >= 2;
    const showStages = phase >= 3;
    const gantt = useMemo(() => {
      const n = Q.stages.length;
      if (n === 1) return [{ k: Q.stages[0].k, start: 0, w: 100, color: Q.stages[0].color }];
      const gap = 2;
      const avail = 100 - gap * (n - 1);
      const weights = Q.stages.map((_, i) => i === 0 ? 28 : i === n - 1 ? 22 : 26);
      const sum = weights.reduce((a, b) => a + b, 0);
      let acc = 0;
      return Q.stages.map((s, i) => {
        const w = weights[i] / sum * avail;
        const bar = { k: s.k, start: acc, w, color: s.color };
        acc += w + gap;
        return bar;
      });
    }, [Q]);
    const NUM_WORKERS = 6;
    const workerLoad = useMemo(() => {
      if (!skew) return Array(NUM_WORKERS).fill(1);
      if (salt) return Array(NUM_WORKERS).fill(1);
      const a = Array(NUM_WORKERS).fill(0.08);
      a[0] = 1;
      return a;
    }, [skew, salt]);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live \xB7 compiler",
        title: "SQL \u2192 AST \u2192 logical \u2192 physical \u2192 stages",
        meta: "click a preset \xB7 run plan \xB7 poke skew",
        caption: "Five transformations between your text and your bytes. Engine chooses the exchange, you get the stages."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sd-top" }, /* @__PURE__ */ React.createElement("div", { className: "sd-presets" }, QUERIES.map((q) => /* @__PURE__ */ React.createElement("button", { key: q.id, className: `sd-preset ${qid === q.id ? "on" : ""}`, onClick: () => setQid(q.id) }, q.label)), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary sd-plan", onClick: plan, disabled: running }, running ? "planning\u2026" : "\u25B6 Plan")), /* @__PURE__ */ React.createElement("div", { className: "sd-sql" }, /* @__PURE__ */ React.createElement("pre", { className: "sd-sql-pre" }, Q.sql)), /* @__PURE__ */ React.createElement("div", { className: "sd-phases" }, DECODE_PHASES.map((p, i) => /* @__PURE__ */ React.createElement("div", { key: p.k, className: `sd-phase ${phase >= i + 1 ? "on" : ""} ${phaseIdx === i ? "cur" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "sd-phase-n" }, "0", i + 1), /* @__PURE__ */ React.createElement("div", { className: "sd-phase-t" }, p.t), /* @__PURE__ */ React.createElement("div", { className: "sd-phase-s" }, p.sub)))), /* @__PURE__ */ React.createElement("div", { className: "sd-plans" }, /* @__PURE__ */ React.createElement("div", { className: `sd-plan-col ${phase >= 1 ? "on" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "sd-pc-lab" }, "AST"), /* @__PURE__ */ React.createElement("div", { className: "sd-ast" }, /* @__PURE__ */ React.createElement("div", { className: "sd-ast-root" }, "SELECT"), /* @__PURE__ */ React.createElement("div", { className: "sd-ast-branch" }, /* @__PURE__ */ React.createElement("div", { className: "sd-ast-leaf" }, "projections"), /* @__PURE__ */ React.createElement("div", { className: "sd-ast-leaf" }, "from"), qid !== "scan" && /* @__PURE__ */ React.createElement("div", { className: "sd-ast-leaf" }, "join"), /* @__PURE__ */ React.createElement("div", { className: "sd-ast-leaf" }, "where"), qid === "hash" && /* @__PURE__ */ React.createElement("div", { className: "sd-ast-leaf" }, "group-by")))), /* @__PURE__ */ React.createElement("div", { className: `sd-plan-col ${showLogical ? "on" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "sd-pc-lab" }, "Logical"), /* @__PURE__ */ React.createElement("div", { className: "sd-ops" }, Q.logical.map((op, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "sd-op" }, op)))), /* @__PURE__ */ React.createElement("div", { className: `sd-plan-col ${showPhysical ? "on" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "sd-pc-lab" }, "Physical"), /* @__PURE__ */ React.createElement("div", { className: "sd-ops" }, Q.physical.map((op, i) => {
        const isExch = op.includes("Exchange");
        const isJoin = op.includes("Join");
        return /* @__PURE__ */ React.createElement("div", { key: i, className: `sd-op ${isExch ? "exch" : ""} ${isJoin ? "join" : ""}` }, op);
      }))), /* @__PURE__ */ React.createElement("div", { className: `sd-plan-col ${showStages ? "on" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "sd-pc-lab" }, "Stages"), /* @__PURE__ */ React.createElement("div", { className: "sd-stages" }, Q.stages.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.k, className: `sd-stage sd-${s.color}` }, /* @__PURE__ */ React.createElement("div", { className: "sd-stage-k" }, s.k), /* @__PURE__ */ React.createElement("div", { className: "sd-stage-ops" }, s.ops.map((o, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "sd-stage-op" }, o))), s.exch && /* @__PURE__ */ React.createElement("div", { className: "sd-stage-exch" }, s.exch))))))),
      /* @__PURE__ */ React.createElement("div", { className: "sd-bot" }, /* @__PURE__ */ React.createElement("div", { className: "sd-bot-head" }, /* @__PURE__ */ React.createElement("span", { className: "sd-bot-lab" }, "Stage Visualizer"), /* @__PURE__ */ React.createElement("span", { className: "sd-bot-meta" }, Q.stages.length, " stage", Q.stages.length > 1 ? "s" : "", " \xB7 ", NUM_WORKERS, " workers"), Q.id === "hash" && /* @__PURE__ */ React.createElement("div", { className: "sd-bot-ctrls" }, /* @__PURE__ */ React.createElement("button", { className: `sv-btn ${skew ? "on" : ""}`, onClick: () => {
        setSkew((s) => !s);
        if (skew) setSalt(false);
      } }, skew ? "\u25CF skew on" : "inject skew"), /* @__PURE__ */ React.createElement("button", { className: `sv-btn ${salt ? "on" : ""}`, onClick: () => setSalt((s) => !s), disabled: !skew }, salt ? "\u25CF salted" : "salting fix"))), /* @__PURE__ */ React.createElement("div", { className: "sd-cluster" }, /* @__PURE__ */ React.createElement("div", { className: "sd-coord" }, /* @__PURE__ */ React.createElement("div", { className: "sd-coord-dot" }), /* @__PURE__ */ React.createElement("div", { className: "sd-coord-lab" }, "Coordinator")), /* @__PURE__ */ React.createElement("div", { className: "sd-fan" }, Array.from({ length: NUM_WORKERS }).map((_, i) => {
        const load = workerLoad[i];
        const state = skew && !salt && i === 0 ? "hot" : skew && !salt ? "idle" : "go";
        return /* @__PURE__ */ React.createElement("div", { key: i, className: `sd-worker ${state}` }, /* @__PURE__ */ React.createElement("div", { className: "sd-w-bar" }, /* @__PURE__ */ React.createElement("div", { className: "sd-w-fill", style: { height: `${Math.max(6, load * 100)}%` } })), /* @__PURE__ */ React.createElement("div", { className: "sd-w-lab" }, "w", i));
      }))), /* @__PURE__ */ React.createElement("div", { className: "sd-gantt" }, /* @__PURE__ */ React.createElement("div", { className: "sd-gantt-lab" }, "timeline"), /* @__PURE__ */ React.createElement("div", { className: "sd-gantt-track" }, gantt.map((g) => /* @__PURE__ */ React.createElement("div", { key: g.k, className: `sd-gantt-bar sd-${g.color}`, style: { left: `${g.start}%`, width: `${g.w}%` } }, g.k))), /* @__PURE__ */ React.createElement("div", { className: "sd-gantt-note" }, Q.id === "scan" && "Single stage. Scan+filter+project fuse into one pipeline on each worker.", Q.id === "hash" && "Three stages. Two parallel scans, then a join stage after the shuffle, then a final aggregate.", Q.id === "bcast" && "One stage. The small dim table is broadcast to every worker: no shuffle of the big table.")))
    );
  }
  const CONNECTORS = [
    {
      id: "snowflake",
      name: "Snowflake",
      sub: "columnar files in a blob store",
      latency: "seconds",
      color: "c1",
      stats: { "files scanned": "47", "bytes read": "2.1 GB", "predicate pushdown": "stripe stats" },
      workers: "fan-out",
      note: "Workers fan out to read Parquet files from S3. Predicate pushdown via stripe stats. The big-data default."
    },
    {
      id: "redis_cache",
      name: "Redis-backed cache",
      sub: "local shards on Trino workers",
      latency: "milliseconds",
      color: "c2",
      stats: { "shards read": "12", "bytes read": "180 MB", "predicate pushdown": "row-group stats" },
      workers: "local-ssd",
      note: "Data lives on the Trino worker nodes themselves. Reads are local SSD: no network, no blob layer."
    },
    {
      id: "system",
      name: "System tables",
      sub: "in-memory engine metadata",
      latency: "microseconds",
      color: "c3",
      stats: { "rows": "8", "bytes": "1 KB", "predicate pushdown": "N/A (in-memory)" },
      workers: "coordinator",
      note: "Metadata only. No disk. The coordinator answers directly from its own memory."
    }
  ];
  function ConnectorSwitcher() {
    const [cid, setCid] = useState("snowflake");
    const C = CONNECTORS.find((c) => c.id === cid);
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live \xB7 pluggable",
        title: "Same SQL. Different physics.",
        meta: `connector: ${C.name}`,
        caption: "Trino's pluggable connector interface: the shape of the query is identical, the runtime is not."
      },
      /* @__PURE__ */ React.createElement("div", { className: "cs-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "cs-sql" }, /* @__PURE__ */ React.createElement("div", { className: "cs-sql-q" }, /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "SELECT"), " ", /* @__PURE__ */ React.createElement("span", { className: "tok-f" }, "count"), "(*) ", /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "FROM"), " x ", /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "WHERE"), " region = ", /* @__PURE__ */ React.createElement("span", { className: "tok-s" }, "'EU'"), ";")), /* @__PURE__ */ React.createElement("div", { className: "cs-tabs" }, CONNECTORS.map((c) => /* @__PURE__ */ React.createElement("button", { key: c.id, className: `cs-tab cs-${c.color} ${cid === c.id ? "on" : ""}`, onClick: () => setCid(c.id) }, /* @__PURE__ */ React.createElement("span", { className: "cs-tab-name" }, c.name), /* @__PURE__ */ React.createElement("span", { className: "cs-tab-sub" }, c.sub), /* @__PURE__ */ React.createElement("span", { className: "cs-tab-lat" }, c.latency)))), /* @__PURE__ */ React.createElement("div", { className: `cs-panel cs-${C.color}` }, /* @__PURE__ */ React.createElement("div", { className: "cs-diag" }, /* @__PURE__ */ React.createElement("div", { className: "cs-diag-head" }, "runtime physics"), C.workers === "fan-out" && /* @__PURE__ */ React.createElement("div", { className: "cs-diag-grid cs-fanout" }, /* @__PURE__ */ React.createElement("div", { className: "cs-node coord" }, "coord"), Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "cs-node worker" }, "w", i)), /* @__PURE__ */ React.createElement("div", { className: "cs-blob" }, "S3 \xB7 Parquet")), C.workers === "local-ssd" && /* @__PURE__ */ React.createElement("div", { className: "cs-diag-grid cs-local" }, /* @__PURE__ */ React.createElement("div", { className: "cs-node coord" }, "coord"), Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "cs-node worker local" }, /* @__PURE__ */ React.createElement("div", { className: "cs-node-lab" }, "w", i), /* @__PURE__ */ React.createElement("div", { className: "cs-node-ssd" }, "\u25FE SSD")))), C.workers === "coordinator" && /* @__PURE__ */ React.createElement("div", { className: "cs-diag-grid cs-memo" }, /* @__PURE__ */ React.createElement("div", { className: "cs-node coord big" }, /* @__PURE__ */ React.createElement("div", { className: "cs-node-lab" }, "coordinator"), /* @__PURE__ */ React.createElement("div", { className: "cs-node-mem" }, "\u25C6 in-memory metadata")))), /* @__PURE__ */ React.createElement("div", { className: "cs-stats" }, Object.entries(C.stats).map(([k, v]) => /* @__PURE__ */ React.createElement("div", { key: k, className: "cs-stat" }, /* @__PURE__ */ React.createElement("div", { className: "cs-stat-k" }, k), /* @__PURE__ */ React.createElement("div", { className: "cs-stat-v" }, v)))), /* @__PURE__ */ React.createElement("div", { className: "cs-note" }, C.note)))
    );
  }
  Object.assign(window, { LayerCake, ByteTrace, SqlDecoderStage, ConnectorSwitcher });
})();
