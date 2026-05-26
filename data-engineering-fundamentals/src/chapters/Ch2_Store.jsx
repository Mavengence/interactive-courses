/* global React, Hero, SectionLabel, AntiPatterns, BestPractices, Takeaway, Panel */
const { useState, useMemo } = React;

/* ============================================================
 * Ch2 · Store — Cumulative table scrubber
 * Yesterday + today → today's cumulative. Bug on Day 3, backfill.
 * ============================================================ */
function genDay(dayIdx, bugFromDay = null) {
  const users = [];
  const seed = dayIdx * 37;
  const count = 6 + (dayIdx % 3);
  for (let i = 0; i < count; i++) {
    const id = `u${100 + i + (dayIdx > 2 ? i % 2 : 0)}`;
    const base = 10 + ((seed + i * 13) % 40);
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
    const prev = Object.fromEntries(yesterday.map(r => [r.id, r.pts]));
    return cumulative.map(r => ({
      ...r,
      delta: r.pts - (prev[r.id] || 0),
      state: !(r.id in prev) ? 'new' : (prev[r.id] !== r.pts ? 'upd' : 'same'),
    }));
  }, [cumulative, yesterday]);

  const newCount = rowState.filter(r => r.state === 'new').length;
  const updCount = rowState.filter(r => r.state === 'upd').length;
  const totalPts = cumulative.reduce((a, r) => a + r.pts, 0);
  const todayPts = today.reduce((a, r) => a + (r.active ? r.points : 0), 0);
  const bugActive = !patched && day >= bugDay;
  const startBackfill = () => { setPatched(true); setBfKey(k => k + 1); };

  return (
    <Panel eyebrow="scrubber" title="user_lifetime_points · day by day" meta={`Day ${day + 1}/5`}
           caption="Each day, yesterday's snapshot merges with today's events into a new snapshot. Break any day and every following day inherits the drift.">
      {/* Day picker */}
      <div className="cm-days">
        {[0,1,2,3,4].map(d => (
          <div key={d}
               className={`cm-day ${day===d?'active':''} ${(!patched && d>=bugDay)?'bug':''} ${(patched && bfKey && d>=bugDay)?'backfill':''}`}
               onClick={() => setDay(d)}>
            <div className="num">DAY {d+1}</div>
            <div className="date">2026-04-{String(15+d).padStart(2,'0')}</div>
            <div className="rc">{genDay(d, patched ? null : bugDay).length} rows</div>
          </div>
        ))}
      </div>

      {/* Three-panel data flow */}
      <div className="cm2-flow">
        {/* Panel 1: Yesterday's snapshot */}
        <div className="cm2-panel">
          <div className="cm2-panel-head">
            <div className="cm2-panel-eyebrow">step 1 · prior state</div>
            <div className="cm2-panel-title">Yesterday's snapshot</div>
            <div className="cm2-panel-sub"><code>user_lifetime_points</code> · day {day || '-'}</div>
          </div>
          <div className="cm2-table">
            <div className="cm2-thead">
              <span>user_id</span><span className="r">points</span>
            </div>
            <div className="cm2-tbody">
              {day === 0 ? (
                <div className="cm2-empty">- no prior state on Day 1 -</div>
              ) : yesterday.slice(0, 10).map(r => (
                <div className="cm2-row" key={r.id}>
                  <span className="cm2-key">{r.id}</span>
                  <span className="cm2-val">{r.pts}</span>
                </div>
              ))}
            </div>
            <div className="cm2-tfoot">
              <span>{yesterday.length} users</span>
              <span className="r">{yesterday.reduce((a,r)=>a+r.pts,0).toLocaleString()} pts</span>
            </div>
          </div>
        </div>

        {/* Merge step */}
        <div className="cm2-step">
          <div className="cm2-step-arrow">+</div>
          <div className="cm2-step-label">merge<br/><span>FULL OUTER<br/>JOIN</span></div>
        </div>

        {/* Panel 2: Today's events */}
        <div className={`cm2-panel ${bugActive ? 'is-bug' : ''}`}>
          <div className="cm2-panel-head">
            <div className="cm2-panel-eyebrow">step 2 · incoming</div>
            <div className="cm2-panel-title">Today's events</div>
            <div className="cm2-panel-sub"><code>daily_user_points</code> · day {day + 1}</div>
            {bugActive && <div className="cm2-panel-alert">⚠ unit mix-up: points halved</div>}
          </div>
          <div className="cm2-table">
            <div className="cm2-thead">
              <span>user_id</span><span className="r">+points</span>
            </div>
            <div className="cm2-tbody">
              {today.map(r => (
                <div className={`cm2-row ${r.active ? '' : 'is-skipped'}`} key={r.id}>
                  <span className="cm2-key">{r.id}</span>
                  <span className="cm2-val cm2-delta">+{r.points}</span>
                </div>
              ))}
            </div>
            <div className="cm2-tfoot">
              <span>{today.length} events</span>
              <span className="r">+{todayPts} pts</span>
            </div>
          </div>
        </div>

        {/* Coalesce step */}
        <div className="cm2-step">
          <div className="cm2-step-arrow">=</div>
          <div className="cm2-step-label">result<br/><span>COALESCE<br/>(y, t)</span></div>
        </div>

        {/* Panel 3: Today's snapshot */}
        <div className="cm2-panel cm2-panel-result">
          <div className="cm2-panel-head">
            <div className="cm2-panel-eyebrow">step 3 · written out</div>
            <div className="cm2-panel-title">Today's snapshot</div>
            <div className="cm2-panel-sub"><code>user_lifetime_points</code> · day {day + 1}</div>
          </div>
          <div className="cm2-table">
            <div className="cm2-thead cm2-thead-3">
              <span>user_id</span><span className="r">points</span><span className="s">status</span>
            </div>
            <div className="cm2-tbody">
              {rowState.map(r => (
                <div key={r.id} className={`cm2-row cm2-row-3 is-${r.state}`}>
                  <span className="cm2-key">{r.id}</span>
                  <span className="cm2-val">{r.pts}</span>
                  <span className={`cm2-status cm2-st-${r.state}`}>
                    {r.state === 'new' ? 'NEW' : r.state === 'upd' ? `+${r.delta}` : '-'}
                  </span>
                </div>
              ))}
            </div>
            <div className="cm2-tfoot">
              <span>{cumulative.length} users</span>
              <span className="r">{totalPts.toLocaleString()} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change summary: what just happened */}
      <div className="cm2-summary">
        <div className="cm2-summary-item">
          <span className="cm2-summary-k">New users</span>
          <span className="cm2-summary-v">+{newCount}</span>
        </div>
        <div className="cm2-summary-item">
          <span className="cm2-summary-k">Updated</span>
          <span className="cm2-summary-v">{updCount}</span>
        </div>
        <div className={`cm2-summary-item ${bugActive ? 'is-warn' : 'is-ok'}`}>
          <span className="cm2-summary-k">Data quality</span>
          <span className="cm2-summary-v">{bugActive ? 'DRIFT' : 'CLEAN'}</span>
        </div>
        <div className="cm2-summary-item">
          <span className="cm2-summary-k">Join key</span>
          <span className="cm2-summary-v"><code>user_id</code></span>
        </div>
      </div>

      <div className="ctl-row">
        <div className="ctl-slider" style={{flex:2}}>
          <div className="row"><span className="lab">Scrub day</span><span className="val">Day {day+1}</span></div>
          <input type="range" min={0} max={4} step={1} value={day} onChange={e => setDay(+e.target.value)} />
          <span className="hint">click a day card above, or drag here</span>
        </div>
        <button className="btn btn-primary" disabled={patched} onClick={startBackfill}>
          {patched ? '✓ Backfilled from Day 4' : 'Patch & backfill from Day 4'}
        </button>
      </div>
    </Panel>
  );
}

function Ch2_Store({ chapter }) {
  return (
    <>
      <Hero accent={chapter.hex}
            eyebrow={`Chapter ${chapter.n} · ${chapter.time}`}
            title="Store: <span class='accent'>one bad day</span> poisons every day that follows it."
            hook="Most tables are a photo of yesterday. <strong>Cumulative tables</strong> are the whole photo album: each day, you carry yesterday's state forward and merge in today's deltas. Elegant when clean, catastrophic when broken: one bad day taints every day after it until you backfill."
            meta={[
              { k: 'Pattern', v: 'state-carrying' },
              { k: 'Engine', v: 'Spark (FULL OUTER JOIN)' },
              { k: 'Used by', v: '<span class="chip">Analytics</span><span class="chip">Reporting</span><span class="chip">Personalization</span>' },
            ]} />

      <section className="section">
        <SectionLabel n="3.1">The pattern</SectionLabel>
        <h2 className="h2">Yesterday + today = today's cumulative.</h2>
        <p className="prose">
          Every cumulative table has the same shape: <code>FULL OUTER JOIN</code> yesterday's cumulative
          with today's deltas on the entity key, then <code>COALESCE</code> to pick the newer value.
          <b> FULL OUTER</b> is the important part: <code>LEFT JOIN</code> will silently drop every user
          appearing for the first time today.
        </p>
        <p className="prose">
          The magic is compounding: day 7's cumulative is day 6 + today, which is already day 5 + its
          today, all the way back. The curse is the same: a bug on day 3 lives in every day that
          follows, forever, until someone catches it and backfills.
        </p>
      </section>

      <section className="section">
        <SectionLabel n="3.2">Scrub the week</SectionLabel>
        <h2 className="h2">A bug on Day 3. Caught on Day 4. Backfilled on Day 5.</h2>
        <p className="prose">
          Step through the scrubber below. Day 3 halves every user's points: a classic unit mix-up.
          By Day 5 the drift is baked into every aggregate. Hit <em>Patch & backfill</em> and watch
          the bug days replay with the corrected logic.
        </p>
        <CumulativeSim />
      </section>

      <section className="section">
        <SectionLabel n="3.3">The query</SectionLabel>
        <div className="code">
          <div className="code-head"><span>user_lifetime_points.sql</span><span className="lang">Spark</span></div>
          <div className="code-body" dangerouslySetInnerHTML={{__html:
`<span class="tok-k">INSERT OVERWRITE TABLE</span> user_lifetime_points <span class="tok-k">PARTITION</span> (ds=<span class="tok-s">'&lt;DATEID&gt;'</span>)
<span class="tok-k">SELECT</span>
  <span class="tok-f">COALESCE</span>(y.user_id, t.user_id) <span class="tok-k">AS</span> user_id,
  <span class="tok-f">COALESCE</span>(y.lifetime_pts, <span class="tok-n">0</span>) + <span class="tok-f">COALESCE</span>(t.pts_today, <span class="tok-n">0</span>) <span class="tok-k">AS</span> lifetime_pts
<span class="tok-k">FROM</span> user_lifetime_points y                           <span class="tok-c">-- yesterday</span>
  <span class="tok-k">FULL OUTER JOIN</span> daily_user_points t                 <span class="tok-c">-- today's delta</span>
    <span class="tok-k">ON</span> y.user_id = t.user_id
<span class="tok-k">WHERE</span> y.ds = <span class="tok-s">'&lt;DATEID-1&gt;'</span> <span class="tok-k">AND</span> t.ds = <span class="tok-s">'&lt;DATEID&gt;'</span>;`
          }} />
        </div>
      </section>

      <AntiPatterns items={[
        "<b>Using <code>LEFT JOIN</code> instead of <code>FULL OUTER</code>.</b> You will silently drop every entity appearing today for the first time. Half your new users: gone.",
        "<b>Forgetting to backfill after a bug.</b> The bad value lives forever in every downstream cumulative. A fix deployed tomorrow does nothing about yesterday.",
        "<b>Depending on wall-clock time.</b> <code>CURRENT_DATE</code>, <code>NOW()</code>, today's timezone: all fatal. A backfill in May must produce identical output to the original run.",
        "<b>Mutating the cumulative table in place.</b> Always write to a new partition and swap. Mutation kills reproducibility and breaks every downstream snapshot reader.",
      ]} />

      <BestPractices items={[
        "Always key every partition by <code>&lt;DATEID&gt;</code>. The job's clock is the partition, not the wall clock.",
        "Version your cumulative logic. When the formula changes, backfill the whole history: don't let new rules and old rows coexist.",
        "Add a <b>row-count guardrail</b>: today's cumulative row count should never decrease. A shrink means you used <code>LEFT JOIN</code> instead of <code>FULL OUTER</code>.",
      ]} />

      <Takeaway items={[
        "Cumulative = <b>yesterday ⊕ today</b>. Every broken day taints every future day until you backfill.",
        "<code>FULL OUTER JOIN</code> + <code>COALESCE</code> is the canonical shape. <code>LEFT JOIN</code> drops new entities.",
        "Always key off <code>&lt;DATEID&gt;</code>, never <code>CURRENT_DATE</code>: backfills demand determinism.",
      ]} />
    </>
  );
}

window.Ch2_Store = Ch2_Store;
