(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  function Hero({ eyebrow, title, hook, meta, accent }) {
    return /* @__PURE__ */ React.createElement("header", { className: "hero", style: accent ? { "--chapter-accent": accent } : void 0 }, /* @__PURE__ */ React.createElement("div", { className: "hero-eyebrow" }, eyebrow), /* @__PURE__ */ React.createElement("h1", { className: "hero-title", dangerouslySetInnerHTML: { __html: title } }), /* @__PURE__ */ React.createElement("p", { className: "hero-hook", dangerouslySetInnerHTML: { __html: hook } }), meta && /* @__PURE__ */ React.createElement("div", { className: "hero-meta" }, meta.map((m, i) => /* @__PURE__ */ React.createElement("div", { className: "m", key: i }, /* @__PURE__ */ React.createElement("div", { className: "k" }, m.k), /* @__PURE__ */ React.createElement("div", { className: "v", dangerouslySetInnerHTML: { __html: m.v } })))));
  }
  function SectionLabel({ n, children }) {
    return /* @__PURE__ */ React.createElement("div", { className: "section-label" }, /* @__PURE__ */ React.createElement("span", { className: "n" }, n), /* @__PURE__ */ React.createElement("span", null, children));
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
    return /* @__PURE__ */ React.createElement("div", { className: "panel" }, /* @__PURE__ */ React.createElement("div", { className: "panel-head" }, /* @__PURE__ */ React.createElement("div", { className: "panel-title" }, /* @__PURE__ */ React.createElement("span", { className: "dot" }), eyebrow && /* @__PURE__ */ React.createElement("span", { className: "lab" }, eyebrow), /* @__PURE__ */ React.createElement("span", null, title)), meta && /* @__PURE__ */ React.createElement("div", { className: "panel-meta" }, meta)), /* @__PURE__ */ React.createElement("div", { className: "panel-body" }, children), caption && /* @__PURE__ */ React.createElement("div", { className: "panel-caption" }, caption));
  }
  function Term({ meta, generic, internalMode }) {
    return /* @__PURE__ */ React.createElement("code", { className: "term" }, internalMode ? generic : meta);
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
  const MM_MAP = {
    flink: ["Flink", "Stream Processor"],
    kafkastreams: ["Kafka Streams", "Stream Processor"],
    kafka: ["Kafka", "Event Bus"],
    palette: ["palette", "Command Palette"],
    open_lineage: ["OpenLineage", "Lineage Service"],
    datahub: ["DataHub", "Lineage Service"],
    access_gateway: ["Access Gateway", "Access Gateway"],
    dataProjectAcl: ["dataset_acl", "dataset_acl"],
    canonicalEmployee: ["PII_Person", "PII_Person"],
    canonicalApp: ["Service_Identity", "Service_Identity"],
    canonicalCW: ["PII_Contractor", "PII_Contractor"],
    dqOperator: ["ExpectationSuite", "QualityCheck"],
    waitForSignal: ["ExternalTaskSensor", "WaitForSignal"],
    datasetspec: ["DatasetSpec", "DatasetSpec"],
    cube: ["Cube", "MetricsLayer"],
    airflow: ["Airflow", "Scheduler"],
    clickhouse: ["ClickHouse", "RealtimeStore"],
    snowflake: ["Snowflake", "Warehouse"]
  };
  function MMNames(internalMode) {
    const out = {};
    for (const [k, v] of Object.entries(MM_MAP)) out[k] = internalMode ? v[1] : v[0];
    return out;
  }
  window.MMNames = MMNames;
  window.MM_MAP = MM_MAP;
  Object.assign(window, {
    Hero,
    SectionLabel,
    AntiPatterns,
    BestPractices,
    Takeaway,
    Panel,
    Term,
    useInView,
    useInterval
  });
})();
