/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, BestPractices, useInView, useTicker, mulberry32, randn, clamp, round */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ═══════════════════════════════════════════════════════════════
 * 1. ModelServingArchitecture — interactive SVG diagram
 * ═══════════════════════════════════════════════════════════════ */
const ARCH_NODES = [
  { id: 'client',    x: 30,  y: 85,  w: 80,  h: 36, label: 'Client',          color: '#7B8CDE',
    desc: 'Browser, mobile app, or internal service sending a prediction request.',
    fail: 'Timeout on slow model inference; unbounded retries can flood the system.' },
  { id: 'lb',        x: 155, y: 85,  w: 80,  h: 36, label: 'Load Balancer',   color: '#A78BFA',
    desc: 'Distributes traffic across API replicas. Implements health checks and circuit breakers.',
    fail: 'Single point of failure if not redundant; sticky sessions break horizontal scaling.' },
  { id: 'api1',      x: 285, y: 55,  w: 80,  h: 36, label: 'REST API ①',      color: '#64E2B5',
    desc: 'Stateless prediction server. Validates input, fetches features, calls model artifact.',
    fail: 'Memory leak from model object not being shared across workers.' },
  { id: 'api2',      x: 285, y: 115, w: 80,  h: 36, label: 'REST API ②',      color: '#64E2B5',
    desc: 'Replica of API ①. Autoscales based on request queue depth or CPU.',
    fail: 'Version mismatch with API ①: different model artifact loaded after rolling deploy.' },
  { id: 'fs',        x: 415, y: 55,  w: 90,  h: 36, label: 'Feature Store',   color: '#F4C542',
    desc: 'Precomputed feature vectors keyed by entity ID. Serves sub-millisecond lookups from Redis or DynamoDB.',
    fail: 'Stale features: ingestion pipeline lags → model sees yesterday\'s data in production.' },
  { id: 'registry',  x: 415, y: 115, w: 90,  h: 36, label: 'Model Registry',  color: '#FF9F6B',
    desc: 'Stores model artifacts with version tags, metrics, and lineage. Source of truth for "which model is live".',
    fail: 'No champion/challenger tagging → rollback picks wrong artifact.' },
  { id: 'monitor',   x: 285, y: 185, w: 90,  h: 36, label: 'Monitoring',      color: '#FF6B80',
    desc: 'Captures prediction logs, feature drift (PSI), latency p99, and ground-truth error rate when labels arrive.',
    fail: 'Alert fatigue: too many noisy metrics → real drift goes unnoticed.' },
];

const ARCH_ARROWS = [
  { x1: 110, y1: 103, x2: 155, y2: 103 },
  { x1: 235, y1: 103, x2: 285, y2: 73  },
  { x1: 235, y1: 103, x2: 285, y2: 133 },
  { x1: 365, y1: 73,  x2: 415, y2: 73  },
  { x1: 365, y1: 133, x2: 415, y2: 133 },
  { x1: 325, y1: 91,  x2: 325, y2: 185 },
  { x1: 415, y1: 133, x2: 375, y2: 203 },
];

function ModelServingArchitecture() {
  const [hovered, setHovered] = useState(null);
  const node = ARCH_NODES.find(n => n.id === hovered);
  return (
    <Panel eyebrow="DIAGRAM" title="Model serving architecture"
           caption="Hover each component to see its role and common failure modes in production.">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <svg viewBox="0 0 560 240" style={{ flex: '1 1 320px', minWidth: 300, overflow: 'visible' }}>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(244,242,236,0.25)" />
            </marker>
          </defs>
          {ARCH_ARROWS.map((a, i) => (
            <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                  stroke="rgba(244,242,236,0.2)" strokeWidth="1.5" markerEnd="url(#arr)" />
          ))}
          {ARCH_NODES.map(n => (
            <g key={n.id} style={{ cursor: 'pointer' }}
               onMouseEnter={() => setHovered(n.id)}
               onMouseLeave={() => setHovered(null)}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="6"
                    fill={hovered === n.id ? n.color : 'rgba(244,242,236,0.06)'}
                    stroke={n.color}
                    strokeWidth={hovered === n.id ? 2 : 1}
                    style={{ transition: 'fill 0.18s, stroke-width 0.18s' }} />
              <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={hovered === n.id ? '#0D0D0C' : n.color}
                    fontSize="9.5" fontFamily="'JetBrains Mono',monospace" fontWeight="600"
                    style={{ pointerEvents: 'none', transition: 'fill 0.18s' }}>
                {n.label}
              </text>
            </g>
          ))}
        </svg>
        <div style={{ flex: '1 1 200px', minWidth: 180, minHeight: 120,
                      padding: '14px 16px', borderRadius: 8,
                      background: 'rgba(244,242,236,0.04)', border: '1px solid rgba(244,242,236,0.1)',
                      transition: 'all 0.18s' }}>
          {node ? (
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: node.color, marginBottom: 8 }}>{node.label}</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-1)', marginBottom: 10 }}>
                {node.desc}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: '#FF6B80', marginBottom: 6 }}>Common failure</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{node.fail}</div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontStyle: 'italic', paddingTop: 8 }}>
              Hover a component to inspect it.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * 2. DriftSimulator — accuracy + PSI time-series with start/pause
 * ═══════════════════════════════════════════════════════════════ */
function computeSeries(driftIntensity, seed = 7) {
  const rng = mulberry32(seed);
  return Array.from({ length: 60 }, (_, i) => {
    const stable = i < 30;
    const driftFactor = stable ? 0 : (i - 30) * driftIntensity * 0.018;
    const conceptShift = stable ? 0 : (i - 30) * driftIntensity * 0.008;
    const acc = clamp(0.876 - driftFactor + 0.012 * randn(rng), 0.5, 0.98);
    const psi = clamp(stable ? 0.02 + 0.005 * Math.abs(randn(rng)) : 0.02 + (i - 30) * driftIntensity * 0.012 + 0.01 * Math.abs(randn(rng)), 0, 0.8);
    const boundary = stable ? 0.5 : clamp(0.5 + conceptShift + 0.02 * randn(rng), 0.3, 0.7);
    return { day: i + 1, acc, psi, boundary };
  });
}

function LineChart({ series, yKey, yMin, yMax, width = 420, height = 130,
                     color, thresholdVal, thresholdLabel, cursorDay, label }) {
  const pts = series.map((p, i) => {
    const x = (i / (series.length - 1)) * width;
    const y = height - ((p[yKey] - yMin) / (yMax - yMin)) * height;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const thY = thresholdVal != null ? height - ((thresholdVal - yMin) / (yMax - yMin)) * height : null;
  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} style={{ width: '100%' }}>
      {thY != null && (
        <>
          <line x1="0" y1={thY} x2={width} y2={thY}
                stroke="rgba(255,107,128,0.45)" strokeDasharray="5 4" />
          <text x="4" y={thY - 3} fill="#FF6B80" fontSize="8.5" fontFamily="'JetBrains Mono',monospace">
            {thresholdLabel} · {thresholdVal}
          </text>
        </>
      )}
      <line x1={width / 2} y1="0" x2={width / 2} y2={height}
            stroke="rgba(244,242,236,0.08)" strokeDasharray="3 3" />
      <text x={width / 2 + 3} y="10" fill="#8A8680" fontSize="8" fontFamily="'JetBrains Mono',monospace">
        day 30 · drift start
      </text>
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.8" opacity="0.85" />
      {series.map((p, i) => {
        const x = (i / (series.length - 1)) * width;
        const y = height - ((p[yKey] - yMin) / (yMax - yMin)) * height;
        const alarm = thresholdVal != null && (yKey === 'psi' ? p[yKey] > thresholdVal : p[yKey] < thresholdVal);
        if (i !== cursorDay - 1 && !alarm) return null;
        return (
          <circle key={i} cx={x} cy={y} r={i === cursorDay - 1 ? 4 : 2.5}
                  fill={alarm ? '#FF6B80' : '#D1FF3A'} />
        );
      })}
      {cursorDay != null && (() => {
        const idx = cursorDay - 1;
        if (idx < 0 || idx >= series.length) return null;
        const x = (idx / (series.length - 1)) * width;
        const y = height - ((series[idx][yKey] - yMin) / (yMax - yMin)) * height;
        return (
          <>
            <line x1={x} y1="0" x2={x} y2={height} stroke="rgba(244,242,236,0.2)" strokeWidth="1" />
            <text x={x + 4} y={y - 5} fill="rgba(244,242,236,0.7)" fontSize="8.5"
                  fontFamily="'JetBrains Mono',monospace">
              {round(series[idx][yKey], 3)}
            </text>
          </>
        );
      })()}
      <text x="4" y={height + 14} fill="#8A8680" fontSize="8.5" fontFamily="'JetBrains Mono',monospace">
        {label}
      </text>
    </svg>
  );
}

function DriftSimulator() {
  const [running, setRunning] = useState(false);
  const [day, setDay] = useState(1);
  const [driftIntensity, setDriftIntensity] = useState(1.0);
  const tickRef = useRef(null);

  const series = useMemo(() => computeSeries(driftIntensity), [driftIntensity]);
  const current = series[Math.min(day - 1, series.length - 1)];
  const psiAlarm = current.psi > 0.2;
  const accAlarm = current.acc < 0.82;

  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => {
        setDay(d => {
          if (d >= 60) { setRunning(false); return 60; }
          return d + 1;
        });
      }, 120);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [running]);

  const handleStart = () => { if (day >= 60) setDay(1); setRunning(true); };

  return (
    <Panel eyebrow="SIMULATION" title="Drift simulator"
           meta={`Day ${day} / 60`}
           caption="Days 1–30: distribution is stable. Days 31–60: data drift intensifies. PSI > 0.2 triggers an alarm. Watch accuracy and PSI decay together.">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
        <div className="sim-controls" style={{ flex: '0 0 200px' }}>
          <div className="sim-ctrl">
            <label>Drift intensity <span className="mono">{driftIntensity.toFixed(1)}</span></label>
            <input type="range" min="0" max="3" step="0.1" value={driftIntensity}
                   onChange={e => { setDriftIntensity(+e.target.value); setDay(1); setRunning(false); }} />
          </div>
          <div className="sim-ctrl" style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn" onClick={handleStart} disabled={running}>
              {day >= 60 ? '↺ Restart' : '▶ Start'}
            </button>
            <button className="btn" onClick={() => setRunning(false)} disabled={!running}>
              ⏸ Pause
            </button>
          </div>
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 7,
                        background: psiAlarm ? 'rgba(255,107,128,0.1)' : 'rgba(100,226,181,0.07)',
                        border: `1px solid ${psiAlarm ? 'rgba(255,107,128,0.35)' : 'rgba(100,226,181,0.25)'}` }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          color: psiAlarm ? '#FF6B80' : '#64E2B5' }}>
              {psiAlarm ? '⚠ PSI ALARM' : '✓ PSI OK'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 5 }}>
              PSI = {round(current.psi, 3)} {psiAlarm ? '> 0.2 → retrain!' : '≤ 0.2 → stable'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 3 }}>
              Accuracy = {round(current.acc, 3)} {accAlarm ? '⬇ degraded' : ''}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 3 }}>
              Decision boundary = {round(current.boundary, 3)}
            </div>
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 7,
                        background: 'rgba(244,242,236,0.04)', border: '1px solid rgba(244,242,236,0.08)',
                        fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--ink-2)' }}>PSI</strong> = Σ (actual% − expected%) × ln(actual%/expected%).
            Values &lt;0.1 = no shift. 0.1–0.2 = slight. &gt;0.2 = retrain.
          </div>
        </div>
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <LineChart series={series} yKey="acc" yMin={0.6} yMax={1.0}
                     color="#D1FF3A" thresholdVal={0.82} thresholdLabel="alert"
                     cursorDay={day} label="Model accuracy (AUC) over 60 days" />
          <LineChart series={series} yKey="psi" yMin={0} yMax={0.6}
                     color="#7B8CDE" thresholdVal={0.2} thresholdLabel="PSI alarm"
                     cursorDay={day} label="PSI (Population Stability Index)" />
        </div>
      </div>
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * 3. ShadowDeployment — traffic split v1 / v2 + discrepancy table
 * ═══════════════════════════════════════════════════════════════ */
const STRATEGY_INFO = {
  shadow:   { label: 'Shadow deploy', color: '#A78BFA', desc: 'v2 gets all traffic mirrored silently. Its predictions are logged but never served. Zero user impact — the safest way to evaluate.' },
  canary:   { label: 'Canary deploy',  color: '#F4C542', desc: 'A small % of live traffic hits v2. Real users. Real labels soon. Roll back instantly if error rate spikes.' },
  bluegreen: { label: 'Blue-green',   color: '#64E2B5', desc: 'Two identical environments. One flip switches all traffic. Instant rollback by flipping back. High infra cost.' },
};

function makePredictions(seed, shift) {
  const rng = mulberry32(seed);
  return Array.from({ length: 8 }, (_, i) => {
    const base = round(0.3 + rng() * 0.6, 2);
    const v2 = round(clamp(base + shift * (rng() - 0.5) * 0.4, 0.01, 0.99), 2);
    return { id: `user_${1000 + i}`, v1: base, v2, diff: Math.abs(base - v2) > 0.15 };
  });
}

function ShadowDeployment() {
  const [trafficPct, setTrafficPct] = useState(0);
  const [strategy, setStrategy] = useState('shadow');
  const rows = useMemo(() => makePredictions(42, trafficPct / 40), [trafficPct]);
  const discRate = round(rows.filter(r => r.diff).length / rows.length, 2);
  const info = STRATEGY_INFO[strategy];
  return (
    <Panel eyebrow="SIMULATION" title="Shadow & canary deployment"
           caption="Slide the traffic knob to ramp v2 from 0% to 100%. The discrepancy rate reveals how differently the new model behaves before it serves real users.">
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
        <div className="sim-controls" style={{ flex: '0 0 210px' }}>
          <div className="sim-ctrl">
            <label>v2 traffic share <span className="mono">{trafficPct}%</span></label>
            <input type="range" min="0" max="100" step="5" value={trafficPct}
                   onChange={e => setTrafficPct(+e.target.value)} />
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(STRATEGY_INFO).map(([k, v]) => (
              <button key={k} className="btn"
                      style={{ background: strategy === k ? v.color : 'transparent',
                               color: strategy === k ? '#0D0D0C' : v.color,
                               borderColor: v.color, fontSize: 10.5, padding: '4px 8px' }}
                      onClick={() => setStrategy(k)}>
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 7,
                        background: 'rgba(244,242,236,0.04)', border: `1px solid ${info.color}44`,
                        fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            <strong style={{ color: info.color }}>{info.label}:</strong> {info.desc}
          </div>
          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7,
                        background: discRate > 0.3 ? 'rgba(255,107,128,0.1)' : 'rgba(100,226,181,0.07)',
                        border: `1px solid ${discRate > 0.3 ? 'rgba(255,107,128,0.35)' : 'rgba(100,226,181,0.25)'}`,
                        fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            <span style={{ color: discRate > 0.3 ? '#FF6B80' : '#64E2B5' }}>
              {discRate > 0.3 ? '⚠' : '✓'} Discrepancy rate: {(discRate * 100).toFixed(0)}%
            </span>
            <div style={{ color: 'var(--ink-3)', marginTop: 3, fontFamily: 'inherit', fontSize: 10.5 }}>
              {discRate > 0.3 ? 'High — investigate v2 before promoting.' : 'Low — safe to ramp v2 further.'}
            </div>
          </div>
        </div>
        <div style={{ flex: '1 1 260px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, padding: '6px 12px', borderRadius: 6, background: 'rgba(100,226,181,0.1)',
                          border: '1px solid rgba(100,226,181,0.25)', textAlign: 'center',
                          fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#64E2B5' }}>
              v1 live · {100 - trafficPct}%
            </div>
            <div style={{ flex: 1, padding: '6px 12px', borderRadius: 6, background: 'rgba(167,139,250,0.1)',
                          border: '1px solid rgba(167,139,250,0.25)', textAlign: 'center',
                          fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#A78BFA' }}>
              v2 shadow · {trafficPct}%
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr>
                {['Entity ID', 'v1 score', 'v2 score', 'Δ > 0.15'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '5px 8px',
                                       borderBottom: '1px solid rgba(244,242,236,0.1)',
                                       fontFamily: 'var(--font-mono)', fontSize: 9.5,
                                       color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ background: r.diff ? 'rgba(255,107,128,0.04)' : 'transparent' }}>
                  <td style={{ padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: 10.5,
                                color: 'var(--ink-2)' }}>{r.id}</td>
                  <td style={{ padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: 10.5,
                                color: '#64E2B5' }}>{r.v1}</td>
                  <td style={{ padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: 10.5,
                                color: '#A78BFA' }}>{r.v2}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center', fontSize: 12,
                                color: r.diff ? '#FF6B80' : 'var(--ink-3)' }}>
                    {r.diff ? '✗' : '·'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * 4. FeatureStoreDiagram — training-serving skew toggle
 * ═══════════════════════════════════════════════════════════════ */
const SKEW_STEPS = [
  { label: 'Raw SQL query', color: '#FF9F6B',
    train: 'SELECT AVG(spend_7d) FROM events WHERE ts > NOW() - 7d',
    serve: 'SELECT spend FROM user_profile WHERE user_id = ?',
    note: 'Training uses a 7-day rolling mean; serving reads a stale daily snapshot.' },
  { label: 'Normalisation', color: '#FF9F6B',
    train: 'StandardScaler fitted on 2023 data',
    serve: 'Manual min-max with hardcoded values from 2021',
    note: 'Different scaling → feature values live in different numerical ranges.' },
  { label: 'Missing imputation', color: '#FF9F6B',
    train: 'median impute (per-cohort)',
    serve: 'fill with global 0',
    note: 'Model learned cohort medians; serving fills zeros → systematic bias.' },
];

function FeatureStoreDiagram() {
  const [fsOn, setFsOn] = useState(false);
  const skewScore = fsOn ? 0.04 : 0.61;
  const skewColor = fsOn ? '#64E2B5' : '#FF6B80';
  return (
    <Panel eyebrow="DIAGRAM" title="Feature store & training-serving skew"
           caption="Training-serving skew is one of the most common silent killers in ML production. Toggle the feature store to see how a shared transformation layer eliminates it.">
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: '0 0 200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Feature Store</span>
            <button className="btn"
                    style={{ background: fsOn ? '#64E2B5' : 'transparent',
                             color: fsOn ? '#0D0D0C' : '#FF6B80',
                             borderColor: fsOn ? '#64E2B5' : '#FF6B80',
                             fontFamily: 'var(--font-mono)', fontSize: 10.5, padding: '4px 10px' }}
                    onClick={() => setFsOn(f => !f)}>
              {fsOn ? 'ON' : 'OFF'}
            </button>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 8,
                        background: 'rgba(244,242,236,0.04)', border: `1px solid ${skewColor}44`,
                        marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
              Skew score (lower = better)
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700,
                          color: skewColor, transition: 'color 0.3s' }}>
              {skewScore.toFixed(2)}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 4 }}>
              {fsOn ? 'Same transform, same result.' : 'Feature pipelines diverged.'}
            </div>
          </div>
          {!fsOn && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              Without a feature store, training and serving code diverge over time. Small differences compound into large prediction errors.
            </div>
          )}
          {fsOn && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              A shared feature store guarantees identical transformations at train time and serve time. Skew is structurally impossible.
            </div>
          )}
        </div>
        <div style={{ flex: '1 1 280px' }}>
          <svg viewBox="0 0 440 180" style={{ width: '100%' }}>
            {/* Training pipeline */}
            <text x="10" y="16" fill="#8A8680" fontSize="9" fontFamily="'JetBrains Mono',monospace"
                  letterSpacing="0.08em" textTransform="uppercase">TRAINING PIPELINE</text>
            <rect x="10" y="22" width="90" height="30" rx="5" fill="rgba(244,242,236,0.06)"
                  stroke="rgba(244,242,236,0.2)" />
            <text x="55" y="42" textAnchor="middle" fill="var(--ink-2)" fontSize="9.5"
                  fontFamily="'JetBrains Mono',monospace">Raw Data</text>
            <line x1="100" y1="37" x2="130" y2="37" stroke="rgba(244,242,236,0.2)" strokeWidth="1.5"
                  markerEnd="url(#arr)" />
            <rect x="130" y="22" width="90" height="30" rx="5"
                  fill={fsOn ? 'rgba(100,226,181,0.12)' : 'rgba(255,159,107,0.12)'}
                  stroke={fsOn ? '#64E2B5' : '#FF9F6B'} />
            <text x="175" y="42" textAnchor="middle" fill={fsOn ? '#64E2B5' : '#FF9F6B'} fontSize="9.5"
                  fontFamily="'JetBrains Mono',monospace">{fsOn ? 'Feature Store' : 'Transform A'}</text>
            <line x1="220" y1="37" x2="250" y2="37" stroke="rgba(244,242,236,0.2)" strokeWidth="1.5"
                  markerEnd="url(#arr)" />
            <rect x="250" y="22" width="80" height="30" rx="5" fill="rgba(244,242,236,0.06)"
                  stroke="rgba(244,242,236,0.2)" />
            <text x="290" y="42" textAnchor="middle" fill="var(--ink-2)" fontSize="9.5"
                  fontFamily="'JetBrains Mono',monospace">Model Train</text>

            {/* Serving pipeline */}
            <text x="10" y="90" fill="#8A8680" fontSize="9" fontFamily="'JetBrains Mono',monospace"
                  letterSpacing="0.08em">SERVING PIPELINE</text>
            <rect x="10" y="96" width="90" height="30" rx="5" fill="rgba(244,242,236,0.06)"
                  stroke="rgba(244,242,236,0.2)" />
            <text x="55" y="116" textAnchor="middle" fill="var(--ink-2)" fontSize="9.5"
                  fontFamily="'JetBrains Mono',monospace">Live Request</text>
            <line x1="100" y1="111" x2="130" y2="111" stroke="rgba(244,242,236,0.2)" strokeWidth="1.5"
                  markerEnd="url(#arr)" />
            <rect x="130" y="96" width="90" height="30" rx="5"
                  fill={fsOn ? 'rgba(100,226,181,0.12)' : 'rgba(255,107,128,0.12)'}
                  stroke={fsOn ? '#64E2B5' : '#FF6B80'} />
            <text x="175" y="116" textAnchor="middle" fill={fsOn ? '#64E2B5' : '#FF6B80'} fontSize="9.5"
                  fontFamily="'JetBrains Mono',monospace">{fsOn ? 'Feature Store' : 'Transform B'}</text>
            <line x1="220" y1="111" x2="250" y2="111" stroke="rgba(244,242,236,0.2)" strokeWidth="1.5"
                  markerEnd="url(#arr)" />
            <rect x="250" y="96" width="80" height="30" rx="5" fill="rgba(244,242,236,0.06)"
                  stroke="rgba(244,242,236,0.2)" />
            <text x="290" y="116" textAnchor="middle" fill="var(--ink-2)" fontSize="9.5"
                  fontFamily="'JetBrains Mono',monospace">Prediction</text>

            {/* Skew arrow / connector */}
            {!fsOn && (
              <>
                <line x1="175" y1="52" x2="175" y2="96" stroke="#FF6B80" strokeWidth="1.5"
                      strokeDasharray="4 3" opacity="0.6" />
                <text x="180" y="80" fill="#FF6B80" fontSize="8.5" fontFamily="'JetBrains Mono',monospace">
                  SKEW
                </text>
              </>
            )}
            {fsOn && (
              <>
                <line x1="175" y1="52" x2="175" y2="96" stroke="#64E2B5" strokeWidth="2" opacity="0.7" />
                <text x="180" y="80" fill="#64E2B5" fontSize="8.5" fontFamily="'JetBrains Mono',monospace">
                  SHARED
                </text>
              </>
            )}

            {/* Legend */}
            {!fsOn && SKEW_STEPS.slice(0, 2).map((s, i) => (
              <g key={i}>
                <circle cx="12" cy={148 + i * 14} r="3" fill={s.color} />
                <text x="20" y={151 + i * 14} fill="var(--ink-3)" fontSize="9"
                      fontFamily="'JetBrains Mono',monospace">
                  {s.label}: {s.train.slice(0, 28)}…
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      {!fsOn && (
        <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SKEW_STEPS.map((s, i) => (
            <div key={i} style={{ flex: '1 1 160px', padding: '9px 12px', borderRadius: 7,
                                   background: 'rgba(255,107,128,0.06)',
                                   border: '1px solid rgba(255,107,128,0.2)', fontSize: 11 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                            color: '#FF9F6B', marginBottom: 5, letterSpacing: '0.08em',
                            textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ color: 'var(--ink-3)', lineHeight: 1.45 }}>{s.note}</div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * Main export
 * ═══════════════════════════════════════════════════════════════ */
function Ch11_Deploy() {
  return (
    <>
      <Hero eyebrow="Chapter 11 · Deploy"
            title='Shipping is <em>chapter one</em>, not chapter twelve.'
            hook="A model in a notebook is research. A model in production is engineering. <strong>Architecture, drift, shadow deploys, feature stores</strong> — the craft of keeping a model alive."
            meta={[
              { k: 'Read', v: '12 min' },
              { k: 'Focus', v: 'Serving · Drift · Deployment strategies · Feature stores' },
              { k: 'Sims', v: '4 interactive' },
            ]} />

      <section className="section">
        <SectionLabel n="11.1">Serving architecture</SectionLabel>
        <h2 className="h2">From notebook to load balancer to feature store — every hop is a failure point.</h2>
        <p className="prose">Production ML is not a model. It is a system: request routing, feature retrieval, model serving, and monitoring wired together. Understanding each component's role — and its failure mode — is what separates a model that survives its first week from one that silently degrades for months.</p>
        <ModelServingArchitecture />
      </section>

      <section className="section">
        <SectionLabel n="11.2">Drift detection</SectionLabel>
        <h2 className="h2">Data drift. Concept drift. Two kinds of rot, one retrain pipeline.</h2>
        <p className="prose">
          <strong>Data drift</strong> is when the input distribution shifts — your model was trained on 2023 users, but it's now seeing 2025 users with different behaviour. Measure it with PSI (Population Stability Index): sum of (actual − expected) × ln(actual/expected) over buckets. PSI &gt; 0.2 means retrain.
        </p>
        <p className="prose">
          <strong>Concept drift</strong> is subtler: the relationship between features and labels changes. Even if inputs look the same, the model's decision boundary is now wrong. Detection requires ground-truth labels — a lag of days to weeks in most production systems.
        </p>
        <DriftSimulator />
      </section>

      <section className="section">
        <SectionLabel n="11.3">Deployment strategies</SectionLabel>
        <h2 className="h2">Never ship a model cold. Shadow → canary → blue-green.</h2>
        <p className="prose">The goal of a deployment strategy is to reduce the blast radius of a bad model. Shadow deploys give you data without risk. Canary gives you real-user signal on a slice. Blue-green gives you instant rollback at the cost of doubled infrastructure.</p>
        <ShadowDeployment />
      </section>

      <section className="section">
        <SectionLabel n="11.4">Feature stores & training-serving skew</SectionLabel>
        <h2 className="h2">The silent killer: features computed differently at train time vs. serve time.</h2>
        <p className="prose">Training-serving skew is when your training pipeline and serving pipeline compute features differently. The model was trained on one distribution; it scores on another. The fix is structural: a shared feature store that computes transformations once and serves them identically to both pipelines.</p>
        <FeatureStoreDiagram />
      </section>

      <AntiPatterns items={[
        '<b>No rollback plan.</b> If the new model regresses on day one, you need a one-command revert to the previous artifact.',
        '<b>Training-serving skew.</b> Features computed with different SQL, different scalers, or different imputation strategies at train vs. serve time. A feature store prevents this structurally.',
        '<b>Deploying without shadow.</b> The first time a model runs in production should not be the first time you observe its predictions on live traffic.',
        '<b>Monitoring only accuracy.</b> Accuracy requires labels — which arrive late. Monitor feature distributions (PSI), prediction distribution, and latency as leading indicators.',
        '<b>One monolithic retrain.</b> Retraining is a product: versioned, tested, staged through shadow before promotion. A cron job that overwrites the model artifact is not a retrain pipeline.',
      ]} />

      <BestPractices items={[
        '<b>Shadow-first, always.</b> Route 100% of live traffic to v2 in shadow mode before any real ramp. Log predictions, compare offline. Only start canary after shadow looks clean.',
        '<b>Define retrain triggers explicitly.</b> PSI &gt; 0.2, AUC &lt; threshold, or label volume dropping below N — pick metrics, set thresholds, automate the alert.',
        '<b>Version everything: data, code, and model.</b> A model artifact without its training data snapshot and feature pipeline commit is not reproducible.',
        '<b>Use a feature store for any feature used in both training and serving.</b> Treat feature definitions as shared library code, not copy-paste SQL.',
        '<b>Test your rollback before you need it.</b> Rollback drills quarterly. If you have never triggered one, you do not know if it works.',
      ]} />

      <Takeaway items={[
        '<b>Models are code + data + distribution.</b> All three can rot independently. Monitor all three.',
        '<b>Deployment strategy is risk management.</b> Shadow → canary → blue-green is a spectrum of blast-radius control.',
        '<b>Skew is structural, not accidental.</b> Fix it with a shared feature store, not code reviews.',
        '<b>Retrain is a product, not a script.</b> Version it, stage it, roll it back — just like application code.',
      ]} />
    </>
  );
}

window.Ch11_Deploy = Ch11_Deploy;
