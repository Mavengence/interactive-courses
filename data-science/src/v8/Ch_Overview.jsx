/* global React, Hero, SectionLabel, useTicker, mulberry32, randn */

const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
 * v8 Overview · LIGHT edition
 * ------------------------------------------------------------
 * The hero sim is a *Flowing Pipeline* — a continuous data
 * stream drops in from the top, flows through six stations
 * (Data → Explore → Clean → Feature → Model → Evaluate), is
 * transformed at each, and loops back. Each station has a
 * distinct animated glyph, so it doesn't feel like abstract
 * dots on a curve.
 * ============================================================ */

const STAGES = [
  { id: 'fund',    n: '01', title: 'Fundamentals',  tag: 'sample vs population',        blurb: 'The CLT made physical. Watch the sampling distribution converge.',     hue: '#5B3EE8' },
  { id: 'explore', n: '02', title: 'Explore',       tag: 'look before you leap',        blurb: 'Distributions, outliers, correlation mazes.',                           hue: '#1CA5D9' },
  { id: 'clean',   n: '03', title: 'Clean',         tag: 'missing · drifting · leaky',  blurb: 'Impute. Scale. Protect the future from the present.',                   hue: '#1FAF7E' },
  { id: 'feature', n: '04', title: 'Feature',       tag: 'information, engineered',     blurb: 'Encode, interact, bucket, normalize.',                                  hue: '#6BCF3F' },
  { id: 'model',   n: '05', title: 'Model',         tag: 'the bias/variance dance',     blurb: 'Fit, cross-validate, tune — watch train and test separate.',            hue: '#E8A031' },
  { id: 'eval',    n: '06', title: 'Evaluate',      tag: 'the honest number',           blurb: 'Confusion, ROC, calibration, threshold sliders.',                       hue: '#F25F3A' },
  { id: 'interp',  n: '07', title: 'Interpret',     tag: 'ask why',                     blurb: 'SHAP waterfalls, permutation, partial dependence.',                     hue: '#E8318F' },
  { id: 'exp',     n: '08', title: 'Experiment',    tag: 'the only proof',              blurb: 'A/B, power, MDE — watch 10k visitors roll in, live.',                   hue: '#5B3EE8' },
  { id: 'causal',  n: '09', title: 'Causal',        tag: 'beyond correlation',          blurb: 'DAGs, confounders, backdoor paths.',                                    hue: '#1CA5D9' },
  { id: 'peek',    n: '10', title: 'Peeking',       tag: 'how p-values lie',            blurb: 'Run 50 experiments in parallel, watch false positives bloom.',          hue: '#D83A3A' },
  { id: 'deploy',  n: '11', title: 'Deploy',        tag: 'alive in production',         blurb: 'Monitor drift. Retrain on signal, not schedule.',                       hue: '#1FAF7E' },
  { id: 'cap',     n: '12', title: 'Capstone',      tag: 'the whole loop',              blurb: 'Ship one end-to-end. Noise → decision → feedback.',                     hue: '#E8318F' },
];

/* ===========================================================
 * FlowingPipeline — the hero animation
 * =========================================================== */
function FlowingPipeline({ onStageClick }) {
  const t = useTicker(true);
  const [hover, setHover] = useState(null);
  const rngRef = useRef(mulberry32(7));

  const W = 760, H = 540;

  // Six station centers laid out on a gentle zig-zag (visually suggests a river)
  const STATIONS = [
    { id: 'fund',    lab: 'Data',     n: '01', cx: 120, cy:  90, hue: '#5B3EE8', glyph: 'cloud'   },
    { id: 'explore', lab: 'Explore',  n: '02', cx: 330, cy: 180, hue: '#1CA5D9', glyph: 'scatter' },
    { id: 'clean',   lab: 'Clean',    n: '03', cx: 560, cy: 120, hue: '#1FAF7E', glyph: 'filter'  },
    { id: 'feature', lab: 'Feature',  n: '04', cx: 640, cy: 300, hue: '#6BCF3F', glyph: 'gears'   },
    { id: 'model',   lab: 'Model',    n: '05', cx: 430, cy: 380, hue: '#E8A031', glyph: 'curve'   },
    { id: 'eval',    lab: 'Evaluate', n: '06', cx: 180, cy: 440, hue: '#F25F3A', glyph: 'target'  },
    // Feedback loop comes back to Data
  ];

  // Build one continuous path through stations + feedback
  const pathD = useMemo(() => {
    const pathPts = [
      [STATIONS[0].cx, STATIONS[0].cy],
      [STATIONS[1].cx, STATIONS[1].cy],
      [STATIONS[2].cx, STATIONS[2].cy],
      [STATIONS[3].cx, STATIONS[3].cy],
      [STATIONS[4].cx, STATIONS[4].cy],
      [STATIONS[5].cx, STATIONS[5].cy],
    ];
    return buildSmoothPath(pathPts) + ' ' +
      `C ${STATIONS[5].cx - 120} ${STATIONS[5].cy + 60}, ${STATIONS[0].cx - 60} ${STATIONS[0].cy + 200}, ${STATIONS[0].cx} ${STATIONS[0].cy}`;
  }, []);

  // Particle swarm — each particle rides a phase offset along the loop
  const pathRef = useRef(null);
  const [pathLen, setPathLen] = useState(0);
  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, [pathD]);

  // Sample particles along the path at current time
  const N_PARTICLES = 28;
  const particles = [];
  if (pathLen > 0 && pathRef.current) {
    for (let i = 0; i < N_PARTICLES; i++) {
      const speed = 0.05; // loops per second
      const phase = (i / N_PARTICLES + t * speed) % 1;
      const pt = pathRef.current.getPointAtLength(phase * pathLen);
      const hue = i % 4 === 0 ? '#5B3EE8' : i % 4 === 1 ? '#E8318F' : i % 4 === 2 ? '#6BCF3F' : '#1CA5D9';
      const size = 2.4 + 1.1 * Math.sin(t * 3 + i * 0.7);
      particles.push({ x: pt.x, y: pt.y, hue, size, idx: i });
    }
  }

  // For each station, a mini glyph animation (e.g. data points scattering)
  return (
    <div className="ov-loop-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="ov-loop">
        <defs>
          <linearGradient id="loop-grad-l" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0"   stopColor="#5B3EE8" stopOpacity="0.75"/>
            <stop offset="0.5" stopColor="#E8318F" stopOpacity="0.75"/>
            <stop offset="1"   stopColor="#6BCF3F" stopOpacity="0.75"/>
          </linearGradient>
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="paper-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dy="3"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.14"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Loop path — the "river" */}
        <path ref={pathRef} d={pathD} fill="none" stroke="url(#loop-grad-l)"
              strokeWidth="2.5" opacity="0.55"/>
        <path d={pathD} fill="none" stroke="url(#loop-grad-l)"
              strokeWidth="10" opacity="0.08" filter="url(#soft-glow)"/>

        {/* Traveling particles */}
        {particles.map((p) => (
          <circle key={p.idx} cx={p.x} cy={p.y} r={p.size}
                  fill={p.hue} opacity="0.85" filter="url(#soft-glow)"/>
        ))}

        {/* Stations */}
        {STATIONS.map((s, i) => {
          const h = hover === s.id;
          const pulseR = 34 + 1.5 * Math.sin(t * 1.4 + i);
          return (
            <g key={s.id}
               className="ov-loop-node"
               onMouseEnter={() => setHover(s.id)}
               onMouseLeave={() => setHover(null)}
               onClick={() => onStageClick && onStageClick(s.id)}
               transform={`translate(${s.cx} ${s.cy})`}>
              {/* Halo */}
              <circle r={pulseR + 6} fill="none" stroke={s.hue}
                      strokeWidth={h ? 1.6 : 0.8} opacity={h ? 0.6 : 0.22}/>
              {/* Paper disc */}
              <circle r={pulseR} fill="#FFFDF7" stroke={s.hue}
                      strokeWidth={h ? 2.6 : 1.8} filter="url(#paper-shadow)"/>
              {/* Glyph */}
              <StationGlyph kind={s.glyph} hue={s.hue} t={t} phase={i} />
              {/* Label below */}
              <text y={pulseR + 18} textAnchor="middle"
                    fill={h ? s.hue : '#3A3540'}
                    fontFamily="'JetBrains Mono', monospace"
                    fontSize="10"
                    fontWeight="700"
                    letterSpacing="0.14em"
                    style={{textTransform: 'uppercase'}}>
                {s.n} · {s.lab}
              </text>
            </g>
          );
        })}

        {/* Feedback label — on the return arc */}
        <g transform="translate(70 330)">
          <text fontFamily="'Instrument Serif', serif" fontSize="22" fontStyle="italic"
                fill="#3A3540" opacity="0.5">
            feedback
          </text>
          <text y="18" fontFamily="'JetBrains Mono', monospace" fontSize="9.5"
                fill="#6A6270" letterSpacing="0.14em" style={{textTransform:'uppercase'}}>
            the loop closes
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ---- Station glyphs: each has its own tiny animation ---- */
function StationGlyph({ kind, hue, t, phase }) {
  const common = { fill: hue, stroke: 'none' };
  switch (kind) {
    case 'cloud': {
      // Pulsing cluster of dots (raw data)
      const dots = [];
      for (let i = 0; i < 7; i++) {
        const a = (i/7) * Math.PI * 2 + t * 0.6;
        const r = 8 + 2 * Math.sin(t * 2 + i + phase);
        dots.push(<circle key={i} cx={Math.cos(a)*r} cy={Math.sin(a)*r} r={1.8} {...common}/>);
      }
      dots.push(<circle key="c" cx="0" cy="0" r={2.2} {...common}/>);
      return <g>{dots}</g>;
    }
    case 'scatter': {
      // Scatter plot glyph — mini axes + dots that drift
      const dots = [];
      for (let i = 0; i < 6; i++) {
        const seed = (i*13 + phase*17) % 19;
        const x = -10 + (seed/19) * 20 + 0.8 * Math.sin(t + i);
        const y =  10 - ((seed*7%19)/19) * 20 + 0.8 * Math.cos(t + i);
        dots.push(<circle key={i} cx={x} cy={y} r={1.6} {...common}/>);
      }
      return (
        <g>
          <line x1="-14" y1="12" x2="14"  y2="12"  stroke={hue} strokeWidth="0.9" opacity="0.5"/>
          <line x1="-14" y1="12" x2="-14" y2="-12" stroke={hue} strokeWidth="0.9" opacity="0.5"/>
          {dots}
        </g>
      );
    }
    case 'filter': {
      // Funnel that "cleans" — particles drip out
      const drip1 = 6 + 12 * ((t * 0.6 + phase * 0.3) % 1);
      const drip2 = 6 + 12 * ((t * 0.6 + 0.33 + phase * 0.3) % 1);
      return (
        <g>
          <path d="M -12 -10 L 12 -10 L 4 2 L 4 10 L -4 10 L -4 2 Z"
                fill="none" stroke={hue} strokeWidth="1.6"/>
          <circle cx="0" cy={drip1} r={1.4} {...common}/>
          <circle cx="0" cy={drip2} r={1.4} {...common} opacity="0.6"/>
        </g>
      );
    }
    case 'gears': {
      // Two overlapping circles rotating
      const rot = (t * 40) % 360;
      const ticks = (r, dir) => Array.from({length: 8}).map((_, i) => {
        const a = (i/8) * Math.PI * 2 + (dir*rot * Math.PI/180);
        return <line key={i}
                     x1={Math.cos(a)*r} y1={Math.sin(a)*r}
                     x2={Math.cos(a)*(r+3)} y2={Math.sin(a)*(r+3)}
                     stroke={hue} strokeWidth="1.2" strokeLinecap="round"/>;
      });
      return (
        <g>
          <g transform="translate(-5 0)">
            <circle r="7" fill="none" stroke={hue} strokeWidth="1.5"/>
            {ticks(7, 1)}
          </g>
          <g transform="translate(5 0)">
            <circle r="5" fill="none" stroke={hue} strokeWidth="1.5"/>
            {ticks(5, -1)}
          </g>
        </g>
      );
    }
    case 'curve': {
      // Animated sigmoid / fit curve
      const off = Math.sin(t * 0.7) * 2;
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const x = -13 + (i/20) * 26;
        const s = Math.tanh((x + off) * 0.4);
        const y = -s * 8;
        pts.push(`${x},${y}`);
      }
      return (
        <g>
          <line x1="-14" y1="10" x2="14" y2="10" stroke={hue} strokeWidth="0.9" opacity="0.4"/>
          <polyline points={pts.join(' ')} fill="none" stroke={hue} strokeWidth="1.8" strokeLinecap="round"/>
        </g>
      );
    }
    case 'target': {
      // Concentric rings + rotating reticle
      const rot = (t * 60) % 360;
      return (
        <g>
          <circle r="10" fill="none" stroke={hue} strokeWidth="1.2" opacity="0.35"/>
          <circle r="6"  fill="none" stroke={hue} strokeWidth="1.4" opacity="0.6"/>
          <circle r="2.2" {...common}/>
          <g transform={`rotate(${rot})`}>
            <line x1="-13" y1="0" x2="-8" y2="0" stroke={hue} strokeWidth="1.5"/>
            <line x1="8"   y1="0" x2="13"  y2="0" stroke={hue} strokeWidth="1.5"/>
          </g>
        </g>
      );
    }
  }
  return null;
}

function buildSmoothPath(pts) {
  // Open Catmull-Rom → cubic Bezier
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/* ===========================================================
 * Overview page
 * =========================================================== */
function Ch_Overview({ goTo }) {
  const outcomes = [
    { icon: '◇', t: 'Explore any dataset without flailing',       d: 'Distributions, missingness, correlation maps — a mental checklist for your first 30 minutes with new data.' },
    { icon: '○', t: 'Train a model that doesn\'t secretly cheat', d: 'Spot leakage. Split honestly. Pick the metric before the algorithm.' },
    { icon: '△', t: 'Read a confusion matrix like a pro',         d: 'Threshold slider, precision/recall tradeoff, calibration, class imbalance.' },
    { icon: '□', t: 'Design an A/B test that holds up',           d: 'Power, MDE, sample size, novelty effects, SRM checks, CUPED.' },
    { icon: '◈', t: 'Tell correlation from causation',            d: 'DAGs, confounders, backdoor paths, when regression adjustment saves you.' },
    { icon: '✕', t: 'Keep a model alive in production',           d: 'Drift monitoring, retraining cadence, shadow mode, rollback.' },
  ];

  return (
    <>
      {/* Hero with Flowing Pipeline */}
      <section className="ov-hero">
        <div className="ov-hero-copy">
          <div className="ov-hero-eyebrow">Data Science Fundamentals · v8</div>
          <h1 className="ov-hero-title">
            A data scientist is <em>a person who</em><br/>
            <span className="accent">turns noise into decisions.</span>
          </h1>
          <p className="ov-hero-hook">
            Twelve chapters. One animated loop. Built for the graduate who wants to
            ship real work — not memorize equations. Every chapter opens with a
            <strong> simulation you can break</strong>, not a wall of text.
          </p>
          <div className="ov-hero-cta">
            <button className="btn btn-primary ov-cta-btn" onClick={() => goTo('fund')}>
              Begin &nbsp;→
            </button>
            <button className="ov-cta-ghost" onClick={() => goTo('cap')}>
              Or skip to the capstone
            </button>
          </div>
          <div className="ov-hero-stats">
            <div className="ov-stat"><div className="k">12</div><div className="v">chapters</div></div>
            <div className="ov-stat"><div className="k">22</div><div className="v">live simulations</div></div>
            <div className="ov-stat"><div className="k">~2h</div><div className="v">end-to-end</div></div>
          </div>
        </div>
        <div className="ov-hero-sim">
          <FlowingPipeline onStageClick={(id) => goTo(id)} />
        </div>
      </section>

      {/* Outcomes */}
      <section className="section ov-outcomes-section">
        <div className="ov-section-head">
          <div className="ov-kicker">By the end</div>
          <h2 className="ov-h2">You'll know how to <em>do the work</em>,<br/>not just pass the interview.</h2>
        </div>
        <div className="ov-outcomes">
          {outcomes.map((o, i) => (
            <div className="ov-outcome" key={i}>
              <div className="ov-outcome-icon">{o.icon}</div>
              <div className="ov-outcome-t">{o.t}</div>
              <div className="ov-outcome-d">{o.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Curriculum */}
      <section className="section ov-curriculum-section">
        <div className="ov-section-head">
          <div className="ov-kicker">The curriculum</div>
          <h2 className="ov-h2">Twelve chapters. Build the model.<br/>Then prove it works.</h2>
          <p className="ov-lede">
            Half the course is how to build a model. The other half is how to
            <em> know if it worked</em> — the part most courses skip.
          </p>
        </div>
        <div className="ov-curriculum">
          {STAGES.map((s, i) => (
            <button className="ov-course" key={s.id}
                    style={{'--hue': s.hue}}
                    onClick={() => goTo(s.id)}>
              <div className="ov-course-top">
                <span className="ov-course-n">{s.n}</span>
                <span className="ov-course-dot" style={{background: s.hue, color: s.hue}}/>
              </div>
              <div className="ov-course-title">{s.title}</div>
              <div className="ov-course-tag">{s.tag}</div>
              <div className="ov-course-blurb">{s.blurb}</div>
              <div className="ov-course-cta">Open chapter &nbsp;→</div>
            </button>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section className="section">
        <div className="ov-section-head ov-sh-tight">
          <div className="ov-kicker">Tools you'll see</div>
          <h2 className="ov-h2">Standard industry kit.<br/>No proprietary gatekeeping.</h2>
          <p className="ov-lede">
            The sims render the <em>behavior</em> of these tools. Muscle memory transfers
            to whichever stack your employer uses.
          </p>
        </div>
        <div className="ov-tools">
          {[
            { n: 'pandas',            r: 'dataframes' },
            { n: 'scikit-learn',      r: 'classic ML' },
            { n: 'numpy',             r: 'arrays' },
            { n: 'PyTorch',           r: 'deep learning' },
            { n: 'statsmodels',       r: 'inference + GLMs' },
            { n: 'scipy.stats',       r: 'tests + distributions' },
            { n: 'SHAP',              r: 'interpretability' },
            { n: 'Jupyter · Hex',     r: 'notebooks' },
            { n: 'MLflow',            r: 'tracking' },
            { n: 'Feast',             r: 'feature store' },
            { n: 'Great Expectations',r: 'data quality' },
            { n: 'A/B platform',      r: 'experiments' },
          ].map((t) => (
            <div key={t.n} className="ov-tool">
              <div className="ov-tool-n">{t.n}</div>
              <div className="ov-tool-r">{t.r}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ov-cta-band">
        <div className="ov-cta-eyebrow">Ready?</div>
        <div className="ov-cta-title">Chapter 01 opens with a falling-ball sampler.</div>
        <div className="ov-cta-sub">
          Drop a thousand samples through a physical Galton board. Watch the
          central limit theorem emerge from chaos. <em>Seven minutes.</em> Then
          you're in.
        </div>
        <div className="ov-cta-row">
          <button className="btn btn-primary ov-cta-btn" onClick={() => goTo('fund')}>
            Begin with Chapter 01 &nbsp;→
          </button>
          <button className="ov-cta-ghost" onClick={() => goTo('exp')}>
            Or jump to Experimentation →
          </button>
        </div>
      </section>
    </>
  );
}

window.Ch_Overview = Ch_Overview;
