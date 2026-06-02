(() => {
  const { useState, useEffect, useRef } = React;
  const DISC_QUESTIONS = [
    {
      q: "Who owns <b>dim_users</b>?",
      hint: "You need owner \xB7 contact \xB7 oncall",
      shortcut: "ht dim_users",
      accept: /^\s*ht\s+dim_users\s*$/i,
      tip: 'The "home table" shortcut is <code>ht</code>. Pass it the table name: <code>ht &lt;table&gt;</code>.',
      why: '<code>ht</code> ("home table") returns the metadata page for a single table: owner, partition, freshness, schema. It is the fastest way to confirm "is this the right table?"',
      result: {
        kind: "ht",
        title: "dim_users",
        rows: [
          { k: "owner", v: "analytics_oncall" },
          { k: "partition", v: "ds=YYYY-MM-DD" },
          { k: "rows/day", v: "12.4M" },
          { k: "sla", v: "24h" }
        ],
        schema: ["user_id : STRING", "account_id : STRING", "event_type : INT", "user_email : STRING", "ds : STRING"]
      }
    },
    {
      q: "Which job writes <b>fct_events</b>?",
      hint: "Find the producing pipeline",
      shortcut: "fpl fct_events",
      accept: /^\s*fpl\s+fct_events\s*$/i,
      tip: 'The "find pipeline" shortcut is <code>fpl</code>. Pass it the table whose producer you want: <code>fpl &lt;table&gt;</code>.',
      why: '<code>fpl</code> ("find pipeline") jumps from a table to the job that writes it: cadence, reader, oncall. Use this when a number looks wrong and you need to page someone.',
      result: {
        kind: "fpl",
        title: "Pipeline producing fct_events",
        rows: [
          { k: "job", v: "analytics.events_rollup" },
          { k: "cadence", v: "daily @ 04:00" },
          { k: "reader", v: "page_events_raw" },
          { k: "owner", v: "de_oncall" }
        ]
      }
    },
    {
      q: "Find the UDF that parses <b>CIDR ranges</b>.",
      hint: "Search the UDF catalog",
      shortcut: "udf cidr_parse",
      accept: /^\s*udf\s+\S+/i,
      tip: "The UDF-catalog shortcut is <code>udf</code>. Try a likely symbolic name: <code>udf cidr_parse</code> or <code>udf parse_cidr</code>.",
      why: "<code>udf &lt;name&gt;</code> looks up the UDF catalog by symbolic name. The catalog tells you who maintains the function and how often it is called \u2014 both matter before you take a runtime dependency.",
      result: {
        kind: "udf",
        title: "cidr_parse(STRING cidr) \u2192 STRUCT<net, mask, first, last>",
        rows: [
          { k: "owner", v: "netops_de" },
          { k: "lang", v: "Spark SQL" },
          { k: "calls/day", v: "240k" }
        ]
      }
    },
    {
      q: `What's a <b>dataset_acl</b>?`,
      hint: "Look it up in the glossary",
      shortcut: "wut dataset_acl",
      accept: /^\s*wut\s+\S+/i,
      tip: 'The glossary shortcut is <code>wut</code> ("what is this thing"). Pass the term: <code>wut &lt;term&gt;</code>.',
      why: '<code>wut &lt;term&gt;</code> ("what is this thing") hits the glossary. Use it when you see an unfamiliar acronym in a Slack thread or a YAML file \u2014 three keystrokes saves you a tab into the wiki.',
      result: {
        kind: "wut",
        title: "dataset_acl",
        body: "Per-project access-control list. Scopes which engineers can read/write a dataset. Paired with actor annotations (Canonical_*) that tag the PII/identity nature of columns. Enforced at deploy by the Access Gateway."
      }
    },
    {
      q: "Show <b>downstream consumers</b> of dim_accounts.",
      hint: "Walk one hop down the lineage",
      shortcut: "ds produce dim_accounts",
      accept: /^\s*ds\s+produce\s+\S+/i,
      tip: "The lineage shortcut is <code>ds</code>, with a <code>produce</code> subcommand for downstream: <code>ds produce &lt;table&gt;</code>.",
      why: "<code>ds produce &lt;table&gt;</code> walks one hop downstream: which facts, dimensions, metrics, and dashboards read this table. Always check this before deprecating or schema-changing \u2014 it tells you who you are about to break.",
      result: {
        kind: "lineage",
        title: "dim_accounts \xB7 downstream (1 hop)",
        children: [
          { name: "fct_logins", owner: "auth_de", kind: "fact" },
          { name: "dim_account_geo", owner: "geo_de", kind: "dim" },
          { name: "metric:mau_daily", owner: "analytics_team", kind: "metric" },
          { name: "dash:exec_weekly", owner: "analytics_team", kind: "dash" }
        ]
      }
    }
  ];
  const BASELINE_TIMES = [
    { name: "adrian \xB7 sr_de", t: 42 },
    { name: "priya \xB7 de_oncall", t: 58 },
    { name: "code-spelunker", t: 247 }
  ];
  const TIP_PENALTY = 2;
  const SOLUTION_PENALTY = 5;
  function DiscoverySpeedrun({ reduceMotion, internalMode }) {
    const N = MMNames(internalMode);
    const [phase, setPhase] = useState("intro");
    const [qIdx, setQIdx] = useState(0);
    const [inputVal, setInputVal] = useState("");
    const [t0, setT0] = useState(null);
    const [now, setNow] = useState(0);
    const [penalty, setPenalty] = useState(0);
    const [results, setResults] = useState([]);
    const [flash, setFlash] = useState(null);
    const [tipShown, setTipShown] = useState(false);
    const [solutionShown, setSolutionShown] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => {
      if (phase !== "playing" || !t0) return;
      const id = setInterval(() => setNow(Date.now()), 60);
      return () => clearInterval(id);
    }, [phase, t0]);
    const elapsed = phase === "playing" && t0 ? (now - t0) / 1e3 + penalty : 0;
    const start = () => {
      setPhase("playing");
      setQIdx(0);
      setInputVal("");
      setResults([]);
      setPenalty(0);
      setTipShown(false);
      setSolutionShown(false);
      setT0(Date.now());
      setNow(Date.now());
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    const advance = (entry) => {
      setResults((r) => [...r, entry]);
      if (qIdx === DISC_QUESTIONS.length - 1) {
        setPhase("done");
      } else {
        setQIdx((i) => i + 1);
        setInputVal("");
        setTipShown(false);
        setSolutionShown(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    const submit = (e) => {
      e?.preventDefault();
      const q2 = DISC_QUESTIONS[qIdx];
      if (q2.accept.test(inputVal)) {
        setFlash("ok");
        setTimeout(() => setFlash(null), 400);
        advance({ q: q2, input: inputVal, correct: true });
      } else {
        setFlash("err");
        setPenalty((p) => p + 3);
        setTimeout(() => setFlash(null), 450);
      }
    };
    const showTip = () => {
      if (tipShown) return;
      setTipShown(true);
      setPenalty((p) => p + TIP_PENALTY);
    };
    const showSolution = () => {
      if (solutionShown) return;
      setSolutionShown(true);
      setPenalty((p) => p + SOLUTION_PENALTY);
    };
    const fillSolution = () => {
      const q2 = DISC_QUESTIONS[qIdx];
      setInputVal(q2.shortcut);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    if (phase === "intro") {
      return /* @__PURE__ */ React.createElement(
        Panel,
        {
          eyebrow: "timed \xB7 5 questions \xB7 6 shortcuts",
          title: "Discovery Speedrun",
          meta: "practice round",
          caption: `You don't read code to find a table's owner. You type one of six shortcuts into ${N.palette} and get the answer in 200ms. Beat the baselines.`
        },
        /* @__PURE__ */ React.createElement("div", { className: "ds-intro" }, /* @__PURE__ */ React.createElement("div", { className: "ds-intro-grid" }, [
          { s: "ht <table>", w: "table home: owner, schema, freshness" },
          { s: "fpl <table>", w: "producing pipeline \xB7 cadence \xB7 oncall" },
          { s: "ds produce <table>", w: "downstream consumers \xB7 one hop" },
          { s: "qbgs <term>", w: "search the warehouse by keyword" },
          { s: "udf <name>", w: "UDF catalog lookup" },
          { s: "wut <term>", w: "glossary: what IS this thing" }
        ].map((x) => /* @__PURE__ */ React.createElement("div", { key: x.s, className: "ds-shortcut-card" }, /* @__PURE__ */ React.createElement("code", null, x.s), /* @__PURE__ */ React.createElement("div", { className: "w" }, x.w)))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 20 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary btn-lg", onClick: start }, "\u25B6 Start speedrun")))
      );
    }
    if (phase === "done") {
      const final = (Date.now() - t0) / 1e3 + penalty;
      const solvedCount = results.filter((r) => r.correct).length;
      const revealedCount = results.filter((r) => r.revealed).length;
      const board = [...BASELINE_TIMES, { name: "you", t: final, you: true }].sort((a, b) => a.t - b.t);
      return /* @__PURE__ */ React.createElement(
        Panel,
        {
          eyebrow: "run complete",
          title: `Finished in ${final.toFixed(1)}s`,
          meta: `${solvedCount}/${DISC_QUESTIONS.length} solved${revealedCount ? ` \xB7 ${revealedCount} revealed` : ""} \xB7 +${penalty}s penalty`,
          caption: "How you compare to the baselines."
        },
        /* @__PURE__ */ React.createElement("div", { className: "ds-leaderboard" }, board.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `ds-lb-row ${r.you ? "you" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "rank" }, "#", i + 1), /* @__PURE__ */ React.createElement("div", { className: "name" }, r.name), /* @__PURE__ */ React.createElement("div", { className: "time" }, r.t.toFixed(1), "s")))),
        /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 18 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: start }, "\u21BB Replay"))
      );
    }
    const q = DISC_QUESTIONS[qIdx];
    const lastOk = results[results.length - 1];
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: `question ${qIdx + 1} of ${DISC_QUESTIONS.length}`,
        title: "Discovery Speedrun",
        meta: `elapsed \xB7 ${elapsed.toFixed(1)}s \xB7 penalty +${penalty}s`,
        caption: "Type the shortcut \xB7 Enter to submit \xB7 Tip & Show solution available"
      },
      /* @__PURE__ */ React.createElement("div", { className: `ds-terminal ${flash ? "flash-" + flash : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "ds-term-head" }, /* @__PURE__ */ React.createElement("span", { className: "t" }, N.palette, "@warehouse"), /* @__PURE__ */ React.createElement("span", { className: "clk" }, /* @__PURE__ */ React.createElement("span", { className: "d" }, "\u25CF"), /* @__PURE__ */ React.createElement("span", { className: "d y" }, "\u25CF"), /* @__PURE__ */ React.createElement("span", { className: "d g" }, "\u25CF"))), /* @__PURE__ */ React.createElement("div", { className: "ds-term-body" }, /* @__PURE__ */ React.createElement("div", { className: "ds-q" }, /* @__PURE__ */ React.createElement("span", { className: "q-lab" }, "Q:"), /* @__PURE__ */ React.createElement("span", { className: "q-t", dangerouslySetInnerHTML: { __html: q.q } })), /* @__PURE__ */ React.createElement("div", { className: "ds-hint" }, "\u25B9 ", q.hint), /* @__PURE__ */ React.createElement("form", { className: "ds-prompt", onSubmit: submit }, /* @__PURE__ */ React.createElement("span", { className: "p" }, "$"), /* @__PURE__ */ React.createElement(
        "input",
        {
          ref: inputRef,
          value: inputVal,
          onChange: (e) => setInputVal(e.target.value),
          placeholder: "type a shortcut\u2026",
          autoComplete: "off",
          spellCheck: "false"
        }
      ), /* @__PURE__ */ React.createElement("kbd", null, "\u21B5")), /* @__PURE__ */ React.createElement("div", { className: "ds-help-row" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "ds-help-btn is-tip",
          onClick: showTip,
          disabled: tipShown,
          title: "Reveal a small nudge toward the right shortcut"
        },
        "\u25B9 ",
        tipShown ? "Tip shown" : "Show tip",
        " ",
        /* @__PURE__ */ React.createElement("span", { className: "cost" }, "+", TIP_PENALTY, "s")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "ds-help-btn is-solution",
          onClick: showSolution,
          disabled: solutionShown,
          title: "Reveal the canonical answer"
        },
        "\u2605 ",
        solutionShown ? "Solution shown" : "Show solution",
        " ",
        /* @__PURE__ */ React.createElement("span", { className: "cost" }, "+", SOLUTION_PENALTY, "s")
      )), tipShown && /* @__PURE__ */ React.createElement("div", { className: "ds-tip-banner" }, /* @__PURE__ */ React.createElement("strong", null, "Tip:"), " ", /* @__PURE__ */ React.createElement("span", { dangerouslySetInnerHTML: { __html: q.tip } })), solutionShown && /* @__PURE__ */ React.createElement("div", { className: "ds-solution-banner" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Solution"), /* @__PURE__ */ React.createElement("code", null, q.shortcut), q.why && /* @__PURE__ */ React.createElement("span", { className: "why", dangerouslySetInnerHTML: { __html: q.why } }), /* @__PURE__ */ React.createElement("div", { className: "ds-solution-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "ds-help-btn", onClick: fillSolution }, "\u21B3 Fill input"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "ds-help-btn", onClick: () => {
        advance({ q, input: q.shortcut, correct: false, revealed: true });
      } }, "\u2192 Skip to next")))), flash === "err" && /* @__PURE__ */ React.createElement("div", { className: "ds-toast err" }, "\u2715 wrong shortcut \xB7 +3s")),
      lastOk && /* @__PURE__ */ React.createElement("div", { className: `ds-result ${lastOk.revealed ? "is-revealed" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "ds-result-head" }, lastOk.revealed ? "\u21B3 revealed" : "\u2713 answered", " \xB7 ", lastOk.q.result.title), lastOk.q.result.rows && /* @__PURE__ */ React.createElement("div", { className: "ds-result-rows" }, lastOk.q.result.rows.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "ds-row" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, r.k), /* @__PURE__ */ React.createElement("span", { className: "v" }, r.v)))), lastOk.q.result.schema && /* @__PURE__ */ React.createElement("div", { className: "ds-schema" }, lastOk.q.result.schema.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "ds-schema-row" }, s))), lastOk.q.result.body && /* @__PURE__ */ React.createElement("div", { className: "ds-result-body" }, lastOk.q.result.body), lastOk.q.result.children && /* @__PURE__ */ React.createElement("div", { className: "ds-lineage-mini" }, /* @__PURE__ */ React.createElement("div", { className: "ds-lineage-root" }, lastOk.q.result.title.split(" \xB7 ")[0]), /* @__PURE__ */ React.createElement("div", { className: "ds-lineage-fan" }, lastOk.q.result.children.map((c, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `ds-lineage-leaf k-${c.kind}` }, /* @__PURE__ */ React.createElement("div", { className: "n" }, c.name), /* @__PURE__ */ React.createElement("div", { className: "o" }, c.owner)))))),
      /* @__PURE__ */ React.createElement("div", { className: "ds-progress" }, DISC_QUESTIONS.map((_, i) => /* @__PURE__ */ React.createElement("span", { key: i, className: `ds-prog-dot ${i < qIdx ? "done" : i === qIdx ? "active" : ""}` }, i + 1)))
    );
  }
  function LineageCamera({ internalMode }) {
    const N = MMNames(internalMode);
    const [focus, setFocus] = useState("fct_events");
    const nodes = {
      "raw_scans": { x: 90, y: 80, kind: "source", label: "raw_scans" },
      "raw_accounts": { x: 90, y: 180, kind: "source", label: "raw_accounts" },
      "raw_pageviews": { x: 90, y: 280, kind: "source", label: "raw_pageviews" },
      "fct_events": { x: 380, y: 140, kind: "etl", label: "fct_events" },
      "dim_users": { x: 380, y: 240, kind: "etl", label: "dim_users" },
      "metric:conversion": { x: 680, y: 80, kind: "metric", label: "conversion_rate" },
      "metric:dau_7d": { x: 680, y: 180, kind: "metric", label: "dau_7d" },
      "dash:weekly_exec": { x: 680, y: 280, kind: "dash", label: "weekly_exec_dash" }
    };
    const edges = [
      ["raw_scans", "fct_events"],
      ["raw_accounts", "fct_events"],
      ["raw_accounts", "dim_users"],
      ["raw_pageviews", "dim_users"],
      ["fct_events", "metric:conversion"],
      ["fct_events", "metric:dau_7d"],
      ["dim_users", "metric:dau_7d"],
      ["fct_events", "dash:weekly_exec"]
    ];
    const highlighted = /* @__PURE__ */ new Set([focus]);
    edges.forEach(([a, b]) => {
      if (a === focus) highlighted.add(b);
      if (b === focus) highlighted.add(a);
    });
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "bonus sim \xB7 lineage camera",
        title: `Lineage of ${focus}`,
        meta: "click a node to pan",
        caption: `${N.open_lineage}/${N.datahub} serves the same graph. Click any node; the camera re-focuses and fades unrelated edges.`
      },
      /* @__PURE__ */ React.createElement("div", { className: "lc-stage" }, /* @__PURE__ */ React.createElement(
        "svg",
        {
          viewBox: "0 0 800 360",
          preserveAspectRatio: "xMidYMid meet",
          style: { width: "100%", display: "block", userSelect: "none" }
        },
        /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("marker", { id: "lc-arr", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto" }, /* @__PURE__ */ React.createElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--theme-gray-400)" }))),
        edges.map(([a, b], i) => {
          const n1 = nodes[a], n2 = nodes[b];
          const on = highlighted.has(a) && highlighted.has(b);
          return /* @__PURE__ */ React.createElement(
            "line",
            {
              key: i,
              x1: n1.x + 62,
              y1: n1.y,
              x2: n2.x - 62,
              y2: n2.y,
              stroke: on ? "var(--theme-blue)" : "var(--theme-gray-200)",
              strokeWidth: on ? 2 : 1,
              markerEnd: "url(#lc-arr)",
              opacity: on ? 1 : 0.35,
              style: { transition: "opacity 280ms cubic-bezier(0.32,0.72,0,1), stroke 280ms cubic-bezier(0.32,0.72,0,1), stroke-width 280ms cubic-bezier(0.32,0.72,0,1)" }
            }
          );
        }),
        Object.entries(nodes).map(([id, n]) => {
          const on = highlighted.has(id);
          const isFocus = id === focus;
          const fill = n.kind === "source" ? "#FFFBF2" : n.kind === "metric" ? "#F4FBF5" : n.kind === "dash" ? "#F3F8FF" : "#fff";
          const stroke = isFocus ? "var(--theme-blue)" : n.kind === "source" ? "#F7B928" : n.kind === "metric" ? "var(--theme-green)" : n.kind === "dash" ? "var(--theme-blue)" : "var(--theme-gray-300)";
          return /* @__PURE__ */ React.createElement(
            "g",
            {
              key: id,
              style: { cursor: "pointer", opacity: on ? 1 : 0.4, transition: "opacity 280ms cubic-bezier(0.32,0.72,0,1)" },
              onClick: () => setFocus(id)
            },
            /* @__PURE__ */ React.createElement(
              "rect",
              {
                x: n.x - 62,
                y: n.y - 22,
                width: 124,
                height: 46,
                rx: 9,
                fill,
                stroke,
                strokeWidth: isFocus ? 2.5 : 1.5
              }
            ),
            /* @__PURE__ */ React.createElement("text", { x: n.x, y: n.y - 2, textAnchor: "middle", style: { fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, fill: "var(--fg-1)" } }, n.label),
            /* @__PURE__ */ React.createElement("text", { x: n.x, y: n.y + 13, textAnchor: "middle", style: { fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--fg-2)", letterSpacing: "0.1em", textTransform: "uppercase" } }, n.kind)
          );
        })
      ))
    );
  }
  function Ch6_Discover({ chapter, internalMode, reduceMotion }) {
    const N = MMNames(internalMode);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.ink,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: `Discover: <span class='accent'>six shortcuts</span> replace four hours of code spelunking.`,
        hook: `A consumer's first question is always the same: "is this the right table?" The answer should be instant. ${N.palette} shortcuts, ${N.datasetspec} metadata files, and ${N.open_lineage} lineage turn <em>hours of Snowflake code archaeology</em> into <em>three-character commands</em>. Learn the six and you are faster than 90% of the org.`,
        meta: [
          { k: "Glossary", v: `${N.palette} + wut` },
          { k: "Metadata", v: N.datasetspec },
          { k: "Lineage", v: `${N.open_lineage} / ${N.datahub}` }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "7.1" }, "The six shortcuts"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Memorize these before writing a single SQL query."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Before you write a query, you need to know three things: ", /* @__PURE__ */ React.createElement("em", null, "is this the right table"), ",", /* @__PURE__ */ React.createElement("em", null, " who owns it"), ", and ", /* @__PURE__ */ React.createElement("em", null, "is it deprecated"), ". The shortcuts get you all three in under three seconds each. ", /* @__PURE__ */ React.createElement("code", null, "ht"), ' answers "is this it?" ', /* @__PURE__ */ React.createElement("code", null, "fpl"), ' answers "who writes it?" ', /* @__PURE__ */ React.createElement("code", null, "ds produce"), ' answers "who consumes it?" ', /* @__PURE__ */ React.createElement("code", null, "qbgs"), " searches. ", /* @__PURE__ */ React.createElement("code", null, "udf"), "finds a function. ", /* @__PURE__ */ React.createElement("code", null, "wut"), " defines a term. That's the whole kit."), /* @__PURE__ */ React.createElement(DiscoverySpeedrun, { internalMode, reduceMotion })), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "7.2" }, "The metadata file"), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "The reason the shortcuts work is that every dataset ships a ", /* @__PURE__ */ React.createElement("strong", null, N.datasetspec), " file in the same repo as its pipeline code. Columns have descriptions, owners, and actor annotations (see Ch9). The warehouse, the lineage graph, and the metrics layer all read from the same file, so there's one source of truth."), /* @__PURE__ */ React.createElement("div", { className: "code" }, /* @__PURE__ */ React.createElement("div", { className: "code-head" }, /* @__PURE__ */ React.createElement("span", null, "dim_users.spec.yaml \xB7 dataset metadata"), /* @__PURE__ */ React.createElement("span", { className: "lang" }, "YAML")), /* @__PURE__ */ React.createElement("div", { className: "code-body", dangerouslySetInnerHTML: {
      __html: `<span class="tok-k">dataset</span>: <span class="tok-s">dim_users</span>
<span class="tok-k">owner</span>: <span class="tok-s">analytics_oncall</span>
<span class="tok-k">sla_tier</span>: <span class="tok-s">"24h"</span>
<span class="tok-k">partition</span>: <span class="tok-s">ds</span>
<span class="tok-k">description</span>: |
  Dimension table for all active user accounts and their current
  activity posture. One row per (user_id, ds).

<span class="tok-k">columns</span>:
  <span class="tok-k">- name</span>: <span class="tok-s">user_id</span>
    <span class="tok-k">type</span>: <span class="tok-s">STRING</span>
    <span class="tok-k">description</span>: <span class="tok-s">Stable internal device UUID. PK.</span>
  <span class="tok-k">- name</span>: <span class="tok-s">account_id</span>
    <span class="tok-k">type</span>: <span class="tok-s">STRING</span>
    <span class="tok-k">description</span>: <span class="tok-s">Associated account UUID. PII via account \u2194 user join.</span>
    <span class="tok-k">actors</span>: [<span class="tok-s">${N.canonicalEmployee}</span>]
  <span class="tok-k">- name</span>: <span class="tok-s">event_type</span>
    <span class="tok-k">type</span>: <span class="tok-s">INT</span>
    <span class="tok-k">description</span>: <span class="tok-s">enum: 'view'|'signup'|'convert'|'cancel'. Non-PII.</span>`
    } }))), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "7.3" }, "Lineage as a camera"), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "When someone asks ", /* @__PURE__ */ React.createElement("em", null, '"what would break if we change fct_events?"'), ", you don't grep the warehouse. You click the node. Column-level edges show which downstream metric and dashboard reads which specific column. This is the adoption-safety gate: trace one hop up and one hop down before you commit."), /* @__PURE__ */ React.createElement(LineageCamera, { internalMode })), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      `<b>Searching code blindly.</b> <code>ht &lt;table&gt;</code> answers in 2s what <code>grep -R</code> answers in 4 hours (wrong).`,
      "<b>Adopting a table without checking the deprecation banner.</b> The table exists, returns data, has the right schema. The banner says 'deprecated 2023-06, migrate to v2.' You won't know until migration week.",
      "<b>Consuming a table whose lineage you've never traced.</b> If you can't answer 'what upstream producer would I page on an outage' in 5s, you haven't adopted: you've borrowed."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      `<b>Six shortcuts before any question.</b> Reflex, not process.`,
      "<b>Read the dbt file, not the table.</b> The file tells you owner, SLA, actor annotations, deprecation. The table just tells you shape.",
      "<b>One hop up, one hop down.</b> Trace the upstream producer and at least one downstream consumer before relying on a table."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "<b>Six shortcuts replace four hours of code spelunking.</b> Learn them once; they pay back every day.",
      `<b>${N.datasetspec} is the contract.</b> Owner, schema, actors, deprecation: one file, one truth.`,
      "<b>Lineage is a camera, not a document.</b> You don't read it top-down; you click the node and the view comes to you."
    ] }));
  }
  window.Ch6_Discover = Ch6_Discover;
})();
