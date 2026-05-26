/* global React, Hero, SectionLabel, Panel, Takeaway, AntiPatterns, useTicker, mulberry32, randn, clamp, round */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ==========================================================
 * Ch 01 · Fundamentals
 * --------------------------------------------------------
 * Signature sim: GALTON BOARD + SAMPLING DISTRIBUTION
 * A continuously-running physics simulation:
 *   - balls drop from the top, bounce through a peg triangle,
 *     and stack into a population histogram at the bottom,
 *   - in parallel, batches of n balls are averaged, and the
 *     mean drops as a particle into a second histogram (the
 *     sampling distribution) underneath.
 *
 * Everything is rAF-driven with real ballistic motion, so it
 * genuinely feels alive — not a slider + replot.
 * ========================================================== */

function GaltonSim() {
  const [n, setN]           = useState(25);         // sample size
  const [rate, setRate]     = useState(8);          // balls per second
  const [pop, setPop]       = useState('bell');     // bell | skew | bimodal
  const [running, setRunning] = useState(true);
  const [tick, setTick]     = useState(0);          // force-rerender per frame

  // Physics state kept outside React state (too fast)
  const ballsRef       = useRef([]);                // in-flight balls
  const stackRef       = useRef(new Array(32).fill(0));  // population histogram
  const sampleBufRef   = useRef([]);                // accumulating current sample
  const meansRef       = useRef([]);                // completed sample means (numbers)
  const meanStackRef   = useRef(new Array(32).fill(0)); // sampling-dist histogram
  const meanBallsRef   = useRef([]);                // animating mean particles
  const rngRef         = useRef(mulberry32(42));

  // Dimensions (SVG viewBox)
  const W = 520, H = 620;
  const BOARD_TOP = 30, BOARD_BOT = 280;     // peg region
  const POP_TOP = 290, POP_BOT = 400;        // population histogram
  const MEAN_TOP = 450, MEAN_BOT = 590;      // sampling distribution
  const BIN_W = W / 32;

  // Peg grid — used for collision + visual
  const PEG_ROWS = 11;
  const pegs = useMemo(() => {
    const p = [];
    for (let row = 0; row < PEG_ROWS; row++) {
      const cy = BOARD_TOP + 10 + (row / (PEG_ROWS - 1)) * (BOARD_BOT - BOARD_TOP - 40);
      const cols = row + 2;
      const spacing = W / (cols + 1);
      for (let col = 0; col < cols; col++) {
        p.push({ x: (col + 1) * spacing, y: cy });
      }
    }
    return p;
  }, []);

  // Ball spawn: pop determines exit bias at each peg
  const spawnBall = (sampleBatchId) => {
    ballsRef.current.push({
      x: W / 2 + (rngRef.current() - 0.5) * 8,
      y: BOARD_TOP - 8,
      vx: 0,
      vy: 0,
      row: -1,
      hue: sampleBatchId % 2 === 0 ? '#5B3EE8' : '#E8318F',
      batchId: sampleBatchId,
      landed: false,
      age: 0,
    });
  };

  // Deflection bias — shapes the population
  const biasAt = (row, x) => {
    // returns -1 (left) or +1 (right), with bias by pop
    const r = rngRef.current();
    if (pop === 'bell') return r < 0.5 ? -1 : 1;
    if (pop === 'skew') return r < 0.35 ? -1 : 1;   // right-skew
    // bimodal: push balls away from center
    const leanCenter = (x - W / 2) / (W / 2);       // -1..1
    const pushProb = 0.5 + 0.28 * Math.sign(leanCenter || (r - 0.5));
    return r < pushProb ? (leanCenter >= 0 ? 1 : -1) : (leanCenter >= 0 ? -1 : 1);
  };

  // rAF loop
  useEffect(() => {
    if (!running) return;
    let raf;
    let last = performance.now();
    let ballAccum = 0;
    let sampleBatchId = 0;
    let inBatch = 0;

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Spawn balls at rate (balls per second)
      ballAccum += dt * rate;
      while (ballAccum >= 1) {
        ballAccum -= 1;
        spawnBall(sampleBatchId);
        inBatch++;
        if (inBatch >= n) { sampleBatchId++; inBatch = 0; }
      }

      // Advance each ball
      const balls = ballsRef.current;
      for (const b of balls) {
        if (b.landed) { b.age += dt; continue; }
        // Determine current row by y
        const rowF = (b.y - BOARD_TOP - 10) / ((BOARD_BOT - BOARD_TOP - 40) / (PEG_ROWS - 1));
        const rowIdx = Math.max(-1, Math.floor(rowF));
        if (rowIdx > b.row) {
          // Crossed a peg — apply kick
          b.row = rowIdx;
          const dir = biasAt(rowIdx, b.x);
          const spacing = W / (rowIdx + 3);
          b.vx = dir * spacing * 2.8;  // give horizontal nudge
          b.vy = Math.max(b.vy, 180);   // maintain fall
        }
        // Gravity + motion
        b.vy += 520 * dt;
        b.x  += b.vx * dt;
        b.vx *= 0.93;
        b.y  += b.vy * dt;

        // Land when reaching pop top
        if (b.y >= POP_TOP - 6) {
          b.landed = true;
          b.y = POP_TOP - 6;
          const binIdx = Math.max(0, Math.min(31, Math.floor(b.x / BIN_W)));
          const prevH = stackRef.current[binIdx];
          stackRef.current[binIdx]++;
          // Record sample buffer
          sampleBufRef.current.push(binIdx);
          // If we've completed a sample, compute mean and dispatch a particle
          if (sampleBufRef.current.length >= n) {
            const mean = sampleBufRef.current.reduce((a, v) => a + v, 0) / sampleBufRef.current.length;
            meansRef.current.push(mean);
            // Spawn mean-particle from where the last ball landed
            meanBallsRef.current.push({
              x: b.x, y: POP_BOT + 4,
              tx: (mean + 0.5) * BIN_W,
              ty: MEAN_BOT - 8,
              t: 0, dur: 0.9,
              hue: '#E8318F',
              meanVal: mean,
            });
            sampleBufRef.current = [];
          }
          // Track real landing-y from cumulative stack for rendering
          b.binIdx = binIdx;
          b.stackIdx = prevH;
        }
      }

      // Advance mean-particles
      for (const m of meanBallsRef.current) {
        m.t += dt;
        const u = clamp(m.t / m.dur, 0, 1);
        const eased = 1 - Math.pow(1 - u, 3); // easeOutCubic
        m.x = m.x + (m.tx - m.x) * (eased - clamp((m.t - dt) / m.dur, 0, 1) + eased * 0.001);
        // Arc: quadratic in y
        const arcLift = -60 * Math.sin(eased * Math.PI);
        m.cy = m.y + (m.ty - m.y) * eased + arcLift;
        if (u >= 1) {
          m.done = true;
          const binIdx = Math.max(0, Math.min(31, Math.floor(m.tx / BIN_W)));
          meanStackRef.current[binIdx]++;
        }
      }
      // Cull old
      ballsRef.current = balls.filter(b => !b.landed || b.age < 0.12);
      meanBallsRef.current = meanBallsRef.current.filter(m => !m.done);

      setTick(k => k + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, rate, n, pop]);

  // Reset when pop or n changes — clear stacks
  const reset = useCallback(() => {
    stackRef.current = new Array(32).fill(0);
    meanStackRef.current = new Array(32).fill(0);
    ballsRef.current = [];
    meanBallsRef.current = [];
    meansRef.current = [];
    sampleBufRef.current = [];
    rngRef.current = mulberry32(42);
    setTick(k => k + 1);
  }, []);

  useEffect(() => { reset(); }, [pop, reset]);

  // Derived stats
  const totalSamples = meansRef.current.length;
  const totalBalls = stackRef.current.reduce((a, v) => a + v, 0);
  const meanOfMeans = totalSamples
    ? meansRef.current.reduce((a, v) => a + v, 0) / totalSamples
    : null;
  const seEmpirical = totalSamples > 1
    ? Math.sqrt(meansRef.current.reduce((a, v) => a + (v - meanOfMeans) ** 2, 0) / (totalSamples - 1))
    : null;

  // Max for histogram scaling (with smoothing to prevent jumps)
  const popMax = Math.max(6, ...stackRef.current);
  const meanMax = Math.max(4, ...meanStackRef.current);

  return (
    <Panel eyebrow="LIVE · PHYSICS" title="Galton Board · Sampling Distribution"
           meta={`n = ${n} · ${totalSamples} samples · ${totalBalls} balls`}
           caption="Top: balls drop through a peg grid, stacking into the population shape. Bottom: every n balls, their mean drops into the sampling distribution. Watch the bottom curve narrow and become bell-shaped — that's the CLT, live.">
      <div className="sim-row galton-row">
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Population</label>
            <div className="seg">
              {['bell','skew','bimodal'].map(p => (
                <button key={p} className={pop===p?'on':''}
                        onClick={()=>setPop(p)}>{p}</button>
              ))}
            </div>
          </div>
          <div className="sim-ctrl">
            <label>Sample size <span className="mono">n = {n}</span></label>
            <input type="range" min="2" max="100" value={n}
                   onChange={e=>setN(+e.target.value)} />
          </div>
          <div className="sim-ctrl">
            <label>Drop rate <span className="mono">{rate}/s</span></label>
            <input type="range" min="2" max="40" value={rate}
                   onChange={e=>setRate(+e.target.value)} />
          </div>
          <div className="sim-ctrl-row">
            <button className={`btn btn-sm ${running ? '' : 'btn-primary'}`}
                    onClick={()=>setRunning(r=>!r)}>
              {running ? 'Pause' : 'Play'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={reset}>Reset</button>
          </div>
          <div className="sim-stats">
            <div><div className="k">Mean of means</div><div className="v">{meanOfMeans!=null?round(meanOfMeans,2):'—'}</div></div>
            <div><div className="k">SE (empirical)</div><div className="v" style={{color:'var(--magenta)'}}>{seEmpirical!=null?round(seEmpirical,2):'—'}</div></div>
            <div><div className="k">Samples</div><div className="v" style={{color:'var(--violet)'}}>{totalSamples}</div></div>
          </div>
          <div className="galton-note">
            <span className="tag-pill">CLT</span>
            As <code className="mono">n</code> grows, <strong>SE shrinks</strong> by
            <strong> 1/√n</strong>. At n=4 → SE≈8. At n=100 → SE≈1.6.
          </div>
        </div>

        <div className="galton-stage">
          <svg viewBox={`0 0 ${W} ${H}`} className="galton-svg">
            <defs>
              <linearGradient id="galton-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0"  stopColor="#FBF8F1" stopOpacity="0"/>
                <stop offset="1"  stopColor="#FBF8F1" stopOpacity="1"/>
              </linearGradient>
            </defs>

            {/* Funnel */}
            <path d={`M ${W/2-40} 6 L ${W/2-14} 28 L ${W/2+14} 28 L ${W/2+40} 6`}
                  fill="none" stroke="#3A3540" strokeWidth="1.4"/>

            {/* Pegs */}
            {pegs.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.2} fill="#A49D9A"/>
            ))}

            {/* In-flight balls */}
            {ballsRef.current.map((b, i) => {
              if (b.landed) {
                // Draw in stack at proper height
                const binX = (b.binIdx + 0.5) * BIN_W;
                const binBarH = ((b.stackIdx + 1) / popMax) * (POP_BOT - POP_TOP - 10);
                const y = POP_BOT - binBarH + 4;
                return <circle key={i} cx={binX} cy={y} r={2.4}
                               fill={b.hue} opacity={Math.max(0, 1 - b.age * 8)}/>;
              }
              return <circle key={i} cx={b.x} cy={b.y} r={3} fill={b.hue}
                             stroke="#14121688" strokeWidth="0.5"/>;
            })}

            {/* Population histogram */}
            {stackRef.current.map((v, i) => {
              const h = (v / popMax) * (POP_BOT - POP_TOP - 10);
              return (
                <rect key={i} x={i * BIN_W + 0.5} y={POP_BOT - h}
                      width={BIN_W - 1} height={h}
                      fill="#1CA5D9" opacity="0.45"/>
              );
            })}

            {/* Divider label */}
            <text x="8" y={POP_TOP - 8}
                  fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="700"
                  letterSpacing="0.14em" fill="#6A6270" style={{textTransform:'uppercase'}}>
              Population · {totalBalls} balls
            </text>

            {/* Divider line */}
            <line x1="0" y1={POP_BOT + 12} x2={W} y2={POP_BOT + 12}
                  stroke="#A49D9A" strokeDasharray="3 4" strokeWidth="0.8"/>

            <text x="8" y={MEAN_TOP - 6}
                  fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="700"
                  letterSpacing="0.14em" fill="#6A6270" style={{textTransform:'uppercase'}}>
              Sampling distribution of the mean · n = {n}
            </text>

            {/* Traveling mean particles */}
            {meanBallsRef.current.map((m, i) => (
              <g key={i}>
                <circle cx={m.x} cy={m.cy || m.y} r={4}
                        fill={m.hue} opacity="0.9"/>
                <circle cx={m.x} cy={m.cy || m.y} r={8}
                        fill="none" stroke={m.hue} strokeWidth="1" opacity="0.4"/>
              </g>
            ))}

            {/* Sampling-dist histogram */}
            {meanStackRef.current.map((v, i) => {
              const h = (v / meanMax) * (MEAN_BOT - MEAN_TOP - 10);
              if (v === 0) return null;
              return (
                <rect key={i} x={i * BIN_W + 0.5} y={MEAN_BOT - h}
                      width={BIN_W - 1} height={h}
                      fill="#E8318F" opacity="0.65"/>
              );
            })}

            {/* Expected normal overlay */}
            {totalSamples > 20 && seEmpirical > 0 && (
              <path d={normalPath(meanOfMeans, seEmpirical, meanMax, MEAN_TOP, MEAN_BOT, BIN_W, W)}
                    fill="none" stroke="#5B3EE8" strokeWidth="2" opacity="0.85"
                    strokeDasharray="0"/>
            )}

            {/* Baseline */}
            <line x1="0" y1={MEAN_BOT} x2={W} y2={MEAN_BOT}
                  stroke="#A49D9A" strokeWidth="0.8"/>
            <line x1="0" y1={POP_BOT} x2={W} y2={POP_BOT}
                  stroke="#A49D9A" strokeWidth="0.8"/>
          </svg>
        </div>
      </div>
    </Panel>
  );
}

function normalPath(mu, sigma, maxBin, top, bot, binW, width) {
  // sample the curve; use *histogram count density* as y-scale.
  // We'll use a scaled unimodal so its peak matches the histogram max.
  const pts = [];
  for (let x = 0; x <= width; x += 4) {
    const binIdx = x / binW;
    const z = (binIdx - mu) / Math.max(0.5, sigma);
    const y = Math.exp(-0.5 * z * z); // 0..1 normalized
    const py = bot - y * (bot - top - 10);
    pts.push(`${x},${py}`);
  }
  return 'M ' + pts.join(' L ');
}

function Ch01_Fundamentals() {
  return (
    <>
      <Hero
        eyebrow="Chapter 01 · Fundamentals"
        title='The data scientist <em>turns noise</em> <span class="accent">into decisions.</span>'
        hook="Before any model, any SQL, any dashboard — there are three ideas. <strong>Sample vs population.</strong> <strong>Signal vs noise.</strong> <strong>Correlation vs causation.</strong> Get these and half the field clicks into place."
        meta={[
          { k: 'Read',   v: '7 min' },
          { k: 'Focus',  v: 'CLT · sampling · the DS loop' },
          { k: 'Sims',   v: '1 physics-based · live' },
        ]}
      />

      <section className="section">
        <SectionLabel n="01.1">Sample vs population</SectionLabel>
        <h2 className="h2">You never see the truth. <em>You see a shadow of it.</em></h2>
        <p className="prose">
          Your company has <strong>44 million users</strong>. Your A/B test touched <strong>180,000</strong> of them
          over two weeks. The result you report — "retention went up 2.3%" — isn't a measurement of reality.
          It's a <em>guess</em>, informed by a sliver of reality, wrapped in uncertainty.
        </p>
        <p className="prose">
          Every data scientist lives in this gap: we work from <code>samples</code>, but we make claims about <code>populations</code>.
          Everything else in this course — confidence intervals, p-values, A/B tests, model accuracy — is machinery
          for honestly quantifying how much that gap matters.
        </p>

        <GaltonSim />

        <p className="prose" style={{marginTop: 22}}>
          Crank <code>n</code> from 2 to 100. Watch the pink distribution narrow — its spread shrinks by
          <code> 1/√n</code>. Switch from <em>bell</em> to <em>skew</em> to <em>bimodal</em>: the <strong>population</strong>
          can be any ugly shape, yet the <strong>sampling distribution</strong> tracks the violet normal curve.
          That's the central limit theorem, and it's why A/B tests work at all.
        </p>
      </section>

      <section className="section">
        <SectionLabel n="01.2">The DS loop</SectionLabel>
        <h2 className="h2">Six stages. One feedback loop. <em>No skipping.</em></h2>
        <p className="prose">
          Every serious DS project runs through the same loop:
          <strong> Data → Explore → Clean → Feature → Model → Evaluate</strong>, then back around.
          Each chapter covers one stage, plus the meta-skills on top — experimentation, causal reasoning, deployment.
        </p>

        <div className="loop-mini">
          {['Data','Explore','Clean','Feature','Model','Evaluate'].map((s, i) => (
            <div className="loop-mini-stage" key={s}>
              <div className="loop-mini-n">{String(i+1).padStart(2,'0')}</div>
              <div className="loop-mini-t">{s}</div>
            </div>
          ))}
        </div>

        <AntiPatterns items={[
          '<b>Fitting before looking.</b> Running <code>model.fit()</code> on a dataset you haven\'t <em>plotted</em> is how you ship a model that learned the index column.',
          '<b>Optimizing a number nobody asked for.</b> Great accuracy on the wrong metric is worse than decent accuracy on the right one.',
          '<b>Confusing correlation with causation.</b> "Users who see feature X retain better" does not mean feature X causes retention. It may just mean engaged users see X.',
        ]}/>
      </section>

      <Takeaway items={[
        '<b>Sample, not truth.</b> Every number you report is a guess with uncertainty attached. Quantify it.',
        '<b>CLT is a gift.</b> Regardless of ugly populations, sample means trend toward normal. This is why A/B tests work.',
        '<b>The loop is non-negotiable.</b> Skipping explore → leakage. Skipping evaluate → false confidence. Skipping feedback → stale models.',
      ]}/>
    </>
  );
}

window.Ch01_Fundamentals = Ch01_Fundamentals;
