/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, BestPractices, useInView, mulberry32, randn, clamp, lerp, round */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ==========================================================
 * Ch 02 · Explore
 * --------------------------------------------------------
 * Three interactive simulators:
 *   1. DistributionExplorer — SVG histogram with mean/median/mode
 *      lines, skewness + kurtosis, shape presets
 *   2. OutlierDetector — scatter with Z-score / IQR / IF toggle,
 *      outliers highlighted in the plot
 *   3. CorrelationMatrix — 4×4 heatmap with noise slider,
 *      Pearson r per cell
 * ========================================================== */

/* ----------------------------------------------------------
 * 1 · DISTRIBUTION EXPLORER
 * ---------------------------------------------------------- */
function DistributionExplorer() {
  const [shape, setShape]   = useState('normal');
  const [n, setN]           = useState(500);
  const [bins, setBins]     = useState(30);

  const W = 480, H = 260;
  const PADL = 30, PADR = 12, PADT = 16, PADB = 28;
  const plotW = W - PADL - PADR;
  const plotH = H - PADT - PADB;

  // Generate data
  const data = useMemo(() => {
    const rng = mulberry32(shape.charCodeAt(0) * 17 + n);
    const pts = [];
    for (let i = 0; i < n; i++) {
      let v;
      if (shape === 'normal')   v = randn(rng);
      else if (shape === 'skewed') {
        // Log-normal shifted to ~0 mean for display
        v = Math.exp(0.6 * randn(rng)) - 1.2;
      } else if (shape === 'bimodal') {
        v = rng() < 0.5 ? randn(rng) - 2.2 : randn(rng) + 2.2;
      } else { // uniform
        v = (rng() - 0.5) * 6;
      }
      pts.push(v);
    }
    return pts;
  }, [shape, n]);

  // Stats
  const stats = useMemo(() => {
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length;
    const sd = Math.sqrt(variance);
    const skewness = data.reduce((s, v) => s + ((v - mean) / sd) ** 3, 0) / data.length;
    const kurtosis = data.reduce((s, v) => s + ((v - mean) / sd) ** 4, 0) / data.length - 3;
    const min = sorted[0], max = sorted[sorted.length - 1];
    return { mean, median, sd, skewness, kurtosis, min, max, sorted };
  }, [data]);

  // Build histogram bins
  const histogram = useMemo(() => {
    const { min, max } = stats;
    const bw = (max - min) / bins;
    const counts = new Array(bins).fill(0);
    data.forEach(v => {
      const idx = Math.min(Math.floor((v - min) / bw), bins - 1);
      counts[idx]++;
    });
    return { counts, bw, min, max };
  }, [data, bins, stats]);

  // Mode (bin with highest count)
  const modeCenter = useMemo(() => {
    const maxIdx = histogram.counts.indexOf(Math.max(...histogram.counts));
    return histogram.min + (maxIdx + 0.5) * histogram.bw;
  }, [histogram]);

  // Scale helpers
  const xScale = v => PADL + ((v - histogram.min) / (histogram.max - histogram.min)) * plotW;
  const maxCount = Math.max(...histogram.counts);
  const yScale = count => PADT + plotH - (count / maxCount) * plotH;

  // Bars
  const barW = plotW / bins;

  // Stat lines x positions
  const meanX   = xScale(stats.mean);
  const medianX = xScale(stats.median);
  const modeX   = xScale(modeCenter);

  const SHAPES = ['normal', 'skewed', 'bimodal', 'uniform'];
  const NS = [50, 500, 5000];

  const skewLabel = s =>
    Math.abs(s) < 0.3 ? 'symmetric' : s > 0 ? 'right-skewed' : 'left-skewed';
  const kurtLabel = k =>
    k > 1 ? 'leptokurtic (heavy tails)' : k < -1 ? 'platykurtic (light tails)' : 'mesokurtic (normal)';

  return (
    <Panel eyebrow="SIMULATOR" title="Distribution Explorer"
           meta="shape · N · bins"
           caption="Mean (purple), median (teal), mode (orange). Skewness and excess kurtosis shown below.">
      <div className="sim-row">
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Shape</label>
            <div className="sim-ctrl-row" style={{flexWrap:'wrap',gap:4}}>
              {SHAPES.map(s => (
                <button key={s} className={`btn btn-sm${shape===s?' active':''}`}
                        onClick={() => setShape(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="sim-ctrl">
            <label>N <span className="mono">{n}</span></label>
            <div className="sim-ctrl-row" style={{gap:4}}>
              {NS.map(v => (
                <button key={v} className={`btn btn-sm${n===v?' active':''}`}
                        onClick={() => setN(v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="sim-ctrl">
            <label>Bins <span className="mono">{bins}</span></label>
            <input type="range" min="10" max="60" step="1" value={bins}
                   onChange={e => setBins(+e.target.value)} />
          </div>
          <div className="sim-stats">
            <div><div className="k">Mean</div><div className="v mono">{round(stats.mean,3)}</div></div>
            <div><div className="k">Median</div><div className="v mono">{round(stats.median,3)}</div></div>
            <div><div className="k">SD</div><div className="v mono">{round(stats.sd,3)}</div></div>
            <div><div className="k">Skew</div><div className="v mono">{round(stats.skewness,2)}</div></div>
            <div><div className="k">Kurt</div><div className="v mono">{round(stats.kurtosis,2)}</div></div>
          </div>
          <div style={{fontSize:11,opacity:0.5,lineHeight:1.4,marginTop:4}}>
            {skewLabel(stats.skewness)}<br/>{kurtLabel(stats.kurtosis)}
          </div>
        </div>

        <div className="plot-wrap">
          <svg viewBox={`0 0 ${W} ${H}`}>
            {/* Axes */}
            <line x1={PADL} y1={PADT+plotH} x2={PADL+plotW} y2={PADT+plotH}
                  stroke="rgba(244,242,236,0.15)" strokeWidth="1"/>
            <line x1={PADL} y1={PADT} x2={PADL} y2={PADT+plotH}
                  stroke="rgba(244,242,236,0.15)" strokeWidth="1"/>

            {/* Bars */}
            {histogram.counts.map((c, i) => {
              const bx = PADL + i * barW;
              const bh = (c / maxCount) * plotH;
              const by = PADT + plotH - bh;
              return (
                <rect key={i} x={bx+0.5} y={by} width={Math.max(barW-1,1)} height={bh}
                      fill="#5B3EE8" opacity="0.7" rx="1"/>
              );
            })}

            {/* Mean line */}
            {meanX > PADL && meanX < PADL+plotW && (
              <line x1={meanX} y1={PADT} x2={meanX} y2={PADT+plotH}
                    stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="4 2"/>
            )}
            {/* Median line */}
            {medianX > PADL && medianX < PADL+plotW && (
              <line x1={medianX} y1={PADT} x2={medianX} y2={PADT+plotH}
                    stroke="#2DD4BF" strokeWidth="1.5" strokeDasharray="4 2"/>
            )}
            {/* Mode line */}
            {modeX > PADL && modeX < PADL+plotW && (
              <line x1={modeX} y1={PADT} x2={modeX} y2={PADT+plotH}
                    stroke="#FB923C" strokeWidth="1.5" strokeDasharray="4 2"/>
            )}

            {/* Legend */}
            <circle cx={PADL+8}  cy={PADT+8} r={4} fill="#A78BFA"/>
            <text x={PADL+16} y={PADT+12} fill="#A78BFA" fontSize="9">mean</text>
            <circle cx={PADL+52} cy={PADT+8} r={4} fill="#2DD4BF"/>
            <text x={PADL+60} y={PADT+12} fill="#2DD4BF" fontSize="9">median</text>
            <circle cx={PADL+104} cy={PADT+8} r={4} fill="#FB923C"/>
            <text x={PADL+112} y={PADT+12} fill="#FB923C" fontSize="9">mode</text>

            {/* X axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
              const val = histogram.min + frac * (histogram.max - histogram.min);
              const tx = PADL + frac * plotW;
              return (
                <g key={i}>
                  <line x1={tx} y1={PADT+plotH} x2={tx} y2={PADT+plotH+4}
                        stroke="rgba(244,242,236,0.25)" strokeWidth="1"/>
                  <text x={tx} y={H-4} textAnchor="middle"
                        fill="rgba(244,242,236,0.4)" fontSize="8">{round(val,1)}</text>
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
 * 2 · OUTLIER DETECTOR
 * ---------------------------------------------------------- */
function OutlierDetector() {
  const [method, setMethod] = useState('zscore');

  const W = 380, H = 260;
  const PADL = 28, PADR = 12, PADT = 16, PADB = 28;
  const plotW = W - PADL - PADR;
  const plotH = H - PADT - PADB;

  // Generate 50 points: ~44 normal, 6 outliers
  const { points, meanX, sdX, meanY, sdY, q1X, q3X, q1Y, q3Y } = useMemo(() => {
    const rng = mulberry32(99);
    const rawX = [], rawY = [];
    for (let i = 0; i < 44; i++) {
      rawX.push(randn(rng) * 1.0);
      rawY.push(randn(rng) * 1.0);
    }
    // Add 6 outliers
    const outlierCoords = [
      [4.1, 0.3], [-3.8, 0.5], [0.2, 4.2], [3.5, 3.5], [-3.0, -3.2], [0.5, -4.5]
    ];
    outlierCoords.forEach(([ox, oy]) => { rawX.push(ox); rawY.push(oy); });

    const meanX = rawX.reduce((s,v)=>s+v,0)/rawX.length;
    const meanY = rawY.reduce((s,v)=>s+v,0)/rawY.length;
    const sdX = Math.sqrt(rawX.reduce((s,v)=>s+(v-meanX)**2,0)/rawX.length);
    const sdY = Math.sqrt(rawY.reduce((s,v)=>s+(v-meanY)**2,0)/rawY.length);

    const sortedX = [...rawX].sort((a,b)=>a-b);
    const sortedY = [...rawY].sort((a,b)=>a-b);
    const q1X = sortedX[Math.floor(sortedX.length*0.25)];
    const q3X = sortedX[Math.floor(sortedX.length*0.75)];
    const q1Y = sortedY[Math.floor(sortedY.length*0.25)];
    const q3Y = sortedY[Math.floor(sortedY.length*0.75)];

    const points = rawX.map((x, i) => ({ x, y: rawY[i], isOutlier: i >= 44 }));
    return { points, meanX, sdX, meanY, sdY, q1X, q3X, q1Y, q3Y };
  }, []);

  // Identify outliers per method
  const flagged = useMemo(() => {
    return points.map(p => {
      if (method === 'zscore') {
        const zx = Math.abs((p.x - meanX) / sdX);
        const zy = Math.abs((p.y - meanY) / sdY);
        return zx > 3 || zy > 3;
      }
      if (method === 'iqr') {
        const iqrX = q3X - q1X, iqrY = q3Y - q1Y;
        const outX = p.x < q1X - 1.5*iqrX || p.x > q3X + 1.5*iqrX;
        const outY = p.y < q1Y - 1.5*iqrY || p.y > q3Y + 1.5*iqrY;
        return outX || outY;
      }
      // Isolation forest approximation: distance-based proxy
      const dist = Math.sqrt((p.x - meanX)**2 + (p.y - meanY)**2);
      return dist > 3.2;
    });
  }, [method, points, meanX, sdX, meanY, sdY, q1X, q3X, q1Y, q3Y]);

  const numFlagged = flagged.filter(Boolean).length;

  // Viewport mapping
  const xMin = -5.5, xMax = 5.5, yMin = -5.5, yMax = 5.5;
  const px = v => PADL + ((v - xMin) / (xMax - xMin)) * plotW;
  const py = v => PADT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const METHODS = [
    { id: 'zscore', label: 'Z-score', desc: 'Flag points more than 3 standard deviations from the mean. Fast and interpretable, but assumes normality.' },
    { id: 'iqr',    label: 'IQR',     desc: 'Flag points beyond 1.5 × IQR from the quartiles (Tukey fences). Robust to skew; no normality assumption.' },
    { id: 'isoforest', label: 'Isolation Forest', desc: 'Isolates anomalies by random partitioning. Points that require fewer splits are anomalies. Works in high dimensions.' },
  ];

  const activeDesc = METHODS.find(m => m.id === method)?.desc ?? '';

  return (
    <Panel eyebrow="SIMULATOR" title="Outlier Detector"
           meta="toggle method → see highlights"
           caption={`Flagged: ${numFlagged} / ${points.length} points.  ${activeDesc}`}>
      <div className="sim-row">
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Method</label>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {METHODS.map(m => (
                <button key={m.id}
                        className={`btn btn-sm${method===m.id?' active':''}`}
                        onClick={() => setMethod(m.id)}
                        style={{textAlign:'left'}}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="sim-stats" style={{marginTop:12}}>
            <div><div className="k">Flagged</div><div className="v mono" style={{color:'#F87171'}}>{numFlagged}</div></div>
            <div><div className="k">Clean</div><div className="v mono" style={{color:'#4ADE80'}}>{points.length - numFlagged}</div></div>
          </div>
          <div style={{marginTop:8}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
              <circle r={4} style={{width:8,height:8,borderRadius:'50%',background:'#4ADE80',display:'inline-block'}}/>
              <span style={{fontSize:10,opacity:0.6}}>inlier</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#F87171',display:'inline-block'}}/>
              <span style={{fontSize:10,opacity:0.6}}>flagged outlier</span>
            </div>
          </div>
        </div>

        <div className="plot-wrap">
          <svg viewBox={`0 0 ${W} ${H}`}>
            {/* Grid */}
            <line x1={px(0)} y1={PADT} x2={px(0)} y2={PADT+plotH}
                  stroke="rgba(244,242,236,0.08)" strokeWidth="1"/>
            <line x1={PADL} y1={py(0)} x2={PADL+plotW} y2={py(0)}
                  stroke="rgba(244,242,236,0.08)" strokeWidth="1"/>

            {/* Z-score boundary ellipse (visual guide) */}
            {method === 'zscore' && (
              <ellipse cx={px(meanX)} cy={py(meanY)}
                       rx={3*sdX/(xMax-xMin)*plotW}
                       ry={3*sdY/(yMax-yMin)*plotH}
                       fill="none" stroke="#A78BFA" strokeWidth="1"
                       strokeDasharray="5 3" opacity="0.4"/>
            )}
            {/* IQR fence rectangle */}
            {method === 'iqr' && (() => {
              const iqrX = q3X - q1X, iqrY = q3Y - q1Y;
              const lx = px(q1X - 1.5*iqrX), rx = px(q3X + 1.5*iqrX);
              const ty = py(q3Y + 1.5*iqrY), by = py(q1Y - 1.5*iqrY);
              return (
                <rect x={lx} y={ty} width={rx-lx} height={by-ty}
                      fill="none" stroke="#FBBF24" strokeWidth="1"
                      strokeDasharray="5 3" opacity="0.4"/>
              );
            })()}

            {/* Points */}
            {points.map((p, i) => (
              <circle key={i} cx={px(p.x)} cy={py(p.y)} r={flagged[i] ? 5 : 3.5}
                      fill={flagged[i] ? '#F87171' : '#4ADE80'}
                      opacity={flagged[i] ? 0.95 : 0.65}
                      style={{transition:'fill 0.3s, r 0.3s'}}/>
            ))}

            {/* Axes labels */}
            <text x={PADL + plotW/2} y={H-4} textAnchor="middle"
                  fill="rgba(244,242,236,0.3)" fontSize="8">Feature X</text>
            <text x={8} y={PADT + plotH/2} textAnchor="middle"
                  fill="rgba(244,242,236,0.3)" fontSize="8"
                  transform={`rotate(-90,8,${PADT+plotH/2})`}>Feature Y</text>
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------
 * 3 · CORRELATION MATRIX
 * ---------------------------------------------------------- */
function CorrelationMatrix() {
  const [noise, setNoise] = useState(0);

  const VARS = ['Age', 'Income', 'Score', 'Satisf.'];
  const N_VARS = 4;
  const N_OBS = 300;

  // True correlation structure (before noise)
  // age-income: 0.65, age-score: -0.20, age-sat: 0.10
  // income-score: 0.40, income-sat: 0.55
  // score-sat: 0.70
  const TRUE_CORR = [
    [1.00,  0.65, -0.20,  0.10],
    [0.65,  1.00,  0.40,  0.55],
    [-0.20, 0.40,  1.00,  0.70],
    [0.10,  0.55,  0.70,  1.00],
  ];

  // Compute effective correlations after noise
  const corrMatrix = useMemo(() => {
    return TRUE_CORR.map(row =>
      row.map((r, j) =>
        j === row.indexOf(r) ? 1.0
          : r * (1 - noise) + (Math.random() < 0.5 ? 1 : -1) * noise * 0.05
      )
    );
  }, [noise]);

  // Re-derive corr from simulated data for accuracy
  const computedCorr = useMemo(() => {
    const rng = mulberry32(42 + Math.round(noise * 100));
    // Generate correlated data using Cholesky-ish approach
    const raw = Array.from({length: N_VARS}, () => []);
    for (let i = 0; i < N_OBS; i++) {
      const z = Array.from({length: N_VARS}, () => randn(rng));
      // Build variables with true correlations blended with noise
      const noiseFactor = noise;
      const age    = z[0];
      const income = TRUE_CORR[0][1] * (1-noiseFactor) * z[0] + Math.sqrt(1-(TRUE_CORR[0][1]*(1-noiseFactor))**2) * z[1];
      const score  = TRUE_CORR[0][2] * (1-noiseFactor) * z[0] + TRUE_CORR[1][2] * (1-noiseFactor) * z[1] * 0.5 + Math.sqrt(0.5) * z[2];
      const sat    = TRUE_CORR[0][3] * (1-noiseFactor) * z[0] + TRUE_CORR[1][3] * (1-noiseFactor) * z[1] * 0.5 + TRUE_CORR[2][3] * (1-noiseFactor) * z[2] * 0.5 + Math.sqrt(0.3) * z[3];
      raw[0].push(age); raw[1].push(income); raw[2].push(score); raw[3].push(sat);
    }
    // Compute Pearson r for each pair
    const means = raw.map(col => col.reduce((s,v)=>s+v,0)/N_OBS);
    const sds   = raw.map((col, ci) => Math.sqrt(col.reduce((s,v)=>s+(v-means[ci])**2,0)/N_OBS));
    const mat = Array.from({length: N_VARS}, (_, i) =>
      Array.from({length: N_VARS}, (_, j) => {
        if (i === j) return 1.0;
        const cov = raw[i].reduce((s, v, k) => s + (v-means[i])*(raw[j][k]-means[j]), 0) / N_OBS;
        return round(cov / (sds[i] * sds[j]), 2);
      })
    );
    return mat;
  }, [noise]);

  // Color scale: -1 (red) … 0 (neutral) … +1 (blue)
  const corrColor = r => {
    if (r >= 0) {
      const t = r;
      const rb = Math.round(lerp(30, 91, 1-t));
      const gb = Math.round(lerp(30, 62, 1-t));
      const bb = Math.round(lerp(30, 232, 1-t));
      return `rgb(${rb},${gb},${bb})`;
    } else {
      const t = -r;
      const rr = Math.round(lerp(30, 239, 1-t));
      const gr = Math.round(lerp(30, 68, 1-t));
      const br = Math.round(lerp(30, 68, 1-t));
      return `rgb(${rr},${gr},${br})`;
    }
  };

  const CELL = 72;
  const LABEL_W = 52;
  const SVG_W = LABEL_W + N_VARS * CELL + 8;
  const SVG_H = LABEL_W + N_VARS * CELL + 8;

  return (
    <Panel eyebrow="SIMULATOR" title="Correlation Matrix"
           meta="drag noise → watch r decay"
           caption="Pearson r per cell. Blue = positive, red = negative. Drag noise to simulate measurement error.">
      <div className="sim-row">
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Noise <span className="mono">{round(noise,2)}</span></label>
            <input type="range" min="0" max="1" step="0.01" value={noise}
                   onChange={e => setNoise(+e.target.value)} />
          </div>
          <div style={{fontSize:10,opacity:0.5,lineHeight:1.6,marginTop:8}}>
            0 = true structure<br/>
            1 = pure noise<br/>
            Watch r shrink toward 0.
          </div>
          <div className="sim-stats" style={{marginTop:12}}>
            <div>
              <div className="k">Max |r|</div>
              <div className="v mono">
                {round(Math.max(...computedCorr.flatMap((row,i)=>row.map((v,j)=>i!==j?Math.abs(v):0))),2)}
              </div>
            </div>
            <div>
              <div className="k">Strong pairs</div>
              <div className="v mono">
                {computedCorr.flatMap((row,i)=>row.map((v,j)=>i<j&&Math.abs(v)>=0.5?1:0)).reduce((a,b)=>a+b,0)}
              </div>
            </div>
          </div>
          {/* Color scale legend */}
          <div style={{marginTop:12}}>
            <div style={{fontSize:9,opacity:0.4,marginBottom:4}}>Color scale</div>
            <svg width={80} height={14}>
              <defs>
                <linearGradient id="corrGrad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="rgb(239,68,68)"/>
                  <stop offset="50%" stopColor="rgb(30,30,30)"/>
                  <stop offset="100%" stopColor="rgb(91,62,232)"/>
                </linearGradient>
              </defs>
              <rect x={0} y={0} width={80} height={10} fill="url(#corrGrad)" rx={2}/>
              <text x={0}  y={14} fill="rgba(244,242,236,0.4)" fontSize="7">−1</text>
              <text x={34} y={14} fill="rgba(244,242,236,0.4)" fontSize="7">0</text>
              <text x={68} y={14} fill="rgba(244,242,236,0.4)" fontSize="7">+1</text>
            </svg>
          </div>
        </div>

        <div className="plot-wrap">
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
            {/* Column labels */}
            {VARS.map((v, j) => (
              <text key={j}
                    x={LABEL_W + j * CELL + CELL/2}
                    y={LABEL_W - 6}
                    textAnchor="middle"
                    fill="rgba(244,242,236,0.6)"
                    fontSize="10">{v}</text>
            ))}
            {/* Row labels */}
            {VARS.map((v, i) => (
              <text key={i}
                    x={LABEL_W - 6}
                    y={LABEL_W + i * CELL + CELL/2 + 4}
                    textAnchor="end"
                    fill="rgba(244,242,236,0.6)"
                    fontSize="10">{v}</text>
            ))}
            {/* Cells */}
            {computedCorr.map((row, i) =>
              row.map((r, j) => {
                const cx = LABEL_W + j * CELL;
                const cy = LABEL_W + i * CELL;
                const isDiag = i === j;
                return (
                  <g key={`${i}-${j}`}>
                    <rect x={cx+1} y={cy+1} width={CELL-2} height={CELL-2}
                          fill={isDiag ? 'rgba(244,242,236,0.06)' : corrColor(r)}
                          rx={3}
                          style={{transition:'fill 0.4s'}}/>
                    <text x={cx + CELL/2} y={cy + CELL/2 + 5}
                          textAnchor="middle"
                          fill={isDiag ? 'rgba(244,242,236,0.4)' : (Math.abs(r) > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(244,242,236,0.6)')}
                          fontSize="11" fontWeight="600">
                      {isDiag ? '—' : r.toFixed(2)}
                    </text>
                  </g>
                );
              })
            )}
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------
 * CHAPTER ROOT
 * ---------------------------------------------------------- */
function Ch02_Explore({ chapter, goTo }) {
  return (
    <div className="chapter-root">
      <Hero
        eyebrow="Chapter 02"
        title="Exploratory Data Analysis — <em>look before you leap.</em>"
        hook="Thirty minutes of plots save thirty days of debugging. Before a single <code>.fit()</code>, answer: what shape, what outliers, what correlations? This chapter is the checklist."
        meta={[
          { k: 'Topics', v: 'Distributions · Outliers · Correlations' },
          { k: 'Time',   v: '10 min' },
          { k: 'Sims',   v: '3 interactive' },
          { k: 'Level',  v: 'Core' },
        ]}
      />

      {/* ── Section 1: Distributions ── */}
      <SectionLabel n="01">Distribution Shapes</SectionLabel>

      <p className="prose">
        The histogram is the first thing you draw on any new dataset — not a mean, not a
        scatter plot. A histogram tells you at a glance whether your data is roughly bell-shaped
        (safe to use parametric tests), skewed (log-transform candidate), bimodal (hidden
        sub-populations?), or uniform (likely a synthetic key, not a real measurement).
      </p>
      <p className="prose">
        <strong>Skewness</strong> measures asymmetry. Positive skew (long right tail) pushes
        the mean above the median — classic for income, latency, claim sizes.
        <strong> Kurtosis</strong> (excess) measures tail weight. Heavy-tailed distributions
        (kurtosis &gt; 0) produce more extreme events than a normal, which matters for risk
        and anomaly detection. Change N to see how estimation stabilises with more data.
      </p>

      <DistributionExplorer />

      <BestPractices items={[
        '<b>Always plot a histogram before computing statistics.</b> Summary stats can be identical for wildly different distributions (Anscombe\'s Quartet is the classic proof).',
        '<b>If skewness &gt; 1, consider log-transforming</b> before fitting linear models or computing Pearson r.',
        '<b>Vary bin count.</b> Freedman-Diaconis rule (bin width ∝ IQR · n<sup>−1/3</sup>) is a solid automatic choice.',
        '<b>Compare mean vs. median.</b> A large gap signals skew or heavy outliers contaminating the mean.',
      ]} title="Best practices — distributions" />

      {/* ── Section 2: Outliers ── */}
      <SectionLabel n="02">Outlier Detection</SectionLabel>

      <p className="prose">
        Outliers are not bugs — they are signals. A transaction 50× the typical value could
        be fraud, a test-account flush, or a genuine whale customer. The right move is to
        detect, investigate, and then decide: remove, cap (winsorise), or model separately.
        Never silently drop outliers without documenting why.
      </p>
      <p className="prose">
        Three detection strategies dominate in practice.
        <strong> Z-score</strong> (threshold = 3σ) is fast but assumes normality — it
        collapses on heavily skewed data.
        <strong> IQR fences</strong> (Tukey, 1.5 × IQR) are distribution-free and robust to
        skew. They are the default in most box-plot implementations.
        <strong> Isolation Forest</strong> recursively partitions the feature space at random;
        anomalies require fewer splits to isolate. It scales to high dimensions where
        distance-based methods fail.
      </p>

      <OutlierDetector />

      <AntiPatterns items={[
        '<b>Removing outliers to improve R².</b> Outliers contain information. Deleting them without investigation is data falsification.',
        '<b>Using only Z-score on skewed data.</b> When data is right-skewed, Z-score almost never flags right-tail extremes because the mean and SD are already pulled right.',
        '<b>Treating multivariate outliers as univariate ones.</b> A point at (x=1.5σ, y=1.5σ) looks fine on each axis but can be a genuine outlier in 2D joint space (Mahalanobis distance catches this).',
      ]} title="Outlier anti-patterns" />

      {/* ── Section 3: Correlations ── */}
      <SectionLabel n="03">Correlation Structure</SectionLabel>

      <p className="prose">
        A correlation matrix gives you a bird's-eye view of linear relationships across all
        feature pairs. It answers: which features move together, which are independent, and
        which might be proxies for the same underlying cause. This matters for feature
        selection (collinear features add noise) and for understanding the domain
        (high income–satisfaction correlation hints at a mechanism worth investigating).
      </p>
      <p className="prose">
        Drag the <strong>noise slider</strong> to simulate measurement noise or a smaller
        effective sample. Watch Pearson r decay toward 0 — this is the attenuation bias that
        plagues survey data, wearable sensors, and self-reported measurements. Correcting for
        attenuation (disattenuation) is an underused technique in applied ML.
      </p>

      <CorrelationMatrix />

      <AntiPatterns items={[
        '<b>Equating high correlation with causation.</b> Spurious correlates are everywhere. Always ask: is there a common cause? (Ch 09 covers causal graphs.)',
        '<b>Computing Pearson r on non-linear relationships.</b> Two variables with a perfect U-shape have r ≈ 0. Use Spearman rank correlation or mutual information instead.',
        '<b>Ignoring multicollinearity.</b> Two features with r = 0.95 carry almost the same information. Keeping both inflates variance in linear models and makes coefficients unstable.',
        '<b>Reading a correlation matrix and skipping the scatter plots.</b> Always spot-check the highest correlations visually — outliers can manufacture or destroy Pearson r.',
      ]} title="Correlation anti-patterns" />

      <BestPractices items={[
        '<b>Plot the correlation matrix as a heatmap</b> — not a table of numbers. The visual makes high/low clusters obvious at a glance.',
        '<b>For non-normal or ordinal data, use Spearman\'s ρ</b> instead of Pearson r.',
        '<b>After finding strong correlations, cluster features</b> (hierarchical clustering on the distance matrix 1−|r|) to reveal groups of redundant predictors.',
        '<b>Check the target variable last.</b> Strong correlation with the target is useful; strong correlation between two features you plan to use together is a red flag.',
      ]} title="Best practices — correlations" />

      {/* ── Takeaway ── */}
      <Takeaway items={[
        '<b>Histogram first, stats second.</b> Mean and variance are summaries of a shape you haven\'t seen yet — look at the shape first.',
        '<b>Outliers are signals, not noise.</b> Detect with Z-score for normal data, IQR for skewed data, and Isolation Forest for high-dimensional data. Then investigate before deleting.',
        '<b>Correlation r measures linear association only.</b> Always complement with scatter plots and consider Spearman for ordinal or non-normal data.',
        '<b>Noise attenuates correlations.</b> Measurement error biases r toward zero — the true relationship is stronger than your matrix suggests.',
        '<b>EDA is a checklist, not a one-time event.</b> Rerun it after every data join, imputation step, or feature engineering pass. New transformations create new distributions.',
      ]} />
    </div>
  );
}

window.Ch02_Explore = Ch02_Explore;
