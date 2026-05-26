/* global React, ReactDOM */

const { useState, useEffect, useRef, useCallback } = React;

const CHAPTERS = [
  { id: 'home',    n: '—',  title: 'Overview',                  sub: 'The whole DS loop, animated',      time: '3 min' },
  { id: 'fund',    n: '01', title: 'Fundamentals',              sub: 'Sample vs population, the loop',   time: '7 min' },
  { id: 'explore', n: '02', title: 'Explore',                   sub: 'Distributions · outliers · corr',  time: '8 min' },
  { id: 'clean',   n: '03', title: 'Clean',                     sub: 'Missingness · scaling · leakage',  time: '7 min' },
  { id: 'feature', n: '04', title: 'Feature',                   sub: 'Encoding · interactions · leak',   time: '8 min' },
  { id: 'model',   n: '05', title: 'Model',                     sub: 'Bias/variance live',               time: '9 min' },
  { id: 'eval',    n: '06', title: 'Evaluate',                  sub: 'Confusion · threshold · ROC/PR',   time: '8 min' },
  { id: 'interp',  n: '07', title: 'Interpret',                 sub: 'SHAP · feature importance',        time: '7 min' },
  { id: 'exp',     n: '08', title: 'Experiment',                sub: 'A/B · power · MDE',                time: '9 min' },
  { id: 'causal',  n: '09', title: 'Causal',                    sub: 'DAGs · confounders · backdoors',   time: '8 min' },
  { id: 'peek',    n: '10', title: 'Peeking & CUPED',           sub: 'How p-values lie',                 time: '7 min' },
  { id: 'deploy',  n: '11', title: 'Deploy',                    sub: 'Drift · monitoring · retrain',     time: '7 min' },
  { id: 'cap',     n: '12', title: 'Capstone',                  sub: 'The full loop, end to end',        time: '12 min' },
];

function Sidebar({ current, setCurrent, progress }) {
  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-mark">
          <svg viewBox="0 0 32 32" width="22" height="22">
            <defs>
              <linearGradient id="sbmark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#D1FF3A"/>
                <stop offset="1" stopColor="#FF4DA2"/>
              </linearGradient>
            </defs>
            <path d="M4 22 C 10 6, 22 26, 28 10" stroke="url(#sbmark)" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <circle cx="4" cy="22" r="2.5" fill="#D1FF3A"/>
            <circle cx="28" cy="10" r="2.5" fill="#FF4DA2"/>
          </svg>
        </div>
        <div>
          <div className="sb-brand-title">DS Fundamentals</div>
          <div className="sb-brand-sub">v8 · polished + animated</div>
        </div>
      </div>

      <div className="sb-eyebrow">Curriculum</div>
      <nav className="sb-nav">
        {CHAPTERS.map((c) => {
          const done = progress[c.id];
          const active = current === c.id;
          return (
            <div key={c.id}
                 className={`sb-item ${active ? 'active' : ''} ${done && !active ? 'done' : ''}`}
                 onClick={() => setCurrent(c.id)}>
              <div className="sb-num">{c.n}</div>
              <div className="sb-mid">
                <div className="sb-title">{c.title}</div>
                <div className="sb-sub">{c.sub}</div>
              </div>
              <div className="sb-time">{c.time}</div>
            </div>
          );
        })}
      </nav>

      <div className="sb-foot">
        <div className="sb-foot-lab">Built for the</div>
        <div className="sb-foot-name">class of 2026</div>
      </div>
    </aside>
  );
}

function TopBar({ chapter, onPrev, onNext, prevDisabled, nextDisabled }) {
  return (
    <div className="tb">
      <div className="crumb">
        <b>DS Fundamentals</b>
        <span className="sep">/</span>
        <span>Ch {chapter.n}</span>
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

function App() {
  const [current, setCurrent] = useState(() => {
    if (new URL(location.href).searchParams.has('reset')) {
      localStorage.removeItem('ds-v8-chap');
      localStorage.removeItem('ds-v8-prog');
      return 'home';
    }
    return localStorage.getItem('ds-v8-chap') || 'home';
  });
  const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem('ds-v8-prog') || '{}'));
  const contentRef = useRef(null);

  useEffect(() => { localStorage.setItem('ds-v8-chap', current); }, [current]);
  useEffect(() => { localStorage.setItem('ds-v8-prog', JSON.stringify(progress)); }, [progress]);

  const idx = Math.max(0, CHAPTERS.findIndex(c => c.id === current));
  const chapter = CHAPTERS[idx];

  const goTo = useCallback((id) => {
    setCurrent(id);
    if (contentRef.current) contentRef.current.scrollTop = 0;
    setProgress(p => ({ ...p, [current]: true }));
  }, [current]);

  const goNext = useCallback(() => { if (idx < CHAPTERS.length - 1) goTo(CHAPTERS[idx + 1].id); }, [idx, goTo]);
  const goPrev = useCallback(() => { if (idx > 0) goTo(CHAPTERS[idx - 1].id); }, [idx, goTo]);

  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [goNext, goPrev]);

  return (
    <div className="app">
      <Sidebar current={current} setCurrent={goTo} progress={progress} />
      <div className="main">
        <TopBar chapter={chapter}
                onPrev={goPrev} onNext={goNext}
                prevDisabled={idx === 0} nextDisabled={idx === CHAPTERS.length - 1} />
        <main className="content" ref={contentRef}
              data-screen-label={`${chapter.n} ${chapter.title}`}>
          <ChapterBody id={current} chapter={chapter} goTo={goTo} />
        </main>
      </div>
    </div>
  );
}

function ChapterBody({ id, chapter, goTo }) {
  const Comps = {
    home:    window.Ch_Overview,
    fund:    window.Ch01_Fundamentals,
    explore: window.Ch02_Explore,
    clean:   window.Ch03_Clean,
    feature: window.Ch04_Feature,
    model:   window.Ch05_Model,
    eval:    window.Ch06_Evaluate,
    interp:  window.Ch07_Interpret,
    exp:     window.Ch08_Experiment,
    causal:  window.Ch09_Causal,
    peek:    window.Ch10_Peeking,
    deploy:  window.Ch11_Deploy,
    cap:     window.Ch12_Capstone,
  };
  const C = Comps[id];
  if (!C) {
    return (
      <div className="chap-placeholder">
        <div className="chap-placeholder-eyebrow">Chapter {chapter.n}</div>
        <div className="chap-placeholder-title">{chapter.title}</div>
        <div className="chap-placeholder-sub">Coming soon.</div>
      </div>
    );
  }
  return <C chapter={chapter} goTo={goTo} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
