(() => {
  const { useState, useEffect, useRef } = React;
  const METRICS = {
    dau: {
      name: "daily_active_users",
      owner: "analytics_team",
      grain: "user, day",
      source: "events_daily",
      formula: 'COUNT(DISTINCT user_id) WHERE event_name IN ("open","login")'
    },
    revenue: {
      name: "revenue_usd",
      owner: "finance_team",
      grain: "day, country",
      source: "billable_impressions",
      formula: "SUM(bid_price * 1e-6) WHERE billable = TRUE"
    },
    creators: {
      name: "active_creators",
      owner: "creators_data",
      grain: "creator, day",
      source: "creator_posts_daily",
      formula: "COUNT(DISTINCT creator_id) WHERE posts >= 1"
    }
  };
  const QUESTIONS = [
    { q: "DAU in US last week?", metric: "dau", answer: "142.3M", src: "events_daily \xB7 7-day avg \xB7 US", govOK: true },
    { q: "Ad revenue yesterday?", metric: "revenue", answer: "$89.4M", src: "billable_impressions \xB7 2026-04-19 \xB7 global", govOK: true },
    { q: "Active creators this month?", metric: "creators", answer: "2.14M", src: "creator_posts_daily \xB7 2026-04 MTD", govOK: true }
  ];
  function sameBase() {
    return { status: "idle", step: -1, log: [] };
  }
  function MetricsSim() {
    const [governed, setGoverned] = useState(true);
    const [question, setQuestion] = useState(QUESTIONS[0].q);
    const [run, setRun] = useState(sameBase());
    const [result, setResult] = useState(null);
    const timers = useRef([]);
    const clearTimers = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    useEffect(() => () => clearTimers(), []);
    const governedSteps = (q2) => [
      { k: "parse", title: "Parse intent", desc: "question \u2192 metric lookup", ms: 500 },
      { k: "resolve", title: "Resolve metric", desc: `Registry hit: ${METRICS[q2.metric].name}`, ms: 700 },
      { k: "bind", title: "Bind grain & filters", desc: "time window \xB7 cohort \xB7 geo", ms: 650 },
      { k: "compose", title: "Compose SQL", desc: "from metric formula + filters", ms: 600 },
      { k: "execute", title: "Execute on Presto", desc: "read governed source", ms: 900 },
      { k: "answer", title: "Return answer + lineage", desc: "traceable to source rows", ms: 400 }
    ];
    const ungovernedSteps = () => [
      { k: "parse", title: "Parse intent", desc: 'question \u2192 "find a relevant table"', ms: 500 },
      { k: "search", title: "Search warehouse schema", desc: "No registry: grep table names\u2026", ms: 1e3 },
      { k: "guess", title: "Pick table by name match", desc: 'Chose "dau_v3_deprecated_2021"', ms: 800 },
      { k: "wrongcol", title: "Reference columns from memory", desc: "Wrote: user_cnt \xB7 daily_cnt", ms: 900, error: true },
      { k: "execute", title: "Execute on Presto", desc: "Column not found: abort", ms: 500, error: true }
    ];
    const renderSQL = (q2) => {
      const m = METRICS[q2.metric];
      return governed ? `<span class="tok-c">-- auto-composed from metric registry \xB7 traceable</span>
<span class="tok-k">SELECT</span> <span class="tok-f">COUNT</span>(<span class="tok-k">DISTINCT</span> user_id) <span class="tok-k">AS</span> ${m.name}
<span class="tok-k">FROM</span> ${m.source}
<span class="tok-k">WHERE</span> ds <span class="tok-k">BETWEEN</span> <span class="tok-s">'&lt;DATEID-7&gt;'</span> <span class="tok-k">AND</span> <span class="tok-s">'&lt;DATEID&gt;'</span>
  <span class="tok-k">AND</span> country = <span class="tok-s">'US'</span>
  <span class="tok-k">AND</span> event_name <span class="tok-k">IN</span> (<span class="tok-s">'open'</span>, <span class="tok-s">'login'</span>);` : `<span class="tok-c">-- ad-hoc query \xB7 no metric registry \xB7 likely wrong</span>
<span class="tok-k">SELECT</span> <span class="tok-f">SUM</span>(user_cnt) <span class="tok-k">AS</span> total_users      <span class="tok-c">-- \u21AF column doesn't exist</span>
<span class="tok-k">FROM</span> dau_v3_deprecated_2021                 <span class="tok-c">-- \u21AF archived in 2022</span>
<span class="tok-k">WHERE</span> day <span class="tok-k">BETWEEN</span> <span class="tok-s">'last_week'</span> <span class="tok-k">AND</span> <span class="tok-f">NOW</span>(); <span class="tok-c">-- \u21AF non-deterministic</span>`;
    };
    const runQuery = () => {
      clearTimers();
      setResult(null);
      const q2 = QUESTIONS.find((x) => x.q === question) || QUESTIONS[0];
      const steps = governed ? governedSteps(q2) : ungovernedSteps();
      setRun({ status: "running", step: 0, log: [], steps });
      let elapsed = 0;
      steps.forEach((s, i) => {
        const t = setTimeout(() => {
          setRun((r) => ({ ...r, step: i, log: [...r.log, s] }));
          if (i === steps.length - 1) {
            const t2 = setTimeout(() => {
              const errored = steps.some((x) => x.error);
              setRun((r) => ({ ...r, status: errored ? "error" : "done" }));
              setResult(errored ? { err: true, v: "Query failed", src: 'ERROR: Column "user_cnt" cannot be resolved. Table "dau_v3_deprecated_2021" was archived 2022-08.' } : { err: false, v: q2.answer, src: q2.src });
            }, 350);
            timers.current.push(t2);
          }
        }, elapsed);
        timers.current.push(t);
        elapsed += s.ms;
      });
    };
    const q = QUESTIONS.find((x) => x.q === question) || QUESTIONS[0];
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live simulator \xB7 metrics query",
        title: "The same question: with and without a metrics layer",
        meta: governed ? "governed" : "ungoverned",
        caption: "Toggle the ungoverned switch. Same question, same warehouse. The difference is whether the consumer can find the right table by name or has to guess."
      },
      /* @__PURE__ */ React.createElement("div", { className: "aa-question-row" }, /* @__PURE__ */ React.createElement("input", { className: "aa-q-input", value: question, onChange: (e) => setQuestion(e.target.value), list: "aa-qs", placeholder: "Ask about a metric\u2026" }), /* @__PURE__ */ React.createElement("datalist", { id: "aa-qs" }, QUESTIONS.map((x) => /* @__PURE__ */ React.createElement("option", { key: x.q, value: x.q }))), /* @__PURE__ */ React.createElement("label", { className: "aa-toggle" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: !governed, onChange: (e) => setGoverned(!e.target.checked) }), "Disable metrics layer"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: runQuery, disabled: run.status === "running" }, run.status === "running" ? "\u2026running" : "\u25B6 Run query")),
      /* @__PURE__ */ React.createElement("div", { className: "aa-stages" }, /* @__PURE__ */ React.createElement("div", { className: "aa-stage-col" }, /* @__PURE__ */ React.createElement("div", { className: "aa-stage-head" }, /* @__PURE__ */ React.createElement("span", null, "Query trace"), /* @__PURE__ */ React.createElement("span", null, run.status)), /* @__PURE__ */ React.createElement("div", { className: "aa-stage-body" }, run.log.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "40px 18px", textAlign: "center", color: "var(--fg-2)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.02em" } }, "idle: press \u25B6 Run query"), run.log.map((s, i) => {
        const cls = s.error ? "error" : i === run.step && run.status === "running" ? "active" : "done";
        return /* @__PURE__ */ React.createElement("div", { key: i, className: `aa-step ${cls}` }, /* @__PURE__ */ React.createElement("div", { className: "ico" }, s.error ? "\u2715" : String(i + 1)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "title" }, s.title), /* @__PURE__ */ React.createElement("div", { className: "desc" }, s.desc)), /* @__PURE__ */ React.createElement("div", { className: "time" }, s.ms, "ms"));
      }))), /* @__PURE__ */ React.createElement("div", { className: "aa-stage-col dark" }, /* @__PURE__ */ React.createElement("div", { className: "aa-yaml-head" }, /* @__PURE__ */ React.createElement("span", null, governed ? "generated \xB7 composed from registry" : "ad-hoc \xB7 written by a hurried analyst"), /* @__PURE__ */ React.createElement("span", null, "SQL")), /* @__PURE__ */ React.createElement("pre", { className: "aa-yaml", dangerouslySetInnerHTML: { __html: renderSQL(q) } }))),
      result && /* @__PURE__ */ React.createElement("div", { className: `aa-answer ${result.err ? "err" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "lab" }, result.err ? "Execution failed" : "Answer"), /* @__PURE__ */ React.createElement("div", { className: "v" }, result.v), /* @__PURE__ */ React.createElement("div", { className: "src" }, result.src))
    );
  }
  function MetricsRegistry() {
    return /* @__PURE__ */ React.createElement("div", { className: "cards-3" }, Object.values(METRICS).map((m) => /* @__PURE__ */ React.createElement("div", { key: m.name, className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, m.owner), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, m.name), /* @__PURE__ */ React.createElement("div", { className: "ccard-d", style: { fontFamily: "var(--font-mono)", fontSize: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("b", null, "grain:"), " ", m.grain), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("b", null, "source:"), " ", /* @__PURE__ */ React.createElement("code", null, m.source)), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("b", null, "formula:")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 2, color: "var(--fg-2)" } }, m.formula)))));
  }
  function Ch7_Serve({ chapter }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.ink,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: "Serve: <span class='accent'>five teams.</span> Five DAU numbers. One meeting.",
        hook: "The warehouse has the right number. Nobody can agree what it is. Without a metrics layer, every team defines DAU in their dashboard SQL: independently, slightly differently, each plausible. You cannot reconcile them after the meeting. You can only prevent it before.",
        meta: [
          { k: "Contract", v: "one definition per metric \xB7 forever" },
          { k: "Owner", v: "the team that produces the source" },
          { k: "Surface", v: "API \xB7 dashboards \xB7 notebooks" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "8.1" }, "What a metrics layer actually is"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Every metric, one canonical definition."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A metrics layer is a ", /* @__PURE__ */ React.createElement("strong", null, "registry"), ": every business metric: DAU, revenue, active creators: is declared once, with an owner, a grain, a source table, and a formula. Downstream consumers don't write SQL against raw tables; they ask for a metric by name, and the system composes the SQL, applies access controls, and returns a lineage-traceable answer."), /* @__PURE__ */ React.createElement(MetricsRegistry, null), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { marginTop: 18 } }, "This is also your ", /* @__PURE__ */ React.createElement("strong", null, "access surface"), ". Row-level security, PII masking, regional data residency: all enforced at the metrics layer, so every consumer (a viewer of a dashboard, an analyst in a notebook, a partner via API) gets the same guarantees.")), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "8.2" }, "The query story"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Same question. Different warehouse."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Ask any analyst ", /* @__PURE__ */ React.createElement("em", null, '"what was DAU in the US last week?"'), " Without a metrics layer, they search the warehouse for table names that look related, pick one based on intuition, and write ad-hoc SQL. Often they land on a table that looks current but was deprecated two years ago. Sometimes they reference column names from memory that have since been renamed.", /* @__PURE__ */ React.createElement("strong", null, " You cannot tell from the answer"), "."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "With a metrics layer, the consumer's job is scoped: resolve the question to a registered metric, bind filters, compose SQL from the stored formula, execute against the ", /* @__PURE__ */ React.createElement("em", null, "one"), " governed source. The answer is traceable to a row in a table that someone owns."), /* @__PURE__ */ React.createElement(MetricsSim, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "8.3" }, "What the consumer actually sees"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "One metric, many surfaces."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "The win of a single registry: the number on the CFO's deck, the number on the product dashboard, the number quoted in Slack, and the number you'd get by writing SQL yourself: ", /* @__PURE__ */ React.createElement("em", null, "are all the same number"), ", because they all resolve through the same definition. Drift in any of these is a bug ticket, not an interpretation difference."), /* @__PURE__ */ React.createElement("div", { className: "cards-2" }, /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, "Dashboards"), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Hex \xB7 Mode \xB7 Superset \xB7 Trino-backed"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "All read from the same metric. Refreshes are cheap because the compute is shared across viewers.")), /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, "Notebooks & APIs"), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "One resolver, many callers"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "Notebooks call the registry, not raw tables. External partners hit a metric API. Same definition, same numbers everywhere.")))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Defining DAU in five places.</b> Once in a dashboard SQL, once in a pipeline, once in an exec deck, once in Slack, once in a CSV. They will drift. They will be cited in the same meeting. You will not be there to defend any of them.",
      "<b>Letting consumers query raw tables with no governance.</b> Someone will find <code>dau_v3_backup_DO_NOT_USE</code> and quote it. You will not know.",
      "<b>Building a metrics layer without owners.</b> A metric with no owner is a metric that will go stale, then wrong, then cited in a launch review.",
      "<b>Access controls on the table, not the metric.</b> People need access to aggregates without access to underlying PII. Control at the metric, not the source."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "Every metric has <b>one row in the registry</b>: name, owner, grain, source, formula. No ambiguity, no branch variants, no 'revenue_final_FINAL'.",
      "Expose the metric layer as an <b>API</b>: let dashboards, notebooks, and external callers all resolve the same way. UI-only metric tools create dashboard/SQL mismatches.",
      "Treat metric changes as <b>breaking changes</b>. Version, announce, deprecate. Don't mutate a live formula.",
      "Audit every served answer with the <b>trace</b> (which metric, which filters, which source partitions). If you can't trace it, you don't ship it."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "The metrics layer is the <b>product surface</b> of your warehouse. Without it, a correct pipeline is wasted.",
      "Governance compounds. <b>A governed warehouse produces answers; an ungoverned one produces plausible fiction.</b>",
      "<b>One definition, one owner, one source.</b> That's the whole contract."
    ] }));
  }
  window.Ch7_Serve = Ch7_Serve;
})();
