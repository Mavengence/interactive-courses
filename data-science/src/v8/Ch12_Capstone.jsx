/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, BestPractices, useInView, mulberry32, randn, clamp, round, normCdf */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ============================================================
 * 1. DatasetExplorer — class imbalance + sampling strategies
 * ============================================================ */
function DatasetExplorer() {
  const [strategy, setStrategy] = useState('none');

  const strategies = {
    none:          { label: 'None (raw)',       fraudRatio: 0.0017, legit: 284315, fraud: 492 },
    smote:         { label: 'SMOTE (oversample)', fraudRatio: 0.50,  legit: 284315, fraud: 284315 },
    undersample:   { label: 'Undersampling',    fraudRatio: 0.50,  legit: 492,    fraud: 492 },
  };

  const s = strategies[strategy];
  const total = s.legit + s.fraud;
  const fraudPct = (s.fraud / total * 100).toFixed(2);
  const legitPct = (s.legit / total * 100).toFixed(2);

  // Bar chart dimensions
  const W = 380, H = 120;
  const legitW = clamp((s.legit / Math.max(total, 1)) * W, 2, W - 2);
  const fraudW = clamp((s.fraud / Math.max(total, 1)) * W, 2, W);

  const naiveAcc = ((284315 / 284807) * 100).toFixed(2);

  return (
    <Panel eyebrow="SIMULATOR" title="Dataset explorer — class imbalance"
           meta={`Strategy: ${s.label}`}
           caption="Real-world fraud datasets are severely imbalanced. A naive model predicting 'always legitimate' scores 99.83% accuracy — a useless metric here.">
      <div className="sim-row">
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Sampling strategy</label>
            {Object.entries(strategies).map(([k, v]) => (
              <button key={k}
                      onClick={() => setStrategy(k)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 12px', marginBottom: 6, borderRadius: 6,
                        background: strategy === k ? 'var(--bg-hi)' : 'transparent',
                        border: strategy === k ? '1px solid var(--hair-2)' : '1px solid var(--hair)',
                        color: strategy === k ? 'var(--lime)' : 'var(--ink-3)',
                        font: 'inherit', fontSize: 12.5, cursor: 'pointer',
                      }}>
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8,
                        background: 'rgba(209,255,58,0.07)', border: '1px solid rgba(209,255,58,0.15)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--lime)',
                          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              Naive model
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
              Predict all-legit → <strong style={{ color: 'var(--ink-1)' }}>{naiveAcc}% accuracy</strong><br />
              Catches <strong style={{ color: '#FF6B80' }}>0 of 492 frauds</strong>
            </div>
          </div>
        </div>

        <div className="plot-wrap" style={{ flex: 1 }}>
          <svg viewBox={`0 0 ${W} ${H + 60}`} style={{ width: '100%' }}>
            {/* Legitimate bar */}
            <text x="0" y="18" fill="var(--ink-3)" fontSize="10" fontFamily="'JetBrains Mono',monospace">
              Legitimate
            </text>
            <rect x="0" y="24" width={legitW} height="28" rx="4"
                  fill="rgba(100,226,181,0.35)" stroke="rgba(100,226,181,0.6)" strokeWidth="1"
                  style={{ transition: 'width 0.5s ease' }} />
            <text x={Math.min(legitW + 4, W - 60)} y="43" fill="var(--mint)" fontSize="10"
                  fontFamily="'JetBrains Mono',monospace">
              {legitPct}%
            </text>

            {/* Fraud bar */}
            <text x="0" y="76" fill="var(--ink-3)" fontSize="10" fontFamily="'JetBrains Mono',monospace">
              Fraud
            </text>
            <rect x="0" y="82" width={fraudW} height="28" rx="4"
                  fill="rgba(255,107,128,0.35)" stroke="rgba(255,107,128,0.6)" strokeWidth="1"
                  style={{ transition: 'width 0.5s ease' }} />
            <text x={Math.min(fraudW + 4, W - 60)} y="101" fill="#FF6B80" fontSize="10"
                  fontFamily="'JetBrains Mono',monospace">
              {fraudPct}%
            </text>

            {/* Stats row */}
            <text x="0" y="148" fill="var(--ink-4)" fontSize="9.5" fontFamily="'JetBrains Mono',monospace">
              Legit: {s.legit.toLocaleString()}   Fraud: {s.fraud.toLocaleString()}   Total: {total.toLocaleString()}
            </text>
          </svg>

          {strategy === 'smote' && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--mint)' }}>SMOTE:</strong> Synthetic Minority Oversampling — interpolates new fraud samples between existing ones. Balanced dataset, but adds synthetic data risk.
            </div>
          )}
          {strategy === 'undersample' && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--lime)' }}>Undersampling:</strong> Drops majority class to match minority. Fast and clean, but discards 99.8% of your legitimate transaction data.
            </div>
          )}
          {strategy === 'none' && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--ink-2)' }}>Raw data:</strong> 0.17% fraud rate. Use PR-AUC, not accuracy. Weight classes during training.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
 * 2. PipelineProgress — manual step-through stepper
 * ============================================================ */
const PIPELINE_STEPS = [
  {
    label: 'Load & Inspect',
    icon: '📦',
    log: [
      '> Loading creditcard.csv …',
      '> Rows: 284,807  Columns: 31',
      '> Features: Time, V1-V28 (PCA), Amount, Class',
      '> Fraud transactions: 492 (0.172%)',
      '> No missing values detected.',
      '✓ Dataset loaded.',
    ],
  },
  {
    label: 'Feature Engineering',
    icon: '🔧',
    log: [
      '> V1–V28: PCA-transformed (already anonymised)',
      '> Amount: raw transaction value in EUR',
      '> Time: seconds elapsed since first transaction',
      '> Adding: log1p(Amount) to reduce skew',
      '> Adding: hour_of_day from Time feature',
      '✓ Feature matrix shape: (284807, 33)',
    ],
  },
  {
    label: 'Scale Amount & Time',
    icon: '⚖️',
    log: [
      '> StandardScaler on Amount and Time (not V1–V28)',
      '> Amount mean: 88.35 → scaled: 0.00',
      '> Amount std:  250.12',
      '> Time mean:   94813 → scaled: 0.00',
      '> Scaler fitted on train split only (no leakage)',
      '✓ Scaling complete.',
    ],
  },
  {
    label: 'Train/Test Split',
    icon: '✂️',
    log: [
      '> Stratified split: 80% train / 20% test',
      '> Train: 227,845 rows  (fraud: 394)',
      '> Test:   56,962 rows  (fraud:  98)',
      '> Fraud rate train: 0.173%  test: 0.172%',
      '> Stratification preserved class ratio ✓',
      '✓ Split complete.',
    ],
  },
  {
    label: 'Fit XGBoost',
    icon: '🌲',
    log: [
      '> XGBClassifier(n_estimators=300, max_depth=6,',
      '    scale_pos_weight=578, eval_metric="aucpr")',
      '> Training …',
      '> [100]  train-aucpr: 0.8812',
      '> [200]  train-aucpr: 0.9143',
      '> [300]  train-aucpr: 0.9271',
      '✓ Model fitted in 18.4s',
    ],
  },
  {
    label: 'Evaluate',
    icon: '📊',
    log: [
      '> Threshold: 0.30',
      '> Precision:  0.871',
      '> Recall:     0.918',
      '> F1:         0.894',
      '> PR-AUC:     0.934',
      '> ROC-AUC:    0.981',
      '✓ Model ready for threshold tuning.',
    ],
  },
];

function PipelineProgress() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [logLines, setLogLines] = useState([]);
  const [running, setRunning] = useState(false);
  const logRef = useRef(null);

  const runStep = useCallback(() => {
    if (running) return;
    const step = PIPELINE_STEPS[currentStep];
    setRunning(true);
    setLogLines([]);

    let i = 0;
    const interval = setInterval(() => {
      if (i < step.log.length) {
        setLogLines(prev => [...prev, step.log[i]]);
        i++;
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      } else {
        clearInterval(interval);
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setRunning(false);
        if (currentStep < PIPELINE_STEPS.length - 1) setCurrentStep(c => c + 1);
      }
    }, 200);
  }, [currentStep, running]);

  const reset = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setLogLines([]);
    setRunning(false);
  };

  return (
    <Panel eyebrow="SIMULATOR" title="ML pipeline — step-by-step"
           meta={`Step ${currentStep + 1} / ${PIPELINE_STEPS.length}`}
           caption="Each step is a real decision point. Run them in order — the output of each step feeds the next.">
      <div className="sim-row">
        {/* Stepper sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 170 }}>
          {PIPELINE_STEPS.map((step, i) => {
            const done = completedSteps.has(i);
            const active = i === currentStep;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6,
                background: active ? 'var(--bg-hi)' : 'transparent',
                border: active ? '1px solid var(--hair-2)' : '1px solid transparent',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: done ? 'rgba(100,226,181,0.2)' : active ? 'rgba(209,255,58,0.15)' : 'rgba(255,255,255,0.05)',
                  border: done ? '1px solid rgba(100,226,181,0.5)' : active ? '1px solid rgba(209,255,58,0.4)' : '1px solid var(--hair)',
                  color: done ? 'var(--mint)' : active ? 'var(--lime)' : 'var(--ink-4)',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, color: done ? 'var(--mint)' : active ? 'var(--ink-1)' : 'var(--ink-4)' }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Console output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div ref={logRef} style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.8,
            color: 'var(--ink-2)', background: 'rgba(0,0,0,0.35)',
            borderRadius: 8, border: '1px solid var(--hair)',
            padding: '14px 16px', minHeight: 160, maxHeight: 200,
            overflowY: 'auto',
          }}>
            {logLines.length === 0 && (
              <span style={{ color: 'var(--ink-4)' }}>
                {'// Click "Run step" to execute: '}{PIPELINE_STEPS[currentStep].label}
              </span>
            )}
            {logLines.map((line, i) => (
              <div key={i} style={{
                color: line.startsWith('✓') ? 'var(--mint)' : line.startsWith('>') ? 'var(--ink-2)' : 'var(--lime)',
              }}>{line}</div>
            ))}
            {running && <span style={{ color: 'var(--lime)', animation: 'none' }}>▋</span>}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={runStep}
              disabled={running || completedSteps.size === PIPELINE_STEPS.length}
              style={{
                padding: '10px 22px', borderRadius: 7, cursor: running ? 'wait' : 'pointer',
                background: running ? 'var(--bg-hi)' : 'var(--lime)', color: '#000',
                border: 'none', font: 'inherit', fontSize: 13, fontWeight: 700,
                opacity: completedSteps.size === PIPELINE_STEPS.length ? 0.4 : 1,
              }}>
              {running ? 'Running…' : completedSteps.size === PIPELINE_STEPS.length ? 'Done ✓' : `Run step ${currentStep + 1}`}
            </button>
            <button onClick={reset} style={{
              padding: '10px 18px', borderRadius: 7, cursor: 'pointer',
              background: 'transparent', color: 'var(--ink-3)',
              border: '1px solid var(--hair)', font: 'inherit', fontSize: 13,
            }}>Reset</button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
 * 3. PrecisionRecallTradeoff — PR curve + threshold slider
 * ============================================================ */
function PrecisionRecallTradeoff() {
  const [threshold, setThreshold] = useState(0.3);
  const [missedFraudCost, setMissedFraudCost] = useState(500);
  const [falseAlertCost, setFalseAlertCost] = useState(20);

  // Synthetic PR curve points (realistic XGBoost-like curve for fraud)
  const prCurve = useMemo(() => {
    const pts = [];
    for (let t = 0.01; t <= 0.99; t += 0.01) {
      // Parametric: as threshold rises, precision rises, recall falls
      const recall = Math.max(0, 1 - Math.pow(t, 0.6) * 0.98);
      const precision = Math.min(1, 0.05 + 0.95 * Math.pow(t, 0.25));
      pts.push({ t: round(t, 2), precision, recall });
    }
    return pts;
  }, []);

  const current = useMemo(() => {
    const closest = prCurve.reduce((best, p) =>
      Math.abs(p.t - threshold) < Math.abs(best.t - threshold) ? p : best, prCurve[0]);
    const f1 = closest.precision + closest.recall > 0
      ? 2 * closest.precision * closest.recall / (closest.precision + closest.recall) : 0;
    return { ...closest, f1 };
  }, [threshold, prCurve]);

  // Business cost at this threshold
  const totalFraudTxns = 492;
  const totalLegitTxns = 284315;
  const missedFraud = Math.round(totalFraudTxns * (1 - current.recall));
  const falseAlerts = Math.round(totalLegitTxns * (1 - current.precision) * current.recall);
  const totalCost = missedFraud * missedFraudCost + falseAlerts * falseAlertCost;

  // SVG PR curve
  const W = 300, H = 200;
  const px = (recall) => recall * W;
  const py = (precision) => H - precision * H;

  const pathD = prCurve.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${px(p.recall).toFixed(1)} ${py(p.precision).toFixed(1)}`
  ).join(' ');

  const dotX = px(current.recall);
  const dotY = py(current.precision);

  return (
    <Panel eyebrow="SIMULATOR" title="Precision–recall tradeoff"
           meta={`Threshold: ${threshold.toFixed(2)} · F1: ${round(current.f1, 3)}`}
           caption="In fraud detection, a missed fraud costs far more than a false alarm. Choose your threshold based on business costs, not just F1.">
      <div className="sim-row" style={{ alignItems: 'flex-start' }}>

        {/* PR Curve SVG */}
        <div className="plot-wrap" style={{ minWidth: 320 }}>
          <svg viewBox={`-24 -10 ${W + 40} ${H + 34}`} style={{ width: '100%' }}>
            {/* Axes */}
            <line x1="0" y1="0" x2="0" y2={H} stroke="var(--hair-2)" strokeWidth="1" />
            <line x1="0" y1={H} x2={W} y2={H} stroke="var(--hair-2)" strokeWidth="1" />
            {/* Axis labels */}
            <text x={W / 2} y={H + 22} textAnchor="middle" fill="var(--ink-4)" fontSize="9"
                  fontFamily="'JetBrains Mono',monospace">Recall</text>
            <text x="-16" y={H / 2} textAnchor="middle" fill="var(--ink-4)" fontSize="9"
                  fontFamily="'JetBrains Mono',monospace"
                  transform={`rotate(-90, -16, ${H / 2})`}>Precision</text>
            {/* Tick labels */}
            {[0, 0.5, 1].map(v => (
              <g key={v}>
                <text x={px(v)} y={H + 12} textAnchor="middle" fill="var(--ink-4)" fontSize="8"
                      fontFamily="'JetBrains Mono',monospace">{v}</text>
                <text x="-4" y={py(v) + 3} textAnchor="end" fill="var(--ink-4)" fontSize="8"
                      fontFamily="'JetBrains Mono',monospace">{v}</text>
              </g>
            ))}
            {/* PR curve */}
            <path d={pathD} stroke="var(--lime)" strokeWidth="2" fill="none" opacity="0.8" />
            {/* Current threshold dot */}
            <circle cx={dotX} cy={dotY} r="6" fill="var(--lime)" opacity="0.9" />
            <line x1={dotX} y1={dotY} x2={dotX} y2={H} stroke="var(--lime)" strokeWidth="1"
                  strokeDasharray="3 3" opacity="0.5" />
          </svg>
        </div>

        {/* Controls & metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          <div className="sim-ctrl">
            <label>Decision threshold &nbsp;<span className="mono">{threshold.toFixed(2)}</span></label>
            <input type="range" min="0.05" max="0.95" step="0.01"
                   value={threshold} onChange={e => setThreshold(+e.target.value)} />
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { k: 'Precision', v: round(current.precision, 3), color: 'var(--mint)' },
              { k: 'Recall',    v: round(current.recall, 3),    color: '#FF6B80' },
              { k: 'F1',        v: round(current.f1, 3),        color: 'var(--lime)' },
            ].map(m => (
              <div key={m.k} style={{ padding: '10px 12px', borderRadius: 7,
                                      background: 'var(--bg-hi)', border: '1px solid var(--hair)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-4)',
                              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{m.k}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: m.color }}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Business cost calculator */}
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, border: '1px solid var(--hair)', padding: '12px 14px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--lime)',
                          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
              Business cost calculator
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="sim-ctrl" style={{ margin: 0 }}>
                <label>Cost / missed fraud ($)<br />
                  <span className="mono">${missedFraudCost}</span></label>
                <input type="range" min="50" max="2000" step="50"
                       value={missedFraudCost} onChange={e => setMissedFraudCost(+e.target.value)} />
              </div>
              <div className="sim-ctrl" style={{ margin: 0 }}>
                <label>Cost / false alert ($)<br />
                  <span className="mono">${falseAlertCost}</span></label>
                <input type="range" min="1" max="200" step="1"
                       value={falseAlertCost} onChange={e => setFalseAlertCost(+e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
              <div style={{ color: 'var(--ink-3)' }}>Missed frauds<br />
                <strong style={{ color: '#FF6B80', fontSize: 16 }}>{missedFraud}</strong></div>
              <div style={{ color: 'var(--ink-3)' }}>False alerts<br />
                <strong style={{ color: 'var(--ink-2)', fontSize: 16 }}>{falseAlerts.toLocaleString()}</strong></div>
              <div style={{ color: 'var(--ink-3)' }}>Total cost<br />
                <strong style={{ color: 'var(--lime)', fontSize: 16 }}>${totalCost.toLocaleString()}</strong></div>
            </div>
          </div>

          {/* Threshold commentary */}
          <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            {threshold <= 0.25 && <><strong style={{ color: '#FF6B80' }}>Low threshold:</strong> Catches most fraud but flags many legitimate transactions. High operational cost.</>}
            {threshold > 0.25 && threshold <= 0.45 && <><strong style={{ color: 'var(--lime)' }}>Sweet spot (0.25–0.45):</strong> Threshold {threshold.toFixed(2)} catches ~{round(current.recall * 100, 0)}% of fraud with manageable false-positive rate.</>}
            {threshold > 0.45 && <><strong style={{ color: 'var(--mint)' }}>High threshold:</strong> Very precise — catches only the most obvious fraud. Misses edge cases.</>}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ============================================================
 * 4. PostDeployChecklist
 * ============================================================ */
const CHECKLIST_ITEMS = [
  { id: 'model_card',    label: 'Model card written',               desc: 'Document intended use, limitations, training data, and known failure modes.' },
  { id: 'fairness',      label: 'Fairness audit done',              desc: 'Check fraud flag rates across demographic segments. Disparate impact threshold: 0.8 ratio.' },
  { id: 'drift',         label: 'Feature drift monitoring set up',  desc: 'PSI or KS test on V1–V28 distributions weekly. Alert at PSI > 0.2.' },
  { id: 'champion',      label: 'Champion/challenger pipeline',     desc: 'New model trained in shadow; replaces champion only if PR-AUC lifts by ≥ 0.5pp.' },
  { id: 'rollback',      label: 'Rollback plan documented',         desc: 'One-command revert to prior model version. Test it in staging before going live.' },
  { id: 'sla',           label: 'SLA defined',                      desc: 'Scoring latency p99 < 50ms. Batch inference: 100k txns in < 2 minutes.' },
  { id: 'alerts',        label: 'Alert thresholds set',             desc: 'PagerDuty alert if: PR-AUC drops < 0.85, daily fraud flag rate changes > 30%, or scoring errors > 0.1%.' },
  { id: 'shadow',        label: 'Shadow mode first (2 weeks)',       desc: 'Log predictions without acting on them. Verify distribution matches expectations before live routing.' },
];

function PostDeployChecklist() {
  const [checked, setChecked] = useState(new Set());
  const [expanded, setExpanded] = useState(null);

  const toggle = (id) => setChecked(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const pct = Math.round(checked.size / CHECKLIST_ITEMS.length * 100);
  const barColor = pct === 100 ? 'var(--mint)' : pct >= 50 ? 'var(--lime)' : '#FF6B80';

  return (
    <Panel eyebrow="SIMULATOR" title="Production readiness checklist"
           meta={`${checked.size} / ${CHECKLIST_ITEMS.length} complete`}
           caption="No model should go live without clearing every item. Each checkbox is a class of production failure you're explicitly ruling out.">
      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            Readiness
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: barColor, fontWeight: 700 }}>
            {pct}%{pct === 100 ? ' — ship it.' : ''}
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-hi)', borderRadius: 3 }}>
          <div style={{
            height: '100%', borderRadius: 3, width: `${pct}%`,
            background: barColor, transition: 'width 0.4s ease, background 0.3s ease',
          }} />
        </div>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CHECKLIST_ITEMS.map(item => {
          const done = checked.has(item.id);
          const open = expanded === item.id;
          return (
            <div key={item.id} style={{
              borderRadius: 8, border: done ? '1px solid rgba(100,226,181,0.35)' : '1px solid var(--hair)',
              background: done ? 'rgba(100,226,181,0.07)' : 'var(--bg-hi)',
              overflow: 'hidden', transition: 'border-color 0.2s, background 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer' }}
                   onClick={() => setExpanded(open ? null : item.id)}>
                <input type="checkbox" checked={done}
                       onChange={() => toggle(item.id)}
                       onClick={e => e.stopPropagation()}
                       style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--mint)' }} />
                <span style={{ flex: 1, fontSize: 13.5, color: done ? 'var(--mint)' : 'var(--ink-1)',
                               textDecoration: done ? 'line-through' : 'none', transition: 'color 0.2s' }}>
                  {item.label}
                </span>
                <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
              </div>
              {open && (
                <div style={{ padding: '0 14px 12px 42px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ============================================================
 * Chapter shell
 * ============================================================ */
function Ch12_Capstone({ goTo }) {
  return (
    <>
      <Hero eyebrow="Chapter 12 · Capstone"
            title='<em>Credit card fraud detection:</em> <span class="accent">the full DS loop.</span>'
            hook="284,807 transactions. 0.17% fraud. One complete walkthrough — from raw data to a model in production. Every chapter earns its place here."
            meta={[
              { k: 'Dataset', v: 'Kaggle · 284K transactions' },
              { k: 'Target',  v: 'Fraud · 0.17% base rate' },
              { k: 'Sims',    v: '4 interactive' },
            ]} />

      {/* 12.1 Dataset */}
      <section className="section">
        <SectionLabel n="12.1">The data — and why it's hard</SectionLabel>
        <h2 className="h2">284,807 transactions. 492 frauds. An 578:1 class imbalance.</h2>
        <p className="prose">
          The Kaggle Credit Card Fraud dataset is a classic of applied ML — not because it's clean, but because it <em>isn't</em>.
          The imbalance is so extreme that the naive baseline (predict everything as legitimate) achieves <strong>99.83% accuracy</strong>
          while catching zero fraud. Accuracy is the wrong metric. The right one is PR-AUC.
        </p>
        <DatasetExplorer />
      </section>

      {/* 12.2 Pipeline */}
      <section className="section">
        <SectionLabel n="12.2">The pipeline — step by step</SectionLabel>
        <h2 className="h2">Six decisions. Each one a chapter in this course.</h2>
        <p className="prose">
          Run each pipeline step in order. The output of one becomes the input of the next.
          Watch the log. Notice where leakage could enter (scaling before the split is the classic mistake — we prevent it here).
        </p>
        <PipelineProgress />
      </section>

      <AntiPatterns items={[
        '<b>Fitting the scaler on the full dataset.</b> Scaler must be fit on train only, then applied to test. Fitting on all data leaks test statistics into training.',
        '<b>Stratifying after scaling.</b> Split first, scale after. Order matters.',
        '<b>Using accuracy as the metric.</b> On a 0.17% fraud rate, accuracy is meaningless. Use PR-AUC or F1 at a chosen threshold.',
        '<b>Ignoring class_weight / scale_pos_weight.</b> Without reweighting, the model learns to ignore fraud entirely.',
      ]} />

      <BestPractices items={[
        '<b>Split → Scale → Fit.</b> Never fit a preprocessor before the split.',
        '<b>Use scale_pos_weight = N_legit / N_fraud.</b> Tells XGBoost the relative importance of the minority class.',
        '<b>Optimise PR-AUC, then choose threshold by cost.</b> The curve is the product; the threshold is the business decision.',
        '<b>Log every experiment.</b> MLflow or wandb. You will forget what you tried.',
      ]} />

      {/* 12.3 Threshold */}
      <section className="section">
        <SectionLabel n="12.3">Precision–recall tradeoff — choose your threshold</SectionLabel>
        <h2 className="h2">The threshold is a business decision, not a ML decision.</h2>
        <p className="prose">
          Every fraud model produces a probability score per transaction. You decide the cutoff.
          Too low: you flag half your legitimate customers as fraudsters (ops cost explodes).
          Too high: you miss real fraud (revenue loss and reputational damage).
          <strong> Use the cost calculator to find your break-even threshold.</strong>
        </p>
        <PrecisionRecallTradeoff />
      </section>

      {/* 12.4 Production readiness */}
      <section className="section">
        <SectionLabel n="12.4">Shipping to production — the checklist</SectionLabel>
        <h2 className="h2">A model in a notebook is a demo. A model in prod is an engineering system.</h2>
        <p className="prose">
          Before your fraud model touches a single live transaction, eight things must be true.
          Work through the checklist. Each item represents a class of production failure you have explicitly eliminated.
        </p>
        <PostDeployChecklist />
      </section>

      <AntiPatterns items={[
        '<b>Skipping shadow mode.</b> The first time you see a model's live distribution should never be in production.',
        '<b>No model card.</b> Without documentation, the next engineer (or regulator) has no idea what the model was designed for.',
        '<b>No drift monitor.</b> Fraud patterns shift — card skimming, online fraud, pandemic spending. Models stale faster than you think.',
        '<b>One threshold forever.</b> Business costs change. Revisit the threshold quarterly at minimum.',
      ]} />

      <BestPractices items={[
        '<b>Shadow first, always.</b> Two weeks of shadow mode catches training–serving skew before it harms users.',
        '<b>Champion/challenger every sprint.</b> Always have a challenger in shadow. Replace only on measurable lift.',
        '<b>Tie your alert threshold to business cost, not arbitrary quantiles.</b>',
        '<b>Model cards are compliance.</b> EU AI Act Art. 13 requires transparency documentation for high-risk systems.',
      ]} />

      <Takeaway items={[
        '<b>Imbalance is the rule, not the exception.</b> PR-AUC over accuracy. Always.',
        '<b>The pipeline order is sacrosanct.</b> Split → scale → fit. Leakage is silent — it only shows up in prod.',
        '<b>The threshold is a business decision.</b> Minimise expected cost, not F1.',
        '<b>Production is a system, not a model.</b> Monitoring, rollback, drift alerts — the model is 20% of the work.',
        '<b>The loop never ends.</b> Retrain cadence, new features, new fraud patterns. Ship. Monitor. Iterate.',
      ]} />

      <div className="ov-cta-band" style={{ marginTop: 40 }}>
        <div className="ov-cta-eyebrow">You've reached the end.</div>
        <div className="ov-cta-title">Go build something.</div>
        <div className="ov-cta-sub">
          Pick one real dataset. Run the full loop. Ship a v1.
          Come back and iterate. The fastest way to learn data science is to <em>do</em> it on a problem you care about.
        </div>
        <div className="ov-cta-row">
          <button className="btn btn-primary ov-cta-btn" onClick={() => goTo && goTo('home')}>
            Back to the overview &nbsp;↺
          </button>
        </div>
      </div>
    </>
  );
}

window.Ch12_Capstone = Ch12_Capstone;
