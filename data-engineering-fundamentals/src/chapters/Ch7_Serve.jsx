/* global React, Hero, SectionLabel, AntiPatterns, BestPractices, Takeaway, Panel, MMNames */
const { useState, useEffect, useRef } = React;

/* ============================================================
 * Ch7 · Serve — Metrics layer & governed query trace
 * Ask a question → resolver walks the registry → composes SQL → executes.
 * Toggle "no metrics layer" to show the same question hit a deprecated
 * table with a missing column (the everyday failure mode of ad-hoc SQL).
 * ============================================================ */

const METRICS = {
  dau: {
    name: 'daily_active_users',
    owner: 'analytics_team',
    grain: 'user, day',
    source: 'events_daily',
    formula: 'COUNT(DISTINCT user_id) WHERE event_name IN ("open","login")',
  },
  revenue: {
    name: 'revenue_usd',
    owner: 'finance_team',
    grain: 'day, country',
    source: 'billable_impressions',
    formula: 'SUM(bid_price * 1e-6) WHERE billable = TRUE',
  },
  creators: {
    name: 'active_creators',
    owner: 'creators_data',
    grain: 'creator, day',
    source: 'creator_posts_daily',
    formula: 'COUNT(DISTINCT creator_id) WHERE posts >= 1',
  },
};

const QUESTIONS = [
  { q: 'DAU in US last week?', metric: 'dau', answer: '142.3M',    src: 'events_daily · 7-day avg · US', govOK: true },
  { q: 'Ad revenue yesterday?', metric: 'revenue', answer: '$89.4M', src: 'billable_impressions · 2026-04-19 · global', govOK: true },
  { q: 'Active creators this month?', metric: 'creators', answer: '2.14M', src: 'creator_posts_daily · 2026-04 MTD', govOK: true },
];

function sameBase() {
  return { status: 'idle', step: -1, log: [] };
}

function MetricsSim() {
  const [governed, setGoverned] = useState(true);
  const [question, setQuestion] = useState(QUESTIONS[0].q);
  const [run, setRun] = useState(sameBase());
  const [result, setResult] = useState(null);
  const timers = useRef([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => () => clearTimers(), []);

  const governedSteps = (q) => [
    { k: 'parse',    title: 'Parse intent', desc: 'question → metric lookup', ms: 500 },
    { k: 'resolve',  title: 'Resolve metric', desc: `Registry hit: ${METRICS[q.metric].name}`, ms: 700 },
    { k: 'bind',     title: 'Bind grain & filters', desc: 'time window · cohort · geo', ms: 650 },
    { k: 'compose',  title: 'Compose SQL', desc: 'from metric formula + filters', ms: 600 },
    { k: 'execute',  title: 'Execute on Presto', desc: 'read governed source', ms: 900 },
    { k: 'answer',   title: 'Return answer + lineage', desc: 'traceable to source rows', ms: 400 },
  ];

  const ungovernedSteps = () => [
    { k: 'parse',     title: 'Parse intent', desc: 'question → "find a relevant table"', ms: 500 },
    { k: 'search',    title: 'Search warehouse schema', desc: 'No registry: grep table names…', ms: 1000 },
    { k: 'guess',     title: 'Pick table by name match', desc: 'Chose "dau_v3_deprecated_2021"', ms: 800 },
    { k: 'wrongcol',  title: 'Reference columns from memory', desc: 'Wrote: user_cnt · daily_cnt', ms: 900, error: true },
    { k: 'execute',   title: 'Execute on Presto', desc: 'Column not found: abort', ms: 500, error: true },
  ];

  const renderSQL = (q) => {
    const m = METRICS[q.metric];
    return governed ?
`<span class="tok-c">-- auto-composed from metric registry · traceable</span>
<span class="tok-k">SELECT</span> <span class="tok-f">COUNT</span>(<span class="tok-k">DISTINCT</span> user_id) <span class="tok-k">AS</span> ${m.name}
<span class="tok-k">FROM</span> ${m.source}
<span class="tok-k">WHERE</span> ds <span class="tok-k">BETWEEN</span> <span class="tok-s">'&lt;DATEID-7&gt;'</span> <span class="tok-k">AND</span> <span class="tok-s">'&lt;DATEID&gt;'</span>
  <span class="tok-k">AND</span> country = <span class="tok-s">'US'</span>
  <span class="tok-k">AND</span> event_name <span class="tok-k">IN</span> (<span class="tok-s">'open'</span>, <span class="tok-s">'login'</span>);`
:
`<span class="tok-c">-- ad-hoc query · no metric registry · likely wrong</span>
<span class="tok-k">SELECT</span> <span class="tok-f">SUM</span>(user_cnt) <span class="tok-k">AS</span> total_users      <span class="tok-c">-- ↯ column doesn't exist</span>
<span class="tok-k">FROM</span> dau_v3_deprecated_2021                 <span class="tok-c">-- ↯ archived in 2022</span>
<span class="tok-k">WHERE</span> day <span class="tok-k">BETWEEN</span> <span class="tok-s">'last_week'</span> <span class="tok-k">AND</span> <span class="tok-f">NOW</span>(); <span class="tok-c">-- ↯ non-deterministic</span>`;
  };

  const runQuery = () => {
    clearTimers();
    setResult(null);
    const q = QUESTIONS.find(x => x.q === question) || QUESTIONS[0];
    const steps = governed ? governedSteps(q) : ungovernedSteps();

    setRun({ status: 'running', step: 0, log: [], steps });
    let elapsed = 0;
    steps.forEach((s, i) => {
      const t = setTimeout(() => {
        setRun(r => ({...r, step: i, log: [...r.log, s]}));
        if (i === steps.length - 1) {
          const t2 = setTimeout(() => {
            const errored = steps.some(x => x.error);
            setRun(r => ({...r, status: errored ? 'error' : 'done'}));
            setResult(errored
              ? { err: true, v: 'Query failed', src: 'ERROR: Column "user_cnt" cannot be resolved. Table "dau_v3_deprecated_2021" was archived 2022-08.' }
              : { err: false, v: q.answer, src: q.src });
          }, 350);
          timers.current.push(t2);
        }
      }, elapsed);
      timers.current.push(t);
      elapsed += s.ms;
    });
  };

  const q = QUESTIONS.find(x => x.q === question) || QUESTIONS[0];

  return (
    <Panel eyebrow="live simulator · metrics query"
           title="The same question: with and without a metrics layer"
           meta={governed ? 'governed' : 'ungoverned'}
           caption="Toggle the ungoverned switch. Same question, same warehouse. The difference is whether the consumer can find the right table by name or has to guess.">
      <div className="aa-question-row">
        <input className="aa-q-input" value={question} onChange={e => setQuestion(e.target.value)} list="aa-qs" placeholder="Ask about a metric…" />
        <datalist id="aa-qs">{QUESTIONS.map(x => <option key={x.q} value={x.q} />)}</datalist>
        <label className="aa-toggle">
          <input type="checkbox" checked={!governed} onChange={e => setGoverned(!e.target.checked)} />
          Disable metrics layer
        </label>
        <button className="btn btn-primary" onClick={runQuery} disabled={run.status === 'running'}>
          {run.status === 'running' ? '…running' : '▶ Run query'}
        </button>
      </div>

      <div className="aa-stages">
        <div className="aa-stage-col">
          <div className="aa-stage-head"><span>Query trace</span><span>{run.status}</span></div>
          <div className="aa-stage-body">
            {run.log.length === 0 && <div style={{padding:'40px 18px', textAlign:'center', color:'var(--fg-2)', fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.02em'}}>idle: press ▶ Run query</div>}
            {run.log.map((s, i) => {
              const cls = s.error ? 'error' : (i === run.step && run.status === 'running' ? 'active' : 'done');
              return (
                <div key={i} className={`aa-step ${cls}`}>
                  <div className="ico">{s.error ? '✕' : String(i+1)}</div>
                  <div>
                    <div className="title">{s.title}</div>
                    <div className="desc">{s.desc}</div>
                  </div>
                  <div className="time">{s.ms}ms</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="aa-stage-col dark">
          <div className="aa-yaml-head"><span>{governed ? 'generated · composed from registry' : 'ad-hoc · written by a hurried analyst'}</span><span>SQL</span></div>
          <pre className="aa-yaml" dangerouslySetInnerHTML={{__html: renderSQL(q)}} />
        </div>
      </div>

      {result && (
        <div className={`aa-answer ${result.err ? 'err' : ''}`}>
          <div className="lab">{result.err ? 'Execution failed' : 'Answer'}</div>
          <div className="v">{result.v}</div>
          <div className="src">{result.src}</div>
        </div>
      )}
    </Panel>
  );
}

function MetricsRegistry() {
  return (
    <div className="cards-3">
      {Object.values(METRICS).map(m => (
        <div key={m.name} className="ccard">
          <div className="ccard-t">{m.owner}</div>
          <div className="ccard-n">{m.name}</div>
          <div className="ccard-d" style={{fontFamily:'var(--font-mono)', fontSize:12}}>
            <div><b>grain:</b> {m.grain}</div>
            <div style={{marginTop:6}}><b>source:</b> <code>{m.source}</code></div>
            <div style={{marginTop:6}}><b>formula:</b></div>
            <div style={{marginTop:2, color:'var(--fg-2)'}}>{m.formula}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Ch7_Serve({ chapter }) {
  return (
    <>
      <Hero accent={chapter.hex}
            eyebrow={`Chapter ${chapter.n} · ${chapter.time}`}
            title="Serve: <span class='accent'>five teams.</span> Five DAU numbers. One meeting."
            hook="The warehouse has the right number. Nobody can agree what it is. Without a metrics layer, every team defines DAU in their dashboard SQL: independently, slightly differently, each plausible. You cannot reconcile them after the meeting. You can only prevent it before."
            meta={[
              { k: 'Contract', v: 'one definition per metric · forever' },
              { k: 'Owner', v: 'the team that produces the source' },
              { k: 'Surface', v: 'API · dashboards · notebooks' },
            ]} />

      <section className="section">
        <SectionLabel n="8.1">What a metrics layer actually is</SectionLabel>
        <h2 className="h2">Every metric, one canonical definition.</h2>
        <p className="prose">
          A metrics layer is a <strong>registry</strong>: every business metric: DAU, revenue, active
          creators: is declared once, with an owner, a grain, a source table, and a formula. Downstream
          consumers don't write SQL against raw tables; they ask for a metric by name, and the system
          composes the SQL, applies access controls, and returns a lineage-traceable answer.
        </p>
        <MetricsRegistry />
        <p className="prose" style={{marginTop: 18}}>
          This is also your <strong>access surface</strong>. Row-level security, PII masking, regional
          data residency: all enforced at the metrics layer, so every consumer (a viewer of a
          dashboard, an analyst in a notebook, a partner via API) gets the same guarantees.
        </p>
      </section>

      <section className="section">
        <SectionLabel n="8.2">The query story</SectionLabel>
        <h2 className="h2">Same question. Different warehouse.</h2>
        <p className="prose">
          Ask any analyst <em>"what was DAU in the US last week?"</em> Without a metrics layer, they
          search the warehouse for table names that look related, pick one based on intuition, and write
          ad-hoc SQL. Often they land on a table that looks current but was deprecated two years ago.
          Sometimes they reference column names from memory that have since been renamed.
          <strong> You cannot tell from the answer</strong>.
        </p>
        <p className="prose">
          With a metrics layer, the consumer's job is scoped: resolve the question to a registered metric,
          bind filters, compose SQL from the stored formula, execute against the <em>one</em> governed
          source. The answer is traceable to a row in a table that someone owns.
        </p>
        <MetricsSim />
      </section>

      <section className="section">
        <SectionLabel n="8.3">What the consumer actually sees</SectionLabel>
        <h2 className="h2">One metric, many surfaces.</h2>
        <p className="prose">
          The win of a single registry: the number on the CFO's deck, the number on the product
          dashboard, the number quoted in Slack, and the number you'd get by writing SQL
          yourself: <em>are all the same number</em>, because they all resolve through the same
          definition. Drift in any of these is a bug ticket, not an interpretation difference.
        </p>
        <div className="cards-2">
          <div className="ccard">
            <div className="ccard-t">Dashboards</div>
            <div className="ccard-n">Hex · Mode · Superset · Trino-backed</div>
            <div className="ccard-d">All read from the same metric. Refreshes are cheap because the compute is shared across viewers.</div>
          </div>
          <div className="ccard">
            <div className="ccard-t">Notebooks &amp; APIs</div>
            <div className="ccard-n">One resolver, many callers</div>
            <div className="ccard-d">Notebooks call the registry, not raw tables. External partners hit a metric API. Same definition, same numbers everywhere.</div>
          </div>
        </div>
      </section>

      <AntiPatterns items={[
        "<b>Defining DAU in five places.</b> Once in a dashboard SQL, once in a pipeline, once in an exec deck, once in Slack, once in a CSV. They will drift. They will be cited in the same meeting. You will not be there to defend any of them.",
        "<b>Letting consumers query raw tables with no governance.</b> Someone will find <code>dau_v3_backup_DO_NOT_USE</code> and quote it. You will not know.",
        "<b>Building a metrics layer without owners.</b> A metric with no owner is a metric that will go stale, then wrong, then cited in a launch review.",
        "<b>Access controls on the table, not the metric.</b> People need access to aggregates without access to underlying PII. Control at the metric, not the source.",
      ]} />

      <BestPractices items={[
        "Every metric has <b>one row in the registry</b>: name, owner, grain, source, formula. No ambiguity, no branch variants, no 'revenue_final_FINAL'.",
        "Expose the metric layer as an <b>API</b>: let dashboards, notebooks, and external callers all resolve the same way. UI-only metric tools create dashboard/SQL mismatches.",
        "Treat metric changes as <b>breaking changes</b>. Version, announce, deprecate. Don't mutate a live formula.",
        "Audit every served answer with the <b>trace</b> (which metric, which filters, which source partitions). If you can't trace it, you don't ship it.",
      ]} />

      <Takeaway items={[
        "The metrics layer is the <b>product surface</b> of your warehouse. Without it, a correct pipeline is wasted.",
        "Governance compounds. <b>A governed warehouse produces answers; an ungoverned one produces plausible fiction.</b>",
        "<b>One definition, one owner, one source.</b> That's the whole contract.",
      ]} />
    </>
  );
}

window.Ch7_Serve = Ch7_Serve;
