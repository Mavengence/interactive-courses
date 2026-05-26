/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, mulberry32, randn, round, clamp, normCdf */
const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
 * Ch 08 · Experiment
 * Live A/B simulator. You set true lift + daily users.
 * Visitors stream in (animated), control vs variant conversions
 * accumulate, running-lift chart, live p-value, power bar.
 * ============================================================ */

function ABSim() {
  const [trueLift, setTrueLift] = useState(0.02);   // 2pp
  const [baseline, setBaseline] = useState(0.12);   // 12%
  const [dailyN, setDailyN] = useState(2000);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(0);

  // Stream state
  const stateRef = useRef(null);
  if (!stateRef.current) stateRef.current = fresh();

  function fresh() {
    return {
      rng: mulberry32(Math.floor(Math.random()*1e9)),
      day: 0,
      nC: 0, cC: 0,   // visits / conversions control
      nV: 0, cV: 0,
      history: [],     // {day, lift, pLow, pHigh, pval}
    };
  }

  function reset() {
    stateRef.current = fresh();
    setTick(t => t + 1);
  }

  useEffect(() => {
    if (!running) return;
    let raf, last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = stateRef.current;
      // advance "days" based on speed (1 day / second at speed=1)
      const daysToAdd = dt * speed;
      if (s.day + daysToAdd <= 28) {
        // simulate in chunks of ~0.1 day
        let remaining = daysToAdd;
        while (remaining > 0 && s.day < 28) {
          const step = Math.min(0.1, remaining);
          const users = Math.round(dailyN * step);
          for (let i = 0; i < users; i++) {
            const toControl = s.rng() < 0.5;
            if (toControl) {
              s.nC++;
              if (s.rng() < baseline) s.cC++;
            } else {
              s.nV++;
              if (s.rng() < baseline + trueLift) s.cV++;
            }
          }
          s.day += step;
          remaining -= step;
        }
        // record
        const pC = s.cC / (s.nC || 1);
        const pV = s.cV / (s.nV || 1);
        const lift = pV - pC;
        // SE of difference
        const se = Math.sqrt(pC*(1-pC)/(s.nC||1) + pV*(1-pV)/(s.nV||1));
        const z = se > 0 ? lift / se : 0;
        const pval = 2 * (1 - normCdf(Math.abs(z)));
        s.history.push({
          day: s.day,
          pC, pV, lift,
          low: lift - 1.96*se,
          high: lift + 1.96*se,
          pval,
        });
        if (s.history.length > 400) s.history.shift();
      }
      setTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, dailyN, baseline, trueLift]);

  const s = stateRef.current;
  const latest = s.history[s.history.length-1] || { pC: baseline, pV: baseline, lift: 0, low:0, high:0, pval: 1 };

  // Required sample size per arm for 80% power, two-tailed α=0.05.
  // Exact two-proportion formula: n ≈ (z_{α/2}+z_β)² · (p1(1-p1)+p2(1-p2)) / Δ²
  // where z_{0.025}=1.96, z_{0.20}=0.84.
  const p1 = baseline, p2 = baseline + trueLift;
  const nPerArm = trueLift !== 0
    ? Math.ceil((1.96 + 0.84)**2 * (p1*(1-p1) + p2*(1-p2)) / (trueLift*trueLift))
    : Infinity;
  const daysNeeded = nPerArm * 2 / dailyN;

  // Progress toward n
  const progress = Math.min(1, (s.nC + s.nV) / (nPerArm * 2 || 1));

  // Running lift chart
  const W = 560, H = 180;
  const xMap = d => 30 + (d / 28) * (W - 60);
  const yMin = -0.04, yMax = 0.06;
  const yMap = v => 160 - ((v - yMin) / (yMax - yMin)) * 140;

  const bandPath = useMemo(() => {
    if (s.history.length < 2) return '';
    const top = s.history.map(h => `${xMap(h.day)},${yMap(h.high)}`).join(' L ');
    const bot = [...s.history].reverse().map(h => `${xMap(h.day)},${yMap(h.low)}`).join(' L ');
    return `M ${top} L ${bot} Z`;
  }, [tick]);

  const linePath = useMemo(() => {
    if (s.history.length < 2) return '';
    return 'M ' + s.history.map(h => `${xMap(h.day)},${yMap(h.lift)}`).join(' L ');
  }, [tick]);

  const significant = latest.pval < 0.05;

  return (
    <Panel eyebrow="LIVE · A/B TEST"
           title="Running experiment"
           meta={`Day ${s.day.toFixed(1)} / 28`}
           caption="Set a true lift, press play, watch visits stream in. The shaded band is the 95% CI on Δconversion. When it crosses zero for good, you have significance.">
      <div className="sim-row" style={{gridTemplateColumns:'280px 1fr'}}>
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>True lift <span className="mono">{(trueLift*100).toFixed(1)} pp</span></label>
            <input type="range" min="-0.03" max="0.05" step="0.002"
                   value={trueLift} onChange={e=>{setTrueLift(+e.target.value);reset();}}/>
          </div>
          <div className="sim-ctrl">
            <label>Baseline CVR <span className="mono">{(baseline*100).toFixed(0)}%</span></label>
            <input type="range" min="0.02" max="0.30" step="0.01"
                   value={baseline} onChange={e=>{setBaseline(+e.target.value);reset();}}/>
          </div>
          <div className="sim-ctrl">
            <label>Daily visitors <span className="mono">{dailyN}</span></label>
            <input type="range" min="500" max="10000" step="500"
                   value={dailyN} onChange={e=>setDailyN(+e.target.value)}/>
          </div>
          <div className="sim-ctrl">
            <label>Speed <span className="mono">{speed}×</span></label>
            <input type="range" min="0.5" max="8" step="0.5"
                   value={speed} onChange={e=>setSpeed(+e.target.value)}/>
          </div>
          <div className="sim-ctrl-row">
            <button className={`btn btn-sm ${running?'btn-primary':''}`}
                    onClick={()=>setRunning(r=>!r)}>
              {running ? '❚❚ Pause' : '▶ Play'}
            </button>
            <button className="btn btn-sm" onClick={reset}>↻ Reset</button>
          </div>
          <div className="sim-stats" style={{gridTemplateColumns:'1fr 1fr'}}>
            <div>
              <div className="k">CONTROL</div>
              <div className="v" style={{fontSize:22}}>{(latest.pC*100).toFixed(2)}%</div>
              <div className="sub mono">{s.cC}/{s.nC}</div>
            </div>
            <div>
              <div className="k">VARIANT</div>
              <div className="v" style={{fontSize:22, color:'var(--violet)'}}>{(latest.pV*100).toFixed(2)}%</div>
              <div className="sub mono">{s.cV}/{s.nV}</div>
            </div>
          </div>
          <div className="ab-verdict" data-sig={significant ? 'yes' : 'no'}>
            <div className="ab-verdict-k">p-value</div>
            <div className="ab-verdict-v">{latest.pval < 0.001 ? '<0.001' : latest.pval.toFixed(3)}</div>
            <div className="ab-verdict-note">
              {significant
                ? <>✓ significant (α=0.05)</>
                : <>— not yet significant</>}
            </div>
          </div>
          <div className="ab-power">
            <div className="ab-power-head">
              <span>Sample progress · 80% power</span>
              <span className="mono">{Math.min(99, Math.floor(progress*100))}%</span>
            </div>
            <div className="ab-power-bar">
              <div className="ab-power-fill" style={{width: `${Math.min(100, progress*100)}%`}}/>
            </div>
            <div className="ab-power-note">
              Need <span className="mono">{Number.isFinite(nPerArm) ? nPerArm.toLocaleString() : '∞'}</span> per arm
              · ~<span className="mono">{Number.isFinite(daysNeeded) ? daysNeeded.toFixed(1) : '∞'}</span> days
            </div>
          </div>
        </div>

        <div className="sim-plots">
          <div className="plot-wrap">
            <div className="sim-plot-head">
              Observed lift with 95% CI
              <span className="hint">true lift = {(trueLift*100).toFixed(1)}pp</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`}>
              {/* grid */}
              {[-0.04,-0.02,0,0.02,0.04,0.06].map(v=>(
                <g key={v}>
                  <line x1="30" y1={yMap(v)} x2={W-10} y2={yMap(v)}
                        stroke={v===0 ? '#A49D9A' : '#E6E1D8'}
                        strokeWidth={v===0 ? 1 : 0.5}
                        strokeDasharray={v===0 ? '0' : '2 3'}/>
                  <text x="26" y={yMap(v)+3} textAnchor="end" fontSize="9" fill="#6A6270"
                        fontFamily="'JetBrains Mono', monospace">
                    {(v*100).toFixed(0)}pp
                  </text>
                </g>
              ))}
              {/* true lift line */}
              <line x1="30" y1={yMap(trueLift)} x2={W-10} y2={yMap(trueLift)}
                    stroke="#E8A031" strokeWidth="1" strokeDasharray="4 4" opacity="0.7"/>
              <text x={W-12} y={yMap(trueLift)-4} textAnchor="end" fontSize="9" fill="#E8A031"
                    fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                truth · {(trueLift*100).toFixed(1)}pp
              </text>
              {/* CI band */}
              {bandPath && <path d={bandPath} fill="#5B3EE8" opacity="0.12"/>}
              {/* Lift line */}
              {linePath && <path d={linePath} fill="none" stroke="#5B3EE8" strokeWidth="1.6"/>}
              {/* Current point */}
              {s.history.length > 0 && (
                <circle cx={xMap(latest.day)} cy={yMap(latest.lift)} r="3.5"
                        fill={significant ? '#1FAF7E' : '#5B3EE8'}/>
              )}
              {/* x axis ticks */}
              {[0,7,14,21,28].map(d=>(
                <g key={d}>
                  <line x1={xMap(d)} y1="160" x2={xMap(d)} y2="164" stroke="#A49D9A"/>
                  <text x={xMap(d)} y="175" textAnchor="middle" fontSize="9" fill="#6A6270"
                        fontFamily="'JetBrains Mono', monospace">d{d}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Ch08_Experiment() {
  return (
    <>
      <Hero eyebrow="Chapter 08 · Experiment"
            title='A/B is <em>how</em> you learn. <span class="accent">Power is how</span> fast.'
            hook="Randomize. Pre-declare metric + MDE + sample size. Don't peek. This is the discipline that separates product from vibes."
            meta={[{k:'Read',v:'9 min'},{k:'Focus',v:'Power · CI · MDE'},{k:'Sims',v:'1 live A/B'}]}/>

      <section className="section">
        <SectionLabel n="08.1">The experiment, live</SectionLabel>
        <h2 className="h2">Run the test <em>before</em> you run the test.</h2>
        <p className="prose">
          A single A/B run doesn't tell you much. Move the <em>true lift</em> slider to 0 — watch the CI
          wobble around zero, never resolve. Now set it to +2pp — watch it drift upward and the band
          finally clear zero. <strong>That is what "we need more users" means.</strong>
        </p>
        <ABSim/>
      </section>

      <section className="section">
        <SectionLabel n="08.2">The four pre-commits</SectionLabel>
        <ol className="prose" style={{paddingLeft:20}}>
          <li><strong>Primary metric</strong> — one number. Declare it. Log it.</li>
          <li><strong>MDE</strong> — the smallest lift you care about. Smaller MDE → huge sample size.</li>
          <li><strong>Power</strong> — 80% is standard. Below 50% and you're gambling.</li>
          <li><strong>Duration</strong> — at least 1 full week for weekly seasonality. 2 is safer.</li>
        </ol>
      </section>

      <AntiPatterns items={[
        '<b>Peeking.</b> Checking p-values daily and stopping when significant inflates FPR to ~25% (see Ch 10).',
        '<b>HARKing.</b> Hypothesizing after results are known — slicing until something pops.',
        '<b>Multiple comparisons without correction.</b> 20 independent metrics at α=0.05 → ~64% chance at least one is a false positive.',
      ]}/>

      <Takeaway items={[
        '<b>Sample size = (noise / effect)².</b> Halve the MDE → 4× the users.',
        '<b>CIs beat p-values.</b> A 95% CI shows magnitude AND uncertainty at once.',
        '<b>Neutral result is a result.</b> "No detectable effect at our MDE" is useful information.',
      ]}/>
    </>
  );
}
window.Ch08_Experiment = Ch08_Experiment;
