(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  const DAYS = 30;
  const CORRUPT_DAY = 17;
  const CHECKS = [
    { id: "rows", name: "Row-count band", desc: "\xB110% vs 7-day median", weight: 32, catches: "halfWrite" },
    { id: "schema", name: "Schema check", desc: "no null/new cols", weight: 22, catches: "schemaDrift" },
    { id: "fresh", name: "Freshness", desc: "landed \u2264 SLA", weight: 24, catches: "slaSlip" },
    { id: "unique", name: "Uniqueness", desc: "PK has no dupes", weight: 22, catches: "dupRows" }
  ];
  const CORRUPTIONS = {
    halfWrite: { label: "half-write (80% rows dropped)", tripsBy: "rows", wrongVal: 24.8 },
    schemaDrift: { label: "schema drift (new null column)", tripsBy: "schema", wrongVal: 0 },
    slaSlip: { label: "SLA slip (partition landed 3h late)", tripsBy: "fresh", wrongVal: 142.3 },
    // same number but stale
    dupRows: { label: "duplicate rows (idempotency bug)", tripsBy: "unique", wrongVal: 284.6 }
  };
  function TrustMeterSim({ reduceMotion, internalMode }) {
    const N = MMNames(internalMode);
    const [checks, setChecks] = useState({ rows: true, schema: true, fresh: true, unique: true });
    const [corrupt, setCorrupt] = useState(null);
    const [runDay, setRunDay] = useState(-1);
    const [results, setResults] = useState([]);
    const [status, setStatus] = useState("idle");
    const activeWeight = Object.entries(checks).filter(([, v]) => v).reduce((a, [k]) => a + (CHECKS.find((c) => c.id === k)?.weight || 0), 0);
    const trustPct = activeWeight;
    const [dashNumber, setDashNumber] = useState(142.3);
    const [dashState, setDashState] = useState("ok");
    const [oncallTicket, setOncallTicket] = useState(null);
    const toggle = (id) => setChecks((c) => ({ ...c, [id]: !c[id] }));
    const reset = () => {
      runTokenRef.current++;
      setRunDay(-1);
      setResults([]);
      setStatus("idle");
      setDashNumber(142.3);
      setDashState("ok");
      setOncallTicket(null);
    };
    const checksRef = useRef(checks);
    const corruptRef = useRef(corrupt);
    useEffect(() => {
      checksRef.current = checks;
    }, [checks]);
    useEffect(() => {
      corruptRef.current = corrupt;
    }, [corrupt]);
    const runTokenRef = useRef(0);
    const run = () => {
      runTokenRef.current++;
      const token = runTokenRef.current;
      setRunDay(-1);
      setResults([]);
      setStatus("running");
      setDashNumber(142.3);
      setDashState("ok");
      setOncallTicket(null);
      const useDelay = !reduceMotion && !document.hidden;
      const delay = useDelay ? 90 : 0;
      let d = 0;
      const step = () => {
        if (token !== runTokenRef.current) return;
        const checksNow = checksRef.current;
        const corruptNow = corruptRef.current;
        setRunDay(d);
        const isCorruptDay = corruptNow && d === CORRUPT_DAY;
        const corruption = isCorruptDay ? CORRUPTIONS[corruptNow] : null;
        const trippingCheck = corruption?.tripsBy;
        const caught = isCorruptDay && checksNow[trippingCheck];
        const ok = !isCorruptDay;
        setResults((r) => [...r, { day: d, ok, trippedBy: isCorruptDay ? trippingCheck : null, corrupt: isCorruptDay, caught }]);
        if (isCorruptDay) {
          if (caught) {
            setDashState("stale");
            setOncallTicket({
              id: "T" + Math.floor(17e5 + Math.random() * 99999),
              day: d + 1,
              reason: corruption.label + " \xB7 caught by " + CHECKS.find((c) => c.id === trippingCheck).name
            });
          } else {
            setDashNumber(corruption.wrongVal);
            setDashState(corruption.wrongVal === 142.3 ? "stale" : "wrong");
          }
        }
        d++;
        if (d >= DAYS) {
          setRunDay(-1);
          if (!corruptNow) setStatus("ok");
          else if (checksNow[CORRUPTIONS[corruptNow].tripsBy]) setStatus("stale");
          else setStatus("breach");
          return;
        }
        if (delay === 0) step();
        else setTimeout(step, delay);
      };
      step();
    };
    useEffect(() => () => {
      runTokenRef.current++;
    }, []);
    const needle = trustPct;
    const needleColor = trustPct >= 80 ? "var(--theme-green)" : trustPct >= 50 ? "#F7B928" : "var(--theme-red)";
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live simulator \xB7 data-quality gates",
        title: "Trust Meter",
        meta: `${Object.values(checks).filter(Boolean).length}/4 checks \xB7 ${corrupt ? "corruption: " + CORRUPTIONS[corrupt].label.split(" (")[0] : "clean"}`,
        caption: `Each check costs nothing to add and catches a whole class of bug. The ${N.dqOperator} pattern runs them post-write; downstream ${N.waitForSignal} waits on the signal table, not the data table.`
      },
      /* @__PURE__ */ React.createElement("div", { className: "tm-layout" }, /* @__PURE__ */ React.createElement("div", { className: "tm-checks" }, /* @__PURE__ */ React.createElement("div", { className: "tm-title" }, "Active checks"), CHECKS.map((c) => /* @__PURE__ */ React.createElement("label", { key: c.id, className: `tm-check ${checks[c.id] ? "on" : ""}` }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: checks[c.id], onChange: () => toggle(c.id) }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "n" }, c.name), /* @__PURE__ */ React.createElement("div", { className: "d" }, c.desc)), /* @__PURE__ */ React.createElement("div", { className: "w" }, "+", c.weight)))), /* @__PURE__ */ React.createElement("div", { className: "tm-meter" }, /* @__PURE__ */ React.createElement("div", { className: "tm-score-lab" }, "trust score"), /* @__PURE__ */ React.createElement("div", { className: "tm-score-big", style: { color: needleColor } }, needle, /* @__PURE__ */ React.createElement("span", { className: "tm-score-max" }, "/100")), /* @__PURE__ */ React.createElement("div", { className: `tm-verdict ${trustPct >= 80 ? "ok" : trustPct >= 50 ? "warn" : "bad"}` }, trustPct >= 80 ? "trusted" : trustPct >= 50 ? "at risk" : "untrusted"), /* @__PURE__ */ React.createElement("div", { className: "tm-bar" }, /* @__PURE__ */ React.createElement("div", { className: "tm-bar-track" }, /* @__PURE__ */ React.createElement("div", { className: "tm-bar-zone bad", style: { left: "0%", width: "50%" } }), /* @__PURE__ */ React.createElement("div", { className: "tm-bar-zone warn", style: { left: "50%", width: "30%" } }), /* @__PURE__ */ React.createElement("div", { className: "tm-bar-zone ok", style: { left: "80%", width: "20%" } }), /* @__PURE__ */ React.createElement("div", { className: "tm-bar-needle", style: { left: `${needle}%`, background: needleColor } })), /* @__PURE__ */ React.createElement("div", { className: "tm-bar-ticks" }, /* @__PURE__ */ React.createElement("span", null, "0"), /* @__PURE__ */ React.createElement("span", { style: { left: "50%" } }, "50"), /* @__PURE__ */ React.createElement("span", { style: { left: "80%" } }, "80"), /* @__PURE__ */ React.createElement("span", { style: { right: 0 } }, "100"))), /* @__PURE__ */ React.createElement("div", { className: "tm-breakdown" }, CHECKS.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, className: `tm-bd ${checks[c.id] ? "on" : "off"}` }, /* @__PURE__ */ React.createElement("span", { className: "tm-bd-dot" }), /* @__PURE__ */ React.createElement("span", { className: "tm-bd-n" }, c.name), /* @__PURE__ */ React.createElement("span", { className: "tm-bd-w" }, checks[c.id] ? `+${c.weight}` : "-"))))), /* @__PURE__ */ React.createElement("div", { className: "tm-impact" }, /* @__PURE__ */ React.createElement("div", { className: "tm-impact-head" }, /* @__PURE__ */ React.createElement("div", { className: "tm-impact-eyebrow" }, "downstream dashboard \xB7 what the analyst sees"), /* @__PURE__ */ React.createElement("div", { className: "tm-impact-title" }, "Exec Dashboard \xB7 DAU \xB7 US \xB7 7-day avg")), /* @__PURE__ */ React.createElement("div", { className: "tm-impact-grid" }, /* @__PURE__ */ React.createElement("div", { className: "tm-impact-cell tm-impact-expected" }, /* @__PURE__ */ React.createElement("div", { className: "lab" }, "Expected (truth)"), /* @__PURE__ */ React.createElement("div", { className: "big" }, "142.3", /* @__PURE__ */ React.createElement("span", null, "M")), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "if pipeline ran clean")), /* @__PURE__ */ React.createElement("div", { className: `tm-impact-arrow is-${dashState}` }, dashState === "ok" ? "\u2192" : dashState === "stale" ? "\u23F8" : "\u26A0"), /* @__PURE__ */ React.createElement("div", { className: `tm-impact-cell tm-impact-actual is-${dashState}` }, /* @__PURE__ */ React.createElement("div", { className: "lab" }, "Actual (what shipped)"), /* @__PURE__ */ React.createElement("div", { className: "big" }, dashNumber.toFixed(1), /* @__PURE__ */ React.createElement("span", null, "M")), /* @__PURE__ */ React.createElement("div", { className: "sub" }, dashState === "wrong" && (() => {
        const pct = Math.abs((dashNumber - 142.3) / 142.3 * 100).toFixed(0);
        const diff = Math.round(Math.abs(dashNumber - 142.3));
        const dir = dashNumber > 142.3 ? `${diff}M extra` : `${diff}M missing`;
        return `wrong by ${pct}% \xB7 ${dir}`;
      })(), dashState === "stale" && "3-day-old data \xB7 signal blocked upstream", dashState === "ok" && status === "ok" && "matches expected \xB7 all checks passed", dashState === "ok" && status !== "ok" && "idle \xB7 run the simulation to see impact"))), dashState === "wrong" && /* @__PURE__ */ React.createElement("div", { className: "tm-impact-banner err" }, "\u26A0 Anomaly detected (T+3d) \xB7 wrong number already cited in exec review"), dashState === "stale" && /* @__PURE__ */ React.createElement("div", { className: "tm-impact-banner warn" }, "\u23F8 Signal table never landed \xB7 downstream consumers wait or read stale"), dashState === "ok" && status === "ok" && /* @__PURE__ */ React.createElement("div", { className: "tm-impact-banner ok" }, "\u2713 All 30 days clean \xB7 SLA met \xB7 signal landed on-time"), oncallTicket && /* @__PURE__ */ React.createElement("div", { className: "tm-ticket" }, /* @__PURE__ */ React.createElement("div", { className: "ti-k" }, "ONCALL AUTO-CREATED"), /* @__PURE__ */ React.createElement("div", { className: "ti-id" }, "#", oncallTicket.id), /* @__PURE__ */ React.createElement("div", { className: "ti-d" }, "day ", oncallTicket.day, " \xB7 ", oncallTicket.reason, " \xB7 routed to de_oncall")))),
      /* @__PURE__ */ React.createElement("div", { className: "tm-timeline" }, /* @__PURE__ */ React.createElement("div", { className: "tm-timeline-lab" }, "30-day run history"), /* @__PURE__ */ React.createElement("div", { className: "tm-days" }, Array.from({ length: DAYS }, (_, i) => {
        const r = results[i];
        const isRunning = runDay === i;
        const isCorrupt = corrupt && i === CORRUPT_DAY;
        let cls = "tm-day";
        if (isRunning) cls += " running";
        else if (r) {
          if (r.ok) cls += " ok";
          else if (r.caught) cls += " caught";
          else cls += " fail";
        } else cls += " pending";
        if (isCorrupt) cls += " corrupt-mark";
        return /* @__PURE__ */ React.createElement("div", { key: i, className: cls, title: `Day ${i + 1}${r ? r.ok ? " \xB7 pass" : r.caught ? ` \xB7 CAUGHT (${r.trippedBy})` : ` \xB7 BREACH (${r.trippedBy})` : ""}${isCorrupt ? " \xB7 corruption armed here" : ""}` }, isCorrupt && /* @__PURE__ */ React.createElement("span", { className: "mark" }, "!"));
      })), /* @__PURE__ */ React.createElement("div", { className: "tm-timeline-legend" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { className: "sw pending" }), " pending"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { className: "sw ok" }), " pass"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { className: "sw caught" }), " caught"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { className: "sw fail" }), " breach"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { className: "sw corrupt-mark" }), " corruption at day ", CORRUPT_DAY + 1))),
      /* @__PURE__ */ React.createElement("div", { className: "ctl-row" }, /* @__PURE__ */ React.createElement("div", { className: "tm-corr-picker" }, /* @__PURE__ */ React.createElement("span", { className: "tm-corr-lab" }, "Inject at day ", CORRUPT_DAY + 1, ":"), /* @__PURE__ */ React.createElement("button", { className: `tm-corr ${!corrupt ? "on" : ""}`, onClick: () => setCorrupt(null) }, "none"), Object.entries(CORRUPTIONS).map(([id, c]) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: id,
          className: `tm-corr ${corrupt === id ? "on" : ""}`,
          onClick: () => setCorrupt(id),
          title: `caught only by "${CHECKS.find((x) => x.id === c.tripsBy).name}"`
        },
        c.label.split(" (")[0]
      ))), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: run }, "\u25B6 Run 30 days"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: reset }, "Reset"), /* @__PURE__ */ React.createElement("div", { style: { marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" } }, status === "breach" && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--theme-red)" } }, "\u2715 Corrupt data shipped: gate was off"), status === "stale" && /* @__PURE__ */ React.createElement("span", { style: { color: "#8B5C00" } }, "\u2713 Gate held: signal never landed, oncall notified"), status === "ok" && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--theme-green)" } }, "\u2713 Clean run \xB7 30/30")))
    );
  }
  function Ch5_Quality({ chapter, internalMode, reduceMotion }) {
    const N = MMNames(internalMode);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.ink,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: `Quality: a pipeline that <span class='accent'>ran</span> is not a pipeline that's <span class='accent'>right</span>.`,
        hook: `The hardest failures to catch are the ones that succeed. The task returns zero, writes a tiny partition, lands on time, and the number on the CFO's deck is wrong. Data-quality gates turn "the pipeline ran" into "the number is trustworthy." That's the contract the rest of the warehouse depends on.`,
        meta: [
          { k: "Primitive", v: N.dqOperator },
          { k: "Barrier", v: `signal table + ${N.waitForSignal}` },
          { k: "Tiers", v: "6h \xB7 24h \xB7 48h SLA" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "6.1" }, "Checks are cheap, bugs are expensive"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Four checks that catch 80% of data-incident tickets."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, /* @__PURE__ */ React.createElement("b", null, "Row-count band:"), " today's row count must sit within \xB110% of the trailing 7-day median. Catches empty writes, half-writes, upstream source outages.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("b", null, "Schema check:"), " no new nullable column, no type drift. Catches producer schema bumps that silently break downstream joins.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("b", null, "Freshness:"), " partition landed before the SLA. Catches slipped pipelines before a dashboard user notices.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("b", null, "Uniqueness:"), " primary-key has no duplicates. Catches idempotency bugs (see Ch5) before they corrupt a fact table."), /* @__PURE__ */ React.createElement(TrustMeterSim, { internalMode, reduceMotion })), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "6.2" }, "The signal-table barrier"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Downstream waits on the signal, never on the data."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A DQ check that ", /* @__PURE__ */ React.createElement("em", null, "runs after the data lands"), " but ", /* @__PURE__ */ React.createElement("em", null, "before anyone reads it"), " is the barrier. When the check passes, the pipeline writes a tiny row to a ", /* @__PURE__ */ React.createElement("strong", null, "signal table"), ". Every downstream consumer uses ", /* @__PURE__ */ React.createElement("code", null, N.waitForSignal), " to block on that signal: not on the data table itself. If the check fails, the signal never lands, downstreams wait, and oncall is auto-paged with an SLA-tier-aware ticket."), /* @__PURE__ */ React.createElement("div", { className: "cards-2" }, /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, "Without the barrier"), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Downstream waits on the data table"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "Partial or corrupt data is readable the moment the write commits. A retry is too late: consumers already ran.")), /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, "With the barrier"), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Downstream waits on the signal table"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "Data exists but is invisible until the signal lands. Failures hold the line; oncall wakes up before a consumer hits a bad number.")))), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "6.3" }, "The operator"), /* @__PURE__ */ React.createElement("div", { className: "code" }, /* @__PURE__ */ React.createElement("div", { className: "code-head" }, /* @__PURE__ */ React.createElement("span", null, "pipeline.py \xB7 ", N.dqOperator, " + ", N.waitForSignal), /* @__PURE__ */ React.createElement("span", { className: "lang" }, "Python")), /* @__PURE__ */ React.createElement("div", { className: "code-body", dangerouslySetInnerHTML: {
      __html: `<span class="tok-c"># 1) Write the partition (idempotent, see Ch5)</span>
<span class="tok-f">InsertOverwriteOperator</span>(
    table=<span class="tok-s">"fct_dau"</span>,
    partition=<span class="tok-s">"&lt;DATEID&gt;"</span>,
    sla_tier=<span class="tok-s">"24h"</span>,                          <span class="tok-c"># routes to the right oncall</span>
)

<span class="tok-c"># 2) Gate it: DQ runs, then the signal table lands</span>
<span class="tok-f">${N.dqOperator}</span>(
    table=<span class="tok-s">"fct_dau"</span>,
    checks=[
        <span class="tok-f">RowCountBand</span>(band=<span class="tok-n">0.10</span>),           <span class="tok-c"># \xB110% vs 7-day median</span>
        <span class="tok-f">SchemaMatch</span>(ref=<span class="tok-s">"fct_dau.contract"</span>),
        <span class="tok-f">Freshness</span>(max_lag=<span class="tok-s">"PT6H"</span>),
        <span class="tok-f">Unique</span>(columns=[<span class="tok-s">"event_id"</span>]),
    ],
    max_rows_expected=<span class="tok-n">500_000_000</span>,
)

<span class="tok-c"># 3) Every downstream waits on the SIGNAL, not the data table.</span>
<span class="tok-f">${N.waitForSignal}</span>(
    signal_table=<span class="tok-s">"fct_dau__signal"</span>,
    partition=<span class="tok-s">"&lt;DATEID&gt;"</span>,
)`
    } }))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      `<b>"We'll add DQ later."</b> You won't. The pipeline will ship, the first bad day will hit, someone will chase it manually for a week. Add DQ before the first ship, or ship without the pipeline.`,
      `<b>Waiting on the data table instead of the signal table.</b> This is the most common subtle bug in new pipelines. Partial writes look complete. Downstream reads too early. Use ${N.waitForSignal}.`,
      "<b>No SLA tier tag.</b> A task that slips silently at 04:00 and pages no one until someone notices at 14:00 is not a 6h-SLA task. Tag the tier; oncall routing depends on it.",
      "<b>Catch-all <code>assert len(df) > 0</code>.</b> It passes when the pipeline writes one row on an outage. Use row-count bands, not sanity asserts."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "<b>Every fact table</b> gets row-count band + freshness + uniqueness, minimum. Dimension tables add schema-match.",
      "<b>Signal tables are first-class citizens.</b> Name them <code>&lt;table&gt;__signal</code>. They outlive the pipeline: replays, backfills, and audits all read them.",
      `<b>SLA-tier your tasks.</b> 6h for ads/exec-deck inputs, 24h for most facts, 48h for discovery/rollups. The tier is the pager contract.`,
      "<b>DQ config in version control, not UI.</b> Checks drift; code reviews catch drift; dashboards don't."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>DQ is the contract.</b> It is the difference between data engineering and data plumbing.",
      `<b>Four checks, four bugs avoided.</b> Row-count, schema, freshness, uniqueness. Every fact table. Every day.`,
      `<b>Wait on the signal.</b> If you remember one word from this chapter, make it <em>signal</em>.`
    ] }));
  }
  window.Ch5_Quality = Ch5_Quality;
})();
