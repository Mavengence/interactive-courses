/* global React */
// v8 · Data Science Fundamentals — shared primitives
// Motion-first. Every component has cinematic entry + interactive feedback.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ===========================================================
 * Hero — chapter opening. Staggered fade + title split animation.
 * =========================================================== */
function Hero({ eyebrow, title, hook, meta }) {
  return (
    <header className="hero">
      <div className="hero-eyebrow">{eyebrow}</div>
      <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="hero-hook" dangerouslySetInnerHTML={{ __html: hook }} />
      {meta && (
        <div className="hero-meta">
          {meta.map((m, i) => (
            <div className="m" key={i} style={{animationDelay: `${0.3 + i*0.08}s`}}>
              <div className="k">{m.k}</div>
              <div className="v" dangerouslySetInnerHTML={{ __html: m.v }} />
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

function SectionLabel({ n, children }) {
  return (
    <div className="section-label">
      <span className="n">{n}</span>
      <span className="t">{children}</span>
    </div>
  );
}

function AntiPatterns({ items, title = "Anti-patterns" }) {
  return (
    <div className="callout">
      <div className="callout-head">{title}</div>
      <div className="callout-list">
        {items.map((it, i) => (
          <div className="callout-item" key={i}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            <span dangerouslySetInnerHTML={{ __html: it }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BestPractices({ items, title = "The right way" }) {
  return (
    <div className="callout mint">
      <div className="callout-head">{title}</div>
      <div className="callout-list">
        {items.map((it, i) => (
          <div className="callout-item" key={i}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            <span dangerouslySetInnerHTML={{ __html: it }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Takeaway({ items }) {
  return (
    <div className="takeaway">
      <div className="takeaway-head">Key takeaways</div>
      <div className="takeaway-list">
        {items.map((it, i) => (
          <div className="takeaway-item" key={i} dangerouslySetInnerHTML={{ __html: it }} />
        ))}
      </div>
    </div>
  );
}

function Panel({ eyebrow, title, meta, children, caption }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <span className="dot" />
          {eyebrow && <span className="lab">{eyebrow}</span>}
          <span className="name">{title}</span>
        </div>
        {meta && <div className="panel-meta">{meta}</div>}
      </div>
      <div className="panel-body">{children}</div>
      {caption && <div className="panel-caption">{caption}</div>}
    </div>
  );
}

/* ===========================================================
 * Hooks
 * =========================================================== */
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.12, ...options });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

function useInterval(cb, ms, deps = []) {
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(cb, ms);
    return () => clearInterval(id);
  }, deps);
}

// rAF-based animation frame ticker (returns elapsed seconds, restarts on deps change)
function useTicker(running = true, deps = []) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf, start = performance.now();
    const loop = (now) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, ...deps]);
  return t;
}

/* ===========================================================
 * RNG (seeded) — reproducible sim data
 * =========================================================== */
function mulberry32(seed) {
  let a = seed;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// Box-Muller for normal random (mean 0, sd 1)
function randn(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ===========================================================
 * Math helpers
 * =========================================================== */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// Normal CDF approximation (for z-scores, p-values)
function normCdf(z) {
  // Zelen & Severo approximation
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}
// Inverse normal CDF (approx) — for critical values
function normInv(p) {
  // Beasley-Springer-Moro
  if (p < 0.5) return -normInv(1 - p);
  const c = [2.515517, 0.802853, 0.010328];
  const d = [1.432788, 0.189269, 0.001308];
  const t = Math.sqrt(-2 * Math.log(1 - p));
  return t - (c[0] + c[1]*t + c[2]*t*t) / (1 + d[0]*t + d[1]*t*t + d[2]*t*t*t);
}

/* ===========================================================
 * Cinematic motion primitives
 * =========================================================== */
// Draw an animated path: dashoffset from full → 0 over `dur`
function AnimPath({ d, stroke = 'currentColor', width = 2, dur = 1.2, delay = 0, fill = 'none', opacity = 1 }) {
  const ref = useRef(null);
  const [len, setLen] = useState(0);
  useEffect(() => { if (ref.current) setLen(ref.current.getTotalLength()); }, [d]);
  return (
    <path ref={ref} d={d} stroke={stroke} strokeWidth={width} fill={fill}
          strokeDasharray={len} strokeDashoffset={len} opacity={opacity}
          style={{ animation: `drawPath ${dur}s ${delay}s cubic-bezier(.6,.05,.2,1) forwards` }} />
  );
}

Object.assign(window, {
  Hero, SectionLabel, AntiPatterns, BestPractices, Takeaway, Panel,
  useInView, useInterval, useTicker,
  mulberry32, randn, clamp, lerp, round, normCdf, normInv,
  AnimPath,
});
