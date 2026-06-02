(() => {
  const { useState, useEffect, useRef, useCallback } = React;
  const CHAPTERS = [
    { id: "home", n: "\u2014", title: "Overview", sub: "The whole DS loop, animated", time: "3 min" },
    { id: "fund", n: "01", title: "Fundamentals", sub: "Sample vs population, the loop", time: "7 min" },
    { id: "explore", n: "02", title: "Explore", sub: "Distributions \xB7 outliers \xB7 corr", time: "8 min" },
    { id: "clean", n: "03", title: "Clean", sub: "Missingness \xB7 scaling \xB7 leakage", time: "7 min" },
    { id: "feature", n: "04", title: "Feature", sub: "Encoding \xB7 interactions \xB7 leak", time: "8 min" },
    { id: "model", n: "05", title: "Model", sub: "Bias/variance live", time: "9 min" },
    { id: "eval", n: "06", title: "Evaluate", sub: "Confusion \xB7 threshold \xB7 ROC/PR", time: "8 min" },
    { id: "interp", n: "07", title: "Interpret", sub: "SHAP \xB7 feature importance", time: "7 min" },
    { id: "exp", n: "08", title: "Experiment", sub: "A/B \xB7 power \xB7 MDE", time: "9 min" },
    { id: "causal", n: "09", title: "Causal", sub: "DAGs \xB7 confounders \xB7 backdoors", time: "8 min" },
    { id: "peek", n: "10", title: "Peeking & CUPED", sub: "How p-values lie", time: "7 min" },
    { id: "deploy", n: "11", title: "Deploy", sub: "Drift \xB7 monitoring \xB7 retrain", time: "7 min" },
    { id: "cap", n: "12", title: "Capstone", sub: "The full loop, end to end", time: "12 min" }
  ];
  function Sidebar({ current, setCurrent, progress }) {
    return /* @__PURE__ */ React.createElement("aside", { className: "sb" }, /* @__PURE__ */ React.createElement("div", { className: "sb-brand" }, /* @__PURE__ */ React.createElement("div", { className: "sb-mark" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 32 32", width: "22", height: "22" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "sbmark", x1: "0", y1: "0", x2: "1", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "#D1FF3A" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "#FF4DA2" }))), /* @__PURE__ */ React.createElement("path", { d: "M4 22 C 10 6, 22 26, 28 10", stroke: "url(#sbmark)", strokeWidth: "3", strokeLinecap: "round", fill: "none" }), /* @__PURE__ */ React.createElement("circle", { cx: "4", cy: "22", r: "2.5", fill: "#D1FF3A" }), /* @__PURE__ */ React.createElement("circle", { cx: "28", cy: "10", r: "2.5", fill: "#FF4DA2" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "sb-brand-title" }, "DS Fundamentals"), /* @__PURE__ */ React.createElement("div", { className: "sb-brand-sub" }, "v8 \xB7 polished + animated"))), /* @__PURE__ */ React.createElement("div", { className: "sb-eyebrow", id: "sb-curriculum-label" }, "Curriculum"), /* @__PURE__ */ React.createElement("nav", { className: "sb-nav", "aria-label": "Course chapters", "aria-labelledby": "sb-curriculum-label" }, CHAPTERS.map((c) => {
      const done = progress[c.id];
      const active = current === c.id;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: c.id,
          type: "button",
          className: `sb-item ${active ? "active" : ""} ${done && !active ? "done" : ""}`,
          "aria-current": active ? "page" : void 0,
          "aria-label": `Chapter ${c.n}: ${c.title} \u2014 ${c.sub} (${c.time})`,
          onClick: () => setCurrent(c.id)
        },
        /* @__PURE__ */ React.createElement("div", { className: "sb-num" }, c.n),
        /* @__PURE__ */ React.createElement("div", { className: "sb-mid" }, /* @__PURE__ */ React.createElement("div", { className: "sb-title" }, c.title), /* @__PURE__ */ React.createElement("div", { className: "sb-sub" }, c.sub)),
        /* @__PURE__ */ React.createElement("div", { className: "sb-time" }, c.time)
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "sb-foot" }, /* @__PURE__ */ React.createElement("div", { className: "sb-foot-lab" }, "Built for the"), /* @__PURE__ */ React.createElement("div", { className: "sb-foot-name" }, "class of 2026")));
  }
  function TopBar({ chapter, onPrev, onNext, prevDisabled, nextDisabled }) {
    return /* @__PURE__ */ React.createElement("div", { className: "tb" }, /* @__PURE__ */ React.createElement("a", { className: "tb-back", href: "../", "aria-label": "Back to all courses" }, /* @__PURE__ */ React.createElement("span", { className: "tb-back-arrow", "aria-hidden": "true" }, "\u2190"), " All courses"), /* @__PURE__ */ React.createElement("span", { className: "tb-back-sep", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("div", { className: "crumb" }, /* @__PURE__ */ React.createElement("b", null, "DS Fundamentals"), /* @__PURE__ */ React.createElement("span", { className: "sep" }, "/"), /* @__PURE__ */ React.createElement("span", null, "Ch ", chapter.n), /* @__PURE__ */ React.createElement("span", { className: "sep" }, "/"), /* @__PURE__ */ React.createElement("span", { className: "here" }, chapter.title)), /* @__PURE__ */ React.createElement("div", { className: "tb-right" }, /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: onPrev, disabled: prevDisabled }, "\u2190 Prev ", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u2190")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: onNext, disabled: nextDisabled }, "Next \u2192 ", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u2192"))));
  }
  function App() {
    const [current, setCurrent] = useState(() => {
      if (new URL(location.href).searchParams.has("reset")) {
        localStorage.removeItem("ds-v8-chap");
        localStorage.removeItem("ds-v8-prog");
        return "home";
      }
      return localStorage.getItem("ds-v8-chap") || "home";
    });
    const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem("ds-v8-prog") || "{}"));
    const contentRef = useRef(null);
    useEffect(() => {
      localStorage.setItem("ds-v8-chap", current);
    }, [current]);
    useEffect(() => {
      localStorage.setItem("ds-v8-prog", JSON.stringify(progress));
    }, [progress]);
    const idx = Math.max(0, CHAPTERS.findIndex((c) => c.id === current));
    const chapter = CHAPTERS[idx];
    const goTo = useCallback((id) => {
      setCurrent(id);
      if (contentRef.current) contentRef.current.scrollTop = 0;
      setProgress((p) => ({ ...p, [current]: true }));
    }, [current]);
    const goNext = useCallback(() => {
      if (idx < CHAPTERS.length - 1) goTo(CHAPTERS[idx + 1].id);
    }, [idx, goTo]);
    const goPrev = useCallback(() => {
      if (idx > 0) goTo(CHAPTERS[idx - 1].id);
    }, [idx, goTo]);
    useEffect(() => {
      const h = (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key === "ArrowRight") goNext();
        if (e.key === "ArrowLeft") goPrev();
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [goNext, goPrev]);
    return /* @__PURE__ */ React.createElement("div", { className: "app" }, /* @__PURE__ */ React.createElement(Sidebar, { current, setCurrent: goTo, progress }), /* @__PURE__ */ React.createElement("div", { className: "main" }, /* @__PURE__ */ React.createElement(
      TopBar,
      {
        chapter,
        onPrev: goPrev,
        onNext: goNext,
        prevDisabled: idx === 0,
        nextDisabled: idx === CHAPTERS.length - 1
      }
    ), /* @__PURE__ */ React.createElement(
      "main",
      {
        className: "content",
        ref: contentRef,
        "data-screen-label": `${chapter.n} ${chapter.title}`
      },
      /* @__PURE__ */ React.createElement(ChapterBody, { id: current, chapter, goTo })
    )));
  }
  function ChapterBody({ id, chapter, goTo }) {
    const Comps = {
      home: window.Ch_Overview,
      fund: window.Ch01_Fundamentals,
      explore: window.Ch02_Explore,
      clean: window.Ch03_Clean,
      feature: window.Ch04_Feature,
      model: window.Ch05_Model,
      eval: window.Ch06_Evaluate,
      interp: window.Ch07_Interpret,
      exp: window.Ch08_Experiment,
      causal: window.Ch09_Causal,
      peek: window.Ch10_Peeking,
      deploy: window.Ch11_Deploy,
      cap: window.Ch12_Capstone
    };
    const C = Comps[id];
    if (!C) {
      return /* @__PURE__ */ React.createElement("div", { className: "chap-placeholder" }, /* @__PURE__ */ React.createElement("div", { className: "chap-placeholder-eyebrow" }, "Chapter ", chapter.n), /* @__PURE__ */ React.createElement("div", { className: "chap-placeholder-title" }, chapter.title), /* @__PURE__ */ React.createElement("div", { className: "chap-placeholder-sub" }, "Coming soon."));
    }
    return /* @__PURE__ */ React.createElement(C, { chapter, goTo });
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
})();
