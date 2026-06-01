const { useState, useEffect, useMemo, useRef } = React;
function parseHash() {
  const h = (window.location.hash || "").replace(/^#\/?/, "");
  if (!h) return { route: "home" };
  const parts = h.split("/");
  if (parts[0] === "m" && parts[1]) {
    if (parts[2] === "l" && parts[3]) {
      return { route: "lesson", moduleId: parts[1], lessonNum: parseInt(parts[3], 10) };
    }
    return { route: "module", moduleId: parts[1] };
  }
  return { route: "home" };
}
function useHashRoute() {
  const [r, setR] = useState(parseHash());
  useEffect(() => {
    const h = () => {
      setR(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return r;
}
const link = {
  home: () => "#/",
  mod: (id) => `#/m/${id}`,
  lesson: (id, n) => `#/m/${id}/l/${n}`
};
function Sidebar({ route, progress }) {
  const totalLessons = MODULES.reduce((a, m) => a + m.lessons_data.length, 0);
  const done = Object.keys(progress).length;
  const pct = Math.round(done / totalLessons * 100);
  return /* @__PURE__ */ React.createElement("aside", { className: "crs-side" }, /* @__PURE__ */ React.createElement("div", { className: "crs-side__brand" }, /* @__PURE__ */ React.createElement("div", { className: "crs-side__edition" }, COURSE_META.cohort), /* @__PURE__ */ React.createElement("div", { className: "crs-side__title" }, COURSE_META.title)), /* @__PURE__ */ React.createElement("a", { href: link.home(), className: "crs-side__home" + (route.route === "home" ? " is-active" : "") }, "Course overview"), /* @__PURE__ */ React.createElement("div", { className: "crs-side__section" }, "Modules"), MODULES.map((m) => {
    const isActive = route.moduleId === m.id;
    return /* @__PURE__ */ React.createElement("a", { key: m.id, href: link.mod(m.id), className: "crs-side__mod" + (isActive ? " is-active" : "") }, /* @__PURE__ */ React.createElement("div", { className: "crs-side__mod-row" }, /* @__PURE__ */ React.createElement("span", { className: "crs-side__mod-code" }, m.code), /* @__PURE__ */ React.createElement("span", { className: "crs-side__mod-name" }, m.name)));
  }), /* @__PURE__ */ React.createElement("div", { className: "crs-side__progress" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "crs-side__progress-num" }, done), " / ", totalLessons, " lessons \xB7 ", pct, "%"), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "crs-side__progress-bar",
      role: "progressbar",
      "aria-label": "Course progress",
      "aria-valuenow": pct,
      "aria-valuemin": 0,
      "aria-valuemax": 100
    },
    /* @__PURE__ */ React.createElement("div", { className: "crs-side__progress-fill", style: { width: pct + "%" } })
  )));
}
function HomeView() {
  const totalLessons = MODULES.reduce((a, m) => a + m.lessons_data.length, 0);
  const totalExercises = MODULES.reduce((a, m) => a + m.lessons_data.filter((l) => l.exercise).length, 0);
  return /* @__PURE__ */ React.createElement("main", { className: "crs-main" }, /* @__PURE__ */ React.createElement("div", { className: "crs-main__inner" }, /* @__PURE__ */ React.createElement("section", { className: "crs-hero" }, /* @__PURE__ */ React.createElement("div", { className: "crs-hero__edition" }, COURSE_META.cohort, " \xB7 Self-paced"), /* @__PURE__ */ React.createElement("h1", { className: "crs-hero__title" }, "The AI-Native", /* @__PURE__ */ React.createElement("br", null), "Operator."), /* @__PURE__ */ React.createElement("p", { className: "crs-hero__sub" }, COURSE_META.subtitle), /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta" }, /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-item" }, /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-num" }, MODULES.length), /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-label" }, "Modules")), /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-item" }, /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-num" }, totalLessons), /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-label" }, "Lessons")), /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-item" }, /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-num" }, totalExercises), /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-label" }, "Exercises")), /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-item" }, /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-num" }, "~14h"), /* @__PURE__ */ React.createElement("div", { className: "crs-hero__meta-label" }, "Total time"))), /* @__PURE__ */ React.createElement("a", { href: link.mod(MODULES[0].id), className: "crs-hero__cta" }, "Begin Module 01 ", /* @__PURE__ */ React.createElement("span", { className: "crs-hero__cta-arrow" }, "\u2192"))), /* @__PURE__ */ React.createElement("div", { className: "crs-section-h" }, "What you will be able to do"), /* @__PURE__ */ React.createElement("h2", { className: "crs-section-title" }, "Outcomes"), /* @__PURE__ */ React.createElement("div", { className: "crs-outcomes" }, COURSE_META.outcomes.map((o, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "crs-outcome" }, /* @__PURE__ */ React.createElement("div", { className: "crs-outcome__num" }, String(i + 1).padStart(2, "0")), /* @__PURE__ */ React.createElement("div", { className: "crs-outcome__txt" }, o)))), /* @__PURE__ */ React.createElement("div", { className: "crs-syllabus-h" }, /* @__PURE__ */ React.createElement("div", { className: "crs-syllabus-h__l" }, "Syllabus"), /* @__PURE__ */ React.createElement("div", { className: "crs-syllabus-h__r" }, "9 modules \xB7 linear or self-directed")), /* @__PURE__ */ React.createElement("div", { className: "crs-mods" }, MODULES.map((m) => /* @__PURE__ */ React.createElement("a", { key: m.id, href: link.mod(m.id), className: "crs-mod-row" }, /* @__PURE__ */ React.createElement("div", { className: "crs-mod-row__code" }, m.code), /* @__PURE__ */ React.createElement("div", { className: "crs-mod-row__body" }, /* @__PURE__ */ React.createElement("h3", { className: "crs-mod-row__name" }, m.name), /* @__PURE__ */ React.createElement("p", { className: "crs-mod-row__tagline" }, m.tagline), /* @__PURE__ */ React.createElement("div", { className: "crs-mod-row__chips" }, /* @__PURE__ */ React.createElement("span", { className: "crs-mod-row__chip" }, m.difficulty), /* @__PURE__ */ React.createElement("span", { className: "crs-mod-row__chip-dot" }), /* @__PURE__ */ React.createElement("span", { className: "crs-mod-row__chip" }, m.lessons_data.length, " lessons"), /* @__PURE__ */ React.createElement("span", { className: "crs-mod-row__chip-dot" }), /* @__PURE__ */ React.createElement("span", { className: "crs-mod-row__chip" }, m.duration))), /* @__PURE__ */ React.createElement("div", { className: "crs-mod-row__arrow" }, "\u2192"))))));
}
function ModuleView({ moduleId }) {
  const m = MODULES.find((x) => x.id === moduleId);
  if (!m) return /* @__PURE__ */ React.createElement(Missing, null);
  const objectives = useMemo(() => {
    return m.lessons_data.filter((l) => l.kind !== "quiz").map((l) => l.objective);
  }, [moduleId]);
  return /* @__PURE__ */ React.createElement("main", { className: "crs-main" }, /* @__PURE__ */ React.createElement("div", { className: "crs-main__inner" }, /* @__PURE__ */ React.createElement("section", { className: "crs-mod-hero" }, /* @__PURE__ */ React.createElement("div", { className: "crs-mod-hero__crumbs" }, /* @__PURE__ */ React.createElement("a", { href: link.home() }, "Course"), " \xA0/\xA0 ", m.code), /* @__PURE__ */ React.createElement("div", { className: "crs-mod-hero__code" }, "Module ", m.code.replace("M", "")), /* @__PURE__ */ React.createElement("h1", { className: "crs-mod-hero__title" }, m.name), /* @__PURE__ */ React.createElement("p", { className: "crs-mod-hero__tag" }, m.tagline), /* @__PURE__ */ React.createElement("div", { className: "crs-mod-hero__meta" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "crs-mod-hero__meta-strong" }, m.lessons_data.length), " lessons"), /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "crs-mod-hero__meta-strong" }, m.duration)), /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", null, m.difficulty))), /* @__PURE__ */ React.createElement("div", { className: "crs-obj" }, /* @__PURE__ */ React.createElement("div", { className: "crs-obj__h" }, "Learning objectives"), /* @__PURE__ */ React.createElement("ul", { className: "crs-obj__list" }, objectives.map((o, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "crs-obj__item" }, /* @__PURE__ */ React.createElement("span", { className: "crs-obj__item-num" }, String(i + 1).padStart(2, "0")), /* @__PURE__ */ React.createElement("span", null, o))))), /* @__PURE__ */ React.createElement("div", { className: "crs-syllabus-h" }, /* @__PURE__ */ React.createElement("div", { className: "crs-syllabus-h__l" }, "Lessons"), /* @__PURE__ */ React.createElement("div", { className: "crs-syllabus-h__r" }, m.lessons_data.length, " \xB7 ", m.duration)), /* @__PURE__ */ React.createElement("div", { className: "crs-lessons" }, m.lessons_data.map((l) => /* @__PURE__ */ React.createElement("a", { key: l.n, href: link.lesson(m.id, l.n), className: "crs-lesson-row" }, /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-row__num" }, m.code.replace("M0", ""), ".", l.n), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-row__icon crs-lesson-row__icon--" + l.kind }, kindGlyph(l.kind)), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-row__title" }, l.title), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-row__dur" }, l.duration)))), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot" }, /* @__PURE__ */ React.createElement("div", null), /* @__PURE__ */ React.createElement("a", { href: link.lesson(m.id, 1), className: "crs-lesson-foot__btn crs-lesson-foot__btn--next" }, /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__dir" }, "Begin \u2192"), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__title" }, m.lessons_data[0].title)))));
}
function kindGlyph(kind) {
  if (kind === "reading") return "R";
  if (kind === "lab") return "L";
  if (kind === "workshop") return "W";
  if (kind === "case") return "C";
  if (kind === "quiz") return "Q";
  return "\xB7";
}
function LessonView({ moduleId, lessonNum, markDone }) {
  const m = MODULES.find((x) => x.id === moduleId);
  if (!m) return /* @__PURE__ */ React.createElement(Missing, null);
  const l = m.lessons_data.find((x) => x.n === lessonNum);
  if (!l) return /* @__PURE__ */ React.createElement(Missing, null);
  const idx = m.lessons_data.findIndex((x) => x.n === lessonNum);
  const prev = idx > 0 ? m.lessons_data[idx - 1] : null;
  const next = idx < m.lessons_data.length - 1 ? m.lessons_data[idx + 1] : null;
  const modIdx = MODULES.findIndex((x) => x.id === moduleId);
  const nextModule = !next && modIdx < MODULES.length - 1 ? MODULES[modIdx + 1] : null;
  useEffect(() => {
    markDone(`${moduleId}/${lessonNum}`);
  }, [moduleId, lessonNum]);
  return /* @__PURE__ */ React.createElement("main", { className: "crs-main" }, /* @__PURE__ */ React.createElement("div", { className: "crs-main__inner" }, /* @__PURE__ */ React.createElement("section", { className: "crs-lesson-hero" }, /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-hero__crumbs" }, /* @__PURE__ */ React.createElement("a", { href: link.home() }, "Course"), /* @__PURE__ */ React.createElement("span", { className: "crs-lesson-hero__crumbs-sep" }, "/"), /* @__PURE__ */ React.createElement("a", { href: link.mod(m.id) }, m.name)), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-hero__num" }, "Lesson ", m.code.replace("M0", ""), ".", l.n), /* @__PURE__ */ React.createElement("h1", { className: "crs-lesson-hero__title" }, l.title), /* @__PURE__ */ React.createElement("p", { className: "crs-lesson-hero__obj" }, l.objective), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-hero__meta" }, /* @__PURE__ */ React.createElement("span", { className: "crs-lesson-hero__kind" }, l.kind), /* @__PURE__ */ React.createElement("span", null, l.duration))), l.kind === "quiz" ? /* @__PURE__ */ React.createElement(Quiz, { questions: l.questions }) : /* @__PURE__ */ React.createElement("article", { className: "crs-prose" }, l.sections && l.sections.map((s, i) => /* @__PURE__ */ React.createElement("section", { key: i }, /* @__PURE__ */ React.createElement("h2", null, s.h), /* @__PURE__ */ React.createElement("p", null, s.p))), l.callout && /* @__PURE__ */ React.createElement(Callout, { c: l.callout }), l.exercise && /* @__PURE__ */ React.createElement(Exercise, { ex: l.exercise, lessonKey: `${moduleId}/${lessonNum}` })), /* @__PURE__ */ React.createElement("nav", { className: "crs-lesson-foot" }, prev ? /* @__PURE__ */ React.createElement("a", { href: link.lesson(m.id, prev.n), className: "crs-lesson-foot__btn" }, /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__dir" }, "\u2190 Previous"), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__title" }, prev.title)) : /* @__PURE__ */ React.createElement("div", null), next ? /* @__PURE__ */ React.createElement("a", { href: link.lesson(m.id, next.n), className: "crs-lesson-foot__btn crs-lesson-foot__btn--next" }, /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__dir" }, "Next \u2192"), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__title" }, next.title)) : nextModule ? /* @__PURE__ */ React.createElement("a", { href: link.mod(nextModule.id), className: "crs-lesson-foot__btn crs-lesson-foot__btn--next" }, /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__dir" }, "Next module \u2192"), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__title" }, nextModule.name)) : /* @__PURE__ */ React.createElement("a", { href: link.home(), className: "crs-lesson-foot__btn crs-lesson-foot__btn--next" }, /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__dir" }, "Course complete \u2192"), /* @__PURE__ */ React.createElement("div", { className: "crs-lesson-foot__title" }, "Return to overview")))));
}
function Callout({ c }) {
  if (c.kind === "quote") {
    return /* @__PURE__ */ React.createElement("aside", { className: "crs-callout crs-callout--quote" }, /* @__PURE__ */ React.createElement("div", { className: "crs-callout__txt" }, '"', c.text, '"'), /* @__PURE__ */ React.createElement("div", { className: "crs-callout__attr" }, c.attr));
  }
  if (c.kind === "spec") {
    return /* @__PURE__ */ React.createElement("aside", { className: "crs-callout crs-callout--spec" }, /* @__PURE__ */ React.createElement("div", { className: "crs-callout__h" }, c.h), /* @__PURE__ */ React.createElement("pre", null, c.lines.map((line, i) => {
      if (line.startsWith("#")) return /* @__PURE__ */ React.createElement("span", { key: i, className: "h" }, line + "\n");
      if (line.startsWith("-")) return /* @__PURE__ */ React.createElement("span", { key: i }, line + "\n");
      return /* @__PURE__ */ React.createElement("span", { key: i }, line + "\n");
    })));
  }
  return /* @__PURE__ */ React.createElement("aside", { className: "crs-callout crs-callout--" + c.kind }, c.h && /* @__PURE__ */ React.createElement("div", { className: "crs-callout__h" }, c.h), /* @__PURE__ */ React.createElement("div", { className: "crs-callout__txt" }, c.text));
}
function Exercise({ ex, lessonKey }) {
  return /* @__PURE__ */ React.createElement("div", { className: "crs-exercise" }, /* @__PURE__ */ React.createElement("div", { className: "crs-exercise__head" }, /* @__PURE__ */ React.createElement("div", { className: "crs-exercise__label" }, "Exercise"), /* @__PURE__ */ React.createElement("div", { className: "crs-exercise__kind" }, ex.kind.replace(/-/g, " "))), /* @__PURE__ */ React.createElement("p", { className: "crs-exercise__prompt" }, ex.prompt), /* @__PURE__ */ React.createElement(ExerciseBody, { ex, lessonKey }));
}
function useLocalStore(key, initial) {
  const fullKey = "course/" + key;
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(fullKey);
      return s ? JSON.parse(s) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(v));
    } catch {
    }
  }, [fullKey, v]);
  return [v, setV];
}
function ExerciseBody({ ex, lessonKey }) {
  const k = ex.kind;
  if (k === "reflect" || k === "audit" || k === "flow-compress" || k === "comp-design" || k === "kpi-pick" || k === "kpi-design" || k === "rubric-build" || k === "context-design" || k === "meeting-audit" || k === "pipeline-design" || k === "team-shape" || k === "spec-builder") {
    return /* @__PURE__ */ React.createElement(ReflectBox, { lessonKey, rows: ex.rows || 4 });
  }
  if (k === "self-rate") return /* @__PURE__ */ React.createElement(SelfRate, { axes: ex.axes, lessonKey });
  if (k === "matrix") return /* @__PURE__ */ React.createElement(MatrixEx, { rows: ex.rows, cols: ex.cols, lessonKey });
  if (k === "plays") return /* @__PURE__ */ React.createElement(Plays, { options: ex.options, minPick: ex.minPick, lessonKey });
  if (k === "fleet-design" || k === "eval-builder" || k === "ladder" || k === "review-template") {
    return /* @__PURE__ */ React.createElement(Slots, { count: ex.slots || 5, lessonKey, kind: k });
  }
  return /* @__PURE__ */ React.createElement(ReflectBox, { lessonKey, rows: 4 });
}
function ReflectBox({ lessonKey, rows }) {
  const [v, setV] = useLocalStore(lessonKey + "/reflect", "");
  return /* @__PURE__ */ React.createElement(
    "textarea",
    {
      rows,
      placeholder: "Type here. Saved locally \u2014 only you see this.",
      value: v,
      onChange: (e) => setV(e.target.value)
    }
  );
}
function SelfRate({ axes, lessonKey }) {
  const [v, setV] = useLocalStore(lessonKey + "/rate", {});
  return /* @__PURE__ */ React.createElement("div", null, axes.map((ax) => /* @__PURE__ */ React.createElement("div", { key: ax.id, className: "crs-rate-row" }, /* @__PURE__ */ React.createElement("div", { className: "crs-rate-row__label" }, ax.label), /* @__PURE__ */ React.createElement("div", { className: "crs-rate-scale" }, ax.anchors.map((a, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      type: "button",
      className: "crs-rate-pill" + (v[ax.id] === i ? " is-on" : ""),
      onClick: () => setV({ ...v, [ax.id]: i })
    },
    a
  ))))));
}
function MatrixEx({ rows, cols, lessonKey }) {
  const [v, setV] = useLocalStore(lessonKey + "/matrix", {});
  return /* @__PURE__ */ React.createElement("div", { className: "crs-matrix-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "crs-matrix" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null), cols.map((c) => /* @__PURE__ */ React.createElement("th", { key: c }, c)))), /* @__PURE__ */ React.createElement("tbody", null, rows.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r, role: "radiogroup", "aria-label": r }, /* @__PURE__ */ React.createElement("td", null, r), cols.map((c, ci) => /* @__PURE__ */ React.createElement("td", { key: c }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "crs-matrix__cell" + (v[r] === ci ? " is-on" : ""),
      role: "radio",
      "aria-checked": v[r] === ci,
      "aria-label": r + " \u2014 " + c,
      onClick: () => setV({ ...v, [r]: ci })
    },
    /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, v[r] === ci ? "\u25CF" : "")
  ))))))));
}
function Plays({ options, minPick, lessonKey }) {
  const [picked, setPicked] = useLocalStore(lessonKey + "/plays", []);
  const toggle = (i) => {
    setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]);
  };
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "crs-plays" }, options.map((o, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      key: i,
      className: "crs-plays__row" + (picked.includes(i) ? " is-on" : ""),
      "aria-pressed": picked.includes(i),
      onClick: () => toggle(i)
    },
    /* @__PURE__ */ React.createElement("span", { className: "crs-plays__check", "aria-hidden": "true" }, picked.includes(i) ? "\u2713" : ""),
    /* @__PURE__ */ React.createElement("span", { className: "crs-plays__txt" }, o)
  ))), minPick && /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)", marginTop: 14, letterSpacing: "0.06em" } }, picked.length, " / ", minPick, " selected ", picked.length >= minPick ? "\xB7 \u2713 commitment locked" : ""));
}
function Slots({ count, lessonKey, kind }) {
  const [v, setV] = useLocalStore(lessonKey + "/slots", Array(count).fill(""));
  const placeholders = {
    "fleet-design": ["Agent A \u2014 role", "Agent B \u2014 role", "Agent C \u2014 role"],
    "eval-builder": ["Test case 1 (typical)", "Test case 2 (typical)", "Test case 3 (typical)", "Test case 4 (adversarial)", "Test case 5 (adversarial)"],
    "ladder": ["L1 \u2014 uses AI for occasional tasks", "L2 \u2014 AI is default first draft", "L3 \u2014 runs agent fleets, builds evals", "L4 \u2014 designs systems for the team"],
    "review-template": ["Slide 1 \u2014 Outcomes this quarter", "Slide 2 \u2014 Metric movement", "Slide 3 \u2014 What worked", "Slide 4 \u2014 Causes of misses", "Slide 5 \u2014 Next quarter's bets"]
  };
  const ph = placeholders[kind] || Array(count).fill("");
  return /* @__PURE__ */ React.createElement("div", null, Array.from({ length: count }, (_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "crs-slot-row" }, /* @__PURE__ */ React.createElement("div", { className: "crs-slot-row__num" }, String(i + 1).padStart(2, "0")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: ph[i] || `Item ${i + 1}`,
      value: v[i] || "",
      onChange: (e) => {
        const nv = [...v];
        nv[i] = e.target.value;
        setV(nv);
      }
    }
  ))));
}
function Quiz({ questions }) {
  const [picks, setPicks] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const allAnswered = questions.every((_, i) => picks[i] !== void 0);
  const score = questions.reduce((a, q, i) => a + (picks[i] === q.correct ? 1 : 0), 0);
  return /* @__PURE__ */ React.createElement("div", { className: "crs-quiz" }, /* @__PURE__ */ React.createElement("p", { className: "crs-quiz__intro" }, "Pick the best answer for each question. You can change your answers before submitting."), questions.map((q, qi) => /* @__PURE__ */ React.createElement("div", { key: qi, className: "crs-q" }, /* @__PURE__ */ React.createElement("div", { className: "crs-q__num" }, "Question ", qi + 1, " of ", questions.length), /* @__PURE__ */ React.createElement("p", { className: "crs-q__txt" }, q.q), /* @__PURE__ */ React.createElement("div", { className: "crs-q__opts", role: "radiogroup", "aria-label": "Answer options for question " + (qi + 1) }, q.options.map((o, oi) => {
    const picked = picks[qi] === oi;
    let cls = "crs-opt";
    if (submitted) {
      if (oi === q.correct) cls += " is-correct";
      else if (picked) cls += " is-wrong";
    } else if (picked) cls += " is-picked";
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        key: oi,
        className: cls,
        role: "radio",
        "aria-checked": picked,
        disabled: submitted,
        onClick: () => !submitted && setPicks({ ...picks, [qi]: oi })
      },
      /* @__PURE__ */ React.createElement("span", { className: "crs-opt__letter" }, String.fromCharCode(65 + oi)),
      /* @__PURE__ */ React.createElement("span", { className: "crs-opt__txt" }, o)
    );
  })))), /* @__PURE__ */ React.createElement("div", { className: "crs-quiz__actions" }, !submitted && /* @__PURE__ */ React.createElement("button", { className: "crs-btn crs-btn--primary", disabled: !allAnswered, onClick: () => setSubmitted(true) }, "Submit answers"), submitted && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "crs-quiz__score " + (score === questions.length ? "crs-quiz__score--good" : score >= questions.length / 2 ? "crs-quiz__score--mid" : "crs-quiz__score--bad") }, score, " / ", questions.length, " correct"), /* @__PURE__ */ React.createElement("button", { className: "crs-btn", onClick: () => {
    setSubmitted(false);
    setPicks({});
  } }, "Try again"))));
}
function Missing() {
  return /* @__PURE__ */ React.createElement("main", { className: "crs-main" }, /* @__PURE__ */ React.createElement("div", { className: "crs-main__inner" }, /* @__PURE__ */ React.createElement("h1", { className: "crs-lesson-hero__title" }, "Not found"), /* @__PURE__ */ React.createElement("p", null, "That page doesn't exist. ", /* @__PURE__ */ React.createElement("a", { href: link.home() }, "Return to course overview."))));
}
function CourseApp() {
  const route = useHashRoute();
  const [progress, setProgress] = useLocalStore("progress", {});
  const markDone = (key) => {
    if (progress[key]) return;
    setProgress({ ...progress, [key]: Date.now() });
  };
  let view;
  if (route.route === "home") view = /* @__PURE__ */ React.createElement(HomeView, null);
  else if (route.route === "module") view = /* @__PURE__ */ React.createElement(ModuleView, { moduleId: route.moduleId });
  else if (route.route === "lesson") view = /* @__PURE__ */ React.createElement(LessonView, { moduleId: route.moduleId, lessonNum: route.lessonNum, markDone });
  else view = /* @__PURE__ */ React.createElement(Missing, null);
  return /* @__PURE__ */ React.createElement("div", { className: "course-app" }, /* @__PURE__ */ React.createElement(Sidebar, { route, progress }), view);
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ React.createElement(CourseApp, null));
