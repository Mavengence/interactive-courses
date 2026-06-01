// Progress store — XP, checkpoints, lesson completion, streak
(function() {
  const KEY = 'data-infra-course:v1';
  const XP_VALUES = { quiz: 15, terminal: 10, spec: 20, diff: 15, flash: 5 };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function ensure(state, lessonId) {
    state.xp ??= 0;
    state.badges ??= {};
    state.lessons ??= {};
    state.lessons[lessonId] ??= { checkpoints: {}, completed: false };
    return state;
  }

  const Progress = {
    get() { return load(); },
    getXP() { return load().xp || 0; },
    getLesson(id) { const s = load(); ensure(s, id); return s.lessons[id]; },
    isDone(id) { return !!(load().lessons?.[id]?.completed); },
    countCompleted() {
      const s = load();
      return Object.values(s.lessons || {}).filter(l => l.completed).length;
    },
    markCheckpoint(lessonId, cpId, kind = 'quiz') {
      const s = load();
      ensure(s, lessonId);
      if (s.lessons[lessonId].checkpoints[cpId]) return 0;
      s.lessons[lessonId].checkpoints[cpId] = { kind, at: Date.now() };
      const xp = XP_VALUES[kind] || 10;
      s.xp = (s.xp || 0) + xp;
      save(s);
      document.dispatchEvent(new CustomEvent('cc:xp', { detail: { xp, total: s.xp }}));
      return xp;
    },
    markLessonDone(lessonId) {
      const s = load();
      ensure(s, lessonId);
      if (s.lessons[lessonId].completed) return false;
      s.lessons[lessonId].completed = true;
      s.lessons[lessonId].doneAt = Date.now();
      s.xp = (s.xp || 0) + 25;
      save(s);
      document.dispatchEvent(new CustomEvent('cc:lesson-done', { detail: { lessonId }}));
      return true;
    },
    hasCheckpoint(lessonId, cpId) {
      return !!(load().lessons?.[lessonId]?.checkpoints?.[cpId]);
    },
    reset() { localStorage.removeItem(KEY); location.reload(); },
  };
  window.Progress = Progress;
})();
