/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, BestPractices, useInView, mulberry32, randn, clamp, round, normCdf, normInv */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ─── colour tokens (matches sims.css vars) ─── */
const BAD  = '#ef4444';
const MINT = '#10b981';
const BLUE = '#3b82f6';
const AMB  = '#f59e0b';
const INK3 = '#6b7280';
const HAIR = 'rgba(255,255,255,0.08)';
const BGHT = 'rgba(255,255,255,0.04)';

/* ─── tiny shared bar ─── */
function Bar({ label, value, max, color, annotation }) {
  const pct = max > 0 ? clamp(value / max, 0, 1) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#d1d5db' }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{annotation || `${round(value, 1)}%`}</span>
      </div>
      <div style={{ height: 10, background: HAIR, borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * 1. PeekingSimulator
 * ═══════════════════════════════════════════════════════════ */
function PeekingSimulator() {
  const FREQ_OPTIONS = [
    { label: 'Daily (every 100 obs)', step: 100 },
    { label: 'Every 3 days (every 300 obs)', step: 300 },
    { label: 'Weekly (every 700 obs)', step: 700 },
    { label: 'End-only (no peeking)', step: 5000 },
  ];
  const ALPHA_OPTIONS = [0.05, 0.01];
  const N_SIMS = 1000;
  const MAX_N  = 5000;
  const BASE_CONV = 0.1;

  const [freqIdx, setFreqIdx]   = useState(0);
  const [alphaIdx, setAlphaIdx] = useState(0);
  const [results, setResults]   = useState(null);
  const [running, setRunning]   = useState(false);
  const [seed, setSeed]         = useState(42);

  const runSim = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const step  = FREQ_OPTIONS[freqIdx].step;
      const alpha = ALPHA_OPTIONS[alphaIdx];
      const zCrit = normInv(1 - alpha / 2);
      const rng   = mulberry32(seed);

      let falsePos = 0;
      for (let s = 0; s < N_SIMS; s++) {
        let hit = false;
        for (let n = step; n <= MAX_N; n += step) {
          // A/A test: both groups drawn from same Bernoulli(BASE_CONV)
          const se = Math.sqrt(2 * BASE_CONV * (1 - BASE_CONV) / n);
          const z  = randn(rng); // null diff ~ N(0, se^2), normalised => N(0,1)
          if (Math.abs(z) > zCrit) { hit = true; break; }
        }
        if (hit) falsePos++;
      }
      const fpr    = (falsePos / N_SIMS) * 100;
      const nomPct = alpha * 100;
      setResults({ fpr, nomPct, alpha, step, n: N_SIMS, falsePos });
      setSeed(s => s + 1);
      setRunning(false);
    }, 20);
  }, [freqIdx, alphaIdx, seed]);

  const inflation = results ? round(results.fpr / results.nomPct, 2) : null;

  return (
    <Panel eyebrow="SIMULATION" title="Peeking False-Positive Inflator"
           caption={`1 000 A/A tests (no real effect). Counts how many times p < α appears at any interim look.`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* controls */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Check frequency</div>
            {FREQ_OPTIONS.map((f, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="freq" checked={freqIdx === i} onChange={() => setFreqIdx(i)} />
                {f.label}
              </label>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Significance threshold (α)</div>
            {ALPHA_OPTIONS.map((a, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="alpha" checked={alphaIdx === i} onChange={() => setAlphaIdx(i)} />
                α = {a}
              </label>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={runSim} disabled={running} style={{ width: '100%' }}>
            {running ? 'Simulating…' : 'Run 1 000 A/A tests'}
          </button>
        </div>

        {/* results */}
        <div style={{ padding: 16, background: BGHT, borderRadius: 10, border: `1px solid ${HAIR}` }}>
          {!results ? (
            <div style={{ color: INK3, fontSize: 13, marginTop: 20 }}>Run the simulation to see results.</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: MINT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nominal α</div>
                  <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: 34, color: MINT }}>{round(results.nomPct, 1)}%</div>
                  <div style={{ fontSize: 11, color: INK3 }}>stated threshold</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: BAD, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Actual FPR</div>
                  <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: 34, color: BAD }}>{round(results.fpr, 1)}%</div>
                  <div style={{ fontSize: 11, color: INK3 }}>observed in sim</div>
                </div>
              </div>

              {/* bar chart */}
              <Bar label="Nominal FPR" value={results.nomPct} max={50} color={MINT} />
              <Bar label="Peeking FPR" value={results.fpr}    max={50} color={BAD}  />

              {inflation !== null && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontSize: 12.5, color: BAD }}>
                  <strong>{inflation}× inflation</strong> — peeking multiplied your false-positive rate by {inflation}×
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 11.5, color: INK3 }}>
                {results.falsePos} / {results.n} A/A tests showed a "significant" result despite no real effect.
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════
 * 2. MultipleTesting
 * ═══════════════════════════════════════════════════════════ */
function MultipleTesting() {
  const [n, setN] = useState(10);
  const alpha = 0.05;

  const fwer       = useMemo(() => (1 - Math.pow(1 - alpha, n)) * 100, [n]);
  const bonferroni = useMemo(() => round(alpha / n, 6), [n]);
  const expectedFP = useMemo(() => round(alpha * n, 2), [n]);

  // Generate per-hypothesis p-values for visualisation
  const pValues = useMemo(() => {
    const rng = mulberry32(n * 17 + 3);
    return Array.from({ length: n }, (_, i) => {
      // mostly null hypotheses, occasionally small effect
      const z = randn(rng);
      const p = 2 * (1 - normCdf(Math.abs(z)));
      return p;
    });
  }, [n]);

  const nomSig    = pValues.filter(p => p < alpha).length;
  const bonfSig   = pValues.filter(p => p < bonferroni).length;

  return (
    <Panel eyebrow="SIMULATION" title="Multiple Testing & FWER"
           caption="All hypotheses are null (no real effect). How many do we accidentally call significant?">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ marginBottom: 6, fontSize: 11, color: INK3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Number of hypotheses tested: <strong style={{ color: '#f1f5f9' }}>{n}</strong>
          </div>
          <input type="range" min={1} max={50} value={n} onChange={e => setN(+e.target.value)}
                 style={{ width: '100%', marginBottom: 16 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'FWER', value: `${round(fwer, 1)}%`, sub: '1−(1−α)ⁿ', color: BAD },
              { label: 'Bonferroni α', value: bonferroni, sub: 'α / n', color: BLUE },
              { label: 'Expected FP', value: expectedFP, sub: 'α × n', color: AMB },
              { label: 'Nominal α', value: '5%', sub: 'per test', color: MINT },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ padding: '10px 12px', background: BGHT, borderRadius: 8, border: `1px solid ${HAIR}` }}>
                <div style={{ fontSize: 10, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ fontSize: 22, fontFamily: 'var(--font-serif,serif)', color, marginTop: 2 }}>{value}</div>
                <div style={{ fontSize: 11, color: INK3 }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, fontSize: 12.5, color: AMB, lineHeight: 1.6 }}>
            Out of <strong>{n}</strong> tests, expect <strong>~{expectedFP}</strong> false positives by chance at α=0.05.
          </div>
        </div>

        {/* dot chart of p-values */}
        <div>
          <div style={{ fontSize: 11, color: INK3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Simulated p-values (all null)
          </div>
          <svg width="100%" viewBox={`0 0 220 ${Math.max(n * 14 + 30, 60)}`} style={{ overflow: 'visible' }}>
            {/* threshold lines */}
            <line x1={alpha * 200} y1={0} x2={alpha * 200} y2={n * 14 + 10} stroke={MINT} strokeWidth={1} strokeDasharray="3,2" opacity={0.7} />
            <line x1={Math.min(bonferroni * 200, 200)} y1={0} x2={Math.min(bonferroni * 200, 200)} y2={n * 14 + 10} stroke={BLUE} strokeWidth={1} strokeDasharray="3,2" opacity={0.7} />
            <text x={alpha * 200 + 2} y={10} fontSize={8} fill={MINT}>α=0.05</text>
            <text x={0} y={n * 14 + 26} fontSize={8} fill={MINT}>{nomSig} sig (uncorrected)</text>
            <text x={100} y={n * 14 + 26} fontSize={8} fill={BLUE}>{bonfSig} sig (Bonferroni)</text>
            {pValues.map((p, i) => {
              const x = clamp(p * 200, 1, 199);
              const y = i * 14 + 20;
              const sigNom  = p < alpha;
              const sigBonf = p < bonferroni;
              const color   = sigBonf ? BLUE : sigNom ? BAD : INK3;
              return (
                <g key={i}>
                  <rect x={0} y={y - 5} width={x} height={8} rx={2} fill={color} opacity={sigNom ? 0.4 : 0.15} />
                  <circle cx={x} cy={y} r={3} fill={color} />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════
 * 3. CUPEDExplainer
 * ═══════════════════════════════════════════════════════════ */
function CUPEDExplainer() {
  const [cupedOn, setCupedOn] = useState(false);
  const N = 30; // observations per group

  const data = useMemo(() => {
    const rng = mulberry32(99);
    const rows = [];
    for (let i = 0; i < N * 2; i++) {
      const group  = i < N ? 0 : 1;
      const x      = 0.15 + randn(rng) * 0.08;           // pre-experiment covariate
      const noise  = randn(rng) * 0.12;
      const effect = group === 1 ? 0.02 : 0;             // small true effect
      const y      = 0.5 * x + 0.25 + noise + effect;   // outcome correlated w/ x
      rows.push({ group, x, y });
    }
    return rows;
  }, []);

  const { ctrl, trt, theta, varRaw, varCuped, pctReduction } = useMemo(() => {
    const ctrl = data.filter(d => d.group === 0);
    const trt  = data.filter(d => d.group === 1);
    const allX = data.map(d => d.x);
    const xBar = allX.reduce((a, b) => a + b, 0) / allX.length;
    const allY = data.map(d => d.y);
    const covXY = data.reduce((s, d) => s + (d.x - xBar) * (d.y - allY.reduce((a,b) => a+b,0)/allY.length), 0) / data.length;
    const varX  = data.reduce((s, d) => s + (d.x - xBar) ** 2, 0) / data.length;
    const theta = covXY / varX;

    const yCupedAll = data.map(d => ({ ...d, yc: d.y - theta * (d.x - xBar) }));
    const ctrlC = yCupedAll.filter(d => d.group === 0);
    const trtC  = yCupedAll.filter(d => d.group === 1);

    const mean  = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const vari  = arr => { const m = mean(arr); return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length; };

    const rawVals    = [...ctrl.map(d => d.y),   ...trt.map(d => d.y)];
    const cupedVals  = [...ctrlC.map(d => d.yc), ...trtC.map(d => d.yc)];
    const varRaw     = vari(rawVals);
    const varCuped   = vari(cupedVals);
    const pctReduction = (1 - varCuped / varRaw) * 100;

    const meanCtrl   = mean(ctrl.map(d => d.y));
    const meanTrt    = mean(trt.map(d => d.y));
    const meanCtrlC  = mean(ctrlC.map(d => d.yc));
    const meanTrtC   = mean(trtC.map(d => d.yc));

    return { ctrl, trt, theta: round(theta, 3), varRaw: round(varRaw, 5), varCuped: round(varCuped, 5), pctReduction: round(pctReduction, 1),
             meanCtrl: round(meanCtrl, 3), meanTrt: round(meanTrt, 3), meanCtrlC: round(meanCtrlC, 3), meanTrtC: round(meanTrtC, 3) };
  }, [data]);

  // Build bar chart data for display
  const barsData = useMemo(() => {
    const mean  = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const vari  = arr => { const m = mean(arr); return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length; };
    const allX  = data.map(d => d.x);
    const xBar  = allX.reduce((a,b) => a+b,0) / allX.length;
    const allY  = data.map(d => d.y);
    const yBar  = allY.reduce((a,b) => a+b,0) / allY.length;
    const covXY = data.reduce((s,d) => s + (d.x - xBar)*(d.y - yBar), 0) / data.length;
    const varX  = data.reduce((s,d) => s + (d.x - xBar)**2, 0) / data.length;
    const th    = covXY / varX;

    const groups = [0, 1].map(g => {
      const rows = data.filter(d => d.group === g);
      const rawY = rows.map(d => d.y);
      const cupY = rows.map(d => d.y - th * (d.x - xBar));
      const mRaw = mean(rawY); const seRaw = Math.sqrt(vari(rawY) / rows.length);
      const mCup = mean(cupY); const seCup = Math.sqrt(vari(cupY) / rows.length);
      return { g, mRaw, seRaw, mCup, seCup };
    });
    return groups;
  }, [data]);

  const W = 280, H = 160, PAD = 40;
  const domain = [0.20, 0.40];
  const scale = v => PAD + (v - domain[0]) / (domain[1] - domain[0]) * (W - PAD - 20);

  return (
    <Panel eyebrow="EXPLAINER" title="CUPED — Variance Reduction via Covariates"
           caption="Toggle CUPED to see how pre-experiment covariates shrink confidence intervals without changing the point estimate.">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* formula card */}
        <div style={{ flex: '1 1 200px', padding: 16, background: BGHT, borderRadius: 10, border: `1px solid ${HAIR}`, fontSize: 12.5, lineHeight: 1.8 }}>
          <div style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 11, color: BLUE, marginBottom: 8 }}>CUPED FORMULA</div>
          <div style={{ fontFamily: 'var(--font-mono,monospace)', color: '#f1f5f9' }}>
            θ = Cov(Y, X) / Var(X)<br/>
            Ŷ = Y − θ(X − X̄)
          </div>
          <div style={{ marginTop: 12, color: INK3, fontSize: 12 }}>
            <div>θ estimated: <strong style={{ color: '#f1f5f9' }}>{theta}</strong></div>
            <div>Var (raw): <strong style={{ color: BAD }}>{varRaw}</strong></div>
            <div>Var (CUPED): <strong style={{ color: MINT }}>{varCuped}</strong></div>
          </div>
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: 6, color: MINT, fontWeight: 600, fontSize: 13 }}>
            ↓ {pctReduction}% variance
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={cupedOn} onChange={e => setCupedOn(e.target.checked)} />
              Apply CUPED
            </label>
          </div>
        </div>

        {/* SVG bar + CI chart */}
        <div style={{ flex: '2 1 280px' }}>
          <div style={{ fontSize: 11, color: INK3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {cupedOn ? 'CUPED-adjusted metric (narrower CIs)' : 'Raw metric (wide CIs)'}
          </div>
          <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ overflow: 'visible' }}>
            {barsData.map((b, i) => {
              const m  = cupedOn ? b.mCup : b.mRaw;
              const se = cupedOn ? b.seCup : b.seRaw;
              const ci = 1.96 * se;
              const x  = scale(m);
              const y  = 40 + i * 50;
              const color = i === 0 ? BLUE : MINT;
              const label = i === 0 ? 'Control' : 'Treatment';
              return (
                <g key={i}>
                  <text x={35} y={y + 5} fontSize={11} fill="#d1d5db" textAnchor="end">{label}</text>
                  {/* CI line */}
                  <line x1={scale(m - ci)} y1={y} x2={scale(m + ci)} y2={y}
                        stroke={color} strokeWidth={3} strokeLinecap="round"
                        style={{ transition: 'all 0.5s ease' }} />
                  {/* CI caps */}
                  <line x1={scale(m - ci)} y1={y - 6} x2={scale(m - ci)} y2={y + 6}
                        stroke={color} strokeWidth={2} style={{ transition: 'all 0.5s ease' }} />
                  <line x1={scale(m + ci)} y1={y - 6} x2={scale(m + ci)} y2={y + 6}
                        stroke={color} strokeWidth={2} style={{ transition: 'all 0.5s ease' }} />
                  {/* point */}
                  <circle cx={x} cy={y} r={5} fill={color} style={{ transition: 'all 0.5s ease' }} />
                  <text x={x} y={y - 12} fontSize={10} fill={color} textAnchor="middle"
                        style={{ transition: 'all 0.5s ease' }}>
                    {round(m, 3)} ± {round(ci, 3)}
                  </text>
                </g>
              );
            })}
            {/* axis */}
            <line x1={PAD} y1={H - 10} x2={W - 10} y2={H - 10} stroke={HAIR} strokeWidth={1} />
            {[0.22, 0.26, 0.30, 0.34, 0.38].map(v => (
              <g key={v}>
                <line x1={scale(v)} y1={H - 15} x2={scale(v)} y2={H - 5} stroke={INK3} strokeWidth={1} />
                <text x={scale(v)} y={H + 8} fontSize={9} fill={INK3} textAnchor="middle">{v}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════
 * 4. PowerCalculator
 * ═══════════════════════════════════════════════════════════ */
function PowerCalculator() {
  const [mde,    setMde]    = useState(0.05);   // relative effect size
  const [n,      setN]      = useState(2000);   // per arm
  const [alpha,  setAlpha]  = useState(0.05);
  const baseRate = 0.10;

  // power = P(reject H0 | H1 true)
  // z_beta = z_alpha/2 - delta / SE
  const power = useMemo(() => {
    const delta = baseRate * mde;
    const p1 = baseRate, p2 = baseRate + delta;
    const se  = Math.sqrt(p1 * (1 - p1) / n + p2 * (1 - p2) / n);
    const zCrit = normInv(1 - alpha / 2);
    const z  = delta / se - zCrit;
    return clamp(normCdf(z) * 100, 0, 99.99);
  }, [mde, n, alpha]);

  // minimum n for 80% power
  const minN = useMemo(() => {
    const delta = baseRate * mde;
    const p1 = baseRate, p2 = baseRate + delta;
    const zAlpha = normInv(1 - alpha / 2);
    const zBeta  = normInv(0.80);
    const nReq   = Math.ceil(
      Math.pow(zAlpha * Math.sqrt(2 * baseRate * (1 - baseRate)) + zBeta * Math.sqrt(p1*(1-p1) + p2*(1-p2)), 2) / (delta * delta)
    );
    return nReq;
  }, [mde, alpha]);

  // Power curve data: power vs n
  const curveData = useMemo(() => {
    const nVals = [];
    const step  = Math.max(100, Math.floor(minN * 4 / 40 / 100) * 100);
    for (let ni = 100; ni <= minN * 4; ni += step) nVals.push(ni);
    const delta = baseRate * mde;
    const p1 = baseRate, p2 = baseRate + delta;
    const zCrit = normInv(1 - alpha / 2);
    return nVals.map(ni => {
      const se = Math.sqrt(p1*(1-p1)/ni + p2*(1-p2)/ni);
      const z  = delta / se - zCrit;
      return { n: ni, power: clamp(normCdf(z) * 100, 0, 99.99) };
    });
  }, [mde, alpha, minN]);

  // SVG curve
  const SVG_W = 300, SVG_H = 140, PL = 38, PR = 10, PT = 10, PB = 28;
  const maxN = curveData.length ? curveData[curveData.length - 1].n : n * 4;
  const xS = ni => PL + (ni / maxN) * (SVG_W - PL - PR);
  const yS = pw => PT + (1 - pw / 100) * (SVG_H - PT - PB);

  const pathD = curveData.map((d, i) => `${i === 0 ? 'M' : 'L'}${round(xS(d.n), 1)},${round(yS(d.power), 1)}`).join(' ');
  const currentX = xS(n);
  const currentY = yS(power);

  return (
    <Panel eyebrow="CALCULATOR" title="Statistical Power"
           caption={`Base conversion rate: ${(baseRate * 100).toFixed(0)}%. Power = probability of detecting a real effect.`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* sliders */}
        <div>
          {[
            { label: 'Minimum detectable effect (MDE)', val: mde, min: 0.01, max: 0.5, step: 0.01, fmt: v => `${round(v*100,1)}% relative`, set: setMde },
            { label: 'Sample size per arm (n)', val: n, min: 100, max: 20000, step: 100, fmt: v => v.toLocaleString(), set: setN },
            { label: 'Significance level (α)', val: alpha, min: 0.01, max: 0.10, step: 0.01, fmt: v => v, set: setAlpha },
          ].map(({ label, val, min, max, step, fmt, set }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#d1d5db' }}>{label}</span>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{fmt(val)}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={val}
                     onChange={e => set(+e.target.value)} style={{ width: '100%' }} />
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            <div style={{ padding: '10px 12px', background: BGHT, borderRadius: 8, border: `1px solid ${HAIR}` }}>
              <div style={{ fontSize: 10, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Power</div>
              <div style={{ fontSize: 28, fontFamily: 'var(--font-serif,serif)', color: power >= 80 ? MINT : power >= 60 ? AMB : BAD }}>
                {round(power, 1)}%
              </div>
            </div>
            <div style={{ padding: '10px 12px', background: BGHT, borderRadius: 8, border: `1px solid ${HAIR}` }}>
              <div style={{ fontSize: 10, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Min n (80%)</div>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-serif,serif)', color: '#f1f5f9' }}>
                {minN.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: INK3 }}>per arm</div>
            </div>
          </div>
        </div>

        {/* SVG power curve */}
        <div>
          <div style={{ fontSize: 11, color: INK3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Power curve</div>
          <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H + 4}`} style={{ overflow: 'visible' }}>
            {/* 80% guideline */}
            <line x1={PL} y1={yS(80)} x2={SVG_W - PR} y2={yS(80)}
                  stroke={MINT} strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
            <text x={PL + 2} y={yS(80) - 3} fontSize={8} fill={MINT}>80% power</text>

            {/* area fill */}
            <path d={`${pathD} L${xS(maxN)},${yS(0)} L${xS(100)},${yS(0)} Z`}
                  fill={BLUE} opacity={0.07} />

            {/* curve */}
            <path d={pathD} fill="none" stroke={BLUE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

            {/* current n marker */}
            <line x1={currentX} y1={PT} x2={currentX} y2={SVG_H - PB}
                  stroke={AMB} strokeWidth={1} strokeDasharray="3,2" opacity={0.8} />
            <circle cx={currentX} cy={currentY} r={5} fill={AMB} stroke="#1f2937" strokeWidth={2} />
            <text x={currentX} y={currentY - 9} fontSize={9} fill={AMB} textAnchor="middle">
              {round(power, 1)}%
            </text>

            {/* axes */}
            <line x1={PL} y1={PT} x2={PL} y2={SVG_H - PB} stroke={HAIR} strokeWidth={1} />
            <line x1={PL} y1={SVG_H - PB} x2={SVG_W - PR} y2={SVG_H - PB} stroke={HAIR} strokeWidth={1} />
            {[0, 25, 50, 75, 100].map(pw => (
              <text key={pw} x={PL - 3} y={yS(pw) + 3} fontSize={8} fill={INK3} textAnchor="end">{pw}%</text>
            ))}
            <text x={SVG_W / 2} y={SVG_H + 4} fontSize={8} fill={INK3} textAnchor="middle">Sample size per arm</text>
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════════
 * Chapter Shell
 * ═══════════════════════════════════════════════════════════ */
function Ch10_Peeking() {
  return (
    <>
      <Hero
        eyebrow="Chapter 10 · Peeking & Experimental Integrity"
        title='How <em>p-values</em> <span class="accent">lie.</span>'
        hook="Peeking. Multiple comparisons. Optional stopping. Variance inflation. The subtle ways significance gets manufactured — and the statistical tools to prevent it."
        meta={[
          { k: 'Read', v: '12 min' },
          { k: 'Focus', v: 'Peeking · CUPED · Power · MC' },
          { k: 'Sims', v: '4 interactive' },
        ]}
      />

      {/* 10.1 Peeking */}
      <section className="section">
        <SectionLabel n="10.1">Peeking & Optional Stopping</SectionLabel>
        <h2 className="h2">Every interim look inflates your false-positive rate.</h2>
        <p className="prose">
          Suppose you run an A/B test and check the p-value each day. If it ever dips below 0.05 you stop and declare victory.
          The problem: even when H₀ is <em>exactly true</em>, you will find p&lt;0.05 ~22–30% of the time with daily checks over 7 weeks —
          not the 5% you budgeted. This is <strong>optional stopping bias</strong>.
        </p>
        <PeekingSimulator />
        <AntiPatterns items={[
          '<strong>Continuous monitoring with naive α</strong> — checking significance every day and stopping at first p&lt;0.05 breaks the Type-I error guarantee.',
          '<strong>"It was significant yesterday"</strong> — the p-value is a random variable; a single dip below threshold is not a discovery.',
          '<strong>HARKing (Hypothesising After Results are Known)</strong> — writing a hypothesis after seeing the data guarantees inflated FPR.',
        ]} />
        <BestPractices items={[
          '<strong>Pre-register</strong> sample size, primary metric, and test duration before data collection begins.',
          '<strong>Sequential testing</strong> (mSPRT, always-valid p-values) formally allows interim looks with α spending.',
          '<strong>Bayesian A/B testing</strong> with explicit stopping rules is naturally coherent under optional stopping.',
        ]} />
      </section>

      {/* 10.2 Multiple Testing */}
      <section className="section">
        <SectionLabel n="10.2">Multiple Comparisons</SectionLabel>
        <h2 className="h2">Test 20 metrics. Expect 1 false positive — by construction.</h2>
        <p className="prose">
          The family-wise error rate (FWER) for <em>n</em> independent tests at α = 0.05 is
          1 − (1 − 0.05)ⁿ. At n = 20 that is 64%. Slide the dial below to see how fast this compounds.
        </p>
        <MultipleTesting />
        <AntiPatterns items={[
          '<strong>Reporting every green metric</strong> without FWER correction turns noise into a press release.',
          '<strong>Post-hoc segmentation fishing</strong> — slicing by 20 segments until one looks good is the same as 20 tests.',
        ]} />
        <BestPractices items={[
          '<strong>Bonferroni correction</strong>: use α/n per test. Conservative but simple.',
          '<strong>Benjamini-Hochberg</strong> (FDR): less conservative, controls expected proportion of false discoveries.',
          '<strong>Nominate a primary metric</strong> before the test. Secondary metrics inform; they do not decide.',
        ]} />
      </section>

      {/* 10.3 CUPED */}
      <section className="section">
        <SectionLabel n="10.3">CUPED</SectionLabel>
        <h2 className="h2">Same data, higher power — for free.</h2>
        <p className="prose">
          CUPED (Controlled-experiment Using Pre-Experiment Data) uses a pre-period covariate X
          correlated with the outcome Y to construct an adjusted metric Ŷ with lower variance.
          The point estimate is unbiased and the confidence interval shrinks — you reach significance
          faster or need fewer users. Variance reductions of 20–60% are common.
        </p>
        <CUPEDExplainer />
        <BestPractices items={[
          '<strong>Always apply CUPED</strong> when you have pre-period data. It is never harmful.',
          'Good covariates: prior purchase rate, prior visit frequency, account age, prior metric value.',
          'θ is estimated on the <em>combined</em> data (not per arm) to avoid leakage from treatment assignment.',
          'CUPED is compatible with any test statistic — just replace Y with Ŷ.',
        ]} />
      </section>

      {/* 10.4 Power */}
      <section className="section">
        <SectionLabel n="10.4">Statistical Power</SectionLabel>
        <h2 className="h2">Underpowered tests waste time and money.</h2>
        <p className="prose">
          Power = P(reject H₀ | H₁ true). An underpowered study will miss a real effect and waste the
          experiment slot. The minimum detectable effect (MDE) drives everything: halving the MDE
          quadruples the required sample size. Calculate power <em>before</em> you start.
        </p>
        <PowerCalculator />
        <AntiPatterns items={[
          '<strong>Running until significant</strong> — equivalent to peeking; confounds effect size and luck.',
          '<strong>Ignoring MDE when setting duration</strong> — a test with 30% power is mostly noise.',
          '<strong>Reporting underpowered null results</strong> as "no effect found" — absence of evidence ≠ evidence of absence.',
        ]} />
        <BestPractices items={[
          'Target ≥ 80% power (industry standard). 90% for high-stakes decisions.',
          'Use historical variance and conversion rate to size tests ahead of time.',
          'Reduce required n by applying CUPED (lowers σ²) or by increasing α for exploration.',
          'Use a power calculator — not intuition — every time.',
        ]} />
      </section>

      <Takeaway items={[
        '<b>Peeking is not harmless curiosity.</b> Each interim look multiplies your false-positive risk. Pre-register or use sequential tests.',
        '<b>Multiple comparisons compound fast.</b> 20 tests at α=0.05 → 64% chance of at least one false positive. Correct with Bonferroni or BH.',
        '<b>CUPED is almost free.</b> Apply it whenever you have pre-period data. Variance drops 20–60% with zero bias cost.',
        '<b>Power first.</b> Calculate minimum sample size before collecting data. Underpowered tests are expensive noise.',
        '<b>The pre-registration contract.</b> Committing to metric, sample size, and duration before seeing data is the single highest-leverage habit in experimentation.',
      ]} />
    </>
  );
}

window.Ch10_Peeking = Ch10_Peeking;
