/* global React, Panel */
/* The Stack — 4 sims for Ch0 enrichment:
 *   LayerCake · ByteTrace · SqlDecoderStage · ConnectorSwitcher
 */

const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
 * §1 — LAYER CAKE
 * 7-layer isometric stack. Hover to lift+expand. "Trace a query"
 * animates a pulse top→bottom then back up. "Show failures" mode
 * marks each layer as faulty and cascades impact up.
 * ============================================================ */

const LAYERS = [
  { n: 7, key: 'app',      name: 'Application',        sub: 'Hex · Mode · dashboards · notebooks · BI tools',  api: 'Natural language · SQL · REST',                       hue: 'L7', fail: 'User-facing surface dark. No new queries can enter the system.' },
  { n: 6, key: 'engine',   name: 'Query engine',       sub: 'Trino (interactive) · Spark (warehouse ETL) · Snowflake', api: 'SQL → distributed plan',                             hue: 'L6', fail: 'Queries queue indefinitely. Planner never turns SQL into work.' },
  { n: 5, key: 'catalog',  name: 'Catalog / Metastore', sub: 'Glue Catalog · schema + physical location of every table', api: 'Thrift: getPartitions · getTableSchema',          hue: 'L5', fail: 'Planning fails before any read happens: engine has no partition list to open.' },
  { n: 4, key: 'table',    name: 'Table abstraction',  sub: 'Namespaces → Tables → Partitions → Rows · ds-partitioned', api: "SELECT … WHERE ds = '2024-01-15'",                    hue: 'L4', fail: 'Partition resolution unreliable. Engine may scan too many or miss data.' },
  { n: 3, key: 'format',   name: 'File format',        sub: 'Parquet (ORC fork) · Parquet · Avro · TEXTFILE',           api: 'Read/write by stripe · predicate pushdown',          hue: 'L3', fail: 'Footer corruption. Stripe skipping unavailable; full-file scans only.' },
  { n: 2, key: 'blob',     name: 'Blob layer',         sub: 'S3 · blob API · manages physical placement',     api: 'put(blob) · get(blob_id)',                            hue: 'L2', fail: 'Reads slow, retries kick in, timeouts cascade up to engine.' },
  { n: 1, key: 'physical', name: 'Physical storage',   sub: 'SSD tier · flash tier · replicated',                api: 'Raw bytes',                                            hue: 'L1', fail: 'Bytes unreachable. Everything above queues on I/O or errors out.' },
];

function LayerCake() {
  const [hover, setHover] = useState(null);          // key
  const [pulse, setPulse] = useState(null);          // {idx, dir}
  const [failMode, setFailMode] = useState(false);
  const [faulty, setFaulty] = useState(null);        // key
  const rafRef = useRef(null);

  // Trace animation: top→bottom, then bottom→top
  const trace = () => {
    if (pulse) return;
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const duration = 3600;
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      // 0 .. 0.5 descend; 0.5 .. 1 ascend
      let idx;
      let dir;
      if (p < 0.5) { idx = Math.floor(p * 2 * LAYERS.length); dir = 'down'; }
      else         { idx = LAYERS.length - 1 - Math.floor((p - 0.5) * 2 * LAYERS.length); dir = 'up'; }
      idx = Math.max(0, Math.min(LAYERS.length - 1, idx));
      setPulse({ idx, dir, p });
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else setPulse(null);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Compute faulty/affected set
  const faultyIdx = faulty ? LAYERS.findIndex(l => l.key === faulty) : -1;
  const affected = (i) => failMode && faultyIdx >= 0 && i <= faultyIdx;   // layers at or above faulty are broken/impacted

  return (
    <Panel eyebrow="live · interactive" title="The 7-layer stack" meta="hover a layer · click trace · toggle failure mode"
           caption="Every warehouse query touches all seven. Knowing the layer means knowing the failure mode.">
      <div className="lc-wrap">
        <div className="lc-stack">
          {LAYERS.map((L, i) => {
            const isHover = hover === L.key;
            const pulsing = pulse && pulse.idx === i;
            const broken  = failMode && faulty === L.key;
            const impact  = affected(i) && !broken;
            return (
              <div key={L.key}
                   className={`lc-slab lc-${L.hue} ${isHover ? 'on' : ''} ${pulsing ? 'pulse ' + pulse.dir : ''} ${broken ? 'broken' : ''} ${impact ? 'impact' : ''} ${failMode ? 'fm' : ''}`}
                   onMouseEnter={() => setHover(L.key)}
                   onMouseLeave={() => setHover(null)}
                   onClick={() => failMode && setFaulty(f => f === L.key ? null : L.key)}
                   style={{ zIndex: isHover ? 40 : 10 + (LAYERS.length - i) }}>
                <div className="lc-slab-num">L{L.n}</div>
                <div className="lc-slab-name">{L.name}</div>
                <div className="lc-slab-sub">{L.sub}</div>
                <div className="lc-slab-api">{L.api}</div>
                {pulsing && <div className="lc-pulse-dot" />}
                {broken && <div className="lc-x">✕</div>}
              </div>
            );
          })}
        </div>

        <aside className="lc-detail">
          {hover ? (() => {
            const L = LAYERS.find(l => l.key === hover);
            const above = LAYERS.find(l => l.n === L.n + 1);
            const below = LAYERS.find(l => l.n === L.n - 1);
            return (
              <div className="lc-detail-card">
                <div className="lc-dc-eyebrow">Layer {L.n}</div>
                <div className="lc-dc-title">{L.name}</div>
                <div className="lc-dc-row"><span className="lc-dc-k">Stores</span><span className="lc-dc-v">{L.sub}</span></div>
                <div className="lc-dc-row"><span className="lc-dc-k">API</span><span className="lc-dc-v">{L.api}</span></div>
                <div className="lc-dc-row"><span className="lc-dc-k">Above</span><span className="lc-dc-v">{above ? `L${above.n} ${above.name}` : '- (top of stack)'}</span></div>
                <div className="lc-dc-row"><span className="lc-dc-k">Below</span><span className="lc-dc-v">{below ? `L${below.n} ${below.name}` : '- (bare metal)'}</span></div>
                {failMode && (
                  <div className="lc-dc-fail">
                    <div className="lc-dc-fail-lab">If this layer is down</div>
                    <div className="lc-dc-fail-v">{L.fail}</div>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="lc-detail-empty">
              <div className="lc-de-dot" />
              <div className="lc-de-lab">Hover any layer</div>
              <div className="lc-de-sub">See what it stores, the API it exposes, and what sits above &amp; below.</div>
            </div>
          )}
        </aside>
      </div>

      <div className="lc-ctrls">
        <button className="btn btn-primary" onClick={trace} disabled={!!pulse}>
          {pulse ? (pulse.dir === 'down' ? '▾ descending…' : '▴ returning result…') : '▶ Trace a query'}
        </button>
        <label className="lc-fm">
          <input type="checkbox" checked={failMode} onChange={e => { setFailMode(e.target.checked); if (!e.target.checked) setFaulty(null); }} />
          <span>Failure mode</span>
          <span className="lc-fm-sub">{failMode ? 'click any layer to mark it down' : 'see what breaks when a layer fails'}</span>
        </label>
      </div>
    </Panel>
  );
}

/* ============================================================
 * §2 — BYTE TRACE
 * 8-stop horizontal pipeline. A glowing particle walks through
 * each stage; stripe-skipping is visible; warm/cold toggles μs.
 * ============================================================ */

const BT_STOPS = [
  { k: 'sql',    n: 'SQL enters',        d: 'SELECT user_email …',          warm: 40,    cold: 40     },
  { k: 'plan',   n: 'Planner resolves',  d: 'column_id=7 in Parquet schema',        warm: 120,   cold: 120    },
  { k: 'meta',   n: 'Metastore lookup',  d: "partition list for ds='2024-01-15'",  warm: 800,   cold: 80000  },
  { k: 'foot',   n: 'Open Parquet footer',  d: 'stripe metadata · min/max index',   warm: 260,   cold: 2600   },
  { k: 'skip',   n: 'Predicate pushdown', d: 'stripe min/max says no match → skip', warm: 40,  cold: 40     },
  { k: 'blob',   n: 'S3 fetch',     d: 'blob for matching stripe',          warm: 1800,  cold: 180000 },
  { k: 'flash',  n: 'SSD tier read',  d: 'flash tier · replicated bytes',     warm: 420,   cold: 4200   },
  { k: 'ret',    n: 'Decompress → return', d: 'bytes → worker → coordinator → user', warm: 180, cold: 900   },
];

function ByteTrace() {
  const [cache, setCache] = useState('warm');
  const [token, setToken] = useState(0);
  const [running, setRunning] = useState(false);
  const [pos, setPos] = useState(0);     // 0..BT_STOPS.length (continuous)
  const rafRef = useRef(null);

  const run = () => { setPos(0); setToken(n => n + 1); };

  useEffect(() => {
    if (token === 0) return;
    setRunning(true);
    cancelAnimationFrame(rafRef.current);
    const totalMs = cache === 'warm' ? 3400 : 5800;   // cold feels slower
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

  // Cumulative elapsed μs up to current position
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

  // Headline wall-clock comparison (independent of run state — always shown)
  const totalWarm = useMemo(() => BT_STOPS.reduce((a, s) => a + s.warm, 0), []);
  const totalCold = useMemo(() => BT_STOPS.reduce((a, s) => a + s.cold, 0), []);
  const speedupX  = Math.round(totalCold / totalWarm);

  return (
    <Panel eyebrow="live · trace" title="A byte's journey" meta="dim_users.user_email · warm vs cold cache"
           caption="Each stop has its own latency budget. Cold Metastore and S3 dominate: that's why caching matters.">
      {/* Headline: wall-clock comparison so the "100×" lesson lands in 2 seconds */}
      <div className="bt-headline">
        <div className={`bt-headline-cell ${cache === 'warm' ? 'is-active' : ''}`}>
          <div className="lab">Warm cache</div>
          <div className="big">{formatLat(totalWarm)}</div>
          <div className="sub">metastore + blobs hot</div>
        </div>
        <div className="bt-headline-vs">vs</div>
        <div className={`bt-headline-cell is-cold ${cache === 'cold' ? 'is-active' : ''}`}>
          <div className="lab">Cold cache</div>
          <div className="big">{formatLat(totalCold)}</div>
          <div className="sub">cold start · S3 round-trips</div>
        </div>
        <div className="bt-headline-speedup">
          <div className="big">{speedupX}×</div>
          <div className="lab">faster when warm</div>
        </div>
      </div>

      <div className="bt-rail-wrap">
        <div className="bt-rail">
          {BT_STOPS.map((s, i) => {
            const done = i < curIdx;
            const active = i === curIdx && pos > 0;
            const stripActive = s.k === 'skip' && pos > 4.5;
            return (
              <div key={s.k} className={`bt-stop ${done ? 'done' : ''} ${active ? 'on' : ''} ${s.k === 'skip' ? 'skip' : ''}`}>
                <div className="bt-stop-num">{String(i + 1).padStart(2, '0')}</div>
                <div className="bt-stop-node">
                  {s.k === 'skip' && (
                    <div className={`bt-strip-skip ${stripActive ? 'is-active' : ''}`}>
                      stripe 1 · stripe 2 · <s>stripe 3</s> · stripe 4
                    </div>
                  )}
                </div>
                <div className="bt-stop-name">{s.n}</div>
                <div className="bt-stop-d">{s.d}</div>
                <div className="bt-stop-lat">{s[cache] >= 1000 ? `${(s[cache]/1000).toFixed(1)} ms` : `${s[cache]} μs`}</div>
              </div>
            );
          })}
          {/* continuous particle */}
          {pos > 0 && (
            <div className="bt-particle"
                 style={{ left: `calc(${Math.min(pos, BT_STOPS.length) / BT_STOPS.length * 100}% - 6px)` }} />
          )}
          <div className="bt-track" style={{ width: `${Math.min(pos, BT_STOPS.length) / BT_STOPS.length * 100}%` }} />
        </div>
      </div>

      <div className="bt-readouts">
        <div className="bt-ro">
          <div className="bt-ro-k">elapsed</div>
          <div className="bt-ro-v">{formatLat(cumNow)}</div>
          <div className="bt-ro-s">of {formatLat(totalAll)} total</div>
        </div>
        <div className={`bt-ro ${cache === 'cold' ? 'warn' : ''}`}>
          <div className="bt-ro-k">cache</div>
          <div className="bt-ro-v">{cache === 'warm' ? 'warm' : 'cold'}</div>
          <div className="bt-ro-s">{cache === 'warm' ? 'metastore + blobs cached' : '~100× on metastore + s3'}</div>
        </div>
        <div className="bt-ro good">
          <div className="bt-ro-k">skipped stripes</div>
          <div className="bt-ro-v">{pos > 4 ? '1 of 4' : '-'}</div>
          <div className="bt-ro-s">predicate pushdown kicks in at step 05</div>
        </div>
      </div>

      <div className="bt-ctrls">
        <div className="sc-tabs">
          <button className={`sc-tab ${cache === 'warm' ? 'on' : ''}`} onClick={() => setCache('warm')}>
            Warm cache<span className="sc-tab-sub">metastore + blobs hot</span>
          </button>
          <button className={`sc-tab ${cache === 'cold' ? 'on' : ''}`} onClick={() => setCache('cold')}>
            Cold cache<span className="sc-tab-sub">~100× slower lookups</span>
          </button>
        </div>
        <div className="sc-actions">
          <button className="btn btn-primary" onClick={run} disabled={running}>▶ Trace byte</button>
        </div>
      </div>
    </Panel>
  );
}

function formatLat(us) {
  if (us < 1000) return `${Math.round(us)} μs`;
  if (us < 1_000_000) return `${(us/1000).toFixed(us < 10_000 ? 1 : 0)} ms`;
  return `${(us/1_000_000).toFixed(2)} s`;
}

/* ============================================================
 * §3 — SQL DECODER + STAGE VISUALIZER (combined)
 * Phase animation: SQL → AST → Logical → Physical → Stages.
 * Bottom panel: coordinator + workers lighting up per stage,
 * with a skew toggle that jams worker 0, and "salting" to heal.
 * ============================================================ */

const QUERIES = [
  { id: 'scan', label: 'Simple scan', sql: "SELECT id, revenue\nFROM sales\nWHERE ds = '2024-01-15'\n  AND region = 'EU';",
    logical: ['Scan · sales', "Filter · ds=2024-01-15 ∧ region='EU'", 'Project · id, revenue'],
    physical: ['TableScan(sales)', 'Filter (pushed to scan)', 'Project'],
    stages: [
      { k: 'S0', ops: ['Scan', 'Filter', 'Project'], exch: null, color: 'b1' },
    ],
  },
  { id: 'hash', label: 'Two-table hash join', sql: "SELECT u.country, SUM(s.revenue)\nFROM sales s\nJOIN users u ON s.user_id = u.user_id\nWHERE s.ds = '2024-01-15'\nGROUP BY u.country;",
    logical: ['Scan · sales', 'Scan · users', 'HashJoin · user_id', 'Aggregate · GROUP BY country'],
    physical: ['TableScan(sales)', 'TableScan(users)', 'ExchangeHashPartitioned(user_id)', 'HashJoin', 'PartialAgg', 'ExchangeHashPartitioned(country)', 'FinalAgg'],
    stages: [
      { k: 'S0', ops: ['Scan sales'], exch: '→ hash(user_id)', color: 'b1' },
      { k: 'S1', ops: ['Scan users'], exch: '→ hash(user_id)', color: 'b1' },
      { k: 'S2', ops: ['HashJoin', 'PartialAgg'], exch: '→ hash(country)', color: 'b2' },
      { k: 'S3', ops: ['FinalAgg'], exch: null, color: 'b3' },
    ],
  },
  { id: 'bcast', label: 'Dimensional broadcast', sql: "SELECT s.*, c.country_name\nFROM sales s\nJOIN dim_country c ON s.country_id = c.id\nWHERE s.ds = '2024-01-15';",
    logical: ['Scan · sales', 'Scan · dim_country', 'BroadcastJoin · country_id', 'Project'],
    physical: ['TableScan(sales)', 'TableScan(dim_country)', 'ExchangeBroadcast(dim_country)', 'BroadcastJoin', 'Project'],
    stages: [
      { k: 'S0', ops: ['Scan sales', 'BroadcastJoin', 'Project'], exch: null, color: 'b1' },
    ],
  },
];

const DECODE_PHASES = [
  { k: 'ast',      t: 'AST',           sub: 'parser · tokens → tree' },
  { k: 'logical',  t: 'Logical plan',  sub: 'relational algebra · what to compute' },
  { k: 'physical', t: 'Physical plan', sub: 'distributed · exchange types · worker count' },
  { k: 'stages',   t: 'Stages',        sub: 'grouped operators · runtime DAG' },
];

function SqlDecoderStage() {
  const [qid, setQid] = useState('hash');
  const Q = QUERIES.find(q => q.id === qid);
  const [phase, setPhase] = useState(0);       // 0..DECODE_PHASES.length (animation)
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
  useEffect(() => { setPhase(0); setSkew(false); setSalt(false); }, [qid]);

  const phaseIdx = Math.min(DECODE_PHASES.length - 1, Math.floor(phase));
  const showLogical  = phase >= 1;
  const showPhysical = phase >= 2;
  const showStages   = phase >= 3;

  // Gantt timings per stage. Broadcast/scan = 1 stage; hash join = 3+ stages serialized.
  // Widths are normalised so bars + gaps fit in 100% regardless of stage count.
  const gantt = useMemo(() => {
    const n = Q.stages.length;
    if (n === 1) return [{ k: Q.stages[0].k, start: 0, w: 100, color: Q.stages[0].color }];
    const gap = 2;
    const avail = 100 - gap * (n - 1);
    const weights = Q.stages.map((_, i) => i === 0 ? 28 : i === n - 1 ? 22 : 26);
    const sum = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    return Q.stages.map((s, i) => {
      const w = (weights[i] / sum) * avail;
      const bar = { k: s.k, start: acc, w, color: s.color };
      acc += w + gap;
      return bar;
    });
  }, [Q]);

  // Worker load for stage visualizer: 6 workers
  const NUM_WORKERS = 6;
  const workerLoad = useMemo(() => {
    if (!skew) return Array(NUM_WORKERS).fill(1);
    if (salt) return Array(NUM_WORKERS).fill(1);
    const a = Array(NUM_WORKERS).fill(0.08);
    a[0] = 1;
    return a;
  }, [skew, salt]);

  return (
    <Panel eyebrow="live · compiler" title="SQL → AST → logical → physical → stages" meta="click a preset · run plan · poke skew"
           caption="Five transformations between your text and your bytes. Engine chooses the exchange, you get the stages.">
      {/* Top: SQL decoder */}
      <div className="sd-top">
        <div className="sd-presets">
          {QUERIES.map(q => (
            <button key={q.id} className={`sd-preset ${qid === q.id ? 'on' : ''}`} onClick={() => setQid(q.id)}>
              {q.label}
            </button>
          ))}
          <button className="btn btn-primary sd-plan" onClick={plan} disabled={running}>
            {running ? 'planning…' : '▶ Plan'}
          </button>
        </div>

        <div className="sd-sql">
          <pre className="sd-sql-pre">{Q.sql}</pre>
        </div>

        <div className="sd-phases">
          {DECODE_PHASES.map((p, i) => (
            <div key={p.k} className={`sd-phase ${phase >= i + 1 ? 'on' : ''} ${phaseIdx === i ? 'cur' : ''}`}>
              <div className="sd-phase-n">0{i + 1}</div>
              <div className="sd-phase-t">{p.t}</div>
              <div className="sd-phase-s">{p.sub}</div>
            </div>
          ))}
        </div>

        <div className="sd-plans">
          {/* AST */}
          <div className={`sd-plan-col ${phase >= 1 ? 'on' : ''}`}>
            <div className="sd-pc-lab">AST</div>
            <div className="sd-ast">
              <div className="sd-ast-root">SELECT</div>
              <div className="sd-ast-branch">
                <div className="sd-ast-leaf">projections</div>
                <div className="sd-ast-leaf">from</div>
                {qid !== 'scan' && <div className="sd-ast-leaf">join</div>}
                <div className="sd-ast-leaf">where</div>
                {qid === 'hash' && <div className="sd-ast-leaf">group-by</div>}
              </div>
            </div>
          </div>
          {/* Logical */}
          <div className={`sd-plan-col ${showLogical ? 'on' : ''}`}>
            <div className="sd-pc-lab">Logical</div>
            <div className="sd-ops">
              {Q.logical.map((op, i) => <div key={i} className="sd-op">{op}</div>)}
            </div>
          </div>
          {/* Physical */}
          <div className={`sd-plan-col ${showPhysical ? 'on' : ''}`}>
            <div className="sd-pc-lab">Physical</div>
            <div className="sd-ops">
              {Q.physical.map((op, i) => {
                const isExch = op.includes('Exchange');
                const isJoin = op.includes('Join');
                return (
                  <div key={i} className={`sd-op ${isExch ? 'exch' : ''} ${isJoin ? 'join' : ''}`}>
                    {op}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Stages */}
          <div className={`sd-plan-col ${showStages ? 'on' : ''}`}>
            <div className="sd-pc-lab">Stages</div>
            <div className="sd-stages">
              {Q.stages.map(s => (
                <div key={s.k} className={`sd-stage sd-${s.color}`}>
                  <div className="sd-stage-k">{s.k}</div>
                  <div className="sd-stage-ops">
                    {s.ops.map((o, i) => <div key={i} className="sd-stage-op">{o}</div>)}
                  </div>
                  {s.exch && <div className="sd-stage-exch">{s.exch}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: stage visualizer */}
      <div className="sd-bot">
        <div className="sd-bot-head">
          <span className="sd-bot-lab">Stage Visualizer</span>
          <span className="sd-bot-meta">{Q.stages.length} stage{Q.stages.length > 1 ? 's' : ''} · {NUM_WORKERS} workers</span>
          {Q.id === 'hash' && (
            <div className="sd-bot-ctrls">
              <button className={`sv-btn ${skew ? 'on' : ''}`} onClick={() => { setSkew(s => !s); if (skew) setSalt(false); }}>
                {skew ? '● skew on' : 'inject skew'}
              </button>
              <button className={`sv-btn ${salt ? 'on' : ''}`} onClick={() => setSalt(s => !s)} disabled={!skew}>
                {salt ? '● salted' : 'salting fix'}
              </button>
            </div>
          )}
        </div>

        <div className="sd-cluster">
          <div className="sd-coord">
            <div className="sd-coord-dot" />
            <div className="sd-coord-lab">Coordinator</div>
          </div>
          <div className="sd-fan">
            {Array.from({ length: NUM_WORKERS }).map((_, i) => {
              const load = workerLoad[i];
              const state = skew && !salt && i === 0 ? 'hot' : (skew && !salt ? 'idle' : 'go');
              return (
                <div key={i} className={`sd-worker ${state}`}>
                  <div className="sd-w-bar">
                    <div className="sd-w-fill" style={{ height: `${Math.max(6, load * 100)}%` }} />
                  </div>
                  <div className="sd-w-lab">w{i}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sd-gantt">
          <div className="sd-gantt-lab">timeline</div>
          <div className="sd-gantt-track">
            {gantt.map(g => (
              <div key={g.k} className={`sd-gantt-bar sd-${g.color}`} style={{ left: `${g.start}%`, width: `${g.w}%` }}>
                {g.k}
              </div>
            ))}
          </div>
          <div className="sd-gantt-note">
            {Q.id === 'scan'  && 'Single stage. Scan+filter+project fuse into one pipeline on each worker.'}
            {Q.id === 'hash'  && 'Three stages. Two parallel scans, then a join stage after the shuffle, then a final aggregate.'}
            {Q.id === 'bcast' && 'One stage. The small dim table is broadcast to every worker: no shuffle of the big table.'}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
 * §4 — CONNECTOR SWITCHER
 * Same SQL, three connectors. Physics changes wildly.
 * ============================================================ */

const CONNECTORS = [
  { id: 'snowflake',   name: 'Snowflake',         sub: 'columnar files in a blob store', latency: 'seconds',     color: 'c1',
    stats: { 'files scanned': '47', 'bytes read': '2.1 GB', 'predicate pushdown': 'stripe stats' },
    workers: 'fan-out',   note: 'Workers fan out to read Parquet files from S3. Predicate pushdown via stripe stats. The big-data default.' },
  { id: 'redis_cache', name: 'Redis-backed cache',       sub: 'local shards on Trino workers',  latency: 'milliseconds', color: 'c2',
    stats: { 'shards read': '12', 'bytes read': '180 MB', 'predicate pushdown': 'row-group stats' },
    workers: 'local-ssd', note: 'Data lives on the Trino worker nodes themselves. Reads are local SSD: no network, no blob layer.' },
  { id: 'system', name: 'System tables', sub: 'in-memory engine metadata',       latency: 'microseconds', color: 'c3',
    stats: { 'rows': '8', 'bytes': '1 KB', 'predicate pushdown': 'N/A (in-memory)' },
    workers: 'coordinator', note: 'Metadata only. No disk. The coordinator answers directly from its own memory.' },
];

function ConnectorSwitcher() {
  const [cid, setCid] = useState('snowflake');
  const C = CONNECTORS.find(c => c.id === cid);

  return (
    <Panel eyebrow="live · pluggable" title="Same SQL. Different physics." meta={`connector: ${C.name}`}
           caption="Trino's pluggable connector interface: the shape of the query is identical, the runtime is not.">
      <div className="cs-wrap">
        <div className="cs-sql">
          <div className="cs-sql-q"><span className="tok-k">SELECT</span> <span className="tok-f">count</span>(*) <span className="tok-k">FROM</span> x <span className="tok-k">WHERE</span> region = <span className="tok-s">'EU'</span>;</div>
        </div>

        <div className="cs-tabs">
          {CONNECTORS.map(c => (
            <button key={c.id} className={`cs-tab cs-${c.color} ${cid === c.id ? 'on' : ''}`} onClick={() => setCid(c.id)}>
              <span className="cs-tab-name">{c.name}</span>
              <span className="cs-tab-sub">{c.sub}</span>
              <span className="cs-tab-lat">{c.latency}</span>
            </button>
          ))}
        </div>

        <div className={`cs-panel cs-${C.color}`}>
          <div className="cs-diag">
            <div className="cs-diag-head">runtime physics</div>
            {C.workers === 'fan-out' && (
              <div className="cs-diag-grid cs-fanout">
                <div className="cs-node coord">coord</div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="cs-node worker">w{i}</div>
                ))}
                <div className="cs-blob">S3 · Parquet</div>
              </div>
            )}
            {C.workers === 'local-ssd' && (
              <div className="cs-diag-grid cs-local">
                <div className="cs-node coord">coord</div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="cs-node worker local">
                    <div className="cs-node-lab">w{i}</div>
                    <div className="cs-node-ssd">◾ SSD</div>
                  </div>
                ))}
              </div>
            )}
            {C.workers === 'coordinator' && (
              <div className="cs-diag-grid cs-memo">
                <div className="cs-node coord big">
                  <div className="cs-node-lab">coordinator</div>
                  <div className="cs-node-mem">◆ in-memory metadata</div>
                </div>
              </div>
            )}
          </div>

          <div className="cs-stats">
            {Object.entries(C.stats).map(([k, v]) => (
              <div key={k} className="cs-stat">
                <div className="cs-stat-k">{k}</div>
                <div className="cs-stat-v">{v}</div>
              </div>
            ))}
          </div>

          <div className="cs-note">{C.note}</div>
        </div>
      </div>
    </Panel>
  );
}

Object.assign(window, { LayerCake, ByteTrace, SqlDecoderStage, ConnectorSwitcher });
