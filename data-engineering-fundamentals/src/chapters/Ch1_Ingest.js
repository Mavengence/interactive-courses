(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  function WatermarkSim() {
    const [watermark, setWatermark] = useState(720);
    const [running, setRunning] = useState(true);
    const [events, setEvents] = useState([]);
    const [lateness, setLateness] = useState(20);
    const stageRef = useRef(null);
    useEffect(() => {
      if (!running) return;
      const iv = setInterval(() => {
        setEvents((prev) => {
          const next = [...prev];
          const now = Date.now();
          for (let i = 0; i < 3; i++) {
            const isLate = Math.random() * 100 < lateness;
            const eventTime = isLate ? 180 + Math.random() * 440 : 620 + Math.random() * 220;
            next.push({ id: now + i + Math.random(), x: eventTime, y: 60 + Math.random() * 280, born: Date.now(), late: isLate });
          }
          return next.filter((e) => Date.now() - e.born < 8e3).slice(-90);
        });
      }, 420);
      return () => clearInterval(iv);
    }, [running, lateness]);
    const onDragStart = () => {
      const rect = stageRef.current.getBoundingClientRect();
      const move = (ev) => {
        const x = (ev.clientX || ev.touches?.[0]?.clientX) - rect.left;
        setWatermark(Math.max(140, Math.min(940, x * (1e3 / rect.width))));
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    };
    const included = events.filter((e) => e.x < watermark).length;
    const dropped = events.filter((e) => e.x >= watermark && e.late).length;
    const mode = watermark > 800 ? "exact" : watermark > 520 ? "balanced" : "real-time";
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live simulator",
        title: "kafka-to-warehouse \xB7 drag the watermark",
        meta: `${events.length} events buffered`,
        caption: "Green = on-time. Amber = late. Watermark is the event-time point past which a window is closed and late events are dropped."
      },
      /* @__PURE__ */ React.createElement("div", { className: "wm-stage", ref: stageRef }, /* @__PURE__ */ React.createElement("svg", { className: "wm-svg", viewBox: "0 0 1000 400", preserveAspectRatio: "xMidYMid meet" }, /* @__PURE__ */ React.createElement("line", { x1: 60, y1: 360, x2: 960, y2: 360, stroke: "var(--theme-gray-300)", strokeWidth: 1 }), /* @__PURE__ */ React.createElement("line", { x1: 60, y1: 40, x2: 60, y2: 360, stroke: "var(--theme-gray-300)", strokeWidth: 1 }), /* @__PURE__ */ React.createElement("text", { x: 500, y: 390, textAnchor: "middle", className: "wm-axis-label" }, "event time \u2192"), /* @__PURE__ */ React.createElement("text", { x: 30, y: 200, textAnchor: "middle", transform: "rotate(-90 30 200)", className: "wm-axis-label" }, "session"), [200, 400, 600, 800].map((x) => /* @__PURE__ */ React.createElement("g", { key: x }, /* @__PURE__ */ React.createElement("line", { x1: x, y1: 356, x2: x, y2: 364, stroke: "var(--theme-gray-400)" }), /* @__PURE__ */ React.createElement("text", { x, y: 380, textAnchor: "middle", className: "wm-tick" }, "t\u2212", Math.round((1e3 - x) / 100), "m"))), events.map((e) => {
        const age = (Date.now() - e.born) / 8e3;
        const inc = e.x < watermark;
        return /* @__PURE__ */ React.createElement(
          "circle",
          {
            key: e.id,
            cx: e.x,
            cy: e.y,
            r: 5.5,
            className: e.late ? "wm-dot-late" : "wm-dot-ontime",
            opacity: inc ? 1 - age * 0.7 : 0.22
          }
        );
      }), /* @__PURE__ */ React.createElement("rect", { x: watermark, y: 40, width: 960 - watermark, height: 320, fill: "#F7B928", opacity: 0.1 }), /* @__PURE__ */ React.createElement(
        "text",
        {
          x: (watermark + 960) / 2,
          y: 210,
          textAnchor: "middle",
          style: { fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 800, letterSpacing: "0.12em", fill: "#8B5C00", opacity: 0.55 }
        },
        "DROPPED"
      ), /* @__PURE__ */ React.createElement("g", { style: { cursor: "ew-resize" }, onMouseDown: onDragStart }, /* @__PURE__ */ React.createElement("line", { x1: watermark, y1: 40, x2: watermark, y2: 360, stroke: "var(--theme-blue)", strokeWidth: 3 }), /* @__PURE__ */ React.createElement("line", { x1: watermark, y1: 40, x2: watermark, y2: 360, stroke: "transparent", strokeWidth: 22 }), /* @__PURE__ */ React.createElement("rect", { x: watermark - 9, y: 30, width: 18, height: 18, rx: 3, fill: "var(--theme-blue)" }), /* @__PURE__ */ React.createElement("text", { x: watermark, y: 22, textAnchor: "middle", style: { fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, fill: "var(--theme-blue)", letterSpacing: "0.08em" } }, "WATERMARK: drag")))),
      /* @__PURE__ */ React.createElement("div", { className: "readout-grid" }, /* @__PURE__ */ React.createElement("div", { className: "readout ok" }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Included"), /* @__PURE__ */ React.createElement("div", { className: "r-v" }, included), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, "before watermark")), /* @__PURE__ */ React.createElement("div", { className: "readout warn" }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Late \xB7 dropped"), /* @__PURE__ */ React.createElement("div", { className: "r-v" }, dropped), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, "excluded from window")), /* @__PURE__ */ React.createElement("div", { className: "readout" }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Watermark"), /* @__PURE__ */ React.createElement("div", { className: "r-v" }, "t\u2212", ((1e3 - watermark) / 100).toFixed(1), /* @__PURE__ */ React.createElement("small", null, "m")), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, "event time")), /* @__PURE__ */ React.createElement("div", { className: "readout blue" }, /* @__PURE__ */ React.createElement("div", { className: "r-k" }, "Mode"), /* @__PURE__ */ React.createElement("div", { className: "r-v", style: { fontSize: 17, textTransform: "uppercase" } }, mode), /* @__PURE__ */ React.createElement("div", { className: "r-s" }, mode === "exact" ? "low loss \xB7 high delay" : mode === "balanced" ? "default" : "real-time \xB7 lossy"))),
      /* @__PURE__ */ React.createElement("div", { className: "ctl-row" }, /* @__PURE__ */ React.createElement("div", { className: "ctl-slider", style: { flex: 1.5 } }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Watermark position"), /* @__PURE__ */ React.createElement("span", { className: "val" }, "t\u2212", ((1e3 - watermark) / 100).toFixed(1), "m")), /* @__PURE__ */ React.createElement("input", { type: "range", min: 150, max: 920, step: 5, value: watermark, onChange: (e) => setWatermark(+e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "hint" }, "drag the slider or the blue line above")), /* @__PURE__ */ React.createElement("div", { className: "ctl-slider warn", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "row" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, "Network lateness"), /* @__PURE__ */ React.createElement("span", { className: "val" }, lateness, "%")), /* @__PURE__ */ React.createElement("input", { type: "range", min: 0, max: 60, step: 5, value: lateness, onChange: (e) => setLateness(+e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "hint" }, "% of events arriving late")), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: () => setRunning((r) => !r) }, running ? "\u23F8 Pause stream" : "\u25B6 Resume"))
    );
  }
  function IngestStreams() {
    return /* @__PURE__ */ React.createElement("div", { className: "cards-2" }, /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, "ClickHouse"), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Sampled \xB7 real-time"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "1-in-N rows. Sub-minute freshness. Perfect for ", /* @__PURE__ */ React.createElement("em", null, '"is something on fire?"'), " Never sum raw sample counts and expect truth: always multiply by the sample rate.")), /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, "Snowflake"), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Exact \xB7 batch"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "100% of rows, deterministic. Hours of delay. What you use for finance, policy, and anything a regulator might subpoena.")));
  }
  function Ch1_Ingest({ chapter }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.hex,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: "Ingest: <span class='accent'>where data is born,</span> and what it costs to trust it.",
        hook: "Events are captured live on the edge and land in two places: a <strong>sampled, real-time store</strong> (ClickHouse) for on-call; and an <strong>exact, batch warehouse</strong> (Snowflake) for accounting. The bridge between them is a watermark: a line past which late events are dropped. Drag it wrong and you ship wrong numbers.",
        meta: [
          { k: "Source", v: '<span class="chip">ClickHouse</span><span class="chip">Loggers</span><span class="chip">CDC</span>' },
          { k: "Sink", v: "Snowflake \xB7 Iceberg tables" },
          { k: "Hard problem", v: "late arrivals & clock skew" }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "1.1" }, "Two clocks, one event"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Event time vs processing time."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Every event carries two timestamps. ", /* @__PURE__ */ React.createElement("b", null, "Event time"), " is when it happened: a tap on a phone, an ad impression rendered. ", /* @__PURE__ */ React.createElement("b", null, "Processing time"), " is when your stream actually saw it. Mobile clients, retries, weak cell signal, and simple clock skew make these diverge. Any system that pretends they're the same ships the wrong numbers."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Modern logger tiers (Kafka + Flink CDC) emit events into ClickHouse within ", /* @__PURE__ */ React.createElement("em", null, "seconds"), " of event time; Snowflake lands them as Parquet minutes to hours later. Between those two, the ", /* @__PURE__ */ React.createElement("strong", null, "watermark"), " decides which late events get to join the aggregate and which get dropped.")), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "1.2" }, "The compromise, visualized"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "When do you stop waiting?"), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Drag the blue line. Green dots are on-time events; amber dots arrived late. Anything past the watermark is ", /* @__PURE__ */ React.createElement("em", null, "dropped"), ": gone from Snowflake. Too tight and you lose real data; too loose and dashboards lag by an hour. There is no free correct answer."), /* @__PURE__ */ React.createElement(WatermarkSim, null), /* @__PURE__ */ React.createElement("p", { className: "prose", style: { marginTop: 22 } }, "In production, watermarks are typically ", /* @__PURE__ */ React.createElement("strong", null, "15\u201360 minutes"), " behind real-time: long enough to absorb mobile stragglers, short enough that dashboards feel live. Finance-critical pipelines push the watermark out to hours and accept the delay.")), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "1.3" }, "Two stores, two jobs"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "ClickHouse answers ", /* @__PURE__ */ React.createElement("em", null, '"now"'), ". Snowflake answers ", /* @__PURE__ */ React.createElement("em", null, '"exactly"'), "."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, `The rule is not "pick one." It's `, /* @__PURE__ */ React.createElement("em", null, "use both, and know which question each one answers"), ". ClickHouse is for live debugging, oncall, and broad strokes. Snowflake is for contracts, finance, and any number that has to survive a regulator."), /* @__PURE__ */ React.createElement(IngestStreams, null)), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "1.4" }, "The canonical kafka-to-warehouse SQL"), /* @__PURE__ */ React.createElement("div", { className: "code" }, /* @__PURE__ */ React.createElement("div", { className: "code-head" }, /* @__PURE__ */ React.createElement("span", null, "kafka_to_warehouse_events.sql"), /* @__PURE__ */ React.createElement("span", { className: "lang" }, "Spark")), /* @__PURE__ */ React.createElement("div", { className: "code-body", dangerouslySetInnerHTML: {
      __html: `<span class="tok-k">INSERT OVERWRITE TABLE</span> events_daily <span class="tok-k">PARTITION</span> (ds=<span class="tok-s">'&lt;DATEID&gt;'</span>)
<span class="tok-k">SELECT</span>
  user_id,
  event_name,
  event_time,
  <span class="tok-f">COUNT</span>(*) <span class="tok-k">AS</span> n
<span class="tok-k">FROM</span> clickhouse_events
<span class="tok-k">WHERE</span> event_time <span class="tok-k">BETWEEN</span> <span class="tok-s">'&lt;DATEID&gt;'</span> <span class="tok-k">AND</span> <span class="tok-s">'&lt;DATEID&gt; 23:59:59'</span>
  <span class="tok-k">AND</span> processing_time &lt; <span class="tok-s">'&lt;DATEID+1&gt; 00:30:00'</span>  <span class="tok-c">-- watermark: 30m grace</span>
<span class="tok-k">GROUP BY</span> user_id, event_name, event_time;`
    } }))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      "<b>Summing raw ClickHouse counts without the sample rate.</b> A 1:1000 sample reports 1000\xD7 fewer impressions. Always multiply by <code>sample_rate</code>.",
      "<b>Watermark = now.</b> You'll drop every mobile event that round-trips through a cell tower. Give it at least 15 minutes of grace.",
      "<b>Treating the kafka-to-warehouse pipeline as eventually consistent.</b> It isn't. Once the window closes, late events are <em>gone</em>: no backfill, no retry will save them.",
      "<b>Reading <code>NOW()</code> inside an ingest job.</b> A backfill in May for last Tuesday becomes unreproducible. Use <code>&lt;DATEID&gt;</code>."
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      "Emit <b>both timestamps</b> on every event: <code>event_time</code> (device) and <code>processing_time</code> (server). The gap between them is your watermark budget.",
      "Budget your watermark from the <b>p99 network delay</b> for mobile, not the median. 30 minutes is a sane starting point.",
      'Dashboards that demand real-time: read <b>ClickHouse</b>, annotate them <em>"sampled"</em>. Anything cited in a deck: read <b>Snowflake</b>.'
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      "Every event has two clocks: <b>event time</b> and <b>processing time</b>. Late arrivals live in the gap between them.",
      "The <b>watermark</b> is the price you pay to close a window. Tighter = lossier. Looser = later.",
      "<b>ClickHouse</b> is sampled and fast; <b>Snowflake</b> is exact and slow. Use both: know which question each one answers."
    ] }));
  }
  window.Ch1_Ingest = Ch1_Ingest;
})();
