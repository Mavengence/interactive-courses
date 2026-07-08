/* ============================================================================
   Hands-on act widgets: live forecast simulations. Offline, vanilla JS,
   no build step. Requires forecast-lab.js (window.FL) loaded first.
   Elements:  <hs-race>        act 1: Amazon ZIP-level baseline vs AI challenger
              <hs-buffer-run>  act 2: Apple SDM-to-store handoff bullwhip
              <hs-trust-loop>  act 3: Meta fast user-demand trust loop
   Motion vocabulary (after Mavengence/interactive-courses): rAF loops with a
   time accumulator, draw-on line sweeps, count-up money, pulse/alarm states,
   particles along a pipeline. Reduced-motion collapses to instant end-states.
   Acts talk to the page via  document 'hs:result'  {act, value, label, copy}.
   ============================================================================ */
(function () {
  "use strict";
  if (window.__HS_ACTS__) return;
  window.__HS_ACTS__ = true;
  var FL = window.FL;
  if (!FL) { console.error("hands-on-acts: forecast-lab.js must load first"); return; }

  var REDUCE = false;
  try { REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var clamp = FL.clamp, mean = FL.mean, gauss = FL.gauss, mulberry32 = FL.mulberry32;

  /* ---------- tiny DOM helpers ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function money(v) { // dollars in
    var s = v < 0 ? "-" : "", a = Math.abs(v);
    if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
    if (a >= 1e3) return s + "$" + Math.round(a / 1e3) + "k";
    return s + "$" + Math.round(a);
  }
  function pct(x) { return Math.round(x * 100) + "%"; }
  // inverse normal CDF (Acklam approximation; teaching-widget accuracy)
  function invNorm(p) {
    p = clamp(p, 1e-4, 1 - 1e-4);
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    var b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    var c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    var d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    var pl = 0.02425, q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= 1 - pl) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // small ridge solve (normal equations + gaussian elimination) for act 1 "AI features"
  function ridgeFit(X, Y, lam) {
    var p = X[0].length, A = [], bv = [], i, j, k;
    for (j = 0; j < p; j++) { A.push(new Array(p).fill(0)); bv.push(0); }
    for (i = 0; i < X.length; i++) for (j = 0; j < p; j++) { bv[j] += X[i][j] * Y[i]; for (k = 0; k < p; k++) A[j][k] += X[i][j] * X[i][k]; }
    for (j = 1; j < p; j++) A[j][j] += lam;
    var M = A.map(function (r, ii) { return r.concat([bv[ii]]); }), n = p;
    for (var cIdx = 0; cIdx < n; cIdx++) {
      var piv = cIdx;
      for (var r2 = cIdx + 1; r2 < n; r2++) if (Math.abs(M[r2][cIdx]) > Math.abs(M[piv][cIdx])) piv = r2;
      var tmp = M[cIdx]; M[cIdx] = M[piv]; M[piv] = tmp;
      var pv = M[cIdx][cIdx] || 1e-9;
      for (k = cIdx; k <= n; k++) M[cIdx][k] /= pv;
      for (r2 = 0; r2 < n; r2++) { if (r2 === cIdx) continue; var f = M[r2][cIdx]; for (k = cIdx; k <= n; k++) M[r2][k] -= f * M[cIdx][k]; }
    }
    return M.map(function (r) { return r[n]; });
  }

  /* ---------- shared stylesheet ---------- */
  var BLUE = "#245CFF", INK = "#101014", SUB = "#5e5b55", LINE = "#d8d0bf",
    PAPER = "#fffdf7", SOFT = "#f2ede1", RUST = "#bd3f10", RED = "#d11f1f",
    TEAL = "#0b8f99", GREEN = "#0a7d52", GOLD = "#c8952d", OLIVE = "#6b6a45";
  var EASE = "cubic-bezier(.23,1,.32,1)";
  var CSS = "" +
    ".hs{--blue:" + BLUE + ";--ink:" + INK + ";--sub:" + SUB + ";--line:" + LINE + ";--paper:" + PAPER + ";--soft:" + SOFT + ";--rust:" + RUST + ";--red:" + RED + ";--teal:" + TEAL + ";--green:" + GREEN + ";--gold:" + GOLD + ";--olive:" + OLIVE + ";" +
    "display:block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:var(--ink)}" +
    ".hs *{box-sizing:border-box}" +
	    ".hs-card{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:14px 16px;box-shadow:0 18px 54px -42px rgba(6,36,63,.5)}" +
	    ".hs.dark .hs-card{--paper:#0f2333;--ink:#eef6ff;--sub:#a7b8c8;--line:#25455f;--soft:#142d42;background:var(--paper);box-shadow:0 22px 64px -40px rgba(0,0,0,.8)}" +
	    ".hs.dark .hs-verdict{color:#eef6ff;background:linear-gradient(90deg,rgba(126,189,255,.12),transparent)}" +
	    ".hs.dark .hs-verdict b,.hs.dark .hs-note b{color:#ffffff}" +
	    ".hs.dark .hs-verdict[data-tone=warn]{background:linear-gradient(90deg,rgba(255,90,78,.16),transparent)}" +
	    ".hs.dark .hs-verdict[data-tone=good]{background:linear-gradient(90deg,rgba(55,194,160,.16),transparent)}" +
	    ".hs.dark .hs-verdict[data-tone=gold]{background:linear-gradient(90deg,rgba(232,184,75,.16),transparent)}" +
	    ".hs-chartwrap{position:relative;width:100%}" +
    ".hs-chartwrap canvas{display:block;width:100%;height:100%}" +
    ".hs-live{display:inline-flex;align-items:center;gap:7px;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--sub);font-weight:900;margin-bottom:8px}" +
    ".hs-live .dot{width:8px;height:8px;border-radius:50%;background:var(--teal)}" +
    ".hs-live[data-on] .dot{animation:hsPulse 1.4s ease-in-out infinite}" +
    ".hs-live[data-alarm] .dot{background:var(--red);animation:hsPulse .6s ease-in-out infinite}" +
    "@keyframes hsPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}" +
    ".hs-ctl{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:flex-end;margin-top:12px}" +
    ".hs-field{flex:1 1 190px;min-width:160px}" +
    ".hs-lab{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--sub);display:flex;justify-content:space-between;margin-bottom:6px;font-weight:700}" +
    ".hs-lab b{color:var(--blue);font-variant-numeric:tabular-nums}" +
    ".hs.dark .hs-lab b{color:#7ebdff}" +
    ".hs input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:6px;background:var(--line);outline-offset:4px;cursor:pointer}" +
    ".hs input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--blue);border:2px solid #fff;box-shadow:0 2px 8px rgba(36,92,255,.4),0 0 0 4px rgba(36,92,255,.12);cursor:grab;transition:transform .18s " + EASE + "}" +
    ".hs input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.15)}" +
    ".hs input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--blue);border:2px solid #fff;cursor:grab}" +
    ".hs-seg{display:inline-flex;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:var(--paper)}" +
    ".hs-seg button{font-family:ui-monospace,monospace;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;font-weight:700;padding:8px 11px;background:transparent;border:0;border-left:1px solid var(--line);cursor:pointer;color:var(--sub)}" +
    ".hs-seg button:first-child{border-left:0}" +
    ".hs-seg button[aria-pressed=true]{background:var(--blue);color:#fff}" +
    ".hs-btn{appearance:none;border:0;border-radius:6px;background:var(--blue);color:#fff;font-family:ui-monospace,monospace;font-size:11.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:11px 16px;cursor:pointer;transition:transform .06s,filter .15s}" +
    ".hs-btn:hover{filter:brightness(1.1)} .hs-btn:active{transform:scale(.97)}" +
    ".hs-btn[disabled]{opacity:.55;cursor:default}" +
    ".hs-btn.ghost{background:transparent;color:var(--ink);border:1.5px solid var(--line)}" +
    ".hs-btn.hot{animation:hsInvite 1.8s " + EASE + " infinite}" +
    "@keyframes hsInvite{0%,100%{box-shadow:0 0 0 0 rgba(36,92,255,.45)}50%{box-shadow:0 0 0 9px rgba(36,92,255,0)}}" +
    ".hs-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(108px,1fr));gap:9px;margin-top:12px}" +
    ".hs-metric{border:1px solid var(--line);border-radius:6px;padding:8px 10px;background:var(--paper)}" +
    ".hs-metric .k{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--sub);font-weight:700}" +
    ".hs-metric .v{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.01em;margin-top:2px;transition:color .3s}" +
    ".hs-metric.warn{border-color:rgba(209,31,31,.5)} .hs-metric.warn .v{color:var(--red)}" +
    ".hs-metric.good{border-color:rgba(11,143,153,.5)} .hs-metric.good .v{color:var(--teal)}" +
    ".hs-metric.accent{border-color:rgba(36,92,255,.5)} .hs-metric.accent .v{color:var(--blue)}" +
    ".hs.dark .hs-metric.accent .v{color:#7ebdff}" +
    ".hs-verdict{margin-top:11px;padding:10px 13px;border-radius:6px;font-size:13.5px;line-height:1.38;border-left:4px solid var(--blue);background:linear-gradient(90deg,rgba(36,92,255,.08),transparent);transition:border-color .35s,background .35s}" +
    ".hs-verdict b{font-weight:800}" +
    ".hs-verdict[data-tone=warn]{border-left-color:var(--red);background:linear-gradient(90deg,rgba(209,31,31,.10),transparent)}" +
    ".hs-verdict[data-tone=good]{border-left-color:var(--teal);background:linear-gradient(90deg,rgba(11,143,153,.10),transparent)}" +
	    ".hs-verdict[data-tone=gold]{border-left-color:var(--gold);background:linear-gradient(90deg,rgba(200,149,45,.12),transparent)}" +
	    ".hs-note{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.03em;color:var(--sub);margin-top:9px;line-height:1.35}" +
	    ".hs-note b{color:var(--ink)}" +
	    ".hs-gates{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:7px;margin-top:10px}" +
	    ".hs-gate{border:1px solid var(--line);border-radius:6px;padding:7px 8px;background:var(--paper);min-height:48px}" +
	    ".hs-gate b{display:block;font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
	    ".hs-gate span{display:block;margin-top:4px;font-size:12px;line-height:1.12;font-weight:850;color:var(--ink)}" +
	    ".hs-gate.pass{border-color:rgba(11,143,153,.55);background:rgba(11,143,153,.08)}" +
	    ".hs-gate.review{border-color:rgba(200,149,45,.65);background:rgba(200,149,45,.10)}" +
	    ".hs-gate.hold{border-color:rgba(209,31,31,.58);background:rgba(209,31,31,.10)}" +
	    ".hs-modebar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:10px}" +
	    ".hs-modepill{display:inline-flex;align-items:center;min-height:30px;border-radius:6px;padding:7px 10px;background:var(--blue);color:#fff;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:900}" +
	    ".hs-modepill.review{background:var(--gold);color:#101014}.hs-modepill.hold{background:var(--red);color:#fff}" +
	    ".hs-case{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}" +
	    ".hs-case div{border:1px solid var(--line);border-radius:6px;padding:7px 8px;background:color-mix(in srgb,var(--soft) 58%,transparent)}" +
	    ".hs-case b{display:block;font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--sub)}" +
	    ".hs-case span{display:block;margin-top:3px;font-size:12px;line-height:1.22;font-weight:760;color:var(--ink)}" +
	    /* act 1 race scoreboard */
    ".hs-racers{display:grid;gap:8px;margin-top:12px}" +
    ".hs-racer{display:grid;grid-template-columns:118px 1fr 76px;gap:10px;align-items:center}" +
    ".hs-racer .who{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:900;color:var(--sub)}" +
    ".hs-racer .who.front{color:var(--ink)}" +
    ".hs-racer .track{height:14px;border-radius:4px;background:var(--soft);overflow:hidden;position:relative}" +
    ".hs-racer .fill{position:absolute;inset:0 auto 0 0;width:0%;border-radius:4px}" +
    ".hs-racer .amt{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;text-align:right}" +
    ".hs-racer.win .track{outline:2px solid var(--teal);outline-offset:1px}" +
    /* act 2 year strip */
    ".hs-strip{display:grid;grid-template-columns:repeat(52,1fr);gap:2px;margin-top:10px}" +
    ".hs-strip i{display:block;height:9px;border-radius:2px;background:var(--soft);transition:background .2s}" +
    ".hs-strip i.ok{background:rgba(11,143,153,.55)}" +
	    ".hs-strip i.over{background:rgba(107,106,69,.6)}" +
	    ".hs-strip i.miss{background:var(--red);animation:hsFlash .4s " + EASE + "}" +
	    "@keyframes hsFlash{0%{transform:scaleY(2.2);filter:brightness(1.6)}100%{transform:none;filter:none}}" +
	    ".hs-chain{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}" +
	    ".hs-chain-card{border:1px solid var(--line);border-radius:6px;padding:7px;background:var(--paper);min-width:0}" +
	    ".hs-chain-card b{display:block;font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
	    ".hs-chain-card span{display:block;margin:3px 0 6px;font-size:15px;font-weight:850;font-variant-numeric:tabular-nums}" +
	    ".hs-chain-card i{display:block;height:7px;border-radius:3px;background:var(--soft);overflow:hidden}" +
	    ".hs-chain-card i em{display:block;height:100%;width:30%;border-radius:3px;background:var(--blue);transition:width .36s " + EASE + "}" +
	    /* act 3 shock buttons */
    ".hs-shocks{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}" +
    ".hs-shocks .hs-btn.shock{background:var(--rust)}" +
    ".hs-shocks .hs-btn.shock.crash{background:var(--red)}" +
    /* confetti */
    ".hs-confetti{position:absolute;width:7px;height:7px;border-radius:2px;pointer-events:none;z-index:30;transition:transform 1s " + EASE + ",opacity 1s}" +
	    (REDUCE ? ".hs *{transition:none!important;animation:none!important}" : "");
  function ensureCSS() {
    if (document.getElementById("hs-acts-css")) return;
    document.head.appendChild(el("style", { id: "hs-acts-css", text: CSS }));
  }

  /* ---------- shared UI builders ---------- */
  function field(labelHtml, input) { return el("div", { class: "hs-field" }, [el("label", { class: "hs-lab", html: labelHtml }), input]); }
  function range(min, max, step, val, aria, on) {
    var i = el("input", { type: "range", min: min, max: max, step: step, value: val, "aria-label": aria });
    i.addEventListener("input", on);
    return i;
  }
  function seg(opts, val, on) {
    var w = el("div", { class: "hs-seg", role: "group" });
    opts.forEach(function (o) {
      var b = el("button", { type: "button", text: o.label, "aria-pressed": String(o.value === val) });
      b.addEventListener("click", function () {
        w.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true"); on(o.value);
      });
      w.appendChild(b);
    });
    return w;
  }
  function metric(k, v, cls) { return el("div", { class: "hs-metric " + (cls || "") }, [el("div", { class: "k", text: k }), el("div", { class: "v", text: v })]); }
  function setMetric(m, v, k) { m.querySelector(".v").textContent = v; if (k != null) m.querySelector(".k").textContent = k; }
  function verdict() { var d = el("div", { class: "hs-verdict", role: "status" }); d._set = function (html, tone) { d.innerHTML = html; if (tone) d.setAttribute("data-tone", tone); else d.removeAttribute("data-tone"); }; return d; }
  function liveTag(text) {
    var t = el("div", { class: "hs-live" }, [el("span", { class: "dot" }), el("span", { text: text })]);
    t._state = function (on, alarm, label) {
      if (on) t.setAttribute("data-on", ""); else t.removeAttribute("data-on");
      if (alarm) t.setAttribute("data-alarm", ""); else t.removeAttribute("data-alarm");
      if (label) t.lastChild.textContent = label;
    };
    return t;
  }
  function confettiBurst(anchor) {
    if (REDUCE) return;
    var r = anchor.getBoundingClientRect(), colors = [BLUE, TEAL, GOLD, RUST];
    for (var i = 0; i < 14; i++) {
      var s = el("span", { class: "hs-confetti" });
      s.style.background = colors[i % colors.length];
      s.style.left = (r.left + r.width / 2) + "px"; s.style.top = (r.top + r.height / 2) + "px";
      document.body.appendChild(s);
      var ang = Math.random() * Math.PI * 2, d = 46 + Math.random() * 74;
      (function (sp, dx, dy, rot) {
        requestAnimationFrame(function () { sp.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg)"; sp.style.opacity = "0"; });
        setTimeout(function () { sp.remove(); }, 1100);
      })(s, Math.cos(ang) * d, Math.sin(ang) * d - 30, Math.random() * 300 - 150);
    }
  }
  function emitResult(act, value, label, copy) {
    try { document.dispatchEvent(new CustomEvent("hs:result", { detail: { act: act, value: value, label: label, copy: copy } })); } catch (e) {}
  }

  /* ---------- active-aware custom element base ---------- */
  var REG = new Set();
  document.addEventListener("slidechange", function () { REG.forEach(function (w) { w._check(); }); });
  window.addEventListener("resize", function () { REG.forEach(function (w) { if (w._active) w._resize(); }); });
  function define(tag, proto) {
    function C() { return Reflect.construct(HTMLElement, [], C); }
    C.prototype = Object.create(HTMLElement.prototype);
    C.prototype.connectedCallback = function () {
      if (this._m) return; this._m = 1;
      ensureCSS(); this.classList.add("hs");
      REG.add(this);
      this._active = false;
      proto.build.call(this);
      var self = this;
      requestAnimationFrame(function () { self._resize(); self._check(); });
    };
    C.prototype.disconnectedCallback = function () { REG.delete(this); this._stop && this._stop(); };
    C.prototype._check = function () {
      var act = this.closest(".act");
      var a = !act || act.classList.contains("active");
      if (a === this._active) return;
      this._active = a;
      if (a) this._resize();
      proto.onActive && proto.onActive.call(this, a);
    };
    C.prototype._resize = function () { proto.resize && proto.resize.call(this); };
    for (var k in proto) if (k !== "build" && k !== "onActive" && k !== "resize") C.prototype[k] = proto[k];
    try { customElements.define(tag, C); } catch (e) {}
  }

  /* ---------- rAF sim loop with time accumulator ---------- */
  // makeLoop(stepMs, onStep, onFrame) -> {start,stop,running}
  // onStep fires once per simulated step (accumulator), onFrame once per rAF.
  function makeLoop(host, stepMs, onStep, onFrame) {
    var raf = null, last = 0, bank = 0, L = {
      running: false,
      stepMs: stepMs,   // mutable: hs-trust-loop's slow-motion toggle rewrites it live
      start: function () {
        if (L.running) return; L.running = true; last = performance.now(); bank = 0;
        if (REDUCE) { L._iv = setInterval(function () { onStep(); onFrame && onFrame(); }, Math.max(250, stepMs)); return; }
        var tick = function (now) {
          if (!L.running) return;
          var dt = Math.min(120, now - last); last = now; bank += dt;
          while (bank >= L.stepMs) { bank -= L.stepMs; onStep(); }
          onFrame && onFrame();
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      stop: function () {
        L.running = false;
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        if (L._iv) { clearInterval(L._iv); L._iv = null; }
      }
    };
    host._loops = host._loops || []; host._loops.push(L);
    return L;
  }

  /* ---------- chart shell (FL.Chart on our own canvas) ---------- */
  function chartWrap(h) {
    var wrap = el("div", { class: "hs-chartwrap" });
    wrap.style.height = h;
    var cv = el("canvas");
    wrap.appendChild(cv);
    var chart = new FL.Chart(cv);
    return { wrap: wrap, cv: cv, chart: chart };
  }

  var C = FL.C; // palette (page sets FL_PALETTE before forecast-lab.js)
  // canvas text with a paper-colored halo so labels survive busy chart areas
  function haloText(ctx, text, x, y, halo) {
    ctx.lineWidth = 3.5; ctx.strokeStyle = halo || "rgba(255,253,247,.85)"; ctx.lineJoin = "round";
    ctx.strokeText(text, x, y); ctx.fillText(text, x, y);
  }
  function rgba(hex, a) {
    var h = hex.replace("#", "");
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

    /* =========================================================================
     ACT 1: <hs-race>
     Amazon case lens. A Last Mile ZIP planner races "same weekday last week"
     against a feature ladder. One dated promo (on the calendar) is caught only
     when the model is given the promo dates; one un-dated shock is caught by no
     model and routes to the exception owner. Money is a weighted capacity bill.
     Series is rebuilt locally from retail trend + weekday + authored events, so
     it never doubles the promo baked into the shared retail dataset.
     ========================================================================= */
  var COST_UNDER = 18;              // late flex labor, SLA pressure, rescue routing
  var COST_OVER = 7;                // idle route capacity and unused labor
  var A_WK = [-55, -40, -25, -5, 35, 95, 70];   // weekday shape (Mon..Sun), Sat/Sun peak
  var PROMO_DAYS = [90, 118];       // known promo dates (t=90 learnable pre-replay, t=118 in replay)
  var SHOCK_DAY = 131;              // un-dated shock, in replay, caught by no rung
  var PROMO_LIFT = 230, SHOCK_LIFT = 250;
  var RUNGS = {
    ma:    { label: "History only",  who: "History only" },
    wk:    { label: "+ Weekday",     who: "Weekday" },
    promo: { label: "+ Promo dates", who: "Weekday plus promo dates" }
  };
  function isPromo(t) { return PROMO_DAYS.indexOf(t) >= 0; }
  function zipCost(actual, forecast) {
    return Math.max(0, actual - forecast) * COST_UNDER + Math.max(0, forecast - actual) * COST_OVER;
  }

  define("hs-race", {
    build: function () {
      var self = this;
      this.ds = FL.getDS("retail");
      this.n = this.ds.n;                 // 140; event indices below are authored against this
      this.START = this.n - 42;           // 98: replay the last 6 weeks
      this.X0 = this.n - 84;              // 56: show 12 weeks of context
      this.cur = this.START; this.done = false;
      this.model = "wk";
      this.buildSeries();

      var cw = chartWrap("clamp(220px,32vh,320px)");
      this.chart = cw.chart; this.cv = cw.cv;

      this.live = liveTag("Amazon case | ZIP capacity shadow replay");
      this.rowBase = this._racer("Same weekday last week", "#8b867c");
      this.rowChal = this._racer(RUNGS[this.model].who, BLUE);
      var racers = el("div", { class: "hs-racers" }, [this.rowBase.row, this.rowChal.row]);

      this.v = verdict();
      this.btn = el("button", { class: "hs-btn hot", type: "button", text: "Run shadow replay", style: "min-width:212px;text-align:center" });
      this.btn.addEventListener("click", function () { self.run(); });
      var segModel = seg(
        [{ value: "ma", label: RUNGS.ma.label }, { value: "wk", label: RUNGS.wk.label }, { value: "promo", label: RUNGS.promo.label }],
        this.model,
        function (v) { self.model = v; self.rowChal.who.textContent = RUNGS[v].who; self.reset(); }
      );

      this.appendChild(el("div", { class: "hs-card" }, [
        this.live, cw.wrap,
        el("div", { class: "hs-ctl" }, [
          field("Forecast the planner can use", segModel),
          el("div", { class: "hs-field", style: "flex:0 0 auto;min-width:0;display:flex;align-items:flex-end" }, [this.btn])
        ]),
        racers,
        this.v
      ]));

      this.precompute();
      this.setPrimer();
      this.render();
    },
    _racer: function (name, color) {
      var who = el("span", { class: "who", text: name });
      var fill = el("i", { class: "fill" }); fill.style.background = color;
      var amt = el("span", { class: "amt", text: "$0" });
      var row = el("div", { class: "hs-racer" }, [who, el("div", { class: "track" }, fill), amt]);
      return { row: row, who: who, fill: fill, amt: amt };
    },
    buildSeries: function () {
      // Local clean series: retail trend + clean weekday + authored events + retail noise.
      // Never read ds.y (its baked promo at t=120 would double the authored one).
      var tr = this.ds.comp.trend, ns = this.ds.comp.noise, n = this.n, s = [];
      for (var t = 0; t < n; t++) {
        var dow = (t + 6) % 7;
        var lift = isPromo(t) ? PROMO_LIFT : (t === SHOCK_DAY ? SHOCK_LIFT : 0);
        s.push(Math.max(60, tr[t] + A_WK[dow] + lift + ns[t]));
      }
      this.y = s;
      var roll7 = function (t) { var q = 0; for (var j = 1; j <= 7; j++) q += s[t - j]; return q / 7; };
      this.roll7 = roll7;
      // weekday deviations, trained on pre-replay history, events excluded
      var buckets = [[], [], [], [], [], [], []];
      for (var t2 = 14; t2 < this.START; t2++) { if (isPromo(t2) || t2 === SHOCK_DAY) continue; buckets[(t2 + 6) % 7].push(s[t2] - roll7(t2)); }
      this.wkHat = buckets.map(function (b) { return b.length ? mean(b) : 0; });
      // uplift learned from prior promo days (deterministic; a ridge would underfit one promo)
      var ups = []; for (var t3 = 14; t3 < this.START; t3++) { if (isPromo(t3)) ups.push(s[t3] - (roll7(t3) + this.wkHat[(t3 + 6) % 7])); }
      this.uplift = ups.length ? mean(ups) : 0;
    },
    predAt: function (model, t) {
      var r = this.roll7(t);
      if (model === "ma") return r;                       // 7-day average: blind to weekday, loses to the sheet
      var wk = r + this.wkHat[(t + 6) % 7];               // weekday rhythm
      if (model === "wk") return wk;
      return wk + (isPromo(t) ? this.uplift : 0);         // + known promo dates
    },
    precompute: function () {
      var n = this.n, START = this.START, s = this.y, self = this;
      var base = [], chal = [];
      for (var t = START; t < n; t++) { base.push(s[t - 7]); chal.push(self.predAt(self.model, t)); }
      this.preds = { base: base, chal: chal };
      // cumulative weighted bill; the un-dated shock day is excluded (it routes to the owner, not the model)
      var cb = [], cc = [], sb = 0, sc = 0;
      for (var t2 = START; t2 < n; t2++) {
        if (t2 !== SHOCK_DAY) { sb += zipCost(s[t2], base[t2 - START]); sc += zipCost(s[t2], chal[t2 - START]); }
        cb.push(sb); cc.push(sc);
      }
      this.cum = { base: cb, chal: cc };
    },
    stats: function (model) {
      var s = this.y, START = this.START, n = this.n, b = 0, a = 0;
      for (var t = START; t < n; t++) { if (t === SHOCK_DAY) continue; b += this.predAt(model, t) - s[t]; a += s[t]; }
      return { bias: a ? b / a : 0 };
    },
    setPrimer: function () {
      this.v._set("Six weeks of ZIP demand replay as a shadow pilot. The grey line is <b>same weekday last week</b>, the anchor to beat. Two days are marked: a <b>promo that is on the calendar</b> and a <b>shock that is not</b>. Press Run to score the capacity bill. Underbuild costs $" + COST_UNDER + " a package, overbuild costs $" + COST_OVER + ".", null);
    },
    reset: function (silent) {
      this._sweep && this._sweep.stop();
      this.cur = this.START; this.done = false;
      this.precompute();
      this.rowBase.row.classList.remove("win"); this.rowChal.row.classList.remove("win");
      this.rowBase.who.classList.remove("front"); this.rowChal.who.classList.remove("front");
      this.btn.disabled = false; this.btn.textContent = "Run shadow replay"; this.btn.classList.add("hot");
      this.live._state(false, false, "Amazon case | ZIP capacity shadow replay");
      if (!silent) this.setPrimer();
      this.render();
    },
    run: function () {
      var self = this;
      if (this._sweep && this._sweep.running) return;
      this.reset(true);
      this.btn.disabled = true; this.btn.textContent = "Replaying"; this.btn.classList.remove("hot");
      this.live._state(true, false, "live replay. week by week");
      var dur = 6800, t0 = performance.now(), n = this.n, START = this.START;
      if (REDUCE) { this.cur = n; this.finish(); this.render(); return; }
      var ease = function (x) { return 1 - Math.pow(1 - x, 2); };
      var loop = { running: true, stop: function () { loop.running = false; if (loop.raf) cancelAnimationFrame(loop.raf); } };
      this._sweep = loop;
      var step = function (now) {
        if (!loop.running) return;
        var e = clamp((now - t0) / dur, 0, 1);
        self.cur = START + ease(e) * (n - START);
        self.render();
        if (e < 1) loop.raf = requestAnimationFrame(step);
        else { loop.running = false; self.cur = n; self.finish(); self.render(); }
      };
      loop.raf = requestAnimationFrame(step);
    },
    finish: function () {
      var cb = this.cum.base, cc = this.cum.chal;
      var totB = cb[cb.length - 1], totC = cc[cc.length - 1];
      this.done = true;
      this.btn.disabled = false; this.btn.textContent = "Run shadow replay again";
      this.live._state(false, false, "replay complete. six weeks scored");
      var saved = totB - totC, cut = totB > 0 ? saved / totB : 0;
      var chalWon = totC < totB;
      this.rowBase.row.classList.toggle("win", !chalWon);
      this.rowChal.row.classList.toggle("win", chalWon);
      (chalWon ? this.rowChal : this.rowBase).who.classList.add("front");
      var promoErr = Math.round(Math.abs(this.y[118] - this.predAt(this.model, 118)));
      var owner = "The red day is a shock with no calendar date. No model sees it, so it goes to the exception owner, not the model score.";
      if (this.model === "ma") {
        this.v._set("<b>History only loses.</b> A seven day average is blind to the weekday rhythm your spreadsheet already uses, so it overspends by <b>" + money(-saved) + "</b> across six weeks. Give the model at least the calendar the sheet has. " + owner, "warn");
        emitResult("race", money(saved), "vs same weekday last week", "Less calendar than the sheet loses. Start from weekday, then add the dates.");
      } else if (this.model === "wk") {
        this.v._set("<b>Weekday rhythm beats last week</b> by <b>" + money(saved) + "</b> over six weeks, a <b>" + pct(cut) + "</b> cut. But watch the promo day: it still misses by about <b>" + promoErr + "</b> because a weekday model cannot see a one off promo date. " + owner, "gold");
        emitResult("race", money(saved) + " lower", "capacity cost, six weeks", "Weekday helps, but the promo day is still a miss. Add the dates.");
      } else {
        this.v._set("<b>The promo date is the catch.</b> Add the known promo calendar and the promo day error drops to about <b>" + promoErr + "</b>. Capacity cost falls <b>" + pct(cut) + "</b>, about <b>" + money(saved) + "</b> over six weeks. " + owner, "good");
        emitResult("race", money(saved) + " lower", "capacity cost, six weeks", "The promo date is the one thing last week could not see.");
      }
    },
    render: function () {
      var s = this.y, n = this.n, START = this.START, X0 = this.X0, cur = this.cur, self = this;
      var actual = [], base = [], chal = [];
      for (var i = X0; i < n; i++) { actual.push({ x: i, y: s[i] }); base.push({ x: i, y: s[i - 7] }); chal.push({ x: i, y: self.predAt(self.model, i) }); }
      var series = [
        { pts: actual, color: C.ink, width: 2.4 },
        { pts: base, color: "#8b867c", width: 2.0, dash: [3, 4] },
        { pts: chal, color: C.blue, width: 2.8, dash: [8, 5] }
      ];
      var PROMO = 118, SHOCK = SHOCK_DAY, PRIOR = 90;
      var after = function (ctx, m) {
        // faint tick on the prior promo the model learns from
        var pxp = m.xToPx(PRIOR);
        ctx.strokeStyle = rgba("#0b8f99", 0.45); ctx.lineWidth = 1.5; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(pxp, m.y0); ctx.lineTo(pxp, m.y1); ctx.stroke(); ctx.setLineDash([]);
        // landmark error sticks: challenger error at the two marked events
        function stick(t, color, r) {
          var px = m.xToPx(t), ay = m.yToPx(s[t]), cy = m.yToPx(self.predAt(self.model, t));
          ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, ay); ctx.lineTo(px, cy); ctx.stroke();
          ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, ay, r, 0, 7); ctx.fill();
        }
        stick(PROMO, rgba("#0b8f99", 0.95), 3.5);
        stick(SHOCK, C.red, 3.5);
        ctx.font = "800 12px ui-monospace,monospace"; ctx.textAlign = "center";
        ctx.fillStyle = TEAL; haloText(ctx, "promo day, on the calendar", clamp(m.xToPx(PROMO), m.x0 + 92, m.x1 - 92), clamp(m.yToPx(s[PROMO]) - 13, m.y0 + 13, m.y1 - 8));
        ctx.fillStyle = C.red; haloText(ctx, "shock, not on the calendar", clamp(m.xToPx(SHOCK), m.x0 + 92, m.x1 - 92), clamp(m.yToPx(s[SHOCK]) + 22, m.y0 + 24, m.y1 - 6));
        // replay cursor
        if (cur > START && cur < n) {
          var cx = m.xToPx(cur);
          ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
          ctx.beginPath(); ctx.moveTo(cx, m.y0); ctx.lineTo(cx, m.y1); ctx.stroke(); ctx.setLineDash([]);
        }
      };
      var lo = Infinity, hi = -Infinity;
      for (var j = X0; j < n; j++) { lo = Math.min(lo, s[j]); hi = Math.max(hi, s[j]); }
      var pad = (hi - lo) * 0.16;
      this.chart.setData({
        series: series, after: after,
        xmin: X0, xmax: n - 1, ymin: lo - pad, ymax: hi + pad,
        marker: START, markerLabel: "replay starts",
        regions: [{ x0: START, x1: n - 1, color: rgba("#245CFF", 0.04) }],
        xlabels: [{ x: X0 + 7, t: "wk -12" }, { x: START, t: "wk -6" }, { x: n - 4, t: "today" }]
      });
      var k = clamp(Math.floor(cur - START), 0, this.cum.base.length - 1);
      var vb = cur > START ? this.cum.base[k] : 0, vc = cur > START ? this.cum.chal[k] : 0;
      var maxv = Math.max(this.cum.base[this.cum.base.length - 1], this.cum.chal[this.cum.chal.length - 1]) || 1;
      this.rowBase.fill.style.width = (100 * vb / maxv) + "%"; this.rowBase.amt.textContent = money(vb);
      this.rowChal.fill.style.width = (100 * vc / maxv) + "%"; this.rowChal.amt.textContent = money(vc);
    },
    resize: function () { this.chart && this.chart.resize(); },
    onActive: function (a) {
      if (!a && this._sweep && this._sweep.running) { this._sweep.stop(); this.cur = this.n; this.finish(); this.render(); }
    }
  });

/* =========================================================================
	     ACT 2: <hs-buffer-run>
	     Apple case lens. SDM forecasts MacBook demand; Logistics and Reseller
	     Ops either pass padded orders as demand or share one POS signal. The score
	     is order variance amplification plus decision cost, not service in isolation.
	     ========================================================================= */
	  var MU = 18500, SIGMA = 3100;
	  var MAC_COST = 1200, CARRY_RATE = 0.0045, MARKDOWN = 120, STOCKOUT = 360, EXPEDITE = 70;
	  var FRACTILE = STOCKOUT / (STOCKOUT + MAC_COST * CARRY_RATE + MARKDOWN * 0.08);
	  function roundUp(v, b) { return Math.ceil(Math.max(0, v) / b) * b; }
	  function stdLocal(a) {
	    if (!a.length) return 0;
	    var m = mean(a), s = 0;
	    for (var i = 0; i < a.length; i++) s += Math.pow(a[i] - m, 2);
	    return Math.sqrt(s / a.length);
	  }
	  function cvSq(a) {
	    var m = mean(a);
	    if (!m) return 0;
	    return Math.pow(stdLocal(a) / m, 2);
	  }

  define("hs-buffer-run", {
    build: function () {
      var self = this;
	      this.svc = 0.88;
	      this.mode = "local";
	      this.batch = 500;
	      this.promoVisible = true;
      this.week = 0; this.done = false; this.ranOnce = false;
      this.draws = this.makeDraws();

      var cw = chartWrap("clamp(188px,25vh,246px)");
      this.chart = cw.chart;

	      this.live = liveTag("Apple case | MacBook handoff bullwhip");
	      this.mFill = metric("Fill rate", "n/a", "accent");
	      this.mBull = metric("Bullwhip ratio", "n/a");
	      this.mCash = metric("Cash tied", "$0");
	      this.mCost = metric("Decision cost", "$0");

      this.strip = el("div", { class: "hs-strip", "aria-hidden": "true" });
      for (var i = 0; i < 52; i++) this.strip.appendChild(el("i"));

	      this.v = verdict();
	      this.btn = el("button", { class: "hs-btn hot", type: "button", text: "Run same demand year", style: "min-width:212px;text-align:center" });
	      this.btn.addEventListener("click", function () { self.run(); });
	      this.cSdm = this._chain("SDM build request", "");
	      this.cLog = this._chain("Logistics allocation", "");
	      this.cStore = this._chain("Reseller Ops order", "");

	      this.svcVal = null;
	      var svcInput = range(0.7, 0.98, 0.01, this.svc, "Service target", function () {
	        self.svc = parseFloat(this.value); self.svcVal.textContent = pct(self.svc);
	        self.resetRun(); self.render();
	      });
	      var svcField = field("Service target <b>" + pct(this.svc) + "</b>", svcInput);
	      this.svcVal = svcField.querySelector("b");
	      var modeSeg = seg([
	        { value: "local", label: "Local buffers" },
	        { value: "shared", label: "Shared forecast" },
	        { value: "constrained", label: "Launch constrained" }
	      ], this.mode, function (v) { self.mode = v; self.resetRun(); self.render(); });
	      var batchSeg = seg([
	        { value: 250, label: "250" },
	        { value: 500, label: "500" },
	        { value: 1000, label: "1000" }
	      ], this.batch, function (v) { self.batch = Number(v); self.resetRun(); self.render(); });
	      var promoSeg = seg([
	        { value: "shared", label: "Promo shared" },
	        { value: "hidden", label: "Promo hidden" }
	      ], "shared", function (v) { self.promoVisible = v === "shared"; self.resetRun(); self.render(); });

	      this.appendChild(el("div", { class: "hs-card" }, [
	        this.live, cw.wrap,
	        el("div", { class: "hs-ctl" }, [
	          field("Process mode", modeSeg),
	          svcField,
	          field("Batch size", batchSeg),
	          field("Launch signal", promoSeg),
	          el("div", { class: "hs-field", style: "flex:0 0 auto;min-width:0;display:flex;align-items:flex-end" }, [this.btn])
	        ]),
	        el("div", { class: "hs-chain" }, [this.cSdm.card, this.cLog.card, this.cStore.card]),
	        this.strip,
	        el("div", { class: "hs-metrics" }, [this.mFill, this.mBull, this.mCash, this.mCost]),
	        this.v,
	        el("div", { class: "hs-note", html: "Bullwhip is order-variance amplification: CV(order)<sup>2</sup> / CV(POS demand)<sup>2</sup>. Local buffers pass padded orders as demand. Shared forecast uses one POS demand distribution and makes safety stock an explicit policy. Teaching case lens only, not a claim about proprietary Apple systems." })
	      ]));

      this.loop = makeLoop(this, 72, function () { self.stepWeek(); }, function () { self.render(); });
      this.resetRun();
      this.render();
    },
	    _chain: function (name, value) {
	      var fill = el("em");
	      var card = el("div", { class: "hs-chain-card" }, [el("b", { text: name }), el("span", { text: value || "n/a" }), el("i", null, fill)]);
	      return { card: card, value: card.querySelector("span"), fill: fill };
	    },
	    launchLift: function (w) {
	      return Math.exp(-Math.pow((w - 12) / 5, 2)) * 4200 + Math.exp(-Math.pow((w - 39) / 7, 2)) * 2400;
	    },
	    signalAt: function (w, includeLaunch) {
	      return MU + 520 * Math.sin(2 * Math.PI * w / 13) + (includeLaunch === false ? 0 : this.launchLift(w));
	    },
	    makeDraws: function () {
	      var rng = mulberry32(20260706), out = [], noise = 0;
	      for (var w = 0; w < 52; w++) {
	        noise = 0.55 * noise + SIGMA * gauss(rng);
	        out.push(Math.max(6500, this.signalAt(w, true) + noise));
	      }
	      return out;
	    },
	    ordersFor: function (mode, w) {
	      var z = invNorm(this.svc), batch = this.batch;
	      var f = this.signalAt(w, this.promoVisible);
	      var base = f + z * SIGMA * Math.sqrt(1.5);
	      var extra = Math.max(0, this.svc - FRACTILE);
	      if (mode === "shared") {
	        var q = roundUp(base, batch);
	        return { store: q, logistics: q, sdm: q, forecast: f };
	      }
	      if (mode === "constrained") {
	        var q2 = roundUp(base, batch);
	        return { store: q2, logistics: roundUp(q2 * 1.01, batch), sdm: roundUp(q2 * 1.015, batch), forecast: f };
	      }
	      var prev = Math.max(0, w - 1), prev2 = Math.max(0, w - 2);
	      var surprise = Math.max(0, (this.draws[prev] || f) - this.signalAt(prev, true)) +
	        0.55 * Math.max(0, (this.draws[prev2] || f) - this.signalAt(prev2, true));
	      var launchDelta = Math.max(0, this.signalAt(w, true) - this.signalAt(prev, true));
	      var store = roundUp(base * (1.025 + extra * 0.18) + surprise * 0.95 + launchDelta * 0.6, batch);
	      var logistics = roundUp(store * (1.04 + extra * 0.22) + surprise * 1.2 + launchDelta * 0.9 + z * SIGMA * 0.18, batch);
	      var sdm = roundUp(logistics * (1.035 + extra * 0.22) + surprise * 1.45 + launchDelta * 1.1 + z * SIGMA * 0.24, batch);
	      return { store: store, logistics: logistics, sdm: sdm, forecast: f };
	    },
	    summary: function (mode, upto) {
	      var lim = Math.max(1, Math.min(52, upto || 52));
	      var demand = [], store = [], logistics = [], sdm = [];
	      var fulfilled = 0, demandTotal = 0, overUnits = 0, lostUnits = 0, stockoutWeeks = 0, abs = 0, bias = 0;
	      for (var w = 0; w < lim; w++) {
	        var d = this.draws[w], o = this.ordersFor(mode, w);
	        demand.push(d); store.push(o.store); logistics.push(o.logistics); sdm.push(o.sdm);
	        demandTotal += d; fulfilled += Math.min(d, o.store);
	        overUnits += Math.max(0, o.store - d);
	        var lost = Math.max(0, d - o.store);
	        lostUnits += lost; if (lost > 0) stockoutWeeks++;
	        abs += Math.abs(d - o.forecast); bias += o.forecast - d;
	      }
	      var avgOver = overUnits / lim;
	      var cash = avgOver * MAC_COST;
	      var carrying = overUnits * MAC_COST * CARRY_RATE;
	      var markdown = Math.max(0, overUnits - SIGMA * lim * 0.32) * MARKDOWN;
	      var lostCost = lostUnits * STOCKOUT;
	      var expedite = lostUnits * EXPEDITE;
	      return {
	        fillRate: demandTotal ? fulfilled / demandTotal : 0,
	        bullwhip: cvSq(sdm) / Math.max(cvSq(demand), 0.0001),
	        cash: cash,
	        lostUnits: lostUnits,
	        stockoutWeeks: stockoutWeeks,
	        total: carrying + markdown + lostCost + expedite,
	        wape: demandTotal ? abs / demandTotal : 0,
	        bias: demandTotal ? bias / demandTotal : 0,
	        avg: { store: mean(store), logistics: mean(logistics), sdm: mean(sdm) },
	        orders: { demand: demand, store: store, logistics: logistics, sdm: sdm }
	      };
	    },
    resetRun: function () {
      this.loop.stop(); this.week = 0; this.done = false; this.ranOnce = this.ranOnce || false;
	      this.btn.disabled = false; this.btn.textContent = this.ranOnce ? "Run same demand again" : "Run same demand year";
	      this.btn.classList.add("hot");
	      this.live._state(false, false, "Apple case | MacBook handoff bullwhip");
	      var cells = this.strip.children;
	      for (var i = 0; i < 52; i++) cells[i].className = "";
	      this.v._set("Run the same MacBook demand year. <b>Local buffers</b> pass padded orders upstream. <b>Shared forecast</b> gives every team the same POS demand signal and one explicit safety-stock policy.");
	    },
    run: function () {
      if (this.loop.running) return;
      this.resetRun();
      this.ranOnce = true;
	      this.btn.disabled = true; this.btn.textContent = "Running handoff"; this.btn.classList.remove("hot");
	      this.live._state(true, false, "running: week 1 of 52");
      if (REDUCE) { while (this.week < 52) this.stepWeek(); this.render(); return; }
      this.loop.start();
    },
    stepWeek: function () {
      if (this.week >= 52) { this.loop.stop(); this.finish(); return; }
	      var o = this.ordersFor(this.mode, this.week), d = this.draws[this.week], cell = this.strip.children[this.week];
	      if (d > o.store) cell.className = "miss";
	      else cell.className = (o.store - d) > SIGMA * 0.85 ? "over" : "ok";
      this.week++;
      this.live._state(true, false, "running: week " + this.week + " of 52");
      if (this.week >= 52) { this.loop.stop(); this.finish(); }
    },
    finish: function () {
      this.done = true;
	      this.btn.disabled = false; this.btn.textContent = "Run same demand again";
	      this.live._state(false, false, "year complete · same MacBook demand for every mode");
	      var mine = this.summary(this.mode, 52);
	      var local = this.summary("local", 52);
	      var shared = this.summary("shared", 52);
	      var reduction = local.bullwhip ? (local.bullwhip - mine.bullwhip) / local.bullwhip : 0;
	      var costDelta = local.total - mine.total;
	      var head = "Mode <b>" + this.modeLabel(this.mode) + "</b>: fill rate <b>" + pct(mine.fillRate) + "</b>, bullwhip ratio <b>" + mine.bullwhip.toFixed(1) + "x</b>, decision cost <b>" + money(mine.total) + "</b>, WAPE <b>" + pct(mine.wape) + "</b>, bias <b>" + (mine.bias >= 0 ? "+" : "") + pct(mine.bias) + "</b>. ";
	      if (this.mode === "local") {
	        this.v._set(head + "This is the failure mode: the forecast may be reasonable, but the handoff turns padded orders into demand. Compare it with shared forecast to separate forecasting error from process amplification.", "warn");
	      } else if (mine.fillRate >= this.svc - 0.04 && reduction >= 0.3 && costDelta > 0) {
	        this.v._set(head + "Shared signal wins the operating gate: bullwhip falls by <b>" + pct(reduction) + "</b> versus local buffers while service stays near target and cost improves by <b>" + money(costDelta) + "</b>.", "good");
	        confettiBurst(this.mBull);
	      } else {
	        this.v._set(head + "The policy is cleaner, but the launch override, batch size or service target still needs tuning before rollout. The approval gate is bullwhip down, fill rate protected, cost lower.", "gold");
	      }
	      emitResult("buffer", mine.bullwhip.toFixed(1) + "x", "MacBook bullwhip ratio",
	        this.modeLabel(this.mode) + " produced " + money(mine.total) + " decision cost. Record: shared forecast or local buffers, service target by store tier, safety-stock location, batch-size rule, launch override owner.");
	      this.render();
	    },
	    modeLabel: function (m) {
	      return m === "shared" ? "Shared forecast" : (m === "constrained" ? "Constrained launch" : "Local buffers");
	    },
	    render: function () {
	      var self = this, mode = this.mode, full = this.summary(mode, 52), cur = this.summary(mode, Math.max(1, this.week));
	      var band1 = [], band2 = [], posLine = [], storeLine = [], logLine = [], sdmLine = [];
	      var lo = Infinity, hi = -Infinity;
	      for (var w = 0; w <= 51; w++) {
	        var d = this.draws[w], sig = this.signalAt(w, true), o = this.ordersFor(mode, w);
	        band1.push({ x: w + 1, lo: sig - SIGMA, hi: sig + SIGMA });
	        band2.push({ x: w + 1, lo: sig - 2 * SIGMA, hi: sig + 2 * SIGMA });
	        posLine.push({ x: w + 1, y: d });
	        storeLine.push({ x: w + 1, y: o.store });
	        logLine.push({ x: w + 1, y: o.logistics });
	        sdmLine.push({ x: w + 1, y: o.sdm });
	        lo = Math.min(lo, d, o.store, o.logistics, o.sdm, sig - 2 * SIGMA);
	        hi = Math.max(hi, d, o.store, o.logistics, o.sdm, sig + 2 * SIGMA);
	      }
	      var series = [
	        { pts: posLine, color: C.ink, width: 2.1, clipRight: this.week || 1 },
	        { pts: storeLine, color: TEAL, width: 2.3 },
	        { pts: logLine, color: C.blue, width: 2.4, dash: [6, 4] },
	        { pts: sdmLine, color: GOLD, width: 2.5, dash: [2, 4] }
	      ];
      var after = function (ctx, m) {
	        ctx.font = "800 10.5px ui-monospace,monospace";
	        ctx.textAlign = "left";
	        var ly = m.y0 + 14, lx = m.x0 + 8;
	        ctx.fillStyle = C.ink; haloText(ctx, "POS demand", lx, ly);
	        ctx.fillStyle = TEAL; haloText(ctx, "Store order", lx + 92, ly);
	        ctx.fillStyle = C.blue; haloText(ctx, "Logistics", lx + 186, ly);
	        ctx.fillStyle = GOLD; haloText(ctx, "SDM request", lx + 272, ly);
        for (var w2 = 0; w2 < self.week; w2++) {
          var d = self.draws[w2], o = self.ordersFor(mode, w2), px = m.xToPx(w2 + 1), py = m.yToPx(d), sy = m.yToPx(o.store);
          var missed = d > o.store;
          if (missed) { ctx.strokeStyle = rgba("#d11f1f", 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, sy); ctx.lineTo(px, py); ctx.stroke(); }
          ctx.beginPath(); ctx.arc(px, py, w2 === self.week - 1 && self.loop.running ? 5.5 : 3.2, 0, 7);
          ctx.fillStyle = missed ? C.red : TEAL; ctx.fill();
        }
      };
      this.chart.setData({
        series: series,
        bands: [
          { pts: band2, color: rgba("#245CFF", 0.045) },
          { pts: band1, color: rgba("#245CFF", 0.095) }
        ],
        after: after,
	        xmin: 1, xmax: 52, ymin: lo - (hi - lo) * 0.08, ymax: hi + (hi - lo) * 0.12,
	        xlabels: [{ x: 1, t: "wk 1" }, { x: 13, t: "launch 1" }, { x: 26, t: "Q2" }, { x: 39, t: "launch 2" }, { x: 52, t: "wk 52" }]
	      });
	      setMetric(this.mFill, this.week ? pct(cur.fillRate) : "n/a");
	      this.mFill.className = "hs-metric " + (this.week > 8 ? (cur.fillRate >= this.svc - 0.05 ? "good" : "warn") : "accent");
	      setMetric(this.mBull, full.bullwhip.toFixed(1) + "x");
	      this.mBull.className = "hs-metric " + (full.bullwhip > 1.6 ? "warn" : "good");
	      setMetric(this.mCash, money(cur.cash));
	      this.mCash.className = "hs-metric " + (cur.cash > 9e6 && this.week > 8 ? "warn" : "");
	      setMetric(this.mCost, money(cur.total));
	      this.mCost.className = "hs-metric " + (cur.total > 8e6 && this.week > 8 ? "warn" : "");
	      this.cSdm.value.textContent = Math.round(full.avg.sdm / 100) / 10 + "k";
	      this.cLog.value.textContent = Math.round(full.avg.logistics / 100) / 10 + "k";
	      this.cStore.value.textContent = Math.round(full.avg.store / 100) / 10 + "k";
	      var maxPlan = Math.max(full.avg.sdm, full.avg.logistics, full.avg.store, MU + 4.8 * SIGMA);
	      this.cSdm.fill.style.width = clamp(100 * full.avg.sdm / maxPlan, 8, 100) + "%";
	      this.cLog.fill.style.width = clamp(100 * full.avg.logistics / maxPlan, 8, 100) + "%";
	      this.cStore.fill.style.width = clamp(100 * full.avg.store / maxPlan, 8, 100) + "%";
	    },
    resize: function () { this.chart && this.chart.resize(); },
    onActive: function (a) { if (!a) this.loop.stop(); }
  });

  /* =========================================================================
	     ACT 3: <hs-trust-loop>
	     Meta case lens. A fast user-demand forecast feeds a capacity decision.
	     Two policies score simultaneously on the same reality: blind automation
	     versus governed AI demand sensing with drift monitor, exception owner and
	     retraining loop.
	     ========================================================================= */
	  var TICK_MS = 420, WINDOW = 64;
	  var META_UNDER = 3200, META_OVER = 900; // latency/ad delivery pressure vs idle capacity
	  function capacityLoss(actual, plan) {
	    return Math.max(0, actual - plan) * META_UNDER + Math.max(0, plan - actual) * META_OVER;
	  }
  var DK = { bg: "#0f2333", ink: "#eef6ff", sub: "#a7b8c8", line: "#25455f",
    blue: "#7ebdff", cyan: "#35d0dd", red: "#ff5a4e", gold: "#e8b84b", teal: "#37c2a0" };

  define("hs-trust-loop", {
    build: function () {
      var self = this;
      this.classList.add("dark");
      this.reset(true);

      this.wrap = el("div", { class: "hs-chartwrap" });
      this.wrap.style.height = "clamp(270px,36vh,380px)";
      this.cv = el("canvas");
      this.wrap.appendChild(this.cv);
      this.ctx = this.cv.getContext("2d");

	      this.live = liveTag("Meta case | live demand capacity release");
	      this.mBlind = metric("No-gate auto-release loss", "$0", "warn");
	      this.mGov = metric("Gated release loss", "$0", "accent");
	      this.mSaved = metric("Avoided capacity loss", "$0", "good");
	      this.modePill = el("div", { class: "hs-modepill", text: "AUTO RELEASE", style: "min-width:132px;justify-content:center" });
	      this.mDetect = metric("Minutes to detection", "0");
	      this.mRelease = metric("Minutes to safe release", "0", "accent");
	      this.gFresh = this._gate("Freshness", "pass", "pass");
	      this.gDrift = this._gate("Drift", "pass", "pass");
	      this.gBias = this._gate("Bias", "pass", "pass");
	      this.gCoverage = this._gate("Coverage", "pass", "pass");
	      this.gImpact = this._gate("Impact", "waiting", "review");

	      this.v = verdict();
	      this.v._set("Live demand signals arrive every few minutes. The blind policy ships the deploy-day plan. The AI policy can react to live features, but capacity only auto-releases when the trust gate passes. Trigger a shock.");

	      var bSpike = el("button", { class: "hs-btn shock", type: "button", text: "Viral creator spike" });
	      var bCrash = el("button", { class: "hs-btn shock crash", type: "button", text: "Regional demand drop" });
	      var bReset = el("button", { class: "hs-btn ghost", type: "button", text: "Reset" });
	      var bSlow = el("button", { class: "hs-btn ghost", type: "button", text: "Slow motion", style: "min-width:128px;text-align:center" });
      bSpike.addEventListener("click", function () { self.shock("spike"); });
      bCrash.addEventListener("click", function () { self.shock("crash"); });
      bReset.addEventListener("click", function () { self.reset(); });
      this.slowMo = false;
      bSlow.addEventListener("click", function () {
        self.slowMo = !self.slowMo;
        self.loop.stepMs = self.slowMo ? 980 : TICK_MS;
	        bSlow.textContent = self.slowMo ? "Normal speed" : "Slow motion";
	      });

      this.appendChild(el("div", { class: "hs-card" }, [
        this.live, this.wrap,
        el("div", { class: "hs-shocks" }, [bSpike, bCrash, bSlow, bReset]),
	        el("div", { class: "hs-modebar" }, [this.modePill, el("div", { class: "hs-metrics", style: "flex:1 1 300px;margin-top:0" }, [this.mDetect, this.mRelease])]),
	        el("div", { class: "hs-gates" }, [this.gFresh, this.gDrift, this.gBias, this.gCoverage, this.gImpact]),
        el("div", { class: "hs-metrics" }, [this.mBlind, this.mGov, this.mSaved]),
        this.v,
	        el("div", { class: "hs-note", html: "Same demand, same base model. <b>No-gate</b> keeps shipping the deploy-day plan into capacity. <b>Gated AI</b> checks freshness, drift, bias, coverage and business impact before auto-release. Under-capacity costs $" + (META_UNDER / 1000).toFixed(1) + "k per demand point; over-capacity costs $" + (META_OVER / 1000).toFixed(1) + "k. Teaching case lens only, not a proprietary Meta process." })
      ]));

      // particles along the pipeline
      this.parts = [];
      for (var i = 0; i < 9; i++) this.parts.push({ p: i / 9, sp: 0.09 + Math.random() * 0.04 });
      this.retrainPart = null;

      this.loop = makeLoop(this, TICK_MS, function () { self.tick(); }, function () { self.draw(); });
    },
	    _gate: function (name, value, cls) {
	      return el("div", { class: "hs-gate " + (cls || "") }, [el("b", { text: name }), el("span", { text: value })]);
	    },
	    _setGate: function (node, value, cls) {
	      node.className = "hs-gate " + (cls || "");
	      node.querySelector("span").textContent = value;
	    },
    reset: function (silent) {
      this.t = 0; this.hist = [];             // {a, pb, pg}
      this.R = 1; this.spikeAge = -1;
      this.state = "ok"; this.stateT = 0;      // ok | alert | override | retrained
      this.newR = 1;
      this.lossB = 0; this.lossG = 0;
      this.rng = mulberry32(777);
      this.alarmMAE = 0;
	      this.shockStart = -1; this.detectAt = -1; this.releaseAt = -1;
	      this.releaseMode = "AUTO RELEASE";
      // warm up 40 calm ticks so the room sees a settled system, not a cold start
      for (var i = 0; i < 40; i++) this.tick(true);
      if (!silent) {
        this.lossB = 0; this.lossG = 0;
	        this.live._state(true, false, "Meta case | steady demand state");
	        this.v._set("Reset. Both policies are healthy and identical until reality moves. Trigger a shift.", null);
	        this.updateGateBoard();
        this.draw();
      }
    },
    base: function (t) { return 100 + 9 * Math.sin(2 * Math.PI * t / 7) + 4 * Math.sin(2 * Math.PI * t / 3.5 + 1); },
    shock: function (kind) {
      if (this.state !== "ok") {
        this.v._set("<b>The loop is already handling a shock.</b> Let the story finish (monitor, gate, override, retrain), or press Reset. Then throw the next one.", "warn");
        return;
      }
	      this.shockStart = this.t; this.detectAt = -1; this.releaseAt = -1;
	      if (kind === "spike") { this.spikeAge = 0; this.live._state(true, true, "shock: viral creator spike hitting demand"); }
	      else {
        var nextR = Math.max(this.R * 0.62, 0.32); // floor inside the retrain clamp (0.3) so the loop can always re-track
        if (nextR >= this.R) {
          this.v._set("<b>Demand is already at the floor of this simulation.</b> Press Reset to run the story again.", "warn");
          return;
        }
	        this.R = nextR; this.live._state(true, true, "shock: regional user demand dropped");
	      }
	      this.v._set(kind === "spike"
	        ? "<b>A viral creator spike.</b> Demand jumps past the recent training window. Watch which policy detects the break before capacity drifts."
	        : "<b>A regional demand drop.</b> The old model's world no longer exists. Watch which policy stops blind auto-release.", "warn");
    },
    tick: function (warm) {
      var t = this.t++;
      var spike = 0;
      if (this.spikeAge >= 0) { spike = 78 * Math.exp(-this.spikeAge / 5); this.spikeAge++; if (spike < 1.5) this.spikeAge = -1; }
      var actual = this.base(t) * this.R + spike + gauss(this.rng) * 3.5;
      // blind: the deploy-day model, forever
      var pb = this.base(t);
      // governed: same model + the loop
      var pg;
      if (this.state === "ok" || this.state === "alert") pg = this.base(t) * this.newR;
      else if (this.state === "override") { // planner: mean of the last 5 actuals
        var m5 = 0, c = 0;
        for (var i = this.hist.length - 1; i >= 0 && c < 5; i--, c++) m5 += this.hist[i].a;
        pg = c ? m5 / c : actual;
      } else pg = this.base(t) * this.newR; // retrained
      this.hist.push({ a: actual, pb: pb, pg: pg });
      if (this.hist.length > 200) this.hist.shift();
      if (!warm) {
        this.lossB += capacityLoss(actual, pb);
        this.lossG += capacityLoss(actual, pg);
      }
      // release gate on the GOVERNED forecast: WAPE, bias and interval coverage
      var n = this.hist.length, s = 0, k = 0, actualSum = 0, biasSum = 0, covered = 0;
      for (i = n - 1; i >= 0 && k < 12; i--, k++) {
        var row = this.hist[i], err = row.a - row.pg;
        s += Math.abs(err); actualSum += Math.abs(row.a); biasSum += row.pg - row.a;
        if (Math.abs(err) <= 18) covered++;
      }
      this.alarmMAE = k ? s / k : 0;
	      this.rollingWape = actualSum ? s / actualSum : 0;
	      this.rollingBias = actualSum ? biasSum / actualSum : 0;
	      this.coverage = k ? covered / k : 1;
      var THRESH = 11; // ~3x noise sigma
      if (this.state === "ok" && this.alarmMAE > THRESH) { this.state = "alert"; this.stateT = 0; if (this.detectAt < 0 && this.shockStart >= 0) this.detectAt = this.t; }
      else if (this.state === "alert") { this.state = "override"; this.stateT = 0;
	        if (!warm) this.v._set("<b>Drift monitor tripped.</b> The gate closed: large variance now routes to a named exception owner. The override tracks recent reality while the model is stale.", "gold");
      }
      else if (this.state === "override") {
        this.stateT++;
        if (this.stateT >= 9) { // retrain on the recent window
          var m14 = 0; c = 0;
          for (i = n - 1; i >= 0 && c < 14; i--, c++) m14 += this.hist[i].a;
          var recent = m14 / (c || 1), baseNow = this.base(t);
          this.newR = clamp(recent / (baseNow || 1), 0.3, 2.5);
          this.state = "retrained"; this.stateT = 0;
	          if (this.releaseAt < 0 && this.shockStart >= 0) this.releaseAt = this.t;
	          if (!warm) this.v._set("<b>Retrained on the new regime.</b> Automation resumes with the gate still armed. The blind policy never noticed anything.", "good");
        }
      }
	      else if (this.state === "retrained") { this.stateT++; if (this.stateT > 10 && this.alarmMAE < THRESH * 0.6) { this.state = "ok"; if (!warm) this.live._state(true, false, "Meta case | steady state under new regime"); } }
	      if (!warm) {
	        this.updateGateBoard();
	        setMetric(this.mBlind, money(this.lossB));
	        setMetric(this.mGov, money(this.lossG));
	        setMetric(this.mSaved, money(Math.max(0, this.lossB - this.lossG)));
	        emitResult("loop", this.releaseMode.toLowerCase(), "current release mode",
	          "No-gate release lost " + money(this.lossB) + "; gated AI lost " + money(this.lossG) + "; avoided loss is " + money(Math.max(0, this.lossB - this.lossG)) + ". Record: operating mode, gate owner, drift tolerance, trigger, override path.");
	      }
    },
	    updateGateBoard: function () {
	      if (!this.modePill) return;
	      var freshPass = this.state !== "override";
	      var driftPass = (this.rollingWape || 0) <= 0.12;
	      var biasPass = Math.abs(this.rollingBias || 0) <= 0.05;
	      var coveragePass = (this.coverage == null ? 1 : this.coverage) >= 0.72;
	      var impact = Math.max(0, this.lossB - this.lossG);
	      var impactPass = impact >= 25000;
	      if (freshPass && driftPass && biasPass && coveragePass) this.releaseMode = "AUTO RELEASE";
	      else if (driftPass && biasPass) this.releaseMode = "PLANNER ASSIST";
	      else this.releaseMode = "HOLD + REVIEW";
	      var cls = this.releaseMode === "AUTO RELEASE" ? "" : (this.releaseMode === "PLANNER ASSIST" ? "review" : "hold");
	      this.modePill.className = "hs-modepill " + cls;
	      this.modePill.textContent = this.releaseMode;
	      this._setGate(this.gFresh, freshPass ? "current" : "review", freshPass ? "pass" : "review");
	      this._setGate(this.gDrift, pct(this.rollingWape || 0), driftPass ? "pass" : "hold");
	      this._setGate(this.gBias, (this.rollingBias >= 0 ? "+" : "") + pct(this.rollingBias || 0), biasPass ? "pass" : "review");
	      this._setGate(this.gCoverage, pct(this.coverage == null ? 1 : this.coverage), coveragePass ? "pass" : "review");
	      this._setGate(this.gImpact, money(impact), impactPass ? "pass" : "review");
	      setMetric(this.mDetect, this.detectAt >= 0 && this.shockStart >= 0 ? String((this.detectAt - this.shockStart) * 5) : "0");
	      setMetric(this.mRelease, this.releaseAt >= 0 && this.shockStart >= 0 ? String((this.releaseAt - this.shockStart) * 5) : (this.state === "override" ? "pending" : "0"));
	    },
    draw: function () {
      var cv = this.cv, ctx = this.ctx, W = this._w, H = this._h;
      if (!W) { this.resize(); W = this._w; H = this._h; if (!W) return; }
      ctx.clearRect(0, 0, W, H);
      var alarm = this.state === "alert" || this.state === "override";
      /* ---- pipeline strip (top 86px) ---- */
	      var PY = 46, nodes = ["Live signals", "AI nowcast", "Trust gate", "Capacity", "Monitor"];
      var nx = [], i, pad = 34, span = (W - pad * 2) / (nodes.length - 1);
      for (i = 0; i < nodes.length; i++) nx.push(pad + span * i);
      // pipe
      ctx.strokeStyle = DK.line; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(nx[0], PY); ctx.lineTo(nx[4], PY); ctx.stroke();
      // retrain loop-back arc: Monitor -> Forecast
      ctx.strokeStyle = this.state === "override" || this.state === "retrained" ? DK.gold : DK.line;
      ctx.setLineDash([4, 5]); ctx.beginPath();
      ctx.moveTo(nx[4], PY); ctx.quadraticCurveTo((nx[4] + nx[1]) / 2, PY + 44, nx[1], PY);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.font = "700 9px ui-monospace,monospace"; ctx.fillStyle = DK.sub; ctx.textAlign = "center";
	      ctx.fillText("retrain loop", (nx[4] + nx[1]) / 2, PY + 40);
      // particles
      if (!REDUCE) {
        var dt = 0.016;
        for (i = 0; i < this.parts.length; i++) {
          var p = this.parts[i]; p.p += p.sp * dt; if (p.p > 1) p.p -= 1;
          var gateStop = this.state === "override" && p.p > 0.5 - 0.02 && p.p < 0.5 + 0.06; // queue at the gate
          if (!gateStop) {
            var px = nx[0] + p.p * (nx[4] - nx[0]);
            ctx.beginPath(); ctx.arc(px, PY, 2.4, 0, 7);
            ctx.fillStyle = alarm && p.p > 0.4 ? DK.gold : DK.cyan; ctx.fill();
          } else {
            var qx = nx[2] - 8 - (i % 3) * 7;
            ctx.beginPath(); ctx.arc(qx, PY, 2.4, 0, 7); ctx.fillStyle = DK.gold; ctx.fill();
          }
        }
      }
      // nodes
      for (i = 0; i < nodes.length; i++) {
        var hot = (i === 2 && (this.state === "override")) || (i === 4 && alarm);
        var colr = i === 4 && alarm ? DK.red : (i === 2 && this.state === "override" ? DK.gold : DK.blue);
        ctx.beginPath(); ctx.arc(nx[i], PY, 11, 0, 7);
        ctx.fillStyle = DK.bg; ctx.fill();
        ctx.lineWidth = hot ? 3 : 2; ctx.strokeStyle = colr; ctx.stroke();
        if (hot && !REDUCE) { // pulse ring
          var ph = (performance.now() % 1200) / 1200;
          ctx.beginPath(); ctx.arc(nx[i], PY, 11 + ph * 12, 0, 7);
          ctx.strokeStyle = "rgba(" + (i === 4 ? "255,90,78," : "232,184,75,") + (0.55 * (1 - ph)) + ")"; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.fillStyle = hot ? colr : DK.sub; ctx.font = "700 10px ui-monospace,monospace";
        ctx.fillText(nodes[i], nx[i], PY - 20);
      }
      /* ---- stream chart ---- */
      var top = 96, x0 = 44, x1 = W - 14, y1 = H - 40, y0 = top;
      var view = this.hist.slice(-WINDOW), n = view.length;
      var lo = Infinity, hi = -Infinity;
      for (i = 0; i < n; i++) { var h2 = view[i]; lo = Math.min(lo, h2.a, h2.pb, h2.pg); hi = Math.max(hi, h2.a, h2.pb, h2.pg); }
      var padY = (hi - lo) * 0.15 || 10; lo -= padY; hi += padY;
      var X = function (j) { return x0 + j / (WINDOW - 1) * (x1 - x0); };
      var Y = function (v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); };
      // grid
      ctx.strokeStyle = "rgba(126,189,255,.09)"; ctx.lineWidth = 1;
      for (i = 0; i <= 3; i++) { var gy = y0 + (y1 - y0) * i / 3; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke();
        ctx.fillStyle = DK.sub; ctx.font = "600 10px ui-monospace,monospace"; ctx.textAlign = "right";
        ctx.fillText(Math.round(hi - (hi - lo) * i / 3), x0 - 7, gy + 3); }
      var line = function (key, color, width, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = "round";
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        for (var j = 0; j < n; j++) { var vx = X(j + (WINDOW - n)), vy = Y(view[j][key]); j ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy); }
        ctx.stroke(); ctx.setLineDash([]);
      };
      line("pb", DK.red, 2, [4, 4]);
      line("pg", DK.blue, 2.4, [8, 4]);
      line("a", DK.ink, 2.2, null);
      // live head dot on actual
      if (n) { var hx = X(WINDOW - 1), hy = Y(view[n - 1].a);
        ctx.beginPath(); ctx.arc(hx, hy, 4, 0, 7); ctx.fillStyle = DK.ink; ctx.fill();
        if (!REDUCE) { var hp = (performance.now() % 1000) / 1000;
          ctx.beginPath(); ctx.arc(hx, hy, 4 + hp * 9, 0, 7); ctx.strokeStyle = "rgba(238,246,255," + (0.5 * (1 - hp)) + ")"; ctx.lineWidth = 1.5; ctx.stroke(); } }
      // legend
      ctx.textAlign = "left"; ctx.font = "700 10px ui-monospace,monospace";
	      ctx.fillStyle = DK.ink; ctx.fillText("actual demand", x0 + 4, y0 + 12);
	      ctx.fillStyle = DK.blue; ctx.fillText("AI nowcast", x0 + 104, y0 + 12);
	      ctx.fillStyle = DK.red; ctx.fillText("no-gate plan", x0 + 196, y0 + 12);
      /* ---- drift gauge (bottom) ---- */
      var THRESH = 11, gx0 = x0, gx1 = x1, gy0 = H - 24;
      ctx.fillStyle = DK.sub; ctx.font = "700 9px ui-monospace,monospace"; ctx.textAlign = "left";
	      ctx.fillText("RELEASE GATE (rolling WAPE vs tolerance)", gx0, gy0 - 6);
      ctx.fillStyle = "rgba(126,189,255,.12)"; ctx.fillRect(gx0, gy0, gx1 - gx0, 8);
      var frac = clamp(this.alarmMAE / (THRESH * 1.8), 0, 1);
      ctx.fillStyle = this.alarmMAE > THRESH ? DK.red : DK.teal;
      ctx.fillRect(gx0, gy0, (gx1 - gx0) * frac, 8);
      var tx = gx0 + (gx1 - gx0) * (1 / 1.8);
      ctx.strokeStyle = DK.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, gy0 - 3); ctx.lineTo(tx, gy0 + 11); ctx.stroke();
      ctx.fillStyle = this.alarmMAE > THRESH ? DK.red : DK.sub; ctx.textAlign = "right";
	      ctx.fillText(this.alarmMAE > THRESH ? "HOLD + REVIEW" : "within tolerance", gx1, gy0 - 6);
    },
    resize: function () {
      var w = this.wrap ? this.wrap.clientWidth : 0, h = this.wrap ? this.wrap.clientHeight : 0;
      if (!w || !h) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._w = w; this._h = h;
      this.draw();
    },
    onActive: function (a) {
      if (a) { this.live._state(true, this.state === "alert" || this.state === "override"); this.loop.start(); }
      else this.loop.stop();
    }
  });
})();
