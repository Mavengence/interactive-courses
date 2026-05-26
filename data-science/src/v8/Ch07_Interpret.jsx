/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, BestPractices, useInView, mulberry32, randn, clamp, round */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ============================================================
 * Ch 07 · Interpret
 * Four interactive simulators:
 *   1. SHAPWaterfallSim   — loan model, 6 sliders, live waterfall
 *   2. LIMEExplainer      — 2-D boundary, moveable query point, locality circle
 *   3. PermutationImportance — shuffle features, watch accuracy drop
 *   4. GlobalVsLocal      — 20 points, click one → global constant, local changes
 * ============================================================ */

/* ── helpers ─────────────────────────────────────────────── */
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
function pct(v) { return (v * 100).toFixed(1) + '%'; }

/* ============================================================
 * 1 · SHAP Waterfall Simulator
 *     Synthetic "loan approval" model with 6 sliders.
 *     Contribution = (value − mean) × weight.
 * ============================================================ */
const LOAN_FEATURES = [
  { key: 'income',           label: 'Annual income ($k)', min: 20,  max: 200, step: 1,  mean: 70,  weight:  0.0040 },
  { key: 'age',              label: 'Age (years)',         min: 18,  max: 75,  step: 1,  mean: 38,  weight:  0.0055 },
  { key: 'debt_ratio',       label: 'Debt ratio (%)',      min: 0,   max: 80,  step: 1,  mean: 35,  weight: -0.0070 },
  { key: 'employment_years', label: 'Employment years',    min: 0,   max: 30,  step: 1,  mean: 8,   weight:  0.0090 },
  { key: 'credit_score',     label: 'Credit score',        min: 300, max: 850, step: 5,  mean: 640, weight:  0.0028 },
  { key: 'savings',          label: 'Savings ($k)',        min: 0,   max: 150, step: 1,  mean: 25,  weight:  0.0050 },
];
const LOAN_BASE = 0.42; // baseline approval probability

function SHAPWaterfallSim() {
  const defaults = useMemo(() => Object.fromEntries(LOAN_FEATURES.map(f => [f.key, f.mean])), []);
  const [vals, setVals] = useState(defaults);

  const { rows, finalScore } = useMemo(() => {
    let running = LOAN_BASE;
    const rows = LOAN_FEATURES.map(f => {
      const contrib = (vals[f.key] - f.mean) * f.weight;
      const from = running;
      running = clamp(running + contrib, 0.01, 0.99);
      return { ...f, contrib: running - from, from, to: running };
    });
    return { rows, finalScore: running };
  }, [vals]);

  const W = 440, H = 240;
  const BAR_H = 14, ROW_H = 36, PAD_LEFT = 148, PAD_RIGHT = 40;
  const xScale = v => PAD_LEFT + v * (W - PAD_LEFT - PAD_RIGHT);
  const baseX = xScale(LOAN_BASE);
  const approved = finalScore >= 0.5;

  return (
    <Panel eyebrow="SIMULATION" title="SHAP waterfall · loan approval"
           meta={`score ${round(finalScore, 3)} · ${approved ? 'APPROVED' : 'DECLINED'}`}
           caption="Each feature's contribution = (your value − population mean) × weight. Bars extend right (positive) or left (negative) from the running total. The sum lands at the final prediction score.">
      <div className="sim-row">
        <div className="sim-controls" style={{minWidth:220}}>
          {LOAN_FEATURES.map(f => (
            <div className="sim-ctrl" key={f.key}>
              <label>{f.label} <span className="mono">{vals[f.key]}</span></label>
              <input type="range" min={f.min} max={f.max} step={f.step}
                     value={vals[f.key]}
                     onChange={e => setVals(v => ({ ...v, [f.key]: +e.target.value }))} />
            </div>
          ))}
          <button className="btn btn-sm" style={{marginTop:8}}
                  onClick={() => setVals(defaults)}>Reset to means</button>
        </div>

        <div className="plot-wrap" style={{flex:1}}>
          <div className="sim-plot-head">
            SHAP waterfall
            <span className="hint">baseline {LOAN_BASE.toFixed(2)} → score {round(finalScore,3)}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H + 30}`} style={{width:'100%'}}>
            {/* Baseline label */}
            <text x={baseX} y={12} textAnchor="middle" fontSize="9" fill="#6A6270"
                  fontFamily="'JetBrains Mono',monospace">BASE {LOAN_BASE.toFixed(2)}</text>
            <line x1={baseX} y1={16} x2={baseX} y2={H - 10}
                  stroke="rgba(164,157,154,0.25)" strokeDasharray="3 3" strokeWidth="1"/>

            {rows.map((f, i) => {
              const y = 22 + i * ROW_H;
              const pos = f.contrib >= 0;
              const barX = pos ? xScale(f.from) : xScale(f.to);
              const barW = Math.abs(xScale(f.to) - xScale(f.from));
              const color = pos ? '#1FAF7E' : '#D83A3A';
              const labelX = pos ? xScale(f.to) + 5 : xScale(f.to) - 5;
              const anchor = pos ? 'start' : 'end';
              return (
                <g key={f.key}>
                  <text x={PAD_LEFT - 6} y={y + 11} textAnchor="end" fontSize="10"
                        fill="#C7C4BC" fontFamily="'JetBrains Mono',monospace">{f.label}</text>
                  {/* Connector dot from previous row */}
                  {i > 0 && (
                    <line x1={xScale(f.from)} y1={y - ROW_H + BAR_H + 4}
                          x2={xScale(f.from)} y2={y + 4}
                          stroke="rgba(164,157,154,0.18)" strokeWidth="1" strokeDasharray="2 2"/>
                  )}
                  <rect x={barX} y={y} width={Math.max(barW, 1)} height={BAR_H}
                        fill={color} rx="2"
                        style={{transition:'all 200ms ease'}}/>
                  <text x={labelX} y={y + 11} textAnchor={anchor} fontSize="10"
                        fill={color} fontFamily="'JetBrains Mono',monospace">
                    {f.contrib >= 0 ? '+' : ''}{round(f.contrib, 3)}
                  </text>
                </g>
              );
            })}

            {/* Final score marker */}
            <line x1={xScale(finalScore)} y1={18} x2={xScale(finalScore)} y2={H - 4}
                  stroke={approved ? '#1FAF7E' : '#D83A3A'} strokeWidth="2"/>
            <text x={xScale(finalScore)} y={H + 14} textAnchor="middle" fontSize="10"
                  fill={approved ? '#1FAF7E' : '#D83A3A'} fontFamily="'JetBrains Mono',monospace"
                  fontWeight="700">
              {round(finalScore, 3)} · {approved ? 'APPROVED' : 'DECLINED'}
            </text>

            {/* X axis */}
            {[0, 0.25, 0.5, 0.75, 1].map(v => (
              <g key={v}>
                <line x1={xScale(v)} y1={H - 4} x2={xScale(v)} y2={H}
                      stroke="#A49D9A" strokeWidth="0.6"/>
                <text x={xScale(v)} y={H + 10} textAnchor="middle" fontSize="8" fill="#6A6270"
                      fontFamily="'JetBrains Mono',monospace">{v.toFixed(2)}</text>
              </g>
            ))}
            <line x1={PAD_LEFT} y1={H - 4} x2={W - PAD_RIGHT} y2={H - 4}
                  stroke="#A49D9A" strokeWidth="0.6"/>
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
 * 2 · LIME Explainer
 *     2-D decision boundary (class A left, class B right).
 *     User moves query point; locality circle + local linear boundary.
 * ============================================================ */
function LIMEExplainer() {
  const [qx, setQx] = useState(0.55);
  const [qy, setQy] = useState(0.45);
  const RADIUS = 0.22; // locality radius in [0,1] space

  // True model: probability of class B = sigmoid(6*(x-0.5) + 1.5*(y-0.5))
  const trueProb = useCallback((x, y) => sigmoid(6 * (x - 0.5) + 1.5 * (y - 0.5)), []);

  // Local linear fit: sample N points in locality, compute weighted regression
  const localExplanation = useMemo(() => {
    const rng = mulberry32(42);
    const N = 80;
    const samples = [];
    for (let i = 0; i < N; i++) {
      const sx = clamp(qx + (rng() - 0.5) * RADIUS * 2, 0, 1);
      const sy = clamp(qy + (rng() - 0.5) * RADIUS * 2, 0, 1);
      const dist = Math.sqrt((sx - qx) ** 2 + (sy - qy) ** 2);
      if (dist > RADIUS) continue;
      const w = Math.exp(-(dist / (RADIUS * 0.5)) ** 2); // Gaussian kernel
      const prob = trueProb(sx, sy);
      samples.push({ sx, sy, w, prob });
    }
    // Weighted least squares: prob ≈ a0 + a1*(sx-qx) + a2*(sy-qy)
    let sw=0, swxx=0, swyy=0, swxy=0, swpx=0, swpy=0, swp=0;
    samples.forEach(({ sx, sy, w, prob }) => {
      const dx = sx - qx, dy = sy - qy;
      sw += w; swxx += w * dx * dx; swyy += w * dy * dy;
      swxy += w * dx * dy; swpx += w * prob * dx;
      swpy += w * prob * dy; swp += w * prob;
    });
    const a0 = swp / (sw || 1);
    // Simplified: treat x and y independently (ridge approx)
    const a1 = swpx / (swxx + 0.001);
    const a2 = swpy / (swyy + 0.001);
    return { a0, a1, a2, prob: trueProb(qx, qy) };
  }, [qx, qy, trueProb]);

  const SW = 300, SH = 280;
  const toSvg = (v, dim) => v * (dim === 'x' ? SW : SH);
  const qsvgX = toSvg(qx, 'x'), qsvgY = toSvg(1 - qy, 'y');
  const rSvg = RADIUS * SW;

  // Background gradient cells
  const CELLS = 30;
  const cells = useMemo(() => {
    const out = [];
    for (let iy = 0; iy < CELLS; iy++) {
      for (let ix = 0; ix < CELLS; ix++) {
        const cx = (ix + 0.5) / CELLS, cy = (iy + 0.5) / CELLS;
        out.push({ cx, cy, p: trueProb(cx, cy) });
      }
    }
    return out;
  }, [trueProb]);

  // Local boundary line: a0 + a1*(x-qx) + a2*(y-qy) = 0.5
  // → along x-axis for y=qy:  x = qx + (0.5 - a0) / a1
  const { a0, a1, a2 } = localExplanation;
  const localBndX = a1 !== 0 ? qx + (0.5 - a0) / a1 : null;

  return (
    <Panel eyebrow="SIMULATION" title="LIME · local linear explanation"
           meta={`P(class B) = ${round(localExplanation.prob, 3)}`}
           caption="LIME samples points around the query (dashed circle), weights them by distance, and fits a simple linear model locally. The dotted line is the local decision boundary — valid only within the circle.">
      <div className="sim-row">
        <div className="sim-controls" style={{minWidth:200}}>
          <div className="sim-ctrl">
            <label>Query X <span className="mono">{round(qx, 2)}</span></label>
            <input type="range" min="0.05" max="0.95" step="0.01" value={qx}
                   onChange={e => setQx(+e.target.value)} />
          </div>
          <div className="sim-ctrl">
            <label>Query Y <span className="mono">{round(qy, 2)}</span></label>
            <input type="range" min="0.05" max="0.95" step="0.01" value={qy}
                   onChange={e => setQy(+e.target.value)} />
          </div>
          <div className="sim-stats" style={{marginTop:12}}>
            <div><div className="k">P(class B)</div><div className="v" style={{color:'#5B3EE8'}}>{round(localExplanation.prob,3)}</div></div>
            <div><div className="k">Local ∂/∂x</div>
              <div className="v" style={{color: a1>=0?'#1FAF7E':'#D83A3A'}}>
                {a1>=0?'+':''}{round(a1,3)}
              </div>
            </div>
            <div><div className="k">Local ∂/∂y</div>
              <div className="v" style={{color: a2>=0?'#1FAF7E':'#D83A3A'}}>
                {a2>=0?'+':''}{round(a2,3)}
              </div>
            </div>
          </div>
          <p className="prose" style={{fontSize:11,marginTop:8,lineHeight:1.5}}>
            {Math.abs(a1) > Math.abs(a2)
              ? <><strong>Feature X</strong> drives this prediction more than Y locally.</>
              : <><strong>Feature Y</strong> drives this prediction more than X locally.</>}
          </p>
        </div>

        <div className="plot-wrap" style={{flex:1}}>
          <div className="sim-plot-head">
            Decision boundary
            <span className="hint">class A (blue) · class B (pink) · locality circle (dashed)</span>
          </div>
          <svg viewBox={`0 0 ${SW} ${SH}`} style={{width:'100%',cursor:'crosshair'}}>
            {/* Background heat-map */}
            {cells.map(({ cx, cy, p }, i) => {
              const r = Math.round(91 + p * 164), g = Math.round(62 + (1-p)*100),
                    b = Math.round(232 * (1-p) + 164 * p);
              return (
                <rect key={i}
                      x={cx * SW - SW / CELLS / 2} y={(1-cy) * SH - SH / CELLS / 2}
                      width={SW / CELLS + 1} height={SH / CELLS + 1}
                      fill={`rgb(${r},${g},${b})`} opacity="0.35"/>
              );
            })}

            {/* True global boundary line (x=0.5 approx) */}
            <line x1={0.5*SW} y1={0} x2={0.5*SW} y2={SH}
                  stroke="rgba(244,242,236,0.4)" strokeWidth="1.5" strokeDasharray="5 3"/>
            <text x={0.5*SW+4} y={14} fontSize="9" fill="rgba(244,242,236,0.5)"
                  fontFamily="'JetBrains Mono',monospace">global boundary</text>

            {/* Locality circle */}
            <circle cx={qsvgX} cy={qsvgY} r={rSvg}
                    fill="rgba(244,242,236,0.05)"
                    stroke="rgba(244,242,236,0.7)" strokeWidth="1.5" strokeDasharray="6 4"/>

            {/* Local linear boundary */}
            {localBndX !== null && localBndX > 0 && localBndX < 1 && (
              <line x1={localBndX * SW} y1={qsvgY - rSvg * 0.9}
                    x2={localBndX * SW} y2={qsvgY + rSvg * 0.9}
                    stroke="#E8A031" strokeWidth="2" strokeDasharray="4 3"/>
            )}

            {/* Query point */}
            <circle cx={qsvgX} cy={qsvgY} r="7"
                    fill={localExplanation.prob >= 0.5 ? '#E8318F' : '#5B3EE8'}
                    stroke="#FBF8F1" strokeWidth="2"/>
            <text x={qsvgX + 10} y={qsvgY + 4} fontSize="10" fill="#FBF8F1"
                  fontFamily="'JetBrains Mono',monospace">query</text>

            {/* Axis labels */}
            <text x={SW - 4} y={SH - 4} textAnchor="end" fontSize="9" fill="#6A6270"
                  fontFamily="'JetBrains Mono',monospace">X →</text>
            <text x={4} y={14} fontSize="9" fill="#6A6270"
                  fontFamily="'JetBrains Mono',monospace">Y ↑</text>
            <text x={8} y={SH/2} fontSize="9" fill="rgba(91,62,232,0.7)"
                  fontFamily="'JetBrains Mono',monospace">A</text>
            <text x={SW-16} y={SH/2} fontSize="9" fill="rgba(232,49,143,0.7)"
                  fontFamily="'JetBrains Mono',monospace">B</text>
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
 * 3 · Permutation Importance
 *     5 features, baseline accuracy, shuffle → accuracy drop.
 *     Rerunnable with different random seeds.
 * ============================================================ */
const PERM_FEATURES = [
  { key: 'credit_score',    label: 'Credit score',    trueImportance: 0.21 },
  { key: 'income',          label: 'Annual income',   trueImportance: 0.14 },
  { key: 'debt_ratio',      label: 'Debt ratio',      trueImportance: 0.11 },
  { key: 'employment_yrs',  label: 'Employment yrs',  trueImportance: 0.07 },
  { key: 'savings',         label: 'Savings',         trueImportance: 0.04 },
];
const PERM_BASELINE = 0.847;

function PermutationImportance() {
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(false);

  const results = useMemo(() => {
    const rng = mulberry32(seed * 31337);
    return PERM_FEATURES.map(f => {
      const noise = (rng() - 0.5) * 0.025;
      const drop = clamp(f.trueImportance + noise, 0.005, 0.35);
      const shuffledAcc = clamp(PERM_BASELINE - drop, 0.45, 0.99);
      return { ...f, drop, shuffledAcc };
    });
  }, [seed]);

  const maxDrop = Math.max(...results.map(r => r.drop));
  const BAR_W = 280;

  function handleShuffle() {
    setRunning(true);
    setTimeout(() => { setSeed(s => s + 1); setRunning(false); }, 600);
  }

  return (
    <Panel eyebrow="SIMULATION" title="Permutation importance"
           meta={`baseline accuracy ${PERM_BASELINE.toFixed(3)}`}
           caption="Shuffle one feature column at random → model loses access to it → accuracy drops. The bigger the drop, the more the model relied on that feature. Hit Shuffle to resample noise.">
      <div className="sim-row">
        <div className="sim-controls" style={{minWidth:180}}>
          <div className="sim-stats">
            <div><div className="k">Baseline acc</div><div className="v" style={{color:'#1FAF7E'}}>{PERM_BASELINE.toFixed(3)}</div></div>
            <div><div className="k">Top feature</div>
              <div className="v" style={{color:'#E8A031',fontSize:11}}>
                {results.reduce((a,b) => a.drop > b.drop ? a : b).label}
              </div>
            </div>
          </div>
          <button className={`btn btn-sm ${running ? 'btn-primary' : ''}`}
                  style={{marginTop:16}} onClick={handleShuffle} disabled={running}>
            {running ? '⟳ Shuffling…' : '⊞ Shuffle features'}
          </button>
          <p className="prose" style={{fontSize:11,marginTop:10,lineHeight:1.5}}>
            Each run adds small random noise to simulate repeated permutations. The ranking stays stable — that's the signal.
          </p>
        </div>

        <div className="plot-wrap" style={{flex:1}}>
          <div className="sim-plot-head">
            Accuracy after shuffle
            <span className="hint">red = post-shuffle · line = baseline</span>
          </div>
          <svg viewBox={`0 0 ${BAR_W + 80} ${results.length * 46 + 30}`} style={{width:'100%'}}>
            {results.map((f, i) => {
              const barFull = (f.shuffledAcc / PERM_BASELINE) * BAR_W;
              const baseBarFull = BAR_W;
              const y = 16 + i * 46;
              const isTop = f.drop === maxDrop;
              return (
                <g key={f.key}>
                  <text x={0} y={y + 12} fontSize="10" fill={isTop ? '#E8A031' : '#C7C4BC'}
                        fontFamily="'JetBrains Mono',monospace" fontWeight={isTop ? '700' : '400'}>
                    {f.label}
                  </text>
                  {/* Baseline bar (ghost) */}
                  <rect x={0} y={y + 17} width={baseBarFull} height={10}
                        fill="rgba(164,157,154,0.15)" rx="2"/>
                  {/* Shuffled bar */}
                  <rect x={0} y={y + 17} width={Math.max(barFull, 2)} height={10}
                        fill={isTop ? '#E8A031' : '#D83A3A'} rx="2" opacity="0.85"
                        style={{transition:'width 400ms ease'}}/>
                  {/* Baseline line */}
                  <line x1={baseBarFull} y1={y + 14} x2={baseBarFull} y2={y + 30}
                        stroke="rgba(244,242,236,0.5)" strokeWidth="1.5" strokeDasharray="3 2"/>
                  {/* Drop label */}
                  <text x={baseBarFull + 4} y={y + 26} fontSize="10"
                        fill={isTop ? '#E8A031' : '#D83A3A'}
                        fontFamily="'JetBrains Mono',monospace">
                    −{round(f.drop, 3)}
                  </text>
                </g>
              );
            })}
            {/* Axis */}
            <line x1={0} y1={results.length * 46 + 10} x2={BAR_W} y2={results.length * 46 + 10}
                  stroke="#A49D9A" strokeWidth="0.6"/>
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
 * 4 · Global vs Local
 *     20 data points, click one → global bar constant,
 *     local SHAP changes per point.
 * ============================================================ */
const GVL_FEATURES = ['credit_score', 'income', 'debt_ratio', 'employment_yrs'];
const GVL_WEIGHTS  = [0.38, 0.26, -0.22, 0.14]; // global weights (normalized)

function GlobalVsLocal() {
  const [selected, setSelected] = useState(null);

  const points = useMemo(() => {
    const rng = mulberry32(999);
    return Array.from({ length: 20 }, (_, i) => {
      const x = 0.08 + rng() * 0.84;
      const y = 0.08 + rng() * 0.84;
      const featureVals = GVL_FEATURES.map(() => rng() * 2 - 1); // [-1, 1]
      const score = clamp(0.5 + featureVals.reduce((s, v, j) => s + v * GVL_WEIGHTS[j], 0), 0.05, 0.95);
      return { id: i, x, y, score, featureVals };
    });
  }, []);

  const globalImportance = GVL_WEIGHTS.map((w, j) => ({
    label: GVL_FEATURES[j], importance: Math.abs(w),
  }));

  const localShap = useMemo(() => {
    if (selected === null) return null;
    const pt = points[selected];
    return GVL_FEATURES.map((label, j) => ({
      label,
      contrib: pt.featureVals[j] * GVL_WEIGHTS[j],
    }));
  }, [selected, points]);

  const SW = 260, SH = 260;
  const BAR_MAX = 120;

  return (
    <Panel eyebrow="SIMULATION" title="Global vs local explanations"
           meta={selected !== null ? `point #${selected} selected · score ${round(points[selected].score, 3)}` : '20 data points · click one'}
           caption="Global importance is the same for every prediction — it describes the model overall. Local SHAP values change for every data point. Click any dot to see how its explanation differs from the global view.">
      <div className="sim-row">
        {/* Scatter plot */}
        <div className="plot-wrap" style={{flex:'0 0 auto', width: SW + 20}}>
          <div className="sim-plot-head">Data points <span className="hint">click any dot</span></div>
          <svg viewBox={`0 0 ${SW} ${SH}`} style={{width:'100%', cursor:'pointer'}}>
            <rect x={0} y={0} width={SW} height={SH} fill="rgba(20,18,22,0.3)" rx="4"/>
            {points.map(pt => {
              const cx = pt.x * SW, cy = (1 - pt.y) * SH;
              const isSel = selected === pt.id;
              const color = pt.score >= 0.5 ? '#1FAF7E' : '#D83A3A';
              return (
                <g key={pt.id} onClick={() => setSelected(pt.id)} style={{cursor:'pointer'}}>
                  {isSel && (
                    <circle cx={cx} cy={cy} r="13" fill="none"
                            stroke="#E8A031" strokeWidth="2" opacity="0.7"/>
                  )}
                  <circle cx={cx} cy={cy} r={isSel ? 7 : 5}
                          fill={color} stroke={isSel ? '#FBF8F1' : 'none'}
                          strokeWidth="1.5" opacity="0.9"/>
                  {isSel && (
                    <text x={cx + 10} y={cy + 4} fontSize="10" fill="#E8A031"
                          fontFamily="'JetBrains Mono',monospace">#{pt.id}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side-by-side bars */}
        <div style={{flex:1, display:'flex', flexDirection:'column', gap:12, minWidth:0}}>
          {/* Global importance */}
          <div className="plot-wrap">
            <div className="sim-plot-head">
              Global importance
              <span className="hint">same for every point</span>
            </div>
            <svg viewBox={`0 0 ${BAR_MAX + 100} ${GVL_FEATURES.length * 28 + 8}`} style={{width:'100%'}}>
              {globalImportance.map((f, i) => (
                <g key={f.label}>
                  <text x={0} y={i * 28 + 15} fontSize="10" fill="#C7C4BC"
                        fontFamily="'JetBrains Mono',monospace">{f.label}</text>
                  <rect x={0} y={i * 28 + 19} width={f.importance * BAR_MAX} height={9}
                        fill="#5B3EE8" rx="2" opacity="0.8"/>
                  <text x={f.importance * BAR_MAX + 4} y={i * 28 + 27} fontSize="9"
                        fill="#5B3EE8" fontFamily="'JetBrains Mono',monospace">
                    {round(f.importance, 3)}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Local SHAP */}
          <div className="plot-wrap">
            <div className="sim-plot-head">
              Local SHAP
              <span className="hint">{selected === null ? 'click a point above' : `point #${selected}`}</span>
            </div>
            {localShap === null ? (
              <p className="prose" style={{fontSize:11,padding:'8px 0',opacity:0.5}}>
                Select a data point to see its local explanation.
              </p>
            ) : (
              <svg viewBox={`0 0 ${BAR_MAX * 2 + 100} ${GVL_FEATURES.length * 28 + 8}`} style={{width:'100%'}}>
                {/* Zero line */}
                <line x1={BAR_MAX + 0} y1={0} x2={BAR_MAX + 0} y2={GVL_FEATURES.length * 28 + 8}
                      stroke="rgba(164,157,154,0.3)" strokeWidth="1"/>
                {localShap.map((f, i) => {
                  const pos = f.contrib >= 0;
                  const barW = Math.abs(f.contrib) * BAR_MAX * 1.8;
                  const barX = pos ? BAR_MAX : BAR_MAX - barW;
                  const color = pos ? '#1FAF7E' : '#D83A3A';
                  return (
                    <g key={f.label}>
                      <text x={0} y={i * 28 + 15} fontSize="10" fill="#C7C4BC"
                            fontFamily="'JetBrains Mono',monospace">{f.label}</text>
                      <rect x={barX} y={i * 28 + 19} width={Math.max(barW, 2)} height={9}
                            fill={color} rx="2" opacity="0.85"
                            style={{transition:'all 300ms ease'}}/>
                      <text x={pos ? BAR_MAX + barW + 4 : BAR_MAX - barW - 4}
                            y={i * 28 + 27} textAnchor={pos ? 'start' : 'end'}
                            fontSize="9" fill={color}
                            fontFamily="'JetBrains Mono',monospace">
                        {f.contrib >= 0 ? '+' : ''}{round(f.contrib, 3)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
 * Chapter root
 * ============================================================ */
function Ch07_Interpret() {
  return (
    <>
      <Hero eyebrow="Chapter 07 · Interpret"
            title={'A model you can&rsquo;t explain is a <em>liability.</em>'}
            hook={'A 0.91 AUC model is worthless to the business until you can answer <strong>&ldquo;why did it say yes?&rdquo;</strong>. SHAP, LIME, permutation importance — the toolkit for accountability.'}
            meta={[{k:'Read',v:'10 min'},{k:'Focus',v:'SHAP · LIME · Permutation'},{k:'Sims',v:'4 interactive'}]}/>

      {/* 07.1 — SHAP Waterfall */}
      <section className="section">
        <SectionLabel n="07.1">Per-instance explanations — SHAP</SectionLabel>
        <h2 className="h2">SHAP: game theory meets ML.</h2>
        <p className="prose">
          SHAP (SHapley Additive exPlanations) distributes "prediction credit" across features using
          cooperative game theory. For each prediction, see exactly which features pushed it toward
          approval — and by how much. The waterfall chart shows the running total from baseline to
          final score. Slide each feature to see contributions shift in real time.
        </p>
        <SHAPWaterfallSim/>
      </section>

      {/* 07.2 — LIME */}
      <section className="section">
        <SectionLabel n="07.2">Local approximation — LIME</SectionLabel>
        <h2 className="h2">Complex model, simple explanation — nearby.</h2>
        <p className="prose">
          LIME (Local Interpretable Model-agnostic Explanations) sidesteps the global complexity by
          asking a simpler question: <em>what linear model fits the model's behavior around this one point?</em>
          It samples nearby points, weights them by proximity, and fits a lightweight proxy. Move the
          query point and watch the local boundary shift.
        </p>
        <LIMEExplainer/>
      </section>

      {/* 07.3 — Permutation importance */}
      <section className="section">
        <SectionLabel n="07.3">Global feature importance — permutation</SectionLabel>
        <h2 className="h2">Corrupt one column. Measure the damage.</h2>
        <p className="prose">
          Permutation importance breaks the relationship between a feature and the target by randomly
          shuffling its column — the model still runs, but that feature is now noise. The accuracy
          drop tells you how much the model relied on it. Unlike impurity-based importances (which
          favour high-cardinality features), permutation importance is robust across model types.
        </p>
        <PermutationImportance/>
      </section>

      {/* 07.4 — Global vs Local */}
      <section className="section">
        <SectionLabel n="07.4">Global ≠ local</SectionLabel>
        <h2 className="h2">The model's average behaviour can be wrong for <em>your</em> user.</h2>
        <p className="prose">
          A feature can rank high globally yet barely move a specific individual's prediction —
          or vice versa. Click any data point and compare its local SHAP to the global importance bar.
          This is why fairness audits, regulatory explanations, and high-stakes decisions require
          <em> local</em> explanations, not just global summaries.
        </p>
        <GlobalVsLocal/>
      </section>

      {/* Anti-patterns */}
      <section className="section">
        <AntiPatterns items={[
          '<b>Using feature importance as causation.</b> A high SHAP value means the model <em>uses</em> the feature, not that changing it will change the outcome (see Ch 09).',
          '<b>Trusting global importance alone for individual decisions.</b> Global rankings can completely misrepresent what drives a single prediction.',
          '<b>LIME radius too large.</b> If the locality is too wide, the linear approximation covers non-linear territory and the explanation misleads.',
          '<b>Permutation on training data.</b> Always permute on held-out data — shuffling on train can underestimate importance if the model memorised the column.',
        ]}/>
        <BestPractices items={[
          '<b>SHAP for audit trails:</b> per-decision, additive, and guaranteed to sum to the prediction gap.',
          '<b>Permutation for global sense-checking:</b> model-agnostic, catches surprises, scales to any architecture.',
          '<b>LIME for stakeholder demos:</b> easy to explain — "we zoomed in on the neighbourhood around your application."',
          '<b>Always show confidence / variance</b> of importance estimates — run permutation multiple times and report the spread.',
        ]}/>
      </section>

      <Takeaway items={[
        '<b>Accountability is the price of deployment.</b> Stakeholders will ask why — prepare the answer before launch.',
        '<b>SHAP for audits, permutation for global sense, LIME for local proxies.</b> Tools are complementary, not competing.',
        '<b>Correlation ≠ mechanism.</b> Feature importance does not equal causal influence (Ch 09). Do not confuse them in executive presentations.',
        '<b>Global ≠ local.</b> A model that is fair on average can be unfair for a specific subgroup. Always audit at both levels.',
      ]}/>
    </>
  );
}
window.Ch07_Interpret = Ch07_Interpret;
