(() => {
  const { useState, useMemo, useEffect, useRef } = React;
  const COLS = 100;
  const ROWS = 40;
  const TARGET_COL = 47;
  const TABLE_GB = 100;
  const COL_GB = TABLE_GB / COLS;
  function Scanner() {
    const [mode, setMode] = useState("row");
    const [snappy, setSnappy] = useState(false);
    const [runToken, setRunToken] = useState(0);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [reads, setReads] = useState({ bytes: 0, cells: 0, colsRead: 0 });
    const [grid, setGrid] = useState(() => Array(ROWS * COLS).fill(0));
    const reset = () => {
      setRunning(false);
      setProgress(0);
      setReads({ bytes: 0, cells: 0, colsRead: 0 });
      setGrid(Array(ROWS * COLS).fill(0));
    };
    useEffect(() => {
      reset();
    }, [mode]);
    useEffect(() => {
      if (runToken === 0) return;
      let cancelled = false;
      let raf;
      const start = performance.now();
      const duration = 2800;
      setRunning(true);
      const tick = (t) => {
        if (cancelled) return;
        const p = Math.min(1, (t - start) / duration);
        setProgress(p);
        if (mode === "row") {
          const totalCells = ROWS * COLS;
          const cellsRead = Math.floor(p * totalCells);
          const ng = new Array(totalCells);
          for (let i = 0; i < totalCells; i++) {
            if (i < cellsRead) ng[i] = 2;
            else if (i < cellsRead + COLS) ng[i] = 1;
            else ng[i] = 0;
          }
          setGrid(ng);
          setReads({ bytes: p * TABLE_GB, cells: cellsRead, colsRead: COLS });
        } else {
          const stripeCells = ROWS;
          const cellsRead = Math.floor(p * stripeCells);
          const ng = new Array(ROWS * COLS).fill(0);
          for (let r = 0; r < stripeCells; r++) {
            const idx = r * COLS + TARGET_COL;
            if (r < cellsRead) ng[idx] = 2;
            else if (r === cellsRead) ng[idx] = 1;
          }
          setGrid(ng);
          const compressMul = snappy ? 0.28 : 1;
          setReads({ bytes: p * COL_GB * compressMul, cells: cellsRead, colsRead: 1 });
        }
        if (p < 1) raf = requestAnimationFrame(tick);
        else setRunning(false);
      };
      raf = requestAnimationFrame(tick);
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
      };
    }, [runToken, mode, snappy]);
    const run = () => {
      reset();
      setRunToken((n) => n + 1);
    };
    const bytesScanned = reads.bytes;
    const bytesTotal = TABLE_GB;
    const skipRatio = mode === "row" ? 0 : 1 - (snappy ? 0.28 : 1) / COLS;
    const scanTime = mode === "row" ? 100 : snappy ? 0.28 : 1;
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live simulator",
        title: "Row vs columnar scanner",
        meta: "SELECT SUM(revenue) FROM sales",
        caption: "Disk layout: 100 columns \xD7 40 rows. Scan head animates real cells being read. Source of truth is bytes."
      },
      /* @__PURE__ */ React.createElement("div", { className: "sc-query" }, /* @__PURE__ */ React.createElement("div", { className: "sc-q-ln" }, /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "SELECT"), " ", /* @__PURE__ */ React.createElement("span", { className: "tok-f" }, "SUM"), "(", /* @__PURE__ */ React.createElement("span", { className: "tok-t" }, "revenue"), ") ", /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "FROM"), " sales;"), /* @__PURE__ */ React.createElement("div", { className: "sc-q-hint" }, "\u2192 Engine needs one column out of 100.")),
      /* @__PURE__ */ React.createElement("div", { className: `sc-disk ${mode}` }, /* @__PURE__ */ React.createElement("div", { className: "sc-axis-left" }, /* @__PURE__ */ React.createElement("div", null, "col\xA00"), /* @__PURE__ */ React.createElement("div", null, "col\xA025"), /* @__PURE__ */ React.createElement("div", null, "col\xA050"), /* @__PURE__ */ React.createElement("div", null, "col\xA075"), /* @__PURE__ */ React.createElement("div", null, "col\xA099")), /* @__PURE__ */ React.createElement("div", { className: "sc-grid-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "sc-grid-head" }, /* @__PURE__ */ React.createElement("span", null, "DISK \xB7 ", mode === "row" ? "row-oriented (CSV / OLTP)" : "columnar (Parquet / ORC)"), /* @__PURE__ */ React.createElement("span", null, "target: ", /* @__PURE__ */ React.createElement("code", { className: "sc-col47" }, "col[47] revenue"))), /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "sc-grid",
          style: {
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`
          }
        },
        grid.map((v, i) => {
          const col = i % COLS;
          const isTarget = col === TARGET_COL;
          const cls = [
            "sc-c",
            v === 1 ? "head" : v === 2 ? "read" : "",
            isTarget ? "target" : "",
            mode === "col" && !isTarget ? "dark" : "",
            mode === "col" && isTarget && snappy && v === 2 ? "snappy" : ""
          ].filter(Boolean).join(" ");
          return /* @__PURE__ */ React.createElement("span", { key: i, className: cls });
        })
      ), /* @__PURE__ */ React.createElement("div", { className: "sc-prog" }, /* @__PURE__ */ React.createElement("div", { className: "sc-prog-lab" }, "scan progress"), /* @__PURE__ */ React.createElement("div", { className: "sc-prog-bar" }, /* @__PURE__ */ React.createElement("div", { className: "sc-prog-fill", style: { width: `${progress * 100}%` } })), /* @__PURE__ */ React.createElement("div", { className: "sc-prog-val" }, Math.round(progress * 100), "%")))),
      /* @__PURE__ */ React.createElement("div", { className: "sc-stats" }, /* @__PURE__ */ React.createElement("div", { className: `sc-stat ${mode === "row" ? "warn" : "good"}` }, /* @__PURE__ */ React.createElement("div", { className: "sc-stat-k" }, "bytes scanned"), /* @__PURE__ */ React.createElement("div", { className: "sc-stat-v" }, bytesScanned.toFixed(2), /* @__PURE__ */ React.createElement("span", { className: "u" }, " GB")), /* @__PURE__ */ React.createElement("div", { className: "sc-stat-s" }, "of ", bytesTotal, " GB on disk")), /* @__PURE__ */ React.createElement("div", { className: "sc-stat" }, /* @__PURE__ */ React.createElement("div", { className: "sc-stat-k" }, "columns read"), /* @__PURE__ */ React.createElement("div", { className: "sc-stat-v" }, reads.colsRead, /* @__PURE__ */ React.createElement("span", { className: "u" }, " / 100")), /* @__PURE__ */ React.createElement("div", { className: "sc-stat-s" }, mode === "row" ? "row layout forces full scan" : "projection pushdown")), /* @__PURE__ */ React.createElement("div", { className: `sc-stat ${mode === "col" ? "good" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "sc-stat-k" }, "efficiency"), /* @__PURE__ */ React.createElement("div", { className: "sc-stat-v" }, mode === "row" ? "1\xD7" : `${Math.round(1 / ((snappy ? 0.28 : 1) / COLS))}\xD7`), /* @__PURE__ */ React.createElement("div", { className: "sc-stat-s" }, mode === "row" ? "baseline" : `${Math.round((1 - (snappy ? 0.28 : 1) / COLS) * 100)}% of disk skipped`)), /* @__PURE__ */ React.createElement("div", { className: "sc-stat" }, /* @__PURE__ */ React.createElement("div", { className: "sc-stat-k" }, "scan time"), /* @__PURE__ */ React.createElement("div", { className: "sc-stat-v" }, scanTime.toFixed(2), /* @__PURE__ */ React.createElement("span", { className: "u" }, " s")), /* @__PURE__ */ React.createElement("div", { className: "sc-stat-s" }, "at 1 GB/s"))),
      /* @__PURE__ */ React.createElement("div", { className: "sc-ctrls" }, /* @__PURE__ */ React.createElement("div", { className: "sc-tabs" }, /* @__PURE__ */ React.createElement("button", { className: `sc-tab ${mode === "row" ? "on" : ""}`, onClick: () => setMode("row") }, "Row-oriented", /* @__PURE__ */ React.createElement("span", { className: "sc-tab-sub" }, "CSV \xB7 JSON \xB7 Postgres")), /* @__PURE__ */ React.createElement("button", { className: `sc-tab ${mode === "col" ? "on" : ""}`, onClick: () => setMode("col") }, "Columnar", /* @__PURE__ */ React.createElement("span", { className: "sc-tab-sub" }, "Parquet \xB7 ORC"))), /* @__PURE__ */ React.createElement("label", { className: `sc-check ${mode !== "col" ? "dis" : ""}` }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", disabled: mode !== "col", checked: snappy && mode === "col", onChange: (e) => setSnappy(e.target.checked) }), /* @__PURE__ */ React.createElement("span", { className: "sc-check-lab" }, "Snappy compression"), /* @__PURE__ */ React.createElement("span", { className: "sc-check-sub" }, "shrinks column stripe ~3.5\xD7")), /* @__PURE__ */ React.createElement("div", { className: "sc-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: reset, disabled: running }, "Reset"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: run, disabled: running }, "\u25B6 Run scan")))
    );
  }
  function FormatSpectrum() {
    const formats = [
      { name: "CSV / JSON", kind: "row", tagline: "Human-readable. No schema. No types. No compression. Fine for hand-off, terrible for analytics.", traits: ["row", "no-schema", "uncompressed"] },
      { name: "Parquet / ORC", kind: "col", tagline: "Columnar on disk. Schema + types embedded. Snappy/ZSTD. The analytical default.", traits: ["columnar", "schema", "compressed"] },
      { name: "Iceberg / Delta / Hudi", kind: "tbl", tagline: "A table format on top of Parquet: metadata manifests that give you ACID, schema evolution, time travel.", traits: ["ACID", "time-travel", "schema-evolution"] }
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "fmt-strip" }, formats.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: f.name, className: `fmt-card k-${f.kind}` }, /* @__PURE__ */ React.createElement("div", { className: "fmt-n" }, "0", i + 1), /* @__PURE__ */ React.createElement("div", { className: "fmt-name" }, f.name), /* @__PURE__ */ React.createElement("div", { className: "fmt-tag" }, f.tagline), /* @__PURE__ */ React.createElement("div", { className: "fmt-traits" }, f.traits.map((t) => /* @__PURE__ */ React.createElement("span", { key: t, className: "fmt-chip" }, t))))));
  }
  function LakehouseDiagram() {
    return /* @__PURE__ */ React.createElement("div", { className: "lh-diagram" }, /* @__PURE__ */ React.createElement("div", { className: "lh-side legacy" }, /* @__PURE__ */ React.createElement("div", { className: "lh-badge" }, "Legacy \xB7 coupled"), /* @__PURE__ */ React.createElement("div", { className: "lh-stack" }, /* @__PURE__ */ React.createElement("div", { className: "lh-box tight" }, "Oracle \xB7 Teradata \xB7 on-prem MPP"), /* @__PURE__ */ React.createElement("div", { className: "lh-note" }, "One box. Compute tied to its own disks. Scale one, scale both. Upgrade = migration."))), /* @__PURE__ */ React.createElement("div", { className: "lh-arrow" }, "DECOUPLE \u2192"), /* @__PURE__ */ React.createElement("div", { className: "lh-side modern" }, /* @__PURE__ */ React.createElement("div", { className: "lh-badge mint" }, "Modern \xB7 lakehouse"), /* @__PURE__ */ React.createElement("div", { className: "lh-stack" }, /* @__PURE__ */ React.createElement("div", { className: "lh-box lh-compute" }, /* @__PURE__ */ React.createElement("div", { className: "lh-k" }, "Compute (elastic)"), /* @__PURE__ */ React.createElement("div", { className: "lh-v" }, "Presto \xB7 Spark \xB7 Trino")), /* @__PURE__ */ React.createElement("div", { className: "lh-k-arrow" }, "reads"), /* @__PURE__ */ React.createElement("div", { className: "lh-box lh-storage" }, /* @__PURE__ */ React.createElement("div", { className: "lh-k" }, "Storage (cheap, shared)"), /* @__PURE__ */ React.createElement("div", { className: "lh-v" }, "Parquet \xB7 ORC \xB7 HDFS \xB7 S3")), /* @__PURE__ */ React.createElement("div", { className: "lh-note" }, "Many engines read the same bytes. Compute spins up per-query, storage costs cents."))));
  }
  function EngineCards() {
    const engines = [
      { n: "Presto / Trino", kind: "MPP, in-memory", fits: "Interactive dashboards. Sub-second to tens of seconds.", not: "Hour-long ETL jobs: it dies, can't retry.", icon: /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "22", height: "22" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "9", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }), /* @__PURE__ */ React.createElement("path", { d: "M8 12h8M12 8v8", stroke: "currentColor", strokeWidth: "1.5" })) },
      { n: "Spark / Databricks", kind: "distributed, fault-tolerant", fits: "Heavy ETL. Big joins. Anything that must finish.", not: "Quick ad-hoc: the JVM spin-up alone eats your latency.", icon: /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "22", height: "22" }, /* @__PURE__ */ React.createElement("path", { d: "M4 12l4-8 4 6 4-4 4 10", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" })) },
      { n: "Snowflake", kind: "cloud DW \u2192 lakehouse", fits: "Managed. Zero-ops. Good price/perf on mid-scale.", not: "Anywhere you need to read external Parquet from a non-Snowflake engine.", icon: /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "22", height: "22" }, /* @__PURE__ */ React.createElement("path", { d: "M12 3v18M4.5 7.5l15 9M4.5 16.5l15-9", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })) }
    ];
    return /* @__PURE__ */ React.createElement("div", { className: "eng-cards" }, engines.map((e) => /* @__PURE__ */ React.createElement("div", { className: "eng-card", key: e.n }, /* @__PURE__ */ React.createElement("div", { className: "eng-icon" }, e.icon), /* @__PURE__ */ React.createElement("div", { className: "eng-n" }, e.n), /* @__PURE__ */ React.createElement("div", { className: "eng-kind" }, e.kind), /* @__PURE__ */ React.createElement("div", { className: "eng-row" }, /* @__PURE__ */ React.createElement("span", { className: "eng-k mint" }, "Fits"), " ", /* @__PURE__ */ React.createElement("span", { className: "eng-v" }, e.fits)), /* @__PURE__ */ React.createElement("div", { className: "eng-row" }, /* @__PURE__ */ React.createElement("span", { className: "eng-k amber" }, "Avoid"), " ", /* @__PURE__ */ React.createElement("span", { className: "eng-v" }, e.not)))));
  }
  function Ch0_Fundamentals({ chapter, internalMode }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.ink,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: "Core fundamentals: <span class='accent'>storage, formats, engines.</span>",
        hook: "Before we talk about engines, we talk about physics. The shape of bytes on disk and the engine that reads them decides whether your query is a sip or a flood. <strong>Everything else is a consequence of this.</strong>",
        meta: [
          { k: "Covers", v: '<span class="chip">Lakehouse</span><span class="chip">Row vs columnar</span><span class="chip">Parquet</span><span class="chip">Iceberg</span>' },
          { k: "Engines", v: "Presto \xB7 Spark \xB7 Trino \xB7 Snowflake" },
          { k: "Outcome", v: "Read 100\xD7 less disk per query" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "0.1" }, "Decoupling storage from compute"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "The quiet shift that changed every warehouse."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A decade ago, a warehouse was a box. Oracle, Teradata, Vertica: one appliance owned both the disks and the query engine. You bought them together, you scaled them together, and if you wanted to try a new engine you migrated terabytes first."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "The ", /* @__PURE__ */ React.createElement("b", null, "lakehouse"), " move was to put the bytes in a shared object store: S3, GCS, or Azure Blob \u2014 as open columnar files (Parquet, ORC) \u2014 and let ", /* @__PURE__ */ React.createElement("em", null, "any"), " engine read them. Compute became a job, not a server. Storage became a commodity."), /* @__PURE__ */ React.createElement(LakehouseDiagram, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "0.2" }, "The layers"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Seven layers, one query."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A warehouse query touches seven layers. Most engineers only think about two - the SQL they wrote and the table they named, and are baffled when things break in between. The stack, bottom-up: ", /* @__PURE__ */ React.createElement("b", null, "physical storage"), " (SSD blob tier), ", /* @__PURE__ */ React.createElement("b", null, "blob"), " (S3),", /* @__PURE__ */ React.createElement("b", null, " file format"), " (Parquet \xB7 ORC \xB7 Avro), ", /* @__PURE__ */ React.createElement("b", null, "table abstraction"), " (namespaces \u2192 tables \u2192 partitions),", /* @__PURE__ */ React.createElement("b", null, " catalog"), " (Glue Catalog), ", /* @__PURE__ */ React.createElement("b", null, "query engine"), " (Presto \xB7 Spark), ", /* @__PURE__ */ React.createElement("b", null, "application"), " (Hex \xB7 dashboards). Knowing the layer means knowing the failure mode."), /* @__PURE__ */ React.createElement(LayerCake, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "0.3" }, "A byte's journey"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "From SELECT to flash tier, and back."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Let's make storage tangible. Here's a single byte: the value of ", /* @__PURE__ */ React.createElement("code", null, "user_email"), " for one row - traced through every stop from the SQL statement to the physical bytes on disk. Cold and warm caches have wildly different latency profiles; metastore and blob lookups are the two stops that dominate a cold run."), /* @__PURE__ */ React.createElement(ByteTrace, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "0.4" }, "Row vs columnar, visualized"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Why analytics loves columns."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, `In a row layout every record's fields are stored together: perfect for "fetch user 42" but catastrophic for "average `, /* @__PURE__ */ React.createElement("code", null, "revenue"), ' across a billion rows". The scanner has no choice but to touch every byte just to find the one column you asked for.'), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Columnar flips it: all values of ", /* @__PURE__ */ React.createElement("code", null, "revenue"), " are stored contiguously on disk. The engine can ", /* @__PURE__ */ React.createElement("strong", null, "skip 99% of the table"), " and go straight to the column it needs. This is called ", /* @__PURE__ */ React.createElement("em", null, "projection pushdown"), ", and it's the single biggest reason Parquet is the analytical default."), /* @__PURE__ */ React.createElement(Scanner, null), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { marginTop: 24 } }, "Columnar storage compresses beautifully because values in one column are homogenous: a column of timestamps, a column of country codes. Snappy, ZSTD, and run-length encoding routinely shrink a stripe ", /* @__PURE__ */ React.createElement("strong", null, "3\u201310\xD7"), ". The scan head has less to read ", /* @__PURE__ */ React.createElement("em", null, "and"), " the bytes it reads unpack cheaply.")), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "0.5" }, "The file-format spectrum"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "From CSV to Iceberg."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "There's a layered vocabulary worth getting right. ", /* @__PURE__ */ React.createElement("b", null, "File format"), " is how bytes sit on disk.", /* @__PURE__ */ React.createElement("b", null, " Table format"), " is a catalog of files that makes them behave like a table: transactional, evolvable, time-travelable."), /* @__PURE__ */ React.createElement(FormatSpectrum, null), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { marginTop: 18 } }, "You rarely pick just one. A modern pipeline lands raw JSON, converts to Parquet at ingest, and registers the Parquet in an ", /* @__PURE__ */ React.createElement("strong", null, "Iceberg"), " table so ", /* @__PURE__ */ React.createElement("code", null, "SELECT ... FOR VERSION AS OF"), " works and a bad backfill is one SQL away from rolled back.")), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "0.6" }, "How a query becomes work"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Five transformations between your text and your bytes."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, 'New hires think SQL "just runs." In fact a coordinator takes your statement through a pipeline: parser builds an ', /* @__PURE__ */ React.createElement("b", null, "AST"), ", analyzer resolves names against the catalog, planner emits a", /* @__PURE__ */ React.createElement("b", null, " logical"), " tree of relational operators, then a ", /* @__PURE__ */ React.createElement("b", null, "physical"), " plan with exchange types and worker counts, and finally a ", /* @__PURE__ */ React.createElement("b", null, "task graph"), " of stages dispatched across the cluster. Every step is inspectable via ", /* @__PURE__ */ React.createElement("code", null, "EXPLAIN ANALYZE"), "."), /* @__PURE__ */ React.createElement(SqlDecoderStage, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "0.7" }, "The engine ecosystem"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Pick the engine for the query, not the other way round."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Decoupled storage means you can run ", /* @__PURE__ */ React.createElement("em", null, "different"), " engines against the ", /* @__PURE__ */ React.createElement("em", null, "same"), " bytes depending on what you're doing. Interactive dashboards want sub-second response; hour-long ETL wants fault tolerance. One engine is rarely best at both."), /* @__PURE__ */ React.createElement(EngineCards, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "0.8" }, "Connectors: same SQL, different physics"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "The connector chooses the physics."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Trino (the open-source MPP query engine, originally PrestoSQL) ships a pluggable connector interface: the same SQL statement can compile down to fanning out across a thousand S3 blobs, or reading a few megabytes from local SSD, or answering straight from coordinator memory. Latency can vary by ", /* @__PURE__ */ React.createElement("b", null, "six orders of magnitude"), " with no change to the query text."), /* @__PURE__ */ React.createElement(ConnectorSwitcher, null)), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Treating a data lake like a relational DB.</b> <code>UPDATE one_row WHERE id = ...</code> on raw Parquet rewrites an entire file. Use a table format (Iceberg/Delta) that supports row-level changes, or batch the update.",
      "<b>The small-files problem.</b> 10 000 \xD7 1 MB Parquet files is worse than 10 \xD7 1 GB: file-listing overhead, per-file footer reads, and task spin-up dominate. Compact on a schedule.",
      "<b>Landing raw CSV in the warehouse.</b> Types unknown, no column pruning, no compression. Always convert to Parquet at ingest.",
      "<b><code>SELECT *</code> on a 300-column fact table.</b> Undoes everything columnar gave you. Ask for exactly the columns you need.",
      "<b>Treating Trino and PrestoDB as identical.</b> Trino (formerly PrestoSQL) and PrestoDB diverged around 2020 and have since drifted significantly \u2014 function names, connector behavior, and optimizer defaults all differ. Check which one your cluster runs before copy-pasting docs.",
      "<b>Treating SQL as opaque magic.</b> Every query has a plan, and the plan is inspectable. <code>EXPLAIN ANALYZE</code> before you tune anything.",
      "<b>Choosing Spark for a job Presto would finish in seconds.</b> Spark cold-start is 2\u201310\xD7 Presto's: the JVM warm-up alone eats any interactive budget."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>A warehouse is seven layers.</b> Knowing the layer means knowing the failure mode: metastore down is not the same as SSD tier slow.",
      "<b>SQL \u2192 AST \u2192 logical \u2192 physical \u2192 stages \u2192 tasks.</b> Five transformations between your text and your bytes. All inspectable.",
      "<b>The connector chooses the physics.</b> Same SQL, 1000\xD7 latency range. Snowflake \u2260 Redis-backed cache \u2260 System tables.",
      "Columnar formats turn analytics into <b>skip-most-of-the-disk</b> operations. Table formats add ACID and time travel on top.",
      "Read the plan before you tune the query. Filter on partition and indexed columns first. Avoid <code>SELECT *</code>."
    ] }));
  }
  window.Ch0_Fundamentals = Ch0_Fundamentals;
})();
