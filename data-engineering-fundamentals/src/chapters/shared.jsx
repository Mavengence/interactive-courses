/* global React */
// Shared components & helpers for v3

const { useState, useEffect, useRef, useMemo } = React;

// Hero at the top of each chapter
function Hero({ eyebrow, title, hook, meta, accent }) {
  return (
    <header className="hero" style={accent ? { '--chapter-accent': accent } : undefined}>
      <div className="hero-eyebrow">{eyebrow}</div>
      <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="hero-hook" dangerouslySetInnerHTML={{ __html: hook }} />
      {meta && (
        <div className="hero-meta">
          {meta.map((m, i) => (
            <div className="m" key={i}>
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
  return <div className="section-label"><span className="n">{n}</span><span>{children}</span></div>;
}

// Anti-pattern callout (amber)
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

// Best-practices callout (mint)
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

// Takeaway block (accent gradient)
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

// Simulator panel wrapper
function Panel({ eyebrow, title, meta, children, caption }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <span className="dot" />
          {eyebrow && <span className="lab">{eyebrow}</span>}
          <span>{title}</span>
        </div>
        {meta && <div className="panel-meta">{meta}</div>}
      </div>
      <div className="panel-body">{children}</div>
      {caption && <div className="panel-caption">{caption}</div>}
    </div>
  );
}

// Tiny table-name / term that respects Internal-mode toggle
function Term({ meta, generic, internalMode }) {
  return <code className="term">{internalMode ? generic : meta}</code>;
}

// Intersection-observer hook — for cinematic on-scroll reveals
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

// useInterval helper
function useInterval(cb, ms, deps = []) {
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(cb, ms);
    return () => clearInterval(id);
  }, deps);
}

// Internal-mode name map: toggle internal ↔ generic terminology
const MM_MAP = {
  flink: ['Flink', 'Stream Processor'],
  kafkastreams: ['Kafka Streams', 'Stream Processor'],
  kafka: ['Kafka', 'Event Bus'],
  palette: ['palette', 'Command Palette'],
  open_lineage: ['OpenLineage', 'Lineage Service'],
  datahub: ['DataHub', 'Lineage Service'],
  access_gateway: ['Access Gateway', 'Access Gateway'],
  dataProjectAcl: ['dataset_acl', 'dataset_acl'],
  canonicalEmployee: ['PII_Person', 'PII_Person'],
  canonicalApp: ['Service_Identity', 'Service_Identity'],
  canonicalCW: ['PII_Contractor', 'PII_Contractor'],
  dqOperator: ['ExpectationSuite', 'QualityCheck'],
  waitForSignal: ['ExternalTaskSensor', 'WaitForSignal'],
  datasetspec: ['DatasetSpec', 'DatasetSpec'],
  cube: ['Cube', 'MetricsLayer'],
  airflow: ['Airflow', 'Scheduler'],
  clickhouse: ['ClickHouse', 'RealtimeStore'],
  snowflake: ['Snowflake', 'Warehouse'],
};
function MMNames(internalMode) {
  const out = {};
  for (const [k, v] of Object.entries(MM_MAP)) out[k] = internalMode ? v[1] : v[0];
  return out;
}
window.MMNames = MMNames;
window.MM_MAP = MM_MAP;

Object.assign(window, {
  Hero, SectionLabel, AntiPatterns, BestPractices, Takeaway, Panel, Term,
  useInView, useInterval,
});
