/* global React, Hero, SectionLabel, AntiPatterns, BestPractices, Takeaway, Panel, MMNames */
const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
 * Ch5 · Quality — Trust Meter
 *  - 30-day timeline; day 17 gets row-count dropped 80% if corrupted
 *  - toggle checks; unchecked → corrupt rolls downstream to a dashboard widget
 *    (animates to wrong number + red banner 3 days later)
 *  - checked → signal table never lands, wait operator spins, oncall task auto-creates
 *  - Trust meter needle slides based on active checks
 * ============================================================ */

const DAYS = 30;
const CORRUPT_DAY = 17;

const CHECKS = [
  { id: 'rows',   name: 'Row-count band',   desc: '±10% vs 7-day median',   weight: 32, catches: 'halfWrite' },
  { id: 'schema', name: 'Schema check',     desc: 'no null/new cols',       weight: 22, catches: 'schemaDrift' },
  { id: 'fresh',  name: 'Freshness',        desc: 'landed ≤ SLA',           weight: 24, catches: 'slaSlip' },
  { id: 'unique', name: 'Uniqueness',       desc: 'PK has no dupes',        weight: 22, catches: 'dupRows' },
];

const CORRUPTIONS = {
  halfWrite:   { label: 'half-write (80% rows dropped)',    tripsBy: 'rows',   wrongVal: 24.8 },
  schemaDrift: { label: 'schema drift (new null column)',   tripsBy: 'schema', wrongVal: 0 },
  slaSlip:     { label: 'SLA slip (partition landed 3h late)', tripsBy: 'fresh', wrongVal: 142.3 }, // same number but stale
  dupRows:     { label: 'duplicate rows (idempotency bug)',  tripsBy: 'unique', wrongVal: 284.6 },
};

function TrustMeterSim({ reduceMotion, internalMode }) {
  const N = MMNames(internalMode);
  const [checks, setChecks] = useState({rows:true, schema:true, fresh:true, unique:true});
  const [corrupt, setCorrupt] = useState(null); // null | 'halfWrite' | 'schemaDrift' | 'slaSlip' | 'dupRows'
  const [runDay, setRunDay] = useState(-1); // -1 = idle; 0..DAYS-1 = currently running that day
  const [results, setResults] = useState([]); // per-day result
  const [status, setStatus] = useState('idle'); // idle | running | breach | stale | ok
  const activeWeight = Object.entries(checks).filter(([,v])=>v).reduce((a,[k])=>a+(CHECKS.find(c=>c.id===k)?.weight||0),0);
  const trustPct = activeWeight; // 0..100

  // Downstream dashboard state
  const [dashNumber, setDashNumber] = useState(142.3);
  const [dashState, setDashState] = useState('ok'); // 'ok' | 'wrong' | 'stale'
  const [oncallTicket, setOncallTicket] = useState(null);

  const toggle = (id) => setChecks(c => ({...c, [id]: !c[id]}));

  const reset = () => {
    runTokenRef.current++; // invalidate any in-flight run
    setRunDay(-1); setResults([]); setStatus('idle');
    setDashNumber(142.3); setDashState('ok'); setOncallTicket(null);
  };

  const checksRef = useRef(checks);
  const corruptRef = useRef(corrupt);
  useEffect(() => { checksRef.current = checks; }, [checks]);
  useEffect(() => { corruptRef.current = corrupt; }, [corrupt]);

  const runTokenRef = useRef(0);

  const run = () => {
    runTokenRef.current++;
    const token = runTokenRef.current;
    setRunDay(-1); setResults([]); setStatus('running');
    setDashNumber(142.3); setDashState('ok'); setOncallTicket(null);
    // If the page isn't actually visible (e.g. running inside a hidden iframe / offscreen preview),
    // browsers aggressively throttle setTimeout — fall back to computing all 30 days synchronously.
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
      // ok = normal day without corruption; corrupt day is NEVER ok (either caught=amber or breach=red)
      const ok = !isCorruptDay;
      setResults(r => [...r, { day: d, ok, trippedBy: isCorruptDay ? trippingCheck : null, corrupt: isCorruptDay, caught }]);
      if (isCorruptDay) {
        if (caught) {
          setDashState('stale');
          setOncallTicket({
            id: 'T' + Math.floor(1700000 + Math.random()*99999),
            day: d+1,
            reason: corruption.label + ' · caught by ' + CHECKS.find(c=>c.id===trippingCheck).name,
          });
        } else {
          setDashNumber(corruption.wrongVal);
          setDashState(corruption.wrongVal === 142.3 ? 'stale' : 'wrong');
        }
      }
      d++;
      if (d >= DAYS) {
        setRunDay(-1);
        if (!corruptNow) setStatus('ok');
        else if (checksNow[CORRUPTIONS[corruptNow].tripsBy]) setStatus('stale');
        else setStatus('breach');
        return;
      }
      if (delay === 0) step();
      else setTimeout(step, delay);
    };
    step();
  };

  useEffect(() => () => { runTokenRef.current++; }, []); // cancel any in-flight run on unmount

  const needle = trustPct;
  const needleColor = trustPct >= 80 ? 'var(--theme-green)' : trustPct >= 50 ? '#F7B928' : 'var(--theme-red)';

  return (
    <Panel eyebrow="live simulator · data-quality gates"
           title="Trust Meter"
           meta={`${Object.values(checks).filter(Boolean).length}/4 checks · ${corrupt ? 'corruption: ' + CORRUPTIONS[corrupt].label.split(' (')[0] : 'clean'}`}
           caption={`Each check costs nothing to add and catches a whole class of bug. The ${N.dqOperator} pattern runs them post-write; downstream ${N.waitForSignal} waits on the signal table, not the data table.`}>

      <div className="tm-layout">
        {/* checks rail */}
        <div className="tm-checks">
          <div className="tm-title">Active checks</div>
          {CHECKS.map(c => (
            <label key={c.id} className={`tm-check ${checks[c.id] ? 'on' : ''}`}>
              <input type="checkbox" checked={checks[c.id]} onChange={() => toggle(c.id)} />
              <div>
                <div className="n">{c.name}</div>
                <div className="d">{c.desc}</div>
              </div>
              <div className="w">+{c.weight}</div>
            </label>
          ))}
        </div>

        {/* meter */}
        <div className="tm-meter">
          <div className="tm-score-lab">trust score</div>
          <div className="tm-score-big" style={{color: needleColor}}>
            {needle}<span className="tm-score-max">/100</span>
          </div>
          <div className={`tm-verdict ${trustPct >= 80 ? 'ok' : trustPct >= 50 ? 'warn' : 'bad'}`}>
            {trustPct >= 80 ? 'trusted' : trustPct >= 50 ? 'at risk' : 'untrusted'}
          </div>

          <div className="tm-bar">
            <div className="tm-bar-track">
              <div className="tm-bar-zone bad"  style={{left: '0%',   width: '50%'}} />
              <div className="tm-bar-zone warn" style={{left: '50%',  width: '30%'}} />
              <div className="tm-bar-zone ok"   style={{left: '80%',  width: '20%'}} />
              <div className="tm-bar-needle" style={{left: `${needle}%`, background: needleColor}} />
            </div>
            <div className="tm-bar-ticks">
              <span>0</span>
              <span style={{left: '50%'}}>50</span>
              <span style={{left: '80%'}}>80</span>
              <span style={{right: 0}}>100</span>
            </div>
          </div>

          <div className="tm-breakdown">
            {CHECKS.map(c => (
              <div key={c.id} className={`tm-bd ${checks[c.id] ? 'on' : 'off'}`}>
                <span className="tm-bd-dot" />
                <span className="tm-bd-n">{c.name}</span>
                <span className="tm-bd-w">{checks[c.id] ? `+${c.weight}` : '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* downstream impact: what the analyst actually sees */}
        <div className="tm-impact">
          <div className="tm-impact-head">
            <div className="tm-impact-eyebrow">downstream dashboard · what the analyst sees</div>
            <div className="tm-impact-title">Exec Dashboard · DAU · US · 7-day avg</div>
          </div>
          <div className="tm-impact-grid">
            <div className="tm-impact-cell tm-impact-expected">
              <div className="lab">Expected (truth)</div>
              <div className="big">142.3<span>M</span></div>
              <div className="sub">if pipeline ran clean</div>
            </div>
            <div className={`tm-impact-arrow is-${dashState}`}>
              {dashState === 'ok' ? '→' : dashState === 'stale' ? '⏸' : '⚠'}
            </div>
            <div className={`tm-impact-cell tm-impact-actual is-${dashState}`}>
              <div className="lab">Actual (what shipped)</div>
              <div className="big">{dashNumber.toFixed(1)}<span>M</span></div>
              <div className="sub">
                {dashState === 'wrong' && (() => {
                  const pct = Math.abs(((dashNumber - 142.3) / 142.3) * 100).toFixed(0);
                  return `wrong by ${pct}% · ${Math.round(142.3 - dashNumber)}M missing`;
                })()}
                {dashState === 'stale' && '3-day-old data · signal blocked upstream'}
                {dashState === 'ok' && status === 'ok' && 'matches expected · all checks passed'}
                {dashState === 'ok' && status !== 'ok' && 'idle · run the simulation to see impact'}
              </div>
            </div>
          </div>
          {dashState === 'wrong' && (
            <div className="tm-impact-banner err">
              ⚠ Anomaly detected (T+3d) · wrong number already cited in exec review
            </div>
          )}
          {dashState === 'stale' && (
            <div className="tm-impact-banner warn">
              ⏸ Signal table never landed · downstream consumers wait or read stale
            </div>
          )}
          {dashState === 'ok' && status === 'ok' && (
            <div className="tm-impact-banner ok">
              ✓ All 30 days clean · SLA met · signal landed on-time
            </div>
          )}
          {oncallTicket && (
            <div className="tm-ticket">
              <div className="ti-k">ONCALL AUTO-CREATED</div>
              <div className="ti-id">#{oncallTicket.id}</div>
              <div className="ti-d">day {oncallTicket.day} · {oncallTicket.reason} · routed to de_oncall</div>
            </div>
          )}
        </div>
      </div>

      {/* timeline */}
      <div className="tm-timeline">
        <div className="tm-timeline-lab">30-day run history</div>
        <div className="tm-days">
          {Array.from({length: DAYS}, (_, i) => {
            const r = results[i];
            const isRunning = runDay === i;
            const isCorrupt = corrupt && i === CORRUPT_DAY;
            let cls = 'tm-day';
            if (isRunning) cls += ' running';
            else if (r) {
              if (r.ok) cls += ' ok';
              else if (r.caught) cls += ' caught';
              else cls += ' fail';
            } else cls += ' pending';
            if (isCorrupt) cls += ' corrupt-mark';
            return (
              <div key={i} className={cls} title={`Day ${i+1}${r ? r.ok ? ' · pass' : r.caught ? ` · CAUGHT (${r.trippedBy})` : ` · BREACH (${r.trippedBy})` : ''}${isCorrupt ? ' · corruption armed here' : ''}`}>
                {isCorrupt && <span className="mark">!</span>}
              </div>
            );
          })}
        </div>
        <div className="tm-timeline-legend">
          <span><i className="sw pending" /> pending</span>
          <span><i className="sw ok" /> pass</span>
          <span><i className="sw caught" /> caught</span>
          <span><i className="sw fail" /> breach</span>
          <span><i className="sw corrupt-mark" /> corruption at day {CORRUPT_DAY+1}</span>
        </div>
      </div>

      <div className="ctl-row">
        <div className="tm-corr-picker">
          <span className="tm-corr-lab">Inject at day {CORRUPT_DAY+1}:</span>
          <button className={`tm-corr ${!corrupt ? 'on' : ''}`} onClick={() => setCorrupt(null)}>none</button>
          {Object.entries(CORRUPTIONS).map(([id, c]) => (
            <button key={id} className={`tm-corr ${corrupt === id ? 'on' : ''}`} onClick={() => setCorrupt(id)}
                    title={`caught only by "${CHECKS.find(x => x.id === c.tripsBy).name}"`}>
              {c.label.split(' (')[0]}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={run}>▶ Run 30 days</button>
        <button className="btn" onClick={reset}>Reset</button>
        <div style={{marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-2)'}}>
          {status === 'breach' && <span style={{color:'var(--theme-red)'}}>✕ Corrupt data shipped: gate was off</span>}
          {status === 'stale' && <span style={{color:'#8B5C00'}}>✓ Gate held: signal never landed, oncall notified</span>}
          {status === 'ok' && <span style={{color:'var(--theme-green)'}}>✓ Clean run · 30/30</span>}
        </div>
      </div>
    </Panel>
  );
}

function Ch5_Quality({ chapter, internalMode, reduceMotion }) {
  const N = MMNames(internalMode);
  return (
    <>
      <Hero accent={chapter.hex}
            eyebrow={`Chapter ${chapter.n} · ${chapter.time}`}
            title={`Quality: a pipeline that <span class='accent'>ran</span> is not a pipeline that's <span class='accent'>right</span>.`}
            hook={`The hardest failures to catch are the ones that succeed. The task returns zero, writes a tiny partition, lands on time, and the number on the CFO's deck is wrong. Data-quality gates turn "the pipeline ran" into "the number is trustworthy." That's the contract the rest of the warehouse depends on.`}
            meta={[
              { k: 'Primitive', v: N.dqOperator },
              { k: 'Barrier', v: `signal table + ${N.waitForSignal}` },
              { k: 'Tiers', v: '6h · 24h · 48h SLA' },
            ]} />

      <section className="section">
        <SectionLabel n="6.1">Checks are cheap, bugs are expensive</SectionLabel>
        <h2 className="h2">Four checks that catch 80% of data-incident tickets.</h2>
        <p className="prose">
          <b>Row-count band:</b> today's row count must sit within ±10% of the trailing 7-day median. Catches
          empty writes, half-writes, upstream source outages.<br/>
          <b>Schema check:</b> no new nullable column, no type drift. Catches producer schema bumps that
          silently break downstream joins.<br/>
          <b>Freshness:</b> partition landed before the SLA. Catches slipped pipelines before a dashboard
          user notices.<br/>
          <b>Uniqueness:</b> primary-key has no duplicates. Catches idempotency bugs (see Ch5) before they
          corrupt a fact table.
        </p>
        <TrustMeterSim internalMode={internalMode} reduceMotion={reduceMotion} />
      </section>

      <section className="section">
        <SectionLabel n="6.2">The signal-table barrier</SectionLabel>
        <h2 className="h2">Downstream waits on the signal, never on the data.</h2>
        <p className="prose">
          A DQ check that <em>runs after the data lands</em> but <em>before anyone reads it</em> is the
          barrier. When the check passes, the pipeline writes a tiny row to a <strong>signal table</strong>.
          Every downstream consumer uses <code>{N.waitForSignal}</code> to block on that signal: not on the
          data table itself. If the check fails, the signal never lands, downstreams wait, and oncall is
          auto-paged with an SLA-tier-aware ticket.
        </p>
        <div className="cards-2">
          <div className="ccard">
            <div className="ccard-t">Without the barrier</div>
            <div className="ccard-n">Downstream waits on the data table</div>
            <div className="ccard-d">Partial or corrupt data is readable the moment the write commits. A retry is too late: consumers already ran.</div>
          </div>
          <div className="ccard">
            <div className="ccard-t">With the barrier</div>
            <div className="ccard-n">Downstream waits on the signal table</div>
            <div className="ccard-d">Data exists but is invisible until the signal lands. Failures hold the line; oncall wakes up before a consumer hits a bad number.</div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionLabel n="6.3">The operator</SectionLabel>
        <div className="code">
          <div className="code-head"><span>pipeline.py · {N.dqOperator} + {N.waitForSignal}</span><span className="lang">Python</span></div>
          <div className="code-body" dangerouslySetInnerHTML={{__html:
`<span class="tok-c"># 1) Write the partition (idempotent, see Ch5)</span>
<span class="tok-f">InsertOverwriteOperator</span>(
    table=<span class="tok-s">"fct_dau"</span>,
    partition=<span class="tok-s">"&lt;DATEID&gt;"</span>,
    sla_tier=<span class="tok-s">"24h"</span>,                          <span class="tok-c"># routes to the right oncall</span>
)

<span class="tok-c"># 2) Gate it: DQ runs, then the signal table lands</span>
<span class="tok-f">${N.dqOperator}</span>(
    table=<span class="tok-s">"fct_dau"</span>,
    checks=[
        <span class="tok-f">RowCountBand</span>(band=<span class="tok-n">0.10</span>),           <span class="tok-c"># ±10% vs 7-day median</span>
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
          }} />
        </div>
      </section>

      <AntiPatterns items={[
        "<b>\"We'll add DQ later.\"</b> You won't. The pipeline will ship, the first bad day will hit, someone will chase it manually for a week. Add DQ before the first ship, or ship without the pipeline.",
        `<b>Waiting on the data table instead of the signal table.</b> This is the most common subtle bug in new pipelines. Partial writes look complete. Downstream reads too early. Use ${N.waitForSignal}.`,
        "<b>No SLA tier tag.</b> A task that slips silently at 04:00 and pages no one until someone notices at 14:00 is not a 6h-SLA task. Tag the tier; oncall routing depends on it.",
        "<b>Catch-all <code>assert len(df) > 0</code>.</b> It passes when the pipeline writes one row on an outage. Use row-count bands, not sanity asserts.",
      ]} />

      <BestPractices items={[
        "<b>Every fact table</b> gets row-count band + freshness + uniqueness, minimum. Dimension tables add schema-match.",
        "<b>Signal tables are first-class citizens.</b> Name them <code>&lt;table&gt;__signal</code>. They outlive the pipeline: replays, backfills, and audits all read them.",
        `<b>SLA-tier your tasks.</b> 6h for ads/exec-deck inputs, 24h for most facts, 48h for discovery/rollups. The tier is the pager contract.`,
        "<b>DQ config in version control, not UI.</b> Checks drift; code reviews catch drift; dashboards don't.",
      ]} />

      <Takeaway items={[
        "<b>DQ is the contract.</b> It is the difference between data engineering and data plumbing.",
        `<b>Four checks, four bugs avoided.</b> Row-count, schema, freshness, uniqueness. Every fact table. Every day.`,
        `<b>Wait on the signal.</b> If you remember one word from this chapter, make it <em>signal</em>.`,
      ]} />
    </>
  );
}

window.Ch5_Quality = Ch5_Quality;
