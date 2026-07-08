/* ============================================================================
   forecast-lab.js ;  interactive forecasting engine for the course
   Vanilla JS. Defines custom elements <fc-*> used inside deck-stage slides.
   No build step, no deps. Styling injected once; canvas charts dpr-aware.
   Palette = warm "Overview" tokens by default. A deck can re-theme the canvas
   colors by setting window.FL_PALETTE = {…} BEFORE this script loads, and the
   widget UI chrome by overriding the .fl-* classes in its own <style>.
   ============================================================================ */
(function () {
  if (window.__FL_LOADED__) return;
  window.__FL_LOADED__ = true;

  /* ---- palette ---------------------------------------------------------- */
  const C = {
    ink: '#16140E', sub: '#6B675D', faint: '#A8A294',
    grid: 'rgba(20,18,12,0.07)', divider: 'rgba(20,18,12,0.16)', line: 'rgba(20,18,12,0.30)',
    white: '#F4F0E7', canvas: '#E8E3D7', soft: '#E8E3D7',
    blue: '#F23005', blueDk: '#F23005', blueLt: 'rgba(242,48,5,0.14)', blue20: '#F23005',
    orange: '#2342D6', orangeDk: '#2342D6', orangeLt: 'rgba(255,138,61,0.16)',
    red: '#FF4D2E', redDk: '#FF4D2E', redLt: 'rgba(255,77,46,0.16)',
    teal: '#0E8A5E', tealLt: 'rgba(61,224,192,0.16)'
  };
  Object.assign(C, window.FL_PALETTE || {});

  /* ---- inject widget UI stylesheet once --------------------------------- */
  const css = `
  .fl-root{font-family:'Space Grotesk',Inter,sans-serif;color:#16140E;width:100%;}
  .fl-card{background:#F4F0E7;border:1.5px solid rgba(20,18,12,.20);border-radius:4px;box-shadow:none;overflow:hidden;}
  .fl-chartwrap{position:relative;width:100%;}
  .fl-chartwrap canvas{display:block;width:100%;height:100%;touch-action:none;}
  .fl-chartwrap canvas:focus-visible{outline:3px solid #F23005;outline-offset:4px;}
  .fl-overlay{position:absolute;pointer-events:none;font-weight:600;}
  .fl-controls{display:flex;flex-wrap:wrap;align-items:center;gap:22px 30px;padding:26px 28px;border-top:1.5px solid rgba(20,18,12,.16);}
  .fl-ctl{display:flex;flex-direction:column;gap:9px;min-width:172px;}
  .fl-ctl-label{font-family:'Space Mono',monospace;font-size:18px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#16140E;display:flex;justify-content:space-between;gap:14px;align-items:baseline;}
  .fl-ctl-val{font-family:'Space Mono',monospace;font-variant-numeric:tabular-nums;color:#F23005;font-weight:700;font-size:25px;}
  input[type=range].fl-range{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:0;background:rgba(20,18,12,.24);outline:none;cursor:pointer;}
  input[type=range].fl-range:focus-visible{outline:3px solid #F23005;outline-offset:5px;}
  input[type=range].fl-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:30px;border-radius:1px;background:#F23005;border:0;cursor:grab;}
  .fl-seg{display:inline-flex;background:#E8E3D7;border:1.5px solid rgba(20,18,12,.20);border-radius:3px;padding:4px;gap:4px;}
  .fl-seg button{appearance:none;border:0;background:transparent;font-family:'Space Mono',monospace;font-weight:700;font-size:18px;letter-spacing:.4px;text-transform:uppercase;color:#55514A;padding:13px 22px;border-radius:2px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s;}
  .fl-seg button[aria-pressed=true]{background:#F23005;color:#0C0C0D;}
  .fl-chip{appearance:none;border:1.5px solid rgba(20,18,12,.28);background:transparent;font-family:'Space Mono',monospace;font-weight:700;font-size:18px;letter-spacing:.4px;text-transform:uppercase;color:#16140E;padding:14px 18px;border-radius:3px;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:background .15s,border-color .15s,color .15s;}
  .fl-chip[aria-pressed=true]{background:rgba(242,48,5,.14);border-color:#F23005;color:#F23005;}
  .fl-chip .dot{width:10px;height:10px;border-radius:0;background:#A8A294;flex:none;}
  .fl-chip[aria-pressed=true] .dot{background:var(--chipdot,#F23005);}
  .fl-btn{appearance:none;border:0;background:#F23005;color:#0C0C0D;font-family:'Space Mono',monospace;font-weight:700;font-size:20px;letter-spacing:1px;text-transform:uppercase;padding:17px 32px;border-radius:3px;cursor:pointer;transition:transform .05s,filter .15s;}
  .fl-btn:hover{filter:brightness(1.08);} .fl-btn:active{transform:scale(.97);}
  .fl-btn.ghost{background:transparent;color:#16140E;border:2px solid rgba(20,18,12,.38);}
  .fl-btn.ghost:hover{border-color:#16140E;}
  .fl-metrics{display:flex;gap:12px;flex-wrap:wrap;align-items:center;}
  .fl-metric{background:#E8E3D7;border:1.5px solid rgba(20,18,12,.14);border-radius:3px;padding:14px 20px;min-width:118px;}
  .fl-metric .k{font-family:'Space Mono',monospace;font-size:16px;font-weight:700;color:#55514A;letter-spacing:.6px;text-transform:uppercase;}
  .fl-metric .v{font-size:39px;font-weight:700;color:#16140E;font-variant-numeric:tabular-nums;line-height:1.15;}
  .fl-note{font-size:22px;line-height:1.5;color:#55514A;max-width:none;}
  .fl-note b{color:#16140E;font-weight:700;}
  .fl-tag{display:inline-flex;align-items:center;gap:8px;font-family:'Space Mono',monospace;font-size:17px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;padding:11px 16px;border-radius:3px;}
  .fl-coach{display:flex;align-items:center;gap:13px;font-size:21px;font-weight:500;color:#55514A;background:#E8E3D7;border:1.5px solid rgba(20,18,12,.16);border-left:4px solid #A8A294;border-radius:3px;padding:15px 20px;flex:1 1 360px;min-width:320px;transition:background .2s,border-color .2s,color .2s;}
  .fl-coach .ic{width:26px;height:26px;border-radius:0;flex:none;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#0C0C0D;background:#A8A294;}
  .fl-coach.good{border-left-color:#0E8A5E;color:#16140E;}
  .fl-coach.good .ic{background:#0E8A5E;}
  .fl-coach.hint{border-left-color:#F23005;color:#16140E;}
  .fl-coach.hint .ic{background:#F23005;}
  .fl-coach.warn{border-left-color:#FF4D2E;color:#16140E;}
  .fl-coach.warn .ic{background:#FF4D2E;color:#fff;}
  @keyframes flPop{0%{transform:scale(.99)}55%{transform:scale(1.008)}100%{transform:scale(1)}}
  .fl-meterwrap{display:flex;flex-direction:column;gap:8px;flex:1 1 240px;min-width:200px;}
  .fl-meter{height:8px;border-radius:0;background:rgba(20,18,12,.18);overflow:hidden;}
  .fl-meter > i{display:block;height:100%;border-radius:0;background:#F23005;transition:width .3s cubic-bezier(.2,.7,.2,1),background .3s;}
  .fl-stars{display:inline-flex;gap:3px;font-size:26px;line-height:1;}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---- math helpers ----------------------------------------------------- */
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const sum = a => a.reduce((s, v) => s + v, 0);
  function std(a) { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); }
  function mulberry32(seed) { let t = seed >>> 0; return function () { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(rng) { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  // ridge regression: X (m x p, includes intercept col), y (m). returns beta (p)
  function ridge(X, y, lam) {
    const m = X.length, p = X[0].length;
    const A = Array.from({ length: p }, () => new Array(p).fill(0));
    const b = new Array(p).fill(0);
    for (let i = 0; i < m; i++) for (let j = 0; j < p; j++) { b[j] += X[i][j] * y[i]; for (let k = 0; k < p; k++) A[j][k] += X[i][j] * X[i][k]; }
    for (let j = 0; j < p; j++) A[j][j] += (j === 0 ? 0 : lam); // don't penalize intercept
    return gaussSolve(A, b);
  }
  function gaussSolve(A, b) {
    const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      const piv = M[c][c] || 1e-9;
      for (let k = c; k <= n; k++) M[c][k] /= piv;
      for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map(r => r[n]);
  }

  /* ---- datasets (seeded, realistic) ------------------------------------- */
  // Each returns {key,name,unit,y:[...],m(season period),startDow,future(true actual for reveal),
  //   comp:{trend,season,noise} (true components for decompose), n}
  const DATASETS = {};

  function buildRetail() {
    const rng = mulberry32(7); const n = 140, H = 28; const m = 7; const tot = n + H;
    const trend = [], season = [], noise = [], y = [];
    for (let t = 0; t < tot; t++) {
      const tr = 420 + 1.7 * t + 0.004 * t * t;            // growing store
      const dow = (t + 6) % 7;                              // 0=Mon ... weekend peak
      const wk = [-55, -40, -25, -5, 35, 95, 70][dow];     // Sat/Sun high
      // Black Friday style spike around t=120
      const promo = Math.exp(-((t - 120) ** 2) / 12) * 260 + Math.exp(-((t - 47) ** 2) / 8) * 120;
      const ns = gauss(rng) * 26;
      trend.push(tr); season.push(wk + promo); noise.push(ns);
      y.push(Math.max(60, tr + wk + promo + ns));
    }
    return { key: 'retail', name: 'Online store: daily orders', unit: 'orders', m, startDow: 0, n, H,
      y: y.slice(0, n), future: y, comp: { trend, season, noise } };
  }
  function buildEnergy() {
    const rng = mulberry32(21); const n = 150, H = 30; const m = 7; const tot = n + H;
    const trend = [], season = [], noise = [], y = [];
    for (let t = 0; t < tot; t++) {
      const tr = 1300 + 0.4 * t;
      const yearly = 280 * Math.cos(2 * Math.PI * (t - 10) / 182);   // winter & summer peaks (semiannual-ish)
      const dow = (t + 2) % 7; const wk = dow >= 5 ? -120 : 30;       // weekday demand higher
      const ns = gauss(rng) * 34;
      trend.push(tr); season.push(yearly + wk); noise.push(ns);
      y.push(tr + yearly + wk + ns);
    }
    return { key: 'energy', name: 'City grid: daily electricity load', unit: 'MWh', m, startDow: 5, n, H,
      y: y.slice(0, n), future: y, comp: { trend, season, noise } };
  }
  function buildTraffic() {
    const rng = mulberry32(99); const n = 132, H = 28; const m = 7; const tot = n + H;
    const trend = [], season = [], noise = [], y = [];
    for (let t = 0; t < tot; t++) {
      const tr = 900 + 4.2 * t;
      const dow = (t) % 7; const wk = [40, 30, 25, 20, 10, -70, -85][dow];  // weekday traffic
      // a viral spike at t=96 that decays; the kind of thing models can't foresee
      const viral = t >= 96 ? 1700 * Math.exp(-(t - 96) / 9) : 0;
      const ns = gauss(rng) * 40;
      trend.push(tr); season.push(wk); noise.push(ns + viral);
      y.push(Math.max(120, tr + wk + ns + viral));
    }
    return { key: 'traffic', name: 'App: daily active users', unit: 'DAU', m, startDow: 1, n, H,
      y: y.slice(0, n), future: y, comp: { trend, season, noise }, viralAt: 96 };
  }
  // ---- canonical SKU (real data) --------------------------------------
  // The single running example threaded through every technical widget:
  // course/data/demand-weekly.csv, 104 weekly points (2024-01-01 .. 2025-12-22).
  // Authored, deterministic variants (no RNG) drive the leakage, stockout and
  // monitoring-shock artifacts so the same SKU tells one continuous story.
  function buildCanon() {
    const y = [
      375, 377, 383, 418, 398, 362, 436, 429, 446, 473, 494, 544, 545,
      545, 534, 543, 604, 657, 630, 640, 675, 619, 669, 704, 724, 691,
      714, 711, 727, 659, 711, 633, 587, 645, 623, 671, 650, 571, 626,
      548, 564, 542, 541, 552, 628, 606, 606, 591, 547, 538, 543, 575,
      550, 545, 443, 440, 512, 544, 525, 550, 585, 549, 521, 569, 638,
      575, 644, 669, 668, 720, 731, 805, 761, 731, 743, 743, 810, 763,
      782, 811, 759, 771, 713, 731, 740, 763, 778, 724, 719, 702, 718,
      696, 660, 601, 651, 620, 731, 676, 733, 646, 705, 650, 625, 602
    ];
    const n = y.length, m = 52;                 // weekly series, annual seasonality
    // +promo: a known-future promo calendar (usable as a leading regressor)
    const PROMO_WEEKS = [46, 98], PROMO_LIFT = 160;
    const promoFlag = y.map((_, i) => PROMO_WEEKS.includes(i) ? 1 : 0);
    const yPromo = y.map((v, i) => v + (PROMO_WEEKS.includes(i) ? PROMO_LIFT : 0));
    // +stockout: sales are censored below true demand across a peak-season window
    const STOCK_FROM = 74, STOCK_TO = 78, STOCK_DEPTH = 0.42;
    const stockMid = (STOCK_FROM + STOCK_TO) / 2, stockHalf = (STOCK_TO - STOCK_FROM) / 2 + 1;
    const demand = y.slice();
    const sales = y.map((v, i) => {
      if (i < STOCK_FROM || i > STOCK_TO) return v;
      const depth = STOCK_DEPTH * (1 - Math.abs(i - stockMid) / stockHalf);
      return Math.round(v * (1 - depth));       // observed sales < true demand
    });
    // +week-8-shock: a demand shock 8 weeks into the final production window (wk 88..104)
    const SHOCK_AT = 96, SHOCK_DROP = 0.16;
    const yShock = y.map((v, i) => i >= SHOCK_AT ? Math.round(v * (1 - SHOCK_DROP)) : v);
    return {
      key: 'canon', name: 'Retail SKU: weekly units', unit: 'units',
      m, n, H: 13, start: '2024-01-01', y, future: y.slice(),
      variants: {
        promo: { y: yPromo, flag: promoFlag, weeks: PROMO_WEEKS.slice(), lift: PROMO_LIFT },
        stockout: { demand, sales, window: [STOCK_FROM, STOCK_TO] },
        shock: { y: yShock, at: SHOCK_AT, drop: SHOCK_DROP }
      }
    };
  }
  DATASETS.retail = buildRetail();
  DATASETS.energy = buildEnergy();
  DATASETS.traffic = buildTraffic();
  DATASETS.canon = buildCanon();
  function getDS(key) { return DATASETS[key] || DATASETS.retail; }

  /* ---- models ----------------------------------------------------------- */
  // Each model: f(y, H, opts) -> {fitted:[n] (NaN warmup), fc:[H], name, sigma}
  const M = {};
  function resids(y, fitted) { const e = []; for (let i = 0; i < y.length; i++) if (!isNaN(fitted[i])) e.push(y[i] - fitted[i]); return e; }

  M.naive = (y, H) => {
    const n = y.length, fitted = y.map((_, i) => i ? y[i - 1] : NaN);
    return { fitted, fc: new Array(H).fill(y[n - 1]), sigma: std(resids(y, fitted)) };
  };
  M.snaive = (y, H, o) => {
    const m = o.m, n = y.length, fitted = y.map((v, i) => i >= m ? y[i - m] : NaN);
    const fc = []; for (let h = 0; h < H; h++) fc.push(y[n - m + (h % m)]);
    return { fitted, fc, sigma: std(resids(y, fitted)) };
  };
  M.ma = (y, H, o) => {
    const k = o.k, n = y.length, fitted = y.map((v, i) => { if (i < k) return NaN; let s = 0; for (let j = 1; j <= k; j++) s += y[i - j]; return s / k; });
    let s = 0; for (let j = 0; j < k; j++) s += y[n - 1 - j];
    return { fitted, fc: new Array(H).fill(s / k), sigma: std(resids(y, fitted)) };
  };
  M.ses = (y, H, o) => {
    const a = o.alpha, n = y.length; let l = y[0]; const fitted = [NaN];
    for (let t = 1; t < n; t++) { fitted.push(l); l = a * y[t] + (1 - a) * l; }
    return { fitted, fc: new Array(H).fill(l), sigma: std(resids(y, fitted)) };
  };
  M.holt = (y, H, o) => {
    const a = o.alpha, b = o.beta, n = y.length; let l = y[0], tr = y[1] - y[0]; const fitted = [NaN];
    for (let t = 1; t < n; t++) { fitted.push(l + tr); const pl = l; l = a * y[t] + (1 - a) * (l + tr); tr = b * (l - pl) + (1 - b) * tr; }
    const fc = []; for (let h = 1; h <= H; h++) fc.push(l + h * tr);
    return { fitted, fc, sigma: std(resids(y, fitted)) };
  };
  M.hw = (y, H, o) => {
    const a = o.alpha, b = o.beta, g = o.gamma, m = o.m, n = y.length;
    let l = mean(y.slice(0, m));
    let tr = (mean(y.slice(m, 2 * m)) - mean(y.slice(0, m))) / m;
    const s = []; for (let i = 0; i < m; i++) s.push(y[i] - l);
    const fitted = new Array(n).fill(NaN);
    for (let t = m; t < n; t++) {
      const si = s[t % m]; fitted[t] = l + tr + si;
      const pl = l;
      l = a * (y[t] - si) + (1 - a) * (l + tr);
      tr = b * (l - pl) + (1 - b) * tr;
      s[t % m] = g * (y[t] - l) + (1 - g) * si;
    }
    const fc = []; for (let h = 1; h <= H; h++) fc.push(l + h * tr + s[(n + h - 1) % m]);
    return { fitted, fc, sigma: std(resids(y, fitted)) };
  };
  M.linear = (y, H) => {
    const n = y.length; const t = y.map((_, i) => i); const mt = mean(t), my = mean(y);
    let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (t[i] - mt) * (y[i] - my); den += (t[i] - mt) ** 2; }
    const b = num / den, a = my - b * mt;
    const fitted = t.map(x => a + b * x); const fc = []; for (let h = 0; h < H; h++) fc.push(a + b * (n + h));
    return { fitted, fc, sigma: std(resids(y, fitted)), a, b };
  };
  M.ar = (y, H, o) => {
    const p = o.p || 1, phi = o.phi; const n = y.length;
    // if phi given (single AR(1) demo), use it around the mean; else fit OLS
    if (phi != null) {
      const mu = mean(y); const fitted = y.map((v, i) => i ? mu + phi * (y[i - 1] - mu) : NaN);
      let last = y[n - 1]; const fc = []; for (let h = 0; h < H; h++) { const nx = mu + phi * (last - mu); fc.push(nx); last = nx; }
      return { fitted, fc, sigma: std(resids(y, fitted)) };
    }
    const X = [], Y = []; for (let t = p; t < n; t++) { const row = [1]; for (let j = 1; j <= p; j++) row.push(y[t - j]); X.push(row); Y.push(y[t]); }
    const beta = ridge(X, Y, 1e-3);
    const fitted = new Array(n).fill(NaN);
    for (let t = p; t < n; t++) { let v = beta[0]; for (let j = 1; j <= p; j++) v += beta[j] * y[t - j]; fitted[t] = v; }
    const buf = y.slice(); const fc = [];
    for (let h = 0; h < H; h++) { let v = beta[0]; for (let j = 1; j <= p; j++) v += beta[j] * buf[buf.length - j]; buf.push(v); fc.push(v); }
    return { fitted, fc, sigma: std(resids(y, fitted)), beta };
  };

  // feature-based ML (ridge). feats: set of flags. returns recursive forecast.
  function buildRow(buf, t, dowAt, feats) {
    const row = [1];
    if (feats.trend) row.push(t / 100);
    if (feats.lag1) row.push(buf[t - 1]);
    if (feats.lag7) row.push(buf[t - 7]);
    if (feats.roll7) { let s = 0; for (let j = 1; j <= 7; j++) s += buf[t - j]; row.push(s / 7); }
    if (feats.dow) { const d = dowAt(t); for (let k = 1; k < 7; k++) row.push(d === k ? 1 : 0); }
    if (feats.yearly) { row.push(Math.sin(2 * Math.PI * t / 182)); row.push(Math.cos(2 * Math.PI * t / 182)); }
    return row;
  }
  M.ml = (y, H, o) => {
    const feats = o.feats, dowAt = o.dowAt, n = y.length, start = 7;
    const X = [], Y = [];
    for (let t = start; t < n; t++) { X.push(buildRow(y, t, dowAt, feats)); Y.push(y[t]); }
    if (!X.length || X[0].length === 1) { // no features → mean
      const mu = mean(y); return { fitted: y.map(() => mu), fc: new Array(H).fill(mu), sigma: std(y.map(v => v - mu)) };
    }
    const beta = ridge(X, Y, 2.0);
    const fitted = new Array(n).fill(NaN);
    for (let t = start; t < n; t++) { const r = buildRow(y, t, dowAt, feats); fitted[t] = r.reduce((s, v, i) => s + v * beta[i], 0); }
    const buf = y.slice(); const fc = [];
    for (let h = 0; h < H; h++) { const t = buf.length; const r = buildRow(buf, t, dowAt, feats); const v = r.reduce((s, vv, i) => s + vv * beta[i], 0); buf.push(v); fc.push(v); }
    return { fitted, fc, sigma: std(resids(y, fitted)), beta };
  };

  // gradient boosting on 1-D feature x=t (demonstrates fit→overfit + no extrapolation)
  function gboost(x, y, rounds, lr, xPred) {
    const n = y.length; let F = new Array(n).fill(mean(y)); const stumps = [];
    const cand = []; const xs = x.slice().sort((a, b) => a - b);
    for (let i = 1; i < n; i++) cand.push((xs[i - 1] + xs[i]) / 2);
    for (let r = 0; r < rounds; r++) {
      const res = y.map((v, i) => v - F[i]);
      let best = null, bestSSE = Infinity;
      for (const thr of cand) {
        let ls = 0, lc = 0, rs = 0, rc = 0;
        for (let i = 0; i < n; i++) { if (x[i] <= thr) { ls += res[i]; lc++; } else { rs += res[i]; rc++; } }
        if (!lc || !rc) continue;
        const lm = ls / lc, rm = rs / rc; let sse = 0;
        for (let i = 0; i < n; i++) { const p = x[i] <= thr ? lm : rm; sse += (res[i] - p) ** 2; }
        if (sse < bestSSE) { bestSSE = sse; best = { thr, lm, rm }; }
      }
      if (!best) break;
      stumps.push(best);
      for (let i = 0; i < n; i++) F[i] += lr * (x[i] <= best.thr ? best.lm : best.rm);
    }
    const predict = xx => { let v = mean(y); for (const s of stumps) v += lr * (xx <= s.thr ? s.lm : s.rm); return v; };
    return { fitted: x.map(predict), pred: xPred.map(predict) };
  }

  /* ---- metrics ---------------------------------------------------------- */
  function metrics(actual, pred) {
    let ae = 0, se = 0, ape = 0, k = 0;
    for (let i = 0; i < actual.length; i++) { const e = actual[i] - pred[i]; ae += Math.abs(e); se += e * e; if (actual[i] !== 0) { ape += Math.abs(e / actual[i]); k++; } }
    const n = actual.length;
    return { mae: ae / n, rmse: Math.sqrt(se / n), mape: 100 * ape / (k || 1) };
  }
  function fmt(v) { const a = Math.abs(v); if (a >= 10000) return (v / 1000).toFixed(1) + 'k'; if (a >= 100) return Math.round(v).toLocaleString(); if (a >= 10) return v.toFixed(1); return v.toFixed(2); }

  /* ---- Chart class (canvas) --------------------------------------------- */
  class Chart {
    constructor(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.cfg = {}; }
    setData(cfg) { this.cfg = cfg; this.draw(); }
    resize() {
      const cv = this.cv, dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = cv.clientWidth || 800, h = cv.clientHeight || 400;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.W = w; this.H = h; this.draw();
    }
    draw() {
      const ctx = this.ctx, cfg = this.cfg; if (!this.W) { this.resize(); return; }
      const W = this.W, H = this.H; ctx.clearRect(0, 0, W, H);
      const PL = 66, PR = 22, PT = 22, PB = 42;
      const x0 = PL, x1 = W - PR, y0 = PT, y1 = H - PB;
      const series = cfg.series || [], bands = cfg.bands || [], regions = cfg.regions || [];
      // domain
      let xmin = cfg.xmin, xmax = cfg.xmax;
      if (xmin == null) { xmin = Infinity; xmax = -Infinity; series.forEach(s => s.pts.forEach(p => { xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x); })); }
      let ymin = cfg.ymin, ymax = cfg.ymax;
      if (ymin == null) {
        ymin = Infinity; ymax = -Infinity;
        const scan = v => { if (v != null && isFinite(v)) { ymin = Math.min(ymin, v); ymax = Math.max(ymax, v); } };
        series.forEach(s => s.pts.forEach(p => scan(p.y)));
        bands.forEach(b => b.pts.forEach(p => { scan(p.lo); scan(p.hi); }));
        const pad = (ymax - ymin) * 0.12 || 10; ymin -= pad; ymax += pad;
        if (cfg.y0) ymin = Math.min(ymin, 0);
      }
      const xToPx = x => x0 + (x - xmin) / (xmax - xmin || 1) * (x1 - x0);
      const yToPx = y => y1 - (y - ymin) / (ymax - ymin || 1) * (y1 - y0);
      this.xToPx = xToPx; this.yToPx = yToPx; this.plot = { x0, x1, y0, y1, xmin, xmax, ymin, ymax };

      // region shading
      regions.forEach(r => {
        ctx.fillStyle = r.color; ctx.fillRect(xToPx(r.x0), y0, xToPx(r.x1) - xToPx(r.x0), y1 - y0);
        if (r.label) { ctx.fillStyle = r.labelColor || C.sub; ctx.font = "700 16px 'Space Mono',monospace"; ctx.textAlign = 'start'; ctx.fillText(r.label, xToPx(r.x0) + 10, y0 + 20); }
      });
      // gridlines + y labels
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.fillStyle = C.sub;
      ctx.font = "600 16px 'Space Mono',monospace"; ctx.textAlign = 'end'; ctx.textBaseline = 'middle';
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const yv = ymin + (ymax - ymin) * i / ticks, py = yToPx(yv);
        ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
        ctx.fillText(fmt(yv), x0 - 12, py);
      }
      // x labels
      if (cfg.xlabels) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = C.sub; ctx.font = "600 15px 'Space Mono',monospace";
        cfg.xlabels.forEach(l => { ctx.fillText(l.t, xToPx(l.x), y1 + 13); });
      }
      // entrance / sim clip
      const _clip = this._clipX != null;
      if (_clip) { ctx.save(); ctx.beginPath(); ctx.rect(x0 - 1, y0 - 30, Math.max(0, xToPx(this._clipX) - x0) + 1, (y1 - y0) + 60); ctx.clip(); }
      // bands
      bands.forEach(b => {
        ctx.beginPath();
        b.pts.forEach((p, i) => { const px = xToPx(p.x), py = yToPx(p.hi); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        for (let i = b.pts.length - 1; i >= 0; i--) { const p = b.pts[i]; ctx.lineTo(xToPx(p.x), yToPx(p.lo)); }
        ctx.closePath(); ctx.fillStyle = b.color; ctx.fill();
      });
      // marker
      if (cfg.marker != null) {
        ctx.save(); ctx.strokeStyle = C.faint; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(xToPx(cfg.marker), y0); ctx.lineTo(xToPx(cfg.marker), y1); ctx.stroke();
        ctx.restore();
        if (cfg.markerLabel) { ctx.fillStyle = C.sub; ctx.font = "700 15px 'Space Mono',monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(cfg.markerLabel, xToPx(cfg.marker), y0 + 14); }
      }
      // series
      const clipReveal = cfg.clipX;
      series.forEach(s => {
        if (!s.pts.length) return;
        ctx.save();
        if (s.clipRight != null) { ctx.beginPath(); ctx.rect(x0, y0 - 20, xToPx(s.clipRight) - x0, y1 - y0 + 40); ctx.clip(); }
        ctx.lineWidth = s.width || 2.5; ctx.strokeStyle = s.color; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (s.dash) ctx.setLineDash(s.dash);
        if (s.fillTo != null) {
          ctx.beginPath(); s.pts.forEach((p, i) => { const px = xToPx(p.x), py = yToPx(p.y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
          ctx.lineTo(xToPx(s.pts[s.pts.length - 1].x), yToPx(s.fillTo)); ctx.lineTo(xToPx(s.pts[0].x), yToPx(s.fillTo)); ctx.closePath();
          ctx.fillStyle = s.fill || 'rgba(8,102,255,.08)'; ctx.fill();
        }
        ctx.beginPath();
        let started = false;
        s.pts.forEach(p => { if (p.y == null || isNaN(p.y)) { started = false; return; } const px = xToPx(p.x), py = yToPx(p.y); started ? ctx.lineTo(px, py) : ctx.moveTo(px, py); started = true; });
        ctx.stroke(); ctx.setLineDash([]);
        if (s.dots) s.pts.forEach(p => { if (p.y == null || isNaN(p.y)) return; ctx.beginPath(); ctx.arc(xToPx(p.x), yToPx(p.y), s.dotR || 3, 0, 7); ctx.fillStyle = s.dotColor || s.color; ctx.fill(); });
        if (s.lastDot) { const p = s.pts[s.pts.length - 1]; ctx.beginPath(); ctx.arc(xToPx(p.x), yToPx(p.y), 5, 0, 7); ctx.fillStyle = s.color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.restore();
      });
      // custom overlay hook
      if (cfg.after) cfg.after(ctx, { xToPx, yToPx, x0, x1, y0, y1 });
      if (_clip) ctx.restore();
    }
    animateIn(dur) {
      if (!this.plot) { this.draw(); if (!this.plot) return; }
      if (reducedMotion()) { this._clipX = null; this.draw(); return; }
      const x0d = this.plot.xmin, x1d = this.plot.xmax, t0 = performance.now(); dur = dur || 750;
      const ease = t => 1 - Math.pow(1 - t, 3);
      const step = () => { const e = clamp((performance.now() - t0) / dur, 0, 1); this._clipX = x0d + ease(e) * (x1d - x0d); this.draw(); if (e < 1) requestAnimationFrame(step); else { this._clipX = null; this.draw(); } };
      requestAnimationFrame(step);
    }
    pxToData(clientX) { const r = this.cv.getBoundingClientRect(); const px = (clientX - r.left) / r.width * this.W; const p = this.plot; return p.xmin + (px - p.x0) / (p.x1 - p.x0) * (p.xmax - p.xmin); }
    pxToY(clientY) { const r = this.cv.getBoundingClientRect(); const py = (clientY - r.top) / r.height * this.H; const p = this.plot; return p.ymin + (p.y1 - py) / (p.y1 - p.y0) * (p.ymax - p.ymin); }
  }

  /* ---- reveal draw-on (per-series clipRight sweep, today → right) -------- */
  // Ramps a clip edge from the "today" hairline rightward; onFrame(x) receives the
  // current data-x edge (and null on settle) so a widget can apply it as clipRight
  // on ONLY its revealed series. Same ease as animateIn. Stored on the chart so the
  // FLBase._stopAnim hook can cancel it on slidechange.
  function animateReveal(chart, onFrame) {
    if (chart._revealCancel) chart._revealCancel(); // stop any in-flight sweep (no settle; caller is restarting)
    if (reducedMotion()) { onFrame(null); return; }
    if (!chart.plot) { chart.draw(); if (!chart.plot) { onFrame(null); return; } }
    const start = chart.cfg && chart.cfg.marker != null ? chart.cfg.marker : chart.plot.xmin;
    const end = chart.plot.xmax, t0 = performance.now(), dur = 550;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const clear = () => { if (chart._revealRAF) { cancelAnimationFrame(chart._revealRAF); chart._revealRAF = null; } chart._revealCancel = null; chart._revealStop = null; };
    chart._revealCancel = clear;                    // cancel only (rapid re-reveal)
    chart._revealStop = () => { clear(); onFrame(null); }; // cancel + jump to settled (slidechange)
    const step = () => { const e = clamp((performance.now() - t0) / dur, 0, 1); onFrame(start + ease(e) * (end - start)); if (e < 1) chart._revealRAF = requestAnimationFrame(step); else { clear(); onFrame(null); } };
    chart._revealRAF = requestAnimationFrame(step);
  }

  /* ---- UI builders ------------------------------------------------------ */
  function elt(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function slider(label, min, max, step, val, fmtFn, on) {
    const ctl = elt('div', 'fl-ctl');
    const lab = elt('div', 'fl-ctl-label'); const name = elt('span', null, label); const v = elt('span', 'fl-ctl-val', fmtFn(val));
    lab.append(name, v);
    const inp = document.createElement('input'); inp.type = 'range'; inp.className = 'fl-range';
    inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    const cleanLabel = String(label).replace(/\s+/g, ' ').trim();
    inp.name = cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'slider';
    inp.setAttribute('aria-label', cleanLabel);
    inp.setAttribute('aria-valuetext', fmtFn(+inp.value));
    inp.addEventListener('input', () => {
      const txt = fmtFn(+inp.value);
      v.textContent = txt;
      inp.setAttribute('aria-valuetext', txt);
      on(+inp.value);
    });
    ctl.append(lab, inp); ctl._set = x => { const txt = fmtFn(+x); inp.value = x; v.textContent = txt; inp.setAttribute('aria-valuetext', txt); }; ctl._input = inp;
    return ctl;
  }
  function segmented(opts, val, on) {
    const wrap = elt('div', 'fl-seg');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Forecast option');
    opts.forEach(o => { const b = elt('button', null, o.label); b.type = 'button'; b.setAttribute('aria-pressed', o.value === val); b.onclick = () => { wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); on(o.value); }; b.dataset.v = o.value; wrap.append(b); });
    wrap._set = vv => wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === vv));
    return wrap;
  }
  function chip(label, color, pressed, on) {
    const b = elt('button', 'fl-chip', `<span class="dot"></span>${label}`); b.type = 'button'; b.style.setProperty('--chipdot', color);
    b.setAttribute('aria-pressed', !!pressed); b.onclick = () => { const np = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', np); on(np); };
    return b;
  }
  function metricCard(k, v) { const c = elt('div', 'fl-metric'); c.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div>`; c._v = c.querySelector('.v'); return c; }

  /* ---- base element: active-aware ------------------------------------- */
  const REG = new Set();
  document.addEventListener('slidechange', () => { REG.forEach(w => w._activeCheck && w._activeCheck()); });
  class FLBase extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = true; REG.add(this);
      this.classList.add('fl-root');
      this.build();
      if (this.s && this.s.root && !this.s.root.parentNode) this.append(this.s.root);
      requestAnimationFrame(() => { this._sizeAll(); this._activeCheck(); });
      setTimeout(() => { this._sizeAll(); this._activeCheck(); }, 80);
      this._ro = new ResizeObserver(() => this._sizeAll()); this._ro.observe(this);
      window.addEventListener('resize', this._rs = () => this._sizeAll());
    }
    disconnectedCallback() { REG.delete(this); this._ro && this._ro.disconnect(); window.removeEventListener('resize', this._rs); this._stopAnim && this._stopAnim(); }
    _sizeAll() { (this._charts || []).forEach(c => c.resize()); if (this._afterSize) this._afterSize(); }
    get isActive() { const s = this.closest('[data-deck-active]'); return !!s || !this.closest('section'); }
    _activeCheck() { const a = this.isActive; if (a === this._wasActive) return; this._wasActive = a; this.onActive && this.onActive(a); }
    onActive(a) { if (a) { if (!this._playedIn) { this._playedIn = true; (this._charts || []).forEach(c => c.animateIn && c.animateIn(780)); } } else if (this._stopAnim) this._stopAnim(); }
    _stopAnim() { (this._charts || []).forEach(c => c._revealStop && c._revealStop()); }
    build() { }
  }

  /* ====================================================================== */
  /* WIDGETS                                                                */
  /* ====================================================================== */
  window.FL = {
    DATASETS, M, Chart, metrics, C, getDS, fmt, clamp, mean, std, gauss, mulberry32, gboost,
    slider, segmented, chip, metricCard, elt, FLBase, animateReveal, reducedMotion
  };
  // widget definitions live in forecast-lab.widgets.js (loaded after this)
})();
