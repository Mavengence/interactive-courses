(() => {
  const { useState, useEffect, useRef, useCallback } = React;
  const CHAPTERS = [
    { id: "home", n: "-", title: "Overview", sub: "The pipeline, end to end", time: "3 min", hex: "#6B7787", ink: "#646F7E" },
    { id: "fund", n: "00", title: "Core Fundamentals", sub: "Storage, formats, engines", time: "8 min", hex: "#0F1729", ink: "#0F1729" },
    { id: "ingest", n: "01", title: "Ingest", sub: "Where data is born", time: "9 min", hex: "#7C5CFF", ink: "#6E4BFF" },
    { id: "stream", n: "02", title: "Streaming", sub: "The bridge to the warehouse", time: "7 min", hex: "#22D3EE", ink: "#0B798A" },
    { id: "store", n: "03", title: "Store", sub: "Where data lives", time: "8 min", hex: "#2D7DFF", ink: "#0060FD" },
    { id: "comp", n: "04", title: "Compute", sub: "How data is read", time: "9 min", hex: "#FF7A59", ink: "#D32A00" },
    { id: "orch", n: "05", title: "Orchestrate", sub: "Airflow & idempotency", time: "8 min", hex: "#31A24C", ink: "#267E3B" },
    { id: "qual", n: "06", title: "Quality", sub: "Pipeline ran \u2260 number is right", time: "8 min", hex: "#E41E3F", ink: "#D81A39" },
    { id: "disc", n: "07", title: "Discover", sub: "Six shortcuts over four hours", time: "7 min", hex: "#B8770A", ink: "#986308" },
    { id: "serve", n: "08", title: "Serve", sub: "Metrics & semantic models", time: "8 min", hex: "#0091FF", ink: "#0070C5" },
    { id: "gov", n: "09", title: "Govern", sub: "The deploy gate", time: "7 min", hex: "#8B5CF6", ink: "#7D48F5" },
    { id: "cap", n: "10", title: "Capstone", sub: "Build dim_users E2E", time: "15 min", hex: "#E85D04", ink: "#BB4B03" }
  ];
  const ACCENTS = [
    { id: "blue", hex: "#2D7DFF", name: "Signal" },
    { id: "cyan", hex: "#22D3EE", name: "Cyan" },
    { id: "violet", hex: "#7C5CFF", name: "Violet" },
    { id: "green", hex: "#4ADE80", name: "Mint" },
    { id: "amber", hex: "#FFB454", name: "Amber" }
  ];
  const FONTS = [
    { id: "geist", name: "Geist", stack: `'Geist', -apple-system, sans-serif` },
    { id: "space", name: "Space Grotesk", stack: `'Space Grotesk', -apple-system, sans-serif` },
    { id: "general", name: "General Sans", stack: `'General Sans', -apple-system, sans-serif` }
  ];
  function Sidebar({ current, setCurrent, progress, collapsed, setCollapsed }) {
    return /* @__PURE__ */ React.createElement("aside", { className: `sb ${collapsed ? "collapsed" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "sb-brand" }, /* @__PURE__ */ React.createElement("div", { className: "sb-mark" }, "DE"), !collapsed && /* @__PURE__ */ React.createElement("div", { className: "sb-brand-meta" }, /* @__PURE__ */ React.createElement("div", { className: "sb-brand-title" }, "DE Fundamentals"), /* @__PURE__ */ React.createElement("div", { className: "sb-brand-sub" }, "Interactive course")), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "sb-collapse-btn",
        onClick: () => setCollapsed((v) => !v),
        "aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar",
        title: collapsed ? "Expand sidebar  ([)" : "Collapse sidebar  ([)"
      },
      /* @__PURE__ */ React.createElement("span", { className: "sb-collapse-icon", "aria-hidden": "true" }, collapsed ? "\u203A" : "\u2039")
    )), !collapsed && /* @__PURE__ */ React.createElement("div", { className: "sb-eyebrow" }, "Course"), /* @__PURE__ */ React.createElement("nav", { className: "sb-nav" }, CHAPTERS.map((c) => {
      const done = progress[c.id];
      const active = current === c.id;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: c.id,
          className: `sb-item ${active ? "active" : ""} ${done && !active ? "done" : ""}`,
          style: { "--ch-hex": c.hex, "--ch-ink": c.ink },
          onClick: () => setCurrent(c.id),
          title: collapsed ? `${c.n} \xB7 ${c.title} \xB7 ${c.time}` : void 0
        },
        /* @__PURE__ */ React.createElement("div", { className: "sb-num" }, c.n),
        !collapsed && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "sb-text" }, /* @__PURE__ */ React.createElement("div", { className: "sb-title" }, c.title)), /* @__PURE__ */ React.createElement("div", { className: "sb-time" }, c.time))
      );
    })));
  }
  function TopBar({ chapter, onPrev, onNext, prevDisabled, nextDisabled }) {
    return /* @__PURE__ */ React.createElement("div", { className: "tb" }, /* @__PURE__ */ React.createElement(
      "a",
      { className: "tb-allcourses", href: "../", title: "Back to all courses" },
      /* @__PURE__ */ React.createElement("span", { className: "tb-allcourses-arrow", "aria-hidden": "true" }, "\u2190"),
      "All courses"
    ), /* @__PURE__ */ React.createElement("div", { className: "crumb" }, /* @__PURE__ */ React.createElement("b", null, "DE Fundamentals"), /* @__PURE__ */ React.createElement("span", { className: "sep" }, "/"), /* @__PURE__ */ React.createElement("span", null, "Chapter ", chapter.n), /* @__PURE__ */ React.createElement("span", { className: "sep" }, "/"), /* @__PURE__ */ React.createElement("span", { className: "here" }, chapter.title)), /* @__PURE__ */ React.createElement("div", { className: "tb-right" }, /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: onPrev, disabled: prevDisabled }, "\u2190 Prev ", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u2190")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: onNext, disabled: nextDisabled }, "Next \u2192 ", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u2192"))));
  }
  function TweaksPanel({ state, set, onClose }) {
    return /* @__PURE__ */ React.createElement("div", { className: "tweaks-panel" }, /* @__PURE__ */ React.createElement("div", { className: "tweaks-head" }, /* @__PURE__ */ React.createElement("div", { className: "tweaks-title" }, "Tweaks"), /* @__PURE__ */ React.createElement("div", { className: "btn", style: { padding: "4px 9px", fontSize: 11 }, onClick: onClose }, "Close")), /* @__PURE__ */ React.createElement("div", { className: "tweaks-body" }, /* @__PURE__ */ React.createElement("div", { className: "tw-group" }, /* @__PURE__ */ React.createElement("div", { className: "tw-lab" }, "Accent"), /* @__PURE__ */ React.createElement("div", { className: "tw-swatch" }, ACCENTS.map((a) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: a.id,
        className: `tw-chip ${state.accent === a.id ? "on" : ""}`,
        style: { background: a.hex },
        onClick: () => set("accent", a.id),
        title: a.name
      }
    )))), /* @__PURE__ */ React.createElement("div", { className: "tw-group" }, /* @__PURE__ */ React.createElement("div", { className: "tw-lab" }, "Font"), /* @__PURE__ */ React.createElement("div", { className: "tw-opts" }, FONTS.map((f) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: f.id,
        className: `tw-opt ${state.font === f.id ? "on" : ""}`,
        onClick: () => set("font", f.id)
      },
      f.name
    )))), /* @__PURE__ */ React.createElement("div", { className: "tw-group" }, /* @__PURE__ */ React.createElement("div", { className: "tw-lab" }, "Density"), /* @__PURE__ */ React.createElement("div", { className: "tw-opts", style: { gridTemplateColumns: "1fr 1fr" } }, /* @__PURE__ */ React.createElement("div", { className: `tw-opt ${state.density === "compact" ? "on" : ""}`, onClick: () => set("density", "compact") }, "Compact"), /* @__PURE__ */ React.createElement("div", { className: `tw-opt ${state.density === "comfortable" ? "on" : ""}`, onClick: () => set("density", "comfortable") }, "Comfy"))), /* @__PURE__ */ React.createElement("div", { className: "tw-group" }, /* @__PURE__ */ React.createElement("div", { className: "tw-lab" }, "Code theme"), /* @__PURE__ */ React.createElement("div", { className: "tw-opts", style: { gridTemplateColumns: "1fr 1fr" } }, /* @__PURE__ */ React.createElement("div", { className: `tw-opt ${state.codeTheme === "color" ? "on" : ""}`, onClick: () => set("codeTheme", "color") }, "Color"), /* @__PURE__ */ React.createElement("div", { className: `tw-opt ${state.codeTheme === "mono" ? "on" : ""}`, onClick: () => set("codeTheme", "mono") }, "Mono")))));
  }
  function App() {
    const TWEAK_DEFAULTS = (
      /*EDITMODE-BEGIN*/
      {
        "accent": "blue",
        "font": "geist",
        "density": "comfortable",
        "codeTheme": "color"
      }
    );
    const [current, setCurrent] = useState(() => localStorage.getItem("de-course-chap") || "home");
    const [progress, setProgress] = useState(() => {
      try {
        const parsed = JSON.parse(localStorage.getItem("de-course-prog") || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch (e) {
        return {};
      }
    });
    const [internalMode, setInternalMode] = useState(() => localStorage.getItem("de-course-mode") === "1");
    const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("de-course-rm") === "1");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("de-course-sb") === "1");
    const [tweaksOpen, setTweaksOpen] = useState(false);
    const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
    const contentRef = useRef(null);
    useEffect(() => {
      localStorage.setItem("de-course-chap", current);
    }, [current]);
    useEffect(() => {
      localStorage.setItem("de-course-prog", JSON.stringify(progress));
    }, [progress]);
    useEffect(() => {
      localStorage.setItem("de-course-mode", internalMode ? "1" : "0");
    }, [internalMode]);
    useEffect(() => {
      localStorage.setItem("de-course-rm", reduceMotion ? "1" : "0");
    }, [reduceMotion]);
    useEffect(() => {
      localStorage.setItem("de-course-sb", sidebarCollapsed ? "1" : "0");
    }, [sidebarCollapsed]);
    useEffect(() => {
      const r = document.documentElement;
      r.setAttribute("data-accent", tweaks.accent);
      r.setAttribute("data-density", tweaks.density);
      r.setAttribute("data-code-theme", tweaks.codeTheme);
      const font = FONTS.find((f) => f.id === tweaks.font);
      if (font) r.style.setProperty("--font-display", font.stack);
    }, [tweaks]);
    const setTweak = useCallback((k, v) => setTweaks((t) => ({ ...t, [k]: v })), []);
    const idx = CHAPTERS.findIndex((c) => c.id === current);
    const chapter = CHAPTERS[idx] || CHAPTERS[0];
    useEffect(() => {
      setProgress((p) => {
        const np = { ...p };
        for (let i = 0; i < idx; i++) np[CHAPTERS[i].id] = true;
        return np;
      });
    }, [idx]);
    const goTo = useCallback((id) => {
      setCurrent(id);
      if (contentRef.current) contentRef.current.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: "auto" });
    }, []);
    const onPrev = () => goTo(CHAPTERS[Math.max(0, idx - 1)].id);
    const onNext = () => goTo(CHAPTERS[Math.min(CHAPTERS.length - 1, idx + 1)].id);
    useEffect(() => {
      const onKey = (e) => {
        if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onPrev();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onNext();
        } else if (e.key === "j") window.scrollBy({ top: 120, behavior: "smooth" });
        else if (e.key === "k") window.scrollBy({ top: -120, behavior: "smooth" });
        else if (e.key === "t") setTweaksOpen((v) => !v);
        else if (e.key === "[") setSidebarCollapsed((v) => !v);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [idx]);
    useEffect(() => {
      const handler = (e) => {
        if (e.data?.type === "__activate_edit_mode") setTweaksOpen(true);
        else if (e.data?.type === "__deactivate_edit_mode") setTweaksOpen(false);
      };
      window.addEventListener("message", handler);
      window.parent.postMessage({ type: "__edit_mode_available" }, "*");
      return () => window.removeEventListener("message", handler);
    }, []);
    useEffect(() => {
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: tweaks }, "*");
    }, [tweaks]);
    useEffect(() => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) setReduceMotion(true);
    }, []);
    return /* @__PURE__ */ React.createElement("div", { className: `app ${reduceMotion ? "reduce-motion" : ""} ${sidebarCollapsed ? "sb-collapsed" : ""}` }, /* @__PURE__ */ React.createElement(
      Sidebar,
      {
        current,
        setCurrent: goTo,
        progress,
        collapsed: sidebarCollapsed,
        setCollapsed: setSidebarCollapsed
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "main" }, /* @__PURE__ */ React.createElement(
      TopBar,
      {
        chapter,
        onPrev,
        onNext,
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
      /* @__PURE__ */ React.createElement(ChapterBody, { id: current, chapter, internalMode, goTo, reduceMotion })
    )), tweaksOpen && /* @__PURE__ */ React.createElement(TweaksPanel, { state: tweaks, set: setTweak, onClose: () => setTweaksOpen(false) }));
  }
  function ChapterBody({ id, chapter, internalMode, goTo, reduceMotion }) {
    const Comps = {
      home: window.Ch_Overview,
      fund: window.Ch0_Fundamentals,
      ingest: window.Ch1_Ingest,
      stream: window.Ch1_5_Streaming,
      store: window.Ch2_Store,
      comp: window.Ch3_Compute,
      orch: window.Ch4_Orchestrate,
      qual: window.Ch5_Quality,
      disc: window.Ch6_Discover,
      serve: window.Ch7_Serve,
      gov: window.Ch8_Govern,
      cap: window.Ch9_Capstone
    };
    const C = Comps[id];
    if (!C) return /* @__PURE__ */ React.createElement("div", { style: { color: "var(--ink-faint)", padding: "40px 0" } }, "Chapter not available yet.");
    return /* @__PURE__ */ React.createElement(C, { chapter, internalMode, goTo, reduceMotion });
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
})();
