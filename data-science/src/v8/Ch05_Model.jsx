/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, mulberry32, randn, round, clamp */
const { useState, useMemo } = React;

/* ==========================================================
 * Ch 05 · Model · Bias / Variance DANCE
 * --------------------------------------------------------
 * Rewritten for real animation:
 *   - true sine-shaped "truth" curve
 *   - 20 training points with noise, reseedable ("new data")
 *   - polynomial fit of chosen degree
 *   - BONUS: a variance cloud — fit 24 polynomials on different
 *     resamples, overlay all of them semi-transparent. You
 *     *see* variance as a fan of wiggly curves.
 *   - bias & variance numbers computed from that ensemble
 *   - animated reveal: curves draw in one after another
 * ========================================================== */

function BiasVarianceSim() {
  const [complexity, setComplexity] = useState(5);
  const [dataSeed, setDataSeed] = useState(17);
  const [svgKey, setSvgKey] = useState(0);  // bumps when "reshuffle" pressed → re-triggers draw animation

  // Truth function
  const truth = (x) => Math.sin(x * Math.PI * 2) * 0.7;

  // Generate primary training set
  const train = useMemo(() => {
    const r = mulberry32(dataSeed);
    return Array.from({length: 22}, (_,i) => {
      const x = i / 21;
      return { x, y: truth(x) + 0.22 * randn(r) };
    });
  }, [dataSeed]);

  // Generate 24 bootstrap resamples, fit polynomial to each
  const resampleFits = useMemo(() => {
    const out = [];
    for (let s = 0; s < 24; s++) {
      const r = mulberry32(dataSeed * 31 + s * 7 + 1);
      const pts = Array.from({length: 22}, (_,i) => {
        const x = i / 21;
        return { x, y: truth(x) + 0.22 * randn(r) };
      });
      out.push(fitPoly(pts, complexity));
    }
    return out;
  }, [dataSeed, complexity]);

  // Main fit — use first resample for clarity
  const mainCoeffs = useMemo(() => fitPoly(train, complexity), [train, complexity]);

  const predictWith = (coeffs, x) => coeffs.reduce((a, c, k) => a + c * x ** k, 0);
  const predict = (x) => predictWith(mainCoeffs, x);

  // Test set for error
  const testPts = useMemo(() => {
    const r = mulberry32(99);
    return Array.from({length: 200}, () => {
      const x = r();
      return { x, y: truth(x) + 0.22 * randn(r) };
    });
  }, []);
  const trainErr = train.reduce((a, p) => a + (p.y - predict(p.x)) ** 2, 0) / train.length;
  const testErr  = testPts.reduce((a, p) => a + (p.y - predict(p.x)) ** 2, 0) / testPts.length;

  // Ensemble bias/variance decomposition
  const { bias2, variance } = useMemo(() => {
    const GRID = 40;
    let bias2 = 0, variance = 0;
    for (let i = 0; i < GRID; i++) {
      const x = i / (GRID - 1);
      const ys = resampleFits.map(c => predictWith(c, x));
      const meanY = ys.reduce((a, v) => a + v, 0) / ys.length;
      bias2 += (meanY - truth(x)) ** 2;
      variance += ys.reduce((a, v) => a + (v - meanY) ** 2, 0) / ys.length;
    }
    return { bias2: bias2 / GRID, variance: variance / GRID };
  }, [resampleFits]);

  // Coordinate system: x in [0,1] → [40, 560]; y in [-1.5, 1.5] → [190, 10]
  const W = 600, H = 200;
  const xMap = (x) => 40 + x * 520;
  const yMap = (y) => 100 - y * 60;

  // Build path for a set of coeffs
  const pathFor = (coeffs) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const x = i / 120;
      const y = clamp(predictWith(coeffs, x), -1.6, 1.6);
      pts.push(`${xMap(x).toFixed(2)},${yMap(y).toFixed(2)}`);
    }
    return 'M ' + pts.join(' L ');
  };

  // Truth path
  const truthPath = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const x = i / 120;
      pts.push(`${xMap(x).toFixed(2)},${yMap(truth(x)).toFixed(2)}`);
    }
    return 'M ' + pts.join(' L ');
  }, []);

  const regimeLabel =
    complexity <= 1 ? 'underfit (high bias)' :
    complexity >= 10 ? 'overfit (high variance)' :
    'good fit';

  const reshuffle = () => {
    setDataSeed(s => s + 17);
    setSvgKey(k => k + 1);
  };

  return (
    <Panel eyebrow="LIVE · ENSEMBLE" title="Bias–variance dance"
           meta={`degree ${complexity} · ${resampleFits.length} bootstraps`}
           caption="Gray cloud = the range of fits you'd get from resampling. Narrow cloud + close to truth = good. Narrow + far = bias. Wide & wild = variance. The tradeoff is the dance.">
      <div className="sim-row" style={{gridTemplateColumns:'280px 1fr'}}>
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Model complexity <span className="mono">deg {complexity}</span></label>
            <input type="range" min="0" max="15" value={complexity}
                   onChange={e=>setComplexity(+e.target.value)} />
          </div>
          <button className="btn btn-sm btn-primary" onClick={reshuffle}>
            ⟲ New training data
          </button>
          <div className="sim-stats">
            <div><div className="k">Train MSE</div><div className="v" style={{color:'var(--cyan)'}}>{round(trainErr,3)}</div></div>
            <div><div className="k">Test MSE</div><div className="v" style={{color:'var(--magenta)'}}>{round(testErr,3)}</div></div>
            <div><div className="k">Regime</div><div className="v serif" style={{fontStyle:'italic',fontSize:15}}>{regimeLabel}</div></div>
          </div>
          <div className="sim-stats" style={{marginTop: 2}}>
            <div><div className="k">Bias²</div><div className="v" style={{color:'var(--amber)'}}>{round(bias2,3)}</div></div>
            <div><div className="k">Variance</div><div className="v" style={{color:'var(--violet)'}}>{round(variance,3)}</div></div>
            <div><div className="k">Bias²+Var</div><div className="v">{round(bias2+variance,3)}</div></div>
          </div>
          <div className="galton-note">
            <span className="tag-pill">tip</span>
            At low <code className="mono">deg</code>, bias is huge (stiff line misses curve).
            At high <code className="mono">deg</code>, bias collapses but variance explodes — the gray cloud
            fans wildly.
          </div>
        </div>

        <div className="plot-wrap" style={{padding:16}}>
          <svg viewBox={`0 0 ${W} ${H}`} key={`${svgKey}-${complexity}`}>
            {/* Zero line */}
            <line x1={xMap(0)} y1={yMap(0)} x2={xMap(1)} y2={yMap(0)}
                  stroke="#A49D9A" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5"/>
            {/* Y axis */}
            <line x1={xMap(0)} y1={yMap(-1.5)} x2={xMap(0)} y2={yMap(1.5)}
                  stroke="#A49D9A" strokeWidth="0.6"/>
            {/* Truth curve */}
            <path d={truthPath} fill="none" stroke="#14121655" strokeWidth="1.2"
                  strokeDasharray="4 3"/>
            {/* Ensemble fits (variance cloud) */}
            {resampleFits.map((c, i) => (
              <path key={i} d={pathFor(c)} fill="none"
                    stroke="#5B3EE8" strokeWidth="1.1"
                    opacity={0.08}
                    style={{
                      strokeDasharray: 3000,
                      strokeDashoffset: 3000,
                      animation: `drawPath 1.2s cubic-bezier(.4,0,.2,1) ${i*0.04}s forwards`
                    }}/>
            ))}
            {/* Main fit (emphasized) */}
            <path d={pathFor(mainCoeffs)} fill="none"
                  stroke="#E8318F" strokeWidth="2.4"
                  style={{
                    strokeDasharray: 3000,
                    strokeDashoffset: 3000,
                    animation: `drawPath 1.1s cubic-bezier(.4,0,.2,1) 0s forwards`
                  }}/>
            {/* Training points */}
            {train.map((p, i) => (
              <circle key={i} cx={xMap(p.x)} cy={yMap(clamp(p.y,-1.6,1.6))} r="3.2"
                      fill="#141216" stroke="#FBF8F1" strokeWidth="1"
                      style={{
                        opacity: 0,
                        animation: `fadeIn 280ms cubic-bezier(.4,0,.2,1) ${0.6 + i*0.02}s forwards`
                      }}/>
            ))}
            {/* Legend */}
            <g transform="translate(48 16)">
              <line x1="0" y1="0" x2="20" y2="0" stroke="#14121655" strokeWidth="1.2" strokeDasharray="4 3"/>
              <text x="26" y="4" fontSize="10" fill="#3A3540"
                    fontFamily="'JetBrains Mono', monospace">truth</text>

              <line x1="100" y1="0" x2="120" y2="0" stroke="#E8318F" strokeWidth="2.4"/>
              <text x="126" y="4" fontSize="10" fill="#3A3540"
                    fontFamily="'JetBrains Mono', monospace">this fit</text>

              <g transform="translate(220 0)">
                <line x1="0" y1="0" x2="20" y2="0" stroke="#5B3EE8" strokeWidth="1.4" opacity="0.5"/>
                <text x="26" y="4" fontSize="10" fill="#3A3540"
                      fontFamily="'JetBrains Mono', monospace">24 resamples</text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </Panel>
  );
}

/* --- helpers --- */
function fitPoly(pts, deg) {
  const n = pts.length;
  const D = deg + 1;
  const X = pts.map(p => Array.from({length: D}, (_,k) => p.x ** k));
  const y = pts.map(p => p.y);
  // Normal equations with a tiny diagonal nudge for numerical stability (not a regularization penalty)
  const XTX = Array.from({length: D}, () => new Array(D).fill(0));
  const XTy = new Array(D).fill(0);
  for (let i = 0; i < D; i++) {
    for (let j = 0; j < D; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[k][i] * X[k][j];
      XTX[i][j] = s + (i === j ? 1e-5 : 0);
    }
    let s = 0;
    for (let k = 0; k < n; k++) s += X[k][i] * y[k];
    XTy[i] = s;
  }
  // Gaussian elim
  const m = XTX.map((r,i) => [...r, XTy[i]]);
  for (let i = 0; i < D; i++) {
    let max = i;
    for (let k = i+1; k < D; k++) if (Math.abs(m[k][i]) > Math.abs(m[max][i])) max = k;
    [m[i], m[max]] = [m[max], m[i]];
    for (let k = i+1; k < D; k++) {
      const f = m[k][i] / (m[i][i] || 1e-12);
      for (let j = i; j <= D; j++) m[k][j] -= f * m[i][j];
    }
  }
  const b = new Array(D).fill(0);
  for (let i = D-1; i >= 0; i--) {
    let s = m[i][D];
    for (let j = i+1; j < D; j++) s -= m[i][j] * b[j];
    b[i] = s / (m[i][i] || 1e-12);
  }
  return b;
}

function Ch05_Model() {
  return (
    <>
      <Hero eyebrow="Chapter 05 · Model"
            title='The <em>bias / variance</em> <span class="accent">dance.</span>'
            hook="Every model lives on a spectrum. Too simple → underfits, misses the pattern. Too flexible → memorizes the noise. <strong>Cross-validation is how you find the sweet spot.</strong>"
            meta={[{k:'Read',v:'9 min'},{k:'Focus',v:'Fit · CV · tune'},{k:'Sims',v:'1 live ensemble'}]}/>

      <section className="section">
        <SectionLabel n="05.1">The tradeoff, made physical</SectionLabel>
        <h2 className="h2">Slide the knob. Reshuffle the data. <em>Watch the cloud fan out.</em></h2>
        <p className="prose">
          At low complexity, every resample lands on almost the same stiff line — low variance, but high bias
          (the line can't bend to match the truth). At high complexity, each resample finds a different wild curve
          through the same-ish noise — bias falls toward zero, but variance explodes.
        </p>
        <BiasVarianceSim/>
      </section>

      <section className="section">
        <SectionLabel n="05.2">Choosing a model</SectionLabel>
        <h2 className="h2">Start simple. <em>Escalate only with evidence.</em></h2>
        <ul className="prose" style={{paddingLeft:20}}>
          <li><strong>Logistic / linear regression</strong> — interpretable, fast, hard to beat on tabular with good features.</li>
          <li><strong>Gradient-boosted trees (XGBoost, LightGBM)</strong> — the tabular workhorse. Rarely a wrong answer.</li>
          <li><strong>Random forest</strong> — robust, low-tuning, good first escalation.</li>
          <li><strong>Deep nets</strong> — unstructured data (text, images, audio). Rarely the right call for tabular.</li>
        </ul>
      </section>

      <AntiPatterns items={[
        '<b>Tuning on the test set.</b> That\'s just a slower way to overfit.',
        '<b>Leaderboard chasing.</b> 0.01 AUC on CV is not a real gain if your CV has leakage.',
        '<b>Deep learning as default.</b> For 90% of business tabular problems, GBDT wins on time, metric, and interpretability.',
      ]}/>

      <Takeaway items={[
        '<b>Generalization is the goal, not fit.</b> Always measure on held-out data.',
        '<b>Cross-validation is non-optional</b> — single split lies about variance.',
        '<b>Total error = Bias² + Variance + irreducible noise.</b> You can only move the first two — noise is a floor.',
      ]}/>
    </>
  );
}
window.Ch05_Model = Ch05_Model;
