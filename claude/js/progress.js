// Shared XP / progress / streak store.
// Exposes window.CourseProgress
(function(){
  const KEY = 'claude-course-v1';
  const DEFAULTS = {
    xp: 0,
    completed: {}, // lessonId -> true
    checkpoints: {}, // lessonId-checkpointId -> true
    badges: {}, // badgeId -> ts
    streak: { days: 0, last: null },
    lastVisit: null,
  };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { return { ...DEFAULTS }; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }
  const listeners = new Set();
  function emit() { listeners.forEach(fn => { try { fn(state); } catch {} }); }

  let state = load();

  // streak calc
  (function bumpStreak(){
    const today = new Date().toISOString().slice(0,10);
    if (state.streak.last === today) return;
    const y = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    if (state.streak.last === y) state.streak.days = (state.streak.days||0) + 1;
    else state.streak.days = 1;
    state.streak.last = today;
    state.lastVisit = today;
    save(state);
  })();

  const api = {
    get() { return state; },
    subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
    addXP(n, reason) {
      state.xp = (state.xp || 0) + n;
      save(state); emit();
      window.dispatchEvent(new CustomEvent('xp-gained', { detail: { amount: n, reason } }));
    },
    completeCheckpoint(lessonId, cpId, xp=10) {
      const key = `${lessonId}-${cpId}`;
      if (state.checkpoints[key]) return false;
      state.checkpoints[key] = true;
      this.addXP(xp, `Completed ${cpId}`);
      return true;
    },
    completeLesson(lessonId, xp=25) {
      if (state.completed[lessonId]) return false;
      state.completed[lessonId] = true;
      this.addXP(xp, `Finished lesson`);
      this.checkBadges();
      return true;
    },
    awardBadge(id) {
      if (state.badges[id]) return false;
      state.badges[id] = Date.now();
      save(state); emit();
      window.dispatchEvent(new CustomEvent('badge-earned', { detail: { id } }));
      return true;
    },
    checkBadges() {
      const done = Object.keys(state.completed).length;
      if (done >= 1) this.awardBadge('first-light');
      if (done >= 3) this.awardBadge('apprentice');
      if (done >= 6) this.awardBadge('journeyman');
      if (done >= 12) this.awardBadge('maestro');
      if (state.streak.days >= 3) this.awardBadge('streak-3');
      if (state.streak.days >= 7) this.awardBadge('streak-7');
    },
    reset() {
      state = { ...DEFAULTS };
      save(state); emit();
    }
  };

  window.CourseProgress = api;
})();
