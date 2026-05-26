/* global React, Hero, SectionLabel, AntiPatterns, BestPractices, Takeaway, Panel */
const { useState, useEffect, useRef, useMemo } = React;

/* ============================================================
 * Ch1 · Ingest — Kafka-to-Warehouse watermark simulator
 * Streaming events scatter on (event_time, session); user drags the
 * watermark line. Late events past the line get dropped.
 * ============================================================ */
function WatermarkSim() {
  const [watermark, setWatermark] = useState(720);
  const [running, setRunning] = useState(true);
  const [events, setEvents] = useState([]);
  const [lateness, setLateness] = useState(20);
  const stageRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setEvents(prev => {
        const next = [...prev];
        const now = Date.now();
        for (let i = 0; i < 3; i++) {
          const isLate = Math.random() * 100 < lateness;
          const eventTime = isLate ? 180 + Math.random() * 440 : 620 + Math.random() * 220;
          next.push({ id: now + i + Math.random(), x: eventTime, y: 60 + Math.random() * 280, born: Date.now(), late: isLate });
        }
        return next.filter(e => Date.now() - e.born < 8000).slice(-90);
      });
    }, 420);
    return () => clearInterval(iv);
  }, [running, lateness]);

  const onDragStart = () => {
    const rect = stageRef.current.getBoundingClientRect();
    const move = (ev) => {
      const x = (ev.clientX || ev.touches?.[0]?.clientX) - rect.left;
      setWatermark(Math.max(140, Math.min(940, x * (1000 / rect.width))));
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const included = events.filter(e => e.x < watermark).length;
  const dropped = events.filter(e => e.x >= watermark && e.late).length;
  const mode = watermark > 800 ? 'exact' : watermark > 520 ? 'balanced' : 'real-time';

  return (
    <Panel eyebrow="live simulator" title="kafka-to-warehouse · drag the watermark" meta={`${events.length} events buffered`}
           caption="Green = on-time. Amber = late. Watermark is the event-time point past which a window is closed and late events are dropped.">
      <div className="wm-stage" ref={stageRef}>
        <svg className="wm-svg" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet">
          <line x1={60} y1={360} x2={960} y2={360} stroke="var(--theme-gray-300)" strokeWidth={1} />
          <line x1={60} y1={40} x2={60} y2={360} stroke="var(--theme-gray-300)" strokeWidth={1} />
          <text x={500} y={390} textAnchor="middle" className="wm-axis-label">event time →</text>
          <text x={30} y={200} textAnchor="middle" transform="rotate(-90 30 200)" className="wm-axis-label">session</text>
          {[200,400,600,800].map(x => (
            <g key={x}>
              <line x1={x} y1={356} x2={x} y2={364} stroke="var(--theme-gray-400)" />
              <text x={x} y={380} textAnchor="middle" className="wm-tick">t−{Math.round((1000-x)/100)}m</text>
            </g>
          ))}
          {events.map(e => {
            const age = (Date.now() - e.born) / 8000;
            const inc = e.x < watermark;
            return (
              <circle key={e.id} cx={e.x} cy={e.y} r={5.5}
                      className={e.late ? 'wm-dot-late' : 'wm-dot-ontime'}
                      opacity={inc ? (1 - age * 0.7) : 0.22} />
            );
          })}
          <rect x={watermark} y={40} width={960 - watermark} height={320} fill="#F7B928" opacity={0.1} />
          <text x={(watermark + 960) / 2} y={210} textAnchor="middle"
                style={{fontFamily:'var(--font-mono)',fontSize:15,fontWeight:800,letterSpacing:'0.12em',fill:'#8B5C00',opacity:0.55}}>
            DROPPED
          </text>
          <g style={{cursor:'ew-resize'}} onMouseDown={onDragStart}>
            <line x1={watermark} y1={40} x2={watermark} y2={360} stroke="var(--theme-blue)" strokeWidth={3} />
            <line x1={watermark} y1={40} x2={watermark} y2={360} stroke="transparent" strokeWidth={22} />
            <rect x={watermark - 9} y={30} width={18} height={18} rx={3} fill="var(--theme-blue)" />
            <text x={watermark} y={22} textAnchor="middle" style={{fontFamily:'var(--font-mono)',fontSize:10,fontWeight:800,fill:'var(--theme-blue)',letterSpacing:'0.08em'}}>WATERMARK: drag</text>
          </g>
        </svg>
      </div>

      <div className="readout-grid">
        <div className="readout ok"><div className="r-k">Included</div><div className="r-v">{included}</div><div className="r-s">before watermark</div></div>
        <div className="readout warn"><div className="r-k">Late · dropped</div><div className="r-v">{dropped}</div><div className="r-s">excluded from window</div></div>
        <div className="readout"><div className="r-k">Watermark</div><div className="r-v">t−{((1000-watermark)/100).toFixed(1)}<small>m</small></div><div className="r-s">event time</div></div>
        <div className="readout blue">
          <div className="r-k">Mode</div>
          <div className="r-v" style={{fontSize:17,textTransform:'uppercase'}}>{mode}</div>
          <div className="r-s">{mode === 'exact' ? 'low loss · high delay' : mode === 'balanced' ? 'default' : 'real-time · lossy'}</div>
        </div>
      </div>

      <div className="ctl-row">
        <div className="ctl-slider" style={{flex:1.5}}>
          <div className="row"><span className="lab">Watermark position</span><span className="val">t−{((1000-watermark)/100).toFixed(1)}m</span></div>
          <input type="range" min={150} max={920} step={5} value={watermark} onChange={e => setWatermark(+e.target.value)} />
          <span className="hint">drag the slider or the blue line above</span>
        </div>
        <div className="ctl-slider warn" style={{flex:1}}>
          <div className="row"><span className="lab">Network lateness</span><span className="val">{lateness}%</span></div>
          <input type="range" min={0} max={60} step={5} value={lateness} onChange={e => setLateness(+e.target.value)} />
          <span className="hint">% of events arriving late</span>
        </div>
        <button className="btn" onClick={() => setRunning(r => !r)}>{running ? '⏸ Pause stream' : '▶ Resume'}</button>
      </div>
    </Panel>
  );
}

/* ClickHouse vs Snowflake concept cards */
function IngestStreams() {
  return (
    <div className="cards-2">
      <div className="ccard">
        <div className="ccard-t">ClickHouse</div>
        <div className="ccard-n">Sampled · real-time</div>
        <div className="ccard-d">1-in-N rows. Sub-minute freshness. Perfect for <em>"is something on fire?"</em> Never sum raw sample counts and expect truth: always multiply by the sample rate.</div>
      </div>
      <div className="ccard">
        <div className="ccard-t">Snowflake</div>
        <div className="ccard-n">Exact · batch</div>
        <div className="ccard-d">100% of rows, deterministic. Hours of delay. What you use for finance, policy, and anything a regulator might subpoena.</div>
      </div>
    </div>
  );
}

function Ch1_Ingest({ chapter }) {
  return (
    <>
      <Hero accent={chapter.hex}
            eyebrow={`Chapter ${chapter.n} · ${chapter.time}`}
            title="Ingest: <span class='accent'>where data is born,</span> and what it costs to trust it."
            hook="Events are captured live on the edge and land in two places: a <strong>sampled, real-time store</strong> (ClickHouse) for on-call; and an <strong>exact, batch warehouse</strong> (Snowflake) for accounting. The bridge between them is a watermark: a line past which late events are dropped. Drag it wrong and you ship wrong numbers."
            meta={[
              { k: 'Source', v: '<span class="chip">ClickHouse</span><span class="chip">Loggers</span><span class="chip">CDC</span>' },
              { k: 'Sink', v: 'Snowflake · Iceberg tables' },
              { k: 'Hard problem', v: 'late arrivals & clock skew' },
            ]} />

      <section className="section">
        <SectionLabel n="1.1">Two clocks, one event</SectionLabel>
        <h2 className="h2">Event time vs processing time.</h2>
        <p className="prose">
          Every event carries two timestamps. <b>Event time</b> is when it happened: a tap on a phone, an
          ad impression rendered. <b>Processing time</b> is when your stream actually saw it. Mobile
          clients, retries, weak cell signal, and simple clock skew make these diverge. Any system that
          pretends they're the same ships the wrong numbers.
        </p>
        <p className="prose">
          Modern logger tiers (Kafka + Flink CDC) emit events into ClickHouse within <em>seconds</em> of event time; Snowflake lands
          them as Parquet minutes to hours later. Between those two, the <strong>watermark</strong> decides
          which late events get to join the aggregate and which get dropped.
        </p>
      </section>

      <section className="section">
        <SectionLabel n="1.2">The compromise, visualized</SectionLabel>
        <h2 className="h2">When do you stop waiting?</h2>
        <p className="prose">
          Drag the blue line. Green dots are on-time events; amber dots arrived late. Anything past the
          watermark is <em>dropped</em>: gone from Snowflake. Too tight and you lose real data; too loose and
          dashboards lag by an hour. There is no free correct answer.
        </p>
        <WatermarkSim />
        <p className="prose" style={{marginTop: 22}}>
          In production, watermarks are typically <strong>15–60 minutes</strong> behind real-time: long
          enough to absorb mobile stragglers, short enough that dashboards feel live. Finance-critical
          pipelines push the watermark out to hours and accept the delay.
        </p>
      </section>

      <section className="section">
        <SectionLabel n="1.3">Two stores, two jobs</SectionLabel>
        <h2 className="h2">ClickHouse answers <em>"now"</em>. Snowflake answers <em>"exactly"</em>.</h2>
        <p className="prose">
          The rule is not "pick one." It's <em>use both, and know which question each one answers</em>.
          ClickHouse is for live debugging, oncall, and broad strokes. Snowflake is for contracts, finance, and any
          number that has to survive a regulator.
        </p>
        <IngestStreams />
      </section>

      <section className="section">
        <SectionLabel n="1.4">The canonical kafka-to-warehouse SQL</SectionLabel>
        <div className="code">
          <div className="code-head"><span>kafka_to_warehouse_events.sql</span><span className="lang">Spark</span></div>
          <div className="code-body" dangerouslySetInnerHTML={{__html:
`<span class="tok-k">INSERT OVERWRITE TABLE</span> events_daily <span class="tok-k">PARTITION</span> (ds=<span class="tok-s">'&lt;DATEID&gt;'</span>)
<span class="tok-k">SELECT</span>
  user_id,
  event_name,
  event_time,
  <span class="tok-f">COUNT</span>(*) <span class="tok-k">AS</span> n
<span class="tok-k">FROM</span> clickhouse_events
<span class="tok-k">WHERE</span> event_time <span class="tok-k">BETWEEN</span> <span class="tok-s">'&lt;DATEID&gt;'</span> <span class="tok-k">AND</span> <span class="tok-s">'&lt;DATEID&gt; 23:59:59'</span>
  <span class="tok-k">AND</span> processing_time &lt; <span class="tok-s">'&lt;DATEID+1&gt; 00:30:00'</span>  <span class="tok-c">-- watermark: 30m grace</span>
<span class="tok-k">GROUP BY</span> user_id, event_name, event_time;`
          }} />
        </div>
      </section>

      <AntiPatterns items={[
        "<b>Summing raw ClickHouse counts without the sample rate.</b> A 1:1000 sample reports 1000× fewer impressions. Always multiply by <code>sample_rate</code>.",
        "<b>Watermark = now.</b> You'll drop every mobile event that round-trips through a cell tower. Give it at least 15 minutes of grace.",
        "<b>Treating the kafka-to-warehouse pipeline as eventually consistent.</b> It isn't. Once the window closes, late events are <em>gone</em>: no backfill, no retry will save them.",
        "<b>Reading <code>NOW()</code> inside an ingest job.</b> A backfill in May for last Tuesday becomes unreproducible. Use <code>&lt;DATEID&gt;</code>.",
      ]} />

      <BestPractices items={[
        "Emit <b>both timestamps</b> on every event: <code>event_time</code> (device) and <code>processing_time</code> (server). The gap between them is your watermark budget.",
        "Budget your watermark from the <b>p99 network delay</b> for mobile, not the median. 30 minutes is a sane starting point.",
        "Dashboards that demand real-time: read <b>ClickHouse</b>, annotate them <em>\"sampled\"</em>. Anything cited in a deck: read <b>Snowflake</b>.",
      ]} />

      <Takeaway items={[
        "Every event has two clocks: <b>event time</b> and <b>processing time</b>. Late arrivals live in the gap between them.",
        "The <b>watermark</b> is the price you pay to close a window. Tighter = lossier. Looser = later.",
        "<b>ClickHouse</b> is sampled and fast; <b>Snowflake</b> is exact and slow. Use both: know which question each one answers.",
      ]} />
    </>
  );
}

window.Ch1_Ingest = Ch1_Ingest;
