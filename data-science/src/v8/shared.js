const { useState, useEffect, useRef, useMemo, useCallback } = React;
function Hero({ eyebrow, title, hook, meta }) {
  return /* @__PURE__ */ React.createElement("header", { className: "hero" }, /* @__PURE__ */ React.createElement("div", { className: "hero-eyebrow" }, eyebrow), /* @__PURE__ */ React.createElement("h1", { className: "hero-title", dangerouslySetInnerHTML: { __html: title } }), /* @__PURE__ */ React.createElement("p", { className: "hero-hook", dangerouslySetInnerHTML: { __html: hook } }), meta && /* @__PURE__ */ React.createElement("div", { className: "hero-meta" }, meta.map((m, i) => /* @__PURE__ */ React.createElement("div", { className: "m", key: i, style: { animationDelay: `${0.3 + i * 0.08}s` } }, /* @__PURE__ */ React.createElement("div", { className: "k" }, m.k), /* @__PURE__ */ React.createElement("div", { className: "v", dangerouslySetInnerHTML: { __html: m.v } })))));
}
function SectionLabel({ n, children }) {
  return /* @__PURE__ */ React.createElement("div", { className: "section-label" }, /* @__PURE__ */ React.createElement("span", { className: "n" }, n), /* @__PURE__ */ React.createElement("span", { className: "t" }, children));
}
function AntiPatterns({ items, title = "Anti-patterns" }) {
  return /* @__PURE__ */ React.createElement("div", { className: "callout" }, /* @__PURE__ */ React.createElement("div", { className: "callout-head" }, title), /* @__PURE__ */ React.createElement("div", { className: "callout-list" }, items.map((it, i) => /* @__PURE__ */ React.createElement("div", { className: "callout-item", key: i }, /* @__PURE__ */ React.createElement("span", { className: "n" }, String(i + 1).padStart(2, "0")), /* @__PURE__ */ React.createElement("span", { dangerouslySetInnerHTML: { __html: it } })))));
}
function BestPractices({ items, title = "The right way" }) {
  return /* @__PURE__ */ React.createElement("div", { className: "callout mint" }, /* @__PURE__ */ React.createElement("div", { className: "callout-head" }, title), /* @__PURE__ */ React.createElement("div", { className: "callout-list" }, items.map((it, i) => /* @__PURE__ */ React.createElement("div", { className: "callout-item", key: i }, /* @__PURE__ */ React.createElement("span", { className: "n" }, String(i + 1).padStart(2, "0")), /* @__PURE__ */ React.createElement("span", { dangerouslySetInnerHTML: { __html: it } })))));
}
function Takeaway({ items }) {
  return /* @__PURE__ */ React.createElement("div", { className: "takeaway" }, /* @__PURE__ */ React.createElement("div", { className: "takeaway-head" }, "Key takeaways"), /* @__PURE__ */ React.createElement("div", { className: "takeaway-list" }, items.map((it, i) => /* @__PURE__ */ React.createElement("div", { className: "takeaway-item", key: i, dangerouslySetInnerHTML: { __html: it } }))));
}
function Panel({ eyebrow, title, meta, children, caption }) {
  return /* @__PURE__ */ React.createElement("div", { className: "panel" }, /* @__PURE__ */ React.createElement("div", { className: "panel-head" }, /* @__PURE__ */ React.createElement("div", { className: "panel-title" }, /* @__PURE__ */ React.createElement("span", { className: "dot" }), eyebrow && /* @__PURE__ */ React.createElement("span", { className: "lab" }, eyebrow), /* @__PURE__ */ React.createElement("span", { className: "name" }, title)), meta && /* @__PURE__ */ React.createElement("div", { className: "panel-meta" }, meta)), /* @__PURE__ */ React.createElement("div", { className: "panel-body" }, children), caption && /* @__PURE__ */ React.createElement("div", { className: "panel-caption" }, caption));
}
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
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
function useTicker(running = true, deps = []) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf, start = performance.now();
    const loop = (now) => {
      setT((now - start) / 1e3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, ...deps]);
  return t;
}
function mulberry32(seed) {
  let a = seed;
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function randn(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
// Bright-palette → AA-readable ink twin, for using a data-driven accent color
// as TEXT on the light paper. Keep the bright original for SVG fills/dots/borders.
const INK_MAP = {
  "#FF6B80": "#B53C4D", "#D1FF3A": "#59700D", "#1FAF7E": "#067751", "#E8A031": "#905D0D",
  "#FF4DA2": "#C22671", "#64E2B5": "#297359", "#5B9BE8": "#346AAC", "#A78BFA": "#7159B6",
  "#FF9F6B": "#995733", "#9A6BFF": "#7749DB", "#4DE2FF": "#1A7182", "#1CA5D9": "#00709A",
  "#6BCF3F": "#347618", "#FB923C": "#A15314", "#F87171": "#B34343", "#F25F3A": "#BD3918",
  "#4ADE80": "#1C783E", "#2DD4BF": "#0B7567", "#FFC266": "#856029", "#FF8080": "#AB4949",
  "#F4C542": "#816515", "#FFA94D": "#945B1D", "#FFA500": "#915E00", "#FF6B6B": "#B83D3D",
  "#FBBF24": "#886202", "#F59E0B": "#935C00", "#EF4444": "#C92424", "#B89DFF": "#715CA6",
  "#7B8CDE": "#5464AD", "#80CC80": "#427442", "#8080CC": "#6161A9", "#E8318F": "#C8136F",
  "#D83A3A": "#CB2020", "#5B3EE8": "#4A2FCC",
  // muted grays that were authored light for a dark theme — map to readable ink
  "#8A8680": "#5C5650", "#C7C4BC": "#5C5650", "#F4F2EC": "#3A3540", "#A49D9A": "#6E6763",
  "#D1D5DB": "#5C5650", "#F1F5F9": "#3A3540", "#E0E0E0": "#5C5650"
};
const inkOf = (c) => (c && INK_MAP[String(c).toUpperCase()]) || c;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
function normCdf(z) {
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}
function normInv(p) {
  if (p < 0.5) return -normInv(1 - p);
  const c = [2.515517, 0.802853, 0.010328];
  const d = [1.432788, 0.189269, 1308e-6];
  const t = Math.sqrt(-2 * Math.log(1 - p));
  return t - (c[0] + c[1] * t + c[2] * t * t) / (1 + d[0] * t + d[1] * t * t + d[2] * t * t * t);
}
function AnimPath({ d, stroke = "currentColor", width = 2, dur = 1.2, delay = 0, fill = "none", opacity = 1 }) {
  const ref = useRef(null);
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (ref.current) setLen(ref.current.getTotalLength());
  }, [d]);
  return /* @__PURE__ */ React.createElement(
    "path",
    {
      ref,
      d,
      stroke,
      strokeWidth: width,
      fill,
      strokeDasharray: len,
      strokeDashoffset: len,
      opacity,
      style: { animation: `drawPath ${dur}s ${delay}s cubic-bezier(.6,.05,.2,1) forwards` }
    }
  );
}
Object.assign(window, {
  Hero,
  SectionLabel,
  AntiPatterns,
  BestPractices,
  Takeaway,
  Panel,
  useInView,
  useInterval,
  useTicker,
  mulberry32,
  randn,
  inkOf,
  clamp,
  lerp,
  round,
  normCdf,
  normInv,
  AnimPath
});
