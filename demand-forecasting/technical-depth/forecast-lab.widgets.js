/* ============================================================================
   forecast-lab.widgets.js; the <fc-*> custom elements. Loads after forecast-lab.js
   ============================================================================ */
(function () {
  const FL = window.FL; if (!FL) { console.error('forecast-lab.js must load first'); return; }
  if (window.__FL_WIDGETS__) return; window.__FL_WIDGETS__ = true;
  const { DATASETS, M, Chart, metrics, C, getDS, fmt, clamp, mean, std, gboost, gauss, mulberry32,
    slider, segmented, chip, metricCard, elt, FLBase, animateReveal, reducedMotion } = FL;

  /* ---- shared helpers --------------------------------------------------- */
  function shell(host, heightCss) {
    const root = elt('div'); const card = elt('div', 'fl-card');
    const cw = elt('div', 'fl-chartwrap');
    let hh = host && host.getAttribute && host.getAttribute('h');
    if (hh && /^\d+$/.test(hh)) hh += 'px';
    cw.style.height = hh || heightCss;
    const cv = document.createElement('canvas'); cv.tabIndex = 0;
    const name = host && host.localName ? host.localName.replace(/^fc-/, '').replace(/-/g, ' ') : 'forecast';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', `Interactive ${name} forecast chart`);
    cw.append(cv);
    const controls = elt('div', 'fl-controls');
    card.append(cw, controls); root.append(card);
    if (host && host.append) host.append(root);
    return { root, card, cw, cv, controls, chart: new Chart(cv) };
  }
  function xlabels(n, H, step) { const a = []; for (let x = 0; x <= n + H - 1; x += step) a.push({ x, t: 'day ' + x }); return a; }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  function yRange(arr) { let lo = Infinity, hi = -Infinity; arr.forEach(v => { if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); const p = (hi - lo) * 0.12 || 10; return { ymin: lo - p, ymax: hi + p }; }
  const ACT = { color: C.ink, width: 2.6 };
  const FC = { color: C.blue, width: 4 };
  const FIT = { color: rgba(C.blue, .55), width: 2, dash: [2, 5] };
  const REV = { color: C.ink, width: 2.6 };
  function actualPts(y) { return y.map((v, i) => ({ x: i, y: v })); }
  function fcPts(y, fc) { const n = y.length; return [{ x: n - 1, y: y[n - 1] }].concat(fc.map((v, h) => ({ x: n + h, y: v }))); }
  function revPts(ds) { const n = ds.n; const a = []; for (let i = n - 1; i < ds.future.length; i++) a.push({ x: i, y: ds.future[i] }); return a; }
  function dowAtFor(ds) { return t => (ds.startDow + t) % 7; }
  function invNorm(p) {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= 1 - pl) { q = p - .5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const zFor = conf => invNorm(1 - (1 - conf) / 2);
  function mkCoach(initial) {
    const el0 = elt('div', 'fl-coach'); const ic = elt('span', 'ic'); const tx = elt('span');
    el0.append(ic, tx);
    el0._set = (html, tone, icon) => {
      el0.className = 'fl-coach' + (tone && tone !== 'neutral' ? ' ' + tone : '');
      ic.textContent = icon || (tone === 'good' ? '✓' : tone === 'warn' ? '!' : '›');
      tx.innerHTML = html;
    };
    el0._set(initial || '', 'neutral'); return el0;
  }
  function mkMeter(label) {
    const w = elt('div', 'fl-meterwrap');
    const lab = elt('div'); lab.style.cssText = 'font-size:16px;font-weight:600;color:' + C.sub + ';display:flex;justify-content:space-between;';
    const name = elt('span', null, label); const val = elt('span'); val.style.cssText = 'font-weight:700;color:' + C.blueDk; lab.append(name, val);
    const bar = elt('div', 'fl-meter'); const fill = elt('i'); bar.append(fill);
    w.append(lab, bar);
    w._set = (pct, valText, color) => { fill.style.width = clamp(pct, 0, 100) + '%'; if (color) fill.style.background = color; val.textContent = valText || ''; };
    return w;
  }
  function legend(items) { // items:[{c,label,dash}]
    const w = elt('div'); w.style.cssText = 'display:flex;gap:22px;flex-wrap:wrap;align-items:center;';
    items.forEach(it => { const s = elt('div'); s.style.cssText = 'display:flex;align-items:center;gap:9px;font-size:17px;font-weight:600;color:' + C.sub; s.innerHTML = `<span style="width:22px;height:4px;border-radius:2px;background:${it.dash ? 'transparent' : it.c};${it.dash ? 'border-top:3px dashed ' + it.c : ''};display:inline-block"></span>${it.label}`; w.append(s); });
    return w;
  }

  /* ---- reveal / count-up / star helpers (shared reveal-moment motion) --- */
  // Kick off the draw-on sweep: clip the revealed series at "today", render, then
  // ramp the clip rightward. render() applies w._revealClip as clipRight on its
  // revealed series only (history + forecast stay static). null => fully drawn.
  function playReveal(w) {
    w._revealClip = w.ds.n - 1;
    w.render();
    animateReveal(w.s.chart, x => { w._revealClip = x; w.render(); });
  }
  function countUp(el, to, dur, fmtFn) {
    if (reducedMotion()) { el.textContent = fmtFn(to); return; }
    const t0 = performance.now(), ease = t => 1 - Math.pow(1 - t, 3);
    el.textContent = fmtFn(0);
    const step = () => { const e = clamp((performance.now() - t0) / dur, 0, 1); el.textContent = fmtFn(to * ease(e)); if (e < 1) requestAnimationFrame(step); else el.textContent = fmtFn(to); };
    requestAnimationFrame(step);
  }
  function makeStars(n) {
    const wrap = elt('div', 'fl-stars');
    for (let i = 0; i < 5; i++) { const s = elt('span', null, '★'); s.style.color = i < n ? C.orange : C.divider; s.style.display = 'inline-block'; wrap.append(s); }
    return wrap;
  }
  function staggerStars(wrap, ms) {
    const stars = wrap.querySelectorAll('span'), reduce = reducedMotion();
    stars.forEach((s, i) => {
      if (reduce) { s.style.opacity = '1'; s.style.transform = 'none'; return; }
      s.style.opacity = '0'; s.style.transform = 'scale(.4)';
      s.style.transition = 'opacity .2s cubic-bezier(0.23,1,0.32,1), transform .3s cubic-bezier(0.23,1,0.32,1)';
      setTimeout(() => { s.style.opacity = '1'; s.style.transform = 'scale(1)'; }, 80 + i * ms);
    });
  }

  /* ====================================================================== */
  /* 1 · fc-guess; draw your forecast, then reveal                          */
  /* ====================================================================== */
  class Guess extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'retail');
      const s = shell(this, 'clamp(300px,42vh,520px)'); this.s = s; this._charts = [s.chart];
      this.guess = new Array(ds.H).fill(null); this.revealed = false; this.lastIdx = null;
      const r = yRange(ds.future); this.yr = r;
      const hint = elt('div'); hint.style.cssText = 'font-size:19px;font-weight:600;color:' + C.blue + ';display:flex;align-items:center;gap:8px;';
      hint.innerHTML = 'Drag across the shaded zone to sketch the next 28 days';
      this.hint = hint;
      const revBtn = elt('button', 'fl-btn', 'Reveal what happened'); revBtn.onclick = () => this.reveal();
      const reset = elt('button', 'fl-btn ghost', 'Clear'); reset.onclick = () => { this.guess.fill(null); this.lastIdx = null; this.revealed = false; revBtn.style.display = ''; this.score.style.display = 'none'; this.hint.style.display = ''; this.render(); };
      this.revBtn = revBtn;
      const score = elt('div'); score.className = 'fl-metrics'; score.style.display = 'none'; this.score = score;
      s.controls.append(hint, revBtn, reset, score);
      // pointer drawing
      const cv = s.cv;
      const draw = e => {
        if (this.revealed) return;
        const x = s.chart.pxToData(e.clientX), y = clamp(s.chart.pxToY(e.clientY), this.yr.ymin, this.yr.ymax);
        let idx = Math.round(x) - ds.n;
        idx = clamp(idx, 0, ds.H - 1);
        if (this.lastIdx == null) this.lastIdx = idx;
        const a = Math.min(this.lastIdx, idx), b = Math.max(this.lastIdx, idx);
        const ya = this.guess[this.lastIdx] != null ? this.guess[this.lastIdx] : y;
        for (let i = a; i <= b; i++) { const f = b === a ? 1 : (i - a) / (b - a); this.guess[i] = this.lastIdx <= idx ? ya + (y - ya) * f : y + (ya - y) * f; }
        this.guess[idx] = y; this.lastIdx = idx; this.hint.style.display = 'none'; this.render();
      };
      let down = false;
      cv.addEventListener('pointerdown', e => { down = true; this.lastIdx = null; cv.setPointerCapture(e.pointerId); draw(e); });
      cv.addEventListener('pointermove', e => { if (down) draw(e); });
      cv.addEventListener('pointerup', () => { down = false; this.lastIdx = null; });
      this.render();
    }
    reveal() {
      const ds = this.ds; this.revealed = true; this.revBtn.style.display = 'none'; this.hint.style.display = 'none';
      const hw = M.hw(ds.y, ds.H, { alpha: .35, beta: .04, gamma: .3, m: ds.m });
      const trueFut = []; for (let h = 0; h < ds.H; h++) trueFut.push(ds.future[ds.n + h]);
      const set = this.guess.map((g, i) => g == null ? null : i).filter(i => i != null);
      let you = NaN;
      if (set.length) { const a = set.map(i => trueFut[i]), p = set.map(i => this.guess[i]); you = metrics(a, p).mae; }
      const mod = metrics(trueFut, hw.fc).mae;
      this.score.innerHTML = '';
      const youCard = metricCard('Your error (MAE)', isFinite(you) ? fmt(you) : ' - ');
      const modCard = metricCard('Holt-Winters MAE', fmt(mod));
      this.score.append(youCard, modCard);
      if (isFinite(you)) countUp(youCard._v, you, 500, fmt);
      countUp(modCard._v, mod, 500, fmt);
      if (!isFinite(you)) {
        const verdict = elt('div', 'fl-tag'); verdict.style.cssText += 'background:' + C.canvas + ';color:' + C.sub; verdict.textContent = 'Sketch a line first, then reveal'; this.score.append(verdict);
      } else {
        const ratio = you / mod; let n, msg, tone;
        if (ratio <= 0.9) { n = 5; msg = 'You beat Holt-Winters.'; tone = C.teal; }
        else if (ratio <= 1.12) { n = 4; msg = 'A dead heat with the model; great eye.'; tone = C.teal; }
        else if (ratio <= 1.5) { n = 3; msg = 'Solid guess. The model just edged ahead.'; tone = C.blueDk; }
        else if (ratio <= 2.2) { n = 2; msg = 'Not bad; the model read the rhythm better.'; tone = C.blueDk; }
        else { n = 1; msg = 'Tricky, isn’t it? That’s exactly why we build models.'; tone = C.orangeDk; }
        const box = elt('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:7px;';
        const stars = makeStars(n);
        const v = elt('div'); v.style.cssText = 'font-size:18px;font-weight:700;color:' + tone; v.textContent = msg;
        box.append(stars, v); this.score.append(box); staggerStars(stars, 65);
      }
      this.score.style.display = 'flex'; playReveal(this);
    }
    render() {
      const ds = this.ds, s = this.s;
      const series = [{ pts: actualPts(ds.y), ...ACT, lastDot: true }];
      const gp = []; const last = ds.y[ds.n - 1];
      gp.push({ x: ds.n - 1, y: last });
      this.guess.forEach((g, i) => { if (g != null) gp.push({ x: ds.n + i, y: g }); });
      if (gp.length > 1) series.push({ pts: gp, color: C.blue, width: 4, dots: true, dotR: 3 });
      if (this.revealed) {
        series.push({ pts: revPts(ds), color: C.ink, width: 2.6, clipRight: this._revealClip });
        const hw = M.hw(ds.y, ds.H, { alpha: .35, beta: .04, gamma: .3, m: ds.m });
        series.push({ pts: fcPts(ds.y, hw.fc), color: C.orange, width: 3, dash: [7, 5], clipRight: this._revealClip });
      }
      s.chart.setData({
        xmin: 0, xmax: ds.n + ds.H - 1, ...this.yr, series,
        marker: ds.n - 1, markerLabel: 'today',
        regions: [{ x0: ds.n - 1, x1: ds.n + ds.H - 1, color: rgba(C.blue, .05) }],
        xlabels: xlabels(ds.n, ds.H, 28)
      });
    }
  }
  customElements.define('fc-guess', Guess);

  /* ====================================================================== */
  /* 2 · fc-decompose; trend + seasonality + noise                          */
  /* ====================================================================== */
  class Decompose extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'retail');
      const s = shell(this, 'clamp(300px,42vh,520px)'); this.s = s; this._charts = [s.chart];
      this.on = { trend: true, season: true, noise: true, pieces: false };
      const mk = (k, label, color) => chip(label, color, this.on[k], v => { this.on[k] = v; this.render(); });
      this.s.controls.append(
        mk('trend', 'Trend', C.blue), mk('season', 'Seasonality', C.teal), mk('noise', 'Noise', C.faint),
        (() => { const c = chip('Show the pieces', C.orange, false, v => { this.on.pieces = v; this.render(); }); return c; })()
      );
      const cap = elt('div', 'fl-note'); cap.style.flex = '1 1 280px';
      cap.innerHTML = '<b>Demand = trend + seasonality + noise.</b> Toggle the ingredients to see how a real series is built, and what a model must untangle.';
      this.s.controls.append(cap);
      this.render();
    }
    render() {
      const ds = this.ds, c = ds.comp, on = this.on, N = ds.n;
      const compose = i => (on.trend ? c.trend[i] : 0) + (on.season ? c.season[i] : 0) + (on.noise ? c.noise[i] : 0);
      const baseMean = mean(c.trend.slice(0, N));
      const sumPts = []; for (let i = 0; i < N; i++) sumPts.push({ x: i, y: compose(i) });
      const series = [];
      const allVals = sumPts.map(p => p.y);
      if (on.pieces) {
        if (on.trend) series.push({ pts: c.trend.slice(0, N).map((v, i) => ({ x: i, y: v })), color: C.blue, width: 2.4 });
        if (on.season) { const sp = c.season.slice(0, N).map((v, i) => ({ x: i, y: v + baseMean })); series.push({ pts: sp, color: C.teal, width: 2 }); sp.forEach(p => allVals.push(p.y)); }
        if (on.noise) { const np = c.noise.slice(0, N).map((v, i) => ({ x: i, y: v + baseMean })); series.push({ pts: np, color: rgba(C.faint, .8), width: 1.3 }); np.forEach(p => allVals.push(p.y)); }
      }
      series.push({ pts: sumPts, color: C.ink, width: on.pieces ? 3.2 : 2.8 });
      s_set(this.s.chart, { series, xmin: 0, xmax: N - 1, ...yRange(allVals.length ? allVals : [0, 1]), xlabels: xlabels(N, 0, 28) });
    }
  }
  customElements.define('fc-decompose', Decompose);
  function s_set(chart, cfg) { chart.setData(cfg); }

  /* ====================================================================== */
  /* 3 · fc-classic; naive / moving avg / exp smoothing / Holt-Winters      */
  /* ====================================================================== */
  class Classic extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'retail');
      this.variant = this.getAttribute('variant') || 'ma';
      const s = shell(this, 'clamp(290px,40vh,500px)'); this.s = s; this._charts = [s.chart];
      this.params = { k: 7, alpha: .3, beta: .05, gamma: .3, naive: 'snaive' };
      this.revealed = false;
      const ctr = s.controls;
      if (this.variant === 'naive') {
        ctr.append(segmented([{ value: 'naive', label: 'Last value' }, { value: 'snaive', label: 'Same day last week' }], this.params.naive, v => { this.params.naive = v; this.render(); }));
      } else if (this.variant === 'ma') {
        ctr.append(slider('Window size  (days averaged)', 2, 30, 1, this.params.k, v => v + ' days', v => { this.params.k = v; this.render(); }));
      } else if (this.variant === 'ses') {
        ctr.append(slider('α | weight on the latest day', 0.02, 0.98, 0.02, this.params.alpha, v => v.toFixed(2), v => { this.params.alpha = v; this.render(); }));
      } else if (this.variant === 'hw') {
        ctr.append(
          slider('α  level', 0.02, 0.9, 0.02, this.params.alpha, v => v.toFixed(2), v => { this.params.alpha = v; this.render(); }),
          slider('β  trend', 0.0, 0.5, 0.01, this.params.beta, v => v.toFixed(2), v => { this.params.beta = v; this.render(); }),
          slider('γ  season', 0.02, 0.9, 0.02, this.params.gamma, v => v.toFixed(2), v => { this.params.gamma = v; this.render(); })
        );
      }
      const rev = elt('button', 'fl-btn', 'Reveal actual'); rev.onclick = () => { this.revealed = !this.revealed; rev.textContent = this.revealed ? 'Hide actual' : 'Reveal actual'; if (this.revealed) playReveal(this); else this.render(); };
      ctr.append(rev);
      const score = elt('div', 'fl-metrics'); this.score = score; ctr.append(score);
      this.coach = mkCoach(); ctr.append(this.coach);
      this.best = Infinity; this.target = this.computeTarget();
      this.render();
    }
    trueFut() { const ds = this.ds, tf = []; for (let h = 0; h < ds.H; h++) tf.push(ds.future[ds.n + h]); return tf; }
    computeTarget() {
      const ds = this.ds, tf = this.trueFut(); let best = Infinity;
      if (this.variant === 'ma') for (let k = 2; k <= 30; k++) best = Math.min(best, metrics(tf, M.ma(ds.y, ds.H, { k }).fc).mae);
      else if (this.variant === 'ses') for (let a = 0.04; a <= 0.98; a += 0.04) best = Math.min(best, metrics(tf, M.ses(ds.y, ds.H, { alpha: a }).fc).mae);
      else if (this.variant === 'hw') for (let a = 0.1; a <= 0.85; a += 0.1) for (let g = 0.1; g <= 0.8; g += 0.2) best = Math.min(best, metrics(tf, M.hw(ds.y, ds.H, { alpha: a, beta: .04, gamma: g, m: ds.m }).fc).mae);
      return best;
    }
    compute() {
      const ds = this.ds, p = this.params;
      if (this.variant === 'naive') return p.naive === 'naive' ? M.naive(ds.y, ds.H) : M.snaive(ds.y, ds.H, { m: ds.m });
      if (this.variant === 'ma') return M.ma(ds.y, ds.H, { k: p.k });
      if (this.variant === 'ses') return M.ses(ds.y, ds.H, { alpha: p.alpha });
      if (this.variant === 'hw') return M.hw(ds.y, ds.H, { alpha: p.alpha, beta: p.beta, gamma: p.gamma, m: ds.m });
    }
    render() {
      const ds = this.ds, res = this.compute();
      const series = [{ pts: actualPts(ds.y), ...ACT }];
      if (this.variant === 'ma' || this.variant === 'ses' || this.variant === 'hw') series.push({ pts: res.fitted.map((v, i) => ({ x: i, y: v })), ...FIT });
      series.push({ pts: fcPts(ds.y, res.fc), ...FC, dash: [9, 5] });
      const all = ds.y.slice(); res.fc.forEach(v => all.push(v));
      if (this.revealed) { series.push({ pts: revPts(ds), ...REV, clipRight: this._revealClip }); revPts(ds).forEach(p => all.push(p.y)); }
      s_set(this.s.chart, {
        series, xmin: 0, xmax: ds.n + ds.H - 1, ...yRange(all),
        marker: ds.n - 1, markerLabel: 'today', xlabels: xlabels(ds.n, ds.H, 28),
        regions: [{ x0: ds.n - 1, x1: ds.n + ds.H - 1, color: rgba(C.blue, .045) }]
      });
      const mt = metrics(this.trueFut(), res.fc);
      this.score.innerHTML = '';
      this.score.append(metricCard('Forecast MAE', fmt(mt.mae)));
      if (this.revealed) this.score.append(metricCard('MAPE', mt.mape.toFixed(1) + '%'));
      this.updateCoach(mt.mae);
    }
    updateCoach(mae) {
      if (this.variant === 'naive') { this.coach._set(`This is the <b>bar to beat</b>: forecast error (MAE) ≈ <b>${fmt(mae)}</b>. Every model after this has to do better.`, 'hint'); return; }
      this.best = Math.min(this.best, mae); const t = this.target; let tone, msg;
      if (mae <= t * 1.06) { tone = 'good'; msg = `Dialed in. MAE <b>${fmt(mae)}</b>; about the best this model can do.`; }
      else if (mae <= t * 1.28) { tone = 'hint'; msg = `Getting warm; MAE <b>${fmt(mae)}</b>. Nudge it a little more.`; }
      else if (mae <= this.best + 1e-9) { tone = 'warn'; msg = `MAE <b>${fmt(mae)}</b>; your best so far, but this model can do better. Keep tuning.`; }
      else { tone = 'warn'; msg = `MAE <b>${fmt(mae)}</b>; a fair way off this model's best. Keep tuning.`; }
      this.coach._set(msg + ` &nbsp;·&nbsp; <span style="opacity:.65;font-weight:600">best yet ${fmt(this.best)}</span>`, tone);
    }
  }
  customElements.define('fc-classic', Classic);

  /* ====================================================================== */
  /* 4 · fc-ar; autoregression intuition                                    */
  /* ====================================================================== */
  class AR extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'energy');
      const s = shell(this, 'clamp(290px,40vh,500px)'); this.s = s; this._charts = [s.chart];
      this.phi = 0.7; this.revealed = false;
      s.controls.append(slider('φ | how much yesterday carries into today', -0.9, 0.98, 0.02, this.phi, v => v.toFixed(2), v => { this.phi = v; this.render(); }));
      const rev = elt('button', 'fl-btn', 'Reveal actual'); rev.onclick = () => { this.revealed = !this.revealed; rev.textContent = this.revealed ? 'Hide actual' : 'Reveal actual'; if (this.revealed) playReveal(this); else this.render(); };
      s.controls.append(rev);
      const cap = elt('div', 'fl-note'); cap.style.flex = '1 1 240px'; this.cap = cap; s.controls.append(cap);
      this.render();
    }
    render() {
      const ds = this.ds, res = M.ar(ds.y, ds.H, { phi: this.phi });
      const series = [{ pts: actualPts(ds.y), ...ACT }, { pts: res.fitted.map((v, i) => ({ x: i, y: v })), ...FIT }, { pts: fcPts(ds.y, res.fc), ...FC, dash: [9, 5] }];
      const all = ds.y.slice(); res.fc.forEach(v => all.push(v));
      if (this.revealed) { series.push({ pts: revPts(ds), ...REV, clipRight: this._revealClip }); revPts(ds).forEach(p => all.push(p.y)); }
      s_set(this.s.chart, { series, xmin: 0, xmax: ds.n + ds.H - 1, ...yRange(all), marker: ds.n - 1, markerLabel: 'today', xlabels: xlabels(ds.n, ds.H, 28), regions: [{ x0: ds.n - 1, x1: ds.n + ds.H - 1, color: rgba(C.blue, .045) }] });
      const halflife = this.phi > 0 && this.phi < 1 ? (Math.log(.5) / Math.log(this.phi)).toFixed(1) : '∞';
      this.cap.innerHTML = this.phi >= .98 ? '<b>φ ≈ 1:</b> the series barely reverts; almost a random walk, like the naive model.' :
        this.phi <= 0 ? '<b>φ ≤ 0:</b> values bounce around the average; the past tells you little.' :
        `<b>Memory half-life ≈ ${halflife} days.</b> The forecast decays back to the long-run average. That is the AR engine inside ARIMA.`;
    }
  }
  customElements.define('fc-ar', AR);

  /* ====================================================================== */
  /* 5 · fc-features; build-your-own-features sandbox                       */
  /* ====================================================================== */
  class Features extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'retail');
      const s = shell(this, 'clamp(280px,38vh,480px)'); this.s = s; this._charts = [s.chart];
      this.feats = { trend: false, lag1: false, lag7: false, roll7: false, dow: false, yearly: false };
      this.revealed = true;
      const defs = [['trend', 'Trend', C.blue], ['lag1', 'Yesterday (lag 1)', C.blue], ['lag7', 'Last week (lag 7)', C.teal], ['roll7', 'Rolling mean (7)', C.teal], ['dow', 'Day of week', C.orange], ['yearly', 'Yearly cycle', C.orange]];
      const row = elt('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;flex:1 1 100%';
      defs.forEach(([k, l, c]) => row.append(chip(l, c, false, v => { this.feats[k] = v; this.lastToggle = { label: l, on: v }; this.render(); })));
      const score = elt('div', 'fl-metrics'); this.score = score;
      this.meter = mkMeter('Model skill'); this.coach = mkCoach('Switch on a feature to begin; how low can you drive the error?');
      s.controls.append(row, score, this.meter, this.coach);
      const tf = []; for (let h = 0; h < ds.H; h++) tf.push(ds.future[ds.n + h]); this.tf = tf;
      this.baseMAE = metrics(tf, M.ml(ds.y, ds.H, { feats: {}, dowAt: dowAtFor(ds) }).fc).mae;
      this.target = metrics(tf, M.ml(ds.y, ds.H, { feats: { trend: true, lag1: true, lag7: true, roll7: true, dow: true }, dowAt: dowAtFor(ds) }).fc).mae;
      this.prevMAE = this.baseMAE; this.best = Infinity;
      this.render();
    }
    render() {
      const ds = this.ds; const nf = Object.values(this.feats).filter(Boolean).length;
      const res = M.ml(ds.y, ds.H, { feats: this.feats, dowAt: dowAtFor(ds) });
      const series = [{ pts: actualPts(ds.y), ...ACT }, { pts: res.fitted.map((v, i) => ({ x: i, y: v })), color: rgba(C.blue, .7), width: 2 }, { pts: fcPts(ds.y, res.fc), ...FC, dash: [9, 5] }, { pts: revPts(ds), ...REV }];
      const all = ds.y.slice(); res.fc.forEach(v => all.push(v)); revPts(ds).forEach(p => all.push(p.y));
      s_set(this.s.chart, { series, xmin: 0, xmax: ds.n + ds.H - 1, ...yRange(all), marker: ds.n - 1, markerLabel: 'today', xlabels: xlabels(ds.n, ds.H, 28), regions: [{ x0: ds.n - 1, x1: ds.n + ds.H - 1, color: rgba(C.blue, .045) }] });
      const tf = this.tf; const mt = metrics(tf, res.fc); const mae = nf ? mt.mae : this.baseMAE;
      this.score.innerHTML = '';
      this.score.append(metricCard('Features', String(nf)), metricCard('Forecast MAE', nf ? fmt(mt.mae) : ' - '), metricCard('MAPE', nf ? mt.mape.toFixed(1) + '%' : ' - '));
      const pct = 100 * (this.baseMAE - mae) / ((this.baseMAE - this.target) || 1);
      const won = nf >= 2 && mae <= this.target * 1.1;
      this.meter._set(pct, Math.max(0, Math.round(pct)) + '% of the way', won ? C.teal : C.blue);
      if (nf === 0) { this.coach._set('Switch on a feature to begin; how low can you drive the error?', 'neutral'); }
      else {
        const drop = this.prevMAE > 0 ? Math.round(100 * (this.prevMAE - mae) / this.prevMAE) : 0;
        let msg, tone;
        if (won) { tone = 'good'; msg = `Strong model. MAE <b>${fmt(mae)}</b>; your features beat the curve-fitters.`; }
        else if (this.lastToggle && this.lastToggle.on && drop >= 4) { tone = 'hint'; msg = `<b>${this.lastToggle.label}</b> added; error fell <b>${drop}%</b> to ${fmt(mae)}. Keep going.`; }
        else if (this.lastToggle && this.lastToggle.on && drop <= 0) { tone = 'warn'; msg = `<b>${this.lastToggle.label}</b> barely helped here; not every feature carries signal.`; }
        else { tone = 'hint'; msg = `MAE <b>${fmt(mae)}</b>. Try <b>Last week (lag 7)</b> + <b>Day of week</b> for the weekly rhythm.`; }
        this.coach._set(msg, tone);
      }
      this.prevMAE = mae;
    }
  }
  customElements.define('fc-features', Features);

  /* ====================================================================== */
  /* 6 · fc-boost; gradient boosting: fit, overfit, can't extrapolate       */
  /* ====================================================================== */
  class Boost extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'retail');
      const s = shell(this, 'clamp(280px,38vh,480px)'); this.s = s; this._charts = [s.chart];
      this.rounds = 8;
      const split = Math.floor(ds.n * 0.78); this.split = split;
      s.controls.append(slider('Boosting rounds  (trees added)', 1, 220, 1, this.rounds, v => String(v), v => { this.rounds = v; this.render(); }));
      const score = elt('div', 'fl-metrics'); this.score = score;
      const cap = elt('div', 'fl-note'); cap.style.flex = '1 1 240px'; this.cap = cap;
      s.controls.append(score, cap);
      this.render();
    }
    render() {
      const ds = this.ds, sp = this.split, n = ds.n;
      const xTr = [], yTr = []; for (let i = 0; i < sp; i++) { xTr.push(i); yTr.push(ds.y[i]); }
      const xPred = []; for (let i = 0; i < n + ds.H; i++) xPred.push(i);
      const g = gboost(xTr, yTr, this.rounds, 0.3, xPred);
      const fitPts = xPred.map((x, i) => ({ x, y: g.pred[i] }));
      const series = [
        { pts: actualPts(ds.y), ...ACT },
        { pts: revPts(ds), ...REV },
        { pts: fitPts, color: C.blue, width: 3 }
      ];
      const all = ds.y.slice(); g.pred.forEach(v => all.push(v)); revPts(ds).forEach(p => all.push(p.y));
      s_set(this.s.chart, {
        series, xmin: 0, xmax: n + ds.H - 1, ...yRange(all), marker: n - 1, markerLabel: 'today',
        xlabels: xlabels(n, ds.H, 28),
        regions: [
          { x0: sp, x1: n - 1, color: rgba(C.orange, .07), label: 'holdout' },
          { x0: n - 1, x1: n + ds.H - 1, color: rgba(C.red, .05), label: 'future' }
        ]
      });
      // train vs holdout error
      const trA = yTr, trP = g.pred.slice(0, sp);
      const hoA = []; for (let i = sp; i < n; i++) hoA.push(ds.y[i]);
      const hoP = g.pred.slice(sp, n);
      const trMAE = metrics(trA, trP).mae, hoMAE = metrics(hoA, hoP).mae;
      this.score.innerHTML = '';
      this.score.append(metricCard('Train MAE', fmt(trMAE)), metricCard('Holdout MAE', fmt(hoMAE)));
      this.cap.innerHTML = this.rounds > 120 ? '<b>Overfit.</b> Train error keeps falling but holdout error climbs; the trees are memorising noise.' :
        this.rounds < 5 ? '<b>Underfit.</b> Too few trees to capture the pattern yet.' :
        '<b>Notice the flat forecast.</b> Trees split on past values of <i>t</i>; beyond today they can only repeat the last region. They don’t extrapolate trends.';
    }
  }
  customElements.define('fc-boost', Boost);

  /* ====================================================================== */
  /* 7 · fc-seq; deep learning, conceptually (animated)                     */
  /* ====================================================================== */
  class Seq extends FLBase {
    build() {
      const s = shell(this, 'clamp(300px,42vh,520px)'); this.s = s; this._charts = [s.chart];
      this.mode = 'rnn'; this.t = 0; this._afterSize = () => this.draw();
      s.controls.append(segmented([{ value: 'rnn', label: 'RNN / LSTM; memory' }, { value: 'attn', label: 'Transformer; attention' }], this.mode, v => { this.mode = v; this.render(); }));
      const cap = elt('div', 'fl-note'); cap.style.flex = '1 1 320px'; this.cap = cap; s.controls.append(cap);
      this.render();
    }
    onActive(a) { if (a) { this.draw(); this.start(); } else this.stop(); }
    start() { if (this._raf) return; const loop = () => { this.t += 0.016; this.draw(); this._raf = requestAnimationFrame(loop); }; this._raf = requestAnimationFrame(loop); }
    stop() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } }
    _stopAnim() { this.stop(); }
    render() {
      this.cap.innerHTML = this.mode === 'rnn'
        ? '<b>Recurrent nets read left to right,</b> passing a hidden “memory” forward one step at a time. LSTMs add gates so that memory survives longer, but very old signals still fade.'
        : '<b>Transformers look at every step at once.</b> Attention scores decide which past days matter for each prediction; long-range patterns no longer have to survive a relay.';
      this.draw();
    }
    draw() {
      const ch = this.s.chart, ctx = ch.ctx; if (!ch.W) { ch.resize(); return; }
      const W = ch.W, H = ch.H; ctx.clearRect(0, 0, W, H);
      const N = 7, padX = 70, gap = (W - padX * 2) / (N - 1), yIn = H - 70, yHid = H * 0.42, yOut = 80;
      const t = this.t;
      const nodes = []; for (let i = 0; i < N; i++) nodes.push(padX + i * gap);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (this.mode === 'rnn') {
        // hidden chain
        for (let i = 0; i < N - 1; i++) {
          ctx.strokeStyle = C.divider; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(nodes[i], yHid); ctx.lineTo(nodes[i + 1], yHid); ctx.stroke();
        }
        // moving pulse along chain
        const prog = (t * 0.35) % (N - 1); const seg = Math.floor(prog), fr = prog - seg;
        const px = nodes[seg] + (nodes[seg + 1] - nodes[seg]) * fr;
        // input arrows + nodes
        for (let i = 0; i < N; i++) {
          ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nodes[i], yIn - 16); ctx.lineTo(nodes[i], yHid + 20); ctx.stroke();
          ctx.fillStyle = C.canvas; ctx.strokeStyle = C.divider; ctx.lineWidth = 2;
          roundRect(ctx, nodes[i] - 22, yIn - 16, 44, 34, 9); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.sub; ctx.font = '700 15px Inter,sans-serif'; ctx.fillText('x' + (i + 1), nodes[i], yIn + 2);
          const lit = Math.abs(i - prog) < 0.6;
          ctx.beginPath(); ctx.arc(nodes[i], yHid, 16, 0, 7); ctx.fillStyle = lit ? C.blue : '#fff'; ctx.strokeStyle = lit ? C.blue : C.line; ctx.lineWidth = 2.5; ctx.fill(); ctx.stroke();
          ctx.fillStyle = lit ? '#fff' : C.faint; ctx.font = '700 13px Inter,sans-serif'; ctx.fillText('h', nodes[i], yHid + 1);
        }
        ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(px, yHid, 7, 0, 7); ctx.fill();
        // output
        ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(nodes[N - 1], yHid - 16); ctx.lineTo(nodes[N - 1], yOut + 22); ctx.stroke();
        outNode(ctx, nodes[N - 1], yOut, 'ŷ', C);
        label(ctx, padX, yHid - 40, 'hidden state carries memory', C);
      } else {
        const out = W / 2;
        outNode(ctx, out, yOut, 'ŷ', C);
        for (let i = 0; i < N; i++) {
          // attention weight: emphasise a couple of steps, pulsing
          let w = 0.2 + 0.8 * Math.exp(-((i - 4) ** 2) / 2) * (0.6 + 0.4 * Math.sin(t * 2 + i));
          w = clamp(w, 0.08, 1);
          ctx.strokeStyle = rgba(C.blue, 0.12 + 0.6 * w); ctx.lineWidth = 1 + 7 * w;
          ctx.beginPath(); ctx.moveTo(nodes[i], yIn - 18); ctx.lineTo(out, yOut + 24); ctx.stroke();
          ctx.fillStyle = C.canvas; ctx.strokeStyle = C.divider; ctx.lineWidth = 2;
          roundRect(ctx, nodes[i] - 22, yIn - 16, 44, 34, 9); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.sub; ctx.font = '700 15px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('x' + (i + 1), nodes[i], yIn + 2);
        }
        label(ctx, out - 150, yOut + 52, 'attention weighs all steps at once', C);
      }
    }
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function outNode(ctx, x, y, txt, C) { ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fillStyle = C.blue; ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '800 18px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1); }
  function label(ctx, x, y, txt, C) { ctx.fillStyle = C.faint; ctx.font = '600 14px Inter,sans-serif'; ctx.textAlign = 'start'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y); }
  customElements.define('fc-seq', Seq);

  /* ====================================================================== */
  /* 8 · fc-uncertainty; a forecast is a distribution                       */
  /* ====================================================================== */
  class Uncertainty extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'retail');
      const s = shell(this, 'clamp(290px,40vh,500px)'); this.s = s; this._charts = [s.chart];
      this.conf = 0.8; this.horizon = ds.H; this.revealed = false;
      s.controls.append(
        segmented([{ label: 'Conservative 50%', value: .5 }, { label: 'Expected 80%', value: .8 }, { label: 'Upper 95%', value: .95 }], this.conf, v => { this.conf = v; this.render(); }),
        slider('Horizon  (days ahead)', 7, ds.H, 1, this.horizon, v => v + ' d', v => { this.horizon = v; this.render(); })
      );
      const rev = elt('button', 'fl-btn', 'Reveal actual'); rev.onclick = () => { this.revealed = !this.revealed; rev.textContent = this.revealed ? 'Hide actual' : 'Reveal actual'; if (this.revealed) playReveal(this); else this.render(); };
      s.controls.append(rev);
      const score = elt('div', 'fl-metrics'); this.score = score; s.controls.append(score);
      this.coach = mkCoach('Pick a coverage level, then reveal: will that fraction of reality land inside its band?'); s.controls.append(this.coach);
      const cap = elt('div', 'fl-note'); cap.style.cssText = 'flex:1 1 100%;font-size:16px;';
      cap.innerHTML = '<b>Wider is more honest, not worse</b> — same model, same forecast.';
      s.controls.append(cap);
      this.render();
    }
    render() {
      const ds = this.ds, Hh = this.horizon;
      const res = M.hw(ds.y, ds.H, { alpha: .35, beta: .04, gamma: .3, m: ds.m });
      const LEVELS = [.95, .8, .5];
      const byP = {};
      const bands = LEVELS.map(p => {
        const z = zFor(p);
        const pts = [{ x: ds.n - 1, lo: ds.y[ds.n - 1], hi: ds.y[ds.n - 1] }];
        for (let h = 0; h < Hh; h++) { const w = z * res.sigma * Math.sqrt(h + 1); pts.push({ x: ds.n + h, lo: res.fc[h] - w, hi: res.fc[h] + w }); }
        byP[p] = pts;
        const selected = Math.abs(p - this.conf) < .001;
        return { p, pts, color: rgba(C.blue, selected ? .30 : .10) };
      });
      const selBand = byP[this.conf];
      const series = [{ pts: actualPts(ds.y), ...ACT }, { pts: fcPts(ds.y, res.fc.slice(0, Hh)), ...FC, dash: [9, 5] }];
      const all = ds.y.slice(); bands.forEach(b => b.pts.forEach(p => { all.push(p.lo); all.push(p.hi); }));
      let coverInfo = null;
      if (this.revealed) {
        const rp = []; for (let i = ds.n - 1; i < ds.n + Hh; i++) rp.push({ x: i, y: ds.future[i] });
        series.push({ pts: rp, ...REV, dots: true, dotR: 2.5, clipRight: this._revealClip }); rp.forEach(p => all.push(p.y));
        let inside = 0; for (let h = 0; h < Hh; h++) { const v = ds.future[ds.n + h]; if (v >= selBand[h + 1].lo && v <= selBand[h + 1].hi) inside++; }
        coverInfo = Math.round(100 * inside / Hh);
      }
      const last95 = byP[.95][byP[.95].length - 1];
      const lastFc = res.fc[Hh - 1];
      s_set(this.s.chart, {
        series, bands,
        xmin: 0, xmax: ds.n + ds.H - 1, ...yRange(all), marker: ds.n - 1, markerLabel: 'today',
        xlabels: xlabels(ds.n, ds.H, 28), regions: [{ x0: ds.n - 1, x1: ds.n + ds.H - 1, color: rgba(C.blue, .03) }],
        after: (ctx, geo) => {
          const px = geo.xToPx(ds.n + Hh - 1) - 6;
          ctx.font = "700 12px 'Space Mono',monospace"; ctx.textBaseline = 'middle'; ctx.textAlign = 'end';
          ctx.fillStyle = C.sub; ctx.fillText('expedite', px, geo.yToPx(last95.hi) - 11);
          ctx.fillStyle = C.ink; ctx.fillText('reorder', px, geo.yToPx(lastFc));
          ctx.fillStyle = C.sub; ctx.fillText('delay buy', px, geo.yToPx(last95.lo) + 11);
        }
      });
      this.score.innerHTML = '';
      this.score.append(metricCard('Checking', Math.round(this.conf * 100) + '%'));
      if (coverInfo != null) this.score.append(metricCard('Actual inside', coverInfo + '%'));
      const nom = Math.round(this.conf * 100);
      if (coverInfo == null) this.coach._set('Pick a level, then <b>Reveal</b>: will ≈' + nom + '% of reality land inside that band?', 'hint');
      else if (Math.abs(coverInfo - nom) <= 12) this.coach._set(`Well-calibrated; you promised ${nom}%, reality delivered <b>${coverInfo}%</b> inside the band.`, 'good');
      else if (coverInfo > nom) this.coach._set(`Cautious; <b>${coverInfo}%</b> landed inside a ${nom}% band. It’s wider than it needs to be.`, 'hint');
      else this.coach._set(`Over-confident; only <b>${coverInfo}%</b> fell inside a ${nom}% band. Widen it, or trust it less.`, 'warn');
    }
  }
  customElements.define('fc-uncertainty', Uncertainty);

  /* ====================================================================== */
  /* 9 · fc-backtest; train/test split & error metrics                      */
  /* ====================================================================== */
  class Backtest extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'retail');
      const s = shell(this, 'clamp(280px,38vh,480px)'); this.s = s; this._charts = [s.chart];
      this.splitPct = 0.7; this.model = 'hw';
      s.controls.append(
        segmented([{ value: 'naive', label: 'Naive' }, { value: 'ma', label: 'Moving avg' }, { value: 'hw', label: 'Holt-Winters' }], this.model, v => { this.model = v; this.render(); }),
        slider('Train / test split', 0.4, 0.9, 0.01, this.splitPct, v => Math.round(v * 100) + '% train', v => { this.splitPct = v; this.render(); })
      );
      const score = elt('div', 'fl-metrics'); this.score = score; s.controls.append(score);
      this.coach = mkCoach('Slide the split and watch the score move; that’s why a single test can lie.'); s.controls.append(this.coach);
      this.lo = Infinity; this.hi = 0;
      this.render();
    }
    render() {
      const ds = this.ds, n = ds.full ? ds.full.length : ds.future.length;
      const series0 = ds.future; const total = series0.length;
      const sp = Math.floor(total * this.splitPct);
      const train = series0.slice(0, sp); const testLen = total - sp;
      let res;
      if (this.model === 'naive') res = M.snaive(train, testLen, { m: ds.m });
      else if (this.model === 'ma') res = M.ma(train, testLen, { k: 7 });
      else res = M.hw(train, testLen, { alpha: .35, beta: .04, gamma: .3, m: ds.m });
      const actual = series0.map((v, i) => ({ x: i, y: v }));
      const fc = [{ x: sp - 1, y: train[sp - 1] }].concat(res.fc.map((v, h) => ({ x: sp + h, y: v })));
      const series = [
        { pts: actual.slice(0, sp), ...ACT },
        { pts: actual.slice(sp - 1), color: C.ink, width: 2.4, dash: [2, 4] },
        { pts: fc, ...FC, dash: [9, 5] }
      ];
      s_set(this.s.chart, {
        series, xmin: 0, xmax: total - 1, ...yRange(series0),
        marker: sp - 1, markerLabel: 'split',
        regions: [{ x0: sp - 1, x1: total - 1, color: rgba(C.orange, .07), label: 'test (unseen)' }],
        xlabels: xlabels(total, 0, 28)
      });
      const ta = series0.slice(sp); const mt = metrics(ta, res.fc);
      this.score.innerHTML = '';
      this.score.append(metricCard('MAE', fmt(mt.mae)), metricCard('RMSE', fmt(mt.rmse)), metricCard('MAPE', mt.mape.toFixed(1) + '%'));
      this.lo = Math.min(this.lo, mt.mae); this.hi = Math.max(this.hi, mt.mae);
      if (this.hi - this.lo > this.lo * 0.12) this.coach._set(`Same model, same data; yet MAE has swung from <b>${fmt(this.lo)}</b> to <b>${fmt(this.hi)}</b> as you moved the split. One lucky split can flatter a weak model.`, 'warn');
      else this.coach._set('Drag the split across more of the timeline; watch how much the score moves. That swing is why pros average over many splits.', 'hint');
    }
  }
  customElements.define('fc-backtest', Backtest);

  /* ====================================================================== */
  /* 10 · fc-metrics; drag an outlier, watch RMSE spike                     */
  /* ====================================================================== */
  class Metrics extends FLBase {
    build() {
      const s = shell(this, 'clamp(280px,38vh,460px)'); this.s = s; this._charts = [s.chart];
      // small synthetic week-ish series with one draggable point
      const base = [42, 48, 45, 50, 47, 52, 49, 53, 51, 55, 52, 57, 54, 58];
      this.pred = base.map((v, i) => 42 + i * 1.15);   // a clean forecast line
      this.actual = base.slice(); this.dragIdx = 9;
      const cv = s.cv;
      const pick = e => { const x = Math.round(s.chart.pxToData(e.clientX)); this.dragIdx = clamp(x, 0, this.actual.length - 1); move(e); };
      const move = e => { const y = clamp(s.chart.pxToY(e.clientY), 20, 110); this.actual[this.dragIdx] = y; this.render(); };
      let down = false;
      cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); pick(e); });
      cv.addEventListener('pointermove', e => { if (down) move(e); });
      cv.addEventListener('pointerup', () => down = false);
      const reset = elt('button', 'fl-btn ghost', 'Reset'); reset.onclick = () => { this.actual = base.slice(); this.render(); };
      const cap = elt('div', 'fl-note'); cap.style.cssText = 'flex:1 1 260px'; cap.innerHTML = '<b>Drag any dot.</b> One big miss barely moves MAE but sends RMSE soaring; RMSE punishes large errors hardest. MAPE is a percentage, so it explodes on small actuals.';
      const score = elt('div', 'fl-metrics'); this.score = score;
      s.controls.append(score, reset, cap);
      this.render();
    }
    render() {
      const n = this.actual.length;
      const series = [
        { pts: this.pred.map((v, i) => ({ x: i, y: v })), ...FC, dash: [8, 5] },
        { pts: this.actual.map((v, i) => ({ x: i, y: v })), color: C.ink, width: 2.6, dots: true, dotR: 6, dotColor: C.ink }
      ];
      // error sticks
      const after = (ctx, m) => {
        for (let i = 0; i < n; i++) { ctx.strokeStyle = rgba(C.red, .5); ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(m.xToPx(i), m.yToPx(this.actual[i])); ctx.lineTo(m.xToPx(i), m.yToPx(this.pred[i])); ctx.stroke(); ctx.setLineDash([]); }
        const di = this.dragIdx; ctx.beginPath(); ctx.arc(m.xToPx(di), m.yToPx(this.actual[di]), 9, 0, 7); ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.stroke();
      };
      s_set(this.s.chart, { series, xmin: -0.3, xmax: n - 0.7, ymin: 18, ymax: 112, after, xlabels: [] });
      const mt = metrics(this.actual, this.pred);
      this.score.innerHTML = '';
      this.score.append(metricCard('MAE', fmt(mt.mae)), metricCard('RMSE', fmt(mt.rmse)), metricCard('MAPE', mt.mape.toFixed(1) + '%'));
    }
  }
  customElements.define('fc-metrics', Metrics);

  /* ====================================================================== */
  /* 11 · fc-compare; model showdown                                        */
  /* ====================================================================== */
  class Compare extends FLBase {
    build() {
      this.dataKey = this.getAttribute('data') || 'retail';
      const s = shell(this, 'clamp(280px,38vh,480px)'); this.s = s; this._charts = [s.chart];
      this.a = 'snaive'; this.b = 'hw';
      const opts = [{ value: 'snaive', label: 'Seasonal naive' }, { value: 'ma', label: 'Moving avg' }, { value: 'ses', label: 'Exp smoothing' }, { value: 'hw', label: 'Holt-Winters' }, { value: 'ml', label: 'ML features' }];
      const rowA = elt('div', 'fl-ctl'); rowA.append(label2('Model A', C.blue), segmented(opts, this.a, v => { this.a = v; this.render(); }));
      const rowB = elt('div', 'fl-ctl'); rowB.append(label2('Model B', C.orange), segmented(opts, this.b, v => { this.b = v; this.render(); }));
      const dseg = elt('div', 'fl-ctl'); dseg.append(label2('Dataset', C.sub), segmented([{ value: 'retail', label: 'Retail' }, { value: 'energy', label: 'Energy' }, { value: 'traffic', label: 'App users' }], this.dataKey, v => { this.dataKey = v; this.render(); }));
      const score = elt('div', 'fl-metrics'); this.score = score;
      this.coach = mkCoach('Pick two models, then switch the dataset. Does the same one keep winning?');
      s.controls.append(dseg, rowA, rowB, score, this.coach);
      this.render();
    }
    run(key, y, H, ds) {
      if (key === 'snaive') return M.snaive(y, H, { m: ds.m });
      if (key === 'ma') return M.ma(y, H, { k: 7 });
      if (key === 'ses') return M.ses(y, H, { alpha: .3 });
      if (key === 'hw') return M.hw(y, H, { alpha: .35, beta: .04, gamma: .3, m: ds.m });
      if (key === 'ml') return M.ml(y, H, { feats: { lag1: true, lag7: true, dow: true, trend: true, roll7: true }, dowAt: dowAtFor(ds) });
    }
    render() {
      const ds = getDS(this.dataKey); this.ds = ds;
      const ra = this.run(this.a, ds.y, ds.H, ds), rb = this.run(this.b, ds.y, ds.H, ds);
      const series = [
        { pts: actualPts(ds.y), ...ACT },
        { pts: revPts(ds), ...REV },
        { pts: fcPts(ds.y, ra.fc), color: C.blue, width: 3.6, dash: [9, 5] },
        { pts: fcPts(ds.y, rb.fc), color: C.orange, width: 3.6, dash: [9, 5] }
      ];
      const all = ds.y.slice(); ra.fc.concat(rb.fc).forEach(v => all.push(v)); revPts(ds).forEach(p => all.push(p.y));
      s_set(this.s.chart, { series, xmin: 0, xmax: ds.n + ds.H - 1, ...yRange(all), marker: ds.n - 1, markerLabel: 'today', xlabels: xlabels(ds.n, ds.H, 28), regions: [{ x0: ds.n - 1, x1: ds.n + ds.H - 1, color: rgba(C.blue, .04) }] });
      const tf = []; for (let h = 0; h < ds.H; h++) tf.push(ds.future[ds.n + h]);
      const ma = metrics(tf, ra.fc).mae, mb = metrics(tf, rb.fc).mae;
      const win = ma < mb ? 'A' : 'B';
      this.score.innerHTML = '';
      const cardA = metricCard('A · MAE', fmt(ma)); cardA.style.outline = win === 'A' ? '2px solid ' + C.blue : 'none';
      const cardB = metricCard('B · MAE', fmt(mb)); cardB.style.outline = win === 'B' ? '2px solid ' + C.orange : 'none';
      this.score.append(cardA, cardB);
      const tag = elt('div', 'fl-tag'); tag.style.cssText += 'background:' + (win === 'A' ? C.blueLt : C.orangeLt) + ';color:' + (win === 'A' ? C.blueDk : C.orangeDk); tag.textContent = 'Winner here: Model ' + win; this.score.append(tag);
      const lo = Math.min(ma, mb), hi = Math.max(ma, mb); const margin = hi > 0 ? Math.round(100 * (hi - lo) / hi) : 0;
      const dn = { retail: 'retail', energy: 'energy', traffic: 'app-users' }[this.dataKey];
      if (margin < 6) this.coach._set(`On <b>${dn}</b> it’s almost a tie (within ${margin}%). Switch the dataset; narrow gaps can flip.`, 'hint');
      else this.coach._set(`Model <b>${win}</b> wins on <b>${dn}</b> by <b>${margin}%</b>. Now switch the dataset. Does it stay champion?`, 'good');
    }
  }
  function label2(t, c) { const d = elt('div', 'fl-ctl-label'); d.innerHTML = `<span style="color:${c}">${t}</span>`; return d; }
  customElements.define('fc-compare', Compare);

  /* ====================================================================== */
  /* 12 · fc-shock; when the world breaks the model                         */
  /* ====================================================================== */
  class Shock extends FLBase {
    build() {
      const ds = this.ds = getDS('retail');
      const s = shell(this, 'clamp(290px,40vh,500px)'); this.s = s; this._charts = [s.chart];
      this.kind = 'crash'; this.mag = 0.6; this.revealed = false;
      s.controls.append(
        segmented([{ value: 'crash', label: 'Sudden crash' }, { value: 'viral', label: 'Viral spike' }, { value: 'regime', label: 'New normal' }], this.kind, v => { this.kind = v; this.render(); }),
        slider('Shock magnitude', 0.2, 1, 0.05, this.mag, v => Math.round(v * 100) + '%', v => { this.mag = v; this.render(); })
      );
      const rev = elt('button', 'fl-btn', 'Reveal what actually happened'); rev.onclick = () => { this.revealed = !this.revealed; rev.textContent = this.revealed ? 'Hide' : 'Reveal what actually happened'; if (this.revealed) playReveal(this); else this.render(); };
      s.controls.append(rev);
      const score = elt('div', 'fl-metrics'); this.score = score; s.controls.append(score);
      const cap = elt('div', 'fl-note'); cap.style.flex = '1 1 100%'; this.cap = cap; s.controls.append(cap);
      this.render();
    }
    shocked() {
      const ds = this.ds, out = ds.future.slice(); const base = ds.future[ds.n - 1];
      for (let h = 0; h < ds.H; h++) {
        const i = ds.n + h;
        if (this.kind === 'crash') out[i] = ds.future[i] - base * this.mag * (1 - Math.exp(-h / 3));
        else if (this.kind === 'viral') out[i] = ds.future[i] + base * this.mag * 2.4 * Math.exp(-h / 7);
        else out[i] = ds.future[i] - base * this.mag * 0.45; // regime: permanent step down
      }
      return out;
    }
    render() {
      const ds = this.ds, res = M.hw(ds.y, ds.H, { alpha: .35, beta: .04, gamma: .3, m: ds.m });
      const fut = this.shocked();
      const series = [{ pts: actualPts(ds.y), ...ACT }, { pts: fcPts(ds.y, res.fc), ...FC, dash: [9, 5] }];
      const all = ds.y.slice(); res.fc.forEach(v => all.push(v));
      if (this.revealed) { const rp = []; for (let i = ds.n - 1; i < fut.length; i++) rp.push({ x: i, y: fut[i] }); series.push({ pts: rp, color: C.red, width: 3.2, clipRight: this._revealClip }); rp.forEach(p => all.push(p.y)); }
      s_set(this.s.chart, { series, xmin: 0, xmax: ds.n + ds.H - 1, ...yRange(all), marker: ds.n - 1, markerLabel: 'today', xlabels: xlabels(ds.n, ds.H, 28), regions: [{ x0: ds.n - 1, x1: ds.n + ds.H - 1, color: rgba(C.red, .05) }] });
      this.score.innerHTML = '';
      if (this.revealed) {
        const tf = fut.slice(ds.n); const mt = metrics(tf, res.fc);
        this.score.append(metricCard('Forecast MAE', fmt(mt.mae)));
        const tag = elt('div', 'fl-tag'); tag.style.cssText += 'background:' + C.redLt + ';color:' + C.redDk; tag.textContent = 'The model never saw it coming'; this.score.append(tag);
      }
      this.cap.innerHTML = '<b>The model only knows the past.</b> A crash, a viral moment, a structural “new normal”; these live outside the data, so even a perfect model walks straight off the cliff. This is the boundary of what AI can predict.';
    }
  }
  customElements.define('fc-shock', Shock);

  /* ====================================================================== */
  /* 13 · fc-game; APPLIED: forecast → stock decision → animated profit     */
  /* ====================================================================== */
  function bakery() {
    const rng = mulberry32(2025); const n = 63, H = 14, m = 7; const fut = [];
    for (let t = 0; t < n + H; t++) { const tr = 96 + 0.22 * t; const dow = t % 7; const wk = [-10, -16, -7, 3, 18, 33, 16][dow]; const ns = gauss(rng) * 7; fut.push(Math.max(20, Math.round(tr + wk + ns))); }
    return { key: 'bakery', name: 'Daily croissants', unit: 'units', m, startDow: 0, n, H, y: fut.slice(0, n), future: fut };
  }
  class Game extends FLBase {
    build() {
      const ds = this.ds = bakery();
      const s = shell(this, '372'); this.s = s; this._charts = [s.chart];
      this.model = 'hw'; this.buffer = 0.10; this.simDay = 0; this.running = false; this.done = false;
      this.PRICE = 5; this.WASTE = 2; this.SHORT = 4;
      const ctr = s.controls;
      ctr.append(
        segmented([{ value: 'naive', label: 'Repeat yesterday' }, { value: 'snaive', label: 'Same day last week' }, { value: 'hw', label: 'Holt-Winters' }], this.model, v => { this.model = v; this.reset(); }),
        slider('Safety buffer  (extra stock on top)', -0.2, 0.6, 0.05, this.buffer, v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%', v => { this.buffer = v; this.reset(); })
      );
      const runBtn = elt('button', 'fl-btn', 'Bake and run 14 days'); runBtn.onclick = () => this.run(); this.runBtn = runBtn;
      const again = elt('button', 'fl-btn ghost', 'Reset'); again.onclick = () => this.reset();
      const board = elt('div', 'fl-metrics'); this.board = board;
      this.coach = mkCoach('You run a bakery. Forecast demand, add a safety buffer, then bake. Sell at $5, waste costs $2, a stockout costs $4. Maximise profit.');
      ctr.append(runBtn, again, board, this.coach);
      this.computePlan(); this.reset();
    }
    onActive(a) { if (a && !this._playedIn) { this._playedIn = true; this.s.chart.animateIn(780); } if (!a) this.stopSim(); }
    computePlan() {
      const ds = this.ds; let res;
      if (this.model === 'naive') res = M.naive(ds.y, ds.H);
      else if (this.model === 'snaive') res = M.snaive(ds.y, ds.H, { m: ds.m });
      else res = M.hw(ds.y, ds.H, { alpha: .4, beta: .05, gamma: .35, m: ds.m });
      this.fc = res.fc;
      this.plan = res.fc.map(v => Math.max(0, Math.round(v * (1 + this.buffer))));
    }
    perfect() { const ds = this.ds; let p = 0; for (let d = 0; d < ds.H; d++) p += ds.future[ds.n + d] * this.PRICE; return p; }
    econ(upto) {
      const ds = this.ds, k = Math.min(Math.floor(upto + 1e-9), ds.H); let profit = 0, sold = 0, dem = 0, waste = 0, lost = 0, stocked = 0;
      for (let d = 0; d < k; d++) { const demand = ds.future[ds.n + d], stock = this.plan[d]; const so = Math.min(demand, stock), w = Math.max(0, stock - demand), l = Math.max(0, demand - stock); profit += so * this.PRICE - w * this.WASTE - l * this.SHORT; sold += so; dem += demand; waste += w; lost += l; stocked += stock; }
      return { profit, sold, dem, waste, lost, stocked };
    }
    stopSim() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } this.running = false; }
    reset() { this.stopSim(); this.simDay = 0; this.done = false; this._starsAnimated = false; this.computePlan(); if (this.runBtn) { this.runBtn.disabled = false; this.runBtn.textContent = 'Bake and run 14 days'; } this.coach._set('Pick a model and a safety buffer, then bake. Too little stock = stockouts; too much = waste. Maximise profit.', 'neutral'); this.render(); }
    run() {
      if (this.running) return; this.computePlan(); this.running = true; this.done = false; this._starsAnimated = false;
      this.runBtn.disabled = true; this.runBtn.textContent = 'Baking…';
      this.coach._set('The days are arriving; <span style="color:' + C.teal + '">green</span> = demand met, <span style="color:' + C.red + '">red</span> = sold out.', 'hint');
      if (reducedMotion()) { this.running = false; this.done = true; this.simDay = this.ds.H; this.runBtn.disabled = false; this.runBtn.textContent = 'Run again'; this.finish(); this.render(); return; }
      const t0 = performance.now(), dur = 2600;
      const step = () => { const e = clamp((performance.now() - t0) / dur, 0, 1); this.simDay = e * this.ds.H; this.render(); if (e < 1) { this._raf = requestAnimationFrame(step); } else { this.running = false; this.done = true; this.simDay = this.ds.H; this.runBtn.disabled = false; this.runBtn.textContent = 'Run again'; this.finish(); this.render(); } };
      this._raf = requestAnimationFrame(step);
    }
    finish() {
      const ds = this.ds, full = this.econ(ds.H), perfect = this.perfect();
      const ratio = perfect > 0 ? full.profit / perfect : 0, pct = Math.round(ratio * 100);
      let best = +(localStorage.getItem('fcgame.best') || 0); if (full.profit > best) { best = Math.round(full.profit); localStorage.setItem('fcgame.best', best); }
      let tone, msg;
      if (ratio >= 0.9) {
        tone = 'good';
        if (full.waste > full.lost * 1.6) msg = `${pct}% of a perfect run. Trim the buffer a touch and you’d shave the last of the waste.`;
        else if (full.lost > full.waste * 1.6) msg = `${pct}% of a perfect run. A hair more buffer would catch the last stockouts.`;
        else msg = `${pct}% of a perfect run. Service and waste in near-perfect harmony.`;
      } else if (full.lost > full.waste * 1.6) { tone = 'warn'; msg = `Stockouts hurt; you turned away <b>${full.lost}</b> orders (just ${pct}% of a perfect run). Raise the buffer.`; }
      else if (full.waste > full.lost * 1.6) { tone = 'warn'; msg = `Over-baked; <b>${full.waste}</b> units wasted (${pct}% of perfect). Trim the buffer.`; }
      else { tone = 'hint'; msg = `${pct}% of a perfect run; balanced, but there’s headroom. Try another model.`; }
      this.coach._set(msg + ` &nbsp;·&nbsp; <b>$${Math.round(full.profit)}</b> &nbsp;·&nbsp; <span style="opacity:.7">best $${best}</span>`, tone);
    }
    render() {
      const ds = this.ds, k = Math.floor(this.simDay + 1e-9);
      const planPts = [{ x: ds.n - 1, y: ds.y[ds.n - 1] }].concat(this.plan.map((v, d) => ({ x: ds.n + d, y: v })));
      const series = [{ pts: actualPts(ds.y), ...ACT }, { pts: planPts, color: C.blue, width: 3, dash: [7, 5], dots: true, dotR: 3 }];
      const all = ds.y.slice(); this.plan.forEach(v => all.push(v)); for (let d = 0; d < ds.H; d++) all.push(ds.future[ds.n + d]);
      const after = (ctx, mp) => {
        for (let d = 0; d < Math.min(k, ds.H); d++) {
          const x = ds.n + d, dem = ds.future[ds.n + d], stk = this.plan[d], met = dem <= stk;
          const px = mp.xToPx(x), py = mp.yToPx(dem), sy = mp.yToPx(stk);
          ctx.strokeStyle = rgba(met ? C.teal : C.red, .4); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, sy); ctx.lineTo(px, py); ctx.stroke();
          ctx.beginPath(); ctx.arc(px, py, 5.5, 0, 7); ctx.fillStyle = met ? C.teal : C.red; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        if (this.running || this.done) { const mx = mp.xToPx(ds.n - 1 + this.simDay); ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(mx, mp.y0); ctx.lineTo(mx, mp.y1); ctx.stroke(); ctx.setLineDash([]); }
      };
      s_set(this.s.chart, { series, xmin: 0, xmax: ds.n + ds.H - 1, ...yRange(all), marker: ds.n - 1, markerLabel: 'today', xlabels: xlabels(ds.n, ds.H, 21), regions: [{ x0: ds.n - 1, x1: ds.n + ds.H - 1, color: rgba(C.blue, .05), label: 'your 14-day plan' }], after });
      const e = this.econ(this.simDay), board = this.board; board.innerHTML = '';
      const pc = metricCard('Profit', '$' + Math.round(e.profit)); pc._v.style.color = e.profit >= 0 ? C.teal : C.red; board.append(pc);
      board.append(metricCard('Service level', e.dem ? Math.round(100 * e.sold / e.dem) + '%' : ' - '));
      board.append(metricCard('Waste', e.stocked ? Math.round(100 * e.waste / e.stocked) + '%' : ' - '));
      if (this.done) {
        const full = this.econ(ds.H), perfect = this.perfect(), ratio = perfect > 0 ? full.profit / perfect : 0;
        const n = ratio >= .93 ? 5 : ratio >= .88 ? 4 : ratio >= .8 ? 3 : ratio >= .68 ? 2 : 1;
        const stars = makeStars(n); stars.style.alignSelf = 'center'; board.append(stars);
        if (!this._starsAnimated) { this._starsAnimated = true; staggerStars(stars, 65); }
      }
    }
  }
  customElements.define('fc-game', Game);

  /* ====================================================================== */
  /* fc-code; pre-baked code + output. The output is the payoff (plan 017).  */
  /* No runtime exec, no network, no API key. Python highlighter ported from */
  /* the course CodeLab. Reads <script type="text/plain" data-fc="src|out">  */
  /* children so code stays co-located with the slide and is HTML-safe.      */
  /* Reuses .fl-card so the chrome matches every other widget.               */
  /* ====================================================================== */
  const FC_KW = new Set('import from as def return for in if elif else while with class lambda yield try except finally raise pass break continue and or not is None True False global nonlocal assert del async await print'.split(' '));
  const FC_BI = new Set('len range sum abs min max round int float str list dict set tuple enumerate zip map sorted pd np sf plt numpy df model StatsForecast MLForecast NeuralForecast SeasonalNaive AutoETS TimesFM Chronos'.split(' '));
  function fcEsc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fcDedent(src) {
    let lines = src.replace(/\t/g, '  ').replace(/\s+$/, '').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    if (!lines.length) return '';
    const ind = Math.min.apply(null, lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
    return lines.map(l => l.slice(ind)).join('\n');
  }
  function fcHi(src) {
    return src.split('\n').map(line => {
      const toks = line.split(/(\s+|[(){}\[\],:.=+\-*\/%<>!&|@]|#.*$|"[^"]*"|'[^']*')/);
      let o = '';
      for (let i = 0; i < toks.length; i++) {
        const tok = toks[i]; if (!tok) continue; const e = fcEsc(tok);
        if (/^\s+$/.test(tok)) { o += e; continue; }
        if (tok[0] === '#') { o += '<span class="fc-cm">' + e + '</span>'; continue; }
        if (tok[0] === '"' || tok[0] === "'") { o += '<span class="fc-st">' + e + '</span>'; continue; }
        if (/^\d/.test(tok)) { o += '<span class="fc-nu">' + e + '</span>'; continue; }
        if (FC_KW.has(tok)) { o += '<span class="fc-kw">' + e + '</span>'; continue; }
        if (FC_BI.has(tok)) { o += '<span class="fc-bi">' + e + '</span>'; continue; }
        if (/^[A-Za-z_]\w*$/.test(tok)) { let j = i + 1; while (j < toks.length && /^\s*$/.test(toks[j])) j++; o += '<span class="' + (toks[j] === '(' ? 'fc-fn' : 'fc-va') + '">' + e + '</span>'; continue; }
        o += '<span class="fc-pn">' + e + '</span>';
      }
      return o || ' ';
    }).join('\n');
  }
  let fcCssDone = false;
  function fcInject() {
    if (fcCssDone) return; fcCssDone = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-code{display:block;width:100%}' +
      '.fc-code-card{overflow:hidden}' +
      '.fc-code-bar{display:flex;align-items:center;gap:12px;padding:12px 18px;background:' + C.soft + ';border-bottom:1px solid ' + C.grid + '}' +
      '.fc-code-bar .fc-dots{display:inline-flex;gap:7px}' +
      '.fc-code-bar .fc-dots i{width:11px;height:11px;border-radius:50%;background:' + C.divider + ';display:inline-block}' +
      '.fc-code-file{font-family:' + mono + ';font-size:16px;font-weight:700;letter-spacing:.3px;color:' + C.sub + '}' +
      '.fc-code-copy{margin-left:auto;appearance:none;border:1px solid ' + C.divider + ';background:transparent;color:' + C.sub + ";font-family:'Inter',sans-serif;font-size:14px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;padding:8px 15px;border-radius:9px;cursor:pointer}" +
      '.fc-code-copy:hover{border-color:' + C.blue + ';color:' + C.blue + '}' +
      '.fc-code-copy:focus-visible{outline:3px solid ' + C.blue + ';outline-offset:2px}' +
      '.fc-code-src{margin:0;padding:22px 24px;font-family:' + mono + ';font-size:22px;line-height:1.62;color:' + C.ink + ';white-space:pre;overflow-x:auto;tab-size:2}' +
      '.fc-code-out{padding:16px 24px;background:' + C.soft + ';border-top:1px solid ' + C.grid + '}' +
      '.fc-code-out-head{display:flex;align-items:center;font-family:' + mono + ';font-size:14px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:' + C.teal + ';margin-bottom:9px}' +
      '.fc-code-out-head .fc-ran::before{content:"";width:15px;height:15px;border-radius:50%;background:' + C.teal + ';display:inline-block;margin-right:8px;vertical-align:-2px}' +
      '.fc-code-out-body{margin:0;font-family:' + mono + ';font-size:21px;line-height:1.55;color:' + C.ink + ';white-space:pre;overflow-x:auto;font-weight:700}' +
      '.fc-cm{color:' + C.faint + ';font-style:italic}.fc-st{color:' + C.teal + '}.fc-nu{color:' + C.orange + '}' +
      '.fc-kw{color:' + C.blue + ';font-weight:700}.fc-bi{color:' + C.blueDk + '}.fc-fn{color:' + C.orange + '}.fc-va{color:' + C.ink + '}.fc-pn{color:' + C.sub + '}' +
      '@keyframes fcRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '@media (prefers-reduced-motion:no-preference){[data-deck-active] .fc-code-out{animation:fcRise .55s cubic-bezier(.23,1,.32,1) both}}';
    document.head.appendChild(s);
  }
  class Code extends FLBase {
    build() {
      fcInject();
      const srcEl = this.querySelector('[data-fc="src"]'), outEl = this.querySelector('[data-fc="out"]');
      const raw = srcEl ? fcDedent(srcEl.textContent) : '', out = outEl ? fcDedent(outEl.textContent) : '';
      // Do NOT clear light-DOM children (the <script data-fc> config): deck-stage.js
      // clones/moves slides and will removeChild nodes we deleted. The <script>
      // tags are inert/invisible, so leave them and render the card alongside.
      const card = elt('div', 'fl-card fc-code-card');
      const bar = elt('div', 'fc-code-bar');
      const dots = elt('span', 'fc-dots', '<i></i><i></i><i></i>');
      const file = elt('span', 'fc-code-file', fcEsc(this.getAttribute('file') || this.getAttribute('lang') || 'python'));
      const copy = elt('button', 'fc-code-copy', 'Copy'); copy.type = 'button'; copy.setAttribute('aria-label', 'Copy code to clipboard');
      copy.onclick = () => { const ok = () => { copy.textContent = 'Copied'; setTimeout(() => (copy.textContent = 'Copy'), 1600); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(raw).then(ok, () => {}); else ok(); };
      bar.append(dots, file, copy);
      const pre = elt('pre', 'fc-code-src'); pre.innerHTML = fcHi(raw);
      card.append(bar, pre);
      if (out) {
        const o = elt('div', 'fc-code-out'); o.setAttribute('role', 'region'); o.setAttribute('aria-label', 'Program output');
        const cap = this.getAttribute('caption');
        const head = elt('div', 'fc-code-out-head', '<span class="fc-ran">this actually ran' + (cap ? ' ; ' + fcEsc(cap) : '') + '</span>');
        const body = elt('pre', 'fc-code-out-body', fcEsc(out));
        o.append(head, body); card.append(o);
      }
      this.append(card);
    }
  }
  customElements.define('fc-code', Code);

  /* ====================================================================== */
  /* fc-ladder; the ONE "start smallest -> scale" staircase (plan 017).     */
  /* Reused for backtest L0-L3, build-vs-buy, monitoring, adoption maturity  */
  /* (one design, four instantiations -> no ladder fatigue). Reads <li       */
  /* data-tool data-note> children as rungs. Draggable + keyboard "you are   */
  /* here" marker; caption updates per rung. Reduced-motion -> discrete.     */
  /* ====================================================================== */
  let flLadCss = false;
  function flLadInject() {
    if (flLadCss) return; flLadCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-ladder{display:block;width:100%}fc-ladder>li{display:none}' +
      '.fc-lad-wrap{position:relative;padding:54px 22px 20px}' +
      '.fc-lad-track{display:flex;align-items:flex-end;gap:12px}' +
      '.fc-rung{flex:1;min-width:0;appearance:none;cursor:pointer;text-align:left;display:flex;flex-direction:column;justify-content:flex-end;gap:5px;padding:15px 16px;background:' + C.soft + ';border:1px solid ' + C.divider + ';border-bottom:4px solid ' + C.divider + ';border-radius:10px 10px 4px 4px;transition:border-color .18s,background .18s,box-shadow .18s}' +
      '.fc-rung:hover{background:#fff}' +
      '.fc-rung:focus-visible{outline:3px solid ' + C.blue + ';outline-offset:2px}' +
      '.fc-rung-i{font-family:' + mono + ';font-size:14px;font-weight:700;color:' + C.faint + ';letter-spacing:.5px}' +
      '.fc-rung-l{font-size:22px;font-weight:800;line-height:1.08;color:' + C.ink + '}' +
      '.fc-rung-t{font-size:16px;color:' + C.sub + ';line-height:1.24}' +
      '.fc-rung.lit{border-bottom-color:' + C.blue + ';background:' + C.blueLt + '}' +
      '.fc-rung.active{border-color:' + C.blue + ';border-bottom-color:' + C.blue + ';background:#fff;box-shadow:0 10px 30px -16px ' + C.blue + '}' +
      '.fc-lad-flag{position:absolute;top:8px;left:0;transform:translateX(-50%);background:' + C.blue + ";color:#fff;font-family:" + mono + ';font-size:13px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;padding:8px 13px;border-radius:8px;white-space:nowrap;cursor:grab;transition:left .22s cubic-bezier(.23,1,.32,1);touch-action:none;z-index:3}' +
      '.fc-lad-flag::after{content:"";position:absolute;left:50%;bottom:-5px;transform:translateX(-50%) rotate(45deg);width:11px;height:11px;background:' + C.blue + '}' +
      '.fc-lad-flag.drag{cursor:grabbing}' +
      '.fc-lad-flag:focus-visible{outline:3px solid ' + C.ink + ';outline-offset:3px}' +
      '.fc-lad-cap{padding:16px 22px 22px;font-size:20px;color:' + C.sub + ';line-height:1.4;min-height:2.6em}' +
      '.fc-lad-cap b{color:' + C.ink + '}' +
      '@media (prefers-reduced-motion:reduce){.fc-lad-flag{transition:none}.fc-rung{transition:none}}';
    document.head.appendChild(s);
  }
  class Ladder extends FLBase {
    build() {
      flLadInject();
      this.rungs = Array.from(this.querySelectorAll('li')).map(li => ({
        label: (li.textContent || '').trim(),
        tool: li.getAttribute('data-tool') || '',
        note: li.getAttribute('data-note') || ''
      }));
      this.lit = parseInt(this.getAttribute('lit'), 10); if (isNaN(this.lit)) this.lit = -1;
      this.here = clamp(parseInt(this.getAttribute('here'), 10) || 0, 0, Math.max(0, this.rungs.length - 1));
      this.defCap = this.getAttribute('caption') || '';
      // Do NOT clear light-DOM children: deck-stage.js clones/moves slides and
      // will removeChild config nodes we deleted. Leave the <li> in place
      // (hidden via CSS) and render the staircase alongside them.
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const wrap = elt('div', 'fc-lad-wrap'); this.wrap = wrap;
      const flag = elt('div', 'fc-lad-flag', '<b>you are here</b>'); this.flag = flag;
      flag.tabIndex = 0; flag.setAttribute('role', 'slider'); flag.setAttribute('aria-label', 'You are here; drag or use arrow keys to set your current maturity rung');
      flag.setAttribute('aria-valuemin', '0'); flag.setAttribute('aria-valuemax', String(Math.max(0, this.rungs.length - 1)));
      const track = elt('div', 'fc-lad-track'); this.track = track;
      track.setAttribute('role', 'group'); track.setAttribute('aria-label', 'Maturity ladder');
      this.rungEls = this.rungs.map((r, i) => {
        const step = elt('button', 'fc-rung'); step.type = 'button';
        step.style.minHeight = (92 + i * 24) + 'px';
        step.innerHTML = '<span class="fc-rung-i">L' + i + '</span><span class="fc-rung-l">' + fcEsc(r.label) + '</span>' + (r.tool ? '<span class="fc-rung-t">' + fcEsc(r.tool) + '</span>' : '');
        if (i === this.lit) step.classList.add('lit');
        step.setAttribute('aria-label', 'Rung ' + i + ': ' + r.label + (r.tool ? ', ' + r.tool : ''));
        step.onclick = () => this.setHere(i);
        track.append(step);
        return step;
      });
      const key = e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); this.setHere(this.here + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); this.setHere(this.here - 1); }
      };
      flag.addEventListener('keydown', key);
      const toRung = clientX => { let best = 0, bd = Infinity; this.rungEls.forEach((el, i) => { const b = el.getBoundingClientRect(); const d = Math.abs(clientX - (b.left + b.width / 2)); if (d < bd) { bd = d; best = i; } }); return best; };
      let dragging = false;
      flag.addEventListener('pointerdown', e => { dragging = true; flag.setPointerCapture(e.pointerId); flag.classList.add('drag'); });
      flag.addEventListener('pointermove', e => { if (dragging) this.setHere(toRung(e.clientX)); });
      flag.addEventListener('pointerup', () => { dragging = false; flag.classList.remove('drag'); });
      const cap = elt('div', 'fc-lad-cap'); this.capEl = cap;
      wrap.append(flag, track); card.append(wrap, cap); this.append(card);
      this._afterSize = () => this.positionFlag();
      this.setHere(this.here);
      requestAnimationFrame(() => this.positionFlag());
      setTimeout(() => this.positionFlag(), 90);
    }
    setHere(i) {
      i = clamp(i, 0, this.rungs.length - 1); this.here = i;
      this.rungEls.forEach((el, k) => el.classList.toggle('active', k === i));
      const r = this.rungs[i] || {};
      this.capEl.innerHTML = r.note || this.defCap; // notes/caption are author-authored deck HTML
      this.flag.setAttribute('aria-valuenow', String(i));
      this.flag.setAttribute('aria-valuetext', 'Rung ' + i + (r.label ? ': ' + r.label : ''));
      this.positionFlag();
    }
    positionFlag() {
      if (!this.rungEls || !this.rungEls[this.here] || !this.wrap) return;
      const wb = this.wrap.getBoundingClientRect(), eb = this.rungEls[this.here].getBoundingClientRect();
      if (eb.width) this.flag.style.left = (eb.left - wb.left + eb.width / 2) + 'px';
    }
  }
  customElements.define('fc-ladder', Ladder);
  /* ====================================================================== */
  /* fc-metric-verdict; "One Dataset, Four Verdicts" (plan 011). The same    */
  /* forecasts earn contradictory grades under MAPE/WAPE/RMSE/MASE; the      */
  /* zero-demand SKU breaks MAPE (inf). Live-computed, metric toggle.        */
  /* ====================================================================== */
  const MV_SKUS = [
    { name: 'Retail SKU', tag: 'steady seller', a: [420, 440, 460, 450, 470, 490, 480, 500], f: [430, 435, 455, 460, 465, 480, 485, 495] },
    { name: 'New SKU', tag: 'intermittent, many zeros', a: [0, 2, 0, 0, 5, 0, 3, 0], f: [1, 1, 1, 2, 3, 1, 2, 1] },
    { name: 'Hero SKU', tag: 'huge volume', a: [9200, 9400, 9100, 9600, 9300, 9800, 9500, 9700], f: [9000, 9500, 9300, 9400, 9500, 9600, 9600, 9500] },
    { name: 'Promo SKU', tag: 'one big spike', a: [300, 320, 310, 1400, 340, 330, 350, 320], f: [310, 315, 320, 360, 345, 335, 345, 330] },
    { name: 'Slow mover', tag: 'low volume', a: [3, 2, 4, 1, 3, 2, 5, 2], f: [2, 3, 2, 2, 4, 1, 3, 3] }
  ];
  const MV_METRICS = [
    { key: 'mape', label: 'MAPE', note: 'undefined on the zero-demand SKU and it savages low-volume items. It also quietly rewards under-forecasting.' },
    { key: 'wmape', label: 'WAPE', note: 'weights every error by volume, so the SKUs that move the most cash dominate. The honest retail default.' },
    { key: 'rmse', label: 'RMSE', note: 'squares the errors, so it screams about the promo miss and the big-volume SKUs. Best for catching large absolute misses.' },
    { key: 'mase', label: 'MASE', note: 'asks the only question a baseline cares about: did we beat naive? Below 1.0 means yes.' }
  ];
  function mvVerdicts(a, f) {
    const n = a.length; let ae = 0, se = 0, sa = 0, sfa = 0, ape = 0, hasZero = false;
    for (let i = 0; i < n; i++) { const e = f[i] - a[i]; ae += Math.abs(e); se += e * e; sa += Math.abs(a[i]); sfa += e; if (a[i] === 0) hasZero = true; else ape += Math.abs(e) / Math.abs(a[i]); }
    let naive = 0; for (let i = 1; i < n; i++) naive += Math.abs(a[i] - a[i - 1]); naive /= (n - 1) || 1;
    const mae = ae / n;
    return {
      mape: hasZero ? Infinity : 100 * ape / n,
      wmape: 100 * ae / (sa || 1),
      rmse: Math.sqrt(se / n),
      mase: naive ? mae / naive : Infinity,
      bias: 100 * sfa / (sa || 1)   // signed: >0 over-forecast, <0 under-forecast
    };
  }
  function mvFmt(v, k) {
    if (!isFinite(v)) return '<span class="fc-mv-inf">inf</span>';
    if (k === 'mase') return v.toFixed(2);
    if (k === 'rmse') return v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1);
    return v.toFixed(v < 10 ? 1 : 0) + '<span class="fc-mv-pct">%</span>';
  }
  function mvBias(b) {
    const dir = b > 1.5 ? 'over' : b < -1.5 ? 'under' : 'ok';
    const txt = dir === 'over' ? 'over +' + b.toFixed(0) + '%' : dir === 'under' ? 'under ' + b.toFixed(0) + '%' : 'even';
    return '<span class="fc-mv-b ' + dir + '">' + txt + '</span>';
  }
  let mvCss = false;
  function mvInject() {
    if (mvCss) return; mvCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-metric-verdict{display:block;width:100%}' +
      '.fc-mv-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px 22px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-mv-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-mv-table{padding:6px 14px 10px}' +
      '.fc-mv-row{display:grid;grid-template-columns:2.1fr 1fr 1fr 1fr 1fr 1.15fr;align-items:center}' +
      '.fc-mv-head{border-bottom:1px solid ' + C.grid + '}' +
      '.fc-mv-c{padding:13px 14px;font-variant-numeric:tabular-nums}' +
      '.fc-mv-head .fc-mv-c{font-family:' + mono + ';font-size:15px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:' + C.sub + '}' +
      '.fc-mv-m{text-align:right;border-radius:8px 8px 0 0}' +
      '.fc-mv-head .fc-mv-m.active{color:' + C.blue + ';background:' + C.blueLt + '}' +
      '.fc-mv-bias{text-align:right}' +
      '.fc-mv-name b{display:block;font-size:22px;color:' + C.ink + ';font-weight:800;line-height:1.12}' +
      '.fc-mv-name span{display:block;font-size:15px;color:' + C.faint + ';font-weight:600}' +
      '.fc-mv-val{text-align:right;font-size:24px;font-weight:700;color:' + C.faint + ';transition:color .18s,background .18s;border-radius:8px}' +
      '.fc-mv-val .fc-mv-pct{font-size:15px;margin-left:1px}' +
      '.fc-mv-val.best{background:rgba(10,126,140,.13);color:' + C.teal + '}' +
      '.fc-mv-val.mid{background:' + C.blueLt + ';color:' + C.blueDk + '}' +
      '.fc-mv-val.worst{background:rgba(250,46,62,.10);color:' + C.red + '}' +
      '.fc-mv-inf{font-weight:800;color:' + C.red + '}' +
      '.fc-mv-b{font-family:' + mono + ';font-size:15px;font-weight:700;padding:5px 9px;border-radius:6px;white-space:nowrap;display:inline-block}' +
      '.fc-mv-b.over{background:rgba(246,134,40,.16);color:#A85A16}' +
      '.fc-mv-b.under{background:rgba(8,102,255,.10);color:' + C.blueDk + '}' +
      '.fc-mv-b.ok{background:' + C.soft + ';color:' + C.sub + '}' +
      '.fc-mv-cap{padding:15px 22px 20px;font-size:19px;color:' + C.sub + ';line-height:1.4;border-top:1px solid ' + C.grid + ';min-height:2.5em}' +
      '.fc-mv-cap b{color:' + C.ink + '}' +
      '@media (prefers-reduced-motion:reduce){.fc-mv-val{transition:none}}';
    document.head.appendChild(s);
  }
  class MetricVerdict extends FLBase {
    build() {
      mvInject();
      this.rows = MV_SKUS.map(s => ({ s, v: mvVerdicts(s.a, s.f) }));
      this.metric = this.getAttribute('metric') || 'wmape';
      this.innerHTML = '';
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-mv-bar');
      const lead = elt('div', 'fc-mv-lead', 'Same forecasts. Pick a metric, watch the verdict flip.');
      const seg = segmented(MV_METRICS.map(m => ({ label: m.label, value: m.key })), this.metric, k => this.setMetric(k));
      this.seg = seg; bar.append(lead, seg);
      const tbl = elt('div', 'fc-mv-table');
      const head = elt('div', 'fc-mv-row fc-mv-head');
      head.append(elt('div', 'fc-mv-c fc-mv-name', 'SKU'));
      MV_METRICS.forEach(m => { const c = elt('div', 'fc-mv-c fc-mv-m', m.label); c.dataset.k = m.key; head.append(c); });
      head.append(elt('div', 'fc-mv-c fc-mv-bias', 'Bias'));
      tbl.append(head);
      this.cellEls = this.rows.map(r => {
        const row = elt('div', 'fc-mv-row');
        row.append(elt('div', 'fc-mv-c fc-mv-name', '<b>' + fcEsc(r.s.name) + '</b><span>' + fcEsc(r.s.tag) + '</span>'));
        const cells = {};
        MV_METRICS.forEach(m => { const c = elt('div', 'fc-mv-c fc-mv-val'); c.dataset.k = m.key; c.innerHTML = mvFmt(r.v[m.key], m.key); cells[m.key] = c; row.append(c); });
        row.append(elt('div', 'fc-mv-c fc-mv-bias', mvBias(r.v.bias)));
        tbl.append(row); return cells;
      });
      const cap = elt('div', 'fc-mv-cap'); this.capEl = cap;
      card.append(bar, tbl, cap); this.append(card);
      this.setMetric(this.metric);
    }
    setMetric(k) {
      this.metric = k;
      const vals = this.rows.map(r => r.v[k]).filter(v => isFinite(v));
      const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      this.querySelectorAll('.fc-mv-m').forEach(c => c.classList.toggle('active', c.dataset.k === k));
      this.cellEls.forEach((cells, ri) => Object.keys(cells).forEach(mk => {
        const c = cells[mk]; c.classList.remove('best', 'mid', 'worst');
        if (mk !== k) return;
        const v = this.rows[ri].v[k];
        if (!isFinite(v)) c.classList.add('worst');
        else if (hi === lo) c.classList.add('mid');
        else { const t = (v - lo) / (hi - lo); c.classList.add(t < 0.34 ? 'best' : t > 0.66 ? 'worst' : 'mid'); }
      }));
      const m = MV_METRICS.find(x => x.key === k);
      this.capEl.innerHTML = '<b>' + m.label + '</b> ' + m.note;
      if (this.seg && this.seg._set) this.seg._set(k);
    }
  }
  customElements.define('fc-metric-verdict', MetricVerdict);

  /* ====================================================================== */
  /* fc-backtest-folds; "One Number Lies, Show Me the Folds" (plan 011).     */
  /* Rolling-origin over the canonical SKU (mirrors the tested TS            */
  /* rollingOrigin). Single window looks confident; reveal all folds to see  */
  /* the mean +/- spread the one number was hiding.                          */
  /* ====================================================================== */
  function btForecast(train, h) { return M.holt(train, h, { alpha: 0.3, beta: 0.08 }).fc; }
  function btFolds(y, h, nWindows, step) {
    const first = y.length - h - (nWindows - 1) * step, out = [];
    for (let k = 0; k < nWindows; k++) {
      const cut = first + k * step, fc = btForecast(y.slice(0, cut), h), act = y.slice(cut, cut + h);
      const num = act.reduce((s, v, i) => s + Math.abs(v - fc[i]), 0);
      const den = act.reduce((s, v) => s + Math.abs(v), 0) || 1;
      out.push({ cut, fc, act, error: 100 * num / den });
    }
    return out;
  }
  let btCss = false;
  function btInject() {
    if (btCss) return; btCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      '.fc-bt-badge{display:flex;flex-direction:column;gap:5px;flex:1 1 340px;min-width:280px}' +
      '.fc-bt-one{font-size:22px;color:' + C.ink + '}.fc-bt-one b{color:' + C.blue + '}' +
      '.fc-bt-hint{font-size:17px;color:' + C.sub + '}' +
      '.fc-bt-list{font-family:' + mono + ';font-size:26px;font-weight:700;color:' + C.ink + ';letter-spacing:1px}' +
      '.fc-bt-sum{font-size:18px;color:' + C.sub + '}.fc-bt-sum b{color:' + C.blue + '}';
    document.head.appendChild(s);
  }
  class BacktestFolds extends FLBase {
    build() {
      btInject();
      const ds = getDS('canon'); this.y = ds.y; this.h = 13; this.nW = 5; this.step = 13;
      this.folds = btFolds(this.y, this.h, this.nW, this.step);
      this.sel = 0; this.revealed = false;
      const s = shell(this, 'clamp(280px,38vh,440px)'); this.s = s; this._charts = [s.chart];
      const sl = slider('Which window did you test on?', 1, this.nW, 1, 1, v => 'fold ' + Math.round(v), v => { this.sel = Math.round(v) - 1; this.revealed = false; this.revealBtn.textContent = 'Reveal all folds'; this.render(); });
      this.sl = sl;
      const btn = elt('button', 'fl-btn', 'Reveal all folds'); btn.type = 'button'; this.revealBtn = btn;
      btn.onclick = () => { this.revealed = !this.revealed; btn.textContent = this.revealed ? 'Back to one number' : 'Reveal all folds'; this.render(); };
      const badge = elt('div', 'fc-bt-badge'); this.badge = badge;
      s.controls.append(sl, btn, badge);
      this.render();
    }
    render() {
      const y = this.y, h = this.h;
      const lo = Math.min.apply(null, y), hi = Math.max.apply(null, y);
      const cfg = { series: [{ pts: y.map((v, i) => ({ x: i, y: v })), color: C.ink, width: 2.2 }], regions: [], ymin: lo - (hi - lo) * 0.12, ymax: hi + (hi - lo) * 0.08 };
      if (!this.revealed) {
        const f = this.folds[this.sel], cut = f.cut;
        cfg.regions.push({ x0: cut, x1: cut + h, color: 'rgba(8,102,255,.07)' });
        cfg.marker = cut; cfg.markerLabel = 'trained to here';
        cfg.series.push({ pts: [{ x: cut - 1, y: y[cut - 1] }].concat(f.fc.map((v, i) => ({ x: cut + i, y: v }))), color: C.blue, width: 3.4, dash: [7, 5] });
        this.badge.innerHTML = '<span class="fc-bt-one">This window: <b>WAPE ' + f.error.toFixed(0) + '%</b></span><span class="fc-bt-hint">Looks confident. But it is one draw.</span>';
      } else {
        this.folds.forEach((f, k) => {
          cfg.regions.push({ x0: f.cut, x1: f.cut + h, color: k % 2 ? 'rgba(8,102,255,.06)' : 'rgba(246,134,40,.07)' });
          cfg.series.push({ pts: [{ x: f.cut - 1, y: y[f.cut - 1] }].concat(f.fc.map((v, i) => ({ x: f.cut + i, y: v }))), color: k % 2 ? C.blue : C.orange, width: 2, dash: [5, 4] });
        });
        const errs = this.folds.map(f => f.error), mean = errs.reduce((s, v) => s + v, 0) / errs.length;
        const sd = Math.sqrt(errs.reduce((s, v) => s + (v - mean) ** 2, 0) / (errs.length - 1));
        this.badge.innerHTML = '<span class="fc-bt-list">' + errs.map(e => e.toFixed(0) + '%').join(' &middot; ') + '</span><span class="fc-bt-sum">mean <b>' + mean.toFixed(0) + '%</b>, spread &#177;' + sd.toFixed(0) + '%. A single split could have reported any one of these.</span>';
      }
      this.s.chart.setData(cfg);
    }
  }
  customElements.define('fc-backtest-folds', BacktestFolds);

  /* ====================================================================== */
  /* fc-nine-box; the automate-vs-augment decision as a SEGMENTATION (012).  */
  /* ABC (value) x XYZ (volatility) 3x3; every cell maps to one operating    */
  /* mode (automate / exception-review / human-in-loop / do-not-forecast).   */
  /* The canonical SKU is seeded onto its cell; click any cell to read the   */
  /* mode + why. Mirrors the tested operatingMode/xyzClass in forecast.ts.   */
  /* ====================================================================== */
  function nbXyz(cv) { return cv < 0.5 ? 'X' : cv < 1.0 ? 'Y' : 'Z'; }
  const NB_MODES = {
    A: { X: 'automate', Y: 'human', Z: 'human' },
    B: { X: 'automate', Y: 'review', Z: 'buffer' },
    C: { X: 'review', Y: 'buffer', Z: 'buffer' }
  };
  const NB_META = {
    automate: { label: 'Automate', desc: 'full-auto, exception alerts', color: C.teal, bg: C.tealLt },
    review: { label: 'Exception review', desc: 'model proposes, planner signs off', color: C.orange, bg: C.orangeLt },
    human: { label: 'Human in the loop', desc: 'high value + volatile, keep a planner', color: C.red, bg: C.redLt },
    buffer: { label: 'Do not forecast', desc: 'erratic + low value, just buffer', color: C.sub, bg: 'rgba(176,179,184,.16)' }
  };
  const NB_ABC = [{ k: 'A', t: 'High value' }, { k: 'B', t: 'Mid value' }, { k: 'C', t: 'Low value' }];
  const NB_XYZ = [{ k: 'X', t: 'Stable' }, { k: 'Y', t: 'Variable' }, { k: 'Z', t: 'Erratic' }];
  let nbCss = false;
  function nbInject() {
    if (nbCss) return; nbCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-nine-box{display:block;width:100%}' +
      '.fc-nb-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:15px 20px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-nb-barleft{display:flex;align-items:center;gap:16px;flex-wrap:wrap}' +
      '.fc-nb-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-nb-legend{display:flex;gap:16px;flex-wrap:wrap}' +
      '.fc-nb-lg{display:flex;align-items:center;gap:7px;font-size:15px;font-weight:700;color:' + C.sub + '}' +
      '.fc-nb-lg i{width:14px;height:14px;border-radius:4px;display:inline-block}' +
      '.fc-nb-grid{display:grid;grid-template-columns:118px repeat(3,1fr);gap:9px;padding:16px 20px 6px}' +
      '.fc-nb-corner{font-family:' + mono + ';font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:' + C.faint + ';display:flex;align-items:flex-end;padding-bottom:6px;line-height:1.2}' +
      '.fc-nb-colh{text-align:center;padding:4px 0 6px}' +
      '.fc-nb-colh b{display:block;font-size:19px;font-weight:800;color:' + C.ink + '}' +
      '.fc-nb-colh span{font-family:' + mono + ';font-size:13px;font-weight:700;color:' + C.faint + '}' +
      '.fc-nb-rowh{display:flex;flex-direction:column;justify-content:center;padding-right:6px}' +
      '.fc-nb-rowh b{font-size:19px;font-weight:800;color:' + C.ink + '}' +
      '.fc-nb-rowh span{font-family:' + mono + ';font-size:13px;font-weight:700;color:' + C.faint + '}' +
      '.fc-nb-cell{position:relative;appearance:none;text-align:left;cursor:pointer;border-radius:12px;padding:13px 15px;min-height:104px;border:2px solid transparent;display:flex;flex-direction:column;justify-content:flex-end;gap:3px;transition:transform .16s,box-shadow .16s,border-color .16s}' +
      '.fc-nb-cell:hover{transform:translateY(-2px)}' +
      '.fc-nb-cell:focus-visible{outline:3px solid ' + C.blue + ';outline-offset:2px}' +
      '.fc-nb-cell .m{font-size:20px;font-weight:850;line-height:1.02}' +
      '.fc-nb-cell .d{font-size:14px;line-height:1.22;color:' + C.sub + '}' +
      '.fc-nb-cell.active{border-color:' + C.ink + ';box-shadow:0 12px 30px -14px rgba(8,8,9,.55)}' +
      '.fc-nb-dot{position:absolute;top:9px;right:9px;width:26px;height:26px;border-radius:50%;background:' + C.blue + ';border:3px solid ' + C.white + ';box-shadow:0 2px 9px rgba(8,102,255,.5);transition:opacity .16s}' +
      '.fc-nb-dot::after{content:"you are here";position:absolute;right:0;top:32px;font-family:' + mono + ';font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:' + C.blue + ';white-space:nowrap}' +
      '.fc-nb-cap{padding:15px 20px 20px;border-top:1px solid ' + C.grid + ';font-size:20px;color:' + C.sub + ';line-height:1.4;min-height:2.5em}' +
      '.fc-nb-cap b{color:' + C.ink + '}.fc-nb-cap .tag{font-weight:800}' +
      '@media (prefers-reduced-motion:reduce){.fc-nb-cell,.fc-nb-dot{transition:none}}';
    document.head.appendChild(s);
  }
  class NineBox extends FLBase {
    build() {
      nbInject();
      const ds = getDS('canon');
      const m = mean(ds.y) || 1;
      this.cv = std(ds.y) / m;
      this.abc = 'A'; this.xyz = nbXyz(this.cv);   // seed: the hero retail SKU on its own volatility
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-nb-bar');
      const left = elt('div', 'fc-nb-barleft');
      left.append(elt('div', 'fc-nb-lead', 'Segment first, then choose a mode. Click a cell.'));
      const play = elt('button', 'fl-btn', 'Play a SKU lifecycle'); play.type = 'button';
      play.setAttribute('aria-label', 'Play a SKU lifecycle: watch one product migrate across segments');
      play.onclick = () => this.runLifecycle();
      this.playBtn = play; left.append(play);
      const leg = elt('div', 'fc-nb-legend');
      ['automate', 'review', 'human', 'buffer'].forEach(k => {
        const it = NB_META[k]; const g = elt('div', 'fc-nb-lg', '<i style="background:' + it.color + '"></i>' + it.label);
        leg.append(g);
      });
      bar.append(left, leg);
      const grid = elt('div', 'fc-nb-grid');
      grid.append(elt('div', 'fc-nb-corner', 'value &#8595; / volatility &#8594;'));
      NB_XYZ.forEach(x => grid.append(elt('div', 'fc-nb-colh', '<b>' + x.t + '</b><span>' + x.k + '</span>')));
      this.cellEls = {};
      NB_ABC.forEach(a => {
        grid.append(elt('div', 'fc-nb-rowh', '<b>' + a.t + '</b><span>' + a.k + '</span>'));
        NB_XYZ.forEach(x => {
          const mode = NB_MODES[a.k][x.k], meta = NB_META[mode];
          const cell = elt('button', 'fc-nb-cell'); cell.type = 'button';
          cell.style.background = meta.bg;
          cell.innerHTML = '<span class="m" style="color:' + meta.color + '">' + meta.label + '</span><span class="d">' + meta.desc + '</span>';
          cell.setAttribute('aria-label', a.t + ', ' + x.t + ': ' + meta.label + ', ' + meta.desc);
          cell.onclick = () => { this.stopLifecycle(); this.setCell(a.k, x.k); };
          this.cellEls[a.k + x.k] = cell;
          grid.append(cell);
        });
      });
      const cap = elt('div', 'fc-nb-cap'); this.capEl = cap;
      card.append(bar, grid, cap); this.append(card);
      this.setCell(this.abc, this.xyz);
    }
    setCell(abc, xyz, note) {
      this.abc = abc; this.xyz = xyz;
      const key = abc + xyz, mode = NB_MODES[abc][xyz], meta = NB_META[mode];
      Object.keys(this.cellEls).forEach(k => {
        const cell = this.cellEls[k]; const on = k === key;
        cell.classList.toggle('active', on);
        const old = cell.querySelector('.fc-nb-dot'); if (old) old.remove();
        if (on) { const d = elt('div', 'fc-nb-dot'); cell.appendChild(d); }
      });
      if (note) { this.capEl.innerHTML = note; return; }
      const aT = NB_ABC.find(a => a.k === abc).t.toLowerCase(), xT = NB_XYZ.find(x => x.k === xyz).t.toLowerCase();
      this.capEl.innerHTML = '<b>' + aT + ', ' + xT + '</b> &#8594; <span class="tag" style="color:' + meta.color + '">' + meta.label + '</span> &#8212; ' + meta.desc + '.';
    }
    stopLifecycle() {
      if (this._lcTimer) { clearTimeout(this._lcTimer); this._lcTimer = null; }
      this._playing = false; if (this.playBtn) this.playBtn.disabled = false;
    }
    runLifecycle() {
      if (this._playing) return;
      const tag = (c, t) => '<span class="tag" style="color:' + c + '">' + t + '</span>';
      const path = [
        { c: 'CZ', n: '<b>New launch</b> &#8212; low volume, erratic. ' + tag(C.sub, 'Do not forecast') + ': hold a buffer and watch.' },
        { c: 'CY', n: '<b>Finding demand</b> &#8212; still low value, less erratic. ' + tag(C.sub, 'Do not forecast') + ' yet.' },
        { c: 'BY', n: '<b>Growing</b> &#8212; mid value, variable. ' + tag(C.orange, 'Exception review') + ': model proposes, planner signs off.' },
        { c: 'BX', n: '<b>Stabilizing</b> &#8212; mid value, steady demand. ' + tag(C.teal, 'Automate') + ' with alerts.' },
        { c: 'AX', n: '<b>Mature staple</b> &#8212; high value, stable. ' + tag(C.teal, 'Automate') + '. Re-score every quarter: SKUs migrate.' }
      ];
      if (reducedMotion()) { const p = path[path.length - 1]; this.setCell(p.c[0], p.c[1], p.n); return; }
      this._playing = true; this.playBtn.disabled = true;
      let i = 0;
      const step = () => {
        const p = path[i]; this.setCell(p.c[0], p.c[1], p.n); i++;
        if (i < path.length) this._lcTimer = setTimeout(step, 1150);
        else { this._playing = false; this.playBtn.disabled = false; this._lcTimer = null; }
      };
      step();
    }
  }
  customElements.define('fc-nine-box', NineBox);

  /* ====================================================================== */
  /* fc-fva-waterfall; Forecast Value Add in dollars (plan 012). Cost of     */
  /* error per touchpoint: naive -> statistical -> +planner override ->      */
  /* +sales consensus. The override bar RISES (overrides destroy value on    */
  /* this SKU). %<->$ toggle exposes the "percent-FVA invites gaming"        */
  /* critique. Costs computed from a pre-baked example (mirrors the tested   */
  /* forecastValueAdd in forecast.ts). Reduced-motion: bars set final size.  */
  /* ====================================================================== */
  const FVA_ACTUAL = [520, 480, 610, 590, 640, 700, 560, 620, 680, 590, 650, 710, 600];
  const FVA_STAGES = [
    { key: 'naive', label: 'Naive', desc: 'same as last week', color: C.faint, f: [560, 520, 480, 610, 590, 640, 700, 560, 620, 680, 590, 650, 710] },
    { key: 'stat', label: 'Statistical', desc: 'AutoETS, no human', color: C.teal, f: [518, 495, 600, 588, 632, 685, 572, 616, 672, 600, 642, 702, 606] },
    { key: 'override', label: '+ Planner override', desc: 'optimism bias', color: C.red, f: [539, 515, 624, 612, 657, 712, 595, 641, 699, 624, 668, 730, 630] },
    { key: 'consensus', label: '+ Sales consensus', desc: 'averaged in', color: C.blue, f: [528, 505, 612, 600, 644, 698, 583, 628, 685, 612, 655, 716, 618] }
  ];
  const FVA_UNIT = 120;   // $ per unit of absolute error
  function fvaErr(a, f) { return a.reduce((s, v, i) => s + Math.abs(v - f[i]), 0); }
  let fvaCss = false;
  function fvaInject() {
    if (fvaCss) return; fvaCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-fva-waterfall{display:block;width:100%}' +
      '.fc-fva-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:15px 20px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-fva-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-fva-plot{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;align-items:end;padding:26px 24px 12px;height:clamp(240px,34vh,360px)}' +
      '.fc-fva-col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:10px}' +
      '.fc-fva-val{font-family:' + mono + ';font-size:24px;font-weight:800;color:' + C.ink + ';font-variant-numeric:tabular-nums}' +
      '.fc-fva-rect{width:100%;border-radius:9px 9px 0 0;min-height:3px;transition:height .6s cubic-bezier(.23,1,.32,1)}' +
      '.fc-fva-labels{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:10px 24px 20px}' +
      '.fc-fva-lb{text-align:center}' +
      '.fc-fva-lb b{display:block;font-size:19px;font-weight:800;color:' + C.ink + ';line-height:1.1}' +
      '.fc-fva-lb span{font-size:15px;color:' + C.faint + '}' +
      '.fc-fva-cap{padding:15px 22px 20px;border-top:1px solid ' + C.grid + ';font-size:19px;color:' + C.sub + ';line-height:1.4;min-height:2.4em}' +
      '.fc-fva-cap b{color:' + C.ink + '}' +
      '@media (prefers-reduced-motion:reduce){.fc-fva-rect{transition:none}}';
    document.head.appendChild(s);
  }
  class FvaWaterfall extends FLBase {
    build() {
      fvaInject();
      const naiveErr = fvaErr(FVA_ACTUAL, FVA_STAGES[0].f);
      this.rows = FVA_STAGES.map(st => {
        const e = fvaErr(FVA_ACTUAL, st.f);
        return { st, err: e, cost: e * FVA_UNIT, fva: naiveErr ? 1 - e / naiveErr : 0 };
      });
      this.mode = 'cost';
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-fva-bar');
      bar.append(elt('div', 'fc-fva-lead', 'Cost of error per touchpoint. Does each hand-off add value?'));
      const seg = segmented([{ label: 'Dollars', value: 'cost' }, { label: 'FVA %', value: 'fva' }], 'cost', k => this.setMode(k));
      this.seg = seg; bar.append(seg);
      const plot = elt('div', 'fc-fva-plot'); this.plot = plot;
      this.rectEls = []; this.valEls = [];
      this.rows.forEach(r => {
        const col = elt('div', 'fc-fva-col');
        const val = elt('div', 'fc-fva-val'); this.valEls.push(val);
        const rect = elt('div', 'fc-fva-rect'); rect.style.background = r.st.color; this.rectEls.push(rect);
        col.append(val, rect); plot.append(col);
      });
      const labels = elt('div', 'fc-fva-labels');
      this.rows.forEach(r => labels.append(elt('div', 'fc-fva-lb', '<b>' + r.st.label + '</b><span>' + r.st.desc + '</span>')));
      const cap = elt('div', 'fc-fva-cap'); this.capEl = cap;
      card.append(bar, plot, labels, cap); this.append(card);
      this.setMode('cost');
    }
    setMode(mode) {
      this.mode = mode;
      const cost = mode === 'cost';
      const vals = this.rows.map(r => cost ? r.cost : Math.max(0, r.fva));
      const hi = Math.max.apply(null, vals) || 1;
      this.rows.forEach((r, i) => {
        const v = vals[i];
        this.rectEls[i].style.height = (6 + 94 * v / hi) + '%';
        this.valEls[i].textContent = cost ? '$' + Math.round(r.cost / 1000) + 'k' : (r.fva <= 0 ? '0%' : Math.round(r.fva * 100) + '%');
      });
      const st = this.rows[1], ov = this.rows[2];   // statistical vs +override
      if (cost) {
        this.capEl.innerHTML = 'The model cut error to <b>$' + Math.round(st.cost / 1000) + 'k</b>. The planner override pushed it back up to <b style="color:' + C.red + '">$' + Math.round(ov.cost / 1000) + 'k</b> &#8212; the override destroyed value here. Measure it before you trust it.';
      } else {
        this.capEl.innerHTML = 'In percent, every stage looks positive &#8212; that is how percent-FVA gets gamed. The override adds <b style="color:' + C.red + '">' + Math.round(ov.fva * 100) + '%</b> vs the model\'s <b>' + Math.round(st.fva * 100) + '%</b>: less value, not more.';
      }
      if (this.seg && this.seg._set) this.seg._set(mode);
    }
  }
  customElements.define('fc-fva-waterfall', FvaWaterfall);

  /* ====================================================================== */
  /* fc-leakage; the Leakage Trap (PR-1, plan 014). "Backtest hero,          */
  /* production zero." A regressor that is fully known across the backtest   */
  /* eval window is a LEAK: in production its future values do not exist     */
  /* unless someone commits them each cycle ("owns" them). Toggle owned      */
  /* on/off: production WMAPE swings 6% <-> 17%. Reduced-motion friendly      */
  /* (state swap, no motion).                                                */
  /* ====================================================================== */
  let lkCss = false;
  function lkInject() {
    if (lkCss) return; lkCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-leakage{display:block;width:100%}' +
      '.fc-lk-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:15px 20px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-lk-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-lk-body{padding:22px 22px 6px;display:flex;flex-direction:column;gap:20px}' +
      '.fc-lk-track{display:flex;align-items:center;gap:18px}' +
      '.fc-lk-side{flex:0 0 190px}' +
      '.fc-lk-side b{display:block;font-size:21px;font-weight:800;color:' + C.ink + ';line-height:1.1}' +
      '.fc-lk-side span{font-size:15px;color:' + C.faint + '}' +
      '.fc-lk-strip{flex:1;display:flex;height:70px;border-radius:10px;overflow:hidden;position:relative;border:1px solid ' + C.grid + '}' +
      '.fc-lk-seg{display:flex;align-items:center;justify-content:center;text-align:center;font-size:16px;font-weight:700;padding:0 12px;line-height:1.15}' +
      '.fc-lk-train{flex:2.1;background:' + C.blueLt + ';color:' + C.blueDk + '}' +
      '.fc-lk-eval{flex:1.3;transition:background .2s,color .2s}' +
      '.fc-lk-known{background:rgba(10,126,140,.16);color:' + C.teal + '}' +
      '.fc-lk-unknown{color:' + C.sub + ';background:repeating-linear-gradient(45deg,' + C.soft + ',' + C.soft + ' 9px,rgba(176,179,184,.32) 9px,rgba(176,179,184,.32) 18px)}' +
      '.fc-lk-today{position:absolute;top:-6px;bottom:-6px;width:2px;background:' + C.ink + ';left:61.7%}' +
      '.fc-lk-today::after{content:"TODAY";position:absolute;top:-19px;left:50%;transform:translateX(-50%);font-family:' + mono + ';font-size:11px;font-weight:800;letter-spacing:.5px;color:' + C.ink + '}' +
      '.fc-lk-badge{flex:0 0 210px;text-align:right}' +
      '.fc-lk-badge .w{font-family:' + mono + ';font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}' +
      '.fc-lk-badge .t{display:block;font-size:15px;font-weight:700;margin-top:4px}' +
      '.fc-lk-cap{padding:16px 22px 20px;border-top:1px solid ' + C.grid + ';font-size:19px;color:' + C.sub + ';line-height:1.4;min-height:2.4em}' +
      '.fc-lk-cap b{color:' + C.ink + '}' +
      '@media (prefers-reduced-motion:reduce){.fc-lk-eval{transition:none}}';
    document.head.appendChild(s);
  }
  class Leakage extends FLBase {
    build() {
      lkInject();
      this.owned = false;
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-lk-bar');
      bar.append(elt('div', 'fc-lk-lead', 'The feature that wins the backtest may not exist in production.'));
      const seg = segmented([{ label: 'Not owned', value: 'no' }, { label: 'We own its future', value: 'yes' }], 'no', k => { this.owned = k === 'yes'; this.render(); });
      this.seg = seg; bar.append(seg);
      const body = elt('div', 'fc-lk-body');
      // backtest track (always leaked/known)
      const bt = elt('div', 'fc-lk-track');
      bt.innerHTML = '<div class="fc-lk-side"><b>Backtest world</b><span>you have the whole file</span></div>' +
        '<div class="fc-lk-strip"><div class="fc-lk-seg fc-lk-train">history</div><div class="fc-lk-seg fc-lk-eval fc-lk-known">promo feature: known</div></div>' +
        '<div class="fc-lk-badge"><span class="w" style="color:' + C.teal + '">6%</span><span class="t" style="color:' + C.teal + '">WMAPE, looks great</span></div>';
      // production track (owned toggles known/unknown)
      const pr = elt('div', 'fc-lk-track'); this.prTrack = pr;
      body.append(bt, pr);
      const cap = elt('div', 'fc-lk-cap'); this.capEl = cap;
      card.append(bar, body, cap); this.append(card);
      this.render();
    }
    render() {
      const owned = this.owned;
      const evalCls = owned ? 'fc-lk-known' : 'fc-lk-unknown';
      const evalTxt = owned ? 'promo feature: committed' : 'promo feature: ? unknown';
      const w = owned ? '6%' : '17%', wc = owned ? C.teal : C.red;
      const wt = owned ? 'WMAPE, safe' : 'WMAPE, the trap';
      this.prTrack.innerHTML = '<div class="fc-lk-side"><b>Production world</b><span>the future is blank</span></div>' +
        '<div class="fc-lk-strip"><div class="fc-lk-seg fc-lk-train">history</div><div class="fc-lk-seg fc-lk-eval ' + evalCls + '">' + evalTxt + '</div><div class="fc-lk-today"></div></div>' +
        '<div class="fc-lk-badge"><span class="w" style="color:' + wc + '">' + w + '</span><span class="t" style="color:' + wc + '">' + wt + '</span></div>';
      this.capEl.innerHTML = owned
        ? 'Someone commits the promo calendar every cycle, so the feature exists at forecast time. <b>No leak: production matches the backtest.</b> The rule: no owner, no feature.'
        : 'The backtest saw the promo feature across the whole window; production only has it up to today. The model trained on a value it will not have. <b>Backtest hero, production zero.</b>';
      if (this.seg && this.seg._set) this.seg._set(owned ? 'yes' : 'no');
    }
  }
  customElements.define('fc-leakage', Leakage);

  /* ====================================================================== */
  /* fc-deploy-arch; batch-vs-real-time cost dial (PR-2, plan 013).          */
  /* "It's boringly cheap." Most demand forecasting is a nightly batch job   */
  /* on CPU; real-time is ~50x the cost and rarely needed. Slider scales     */
  /* forecasts/day -> daily cost for each. Cadence pulses (batch slow,       */
  /* real-time continuous) are the signature motion; reduced-motion falls    */
  /* back to static cadence badges.                                          */
  /* ====================================================================== */
  const DA_BATCH = 0.0002, DA_RT = 0.01;   // $ per forecast, illustrative (AWS Forecast $0.20/1k tier; ~25-50x RT multiplier per Kumo.ai)
  function daCost(preds, rate) { const c = preds * rate; return c >= 1000 ? '$' + Math.round(c / 1000) + 'k' : c >= 1 ? '$' + Math.round(c) : '$' + c.toFixed(2); }
  let daCss = false;
  function daInject() {
    if (daCss) return; daCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-deploy-arch{display:block;width:100%}' +
      '.fc-da-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:15px 20px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-da-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-da-panels{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:22px}' +
      '.fc-da-p{border:1px solid ' + C.grid + ';border-radius:14px;padding:20px 22px;display:flex;flex-direction:column;gap:12px;position:relative}' +
      '.fc-da-p.batch{border-color:rgba(10,126,140,.4);background:rgba(10,126,140,.05)}' +
      '.fc-da-p.rt{background:' + C.soft + '}' +
      '.fc-da-h{display:flex;align-items:center;gap:12px}' +
      '.fc-da-dot{width:14px;height:14px;border-radius:50%;flex:0 0 auto}' +
      '.fc-da-dot.b{background:' + C.teal + ';animation:fcDaSlow 2.4s ease-in-out infinite}' +
      '.fc-da-dot.r{background:' + C.orange + ';animation:fcDaFast .5s ease-in-out infinite}' +
      '@keyframes fcDaSlow{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.55)}}' +
      '@keyframes fcDaFast{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}' +
      '.fc-da-h b{font-size:25px;font-weight:850;color:' + C.ink + '}' +
      '.fc-da-cad{font-family:' + mono + ';font-size:14px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:' + C.sub + ';margin-left:auto}' +
      '.fc-da-rate{font-family:' + mono + ';font-size:19px;color:' + C.sub + '}.fc-da-rate b{color:' + C.ink + ';font-size:22px}' +
      '.fc-da-cost{font-family:' + mono + ';font-size:40px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}' +
      '.fc-da-infra{font-size:16px;color:' + C.sub + ';line-height:1.3}' +
      '.fc-da-use{font-size:17px;font-weight:700}' +
      '.fc-da-x{display:inline-block;font-family:' + mono + ';font-size:14px;font-weight:800;color:' + C.red + ';background:' + C.redLt + ';padding:3px 9px;border-radius:7px;margin-left:8px;vertical-align:2px}' +
      '.fc-da-cap{padding:14px 22px 20px;border-top:1px solid ' + C.grid + ';font-size:19px;color:' + C.sub + ';line-height:1.4;min-height:2.4em}' +
      '.fc-da-cap b{color:' + C.ink + '}' +
      '@media (prefers-reduced-motion:reduce){.fc-da-dot{animation:none!important}}';
    document.head.appendChild(s);
  }
  class DeployArch extends FLBase {
    build() {
      daInject();
      this.preds = 100000;
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-da-bar');
      bar.append(elt('div', 'fc-da-lead', 'How it actually runs: a nightly batch job, not a real-time service.'));
      const sl = slider('forecasts per day', 3, 6, 1, 5, v => { const p = Math.pow(10, Math.round(v)); return p >= 1e6 ? '1M' : p >= 1000 ? (p / 1000) + 'k' : '' + p; }, v => { this.preds = Math.pow(10, Math.round(v)); this.render(); });
      this.sl = sl; bar.append(sl);
      const panels = elt('div', 'fc-da-panels');
      const b = elt('div', 'fc-da-p batch'); const r = elt('div', 'fc-da-p rt');
      this.bEl = b; this.rEl = r; panels.append(b, r);
      const cap = elt('div', 'fc-da-cap'); this.capEl = cap;
      card.append(bar, panels, cap); this.append(card);
      this.render();
    }
    render() {
      const p = this.preds;
      this.bEl.innerHTML =
        '<div class="fc-da-h"><span class="fc-da-dot b"></span><b>Batch</b><span class="fc-da-cad">nightly &middot; 1&times;/day</span></div>' +
        '<div class="fc-da-rate"><b>~$0.0002</b> / forecast</div>' +
        '<div class="fc-da-cost" style="color:' + C.teal + '">' + daCost(p, DA_BATCH) + '<span style="font-size:17px;color:' + C.sub + ';font-weight:600"> / day</span></div>' +
        '<div class="fc-da-infra">warehouse in &#8594; CPU container &#8594; warehouse out. No GPU.</div>' +
        '<div class="fc-da-use" style="color:' + C.teal + '">nearly all demand forecasting runs this way</div>';
      this.rEl.innerHTML =
        '<div class="fc-da-h"><span class="fc-da-dot r"></span><b>Real-time</b><span class="fc-da-cad">always on &middot; continuous</span></div>' +
        '<div class="fc-da-rate"><b>~$0.01</b> / forecast<span class="fc-da-x">~50&times; batch</span></div>' +
        '<div class="fc-da-cost" style="color:' + C.orange + '">' + daCost(p, DA_RT) + '<span style="font-size:17px;color:' + C.sub + ';font-weight:600"> / day</span></div>' +
        '<div class="fc-da-infra">+ streaming bus + always-on endpoint to babysit.</div>' +
        '<div class="fc-da-use" style="color:' + C.sub + '">event pricing, fraud: rarely demand</div>';
      const disp = p >= 1e6 ? '1M' : p >= 1000 ? (p / 1000) + 'k' : '' + p;
      this.capEl.innerHTML = 'At ' + disp + ' forecasts/day: batch <b style="color:' + C.teal + '">' + daCost(p, DA_BATCH) + '</b> vs real-time <b style="color:' + C.orange + '">' + daCost(p, DA_RT) + '</b>. Real-time earns its keep only when a decision reacts in seconds; demand sensing is an accelerated daily batch, not real-time. Rates are illustrative, at published cloud order of magnitude.';
    }
  }
  customElements.define('fc-deploy-arch', DeployArch);

  /* ====================================================================== */
  /* fc-second-model; the seasonal-naive circuit breaker (PR-3, 015/016).    */
  /* Run a dumb second model beside the AI champion. Two automated stops:    */
  /* (a) the actual breaches the champion's conformal band, (b) rolling      */
  /* MASE > 1 (champion no longer beats naive). Either -> HOLD for a human,  */
  /* do not auto-order. Scenario toggle steady/shock; reduced-motion safe.   */
  /* ====================================================================== */
  const SM_LO = 300, SM_HI = 660;
  const SM_CHAMP = 531, SM_BLO = 441, SM_BHI = 621, SM_NAIVE = 505;
  const SM_SCEN = {
    steady: { actual: 524, mase: 0.7, inside: true },
    shock: { actual: 360, mase: 1.4, inside: false }
  };
  const smPct = v => (100 * (v - SM_LO) / (SM_HI - SM_LO));
  let smCss = false;
  function smInject() {
    if (smCss) return; smCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-second-model{display:block;width:100%}' +
      '.fc-sm-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:15px 20px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-sm-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-sm-track{position:relative;height:80px;margin:28px 46px 2px}' +
      '.fc-sm-axis{position:absolute;left:0;right:0;top:48px;height:2px;background:' + C.grid + '}' +
      '.fc-sm-band{position:absolute;top:32px;height:34px;background:' + C.blueLt + ';border-left:2px solid ' + C.blue + ';border-right:2px solid ' + C.blue + ';border-radius:4px}' +
      '.fc-sm-band .bl{position:absolute;top:-23px;font-family:' + mono + ';font-size:13px;font-weight:700;color:' + C.blueDk + '}' +
      '.fc-sm-mk{position:absolute;top:41px;width:16px;height:16px;border-radius:50%;transform:translateX(-50%);border:3px solid ' + C.white + ';box-shadow:0 1px 4px rgba(8,8,9,.25)}' +
      '.fc-sm-champ{background:' + C.blue + '}.fc-sm-naive{background:' + C.faint + ';width:14px;height:14px;top:42px}' +
      '.fc-sm-actual{width:22px;height:22px;top:38px}' +
      '.fc-sm-legend{display:flex;gap:24px;flex-wrap:wrap;padding:6px 46px 0;font-size:18px;font-weight:700;color:' + C.ink + '}' +
      '.fc-sm-lg{display:flex;align-items:center;gap:9px}.fc-sm-lg i{width:14px;height:14px;border-radius:50%;display:inline-block;flex:0 0 auto}' +
      '.fc-sm-lg span{color:' + C.sub + ';font-weight:600}' +
      '.fc-sm-verdict{margin:6px 20px 0;padding:16px 20px;border-radius:12px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}' +
      '.fc-sm-verdict.ok{background:rgba(10,126,140,.1)}.fc-sm-verdict.stop{background:rgba(250,46,62,.1)}' +
      '.fc-sm-vch{font-family:' + mono + ';font-size:20px;font-weight:800;padding:8px 15px;border-radius:9px;color:#fff}' +
      '.fc-sm-vtx{font-size:19px;line-height:1.35}.fc-sm-vtx b{font-weight:800}' +
      '.fc-sm-mase{font-family:' + mono + ';font-size:17px;font-weight:700;color:' + C.sub + '}' +
      '.fc-sm-cap{padding:14px 22px 20px;font-size:18px;color:' + C.sub + ';line-height:1.4;min-height:2.2em}' +
      '.fc-sm-cap b{color:' + C.ink + '}';
    document.head.appendChild(s);
  }
  class SecondModel extends FLBase {
    build() {
      smInject();
      this.scen = 'steady';
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-sm-bar');
      bar.append(elt('div', 'fc-sm-lead', 'A dumb second model is your circuit breaker.'));
      const seg = segmented([{ label: 'Steady week', value: 'steady' }, { label: 'Demand shock', value: 'shock' }], 'steady', k => { this.scen = k; this.render(); });
      this.seg = seg; bar.append(seg);
      const track = elt('div', 'fc-sm-track'); this.track = track;
      const legend = elt('div', 'fc-sm-legend'); this.legend = legend;
      const verdict = elt('div', 'fc-sm-verdict'); this.verdict = verdict;
      const cap = elt('div', 'fc-sm-cap'); this.capEl = cap;
      card.append(bar, track, legend, verdict, cap); this.append(card);
      this.render();
    }
    render() {
      const sc = SM_SCEN[this.scen], aCol = sc.inside ? C.teal : C.red;
      this.track.innerHTML =
        '<div class="fc-sm-axis"></div>' +
        '<div class="fc-sm-band" style="left:' + smPct(SM_BLO) + '%;width:' + (smPct(SM_BHI) - smPct(SM_BLO)) + '%"><span class="bl" style="left:0">band ' + SM_BLO + '</span><span class="bl" style="right:0">' + SM_BHI + '</span></div>' +
        '<div class="fc-sm-mk fc-sm-naive" style="left:' + smPct(SM_NAIVE) + '%"></div>' +
        '<div class="fc-sm-mk fc-sm-champ" style="left:' + smPct(SM_CHAMP) + '%"></div>' +
        '<div class="fc-sm-mk fc-sm-actual" style="left:' + smPct(sc.actual) + '%;background:' + aCol + '"></div>';
      this.legend.innerHTML =
        '<span class="fc-sm-lg"><i style="background:' + C.blue + '"></i>AI champion <span>' + SM_CHAMP + '</span></span>' +
        '<span class="fc-sm-lg"><i style="background:' + C.faint + '"></i>seasonal-naive <span>' + SM_NAIVE + '</span></span>' +
        '<span class="fc-sm-lg"><i style="background:' + aCol + '"></i>actual <span style="color:' + aCol + '">' + sc.actual + (sc.inside ? ' (inside band)' : ' (breach!)') + '</span></span>';
      const ok = sc.inside && sc.mase < 1;
      this.verdict.className = 'fc-sm-verdict ' + (ok ? 'ok' : 'stop');
      this.verdict.innerHTML =
        '<span class="fc-sm-vch" style="background:' + (ok ? C.teal : C.red) + '">' + (ok ? 'AUTO-RELEASE' : 'HOLD') + '</span>' +
        '<span class="fc-sm-mase">MASE ' + sc.mase.toFixed(1) + (sc.mase < 1 ? ' &lt; 1.0 &#10003;' : ' &gt; 1.0 &#10007;') + '</span>' +
        '<span class="fc-sm-vtx">' + (ok
          ? 'Actual inside the band and the champion beats naive. <b>Release automatically.</b>'
          : 'Actual breached the band and MASE crossed 1.0 &#8212; the champion lost to a dumb model. <b>Hold for a human; do not auto-order.</b>') + '</span>';
      this.capEl.innerHTML = this.scen === 'shock'
        ? 'The seasonal-naive shadow costs nothing to run and, when the world breaks, it is the tripwire: two independent stops (band breach + MASE&gt;1) catch what a single confident number hides.'
        : 'On a normal week both models agree, the actual sits inside the band, and the forecast auto-releases. The second model is just watching.';
      if (this.seg && this.seg._set) this.seg._set(this.scen);
    }
  }
  customElements.define('fc-second-model', SecondModel);

  /* ====================================================================== */
  /* fc-stockout; sales is a censored observation of demand (018 depth).    */
  /* Naive mode renders sales-only bars: the stockout window reads as a     */
  /* demand crash. Stockout-aware mode adds a dashed "ghost" overlay up to  */
  /* true demand for the same weeks, exposing the censoring gap. Static     */
  /* bars, no motion, so there is nothing to gate behind reduced-motion.    */
  /* ====================================================================== */
  let soCss = false;
  function soInject() {
    if (soCss) return; soCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-stockout{display:block;width:100%}' +
      '.fc-so-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:15px 20px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-so-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-so-body{padding:24px 26px 6px}' +
      '.fc-so-chart{display:flex;align-items:flex-end;gap:7px;height:224px}' +
      '.fc-so-col{flex:1 1 0;height:100%;display:flex;align-items:flex-end;justify-content:center;border-radius:6px 6px 0 0}' +
      '.fc-so-col.zone{background:' + C.redLt + '}' +
      '.fc-so-barwrap{position:relative;width:100%;height:100%}' +
      '.fc-so-ghost{position:absolute;left:6%;right:6%;bottom:0;box-sizing:border-box;border:2px dashed ' + C.teal + ';border-radius:4px 4px 0 0;background:transparent;z-index:1}' +
      '.fc-so-sales{position:absolute;left:22%;right:22%;bottom:0;background:' + C.ink + ';border-radius:3px 3px 0 0;z-index:2}' +
      '.fc-so-axis{display:flex;justify-content:space-between;padding:8px 4px 0;font-family:' + mono + ';font-size:13px;font-weight:700;letter-spacing:.4px;color:' + C.faint + '}' +
      '.fc-so-legend{display:flex;gap:22px;flex-wrap:wrap;align-items:center;padding:16px 26px 0}' +
      '.fc-so-lg{display:flex;align-items:center;gap:9px;font-size:16px;font-weight:600;color:' + C.sub + '}' +
      '.fc-so-swatch{width:20px;height:13px;border-radius:3px;display:inline-block;flex:0 0 auto;box-sizing:border-box}' +
      '.fc-so-swatch.solid{background:' + C.ink + '}' +
      '.fc-so-swatch.ghost{background:transparent;border:2px dashed ' + C.teal + '}' +
      '.fc-so-swatch.zone{background:' + C.redLt + '}' +
      '.fc-so-cap{padding:14px 26px 20px;font-size:19px;color:' + C.sub + ';line-height:1.4;min-height:2.4em}' +
      '.fc-so-cap b{color:' + C.ink + '}';
    document.head.appendChild(s);
  }
  class Stockout extends FLBase {
    build() {
      soInject();
      const ds = getDS('canon');
      const { demand, sales, window } = ds.variants.stockout;
      this.win = window;
      const FROM = 68, TO = 84; // weeks 68..83 inclusive, 16 weeks
      this.offset = FROM;
      this.demandSlice = demand.slice(FROM, TO);
      this.salesSlice = sales.slice(FROM, TO);
      this.maxDemand = Math.max(...this.demandSlice);
      this.mode = 'naive';
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-so-bar');
      bar.append(elt('div', 'fc-so-lead', 'Sales is a censored observation of demand, not demand itself.'));
      const seg = segmented([{ label: 'Naive (sales only)', value: 'naive' }, { label: 'Stockout-aware', value: 'aware' }], 'naive', k => { this.mode = k; this.render(); });
      this.seg = seg; bar.append(seg);
      const body = elt('div', 'fc-so-body');
      const chart = elt('div', 'fc-so-chart'); this.chartEl = chart;
      const axis = elt('div', 'fc-so-axis');
      axis.innerHTML = '<span>week ' + this.offset + '</span><span>week ' + (this.offset + this.demandSlice.length - 1) + '</span>';
      body.append(chart, axis);
      const legend = elt('div', 'fc-so-legend');
      legend.innerHTML =
        '<span class="fc-so-lg"><i class="fc-so-swatch solid"></i>sales (observed)</span>' +
        '<span class="fc-so-lg"><i class="fc-so-swatch ghost"></i>true demand (recovered)</span>' +
        '<span class="fc-so-lg"><i class="fc-so-swatch zone"></i>stockout window</span>';
      const cap = elt('div', 'fc-so-cap'); this.capEl = cap;
      card.append(bar, body, legend, cap); this.append(card);
      this.render();
    }
    render() {
      const aware = this.mode === 'aware';
      const [wFrom, wTo] = this.win;
      let html = '';
      for (let i = 0; i < this.demandSlice.length; i++) {
        const wk = this.offset + i;
        const inWindow = wk >= wFrom && wk <= wTo;
        const salesPct = (this.salesSlice[i] / this.maxDemand * 100).toFixed(1);
        const ghost = (aware && inWindow)
          ? '<div class="fc-so-ghost" style="height:' + (this.demandSlice[i] / this.maxDemand * 100).toFixed(1) + '%"></div>'
          : '';
        html += '<div class="fc-so-col' + (inWindow ? ' zone' : '') + '"><div class="fc-so-barwrap">' + ghost + '<div class="fc-so-sales" style="height:' + salesPct + '%"></div></div></div>';
      }
      this.chartEl.innerHTML = html;
      this.capEl.innerHTML = aware
        ? 'True demand never fell, the shelf was empty. <b>Detect this with daily inventory snapshots, never a silent mean-fill.</b>'
        : 'A naive model reads this as five weeks of collapsing demand and orders less next cycle, <b>a self-reinforcing spiral.</b>';
      if (this.seg && this.seg._set) this.seg._set(this.mode);
    }
  }
  customElements.define('fc-stockout', Stockout);

  /* ====================================================================== */
  /* fc-cockpit; the monitoring cockpit, leading vs lagging signals (015     */
  /* deferred depth). Four gauges: freshness, input drift, prediction drift */
  /* are all leading and move the same day something breaks; forecast      */
  /* error+bias is lagging and only confirms once ground truth lands, about */
  /* two weeks later. Toggle simulates a break: the three leading rings     */
  /* snap red immediately, the lagging ring stays frozen grey -- that       */
  /* stillness is the entire teaching point.                                 */
  /* ====================================================================== */
  const CP_STEADY = {
    fresh: { val: '98%', sub: 'on time', pct: 98, ok: true },
    input: { val: '0.04', sub: 'stable', pct: 8, ok: true },
    pred: { val: '0.03', sub: 'stable', pct: 6, ok: true },
    note: 'last confirmed 3d ago'
  };
  const CP_BREAK = {
    fresh: { val: '6h', sub: 'overdue', pct: 20, ok: false },
    input: { val: '0.31', sub: 'DRIFT', pct: 78, ok: false },
    pred: { val: '0.28', sub: 'DRIFT', pct: 70, ok: false },
    note: 'ground truth pending, confirms in 14 days'
  };
  let cpCss = false;
  function cpInject() {
    if (cpCss) return; cpCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-cockpit{display:block;width:100%}' +
      '.fc-cp-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:15px 20px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-cp-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-cp-gauges{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:24px 22px 8px}' +
      '.fc-cp-gauge{display:flex;flex-direction:column;align-items:center;text-align:center;gap:9px}' +
      '.fc-cp-ring{width:min(112px,16vw);height:min(112px,16vw);border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 auto}' +
      '.fc-cp-hole{width:70%;height:70%;border-radius:50%;background:' + C.white + ';display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px ' + C.grid + '}' +
      '.fc-cp-val{font-family:' + mono + ';font-size:20px;font-weight:800;line-height:1}' +
      '.fc-cp-vsub{font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;margin-top:4px}' +
      '.fc-cp-name{font-size:15px;font-weight:800;color:' + C.ink + ';line-height:1.2}' +
      '.fc-cp-tag{font-family:' + mono + ';font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:2px 9px;border-radius:999px;background:' + C.soft + '}' +
      '.fc-cp-tag.leading{color:' + C.sub + '}.fc-cp-tag.lagging{color:' + C.faint + '}' +
      '.fc-cp-note{font-size:13px;color:' + C.sub + ';line-height:1.3;min-height:2.4em}' +
      '.fc-cp-stats{display:flex;gap:14px;flex-wrap:wrap;padding:12px 22px 0}' +
      '.fc-cp-stat{padding:8px 16px;border-radius:999px;border:1px solid ' + C.grid + ';font-size:15px;color:' + C.ink + '}' +
      '.fc-cp-stat b{font-weight:800}' +
      '.fc-cp-statcap{font-size:13px;color:' + C.faint + ';padding:6px 22px 0}' +
      '.fc-cp-cap{padding:14px 22px 20px;font-size:18px;color:' + C.sub + ';line-height:1.4;min-height:2.4em}' +
      '.fc-cp-cap b{color:' + C.ink + '}';
    document.head.appendChild(s);
  }
  function cpGaugeHtml(g, tagCls, name) {
    const col = g.ok ? C.teal : C.red;
    const deg = clamp(g.pct, 0, 100) * 3.6;
    const bg = 'conic-gradient(' + col + ' 0deg ' + deg + 'deg, ' + C.divider + ' ' + deg + 'deg 360deg)';
    return '<div class="fc-cp-gauge">' +
      '<div class="fc-cp-ring" style="background:' + bg + '"><div class="fc-cp-hole"><span class="fc-cp-val" style="color:' + col + '">' + g.val + '</span><span class="fc-cp-vsub" style="color:' + col + '">' + g.sub + '</span></div></div>' +
      '<div class="fc-cp-name">' + name + '</div>' +
      '<div class="fc-cp-tag ' + tagCls + '">' + tagCls + '</div>' +
      '</div>';
  }
  class Cockpit extends FLBase {
    build() {
      cpInject();
      this.scen = 'steady';
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-cp-bar');
      bar.append(elt('div', 'fc-cp-lead', 'Four signals. Three move today, one confirms in two weeks.'));
      const seg = segmented([{ label: 'Steady state', value: 'steady' }, { label: 'Simulate a break', value: 'break' }], 'steady', k => { this.scen = k; this.render(); });
      this.seg = seg; bar.append(seg);
      const gauges = elt('div', 'fc-cp-gauges'); this.gaugesEl = gauges;
      const stats = elt('div', 'fc-cp-stats');
      stats.innerHTML =
        '<div class="fc-cp-stat"><b>Manual review:</b> about 45 days to catch this</div>' +
        '<div class="fc-cp-stat"><b>Monitored:</b> about 2 days</div>';
      const statcap = elt('div', 'fc-cp-statcap', 'about 20x faster to detect (Uber Engineering, 2023)');
      const cap = elt('div', 'fc-cp-cap'); this.capEl = cap;
      card.append(bar, gauges, stats, statcap, cap); this.append(card);
      this.render();
    }
    render() {
      const sc = this.scen === 'break' ? CP_BREAK : CP_STEADY;
      let html = '';
      html += cpGaugeHtml(sc.fresh, 'leading', 'Data Freshness / SLA');
      html += cpGaugeHtml(sc.input, 'leading', 'Input Drift');
      html += cpGaugeHtml(sc.pred, 'leading', 'Prediction Drift');
      // the lagging gauge: ring itself never redraws, only the confirmation note beneath it does
      html += '<div class="fc-cp-gauge">' +
        '<div class="fc-cp-ring" style="background:' + C.divider + '"><div class="fc-cp-hole"><span class="fc-cp-val" style="color:' + C.faint + '">4.2%</span><span class="fc-cp-vsub" style="color:' + C.faint + '">MAPE</span></div></div>' +
        '<div class="fc-cp-name">Forecast Error + Bias</div>' +
        '<div class="fc-cp-tag lagging">lagging</div>' +
        '<div class="fc-cp-note">' + sc.note + '</div>' +
        '</div>';
      this.gaugesEl.innerHTML = html;
      this.capEl.innerHTML = this.scen === 'break'
        ? 'Three leading signals already fired. The lagging error gauge will not confirm anything for two weeks; by then you have already made two weeks of decisions on stale ground truth.'
        : 'All four signals agree: the pipeline is healthy.';
      if (this.seg && this.seg._set) this.seg._set(this.scen);
    }
  }
  customElements.define('fc-cockpit', Cockpit);

  /* ====================================================================== */
  /* fc-mape-bias; MAPE vs signed bias, the metric that hides drift (015     */
  /* deferred depth, appendix A23). The MAPE marker is pinned at 8.9% across */
  /* all three weeks and never moves -- that stillness is the entire point.  */
  /* Bias first crosses the plus/minus 5% control limit at week 20, then     */
  /* stays past it through week 27, when the sustained breach fires an       */
  /* ALERT tag; the vertical inventory bar grows in lockstep, visualizing    */
  /* the silent overstock that MAPE alone cannot see.                        */
  /* ====================================================================== */
  const MB_MAPE = 8.9;
  const MB_MAPE_LO = 0, MB_MAPE_HI = 15, MB_MAPE_HEALTHY_HI = 12;
  const MB_BIAS_LO = -8, MB_BIAS_HI = 8, MB_LIMIT = 5;
  const MB_INV_CAP = 6.6; // just above the week-27 bias, so week 27 reads "near full", not literally full
  const MB_WEEKS = {
    w10: { label: 'Week 10', bias: 3.0, tone: 'ok', alert: false, inv: 'normal', cap: 'Bias is small and MAPE looks fine. Nothing to see yet.' },
    w20: { label: 'Week 20', bias: 5.4, tone: 'warn', alert: false, inv: 'building', cap: 'Bias has already crossed the plus/minus 5% limit line. MAPE has not moved at all. One crossing is not yet a confirmed trend.' },
    w27: { label: 'Week 27', bias: 6.1, tone: 'bad', alert: true, inv: 'overstocked', cap: 'Bias stays past the limit and the breach is now confirmed, so the alert fires. MAPE stayed calm the entire time. It cannot tell you the direction of the miss.' }
  };
  const mbPctMape = v => (v - MB_MAPE_LO) / (MB_MAPE_HI - MB_MAPE_LO) * 100;
  const mbPctBias = v => (v - MB_BIAS_LO) / (MB_BIAS_HI - MB_BIAS_LO) * 100;
  const mbToneCol = t => t === 'ok' ? C.teal : t === 'warn' ? C.orange : C.red;
  const mbInvPct = bias => Math.pow(bias, 1.5) / Math.pow(MB_INV_CAP, 1.5) * 100;
  let mbCss = false;
  function mbInject() {
    if (mbCss) return; mbCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-mape-bias{display:block;width:100%}' +
      '.fc-mb-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:15px 20px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-mb-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-mb-body{display:flex;gap:28px;padding:24px 24px 6px;flex-wrap:wrap}' +
      '.fc-mb-strips{flex:1 1 380px;min-width:0;display:flex;flex-direction:column;gap:26px}' +
      '.fc-mb-row{display:flex;flex-direction:column;gap:6px}' +
      '.fc-mb-rowhead{display:flex;align-items:baseline;justify-content:space-between;gap:12px}' +
      '.fc-mb-rowname{font-family:' + mono + ';font-size:14px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:' + C.ink + '}' +
      '.fc-mb-rowval{font-family:' + mono + ';font-size:22px;font-weight:800}' +
      '.fc-mb-track{position:relative;height:52px;margin:8px 6px 0}' +
      '.fc-mb-axis{position:absolute;left:0;right:0;top:26px;height:2px;background:' + C.grid + '}' +
      '.fc-mb-zone{position:absolute;top:12px;height:28px;background:' + C.tealLt + ';border-radius:6px}' +
      '.fc-mb-zone .zl{position:absolute;top:-20px;font-family:' + mono + ';font-size:12px;font-weight:700;color:' + C.sub + '}' +
      '.fc-mb-limit{position:absolute;top:6px;bottom:6px;width:2px;background:' + C.red + '}' +
      '.fc-mb-limit .ll{position:absolute;top:-20px;left:0;font-family:' + mono + ';font-size:12px;font-weight:700;color:' + C.red + ';white-space:nowrap;transform:translateX(-50%)}' +
      '.fc-mb-mk{position:absolute;top:17px;width:18px;height:18px;border-radius:50%;transform:translateX(-50%);border:3px solid ' + C.white + ';box-shadow:0 1px 4px rgba(8,8,9,.25);transition:left .3s ease,background .3s ease}' +
      '.fc-mb-tag{position:absolute;top:-4px;font-family:' + mono + ';font-size:11px;font-weight:800;letter-spacing:.5px;color:' + C.white + ';background:' + C.red + ';padding:3px 8px;border-radius:6px;transform:translate(-50%,-100%);white-space:nowrap}' +
      '.fc-mb-inv{flex:0 0 auto;width:120px;display:flex;flex-direction:column;align-items:center;gap:10px}' +
      '.fc-mb-invname{font-family:' + mono + ';font-size:13px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:' + C.sub + '}' +
      '.fc-mb-invtrack{width:46px;height:150px;border-radius:8px;background:' + C.soft + ';border:1px solid ' + C.grid + ';position:relative;overflow:hidden;display:flex;align-items:flex-end}' +
      '.fc-mb-invfill{width:100%;border-radius:6px 6px 0 0;transition:height .3s ease,background .3s ease}' +
      '.fc-mb-invval{font-family:' + mono + ';font-size:15px;font-weight:800}' +
      '.fc-mb-cap{padding:14px 22px 20px;border-top:1px solid ' + C.grid + ';font-size:19px;color:' + C.sub + ';line-height:1.4;min-height:2.4em}' +
      '.fc-mb-cap b{color:' + C.ink + '}' +
      '@media (prefers-reduced-motion:reduce){.fc-mb-mk,.fc-mb-invfill{transition:none}}';
    document.head.appendChild(s);
  }
  class MapeBias extends FLBase {
    build() {
      mbInject();
      this.week = 'w10';
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-mb-bar');
      bar.append(elt('div', 'fc-mb-lead', 'Same forecast, three checkpoints. Watch which metric holds still.'));
      const seg = segmented([{ label: 'Week 10', value: 'w10' }, { label: 'Week 20', value: 'w20' }, { label: 'Week 27', value: 'w27' }], 'w10', k => { this.week = k; this.render(); });
      this.seg = seg; bar.append(seg);
      const body = elt('div', 'fc-mb-body');
      const strips = elt('div', 'fc-mb-strips');
      // MAPE row: fixed, never re-rendered per state -- the stillness is the point
      const mapeRow = elt('div', 'fc-mb-row');
      const mapeHead = elt('div', 'fc-mb-rowhead');
      mapeHead.innerHTML = '<span class="fc-mb-rowname">MAPE</span><span class="fc-mb-rowval" style="color:' + C.teal + '">' + MB_MAPE.toFixed(1) + '%</span>';
      const mapeTrack = elt('div', 'fc-mb-track');
      mapeTrack.innerHTML =
        '<div class="fc-mb-axis"></div>' +
        '<div class="fc-mb-zone" style="left:' + mbPctMape(MB_MAPE_LO) + '%;width:' + (mbPctMape(MB_MAPE_HEALTHY_HI) - mbPctMape(MB_MAPE_LO)) + '%"><span class="zl" style="left:0">healthy zone</span><span class="zl" style="left:100%;transform:translateX(-100%)">12%</span></div>' +
        '<div class="fc-mb-mk" style="left:' + mbPctMape(MB_MAPE) + '%;background:' + C.teal + '"></div>';
      mapeRow.append(mapeHead, mapeTrack);
      // Bias row: mutable, re-rendered per state
      const biasRow = elt('div', 'fc-mb-row');
      const biasHead = elt('div', 'fc-mb-rowhead'); this.biasHead = biasHead;
      const biasTrack = elt('div', 'fc-mb-track'); this.biasTrack = biasTrack;
      biasRow.append(biasHead, biasTrack);
      strips.append(mapeRow, biasRow);
      const inv = elt('div', 'fc-mb-inv');
      const invName = elt('div', 'fc-mb-invname', 'Inventory');
      const invTrack = elt('div', 'fc-mb-invtrack');
      const invFill = elt('div', 'fc-mb-invfill'); this.invFill = invFill;
      invTrack.append(invFill);
      const invVal = elt('div', 'fc-mb-invval'); this.invVal = invVal;
      inv.append(invName, invTrack, invVal);
      body.append(strips, inv);
      const cap = elt('div', 'fc-mb-cap'); this.capEl = cap;
      card.append(bar, body, cap); this.append(card);
      this.render();
    }
    render() {
      const wk = MB_WEEKS[this.week];
      const col = mbToneCol(wk.tone);
      this.biasHead.innerHTML = '<span class="fc-mb-rowname">BIAS</span><span class="fc-mb-rowval" style="color:' + col + '">+' + wk.bias.toFixed(1) + '%</span>';
      this.biasTrack.innerHTML =
        '<div class="fc-mb-axis"></div>' +
        '<div class="fc-mb-limit" style="left:' + mbPctBias(-MB_LIMIT) + '%"><span class="ll">-' + MB_LIMIT + '%</span></div>' +
        '<div class="fc-mb-limit" style="left:' + mbPctBias(MB_LIMIT) + '%"><span class="ll">+' + MB_LIMIT + '%</span></div>' +
        '<div class="fc-mb-mk" style="left:' + mbPctBias(wk.bias) + '%;background:' + col + '"></div>' +
        (wk.alert ? '<div class="fc-mb-tag" style="left:' + mbPctBias(wk.bias) + '%">ALERT</div>' : '');
      const pct = mbInvPct(wk.bias);
      this.invFill.style.height = pct.toFixed(1) + '%';
      this.invFill.style.background = col;
      this.invVal.innerHTML = '<span style="color:' + col + '">' + wk.inv + '</span>';
      this.capEl.innerHTML = '<b>' + wk.label + '.</b> ' + wk.cap;
      if (this.seg && this.seg._set) this.seg._set(this.week);
    }
  }
  customElements.define('fc-mape-bias', MapeBias);

  /* ====================================================================== */
  /* fc-retrain-lanes; three retrain triggers, one promotion gate (015       */
  /* depth, promoted to main slide 14/20 by plan 019). Scheduled,            */
  /* performance-triggered and                                               */
  /* drift-triggered lanes each show a continuous champion line plus one or  */
  /* two challenger candidate markers. The segmented control names an active */
  /* example lane and updates the shared Promotion Gate chip; nothing auto-  */
  /* promotes, a challenger must clear a pre-agreed margin in a shadow       */
  /* window first. A static decay inset shows monthly retraining held      */
  /* accuracy in retail benchmarks and was often more stable.               */
  /* ====================================================================== */
  const RL_LANES = [
    { key: 'scheduled', label: 'Scheduled (monthly)', sub: 'Trains a fresh challenger every 30 days.', dots: [32, 68] },
    { key: 'performance', label: 'Performance-triggered', sub: 'Fires when a cost or error threshold is crossed.', dots: [58] },
    { key: 'drift', label: 'Drift-triggered', sub: 'Fires on a PSI breach in the input features.', dots: [80] }
  ];
  const RL_GATE = {
    scheduled: { v: 'PASS', sub: '(routine)', cls: 'pass' },
    performance: { v: 'PASS', sub: '(clears margin)', cls: 'pass' },
    drift: { v: 'HELD', sub: '(margin too thin)', cls: 'held' }
  };
  const RL_CAP = {
    scheduled: 'A challenger trains every month regardless of performance. Cheapest option. In large retail benchmarks, monthly retraining held accuracy versus far more frequent schedules.',
    performance: 'A challenger fires when a cost or error threshold is crossed. It cleared the pre-agreed margin in the shadow window, so it is promoted.',
    drift: 'A challenger fires on a PSI breach, but promotion is never automatic. This one has not cleared the pre-agreed margin yet, so it is held for a human decision.'
  };
  const RL_DECAY = [8.6, 8.5, 8.3, 8.2, 8.1, 8.0, 7.8]; // illustrative WAPE %, weeks 0-6 since last train
  let rlCss = false;
  function rlInject() {
    if (rlCss) return; rlCss = true;
    const mono = "ui-monospace,'SF Mono',Menlo,monospace";
    const s = elt('style'); s.textContent =
      'fc-retrain-lanes{display:block;width:100%}' +
      '.fc-rl-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:15px 20px;border-bottom:1px solid ' + C.grid + '}' +
      '.fc-rl-lead{font-size:20px;color:' + C.sub + ';font-weight:600}' +
      '.fc-rl-body{display:flex;align-items:stretch}' +
      '.fc-rl-lanes{flex:1;display:flex;flex-direction:column;min-width:0}' +
      '.fc-rl-legend{display:flex;gap:22px;flex-wrap:wrap;padding:14px 22px 6px;font-size:14px;font-weight:700;color:' + C.ink + '}' +
      '.fc-rl-lg{display:flex;align-items:center;gap:8px}' +
      '.fc-rl-lg i{display:inline-block;flex:0 0 auto}' +
      '.fc-rl-lg i.champ{width:18px;height:4px;border-radius:3px;background:' + C.blue + '}' +
      '.fc-rl-lg i.chal{width:12px;height:12px;border-radius:50%;background:' + C.orange + ';border:2px solid ' + C.white + ';box-shadow:0 1px 3px rgba(8,8,9,.25)}' +
      '.fc-rl-lane{display:flex;align-items:center;gap:20px;padding:12px 22px;border-top:1px solid ' + C.grid + ';border-left:4px solid transparent}' +
      '.fc-rl-lane.active{background:' + rgba(C.blue, .05) + ';border-left-color:' + C.blue + '}' +
      '.fc-rl-lane-head{flex:0 0 220px;min-width:0}' +
      '.fc-rl-lane-head b{display:block;font-size:17px;font-weight:800;color:' + C.ink + '}' +
      '.fc-rl-lane-head span{display:block;font-size:13px;color:' + C.sub + ';margin-top:3px;line-height:1.3}' +
      '.fc-rl-track{position:relative;flex:1;height:30px;min-width:0}' +
      '.fc-rl-champ-line{position:absolute;left:0;right:0;top:50%;height:4px;margin-top:-2px;border-radius:3px;background:' + C.blue + '}' +
      '.fc-rl-dot{position:absolute;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:' + C.orange + ';border:2px solid ' + C.white + ';box-shadow:0 1px 3px rgba(8,8,9,.25);transform:translateX(-50%)}' +
      '.fc-rl-gate{flex:0 0 220px;border-left:1px solid ' + C.grid + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px 16px;text-align:center}' +
      '.fc-rl-gate-label{font-size:13px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:' + C.faint + '}' +
      '.fc-rl-gate-chip{font-family:' + mono + ';font-size:20px;font-weight:800;padding:10px 18px;border-radius:12px;line-height:1.3}' +
      '.fc-rl-gate-chip span{display:block;font-size:13px;font-weight:700;margin-top:3px;font-family:Inter,-apple-system,sans-serif;letter-spacing:0;text-transform:none}' +
      '.fc-rl-gate-chip.pass{background:' + rgba(C.teal, .12) + ';color:' + C.teal + ';border:1px solid ' + rgba(C.teal, .35) + '}' +
      '.fc-rl-gate-chip.held{background:' + rgba(C.red, .12) + ';color:' + C.red + ';border:1px solid ' + rgba(C.red, .35) + '}' +
      '.fc-rl-cap{padding:14px 22px 16px;font-size:18px;color:' + C.sub + ';line-height:1.4;min-height:2.4em;border-top:1px solid ' + C.grid + '}' +
      '.fc-rl-cap b{color:' + C.ink + '}' +
      '.fc-rl-decay{padding:16px 22px 20px;border-top:1px solid ' + C.grid + '}' +
      '.fc-rl-decay-head{font-size:13px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:' + C.faint + ';margin-bottom:12px}' +
      '.fc-rl-decay-chart{display:flex;align-items:flex-end;gap:10px;height:64px}' +
      '.fc-rl-decay-colwrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px}' +
      '.fc-rl-decay-val{font-family:' + mono + ';font-size:11px;color:' + C.sub + '}' +
      '.fc-rl-decay-bar{width:100%;max-width:32px;border-radius:5px 5px 0 0;background:' + C.blueLt + ';border-top:2px solid ' + C.blue + '}' +
      '.fc-rl-decay-xlabel{font-size:11px;color:' + C.faint + '}' +
      '.fc-rl-decay-xaxis{text-align:center;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:' + C.faint + ';margin-top:8px}' +
      '.fc-rl-decay-cap{margin-top:12px;font-size:16px;color:' + C.sub + ';line-height:1.4}' +
      '.fc-rl-decay-cap b{color:' + C.ink + '}';
    document.head.appendChild(s);
  }
  class RetrainLanes extends FLBase {
    build() {
      rlInject();
      this.active = 'scheduled';
      const card = elt('div', 'fl-card'); card.style.padding = '0';
      const bar = elt('div', 'fc-rl-bar');
      bar.append(elt('div', 'fc-rl-lead', 'Three ways to trigger a retrain candidate, one gate before it ships.'));
      const seg = segmented([
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Performance', value: 'performance' },
        { label: 'Drift', value: 'drift' }
      ], 'scheduled', k => { this.active = k; this.render(); });
      this.seg = seg; bar.append(seg);
      const body = elt('div', 'fc-rl-body');
      const lanes = elt('div', 'fc-rl-lanes'); this.lanesEl = lanes;
      const gate = elt('div', 'fc-rl-gate'); this.gateEl = gate;
      body.append(lanes, gate);
      const cap = elt('div', 'fc-rl-cap'); this.capEl = cap;
      const decay = elt('div', 'fc-rl-decay');
      const dMax = Math.max(...RL_DECAY), dMin = Math.min(...RL_DECAY);
      const bars = RL_DECAY.map((v, i) => {
        const h = 30 + ((v - dMin) / (dMax - dMin)) * 65;
        return '<div class="fc-rl-decay-colwrap"><span class="fc-rl-decay-val">' + v.toFixed(1) + '%</span>' +
          '<div class="fc-rl-decay-bar" style="height:' + h.toFixed(0) + '%"></div>' +
          '<span class="fc-rl-decay-xlabel">' + i + '</span></div>';
      }).join('');
      decay.innerHTML = '<div class="fc-rl-decay-head">Accuracy versus retrain cadence</div>' +
        '<div class="fc-rl-decay-chart">' + bars + '</div>' +
        '<div class="fc-rl-decay-xaxis">Weeks since last train</div>' +
        '<div class="fc-rl-decay-cap">In large retail benchmarks, monthly retraining held accuracy versus far more frequent schedules, and was often more stable: fewer flip-flops that erode planner trust.</div>';
      card.append(bar, body, cap, decay); this.append(card);
      this.render();
    }
    render() {
      const a = this.active;
      this.lanesEl.innerHTML = '<div class="fc-rl-legend">' +
        '<span class="fc-rl-lg"><i class="champ"></i>Champion, current production model</span>' +
        '<span class="fc-rl-lg"><i class="chal"></i>Challenger, retrain candidate</span></div>' +
        RL_LANES.map(l => {
          const dots = l.dots.map(p => '<div class="fc-rl-dot" style="left:' + p + '%"></div>').join('');
          return '<div class="fc-rl-lane' + (l.key === a ? ' active' : '') + '">' +
            '<div class="fc-rl-lane-head"><b>' + l.label + '</b><span>' + l.sub + '</span></div>' +
            '<div class="fc-rl-track"><div class="fc-rl-champ-line"></div>' + dots + '</div>' +
          '</div>';
        }).join('');
      const g = RL_GATE[a];
      this.gateEl.innerHTML = '<div class="fc-rl-gate-label">Promotion gate</div>' +
        '<div class="fc-rl-gate-chip ' + g.cls + '"><b>' + g.v + '</b><span>' + g.sub + '</span></div>';
      this.capEl.innerHTML = RL_CAP[a];
      if (this.seg && this.seg._set) this.seg._set(a);
    }
  }
  customElements.define('fc-retrain-lanes', RetrainLanes);

  /* ====================================================================== */
  /* fc-drivers; known-future exogenous drivers as regressors               */
  /* ====================================================================== */
  // Teaching (plan 028): a KNOWN-FUTURE driver — promo, price cut, launch,
  // holiday — that you feed the model as a regressor bends the forecast toward
  // the event and cuts error. Toggle the ones that actually land in the horizon
  // and the blue line tracks reality; reveal scores the WAPE you saved. The
  // twist: a driver only helps if you know it AT FORECAST TIME. "Weather" is
  // greyed — it moves reality but isn't on the calendar, so its bump is error
  // that survives even with every known driver switched on.
  (function () {
    if (document.getElementById('fc-drivers-css')) return;
    const s = document.createElement('style'); s.id = 'fc-drivers-css';
    s.textContent =
      ".fc-drivers-locked{opacity:.5;filter:grayscale(1);cursor:not-allowed;}" +
      ".fc-drivers-tag{font-family:'Space Mono',monospace;font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;padding:3px 8px;border-radius:3px;margin-left:9px;}" +
      "@media (prefers-reduced-motion:reduce){.fc-drivers-locked,.fl-chip{transition:none!important;}}";
    document.head.appendChild(s);
  })();
  function fmtPct(v) { return (Math.round(v * 10) / 10).toFixed(1) + '%'; }
  class Drivers extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'canon');
      const s = shell(this, 'clamp(300px,44vh,520px)'); this.s = s; this._charts = [s.chart];
      const H = ds.H;
      // baseline seasonal forecast — the plain Holt-Winters continuation that MISSES every event
      this.base = M.hw(ds.y, H, { alpha: .35, beta: .04, gamma: .3, m: ds.m });
      // authored known-future drivers; each acts inside the forecast horizon (h = 0..H-1)
      const promoLift = (ds.variants && ds.variants.promo && ds.variants.promo.lift) || 160;
      this.drivers = [
        { k: 'promo',   label: 'Promo',     color: C.orange, kind: 'spike', at: 3,  lift: promoLift },
        { k: 'price',   label: 'Price cut', color: C.teal,   kind: 'step',  from: 5, lift: 90 },
        { k: 'launch',  label: 'Launch',    color: C.red,    kind: 'step',  from: 8, lift: 130 },
        { k: 'holiday', label: 'Holiday',   color: C.blue,   kind: 'spike', at: 11, lift: 200 }
      ];
      // the one you CAN'T use: it moves reality but isn't known at forecast time
      this.unknown = { kind: 'spike', at: 6, lift: 120 };
      this.on = { promo: false, price: false, launch: false, holiday: false };
      this.revealed = false;
      // irreducible, deterministic wiggle (no RNG) — identical in truth on every run
      this.noise = []; for (let h = 0; h < H; h++) this.noise.push(Math.round(14 * Math.sin(h * 1.7 + 0.6)));

      // --- controls ------------------------------------------------------
      const row = elt('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;flex:1 1 100%;align-items:center;';
      this.drivers.forEach(d => row.append(chip(d.label, d.color, false, v => { this.on[d.k] = v; this.render(); this.updateScore(false); })));
      const locked = elt('button', 'fl-chip fc-drivers-locked'); locked.type = 'button'; locked.disabled = true; locked.setAttribute('aria-disabled', 'true');
      locked.style.setProperty('--chipdot', C.faint);
      locked.innerHTML = '<span class="dot"></span>Weather<span class="fc-drivers-tag" style="background:' + rgba(C.faint, .25) + ';color:' + C.sub + '">not known yet</span>';
      row.append(locked);
      s.controls.append(row);

      s.controls.append(legend([{ c: C.faint, label: 'baseline · no drivers', dash: true }, { c: C.blue, label: 'driver-aware forecast' }, { c: C.ink, label: 'actual', dash: true }]));

      const rev = elt('button', 'fl-btn', 'Reveal actual'); this.revBtn = rev;
      rev.onclick = () => {
        this.revealed = !this.revealed; rev.textContent = this.revealed ? 'Hide actual' : 'Reveal actual';
        this.score.style.display = this.revealed ? 'flex' : 'none';
        if (this.revealed) { playReveal(this); this.updateScore(true); } else { this.render(); this.updateScore(false); }
      };
      const reset = elt('button', 'fl-btn ghost', 'Reset');
      reset.onclick = () => {
        this.on = { promo: false, price: false, launch: false, holiday: false }; this.revealed = false;
        rev.textContent = 'Reveal actual'; this.score.style.display = 'none';
        row.querySelectorAll('.fl-chip:not(.fc-drivers-locked)').forEach(b => b.setAttribute('aria-pressed', 'false'));
        this.render(); this.updateScore(false);
      };
      s.controls.append(rev, reset);

      const score = elt('div', 'fl-metrics'); score.style.display = 'none'; this.score = score; s.controls.append(score);
      this.coach = mkCoach(''); s.controls.append(this.coach);
      const cap = elt('div', 'fl-note'); cap.style.cssText = 'flex:1 1 100%;font-size:18px;';
      cap.innerHTML = '<b>A driver only helps if it is known at forecast time.</b> Promo, price, launch and holiday sit on next quarter’s calendar, so the model can use them. Weather does not — it stays greyed, and its bump is error you can’t remove.';
      s.controls.append(cap);
      this.render(); this.updateScore(false);
    }
    _eff(d, h) { return d.kind === 'spike' ? (h === d.at ? d.lift : 0) : (h >= d.from ? d.lift : 0); }
    _driverFc() {
      const H = this.ds.H, fc = [];
      for (let h = 0; h < H; h++) { let v = this.base.fc[h]; this.drivers.forEach(d => { if (this.on[d.k]) v += this._eff(d, h); }); fc.push(v); }
      return fc;
    }
    _trueFut() {
      const H = this.ds.H, tf = [];
      for (let h = 0; h < H; h++) { let v = this.base.fc[h] + this._eff(this.unknown, h) + this.noise[h]; this.drivers.forEach(d => { v += this._eff(d, h); }); tf.push(v); }
      return tf;
    }
    _wape(a, p) { let num = 0, den = 0; for (let i = 0; i < a.length; i++) { num += Math.abs(a[i] - p[i]); den += Math.abs(a[i]); } return den ? 100 * num / den : 0; }
    render() {
      const ds = this.ds, n = ds.n, H = ds.H, dfc = this._driverFc();
      const anyOn = this.drivers.some(d => this.on[d.k]);
      const series = [{ pts: actualPts(ds.y), ...ACT }];
      if (anyOn) series.push({ pts: fcPts(ds.y, this.base.fc), color: C.faint, width: 2.4, dash: [3, 6] });
      series.push({ pts: fcPts(ds.y, dfc), ...FC, dash: [9, 5] });
      const all = ds.y.slice(); dfc.forEach(v => all.push(v)); this.base.fc.forEach(v => all.push(v));
      if (this.revealed) {
        const tf = this._trueFut(), rp = [{ x: n - 1, y: ds.y[n - 1] }];
        tf.forEach((v, h) => rp.push({ x: n + h, y: v })); tf.forEach(v => all.push(v));
        series.push({ pts: rp, color: C.ink, width: 2.6, dash: [2, 5], dots: true, dotR: 2.6, clipRight: this._revealClip });
      }
      const marks = [];
      this.drivers.forEach(d => { if (this.on[d.k]) marks.push({ x: n + (d.kind === 'spike' ? d.at : d.from), c: d.color }); });
      s_set(this.s.chart, {
        series, xmin: 0, xmax: n + H - 1, ...yRange(all),
        marker: n - 1, markerLabel: 'today', xlabels: xlabels(n, H, 26),
        regions: [{ x0: n - 1, x1: n + H - 1, color: rgba(C.blue, .04) }],
        after: (ctx, geo) => {
          marks.forEach(mk => {
            const px = geo.xToPx(mk.x);
            ctx.save(); ctx.strokeStyle = rgba(mk.c, .5); ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
            ctx.beginPath(); ctx.moveTo(px, geo.y0 + 8); ctx.lineTo(px, geo.y1); ctx.stroke();
            ctx.setLineDash([]); ctx.fillStyle = mk.c; ctx.beginPath(); ctx.arc(px, geo.y0 + 8, 4, 0, 7); ctx.fill(); ctx.restore();
          });
        }
      });
    }
    updateScore(animate) {
      this.score.innerHTML = '';
      if (!this.revealed) { this.coach._set('Toggle the drivers you know will happen — watch the blue line bend to them — then <b>Reveal actual</b> to score the error you saved.', 'neutral'); return; }
      const tf = this._trueFut(), baseW = this._wape(tf, this.base.fc), curW = this._wape(tf, this._driverFc());
      const baseCard = metricCard('Baseline WAPE', fmtPct(baseW)), curCard = metricCard('Driver-aware WAPE', fmtPct(curW));
      this.score.append(baseCard, curCard);
      if (animate) { countUp(baseCard._v, baseW, 500, fmtPct); countUp(curCard._v, curW, 500, fmtPct); }
      const nOn = this.drivers.filter(d => this.on[d.k]).length;
      if (nOn === 0) this.coach._set('No drivers on: a plain seasonal baseline sits at <b>' + fmtPct(baseW) + '</b> WAPE and flat-misses every event.', 'warn');
      else if (curW < baseW - 0.3) this.coach._set('Known drivers cut error from <b>' + fmtPct(baseW) + '</b> to <b>' + fmtPct(curW) + '</b>. The <b>' + fmtPct(curW) + '</b> left is the weather you couldn’t know at forecast time.', 'good');
      else this.coach._set('Those drivers barely touch the horizon shown — switch on the ones that actually land inside it.', 'hint');
    }
  }
  customElements.define('fc-drivers', Drivers);

  /* ====================================================================== */
  /* 30 · fc-hierarchy; granularity & hierarchy — aggregate to forecast,     */
  /*      disaggregate to act. Summing up the tree cancels idiosyncratic     */
  /*      noise, so higher levels forecast more accurately; bottom-up sums   */
  /*      SKU forecasts, top-down forecasts the total and splits by share.   */
  /* ====================================================================== */
  class Hierarchy extends FLBase {
    build() {
      this.ds = getDS(this.getAttribute('data') || 'canon'); // honor data attr for parity; series are synthesized deterministically
      const s = shell(this, 'clamp(300px,44vh,520px)'); this.s = s; this._charts = [s.chart];
      this.level = 'sku'; this.strat = 'bu';
      this._synth();

      // --- level + reconciliation controls -------------------------------
      const lvlRow = elt('div', 'fl-ctl');
      lvlRow.append(label2('Aggregation level', C.blue),
        segmented([{ value: 'sku', label: 'SKU' }, { value: 'family', label: 'Family' }, { value: 'total', label: 'Total' }],
          this.level, v => { this.level = v; this.render(true); }));
      const stratRow = elt('div', 'fl-ctl');
      stratRow.append(label2('Reconciliation', C.orange),
        segmented([{ value: 'bu', label: 'Bottom-up' }, { value: 'td', label: 'Top-down' }],
          this.strat, v => { this.strat = v; this.render(true); }));
      s.controls.append(lvlRow, stratRow);

      // --- compact hierarchy strip (6 SKUs → 2 families → Total) ---------
      this._tree = this._buildTree(); s.controls.append(this._tree.wrap);

      s.controls.append(legend([{ c: C.ink, label: 'actual', dash: true }, { c: C.blue, label: 'forecast' }]));

      const score = elt('div', 'fl-metrics'); this.score = score; s.controls.append(score);
      this.coach = mkCoach(''); s.controls.append(this.coach);
      const cap = elt('div', 'fl-note'); cap.style.cssText = 'flex:1 1 100%;font-size:18px;';
      cap.innerHTML = '<b>Aggregate to forecast, disaggregate to act.</b> Summing up the tree cancels each SKU’s private wiggle, so higher levels forecast far more accurately — but you still order <b>this SKU at this store</b>. Forecast where it’s reliable, then reconcile down: <b>bottom-up</b> sums SKU forecasts; <b>top-down</b> forecasts the total and splits it by share.';
      s.controls.append(cap);

      this.render(false);
    }

    // deterministic synthesis: 6 SKUs → 2 families → total. Each SKU = a shared
    // family/seasonal signal + its own idiosyncratic (zero-mean) wiggle. Summing
    // up the tree cancels the wiggle, so the forecast (the smooth signal) tracks
    // the aggregate far better than any single SKU. Fixed seed → identical on reload.
    _synth() {
      const N = 48, H = 12, P = 26, T = N + H; this.N = N; this.H = H;
      const defs = [
        { label: 'A1', fam: 0, base: 132, amp: 0.10, phase: 0,  trend: 0.24 },
        { label: 'A2', fam: 0, base: 96,  amp: 0.13, phase: 2,  trend: -0.16 },
        { label: 'A3', fam: 0, base: 74,  amp: 0.08, phase: -3, trend: 0.05 },
        { label: 'B1', fam: 1, base: 60,  amp: 0.46, phase: 5,  trend: -0.22 },
        { label: 'B2', fam: 1, base: 44,  amp: 0.40, phase: 9,  trend: 0.18 },
        { label: 'B3', fam: 1, base: 30,  amp: 0.34, phase: 13, trend: 0.08 }
      ];
      const NOISE = 0.40, SEED = 1834;
      this.sku = defs.map((d, i) => {
        const rng = mulberry32(SEED + i * 1013); const signal = [], actual = [];
        for (let t = 0; t < T; t++) {
          const sig = d.base * (1 + d.amp * Math.sin(2 * Math.PI * (t - d.phase) / P) + d.trend * (t / N));
          signal.push(sig);
          actual.push(sig + (rng() - 0.5) * 2 * NOISE * d.base); // idiosyncratic, zero-mean → cancels on aggregation
        }
        return { label: d.label, fam: d.fam, base: d.base, signal, actual };
      });
      this.families = [{ label: 'A · Core', members: [0, 1, 2] }, { label: 'B · Seasonal', members: [3, 4, 5] }];
      const sumOf = (idxs, key) => { const a = new Array(T).fill(0); idxs.forEach(i => { for (let t = 0; t < T; t++) a[t] += this.sku[i][key][t]; }); return a; };
      const all = [0, 1, 2, 3, 4, 5];
      this.totalActual = sumOf(all, 'actual'); this.totalSignal = sumOf(all, 'signal');
      this.families.forEach(f => { f.actual = sumOf(f.members, 'actual'); f.signal = sumOf(f.members, 'signal'); });
      // fixed historical share used by top-down allocation (mean over the history window)
      const shareOf = arr => { let sm = 0; for (let t = 0; t < N; t++) sm += arr[t] / this.totalActual[t]; return sm / N; };
      this.sku.forEach(k => k.share = shareOf(k.actual));
      this.families.forEach(f => f.share = shareOf(f.actual));
    }
    // representative member shown for the selected level (on one sum-path SKU⊂Family⊂Total)
    _repr() {
      if (this.level === 'sku') return { actual: this.sku[0].actual, name: 'SKU A1', key: 'SKU WAPE' };
      if (this.level === 'family') return { actual: this.families[0].actual, name: this.families[0].label, key: 'Family WAPE' };
      return { actual: this.totalActual, name: 'All 6 SKUs', key: 'Total WAPE' };
    }
    // forecast over the full range for the selected level under a reconciliation strategy
    _fcArray(strat) {
      if (this.level === 'total') return this.totalSignal.slice();          // both strategies agree at the top
      if (strat === 'bu') return (this.level === 'sku' ? this.sku[0].signal : this.families[0].signal).slice();
      const share = this.level === 'sku' ? this.sku[0].share : this.families[0].share; // top-down: split reliable total by fixed share
      return this.totalSignal.map(v => v * share);
    }
    _wape(actual, fc) { const N = this.N, T = N + this.H; let num = 0, den = 0; for (let t = N; t < T; t++) { num += Math.abs(actual[t] - fc[t]); den += Math.abs(actual[t]); } return den ? 100 * num / den : 0; }
    render(animate) {
      const N = this.N, H = this.H, T = N + H;
      const rep = this._repr(), actual = rep.actual, fc = this._fcArray(this.strat);
      const fitPts = []; for (let t = 0; t < N; t++) fitPts.push({ x: t, y: fc[t] });
      const fcPtsA = []; for (let t = N - 1; t < T; t++) fcPtsA.push({ x: t, y: fc[t] });
      const series = [
        { pts: actual.map((v, t) => ({ x: t, y: v })), ...ACT },
        { pts: fitPts, color: rgba(C.blue, .5), width: 2, dash: [2, 5] },
        { pts: fcPtsA, ...FC, dash: [9, 5] }
      ];
      s_set(this.s.chart, {
        series, xmin: 0, xmax: T - 1, ...yRange(actual.concat(fc)),
        marker: N - 1, markerLabel: 'today', xlabels: xlabels(N, H, 12),
        regions: [{ x0: N - 1, x1: T - 1, color: rgba(C.blue, .04) }]
      });
      this._highlightTree();
      this._readout(animate);
    }
    _readout(animate) {
      const rep = this._repr(), cur = this._wape(rep.actual, this._fcArray(this.strat));
      const skuRef = this._wape(this.sku[0].actual, this.sku[0].signal); // single-SKU bottom-up = the hardest level
      this.score.innerHTML = '';
      const card = metricCard(rep.key, fmtPct(cur)); this.score.append(card);
      if (this.level !== 'sku' && skuRef > 0) {
        const drop = Math.round(100 * (skuRef - cur) / skuRef);
        const tag = elt('div', 'fl-tag'); tag.style.cssText += 'background:' + C.tealLt + ';color:' + C.teal;
        tag.textContent = '▼ ' + drop + '% error vs a single SKU'; this.score.append(tag);
      }
      if (animate) countUp(card._v, cur, 460, fmtPct); // guarded: countUp short-circuits on reducedMotion()
      this._coach(cur);
    }
    _coach() {
      const rep = this._repr(), buW = this._wape(rep.actual, this._fcArray('bu')), tdW = this._wape(rep.actual, this._fcArray('td'));
      if (this.level === 'total') {
        this.coach._set('At the <b>total</b> the private wiggles have almost cancelled — WAPE <b>' + fmtPct(buW) + '</b>. Bottom-up and top-down <b>agree here</b>: this is the level you can trust. Now you must split it back down to actually order stock.', 'good');
        return;
      }
      const lvl = this.level === 'sku' ? 'a single SKU' : 'a family';
      if (this.strat === 'bu') this.coach._set('<b>Bottom-up</b> forecasts ' + lvl + ' on its own signal — WAPE <b>' + fmtPct(buW) + '</b>, keeping the granular detail sharp. Switch to <b>top-down</b> and a fixed share blurs it to <b>' + fmtPct(tdW) + '</b>.', 'hint');
      else this.coach._set('<b>Top-down</b> splits the reliable total by a <b>fixed historical share</b> — but ' + lvl + '’s own drift makes that share wrong, so WAPE rises to <b>' + fmtPct(tdW) + '</b> (bottom-up holds <b>' + fmtPct(buW) + '</b>). Aggregate to forecast, reconcile carefully to act.', 'warn');
    }
    _buildTree() {
      const wrap = elt('div'); wrap.style.cssText = 'flex:1 1 100%;display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:13px;color:' + C.sub + ';';
      const tier = (n, lab) => {
        const g = elt('div'); g.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:10px;border:1px solid ' + C.divider + ';background:' + C.soft + ';';
        for (let i = 0; i < n; i++) { const d = elt('span'); d.dataset.dot = '1'; d.style.cssText = 'width:9px;height:9px;border-radius:50%;background:' + C.faint + ';display:inline-block;'; g.append(d); }
        const t = elt('span', null, lab); t.dataset.lab = '1'; t.style.cssText = 'margin-left:4px;font-weight:700;letter-spacing:.04em;'; g.append(t); return g;
      };
      const arrow = () => { const a = elt('span', null, '→'); a.style.cssText = 'font-size:16px;color:' + C.faint + ';'; return a; };
      const sku = tier(6, '6 SKUs'), fam = tier(2, '2 families'), tot = tier(1, 'Total');
      wrap.append(sku, arrow(), fam, arrow(), tot);
      return { wrap, sku, fam, tot };
    }
    _highlightTree() {
      const map = { sku: this._tree.sku, family: this._tree.fam, total: this._tree.tot };
      [this._tree.sku, this._tree.fam, this._tree.tot].forEach(g => {
        const active = map[this.level] === g;
        g.style.borderColor = active ? C.blue : C.divider;
        g.style.background = active ? C.blueLt : C.soft;
        g.querySelectorAll('[data-dot]').forEach(d => { d.style.background = active ? C.blue : C.faint; });
        const lab = g.querySelector('[data-lab]'); if (lab) lab.style.color = active ? C.blueDk : C.sub;
      });
    }
  }
  customElements.define('fc-hierarchy', Hierarchy);

  /* ====================================================================== */
  /* 31 · fc-cadence; horizon & cadence — resample ONE underlying daily      */
  /*      demand series to daily / weekly / monthly. Coarser grain = fewer    */
  /*      points, less variance, a lower % error, a different model and a     */
  /*      different decision. There is no single "right" cadence; the         */
  /*      decision you must make chooses it, not the data.                    */
  /* ====================================================================== */
  class Cadence extends FLBase {
    build() {
      this.ds = getDS(this.getAttribute('data') || 'retail'); // honor data attr for parity; the daily series is synthesized deterministically
      const s = shell(this, 'clamp(300px,44vh,520px)'); this.s = s; this._charts = [s.chart];
      this.grain = 'daily'; this._revealClip = null;
      this._synth();

      // --- cadence selector: one demand, resampled to each grain ----------
      const grainRow = elt('div', 'fl-ctl');
      grainRow.append(label2('Forecast cadence', C.blue),
        segmented([{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }],
          this.grain, v => this._switch(v)));
      s.controls.append(grainRow);

      const score = elt('div', 'fl-metrics'); this.score = score; s.controls.append(score);

      // --- info panel: model / decision / character, updated per grain -----
      this.panel = this._panel(); s.controls.append(this.panel.wrap);

      this.coach = mkCoach(''); s.controls.append(this.coach);
      const cap = elt('div', 'fl-note'); cap.style.cssText = 'flex:1 1 100%;font-size:18px;';
      cap.innerHTML = '<b>The right cadence is set by the decision, not by the data.</b> Coarser is smoother and easier to hit, but it hides the within-period timing you may still need to act on.';
      s.controls.append(cap);

      this.render(false);
    }
    // deterministic daily demand: slow trend + one annual wave + day-of-week + noise.
    // 364 days = 52 weeks = 13 four-week months, so daily/weekly/monthly nest 1:7:28.
    // Fixed seed → identical every reload (no drift). Summing buckets cancels the
    // day-of-week wiggle and shrinks relative noise, so coarser grains are smoother.
    _synth() {
      const rng = mulberry32(4071), TT = 364, daily = [];
      const WK = [-30, -42, -34, -12, 22, 72, 54];                 // weekday trough → weekend peak
      for (let t = 0; t < TT; t++) {
        const trend = 300 + 0.30 * t;                              // slow growth
        const annual = 40 * Math.sin(2 * Math.PI * (t - 40) / 364); // one yearly cycle
        const noise = gauss(rng) * 22;
        daily.push(Math.max(20, trend + annual + WK[t % 7] + noise));
      }
      this.daily = daily; this.TT = TT;
    }
    _resample(B) { const n = Math.floor(this.TT / B), out = []; for (let j = 0; j < n; j++) { let sm = 0; for (let k = 0; k < B; k++) sm += this.daily[j * B + k]; out.push(sm); } return out; }
    _wape(a, f) { let num = 0, den = 0, n = Math.min(a.length, f.length); for (let i = 0; i < n; i++) { num += Math.abs(a[i] - f[i]); den += Math.abs(a[i]); } return den ? 100 * num / den : 0; }
    // per-grain: bucket size, history length (same ~56-day holdout at every grain),
    // x-tick step, the model that fits, and the decision it drives.
    _cfg() {
      const G = {
        daily:   { B: 1,  hist: 308, tick: 28, pre: 'd', model: 'Holt-Winters · m = 7', sub: 'captures day-of-week + calendar', decision: 'Replenishment · staffing · dispatch', fit: (y, H) => M.hw(y, H, { alpha: .28, beta: .02, gamma: .4, m: 7 }) },
        weekly:  { B: 7,  hist: 44,  tick: 8,  pre: 'w', model: 'Holt / ETS · level + trend', sub: 'day-of-week already summed away', decision: 'Ordering · allocation · promo planning', fit: (y, H) => M.holt(y, H, { alpha: .45, beta: .12 }) },
        monthly: { B: 28, hist: 11,  tick: 2,  pre: 'm', model: 'Linear trend · robust level', sub: 'few points → drop seasonality, stay simple', decision: 'S&OP · budget · capacity planning', fit: (y, H) => M.linear(y, H) }
      };
      return G[this.grain];
    }
    _xlabels(n, step, pre) { const a = []; for (let x = 0; x < n; x += step) a.push({ x, t: pre + x }); return a; }
    _switch(g) {
      this.grain = g;
      const cfg = this._cfg(); this._revealClip = cfg.hist - 1;    // clip the forecast at "today", then sweep it in
      this.render(true);
      animateReveal(this.s.chart, x => { this._revealClip = x; this.render(false); }); // short-circuits to full draw under reduced motion
    }
    render(animate) {
      const cfg = this._cfg();
      const series0 = this._resample(cfg.B);
      const hist = cfg.hist, H = series0.length - hist, today = hist - 1;
      const histY = series0.slice(0, hist);
      const res = cfg.fit(histY, H);
      const wape = this._wape(series0.slice(hist), res.fc);

      const rev = [{ x: today, y: series0[today] }];
      for (let i = hist; i < series0.length; i++) rev.push({ x: i, y: series0[i] }); // revealed actual over the holdout
      const series = [
        { pts: histY.map((v, i) => ({ x: i, y: v })), ...ACT },
        { pts: res.fitted.map((v, i) => ({ x: i, y: v })), ...FIT },
        { pts: rev, ...REV, clipRight: this._revealClip },
        { pts: fcPts(histY, res.fc), ...FC, dash: [9, 5], clipRight: this._revealClip }
      ];
      s_set(this.s.chart, {
        series, xmin: 0, xmax: series0.length - 1, ...yRange(series0.concat(res.fc)),
        marker: today, markerLabel: 'today', xlabels: this._xlabels(series0.length, cfg.tick, cfg.pre),
        regions: [{ x0: today, x1: series0.length - 1, color: rgba(C.blue, .05) }]
      });

      // metrics: point count + forecast WAPE (coarser grain → fewer points, lower % error)
      this.score.innerHTML = '';
      this.score.append(metricCard('Points', String(series0.length)));
      const wc = metricCard('Forecast WAPE', wape.toFixed(1) + '%'); this.score.append(wc);
      if (animate) countUp(wc._v, wape, 460, v => v.toFixed(1) + '%'); // guarded: countUp no-ops under reduced motion

      // info panel: model that fits / decision it drives / error character
      this.panel.model.innerHTML = '<b>' + cfg.model + '</b><br><span style="color:' + C.sub + ';font-size:16px">' + cfg.sub + '</span>';
      this.panel.decision.innerHTML = '<b>' + cfg.decision + '</b>';
      this.panel.character.innerHTML = this._char(wape);
      this._coach();
    }
    _char(w) {
      if (this.grain === 'daily') return 'Highest % error (WAPE <b>' + w.toFixed(1) + '%</b>), but every weekend peak and promo day stays visible — the timing you act on.';
      if (this.grain === 'weekly') return 'Smoother: WAPE falls to <b>' + w.toFixed(1) + '%</b>. Day-of-week is gone; you read the ordering rhythm, not the daily spikes.';
      return 'Lowest % error (WAPE <b>' + w.toFixed(1) + '%</b>) and easy to hit — but it can\'t tell you which week inside the month the demand lands.';
    }
    _coach() {
      if (this.grain === 'daily') this.coach._set('<b>Daily</b> is spiky and hardest to hit — yet it is the grain you replenish, staff and dispatch on. You need the timing.', 'hint');
      else if (this.grain === 'weekly') this.coach._set('<b>Weekly</b> sums 7 days and cancels the day-of-week wiggle — same demand, one-seventh the points, a calmer curve to order against.', 'neutral');
      else this.coach._set('<b>Monthly</b> is coarse and smooth — ideal for S&OP and budgets. You trade away within-month timing to gain a number you can actually hit.', 'good');
    }
    _panel() {
      const wrap = elt('div'); wrap.style.cssText = 'flex:1 1 100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;';
      const field = t => {
        const box = elt('div'); box.style.cssText = 'border:1.5px solid ' + C.divider + ';border-radius:3px;background:' + C.soft + ';padding:15px 17px;display:flex;flex-direction:column;gap:9px;';
        const lab = elt('div', null, t); lab.style.cssText = "font-family:'Space Mono',monospace;font-size:15px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:" + C.sub + ";";
        const val = elt('div'); val.style.cssText = 'font-size:19px;line-height:1.34;font-weight:600;color:' + C.ink + ';';
        box.append(lab, val); wrap.append(box); return val;
      };
      return { wrap, model: field('Model that fits'), decision: field('Decision it drives'), character: field('Error / character') };
    }
  }
  customElements.define('fc-cadence', Cadence);

  /* ====================================================================== */
  /* 32 · fc-explain; explainability — glass-box (readable feature           */
  /*      attribution) vs black-box (marginally better fit, opaque "why").    */
  /*      Same SKU, same holdout: the black box edges the error, but only     */
  /*      the glass box lets you read, audit, override and defend each number.*/
  /* ====================================================================== */
  class Explain extends FLBase {
    build() {
      const ds = this.ds = getDS(this.getAttribute('data') || 'canon');
      const s = shell(this, 'clamp(300px,44vh,520px)'); this.s = s; this._charts = [s.chart];
      const n = ds.n;
      this.split = clamp(Math.round(n * 0.75), 12, n - 6);
      this.hoLen = n - this.split;
      this.model = 'glass';
      this.selH = Math.min(this.hoLen - 1, Math.round(this.hoLen / 2)); // holdout week being explained
      this._revealClip = null;
      // fit BOTH models once on the same train window, hold out the recent weeks
      const train = ds.y.slice(0, this.split), dowAt = dowAtFor(ds);
      this.glass = M.ml(train, this.hoLen, { feats: { trend: true, yearly: true }, dowAt }); // GLM, exposes beta
      const xTr = train.map((_, i) => i), xPred = ds.y.map((_, i) => i);
      this.black = gboost(xTr, train, 10, 0.3, xPred);                                       // boosted stumps
      const ho = ds.y.slice(this.split);
      this.glassWAPE = this._wape(ho, this.glass.fc);
      this.blackWAPE = this._wape(ho, this.black.pred.slice(this.split));

      // --- model toggle ---------------------------------------------------
      const tog = elt('div', 'fl-ctl');
      tog.append(label2('Which model?', C.blue),
        segmented([{ value: 'glass', label: 'Glass-box · GLM' }, { value: 'black', label: 'Black-box · Boosted trees' }],
          this.model, v => this._switch(v)));
      s.controls.append(tog);

      const score = elt('div', 'fl-metrics'); this.score = score; s.controls.append(score);

      // --- "Why this prediction?" panel — the heart of the widget ---------
      const why = elt('div'); why.style.cssText = 'flex:1 1 100%;border:1.5px solid ' + C.divider + ';border-radius:3px;background:' + C.soft + ';padding:18px 20px;';
      const whyHead = elt('div'); whyHead.style.cssText = "font-family:'Space Mono',monospace;font-size:16px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:" + C.sub + ";display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap;";
      const whyBody = elt('div'); whyBody.style.cssText = 'margin-top:14px;';
      why.append(whyHead, whyBody); this.why = { head: whyHead, body: whyBody };
      s.controls.append(why);

      this.coach = mkCoach(''); s.controls.append(this.coach);
      const cap = elt('div', 'fl-note'); cap.style.cssText = 'flex:1 1 100%;font-size:18px;';
      cap.innerHTML = '<b>Model choice is an explainability choice.</b> The black box may edge the glass box on error, yet you can’t read, audit, override or debug it. When the call is regulated or high-stakes, the readable model usually wins.';
      s.controls.append(cap);

      // click a forecast week to explain it
      s.cv.addEventListener('pointerdown', e => {
        if (!this.s.chart.plot) return;
        const h = clamp(Math.round(this.s.chart.pxToData(e.clientX)) - this.split, 0, this.hoLen - 1);
        if (h !== this.selH) { this.selH = h; this.render(false); }
      });
      this.render(false);
    }
    _wape(a, p) { let num = 0, den = 0, k = Math.min(a.length, p.length); for (let i = 0; i < k; i++) { num += Math.abs(a[i] - p[i]); den += Math.abs(a[i]); } return den ? 100 * num / den : 0; }
    _switch(v) {
      this.model = v;
      this._revealClip = this.split - 1;      // clip forecast + reveal at "today", then sweep it in
      this.render(true);
      animateReveal(this.s.chart, x => { this._revealClip = x; this.render(false); }); // short-circuits under reduced motion
    }
    _attr(h) { // glass-box additive attribution for holdout week h; sums exactly to glass.fc[h]
      const t = this.split + h, b = this.glass.beta;
      const base = b[0], trend = b[1] * (t / 100), seas = b[2] * Math.sin(2 * Math.PI * t / 182) + b[3] * Math.cos(2 * Math.PI * t / 182);
      return { t, base, trend, seas, pred: base + trend + seas };
    }
    render(animate) {
      const ds = this.ds, split = this.split, n = ds.n, glass = this.model === 'glass';
      const fcArr = glass ? this.glass.fc : this.black.pred.slice(split);
      const fitArr = glass ? this.glass.fitted : this.black.pred.slice(0, split);
      const selY = fcArr[this.selH], selX = split + this.selH;
      const rev = []; for (let i = split - 1; i < n; i++) rev.push({ x: i, y: ds.y[i] });
      const series = [
        { pts: ds.y.slice(0, split).map((v, i) => ({ x: i, y: v })), ...ACT },
        { pts: fitArr.map((v, i) => ({ x: i, y: v })), ...FIT },
        { pts: rev, ...REV, clipRight: this._revealClip },
        { pts: fcPts(ds.y.slice(0, split), fcArr), ...FC, dash: [9, 5], clipRight: this._revealClip }
      ];
      const all = ds.y.slice(); fcArr.forEach(v => all.push(v));
      s_set(this.s.chart, {
        series, xmin: 0, xmax: n - 1, ...yRange(all),
        marker: split - 1, markerLabel: 'today',
        xlabels: this._xlabels(n, Math.max(1, Math.round(n / 8))),
        regions: [{ x0: split - 1, x1: n - 1, color: rgba(glass ? C.blue : C.faint, .06), label: 'held out' }],
        after: (ctx, geo) => {
          if (this._revealClip != null && selX > this._revealClip) return; // stay hidden until the sweep reaches it
          const px = geo.xToPx(selX), py = geo.yToPx(selY);
          ctx.save();
          ctx.strokeStyle = rgba(glass ? C.blue : C.faint, .5); ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(px, geo.y0 + 6); ctx.lineTo(px, geo.y1); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = glass ? C.blue : C.sub; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
          ctx.strokeStyle = C.white; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
        }
      });
      this._readout(animate);
      this._why();
    }
    _readout(animate) {
      const glass = this.model === 'glass', w = glass ? this.glassWAPE : this.blackWAPE;
      this.score.innerHTML = '';
      const wc = metricCard('Holdout WAPE', fmtPct(w)); this.score.append(wc);
      const ac = metricCard('Auditability', glass ? 'Readable' : 'Opaque'); ac._v.style.color = glass ? C.teal : C.red;
      this.score.append(ac);
      if (animate) countUp(wc._v, w, 460, fmtPct); // guarded: no-ops under reduced motion
      const gW = fmtPct(this.glassWAPE), bW = fmtPct(this.blackWAPE);
      if (glass) this.coach._set('<b>Glass-box.</b> Error is a touch higher (<b>' + gW + '</b> vs the black box’s <b>' + bW + '</b>), but every number reads as base + trend + season. You can audit it, override it, and defend it to a regulator.', 'good');
      else this.coach._set('<b>Black-box.</b> Lower error (<b>' + bW + '</b> vs <b>' + gW + '</b>) — yet the number is an opaque vote of trees. You can’t say <i>why</i>, audit it, or justify an override. In high-stakes calls that cost usually outweighs the accuracy.', 'warn');
    }
    _why() {
      const glass = this.model === 'glass', head = this.why.head, body = this.why.body;
      body.innerHTML = '';
      if (glass) {
        const a = this._attr(this.selH), actual = this.ds.y[a.t], off = Math.abs(a.pred - actual);
        head.innerHTML = 'Why week ' + a.t + '? &nbsp;<span style="color:' + C.blueDk + '">click any forecast point</span>';
        const dScale = Math.max(Math.abs(a.trend), Math.abs(a.seas), 30);
        const tile = (lab, val, col) => { const d = elt('div'); const l = elt('div', null, lab); l.style.cssText = "font-family:'Space Mono',monospace;font-size:14px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:" + C.sub; const v = elt('div', null, Math.round(val).toLocaleString()); v.style.cssText = 'font-size:30px;font-weight:700;color:' + col + ';font-variant-numeric:tabular-nums;'; d.append(l, v); return d; };
        const top = elt('div'); top.style.cssText = 'display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:12px;';
        const ar = elt('div', null, '→'); ar.style.cssText = 'font-size:24px;color:' + C.faint;
        top.append(tile('Base level', a.base, C.ink), ar, tile('Prediction', a.pred, C.blueDk));
        body.append(top, this._deltaRow('Trend', a.trend, dScale), this._deltaRow('Seasonal cycle', a.seas, dScale));
        const foot = elt('div'); foot.style.cssText = 'margin-top:12px;font-size:16px;color:' + C.sub + ';';
        foot.innerHTML = 'Actual <b style="color:' + C.ink + '">' + Math.round(actual).toLocaleString() + '</b> · reads as <b>' + Math.round(a.base).toLocaleString() + ' ' + (a.trend >= 0 ? '+ ' : '− ') + Math.abs(Math.round(a.trend)) + ' ' + (a.seas >= 0 ? '+ ' : '− ') + Math.abs(Math.round(a.seas)) + '</b>, off by ' + Math.round(off).toLocaleString() + '.';
        body.append(foot);
      } else {
        const bp = Math.round(this.black.pred.slice(this.split)[this.selH]), t = this.split + this.selH;
        head.innerHTML = 'Why week ' + t + '? &nbsp;<span style="color:' + C.sub + '">predicted ' + bp.toLocaleString() + ' units</span>';
        const box = elt('div'); box.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
        const lock = elt('div'); lock.style.cssText = 'display:flex;align-items:center;gap:12px;';
        const badge = elt('span', null, '▧'); badge.style.cssText = 'width:34px;height:34px;flex:none;display:flex;align-items:center;justify-content:center;font-size:18px;background:' + rgba(C.faint, .3) + ';color:' + C.sub + ';border-radius:3px;';
        const lt = elt('div', null, 'No readable attribution'); lt.style.cssText = 'font-size:24px;font-weight:700;color:' + C.sub;
        lock.append(badge, lt);
        const sub = elt('div'); sub.style.cssText = 'font-size:17px;line-height:1.5;color:' + C.sub;
        sub.innerHTML = 'The same number is the summed vote of <b style="color:' + C.ink + '">hundreds of boosted trees</b>, each a stack of yes/no splits. No stable per-driver breakdown exists to read, audit, or hand to a regulator.';
        const rules = elt('div'); rules.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;font-family:"Space Mono",monospace;font-size:15px;color:' + C.faint + ';filter:blur(0.7px);opacity:.75;';
        ['wk ≤ ?', 'lag₁ ≤ ?', 'roll₄ ≥ ?', 'wk ≤ ?', 'trend ≥ ?'].forEach(txt => { const c = elt('span', null, txt); c.style.cssText = 'padding:6px 10px;border:1.5px dashed ' + rgba(C.faint, .5) + ';border-radius:3px;'; rules.append(c); });
        const more = elt('span', null, '… and hundreds more, interacting'); more.style.cssText = 'padding:6px 10px;color:' + C.sub + ';filter:none;';
        rules.append(more);
        box.append(lock, sub, rules); body.append(box);
      }
    }
    _deltaRow(label, val, scale) {
      const row = elt('div'); row.style.cssText = 'display:grid;grid-template-columns:150px 1fr 76px;align-items:center;gap:14px;margin:8px 0;';
      const lab = elt('div', null, label); lab.style.cssText = "font-family:'Space Mono',monospace;font-size:15px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:" + C.sub;
      const track = elt('div'); track.style.cssText = 'position:relative;height:16px;background:' + rgba(C.faint, .16) + ';border-radius:2px;';
      const mid = elt('i'); mid.style.cssText = 'position:absolute;left:50%;top:-2px;bottom:-2px;width:1.5px;background:' + rgba(C.faint, .6); track.append(mid);
      const pos = val >= 0, col = pos ? C.teal : C.red, w = clamp(Math.abs(val) / scale * 50, 0, 50);
      const fill = elt('i'); fill.style.cssText = 'position:absolute;top:2px;bottom:2px;' + (pos ? 'left:50%' : 'right:50%') + ';width:' + (reducedMotion() ? w : 0) + '%;background:' + col + ';border-radius:1px;transition:' + (reducedMotion() ? 'none' : 'width .45s cubic-bezier(.2,.7,.2,1)');
      track.append(fill);
      const num = elt('div', null, (pos ? '+' : '−') + Math.abs(Math.round(val)).toLocaleString()); num.style.cssText = 'text-align:right;font-family:"Space Mono",monospace;font-size:19px;font-weight:700;color:' + col + ';font-variant-numeric:tabular-nums;';
      row.append(lab, track, num);
      if (!reducedMotion()) requestAnimationFrame(() => { fill.style.width = w + '%'; });
      return row;
    }
    _xlabels(n, step) { const a = []; for (let x = 0; x < n; x += step) a.push({ x, t: 'wk ' + x }); return a; }
  }
  customElements.define('fc-explain', Explain);

  /* ===FL_DECK_ONLY_START (operational demos; presentation copy only) === */
  /* ====================================================================== */
  /* Operational demos: value, system integration, trust, bullwhip          */
  /* ====================================================================== */
  function opsCssText() {
    return `
      .fl-ops{font-family:'Inter',-apple-system,sans-serif;color:${C.ink};width:100%}
      .fl-ops-card{background:#fff;border:1px solid ${C.divider};border-radius:16px;padding:32px;box-shadow:0 1px 2px rgba(8,8,9,.05);min-height:430px;display:flex;flex-direction:column;justify-content:center}
      .fl-ops-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
      .fl-ops-metric{border:1px solid ${C.divider};border-radius:12px;background:${C.soft};padding:18px;min-height:118px}
      .fl-ops-metric span{display:block;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:13px;letter-spacing:.09em;text-transform:uppercase;color:${C.sub}}
      .fl-ops-metric b{display:block;margin-top:12px;font-size:42px;line-height:.95;font-weight:850;font-variant-numeric:tabular-nums;color:${C.ink}}
      .fl-ops-metric.accent{border-color:${C.blue};background:${C.blueLt}}
      .fl-ops-metric.accent b{color:${C.blueDk}}
      .fl-ops-controls{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:22px}
      .fl-ops-control label{display:flex;justify-content:space-between;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${C.sub};margin-bottom:9px}
      .fl-ops-control input{width:100%;accent-color:${C.blue}}
      .fl-workflow{display:grid;grid-template-columns:1fr 42px 1fr 42px 1fr;gap:12px;align-items:stretch;margin-top:26px}
      .fl-workflow-step{border:1px solid ${C.divider};border-radius:12px;background:#fff;padding:20px;min-height:132px;display:flex;flex-direction:column;justify-content:space-between}
      .fl-workflow-step strong{font-size:25px;line-height:1.05}.fl-workflow-step span{font-size:18px;line-height:1.32;color:${C.sub}}
      .fl-workflow-arrow{display:grid;place-items:center;color:${C.blue};font-size:30px;font-weight:900}
      .fl-flow{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
      .fl-flow-node{min-height:252px;border:1px solid ${C.divider};border-top:6px solid ${C.blue};border-radius:14px;background:${C.soft};padding:22px 16px;display:flex;flex-direction:column;justify-content:flex-start;gap:92px;position:relative;overflow:hidden;transition:transform .35s cubic-bezier(.23,1,.32,1),background .35s cubic-bezier(.23,1,.32,1),border-color .35s cubic-bezier(.23,1,.32,1)}
      .fl-flow-node:before{content:attr(data-step);position:absolute;right:13px;top:70px;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:66px;line-height:1;font-weight:900;color:rgba(8,102,255,.14);letter-spacing:-.03em}
      .fl-flow-node.hot{transform:translateY(-10px);background:#fff;border-color:${C.blue}}
      .fl-flow-node strong{font-size:24px;line-height:1.02}
      .fl-flow-node span{font-size:17px;line-height:1.32;color:#7A7E85}
      .fl-ops-action{display:flex;align-items:center;gap:18px;margin-top:22px}
      .fl-ops-action button{border:0;border-radius:12px;background:${C.blue};color:#fff;padding:16px 24px;font-size:20px;font-weight:850;cursor:pointer}
      .fl-ops-action p{margin:0;color:${C.sub};font-size:20px;line-height:1.35}
      .fl-trust{display:grid;grid-template-columns:1.15fr .85fr;gap:22px}
      .fl-checks{display:grid;gap:12px}
      .fl-check{display:grid;grid-template-columns:48px 1fr auto;gap:16px;align-items:center;border:1px solid ${C.divider};border-radius:14px;background:#fff;padding:18px}
      .fl-check i{width:48px;height:48px;border-radius:10px;background:${C.blueLt};display:grid;place-items:center;font-style:normal;font-weight:900;color:${C.blueDk}}
      .fl-check strong{display:block;font-size:24px;line-height:1.05}.fl-check span{display:block;color:${C.sub};font-size:18px;margin-top:4px}
      .fl-verdict{border:1px solid ${C.divider};border-radius:16px;background:${C.soft};padding:28px;display:flex;flex-direction:column;justify-content:center}
      .fl-verdict b{font-size:74px;line-height:.88;color:${C.blueDk}}.fl-verdict p{font-size:24px;line-height:1.35;color:${C.sub};margin:22px 0 0}
      .fl-bull{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;align-items:end;min-height:360px}
      .fl-bull-step{display:flex;flex-direction:column;justify-content:flex-end;gap:10px;height:360px}
      .fl-bull-bar{border-radius:10px 10px 3px 3px;background:linear-gradient(180deg,${C.blue},${C.teal});min-height:34px;transition:height .45s cubic-bezier(.23,1,.32,1)}
      .fl-bull-step b{font-size:21px;line-height:1.05}.fl-bull-step span{font-family:ui-monospace,'SF Mono',Menlo,monospace;color:${C.sub};font-weight:800;font-size:15px}
    `;
  }
  function ensureOpsCss() {
    if (document.getElementById('fl-ops-css')) return;
    const s = document.createElement('style');
    s.id = 'fl-ops-css';
    s.textContent = opsCssText();
    document.head.appendChild(s);
  }
  function fmtK(v) { return '$' + Math.round(v).toLocaleString('en-US') + 'k'; }
  function defineOps(tag, fn) {
    class Ops extends HTMLElement {
      connectedCallback() {
        if (this._ops) return;
        this._ops = true;
        ensureOpsCss();
        const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
        root.innerHTML = '';
        const style = document.createElement('style');
        style.textContent = opsCssText();
        const mount = document.createElement('div');
        mount.className = 'fl-ops';
        root.append(style, mount);
        fn.call(mount);
      }
    }
    try { customElements.define(tag, Ops); } catch (e) {}
  }
  defineOps('fc-business-value', function () {
    this.innerHTML = `
      <div class="fl-ops-card">
        <div class="fl-ops-grid">
          <div class="fl-ops-metric accent"><span>Planning time saved</span><b data-hours>19h</b></div>
          <div class="fl-ops-metric"><span>Meeting cost removed</span><b data-time>$21k</b></div>
          <div class="fl-ops-metric"><span>Inventory at risk</span><b data-risk>$420k</b></div>
          <div class="fl-ops-metric"><span>Mode</span><b data-mode>assist</b></div>
        </div>
        <div class="fl-ops-controls">
          <div class="fl-ops-control"><label>planners <b data-pv>6</b></label><input data-p type="range" min="1" max="18" value="6"></div>
          <div class="fl-ops-control"><label>hours/week <b data-hv>5</b></label><input data-h type="range" min="1" max="12" value="5"></div>
          <div class="fl-ops-control"><label>stockout cost <b data-cv>$50k</b></label><input data-c type="range" min="10" max="140" value="50"></div>
        </div>
        <div class="fl-workflow">
          <div class="fl-workflow-step"><strong>Replace</strong><span>weekly export and manual consolidation</span></div>
          <div class="fl-workflow-arrow">→</div>
          <div class="fl-workflow-step"><strong>Support</strong><span>planner judgment for launches and shocks</span></div>
          <div class="fl-workflow-arrow">→</div>
          <div class="fl-workflow-step"><strong>Automate</strong><span>stable SKUs, baseline updates, exception routing</span></div>
        </div>
      </div>`;
    const p = this.querySelector('[data-p]'), h = this.querySelector('[data-h]'), c = this.querySelector('[data-c]');
    const render = () => {
      const pv = +p.value, hv = +h.value, cv = +c.value;
      const saved = pv * hv * .64, time = saved * 1.1, risk = cv * (2.5 + pv / 3);
      this.querySelector('[data-pv]').textContent = pv;
      this.querySelector('[data-hv]').textContent = hv;
      this.querySelector('[data-cv]').textContent = fmtK(cv);
      this.querySelector('[data-hours]').textContent = saved.toFixed(0) + 'h';
      this.querySelector('[data-time]').textContent = fmtK(time);
      this.querySelector('[data-risk]').textContent = fmtK(risk);
      this.querySelector('[data-mode]').textContent = saved > 42 ? 'pilot' : saved > 18 ? 'assist' : 'manual';
    };
    [p, h, c].forEach(x => x.addEventListener('input', render)); render();
  });
  defineOps('fc-deploy-loop', function () {
    this.innerHTML = `
      <div class="fl-ops-card">
        <div class="fl-flow">
          <div class="fl-flow-node" data-step="01"><strong>Data contract</strong><span>price, promo, stockout, lead time, inventory owner</span></div>
          <div class="fl-flow-node" data-step="02"><strong>Warehouse</strong><span>fresh extract passes schema and missingness checks</span></div>
          <div class="fl-flow-node" data-step="03"><strong>Forecast job</strong><span>baseline, interval, cost-aware build point</span></div>
          <div class="fl-flow-node" data-step="04"><strong>Approval log</strong><span>planner reviews shocks, large changes, high buffers</span></div>
          <div class="fl-flow-node" data-step="05"><strong>ERP action</strong><span>purchase order, staffing, freight, allocation</span></div>
          <div class="fl-flow-node" data-step="06"><strong>Monitor</strong><span>actuals, overrides, drift, retrain trigger</span></div>
        </div>
        <div class="fl-ops-action"><button type="button">Run production cycle</button><p data-status>Ready: data contract owner accepted the input fields.</p></div>
      </div>`;
    const nodes = Array.from(this.querySelectorAll('.fl-flow-node'));
    const status = this.querySelector('[data-status]');
    const copy = [
      'Input fields have owners, freshness rules, and failure paths.',
      'Warehouse extract passes schema and missingness checks.',
      'Forecast job beats baseline and writes interval plus build recommendation.',
      'Large variance, shocks, and high buffers require named approval.',
      'Approved quantity becomes ERP, staffing, or logistics action.',
      'Actuals, overrides, drift, and service level feed monitor and retrain.'
    ];
    let i = 0;
    const paint = () => { nodes.forEach((n, k) => n.classList.toggle('hot', k === i)); status.textContent = copy[i]; };
    this.querySelector('button').onclick = () => { i = (i + 1) % nodes.length; paint(); };
    paint();
  });
  defineOps('fc-trust-dashboard', function () {
    this.innerHTML = `
      <div class="fl-ops-card fl-trust">
        <div class="fl-checks">
          <div class="fl-check"><i>1</i><div><strong>Baseline gate</strong><span>beats same-as-last-week and current spreadsheet</span></div><b>pass</b></div>
          <div class="fl-check"><i>2</i><div><strong>Coverage gate</strong><span>interval contains actuals often enough</span></div><b>89%</b></div>
          <div class="fl-check"><i>3</i><div><strong>Override gate</strong><span>shocks routed to a named owner</span></div><b>on</b></div>
          <div class="fl-check"><i>4</i><div><strong>Drift gate</strong><span>alert triggers before automation keeps running</span></div><b>watch</b></div>
        </div>
        <div class="fl-verdict"><b>pilot</b><p>Automation is allowed for stable cases. Launch weeks, stockouts, missing data, and large jumps require planner approval.</p></div>
      </div>`;
  });
  defineOps('fc-bullwhip', function () {
    this.innerHTML = `
      <div class="fl-ops-card">
        <div class="fl-bull">
          <div class="fl-bull-step"><div class="fl-bull-bar"></div><b>Demand</b><span>+10%</span></div>
          <div class="fl-bull-step"><div class="fl-bull-bar"></div><b>Sales</b><span>+14%</span></div>
          <div class="fl-bull-step"><div class="fl-bull-bar"></div><b>Supply</b><span>+21%</span></div>
          <div class="fl-bull-step"><div class="fl-bull-bar"></div><b>Logistics</b><span>+31%</span></div>
          <div class="fl-bull-step"><div class="fl-bull-bar"></div><b>Finance</b><span>+46%</span></div>
        </div>
        <div class="fl-ops-action"><button type="button">Propagate buffer</button><p data-status>Each team adds a rational local buffer. The company sees amplified demand upstream.</p></div>
      </div>`;
    const bars = Array.from(this.querySelectorAll('.fl-bull-bar'));
    const vals = [46, 78, 116, 172, 255];
    let on = true;
    const paint = () => bars.forEach((bar, i) => { bar.style.height = (on ? vals[i] : vals[0]) + 'px'; });
    this.querySelector('button').onclick = () => { on = !on; paint(); };
    paint();
  });
  /* ===FL_DECK_ONLY_END=== */

})();
