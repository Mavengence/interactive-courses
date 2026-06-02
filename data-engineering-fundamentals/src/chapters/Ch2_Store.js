(() => {
  const { useState, useMemo } = React;
  function genDay(dayIdx, bugFromDay = null) {
    const users = [];
    const seed = dayIdx * 37;
    const count = 6 + dayIdx % 3;
    for (let i = 0; i < count; i++) {
      const id = `u${100 + i + (dayIdx > 2 ? i % 2 : 0)}`;
      const base = 10 + (seed + i * 13) % 40;
      const points = bugFromDay !== null && dayIdx >= bugFromDay ? Math.floor(base / 2) : base;
      const active = (seed + i * 7) % 5 !== 0;
      users.push({ id, points, active });
    }
    return users;
  }
  function computeCumulative(dayIdx, bugFromDay, patched) {
    const totals = {};
    for (let d = 0; d <= dayIdx; d++) {
      const effectiveBug = patched ? null : bugFromDay;
      const day = genDay(d, effectiveBug);
      for (const u of day) {
        if (!(u.id in totals)) totals[u.id] = 0;
        if (u.active) totals[u.id] += u.points;
      }
    }
    return Object.entries(totals).map(([id, pts]) => ({ id, pts })).sort((a, b) => b.pts - a.pts);
  }
  function CumulativeSim() {
    const [day, setDay] = useState(2);
    const bugDay = 3;
    const [patched, setPatched] = useState(false);
    const [bfKey, setBfKey] = useState(0);
    const today = useMemo(() => genDay(day, patched ? null : bugDay), [day, patched]);
    const cumulative = useMemo(() => computeCumulative(day, bugDay, patched), [day, patched]);
    const yesterday = useMemo(() => day > 0 ? computeCumulative(day - 1, bugDay, patched) : [], [day, patched]);
    const rowState = useMemo(() => {
      const prev = Object.fromEntries(yesterday.map((r) => [r.id, r.pts]));
      return cumulative.map((r) => ({
        ...r,
        delta: r.pts - (prev[r.id] || 0),
        state: !(r.id in prev) ? "new" : prev[r.id] !== r.pts ? "upd" : "same"
      }));
    }, [cumulative, yesterday]);
    const newCount = rowState.filter((r) => r.state === "new").length;
    const updCount = rowState.filter((r) => r.state === "upd").length;
    const totalPts = cumulative.reduce((a, r) => a + r.pts, 0);
    const todayPts = today.reduce((a, r) => a + (r.active ? r.points : 0), 0);
    const bugActive = !patched && day >= bugDay;
    const startBackfill = () => {
      setPatched(true);
      setBfKey((k) => k + 1);
    };
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "scrubber",
        title: "user_lifetime_points \xB7 day by day",
        meta: `Day ${day + 1}/5`,
        caption: "Each day, yesterday's snapshot merges with today's events into a new snapshot. Break any day and every following day inherits the drift."
      },
      /* @__PURE__ */ React.createElement("div", { className: "cm-days" }, [0, 1, 2, 3, 4].map((d) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: d,
          className: `cm-day ${day === d ? "active" : ""} ${!patched && d >= bugDay ? "bug" : ""} ${patched && bfKey && d >= bugDay ? "backfill" : ""}`,
          onClick: () => setDay(d)
        },
        /* @__PURE__ */ React.createElement("div", { className: "num" }, "DAY ", d + 1),
        /* @__PURE__ */ React.createElement("div", { className: "date" }, "2026-04-", String(15 + d).padStart(2, "0")),
        /* @__PURE__ */ React.createElement("div", { className: "rc" }, genDay(d, patched ? null : bugDay).length, " rows")
      ))),
      /* @__PURE__ */ React.createElement("div", { className: "cm2-flow" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-panel" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-head" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-eyebrow" }, "step 1 \xB7 prior state"), /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-title" }, "Yesterday's snapshot"), /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-sub" }, /* @__PURE__ */ React.createElement("code", null, "user_lifetime_points"), " \xB7 day ", day || "-")), /* @__PURE__ */ React.createElement("div", { className: "cm2-table" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-thead" }, /* @__PURE__ */ React.createElement("span", null, "user_id"), /* @__PURE__ */ React.createElement("span", { className: "r" }, "points")), /* @__PURE__ */ React.createElement("div", { className: "cm2-tbody" }, day === 0 ? /* @__PURE__ */ React.createElement("div", { className: "cm2-empty" }, "- no prior state on Day 1 -") : yesterday.slice(0, 10).map((r) => /* @__PURE__ */ React.createElement("div", { className: "cm2-row", key: r.id }, /* @__PURE__ */ React.createElement("span", { className: "cm2-key" }, r.id), /* @__PURE__ */ React.createElement("span", { className: "cm2-val" }, r.pts)))), /* @__PURE__ */ React.createElement("div", { className: "cm2-tfoot" }, /* @__PURE__ */ React.createElement("span", null, yesterday.length, " users"), /* @__PURE__ */ React.createElement("span", { className: "r" }, yesterday.reduce((a, r) => a + r.pts, 0).toLocaleString(), " pts")))), /* @__PURE__ */ React.createElement("div", { className: "cm2-step" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-step-arrow" }, "+"), /* @__PURE__ */ React.createElement("div", { className: "cm2-step-label" }, "merge", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", null, "FULL OUTER", /* @__PURE__ */ React.createElement("br", null), "JOIN"))), /* @__PURE__ */ React.createElement("div", { className: `cm2-panel ${bugActive ? "is-bug" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-head" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-eyebrow" }, "step 2 \xB7 incoming"), /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-title" }, "Today's events"), /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-sub" }, /* @__PURE__ */ React.createElement("code", null, "daily_user_points"), " \xB7 day ", day + 1), bugActive && /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-alert" }, "\u26A0 unit mix-up: points halved")), /* @__PURE__ */ React.createElement("div", { className: "cm2-table" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-thead" }, /* @__PURE__ */ React.createElement("span", null, "user_id"), /* @__PURE__ */ React.createElement("span", { className: "r" }, "+points")), /* @__PURE__ */ React.createElement("div", { className: "cm2-tbody" }, today.map((r) => /* @__PURE__ */ React.createElement("div", { className: `cm2-row ${r.active ? "" : "is-skipped"}`, key: r.id }, /* @__PURE__ */ React.createElement("span", { className: "cm2-key" }, r.id), /* @__PURE__ */ React.createElement("span", { className: "cm2-val cm2-delta" }, "+", r.points)))), /* @__PURE__ */ React.createElement("div", { className: "cm2-tfoot" }, /* @__PURE__ */ React.createElement("span", null, today.length, " events"), /* @__PURE__ */ React.createElement("span", { className: "r" }, "+", todayPts, " pts")))), /* @__PURE__ */ React.createElement("div", { className: "cm2-step" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-step-arrow" }, "="), /* @__PURE__ */ React.createElement("div", { className: "cm2-step-label" }, "result", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", null, "COALESCE", /* @__PURE__ */ React.createElement("br", null), "(y, t)"))), /* @__PURE__ */ React.createElement("div", { className: "cm2-panel cm2-panel-result" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-head" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-eyebrow" }, "step 3 \xB7 written out"), /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-title" }, "Today's snapshot"), /* @__PURE__ */ React.createElement("div", { className: "cm2-panel-sub" }, /* @__PURE__ */ React.createElement("code", null, "user_lifetime_points"), " \xB7 day ", day + 1)), /* @__PURE__ */ React.createElement("div", { className: "cm2-table" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-thead cm2-thead-3" }, /* @__PURE__ */ React.createElement("span", null, "user_id"), /* @__PURE__ */ React.createElement("span", { className: "r" }, "points"), /* @__PURE__ */ React.createElement("span", { className: "s" }, "status")), /* @__PURE__ */ React.createElement("div", { className: "cm2-tbody" }, rowState.map((r) => /* @__PURE__ */ React.createElement("div", { key: r.id, className: `cm2-row cm2-row-3 is-${r.state}` }, /* @__PURE__ */ React.createElement("span", { className: "cm2-key" }, r.id), /* @__PURE__ */ React.createElement("span", { className: "cm2-val" }, r.pts), /* @__PURE__ */ React.createElement("span", { className: `cm2-status cm2-st-${r.state}` }, r.state === "new" ? "NEW" : r.state === "upd" ? `+${r.delta}` : "-")))), /* @__PURE__ */ React.createElement("div", { className: "cm2-tfoot" }, /* @__PURE__ */ React.createElement("span", null, cumulative.length, " users"), /* @__PURE__ */ React.createElement("span", { className: "r" }, totalPts.toLocaleString(), " pts"))))),
      /* @__PURE__ */ React.createElement("div", { className: "cm2-summary" }, /* @__PURE__ */ React.createElement("div", { className: "cm2-summary-item" }, /* @__PURE__ */ React.createElement("span", { className: "cm2-summary-k" }, "New users"), /* @__PURE__ */ React.createElement("span", { className: "cm2-summary-v" }, "+", newCount)), /* @__PURE__ */ React.createElement("div", { className: "cm2-summary-item" }, /* @__PURE__ */ React.createElement("span", { className: "cm2-summary-k" }, "Updated"), /* @__PURE__ */ React.createElement("span", { className: "cm2-summary-v" }, updCount)), /* @__PURE__ */ React.createElement("div", { className: `cm2-summary-item ${bugActive ? "is-warn" : "is-ok"}` }, /* @__PURE__ */ React.createElement("span", { className: "cm2-summary-k" }, "Data quality"), /* @__PURE__ */ React.createElement("span", { className: "cm2-summary-v" }, bugActive ? "DRIFT" : "CLEAN")), /* @__PURE__ */ React.createElement("div", { className: "cm2-summary-item" }, /* @__PURE__ */ React.createElement("span", { className: "cm2-summary-k" }, "Join key"), /* @__PURE__ */ React.createElement("span", { className: "cm2-summary-v" }, /* @__PURE__ */ React.createElement("code", null, "user_id")))),
      /* @__PURE__ */ React.createElement("div", { className: "ctl-row" }, /* @__PURE__ */ React.createElement("div", { className: "ctl-slider", style: { flex: 2 } }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Scrub day"), /* @__PURE__ */ React.createElement("span", { className: "val" }, "Day ", day + 1)), /* @__PURE__ */ React.createElement("input", { type: "range", min: 0, max: 4, step: 1, value: day, onChange: (e) => setDay(+e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "hint" }, "click a day card above, or drag here")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", disabled: patched, onClick: startBackfill }, patched ? "\u2713 Backfilled from Day 4" : "Patch & backfill from Day 4"))
    );
  }
  function Ch2_Store({ chapter }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.ink,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: "Store: <span class='accent'>one bad day</span> poisons every day that follows it.",
        hook: "Most tables are a photo of yesterday. <strong>Cumulative tables</strong> are the whole photo album: each day, you carry yesterday's state forward and merge in today's deltas. Elegant when clean, catastrophic when broken: one bad day taints every day after it until you backfill.",
        meta: [
          { k: "Pattern", v: "state-carrying" },
          { k: "Engine", v: "Spark (FULL OUTER JOIN)" },
          { k: "Used by", v: '<span class="chip">Analytics</span><span class="chip">Reporting</span><span class="chip">Personalization</span>' }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "3.1" }, "The pattern"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Yesterday + today = today's cumulative."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Every cumulative table has the same shape: ", /* @__PURE__ */ React.createElement("code", null, "FULL OUTER JOIN"), " yesterday's cumulative with today's deltas on the entity key, then ", /* @__PURE__ */ React.createElement("code", null, "COALESCE"), " to pick the newer value.", /* @__PURE__ */ React.createElement("b", null, " FULL OUTER"), " is the important part: ", /* @__PURE__ */ React.createElement("code", null, "LEFT JOIN"), " will silently drop every user appearing for the first time today."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "The magic is compounding: day 7's cumulative is day 6 + today, which is already day 5 + its today, all the way back. The curse is the same: a bug on day 3 lives in every day that follows, forever, until someone catches it and backfills.")), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "3.2" }, "Scrub the week"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "A bug on Day 3. Caught on Day 4. Backfilled on Day 5."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Step through the scrubber below. Day 3 halves every user's points: a classic unit mix-up. By Day 5 the drift is baked into every aggregate. Hit ", /* @__PURE__ */ React.createElement("em", null, "Patch & backfill"), " and watch the bug days replay with the corrected logic."), /* @__PURE__ */ React.createElement(CumulativeSim, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "3.3" }, "The query"), /* @__PURE__ */ React.createElement("div", { className: "code" }, /* @__PURE__ */ React.createElement("div", { className: "code-head" }, /* @__PURE__ */ React.createElement("span", null, "user_lifetime_points.sql"), /* @__PURE__ */ React.createElement("span", { className: "lang" }, "Spark")), /* @__PURE__ */ React.createElement("div", { className: "code-body", dangerouslySetInnerHTML: {
      __html: `<span class="tok-k">INSERT OVERWRITE TABLE</span> user_lifetime_points <span class="tok-k">PARTITION</span> (ds=<span class="tok-s">'&lt;DATEID&gt;'</span>)
<span class="tok-k">SELECT</span>
  <span class="tok-f">COALESCE</span>(y.user_id, t.user_id) <span class="tok-k">AS</span> user_id,
  <span class="tok-f">COALESCE</span>(y.lifetime_pts, <span class="tok-n">0</span>) + <span class="tok-f">COALESCE</span>(t.pts_today, <span class="tok-n">0</span>) <span class="tok-k">AS</span> lifetime_pts
<span class="tok-k">FROM</span> user_lifetime_points y                           <span class="tok-c">-- yesterday</span>
  <span class="tok-k">FULL OUTER JOIN</span> daily_user_points t                 <span class="tok-c">-- today's delta</span>
    <span class="tok-k">ON</span> y.user_id = t.user_id
<span class="tok-k">WHERE</span> y.ds = <span class="tok-s">'&lt;DATEID-1&gt;'</span> <span class="tok-k">AND</span> t.ds = <span class="tok-s">'&lt;DATEID&gt;'</span>;`
    } }))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Using <code>LEFT JOIN</code> instead of <code>FULL OUTER</code>.</b> You will silently drop every entity appearing today for the first time. Half your new users: gone.",
      "<b>Forgetting to backfill after a bug.</b> The bad value lives forever in every downstream cumulative. A fix deployed tomorrow does nothing about yesterday.",
      "<b>Depending on wall-clock time.</b> <code>CURRENT_DATE</code>, <code>NOW()</code>, today's timezone: all fatal. A backfill in May must produce identical output to the original run.",
      "<b>Mutating the cumulative table in place.</b> Always write to a new partition and swap. Mutation kills reproducibility and breaks every downstream snapshot reader."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "Always key every partition by <code>&lt;DATEID&gt;</code>. The job's clock is the partition, not the wall clock.",
      "Version your cumulative logic. When the formula changes, backfill the whole history: don't let new rules and old rows coexist.",
      "Add a <b>row-count guardrail</b>: today's cumulative row count should never decrease. A shrink means you used <code>LEFT JOIN</code> instead of <code>FULL OUTER</code>."
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "Cumulative = <b>yesterday \u2295 today</b>. Every broken day taints every future day until you backfill.",
      "<code>FULL OUTER JOIN</code> + <code>COALESCE</code> is the canonical shape. <code>LEFT JOIN</code> drops new entities.",
      "Always key off <code>&lt;DATEID&gt;</code>, never <code>CURRENT_DATE</code>: backfills demand determinism."
    ] }));
  }
  window.Ch2_Store = Ch2_Store;
})();
