/* global React, ReactDOM, Hero, SectionLabel, Ch_Overview, Ch0_Fundamentals, Ch1_Ingest, Ch2_Store, Ch3_Compute, Ch4_Orchestrate, Ch5_Serve */

const { useState, useEffect, useRef, useCallback } = React;

const CHAPTERS = [
  { id: 'home',   n: '-',   title: 'Overview',                sub: 'The pipeline, end to end',       time: '3 min',  hex: '#6B7787' },
  { id: 'fund',   n: '00',  title: 'Core Fundamentals',       sub: 'Storage, formats, engines',      time: '8 min',  hex: '#0F1729' },
  { id: 'ingest', n: '01',  title: 'Ingest',                  sub: 'Where data is born',             time: '9 min',  hex: '#7C5CFF' },
  { id: 'stream', n: '02',  title: 'Streaming',                sub: 'The bridge to the warehouse',    time: '7 min',  hex: '#22D3EE' },
  { id: 'store',  n: '03',  title: 'Store',                   sub: 'Where data lives',               time: '8 min',  hex: '#2D7DFF' },
  { id: 'comp',   n: '04',  title: 'Compute',                 sub: 'How data is read',               time: '9 min',  hex: '#FF7A59' },
  { id: 'orch',   n: '05',  title: 'Orchestrate',             sub: 'Airflow & idempotency',          time: '8 min',  hex: '#31A24C' },
  { id: 'qual',   n: '06',  title: 'Quality',                 sub: 'Pipeline ran ≠ number is right', time: '8 min',  hex: '#E41E3F' },
  { id: 'disc',   n: '07',  title: 'Discover',                sub: 'Six shortcuts over four hours',  time: '7 min',  hex: '#B8770A' },
  { id: 'serve',  n: '08',  title: 'Serve',                   sub: 'Metrics & semantic models',      time: '8 min',  hex: '#0091FF' },
  { id: 'gov',    n: '09',  title: 'Govern',                  sub: 'The deploy gate',                time: '7 min',  hex: '#8B5CF6' },
  { id: 'cap',    n: '10',  title: 'Capstone',                sub: 'Build dim_users E2E',            time: '15 min', hex: '#E85D04' },
];

const ACCENTS = [
  { id: 'blue',   hex: '#2D7DFF', name: 'Signal' },
  { id: 'cyan',   hex: '#22D3EE', name: 'Cyan' },
  { id: 'violet', hex: '#7C5CFF', name: 'Violet' },
  { id: 'green',  hex: '#4ADE80', name: 'Mint' },
  { id: 'amber',  hex: '#FFB454', name: 'Amber' },
];

const FONTS = [
  { id: 'geist',   name: 'Geist',         stack: `'Geist', -apple-system, sans-serif` },
  { id: 'space',   name: 'Space Grotesk', stack: `'Space Grotesk', -apple-system, sans-serif` },
  { id: 'general', name: 'General Sans',  stack: `'General Sans', -apple-system, sans-serif` },
];

function Sidebar({ current, setCurrent, progress, collapsed, setCollapsed }) {
  return (
    <aside className={`sb ${collapsed ? 'collapsed' : ''}`}>
      <div className="sb-brand">
        <div className="sb-mark">DE</div>
        {!collapsed && (
          <div className="sb-brand-meta">
            <div className="sb-brand-title">DE Fundamentals</div>
            <div className="sb-brand-sub">Interactive course</div>
          </div>
        )}
        <button
          className="sb-collapse-btn"
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar  ([)' : 'Collapse sidebar  ([)'}
        >
          <span className="sb-collapse-icon" aria-hidden="true">
            {collapsed ? '›' : '‹'}
          </span>
        </button>
      </div>

      {!collapsed && <div className="sb-eyebrow">Course</div>}
      <nav className="sb-nav">
        {CHAPTERS.map((c) => {
          const done = progress[c.id];
          const active = current === c.id;
          return (
            <div key={c.id}
                 className={`sb-item ${active ? 'active' : ''} ${done && !active ? 'done' : ''}`}
                 style={{ '--ch-hex': c.hex }}
                 onClick={() => setCurrent(c.id)}
                 title={collapsed ? `${c.n} · ${c.title} · ${c.time}` : undefined}>
              <div className="sb-num">{c.n}</div>
              {!collapsed && (
                <>
                  <div className="sb-text">
                    <div className="sb-title">{c.title}</div>
                  </div>
                  <div className="sb-time">{c.time}</div>
                </>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function TopBar({ chapter, onPrev, onNext, prevDisabled, nextDisabled }) {
  return (
    <div className="tb">
      <div className="crumb">
        <b>DE Fundamentals</b>
        <span className="sep">/</span>
        <span>Chapter {chapter.n}</span>
        <span className="sep">/</span>
        <span className="here">{chapter.title}</span>
      </div>
      <div className="tb-right">
        <button className="btn" onClick={onPrev} disabled={prevDisabled}>
          ← Prev <span className="kbd">←</span>
        </button>
        <button className="btn btn-primary" onClick={onNext} disabled={nextDisabled}>
          Next → <span className="kbd">→</span>
        </button>
      </div>
    </div>
  );
}

function TweaksPanel({ state, set, onClose }) {
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <div className="tweaks-title">Tweaks</div>
        <div className="btn" style={{padding:'4px 9px', fontSize:11}} onClick={onClose}>Close</div>
      </div>
      <div className="tweaks-body">
        <div className="tw-group">
          <div className="tw-lab">Accent</div>
          <div className="tw-swatch">
            {ACCENTS.map(a => (
              <div key={a.id}
                   className={`tw-chip ${state.accent === a.id ? 'on' : ''}`}
                   style={{ background: a.hex }}
                   onClick={() => set('accent', a.id)}
                   title={a.name} />
            ))}
          </div>
        </div>
        <div className="tw-group">
          <div className="tw-lab">Font</div>
          <div className="tw-opts">
            {FONTS.map(f => (
              <div key={f.id}
                   className={`tw-opt ${state.font === f.id ? 'on' : ''}`}
                   onClick={() => set('font', f.id)}>{f.name}</div>
            ))}
          </div>
        </div>
        <div className="tw-group">
          <div className="tw-lab">Density</div>
          <div className="tw-opts" style={{gridTemplateColumns:'1fr 1fr'}}>
            <div className={`tw-opt ${state.density === 'compact' ? 'on' : ''}`} onClick={() => set('density', 'compact')}>Compact</div>
            <div className={`tw-opt ${state.density === 'comfortable' ? 'on' : ''}`} onClick={() => set('density', 'comfortable')}>Comfy</div>
          </div>
        </div>
        <div className="tw-group">
          <div className="tw-lab">Code theme</div>
          <div className="tw-opts" style={{gridTemplateColumns:'1fr 1fr'}}>
            <div className={`tw-opt ${state.codeTheme === 'color' ? 'on' : ''}`} onClick={() => set('codeTheme', 'color')}>Color</div>
            <div className={`tw-opt ${state.codeTheme === 'mono' ? 'on' : ''}`} onClick={() => set('codeTheme', 'mono')}>Mono</div>
          </div>
        </div>
        <div className="tw-group">
          <div className="tw-lab">Grid opacity · {state.gridOpacity}%</div>
          <input type="range" className="tw-slider"
                 min="20" max="100" step="5" value={state.gridOpacity}
                 onChange={(e) => set('gridOpacity', +e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function App() {
  // EDITMODE tweaks
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "blue",
    "font": "geist",
    "density": "comfortable",
    "codeTheme": "color",
    "gridOpacity": 100
  }/*EDITMODE-END*/;

  const [current, setCurrent] = useState(() => localStorage.getItem('de-course-chap') || 'home');
  const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem('de-course-prog') || '{}'));
  const [internalMode, setInternalMode] = useState(() => localStorage.getItem('de-course-mode') === '1');
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('de-course-rm') === '1');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('de-course-sb') === '1');
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const contentRef = useRef(null);

  // Persist
  useEffect(() => { localStorage.setItem('de-course-chap', current); }, [current]);
  useEffect(() => { localStorage.setItem('de-course-prog', JSON.stringify(progress)); }, [progress]);
  useEffect(() => { localStorage.setItem('de-course-mode', internalMode ? '1' : '0'); }, [internalMode]);
  useEffect(() => { localStorage.setItem('de-course-rm', reduceMotion ? '1' : '0'); }, [reduceMotion]);
  useEffect(() => { localStorage.setItem('de-course-sb', sidebarCollapsed ? '1' : '0'); }, [sidebarCollapsed]);

  // Apply theme attrs to root
  useEffect(() => {
    const r = document.documentElement;
    r.setAttribute('data-accent', tweaks.accent);
    r.setAttribute('data-density', tweaks.density);
    r.setAttribute('data-code-theme', tweaks.codeTheme);
    r.style.setProperty('--grid-opacity', tweaks.gridOpacity / 100);
    const font = FONTS.find(f => f.id === tweaks.font);
    if (font) r.style.setProperty('--font-display', font.stack);
  }, [tweaks]);

  const setTweak = useCallback((k, v) => setTweaks(t => ({ ...t, [k]: v })), []);

  const idx = CHAPTERS.findIndex(c => c.id === current);
  const chapter = CHAPTERS[idx] || CHAPTERS[0];

  // Mark prior chapters as "done" when you advance
  useEffect(() => {
    setProgress(p => {
      const np = { ...p };
      for (let i = 0; i < idx; i++) np[CHAPTERS[i].id] = true;
      return np;
    });
  }, [idx]);

  const goTo = useCallback((id) => {
    setCurrent(id);
    if (contentRef.current) contentRef.current.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  const onPrev = () => goTo(CHAPTERS[Math.max(0, idx - 1)].id);
  const onNext = () => goTo(CHAPTERS[Math.min(CHAPTERS.length - 1, idx + 1)].id);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
      else if (e.key === 'j') window.scrollBy({ top: 120, behavior: 'smooth' });
      else if (e.key === 'k') window.scrollBy({ top: -120, behavior: 'smooth' });
      else if (e.key === 't') setTweaksOpen(v => !v);
      else if (e.key === '[') setSidebarCollapsed(v => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx]);

  // Edit-mode protocol
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      else if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  // Persist tweak edits to disk
  useEffect(() => {
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: tweaks }, '*');
  }, [tweaks]);

  // prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) setReduceMotion(true);
  }, []);

  return (
    <div className={`app ${reduceMotion ? 'reduce-motion' : ''} ${sidebarCollapsed ? 'sb-collapsed' : ''}`}>
      <Sidebar current={current} setCurrent={goTo}
               progress={progress}
               collapsed={sidebarCollapsed}
               setCollapsed={setSidebarCollapsed} />
      <div className="main">
        <TopBar chapter={chapter}
                onPrev={onPrev} onNext={onNext}
                prevDisabled={idx === 0}
                nextDisabled={idx === CHAPTERS.length - 1} />
        <main className="content" ref={contentRef}
              data-screen-label={`${chapter.n} ${chapter.title}`}>
          <ChapterBody id={current} chapter={chapter} internalMode={internalMode} goTo={goTo} reduceMotion={reduceMotion} />
        </main>
      </div>
      {tweaksOpen && <TweaksPanel state={tweaks} set={setTweak} onClose={() => setTweaksOpen(false)} />}
    </div>
  );
}

function ChapterBody({ id, chapter, internalMode, goTo, reduceMotion }) {
  const Comps = {
    home:   window.Ch_Overview,
    fund:   window.Ch0_Fundamentals,
    ingest: window.Ch1_Ingest,
    stream: window.Ch1_5_Streaming,
    store:  window.Ch2_Store,
    comp:   window.Ch3_Compute,
    orch:   window.Ch4_Orchestrate,
    qual:   window.Ch5_Quality,
    disc:   window.Ch6_Discover,
    serve:  window.Ch7_Serve,
    gov:    window.Ch8_Govern,
    cap:    window.Ch9_Capstone,
  };
  const C = Comps[id];
  if (!C) return <div style={{color:'var(--ink-faint)', padding:'40px 0'}}>Chapter not available yet.</div>;
  return <C chapter={chapter} internalMode={internalMode} goTo={goTo} reduceMotion={reduceMotion} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
