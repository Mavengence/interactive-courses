/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, mulberry32, randn, round, clamp */
const { useState, useMemo, useEffect } = React;

/* ============================================================
 * Ch 06 · Evaluate
 * Animated threshold sweeper: score distribution with a
 * draggable threshold; dots above/below flip color live;
 * ROC curve traces as you move τ; confusion cells tween.
 * ============================================================ */

function ThresholdSim() {
  const [thr, setThr] = useState(0.5);
  const [auto, setAuto] = useState(false);

  // Generate two-class score data: positives ~ beta(5,3), negs ~ beta(2,6)
  const data = useMemo(() => {
    const r = mulberry32(7);
    const out = [];
    for (let i = 0; i < 160; i++) {
      const pos = i < 80;
      // Use two gaussians clamped [0,1]
      const score = pos
        ? clamp(0.65 + 0.16 * randn(r), 0.02, 0.98)
        : clamp(0.32 + 0.16 * randn(r), 0.02, 0.98);
      out.push({ score, label: pos ? 1 : 0, jy: r() });
    }
    return out.sort((a,b)=>a.score-b.score);
  }, []);

  useEffect(() => {
    if (!auto) return;
    let raf, start = performance.now();
    const loop = (now) => {
      const t = (now - start) / 1000;
      setThr(0.5 + 0.45 * Math.sin(t * 0.7));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  // Confusion at current τ
  let tp=0, fp=0, fn=0, tn=0;
  data.forEach(d => {
    const pred = d.score >= thr ? 1 : 0;
    if (pred === 1 && d.label === 1) tp++;
    else if (pred === 1 && d.label === 0) fp++;
    else if (pred === 0 && d.label === 1) fn++;
    else tn++;
  });
  const prec = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const rec  = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1   = (prec + rec) > 0 ? 2 * prec * rec / (prec + rec) : 0;
  const fpr  = (fp + tn) > 0 ? fp / (fp + tn) : 0;
  const tpr  = rec;

  // ROC curve (precomputed once)
  const roc = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 100; i++) {
      const t = 1 - i/100;
      let a=0,b=0,c=0,d2=0;
      data.forEach(x => {
        const p = x.score >= t ? 1 : 0;
        if (p===1 && x.label===1) a++;
        else if (p===1 && x.label===0) b++;
        else if (p===0 && x.label===1) c++;
        else d2++;
      });
      pts.push([(b+d2)>0 ? b/(b+d2) : 0, (a+c)>0 ? a/(a+c) : 0]);
    }
    return pts;
  }, [data]);

  // Viewport
  const W = 560, H = 180;
  const xMap = s => 30 + s * (W - 60);

  return (
    <Panel eyebrow="LIVE · SWEEP" title="Threshold · confusion · ROC"
           meta={`τ = ${thr.toFixed(2)}`}
           caption="Drag τ. Dots above flip to 'predicted positive' — some are right (violet), some are false alarms (orange). The ROC curve traces every possible τ; the square is where you are now.">
      <div className="sim-row" style={{gridTemplateColumns:'260px 1fr'}}>
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Threshold τ <span className="mono">{thr.toFixed(2)}</span></label>
            <input type="range" min="0" max="1" step="0.01" value={thr}
                   onChange={e=>{setAuto(false);setThr(+e.target.value);}}/>
          </div>
          <div className="sim-ctrl-row">
            <button className={`btn btn-sm ${auto?'btn-primary':''}`}
                    onClick={()=>setAuto(a=>!a)}>
              {auto ? '■ Stop sweep' : '▶ Auto-sweep τ'}
            </button>
          </div>
          <div className="sim-stats">
            <div><div className="k">Precision</div><div className="v">{round(prec,2)}</div></div>
            <div><div className="k">Recall</div><div className="v" style={{color:'var(--magenta)'}}>{round(rec,2)}</div></div>
            <div><div className="k">F1</div><div className="v" style={{color:'var(--violet)'}}>{round(f1,2)}</div></div>
          </div>
          {/* Confusion matrix — rows = Actual, columns = Predicted */}
          <div style={{fontSize:9,color:'var(--muted)',fontFamily:"'JetBrains Mono',monospace",
                       display:'grid',gridTemplateColumns:'28px 1fr 1fr',gap:2,marginTop:4}}>
            {/* Header row */}
            <div/>
            <div style={{textAlign:'center',paddingBottom:2,borderBottom:'1px solid var(--hair-2)'}}>PRED +</div>
            <div style={{textAlign:'center',paddingBottom:2,borderBottom:'1px solid var(--hair-2)'}}>PRED −</div>
            {/* Row 1: Actual Positive */}
            <div style={{writingMode:'vertical-rl',transform:'rotate(180deg)',textAlign:'center',
                         paddingRight:2,borderRight:'1px solid var(--hair-2)'}}>ACT +</div>
            <div className="cm-cell" style={{background:'rgba(91,62,232,0.08)',border:'1px solid rgba(91,62,232,0.3)'}}>
              <div className="cm-lab">TP · caught</div><div className="cm-val" style={{color:'var(--violet)'}}>{tp}</div>
            </div>
            <div className="cm-cell" style={{background:'rgba(216,58,58,0.08)',border:'1px solid rgba(216,58,58,0.3)'}}>
              <div className="cm-lab">FN · missed</div><div className="cm-val" style={{color:'var(--bad)'}}>{fn}</div>
            </div>
            {/* Row 2: Actual Negative */}
            <div style={{writingMode:'vertical-rl',transform:'rotate(180deg)',textAlign:'center',
                         paddingRight:2,borderRight:'1px solid var(--hair-2)'}}>ACT −</div>
            <div className="cm-cell" style={{background:'rgba(232,160,49,0.08)',border:'1px solid rgba(232,160,49,0.3)'}}>
              <div className="cm-lab">FP · false alarm</div><div className="cm-val" style={{color:'var(--amber)'}}>{fp}</div>
            </div>
            <div className="cm-cell" style={{background:'rgba(20,18,22,0.04)',border:'1px solid var(--hair-2)'}}>
              <div className="cm-lab">TN · correct reject</div><div className="cm-val">{tn}</div>
            </div>
          </div>
        </div>

        <div className="sim-plots">
          {/* Score distribution with τ line */}
          <div className="plot-wrap">
            <div className="sim-plot-head">
              Score distribution
              <span className="hint">upper band = positives · lower band = negatives · x = score</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`}>
              {/* Axis */}
              <line x1="30" y1="90" x2={W-30} y2="90" stroke="#A49D9A" strokeWidth="0.8"/>
              {[0,0.25,0.5,0.75,1].map(v=>(
                <g key={v}>
                  <line x1={xMap(v)} y1="86" x2={xMap(v)} y2="94" stroke="#A49D9A" strokeWidth="0.6"/>
                  <text x={xMap(v)} y="106" textAnchor="middle" fontSize="9" fill="#6A6270"
                        fontFamily="'JetBrains Mono', monospace">{v.toFixed(2)}</text>
                </g>
              ))}
              {/* Threshold line */}
              <line x1={xMap(thr)} y1="10" x2={xMap(thr)} y2="170"
                    stroke="#141216" strokeWidth="2"/>
              <rect x={xMap(thr)-16} y="4" width="32" height="14" rx="3"
                    fill="#141216"/>
              <text x={xMap(thr)} y="14" textAnchor="middle" fontSize="10"
                    fill="#FBF8F1" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                τ={thr.toFixed(2)}
              </text>
              {/* Shaded right region */}
              <rect x={xMap(thr)} y="20" width={xMap(1)-xMap(thr)} height="60"
                    fill="#5B3EE8" opacity="0.05"/>
              {/* Points */}
              {data.map((d, i) => {
                const pred = d.score >= thr;
                const isPos = d.label === 1;
                // Positives in upper band, negatives in lower band
                const baseY = isPos ? 20 + d.jy * 50 : 100 + d.jy * 50;
                const fill = isPos
                  ? (pred ? '#5B3EE8' : '#D83A3A')           // TP violet, FN red
                  : (pred ? '#E8A031' : '#1FAF7E');          // FP orange, TN green
                return (
                  <circle key={i} cx={xMap(d.score)} cy={baseY} r="3.3"
                          fill={fill} opacity="0.85"
                          style={{transition:'fill 200ms'}}/>
                );
              })}
              {/* Labels */}
              <text x="30" y="18" fontSize="10" fill="#6A6270"
                    fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                POSITIVES
              </text>
              <text x="30" y="124" fontSize="10" fill="#6A6270"
                    fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                NEGATIVES
              </text>
            </svg>
          </div>

          {/* ROC */}
          <div className="plot-wrap">
            <div className="sim-plot-head">
              ROC curve
              <span className="hint">AUC ≈ {round(areaUnder(roc), 3)}</span>
            </div>
            <svg viewBox="0 0 200 160">
              <rect x="20" y="10" width="160" height="130" fill="none" stroke="#A49D9A" strokeWidth="0.6"/>
              {/* Chance line */}
              <line x1="20" y1="140" x2="180" y2="10" stroke="#A49D9A" strokeDasharray="3 3" strokeWidth="0.8"/>
              {/* Curve */}
              <path d={'M ' + roc.map(([x,y]) => `${20 + x*160},${140 - y*130}`).join(' L ')}
                    fill="none" stroke="#5B3EE8" strokeWidth="1.8"/>
              {/* Current τ marker */}
              <circle cx={20 + fpr*160} cy={140 - tpr*130} r="6"
                      fill="none" stroke="#E8318F" strokeWidth="2"/>
              <circle cx={20 + fpr*160} cy={140 - tpr*130} r="3.2"
                      fill="#E8318F"/>
              {/* Axis labels */}
              <text x="100" y="158" textAnchor="middle" fontSize="9" fill="#6A6270"
                    fontFamily="'JetBrains Mono', monospace">FPR = {fpr.toFixed(2)}</text>
              <text x="10" y="75" textAnchor="middle" fontSize="9" fill="#6A6270"
                    fontFamily="'JetBrains Mono', monospace"
                    transform="rotate(-90 10 75)">TPR = {tpr.toFixed(2)}</text>
            </svg>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function areaUnder(roc) {
  // trapezoidal; roc is array of [fpr, tpr], sorted with t decreasing → fpr increasing
  let area = 0;
  for (let i = 1; i < roc.length; i++) {
    const [x1,y1] = roc[i-1], [x2,y2] = roc[i];
    area += (x2 - x1) * (y1 + y2) / 2;
  }
  return Math.abs(area);
}

function Ch06_Evaluate() {
  return (
    <>
      <Hero eyebrow="Chapter 06 · Evaluate"
            title='Pick the metric <em>before</em> <span class="accent">you pick the model.</span>'
            hook="Accuracy is lazy. For fraud, cancer, churn, ads — <strong>precision, recall, or F1</strong>. Understand the tradeoff viscerally by sliding τ."
            meta={[{k:'Read',v:'8 min'},{k:'Focus',v:'Confusion · ROC · PR'},{k:'Sims',v:'1 live sweep'}]}/>

      <section className="section">
        <SectionLabel n="06.1">The confusion matrix</SectionLabel>
        <h2 className="h2">Four cells. <em>One thousand decisions.</em></h2>
        <p className="prose">
          Every classifier's output can be broken into four boxes: TP, FP, FN, TN. Every real metric —
          precision, recall, F1, ROC-AUC — is a ratio of these four.
        </p>
        <ThresholdSim/>
      </section>

      <section className="section">
        <SectionLabel n="06.2">Picking the right metric</SectionLabel>
        <ul className="prose" style={{paddingLeft:20}}>
          <li><strong>Fraud / cancer:</strong> high cost of FN → prioritize <em>recall</em>.</li>
          <li><strong>Spam filtering:</strong> high cost of FP (flagging real mail) → prioritize <em>precision</em>.</li>
          <li><strong>Balanced problem:</strong> <em>F1</em> or <em>AUC</em> is fine.</li>
          <li><strong>Imbalanced (fraud at 0.1%):</strong> <em>PR-AUC</em> is more honest than ROC-AUC.</li>
        </ul>
      </section>

      <AntiPatterns items={[
        '<b>Reporting accuracy on imbalanced data.</b> Predict "not fraud" always → 99.9% accuracy, zero utility.',
        '<b>Tuning on F1 but optimizing logloss.</b> Decide the metric upfront.',
        '<b>Default τ=0.5.</b> Threshold should reflect your business cost ratio, not library defaults.',
      ]}/>

      <Takeaway items={[
        '<b>Metric = value judgement.</b> You\'re saying which mistake is worse.',
        '<b>Threshold is a lever, not a default.</b> Move it.',
        '<b>Calibration ≠ accuracy.</b> A well-calibrated model\'s 0.7 means 70%, not just "higher than 0.5".',
      ]}/>
    </>
  );
}
window.Ch06_Evaluate = Ch06_Evaluate;
