/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, BestPractices, mulberry32, randn, clamp, round */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ==========================================================
 * Ch 03 · Clean
 * Simulators:
 *  1. MissingnessSim   — MCAR / MAR / MNAR pattern selector
 *  2. ImputationRace   — side-by-side imputation methods
 *  3. ScalerDemo       — StandardScaler / MinMax / Robust bar chart
 *  4. LeakageDetector  — feature picker; leaky features glow red
 * ========================================================== */

/* ----------------------------------------------------------
 * 1. MissingnessSim
 * ---------------------------------------------------------- */
function MissingnessSim() {
  const [pattern, setPattern] = useState('MCAR');

  const ROWS = 8;
  const COLS = ['Age', 'Income', 'Score', 'Clicks', 'Region', 'Churn'];

  // Generate base dataset once
  const base = useMemo(() => {
    const rng = mulberry32(77);
    return Array.from({ length: ROWS }, (_, r) => ({
      Age:    Math.floor(22 + rng() * 48),
      Income: Math.floor(25000 + rng() * 180000),
      Score:  Math.floor(rng() * 100),
      Clicks: Math.floor(rng() * 300),
      Region: ['EU','US','APAC','LATAM'][Math.floor(rng() * 4)],
      Churn:  rng() > 0.6 ? 1 : 0,
    }));
  }, []);

  // Determine which cells are missing given the pattern
  const missing = useMemo(() => {
    const rng = mulberry32(42);
    return base.map((row, r) => {
      const m = {};
      if (pattern === 'MCAR') {
        // Completely random — no dependency on any value
        COLS.forEach(c => { m[c] = rng() < 0.22; });
      } else if (pattern === 'MAR') {
        // Income and Score go missing more often when Region is EU
        COLS.forEach(c => {
          if (c === 'Income' || c === 'Score') {
            m[c] = row.Region === 'EU' ? rng() < 0.6 : rng() < 0.08;
          } else {
            m[c] = rng() < 0.05;
          }
        });
      } else {
        // MNAR — Income missing when income is HIGH (high earners skip the survey)
        COLS.forEach(c => {
          if (c === 'Income') {
            m[c] = row.Income > 120000 ? rng() < 0.8 : rng() < 0.05;
          } else if (c === 'Score') {
            // Low scorers skip the score field
            m[c] = row.Score < 30 ? rng() < 0.75 : rng() < 0.06;
          } else {
            m[c] = rng() < 0.04;
          }
        });
      }
      return m;
    });
  }, [base, pattern]);

  // % missing per column
  const pctMissing = useMemo(() =>
    COLS.map(c => round(missing.filter(r => r[c]).length / ROWS * 100, 0)),
    [missing]
  );

  const COLORS = { MCAR: '#4DE2FF', MAR: '#D1FF3A', MNAR: '#FF6B80' };
  const color = COLORS[pattern];

  const desc = {
    MCAR: 'Sensor dropped a packet. Missingness is unrelated to any value — coin flip. Safe to drop rows or impute.',
    MAR:  'Income & Score go missing more in the EU region (observed in other columns). Impute carefully; missingness is explainable.',
    MNAR: 'High earners omit income; low scorers skip the score field. The missing value predicts its own absence. Dangerous — imputation will be biased.',
  };

  return (
    <Panel eyebrow="SIMULATION" title="Missingness Patterns"
           meta={`${ROWS} rows · ${COLS.length} columns`}
           caption="Pattern determines what you can safely do about it. MCAR → drop or impute freely. MAR → model the missingness. MNAR → you may need to model the mechanism itself.">
      <div className="sim-row">
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Pattern</label>
            <div className="seg">
              {['MCAR','MAR','MNAR'].map(p => (
                <button key={p} className={pattern===p?'on':''} onClick={() => setPattern(p)}>{p}</button>
              ))}
            </div>
          </div>
          <p className="prose" style={{ fontSize: 12.5, margin: 0 }}>{desc[pattern]}</p>
          <div className="sim-stats" style={{ marginTop: 12 }}>
            {COLS.map((c, i) => (
              <div key={c}>
                <div className="k">{c}</div>
                <div className="v" style={{ color: pctMissing[i] > 30 ? color : 'inherit' }}>
                  {pctMissing[i]}%
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="plot-wrap" style={{ overflowX: 'auto' }}>
          <table style={{
            borderCollapse: 'collapse', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
            minWidth: 380,
          }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: '#6A6270', fontWeight: 700, letterSpacing: '0.1em' }}>#</th>
                {COLS.map(c => (
                  <th key={c} style={{ padding: '4px 8px', textAlign: 'right', color: '#6A6270', fontWeight: 700 }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {base.map((row, r) => (
                <tr key={r} style={{ borderTop: '1px solid #E8E2DA' }}>
                  <td style={{ padding: '4px 8px', color: '#A49D9A' }}>{r + 1}</td>
                  {COLS.map(c => {
                    const isMissing = missing[r][c];
                    return (
                      <td key={c} style={{
                        padding: '4px 8px', textAlign: 'right',
                        background: isMissing ? `${color}22` : 'transparent',
                        color: isMissing ? color : '#3A3540',
                        fontWeight: isMissing ? 700 : 400,
                        borderRadius: 3,
                      }}>
                        {isMissing ? '—' : (c === 'Income' ? row[c].toLocaleString() : row[c])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------
 * 2. ImputationRace
 * ---------------------------------------------------------- */
function ImputationRace() {
  const [method, setMethod] = useState('mean');

  // Ground truth: 50-point linear trend with noise
  const truth = useMemo(() => {
    const rng = mulberry32(19);
    return Array.from({ length: 50 }, (_, i) => ({
      x: i,
      y: 20 + 0.9 * i + 7 * randn(rng),
    }));
  }, []);

  // Introduce 20% MCAR missing
  const observed = useMemo(() => {
    const rng = mulberry32(55);
    return truth.map(d => ({ ...d, missing: rng() < 0.20 }));
  }, [truth]);

  const obs = observed.filter(d => !d.missing).map(d => d.y);
  const mean = obs.reduce((a, b) => a + b, 0) / obs.length;
  const sorted = [...obs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Imputed values per method
  const imputed = useMemo(() => observed.map(d => {
    if (!d.missing) return null;
    if (method === 'mean') return mean;
    if (method === 'median') return median;
    if (method === 'ffill') {
      // Forward-fill: find last observed before this index
      let last = null;
      for (let i = d.x - 1; i >= 0; i--) {
        if (!observed[i].missing) { last = observed[i].y; break; }
      }
      return last !== null ? last : obs[0];
    }
    if (method === 'knn') {
      // Approximate KNN: nearest 3 observed neighbors by x distance
      const neighbors = observed
        .filter(o => !o.missing)
        .map(o => ({ dist: Math.abs(o.x - d.x), y: o.y }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3);
      return neighbors.reduce((a, n) => a + n.y, 0) / neighbors.length;
    }
    return mean;
  }), [observed, method, mean, median]);

  // SVG layout
  const W = 400, H = 180;
  const PAD = 20;
  const xScale = x => PAD + x * ((W - PAD * 2) / 50);
  const yMin = 10, yMax = 75;
  const yScale = y => H - PAD - ((y - yMin) / (yMax - yMin)) * (H - PAD * 2);

  // Bias metric: mean absolute error on missing points vs true
  const mae = useMemo(() => {
    const errs = observed
      .map((d, i) => d.missing ? Math.abs(imputed[i] - d.y) : null)
      .filter(e => e !== null);
    return errs.length ? round(errs.reduce((a, b) => a + b, 0) / errs.length, 1) : 0;
  }, [observed, imputed]);

  const methodDesc = {
    mean:   'Replaces every gap with the global mean. Fast, but erases trend and shrinks variance.',
    median: 'Robust to outliers, still ignores structure. Better than mean when distribution is skewed.',
    ffill:  'Copies the last known value forward. Great for slowly-changing time series, bad for sparse gaps.',
    knn:    'Averages the 3 nearest observed neighbors by index. Tracks local trend; best accuracy here.',
  };

  return (
    <Panel eyebrow="SIMULATION" title="Imputation Race"
           meta={`20% MCAR · MAE vs truth`}
           caption="Yellow dots = imputed values. Hollow circles = true missing values underneath. Lower MAE = closer to truth.">
      <div className="sim-row">
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Method</label>
            <div className="seg" style={{ flexWrap: 'wrap' }}>
              {['mean','median','ffill','knn'].map(m => (
                <button key={m} className={method===m?'on':''} onClick={() => setMethod(m)}>{m}</button>
              ))}
            </div>
          </div>
          <p className="prose" style={{ fontSize: 12.5, margin: 0 }}>{methodDesc[method]}</p>
          <div className="sim-stats" style={{ marginTop: 12 }}>
            <div><div className="k">MAE (imputed vs true)</div><div className="v" style={{ color: mae < 5 ? '#D1FF3A' : '#FF6B80' }}>{mae}</div></div>
            <div><div className="k">Missing pts</div><div className="v">{observed.filter(d => d.missing).length}</div></div>
          </div>
          <div className="galton-note">
            <span className="tag-pill">Tip</span>
            KNN tracks the linear trend. Mean/median ignore it — notice the flat cluster of yellow dots.
          </div>
        </div>
        <div className="plot-wrap">
          <svg viewBox={`0 0 ${W} ${H}`}>
            {/* Axes */}
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#A49D9A" strokeWidth="0.8"/>
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#A49D9A" strokeWidth="0.8"/>
            {/* Observed points */}
            {observed.filter(d => !d.missing).map(d => (
              <circle key={d.x} cx={xScale(d.x)} cy={yScale(d.y)} r="2.5" fill="#4DE2FF" opacity="0.85"/>
            ))}
            {/* True missing (ghost) */}
            {observed.filter(d => d.missing).map(d => (
              <circle key={'t'+d.x} cx={xScale(d.x)} cy={yScale(d.y)} r="3.5"
                      fill="none" stroke="#A49D9A" strokeWidth="1.2" strokeDasharray="2 2"/>
            ))}
            {/* Imputed values */}
            {observed.map((d, i) => d.missing && imputed[i] != null ? (
              <circle key={'imp'+d.x} cx={xScale(d.x)} cy={yScale(imputed[i])} r="4"
                      fill="#D1FF3A" opacity="0.9"/>
            ) : null)}
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------
 * 3. ScalerDemo
 * ---------------------------------------------------------- */
function ScalerDemo() {
  const [scaler, setScaler] = useState('raw');

  const features = useMemo(() => [
    { name: 'Age',    values: [23, 45, 31, 67, 28, 52], unit: 'yrs' },
    { name: 'Income', values: [28000, 95000, 42000, 180000, 35000, 120000], unit: '$' },
    { name: 'Score',  values: [45, 82, 60, 15, 91, 37], unit: 'pts' },
    { name: 'Clicks', values: [3, 120, 22, 450, 8, 230], unit: 'n' },
    { name: 'Days',   values: [1, 7, 3, 30, 2, 14], unit: 'd' },
    { name: 'Spend',  values: [5, 299, 49, 1200, 12, 599], unit: '$' },
  ], []);

  function standardize(vals) {
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length) || 1;
    return vals.map(v => (v - m) / sd);
  }
  function minmax(vals) {
    const lo = Math.min(...vals), hi = Math.max(...vals);
    return vals.map(v => (hi === lo) ? 0 : (v - lo) / (hi - lo));
  }
  function robust(vals) {
    const sorted = [...vals].sort((a, b) => a - b);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const q2 = sorted[Math.floor(n * 0.5)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1 || 1;
    return vals.map(v => (v - q2) / iqr);
  }

  const transform = (vals) => {
    if (scaler === 'raw') return vals;
    if (scaler === 'standard') return standardize(vals);
    if (scaler === 'minmax') return minmax(vals);
    if (scaler === 'robust') return robust(vals);
    return vals;
  };

  const scalerFormula = {
    raw:      'No transformation — raw values keep their original scale.',
    standard: 'z = (x − μ) / σ   →  mean=0, std=1. Sensitive to outliers.',
    minmax:   'x′ = (x − min) / (max − min)   →  range [0, 1]. Crushed by outliers.',
    robust:   'x′ = (x − Q2) / IQR   →  median-centered, ignores tail extremes. Best with outliers.',
  };

  // All transformed values flattened for global color scale
  const allTransformed = features.map(f => transform(f.values));
  const globalMin = Math.min(...allTransformed.flat());
  const globalMax = Math.max(...allTransformed.flat()) || 1;

  const W = 400, H = 200;
  const PAD_L = 48, PAD_R = 12, PAD_T = 16, PAD_B = 24;
  const nFeatures = features.length;
  const nBars = features[0].values.length;
  const groupW = (W - PAD_L - PAD_R) / nFeatures;
  const barW = groupW / (nBars + 1);

  const barH = (v) => {
    if (scaler === 'raw') {
      const allRaw = features.map(f => Math.max(...f.values));
      const gMax = Math.max(...allRaw) || 1;
      return Math.max(0, (v / gMax)) * (H - PAD_T - PAD_B);
    }
    const range = globalMax - globalMin;
    if (range === 0) return 0;
    return Math.max(0, (v - globalMin) / range) * (H - PAD_T - PAD_B);
  };

  const COLORS = ['#4DE2FF','#D1FF3A','#FF6B80','#B89DFF','#FFA500','#00E5A0'];

  return (
    <Panel eyebrow="SIMULATION" title="Feature Scaling"
           meta="6 features · 6 samples each"
           caption="Without scaling, income (€200 k) dominates age (67). Regularized models and distance-based models (kNN, SVM, PCA) require features on comparable scales.">
      <div className="sim-row">
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Scaler</label>
            <div className="seg" style={{ flexWrap: 'wrap' }}>
              {['raw','standard','minmax','robust'].map(s => (
                <button key={s} className={scaler===s?'on':''} onClick={() => setScaler(s)}>{s}</button>
              ))}
            </div>
          </div>
          <p className="prose" style={{ fontSize: 12.5, margin: 0 }}>{scalerFormula[scaler]}</p>
          <div className="galton-note" style={{ marginTop: 10 }}>
            <span className="tag-pill">Rule</span>
            Always fit scaler on <strong>train</strong> only — then transform train and test. Fitting on the full dataset leaks test statistics into training.
          </div>
        </div>
        <div className="plot-wrap">
          <svg viewBox={`0 0 ${W} ${H}`}>
            {/* Baseline */}
            <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#A49D9A" strokeWidth="0.8"/>
            {/* Zero line when scaled values can be negative */}
            {scaler !== 'raw' && scaler !== 'minmax' && (
              <line x1={PAD_L} y1={H - PAD_B - (0 - globalMin) / (globalMax - globalMin || 1) * (H - PAD_T - PAD_B)}
                    x2={W - PAD_R}
                    y2={H - PAD_B - (0 - globalMin) / (globalMax - globalMin || 1) * (H - PAD_T - PAD_B)}
                    stroke="#A49D9A" strokeDasharray="3 3" strokeWidth="0.8"/>
            )}
            {features.map((feat, fi) => {
              const transformed = transform(feat.values);
              const gx = PAD_L + fi * groupW;
              return (
                <g key={feat.name}>
                  {transformed.map((v, si) => {
                    const h = barH(v);
                    const bx = gx + (si + 0.5) * barW;
                    const by = H - PAD_B - h;
                    return (
                      <rect key={si} x={bx} y={by} width={barW - 1} height={h}
                            fill={COLORS[si]} opacity="0.75" rx="1"/>
                    );
                  })}
                  <text x={gx + groupW / 2} y={H - 6}
                        textAnchor="middle" fontSize="9" fontFamily="'JetBrains Mono', monospace"
                        fill="#6A6270">{feat.name}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------
 * 4. LeakageDetector
 * ---------------------------------------------------------- */
const FEATURE_POOL = [
  { name: 'user_age',            leaky: false, reason: '' },
  { name: 'session_duration',    leaky: false, reason: '' },
  { name: 'plan_type',           leaky: false, reason: '' },
  { name: 'support_tickets',     leaky: false, reason: '' },
  { name: 'last_login_days_ago', leaky: false, reason: '' },
  { name: 'target_mean_encoded', leaky: true,  reason: 'Computed using the target label across all rows — the model literally sees the answer.' },
  { name: 'days_after_churn',    leaky: true,  reason: 'A post-event feature: it\'s only defined if the user already churned. Instant 100% accuracy, zero prod value.' },
  { name: 'customer_id_hash',    leaky: true,  reason: 'High-cardinality ID proxy. Model memorises IDs that churn — perfectly fitted to training set, useless on new users.' },
  { name: 'total_revenue_lifetime', leaky: true, reason: 'If computed using future periods, revenue after the churn date leaks into the label window.' },
  { name: 'email_domain_target', leaky: true,  reason: 'Target-encoded without out-of-fold splits — each row saw its own label during encoding.' },
];

function LeakageDetector() {
  const [selected, setSelected] = useState(new Set(['user_age', 'session_duration', 'plan_type']));
  const [revealed, setReveal] = useState(false);

  const toggle = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else { if (next.size < 5) next.add(name); }
      return next;
    });
    setReveal(false);
  };

  const selectedFeatures = FEATURE_POOL.filter(f => selected.has(f.name));
  const leakyCount = selectedFeatures.filter(f => f.leaky).length;

  return (
    <Panel eyebrow="SIMULATION" title="Leakage Detector"
           meta={`${selected.size} features selected · ${leakyCount} leaky`}
           caption="Pick up to 5 features for your churn model, then click Audit. Leaky features will be exposed.">
      <div className="sim-row" style={{ flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FEATURE_POOL.map(f => {
            const isSelected = selected.has(f.name);
            const isLeaky = revealed && isSelected && f.leaky;
            const isSafe = revealed && isSelected && !f.leaky;
            return (
              <button
                key={f.name}
                onClick={() => toggle(f.name)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: isLeaky ? '1.5px solid #FF6B80'
                        : isSafe  ? '1.5px solid #D1FF3A'
                        : isSelected ? '1.5px solid #4DE2FF'
                        : '1.5px solid #E8E2DA',
                  background: isLeaky ? '#FF6B8018'
                            : isSafe  ? '#D1FF3A18'
                            : isSelected ? '#4DE2FF12' : 'transparent',
                  color: isLeaky ? '#FF6B80' : isSafe ? '#D1FF3A' : isSelected ? '#4DE2FF' : '#6A6270',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f.name}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-sm btn-primary" onClick={() => setReveal(true)}>
            Audit features
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => {
            setSelected(new Set(['user_age', 'session_duration', 'plan_type']));
            setReveal(false);
          }}>Reset</button>
          {revealed && (
            <span style={{ fontSize: 12.5, color: leakyCount > 0 ? '#FF6B80' : '#D1FF3A', fontFamily: "'JetBrains Mono', monospace" }}>
              {leakyCount > 0 ? `${leakyCount} leaky feature${leakyCount > 1 ? 's' : ''} found` : 'All clear'}
            </span>
          )}
        </div>

        {revealed && leakyCount > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedFeatures.filter(f => f.leaky).map(f => (
              <div key={f.name} style={{
                background: '#FF6B8012',
                border: '1px solid #FF6B8040',
                borderLeft: '3px solid #FF6B80',
                borderRadius: 6,
                padding: '10px 14px',
              }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#FF6B80', fontWeight: 700, marginBottom: 4 }}>
                  {f.name}
                </div>
                <div style={{ fontSize: 12.5, color: '#3A3540' }}>{f.reason}</div>
              </div>
            ))}
          </div>
        )}

        {revealed && leakyCount === 0 && (
          <div style={{
            background: '#D1FF3A10', border: '1px solid #D1FF3A40',
            borderLeft: '3px solid #D1FF3A', borderRadius: 6, padding: '10px 14px',
            fontSize: 12.5, color: '#3A3540',
          }}>
            Clean feature set. No leakage detected — none of the selected features encode future information or the target directly.
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ==========================================================
 * Ch03_Clean — main component
 * ========================================================== */
function Ch03_Clean() {
  return (
    <>
      <Hero eyebrow="Chapter 03 · Clean"
            title='Most of &ldquo;modeling&rdquo; is actually <em><span class="accent">cleaning</span></em>.'
            hook="Missing values. Outliers. Units. Timezones. Leaky joins. The difference between a senior DS and a junior one is <strong>noticing the boring things</strong>."
            meta={[
              { k: 'Read',  v: '12 min' },
              { k: 'Focus', v: 'Missingness · imputation · scaling · leakage' },
              { k: 'Sims',  v: '4 interactive' },
            ]}/>

      {/* ── 03.1 Missingness ─────────────────────────────── */}
      <section className="section">
        <SectionLabel n="03.1">Missingness</SectionLabel>
        <h2 className="h2">Not all missing is missing the same way.</h2>
        <p className="prose">
          Rubin (1976) categorized missing data into three mechanisms that completely change how you
          should respond. <strong>MCAR</strong> (missing completely at random) means a sensor dropped a
          packet — the gap is unrelated to any value in the dataset. You can drop or impute without bias.
          <strong> MAR</strong> (missing at random) means missingness depends on <em>other observed columns</em>:
          income data might be missing more often for EU users if the survey skipped a page in German.
          You can impute, but you need to model the relationship. <strong>MNAR</strong> (missing not at random)
          is the dangerous one: the missing value predicts its own absence — high earners skip the income
          field, low scorers skip the score. Imputation will be systematically biased unless you model the
          missingness process itself.
        </p>

        <MissingnessSim />

        <p className="prose" style={{ marginTop: 18 }}>
          Notice how MNAR dramatically increases the missing rate in the high-value tail. If you impute with
          the observed mean, you'll underestimate the true mean. The pattern of absence is data — always
          add a <code>feature_was_missing</code> indicator column before you fill any gaps.
        </p>
      </section>

      {/* ── 03.2 Imputation ──────────────────────────────── */}
      <section className="section">
        <SectionLabel n="03.2">Imputation</SectionLabel>
        <h2 className="h2">Filling the blanks without lying to your model.</h2>
        <p className="prose">
          The wrong imputation strategy doesn't just add noise — it systematically biases your model toward
          the wrong answer. Mean imputation compresses variance, making your model underestimate uncertainty.
          Forward-fill in time series creates temporal artifacts. KNN imputation is slower but tracks local
          structure. The benchmark is always: how far off are imputed values from the truth?
        </p>

        <ImputationRace />

        <AntiPatterns title="Imputation anti-patterns" items={[
          '<b>Imputing with the full-dataset mean.</b> Fit imputer on train only. The test mean is future information.',
          '<b>Single-value imputation for skewed distributions.</b> Replacing salary gaps with the mean drags every imputed value toward the center of a right-skewed distribution. Use median.',
          '<b>Not flagging imputed cells.</b> Your model has no way to know which values were synthetic. Add a <code>_was_missing</code> binary feature for every imputed column.',
          '<b>KNN on high-cardinality data without scaling.</b> KNN distances are meaningless when income (range 170k) dominates age (range 50). Scale first.',
        ]}/>
      </section>

      {/* ── 03.3 Scaling ─────────────────────────────────── */}
      <section className="section">
        <SectionLabel n="03.3">Feature Scaling</SectionLabel>
        <h2 className="h2">Income at 150,000. Age at 34. <em>Same model, totally different worlds.</em></h2>
        <p className="prose">
          Many algorithms are sensitive to the raw magnitude of features. Regularized linear models penalize
          large coefficients — but a coefficient for income in raw dollars will naturally be tiny compared
          to one for age, so L2 regularization ignores income entirely. Distance-based models like kNN,
          SVM, and PCA are even more exposed: Euclidean distance in a 200,000-dollar space dwarfs anything
          in age-space. Scaling puts features on comparable footing.
        </p>

        <ScalerDemo />

        <BestPractices title="Scaling rules" items={[
          '<b>StandardScaler for Gaussian-ish features.</b> Zero mean, unit variance. Works best when the feature\'s distribution is roughly symmetric. Affected by outliers.',
          '<b>MinMaxScaler when you need bounded output [0, 1].</b> Good for neural networks. A single extreme outlier will crush all other values toward zero.',
          '<b>RobustScaler when outliers are real and informative.</b> Uses median and IQR. The outliers still exist in the data — they\'re just not ruining the scale for everyone else.',
          '<b>Never scale tree-based models.</b> Decision trees split on threshold values, not distances. Scaling changes nothing for Random Forests, XGBoost, or LightGBM.',
        ]}/>
      </section>

      {/* ── 03.4 Leakage ─────────────────────────────────── */}
      <section className="section">
        <SectionLabel n="03.4">Data Leakage</SectionLabel>
        <h2 className="h2">The number-one reason your model looks amazing in dev and dies in prod.</h2>
        <p className="prose">
          <strong>Leakage</strong> is when information that wouldn't be available at prediction time sneaks
          into your training features. It's invisible until deployment. The symptoms are seductive: 99%
          AUC, SHAP plots that look like they're capturing real signal, stakeholders impressed by the numbers.
          Then prod accuracy drops to 60% and nobody knows why.
        </p>
        <p className="prose">
          There are three main flavors: <strong>target leakage</strong> (a feature encodes the label directly),
          <strong> temporal leakage</strong> (you used data from after the event you're predicting), and
          <strong> train/test contamination</strong> (your preprocessing saw the test set). Pick features
          below and audit for leakage.
        </p>

        <LeakageDetector />

        <AntiPatterns items={[
          '<b>Fitting the scaler on the full dataset.</b> Your test set just saw the training mean. Fit on train only, transform both.',
          '<b>Target encoding without out-of-fold.</b> "Mean target per category" computed across all rows lets each row see its own label.',
          '<b>Post-event features.</b> <code>total_purchases_lifetime</code> used to predict <code>will_churn</code> — if computed after the churn date, you\'ve time-traveled.',
          '<b>Snooping the test set during EDA.</b> You look at test, see a pattern, adjust train. You just leaked your test set through your eyeballs.',
        ]}/>

        <BestPractices items={[
          '<b>Split before you touch anything.</b> First line of every notebook: <code>train, test = split(df)</code>. Then lock the test set.',
          '<b>Use sklearn Pipelines.</b> <code>Pipeline</code> forces fit-on-train, transform-on-both. It\'s not boilerplate — it\'s a safety guarantee.',
          '<b>Time splits for temporal data.</b> Random splits let future data train on past labels. Use <code>TimeSeriesSplit</code> or a fixed cutoff date.',
          '<b>Ask: would this feature exist at prediction time?</b> For every feature, state the exact moment it would be computed in production. If the answer is "after we already know the outcome," it\'s leaky.',
        ]}/>
      </section>

      <Takeaway items={[
        '<b>Missingness is information.</b> A <code>was_missing</code> flag is free and often predictive. Never impute silently.',
        '<b>The mechanism matters.</b> MCAR → drop freely. MAR → impute with a model. MNAR → model the missingness itself or accept the bias.',
        '<b>Scaling is algorithm-dependent.</b> Distance-based and regularized models need it. Trees don\'t care.',
        '<b>Leakage is invisible until prod.</b> Assume it exists; prove it doesn\'t with time-based splits and feature provenance checks.',
        '<b>Clean data is a process, not a step.</b> Every new feature, join, or aggregation is a fresh opportunity to introduce bugs, leaks, or biased imputation.',
      ]}/>
    </>
  );
}

window.Ch03_Clean = Ch03_Clean;
