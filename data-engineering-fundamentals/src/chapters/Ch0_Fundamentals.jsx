/* global React, Hero, SectionLabel, AntiPatterns, BestPractices, Takeaway, Panel, useInView, LayerCake, ByteTrace, SqlDecoderStage, ConnectorSwitcher */

const { useState, useMemo, useEffect, useRef } = React;

/* ============================================================
 * Row vs Columnar Scanner — the flagship simulator
 * Visualizes a 100-column × 100-block disk.
 * Row mode: every block contains a contiguous row, scanner must
 *   read all cells to find `revenue`. Animate: sweep every cell.
 * Columnar mode: each column lives in its own stripe on disk.
 *   Scanner jumps directly to col 47 (revenue). Animate: light up
 *   only the stripe. Snappy compression visually shrinks the stripe.
 * ============================================================ */

const COLS = 100;
const ROWS = 40;         // visual rows inside disk
const TARGET_COL = 47;   // column named "revenue"
const TABLE_GB = 100;    // total table size
const COL_GB = TABLE_GB / COLS; // 1 GB per column

function Scanner() {
  const [mode, setMode] = useState('row');     // 'row' | 'col'
  const [snappy, setSnappy] = useState(false);
  const [runToken, setRunToken] = useState(0); // increment to start a run
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [reads, setReads] = useState({ bytes: 0, cells: 0, colsRead: 0 });

  // Visual grid state: each cell has a lit status (0 idle, 1 active, 2 read)
  const [grid, setGrid] = useState(() => Array(ROWS * COLS).fill(0));

  const reset = () => {
    setRunning(false);
    setProgress(0);
    setReads({ bytes: 0, cells: 0, colsRead: 0 });
    setGrid(Array(ROWS * COLS).fill(0));
  };

  // Reset visuals when mode changes
  useEffect(() => { reset(); /* eslint-disable-next-line */ }, [mode]);

  // The animation effect — keyed on runToken so we get a fresh raf chain per run
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

      if (mode === 'row') {
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
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [runToken, mode, snappy]);

  const run = () => { reset(); setRunToken(n => n + 1); };

  // Efficiency — bytes skipped
  const bytesScanned = reads.bytes;
  const bytesTotal = TABLE_GB;
  const skipRatio = mode === 'row' ? 0 : (1 - (snappy ? 0.28 : 1) / COLS);
  const scanTime = mode === 'row' ? 100 : (snappy ? 0.28 : 1); // seconds @ 1GB/s notional

  return (
    <Panel eyebrow="live simulator" title="Row vs columnar scanner" meta="SELECT SUM(revenue) FROM sales"
           caption="Disk layout: 100 columns × 40 rows. Scan head animates real cells being read. Source of truth is bytes.">
      {/* Query bar */}
      <div className="sc-query">
        <div className="sc-q-ln"><span className="tok-k">SELECT</span> <span className="tok-f">SUM</span>(<span className="tok-t">revenue</span>) <span className="tok-k">FROM</span> sales;</div>
        <div className="sc-q-hint">→ Engine needs one column out of 100.</div>
      </div>

      {/* Disk grid */}
      <div className={`sc-disk ${mode}`}>
        <div className="sc-axis-left">
          <div>col&nbsp;0</div><div>col&nbsp;25</div><div>col&nbsp;50</div><div>col&nbsp;75</div><div>col&nbsp;99</div>
        </div>
        <div className="sc-grid-wrap">
          <div className="sc-grid-head">
            <span>DISK · {mode === 'row' ? 'row-oriented (CSV / OLTP)' : 'columnar (Parquet / ORC)'}</span>
            <span>target: <code className="sc-col47">col[47] revenue</code></span>
          </div>
          <div className="sc-grid"
               style={{
                 gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                 gridTemplateRows: `repeat(${ROWS}, 1fr)`,
               }}>
            {grid.map((v, i) => {
              const col = i % COLS;
              const isTarget = col === TARGET_COL;
              const cls = [
                'sc-c',
                v === 1 ? 'head' : v === 2 ? 'read' : '',
                isTarget ? 'target' : '',
                mode === 'col' && !isTarget ? 'dark' : '',
                mode === 'col' && isTarget && snappy && v === 2 ? 'snappy' : '',
              ].filter(Boolean).join(' ');
              return <span key={i} className={cls} />;
            })}
          </div>
          {/* Progress gauge */}
          <div className="sc-prog">
            <div className="sc-prog-lab">scan progress</div>
            <div className="sc-prog-bar"><div className="sc-prog-fill" style={{width: `${progress*100}%`}} /></div>
            <div className="sc-prog-val">{Math.round(progress * 100)}%</div>
          </div>
        </div>
      </div>

      {/* Readouts */}
      <div className="sc-stats">
        <div className={`sc-stat ${mode === 'row' ? 'warn' : 'good'}`}>
          <div className="sc-stat-k">bytes scanned</div>
          <div className="sc-stat-v">{bytesScanned.toFixed(2)}<span className="u"> GB</span></div>
          <div className="sc-stat-s">of {bytesTotal} GB on disk</div>
        </div>
        <div className="sc-stat">
          <div className="sc-stat-k">columns read</div>
          <div className="sc-stat-v">{reads.colsRead}<span className="u"> / 100</span></div>
          <div className="sc-stat-s">{mode === 'row' ? 'row layout forces full scan' : 'projection pushdown'}</div>
        </div>
        <div className={`sc-stat ${mode === 'col' ? 'good' : ''}`}>
          <div className="sc-stat-k">efficiency</div>
          <div className="sc-stat-v">{mode === 'row' ? '1×' : `${Math.round(1/(((snappy?0.28:1))/COLS))}×`}</div>
          <div className="sc-stat-s">{mode === 'row' ? 'baseline' : `${Math.round((1 - (snappy?0.28:1)/COLS) * 100)}% of disk skipped`}</div>
        </div>
        <div className="sc-stat">
          <div className="sc-stat-k">scan time</div>
          <div className="sc-stat-v">{scanTime.toFixed(2)}<span className="u"> s</span></div>
          <div className="sc-stat-s">at 1 GB/s</div>
        </div>
      </div>

      {/* Controls */}
      <div className="sc-ctrls">
        <div className="sc-tabs">
          <button className={`sc-tab ${mode==='row'?'on':''}`} onClick={() => setMode('row')}>
            Row-oriented<span className="sc-tab-sub">CSV · JSON · Postgres</span>
          </button>
          <button className={`sc-tab ${mode==='col'?'on':''}`} onClick={() => setMode('col')}>
            Columnar<span className="sc-tab-sub">Parquet · ORC</span>
          </button>
        </div>
        <label className={`sc-check ${mode!=='col'?'dis':''}`}>
          <input type="checkbox" disabled={mode!=='col'} checked={snappy && mode==='col'} onChange={(e) => setSnappy(e.target.checked)} />
          <span className="sc-check-lab">Snappy compression</span>
          <span className="sc-check-sub">shrinks column stripe ~3.5×</span>
        </label>
        <div className="sc-actions">
          <button className="btn" onClick={reset} disabled={running}>Reset</button>
          <button className="btn btn-primary" onClick={run} disabled={running}>▶ Run scan</button>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
 * Format spectrum strip — CSV → Parquet → Iceberg
 * ============================================================ */
function FormatSpectrum() {
  const formats = [
    { name: 'CSV / JSON', kind: 'row', tagline: 'Human-readable. No schema. No types. No compression. Fine for hand-off, terrible for analytics.', traits: ['row', 'no-schema', 'uncompressed'] },
    { name: 'Parquet / ORC', kind: 'col', tagline: 'Columnar on disk. Schema + types embedded. Snappy/ZSTD. The analytical default.', traits: ['columnar', 'schema', 'compressed'] },
    { name: 'Iceberg / Delta / Hudi', kind: 'tbl', tagline: 'A table format on top of Parquet: metadata manifests that give you ACID, schema evolution, time travel.', traits: ['ACID', 'time-travel', 'schema-evolution'] },
  ];
  return (
    <div className="fmt-strip">
      {formats.map((f, i) => (
        <div key={f.name} className={`fmt-card k-${f.kind}`}>
          <div className="fmt-n">0{i+1}</div>
          <div className="fmt-name">{f.name}</div>
          <div className="fmt-tag">{f.tagline}</div>
          <div className="fmt-traits">
            {f.traits.map(t => <span key={t} className="fmt-chip">{t}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
 * Lakehouse vs monolith diagram — static but polished
 * ============================================================ */
function LakehouseDiagram() {
  return (
    <div className="lh-diagram">
      <div className="lh-side legacy">
        <div className="lh-badge">Legacy · coupled</div>
        <div className="lh-stack">
          <div className="lh-box tight">Oracle · Teradata · on-prem MPP</div>
          <div className="lh-note">One box. Compute tied to its own disks. Scale one, scale both. Upgrade = migration.</div>
        </div>
      </div>
      <div className="lh-arrow">DECOUPLE →</div>
      <div className="lh-side modern">
        <div className="lh-badge mint">Modern · lakehouse</div>
        <div className="lh-stack">
          <div className="lh-box lh-compute">
            <div className="lh-k">Compute (elastic)</div>
            <div className="lh-v">Presto · Spark · Trino</div>
          </div>
          <div className="lh-k-arrow">reads</div>
          <div className="lh-box lh-storage">
            <div className="lh-k">Storage (cheap, shared)</div>
            <div className="lh-v">Parquet · ORC · HDFS · S3</div>
          </div>
          <div className="lh-note">Many engines read the same bytes. Compute spins up per-query, storage costs cents.</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Engine comparison — Presto / Spark / Snowflake cards
 * ============================================================ */
function EngineCards() {
  const engines = [
    { n: 'Presto / Trino', kind: 'MPP, in-memory', fits: 'Interactive dashboards. Sub-second to tens of seconds.', not: 'Hour-long ETL jobs: it dies, can\'t retry.', icon: <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { n: 'Spark / Databricks', kind: 'distributed, fault-tolerant', fits: 'Heavy ETL. Big joins. Anything that must finish.', not: 'Quick ad-hoc: the JVM spin-up alone eats your latency.', icon: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 12l4-8 4 6 4-4 4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
    { n: 'Snowflake', kind: 'cloud DW → lakehouse', fits: 'Managed. Zero-ops. Good price/perf on mid-scale.', not: 'Anywhere you need to read external Parquet from a non-Snowflake engine.', icon: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3v18M4.5 7.5l15 9M4.5 16.5l15-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ];
  return (
    <div className="eng-cards">
      {engines.map(e => (
        <div className="eng-card" key={e.n}>
          <div className="eng-icon">{e.icon}</div>
          <div className="eng-n">{e.n}</div>
          <div className="eng-kind">{e.kind}</div>
          <div className="eng-row"><span className="eng-k mint">Fits</span> <span className="eng-v">{e.fits}</span></div>
          <div className="eng-row"><span className="eng-k amber">Avoid</span> <span className="eng-v">{e.not}</span></div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================ */
function Ch0_Fundamentals({ chapter, internalMode }) {
  return (
    <>
      <Hero accent={chapter.hex}
            eyebrow={`Chapter ${chapter.n} · ${chapter.time}`}
            title="Core fundamentals: <span class='accent'>storage, formats, engines.</span>"
            hook="Before we talk about engines, we talk about physics. The shape of bytes on disk and the engine that reads them decides whether your query is a sip or a flood. <strong>Everything else is a consequence of this.</strong>"
            meta={[
              { k: 'Covers', v: '<span class="chip">Lakehouse</span><span class="chip">Row vs columnar</span><span class="chip">Parquet</span><span class="chip">Iceberg</span>' },
              { k: 'Engines', v: 'Presto · Spark · Trino · Snowflake' },
              { k: 'Outcome', v: 'Read 100× less disk per query' },
            ]} />

      {/* --- 0.1 Decoupling --- */}
      <section className="section">
        <SectionLabel n="0.1">Decoupling storage from compute</SectionLabel>
        <h2 className="h2">The quiet shift that changed every warehouse.</h2>
        <p className="prose">
          A decade ago, a warehouse was a box. Oracle, Teradata, Vertica: one appliance owned both the
          disks and the query engine. You bought them together, you scaled them together, and if you
          wanted to try a new engine you migrated terabytes first.
        </p>
        <p className="prose">
          The <b>lakehouse</b> move was to put the bytes in a shared object store: S3, GCS, or
          Azure Blob — as open columnar files (Parquet, ORC) — and let <em>any</em> engine
          read them. Compute became a job, not a server. Storage became a commodity.
        </p>

        <LakehouseDiagram />
      </section>

      {/* --- §1 The Layers --- */}
      <section className="section">
        <SectionLabel n="0.2">The layers</SectionLabel>
        <h2 className="h2">Seven layers, one query.</h2>
        <p className="prose">
          A warehouse query touches seven layers. Most engineers only think about two -
          the SQL they wrote and the table they named, and are baffled when things break in between.
          The stack, bottom-up: <b>physical storage</b> (SSD blob tier), <b>blob</b> (S3),
          <b> file format</b> (Parquet · ORC · Avro), <b>table abstraction</b> (namespaces → tables → partitions),
          <b> catalog</b> (Glue Catalog), <b>query engine</b> (Presto · Spark), <b>application</b> (Hex · dashboards).
          Knowing the layer means knowing the failure mode.
        </p>
        <LayerCake />
      </section>

      {/* --- §2 Byte trace --- */}
      <section className="section">
        <SectionLabel n="0.3">A byte's journey</SectionLabel>
        <h2 className="h2">From SELECT to flash tier, and back.</h2>
        <p className="prose">
          Let's make storage tangible. Here's a single byte: the value of <code>user_email</code> for one row -
          traced through every stop from the SQL statement to the physical bytes on disk. Cold and warm caches
          have wildly different latency profiles; metastore and blob lookups are the two stops that dominate a
          cold run.
        </p>
        <ByteTrace />
      </section>

      {/* --- Row vs columnar (flagship sim) --- */}
      <section className="section">
        <SectionLabel n="0.4">Row vs columnar, visualized</SectionLabel>
        <h2 className="h2">Why analytics loves columns.</h2>
        <p className="prose">
          In a row layout every record's fields are stored together: perfect for "fetch user 42" but
          catastrophic for "average <code>revenue</code> across a billion rows". The scanner has no choice
          but to touch every byte just to find the one column you asked for.
        </p>
        <p className="prose">
          Columnar flips it: all values of <code>revenue</code> are stored contiguously on disk.
          The engine can <strong>skip 99% of the table</strong> and go straight to the column it needs.
          This is called <em>projection pushdown</em>, and it's the single biggest reason Parquet is the analytical default.
        </p>

        <Scanner />

        <p className="prose" style={{marginTop: 24}}>
          Columnar storage compresses beautifully because values in one column are homogenous: a column
          of timestamps, a column of country codes. Snappy, ZSTD, and run-length encoding routinely
          shrink a stripe <strong>3–10×</strong>. The scan head has less to read <em>and</em> the bytes it
          reads unpack cheaply.
        </p>
      </section>

      {/* --- Format spectrum --- */}
      <section className="section">
        <SectionLabel n="0.5">The file-format spectrum</SectionLabel>
        <h2 className="h2">From CSV to Iceberg.</h2>
        <p className="prose">
          There's a layered vocabulary worth getting right. <b>File format</b> is how bytes sit on disk.
          <b> Table format</b> is a catalog of files that makes them behave like a table: transactional,
          evolvable, time-travelable.
        </p>
        <FormatSpectrum />
        <p className="prose" style={{marginTop: 18}}>
          You rarely pick just one. A modern pipeline lands raw JSON, converts to Parquet at ingest, and
          registers the Parquet in an <strong>Iceberg</strong> table so <code>SELECT ... FOR VERSION AS OF</code> works
          and a bad backfill is one SQL away from rolled back.
        </p>
      </section>

      {/* --- §3 SQL decoder + stage visualizer --- */}
      <section className="section">
        <SectionLabel n="0.6">How a query becomes work</SectionLabel>
        <h2 className="h2">Five transformations between your text and your bytes.</h2>
        <p className="prose">
          New hires think SQL "just runs." In fact a coordinator takes your statement through a pipeline:
          parser builds an <b>AST</b>, analyzer resolves names against the catalog, planner emits a
          <b> logical</b> tree of relational operators, then a <b>physical</b> plan with exchange types and
          worker counts, and finally a <b>task graph</b> of stages dispatched across the cluster. Every step
          is inspectable via <code>EXPLAIN ANALYZE</code>.
        </p>
        <SqlDecoderStage />
      </section>

      {/* --- Engine ecosystem --- */}
      <section className="section">
        <SectionLabel n="0.7">The engine ecosystem</SectionLabel>
        <h2 className="h2">Pick the engine for the query, not the other way round.</h2>
        <p className="prose">
          Decoupled storage means you can run <em>different</em> engines against the <em>same</em> bytes
          depending on what you're doing. Interactive dashboards want sub-second response; hour-long ETL
          wants fault tolerance. One engine is rarely best at both.
        </p>
        <EngineCards />
      </section>

      {/* --- §4 Connectors --- */}
      <section className="section">
        <SectionLabel n="0.8">Connectors: same SQL, different physics</SectionLabel>
        <h2 className="h2">The connector chooses the physics.</h2>
        <p className="prose">
          Trino (the open-source MPP query engine, originally PrestoSQL) ships a pluggable connector interface: the same SQL statement can compile down to fanning
          out across a thousand S3 blobs, or reading a few megabytes from local SSD, or answering
          straight from coordinator memory. Latency can vary by <b>six orders of magnitude</b> with no change
          to the query text.
        </p>
        <ConnectorSwitcher />
      </section>

      {/* --- Anti-patterns --- */}
      <AntiPatterns items={[
        "<b>Treating a data lake like a relational DB.</b> <code>UPDATE one_row WHERE id = ...</code> on raw Parquet rewrites an entire file. Use a table format (Iceberg/Delta) that supports row-level changes, or batch the update.",
        "<b>The small-files problem.</b> 10 000 × 1 MB Parquet files is worse than 10 × 1 GB: file-listing overhead, per-file footer reads, and task spin-up dominate. Compact on a schedule.",
        "<b>Landing raw CSV in the warehouse.</b> Types unknown, no column pruning, no compression. Always convert to Parquet at ingest.",
        "<b><code>SELECT *</code> on a 300-column fact table.</b> Undoes everything columnar gave you. Ask for exactly the columns you need.",
        "<b>Treating Trino and PrestoDB as identical.</b> Trino (formerly PrestoSQL) and PrestoDB diverged around 2020 and have since drifted significantly — function names, connector behavior, and optimizer defaults all differ. Check which one your cluster runs before copy-pasting docs.",
        "<b>Treating SQL as opaque magic.</b> Every query has a plan, and the plan is inspectable. <code>EXPLAIN ANALYZE</code> before you tune anything.",
        "<b>Choosing Spark for a job Presto would finish in seconds.</b> Spark cold-start is 2–10× Presto's: the JVM warm-up alone eats any interactive budget.",
      ]} />

      <Takeaway items={[
        "<b>A warehouse is seven layers.</b> Knowing the layer means knowing the failure mode: metastore down is not the same as SSD tier slow.",
        "<b>SQL → AST → logical → physical → stages → tasks.</b> Five transformations between your text and your bytes. All inspectable.",
        "<b>The connector chooses the physics.</b> Same SQL, 1000× latency range. Snowflake ≠ Redis-backed cache ≠ System tables.",
        "Columnar formats turn analytics into <b>skip-most-of-the-disk</b> operations. Table formats add ACID and time travel on top.",
        "Read the plan before you tune the query. Filter on partition and indexed columns first. Avoid <code>SELECT *</code>.",
      ]} />
    </>
  );
}

window.Ch0_Fundamentals = Ch0_Fundamentals;
