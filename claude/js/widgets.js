const { useState, useRef, useEffect, useMemo, useCallback, Fragment } = React;
async function callClaude(promptOrMessages, systemPrompt) {
  try {
    const arg = typeof promptOrMessages === "string" ? promptOrMessages : { messages: promptOrMessages, ...systemPrompt ? { system: systemPrompt } : {} };
    const res = await window.claude.complete(arg);
    return res;
  } catch (e) {
    return `[[error calling Claude: ${e.message || e}]]`;
  }
}
function Dots() {
  return /* @__PURE__ */ React.createElement("span", { className: "dots" }, /* @__PURE__ */ React.createElement("span", null), /* @__PURE__ */ React.createElement("span", null), /* @__PURE__ */ React.createElement("span", null));
}
function RunConsole({ loading, output, onClear, label = "claude's output", emptyHint = "Output will appear here.", tone = "default", height = 320, extraMeta = null, children = null }) {
  const bodyRef = useRef(null);
  const open = !!(loading || output || children);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [output, loading]);
  if (!open) return null;
  const copy = () => {
    try {
      navigator.clipboard.writeText(output || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
    }
  };
  const wc = (output || "").trim() ? output.trim().split(/\s+/).length : 0;
  return /* @__PURE__ */ React.createElement("div", { className: `run-console open tone-${tone}`, style: { "--rc-h": `${height}px` } }, /* @__PURE__ */ React.createElement("div", { className: "rc-bar" }, /* @__PURE__ */ React.createElement("div", { className: "rc-label" }, /* @__PURE__ */ React.createElement("span", { className: "rc-dot", "data-state": loading ? "loading" : output ? "done" : "idle" }), /* @__PURE__ */ React.createElement("span", null, label), loading && /* @__PURE__ */ React.createElement("span", { className: "rc-stream-note" }, "streaming", /* @__PURE__ */ React.createElement(Dots, null)), !loading && output && /* @__PURE__ */ React.createElement("span", { className: "rc-meta" }, wc, " words"), extraMeta), /* @__PURE__ */ React.createElement("div", { className: "rc-actions" }, output && !loading && /* @__PURE__ */ React.createElement("button", { type: "button", className: "rc-btn", onClick: copy, title: "Copy output" }, copied ? "\u2713 copied" : "copy"), !loading && onClear && (output || children) && /* @__PURE__ */ React.createElement("button", { type: "button", className: "rc-btn rc-btn-close", onClick: onClear, title: "Dismiss" }, "\xD7"))), /* @__PURE__ */ React.createElement("div", { ref: bodyRef, className: "rc-body" }, children ? children : output ? /* @__PURE__ */ React.createElement("div", { className: "rc-text" }, output, loading && /* @__PURE__ */ React.createElement("span", { className: "rc-cursor" })) : loading ? /* @__PURE__ */ React.createElement("div", { className: "rc-loading" }, /* @__PURE__ */ React.createElement(Dots, null), " ", /* @__PURE__ */ React.createElement("span", { className: "small muted", style: { marginLeft: 8 } }, "asking claude\u2026")) : /* @__PURE__ */ React.createElement("div", { className: "rc-empty small muted" }, emptyHint)));
}
function CheckpointFooter({ lessonId, cpId, xp = 10, label = "Mark complete", onDone }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const s = window.CourseProgress.get();
    if (s.checkpoints[`${lessonId}-${cpId}`]) setDone(true);
  }, [lessonId, cpId]);
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 14 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      className: `btn sm ${done ? "" : "primary"}`,
      disabled: done,
      onClick: () => {
        const newly = window.CourseProgress.completeCheckpoint(lessonId, cpId, xp);
        setDone(true);
        if (newly && onDone) onDone();
      }
    },
    done ? "\u2713 Completed" : `${label} \xB7 +${xp} XP`
  ));
}
function PromptSandbox({ lessonId, cpId, starter = "", system = "", placeholder = "Type a prompt\u2026", title = "Prompt sandbox", hint, minChars = 10 }) {
  const [v, setV] = useState(starter);
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const run = async () => {
    if (!v.trim()) return;
    setLoading(true);
    setOut("");
    const r = await callClaude(v, system || void 0);
    setOut(r);
    setLoading(false);
    if (v.length >= minChars && cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 10);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card", "data-widget": "sandbox" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "try it"), /* @__PURE__ */ React.createElement("h3", null, title)), /* @__PURE__ */ React.createElement("span", { className: "chip amber" }, "live claude")), hint && /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginBottom: 12 } }, hint), /* @__PURE__ */ React.createElement("textarea", { rows: 5, value: v, onChange: (e) => setV(e.target.value), placeholder }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 } }, /* @__PURE__ */ React.createElement("span", { className: "tiny" }, v.length, " chars"), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: run, disabled: loading || !v.trim() }, loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Running ", /* @__PURE__ */ React.createElement(Dots, null)) : "Run prompt \u2192")), /* @__PURE__ */ React.createElement(
    RunConsole,
    {
      loading,
      output: out,
      onClear: () => setOut(""),
      emptyHint: "Output appears here."
    }
  ));
}
function PromptCompare({ lessonId, cpId, weak, strong, task = "Write a launch email for our new authentication service." }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    setA("");
    setB("");
    const [ra, rb] = await Promise.all([callClaude(weak), callClaude(strong)]);
    setA(ra);
    setB(rb);
    setLoading(false);
    if (cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 15);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "compare"), /* @__PURE__ */ React.createElement("h3", null, "Run both, see the gap")), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: run, disabled: loading }, loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Running both ", /* @__PURE__ */ React.createElement(Dots, null)) : "Run both \u2192")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { color: "var(--bad-ink)" } }, "weak prompt"), /* @__PURE__ */ React.createElement("pre", { className: "code", style: { marginTop: 6, maxHeight: 150, overflowY: "auto", fontSize: ".78rem", whiteSpace: "pre-wrap", wordBreak: "break-word" } }, weak), /* @__PURE__ */ React.createElement(
    RunConsole,
    {
      loading,
      output: a,
      onClear: () => setA(""),
      label: "weak output",
      tone: "bad",
      height: 220,
      emptyHint: "Output appears here."
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { color: "var(--ok-ink)" } }, "strong prompt"), /* @__PURE__ */ React.createElement("pre", { className: "code", style: { marginTop: 6, maxHeight: 150, overflowY: "auto", fontSize: ".78rem", whiteSpace: "pre-wrap", wordBreak: "break-word" } }, strong), /* @__PURE__ */ React.createElement(
    RunConsole,
    {
      loading,
      output: b,
      onClear: () => setB(""),
      label: "strong output",
      tone: "ok",
      height: 220,
      emptyHint: "Output appears here."
    }
  ))));
}
function PromptGrader({ lessonId, cpId, task, rubric }) {
  const [v, setV] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const grade = async () => {
    if (v.trim().length < 20) return;
    setLoading(true);
    setResult(null);
    const sys = `You are a strict prompt engineering coach. You grade prompts against this rubric:
${rubric}

Respond ONLY with minified JSON of shape: {"score": 0-100, "strengths": ["..."], "weaknesses": ["..."], "oneBetterRewrite": "..."}. No markdown, no code fences, no prose outside the JSON.`;
    const r = await callClaude(`Task the prompt is trying to accomplish: ${task}

USER PROMPT TO GRADE:
"""
${v}
"""`, sys);
    try {
      const j = JSON.parse(r.replace(/^```json\n?|\n?```$/g, "").trim());
      setResult(j);
      if (j.score >= 80) window.CourseProgress.awardBadge("good-prompter");
      if (cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 20);
    } catch {
      setResult({ raw: r });
    }
    setLoading(false);
  };
  const score = result?.score ?? 0;
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "challenge"), /* @__PURE__ */ React.createElement("h3", null, "Let Claude grade your prompt")), /* @__PURE__ */ React.createElement("span", { className: "chip" }, "rubric loaded")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".9rem", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("b", null, "The task:"), " ", task), /* @__PURE__ */ React.createElement("textarea", { rows: 6, value: v, onChange: (e) => setV(e.target.value), placeholder: "Write your best prompt for that task\u2026" }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 } }, /* @__PURE__ */ React.createElement("span", { className: "tiny" }, v.length, " chars \xB7 min 20"), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: grade, disabled: loading || v.trim().length < 20 }, loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Grading ", /* @__PURE__ */ React.createElement(Dots, null)) : "Grade my prompt \u2192")), /* @__PURE__ */ React.createElement(
    RunConsole,
    {
      loading,
      output: result ? " " : "",
      onClear: () => setResult(null),
      label: result && typeof result.score === "number" ? `graded \xB7 ${result.score}/100` : "judge's verdict",
      tone: result && result.score >= 80 ? "ok" : result && result.score >= 50 ? "amber" : result && typeof result.score === "number" ? "bad" : "default",
      height: 280,
      emptyHint: "Submit a prompt to get a graded breakdown."
    },
    result ? /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" } }, /* @__PURE__ */ React.createElement(ScoreDial, { score }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".9rem" } }, result.strengths && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { color: "var(--ok-ink)" } }, "strengths"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0 18px", padding: 0 } }, result.strengths.map((x, i) => /* @__PURE__ */ React.createElement("li", { key: i }, x)))), result.weaknesses && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { color: "var(--bad-ink)" } }, "weaknesses"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0 18px", padding: 0 } }, result.weaknesses.map((x, i) => /* @__PURE__ */ React.createElement("li", { key: i }, x)))), result.oneBetterRewrite && /* @__PURE__ */ React.createElement("details", { style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontWeight: 600 } }, "See a stronger rewrite"), /* @__PURE__ */ React.createElement("pre", { className: "code", style: { marginTop: 8, whiteSpace: "pre-wrap" } }, result.oneBetterRewrite)), result.raw && /* @__PURE__ */ React.createElement("div", { className: "small muted" }, "Couldn't parse response. Raw: ", /* @__PURE__ */ React.createElement("pre", { style: { whiteSpace: "pre-wrap", fontSize: ".8rem" } }, result.raw)))) : loading ? /* @__PURE__ */ React.createElement("div", { className: "rc-loading" }, /* @__PURE__ */ React.createElement(Dots, null), " ", /* @__PURE__ */ React.createElement("span", { className: "small muted", style: { marginLeft: 8 } }, "grading against the rubric\u2026")) : null
  ));
}
function ScoreDial({ score }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = pct / 100 * c;
  const color = pct >= 80 ? "var(--ok)" : pct >= 50 ? "var(--amber-ink)" : "var(--bad)";
  return /* @__PURE__ */ React.createElement("svg", { width: 110, height: 110, viewBox: "0 0 110 110" }, /* @__PURE__ */ React.createElement("circle", { cx: 55, cy: 55, r, fill: "none", stroke: "var(--rule)", strokeWidth: 8 }), /* @__PURE__ */ React.createElement(
    "circle",
    {
      cx: 55,
      cy: 55,
      r,
      fill: "none",
      stroke: color,
      strokeWidth: 8,
      strokeLinecap: "round",
      strokeDasharray: `${dash} ${c}`,
      transform: "rotate(-90 55 55)",
      style: { transition: "stroke-dasharray .6s ease" }
    }
  ), /* @__PURE__ */ React.createElement("text", { x: 55, y: 52, textAnchor: "middle", fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, fill: "var(--ink)" }, pct), /* @__PURE__ */ React.createElement("text", { x: 55, y: 70, textAnchor: "middle", fontFamily: "var(--mono)", fontSize: 9, fill: "var(--ink-3)", letterSpacing: 1 }, "SCORE"));
}
function Quiz({ lessonId, cpId, question, options, correct, explanation }) {
  const [pick, setPick] = useState(null);
  const [show, setShow] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (pick === null) return;
    setShow(true);
    const correctIdx2 = Array.isArray(correct) ? correct[0] : correct;
    if (pick === correctIdx2 && cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 10);
    setLoading(true);
    const sys = "You give brief, kind, concrete feedback on a multiple-choice answer. 2 sentences max.";
    const r = await callClaude(`Question: ${question}
Options: ${options.map((o, i) => `(${i}) ${o}`).join(" / ")}
Correct: ${options[correctIdx2]}
Student picked: ${options[pick]}

Give kind, concrete feedback in 2 sentences explaining why the correct answer is best.`, sys);
    setAiFeedback(r);
    setLoading(false);
  };
  const correctIdx = Array.isArray(correct) ? correct[0] : correct;
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "quick check"), /* @__PURE__ */ React.createElement("h3", { style: { marginBottom: 14 } }, question), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, options.map((opt, i) => {
    const isCorrect = show && i === correctIdx;
    const isWrong = show && pick === i && i !== correctIdx;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        onClick: () => !show && setPick(i),
        disabled: show,
        style: {
          textAlign: "left",
          padding: "12px 14px",
          borderRadius: 10,
          cursor: show ? "default" : "pointer",
          border: `1px solid ${isCorrect ? "var(--ok)" : isWrong ? "var(--bad)" : pick === i ? "var(--amber-ink)" : "var(--rule-2)"}`,
          background: isCorrect ? "color-mix(in oklch, var(--ok) 12%, var(--paper))" : isWrong ? "color-mix(in oklch, var(--bad) 12%, var(--paper))" : pick === i ? "var(--amber-wash)" : "var(--paper)",
          fontFamily: "var(--sans)",
          fontSize: ".95rem",
          color: "var(--ink)"
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--ink-3)", marginRight: 10 } }, String.fromCharCode(65 + i)),
      opt,
      isCorrect && /* @__PURE__ */ React.createElement("span", { style: { float: "right", color: "var(--ok-ink)" } }, "\u2713"),
      isWrong && /* @__PURE__ */ React.createElement("span", { style: { float: "right", color: "var(--bad-ink)" } }, "\u2717")
    );
  })), !show ? /* @__PURE__ */ React.createElement("button", { className: "btn primary", style: { marginTop: 14 }, onClick: submit, disabled: pick === null }, "Submit answer") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, padding: "12px 14px", background: "var(--paper-2)", borderRadius: 10, fontSize: ".9rem", lineHeight: 1.55 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 6 } }, "explanation"), explanation), /* @__PURE__ */ React.createElement(
    RunConsole,
    {
      loading,
      output: aiFeedback,
      onClear: () => setAiFeedback(""),
      label: "claude's feedback on your pick",
      height: 140,
      emptyHint: "Personal feedback appears here."
    }
  )));
}
function FillBlank({ lessonId, cpId, template, blanks, goal }) {
  const [vals, setVals] = useState(blanks.map(() => ""));
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const preview = template.replace(/\{\{(\d+)\}\}/g, (_, i) => vals[+i] ? `**${vals[+i]}**` : `____`);
  const check = async () => {
    setLoading(true);
    const filled = template.replace(/\{\{(\d+)\}\}/g, (_, i) => vals[+i] || "____");
    const sys = "You coach prompt writers. In \u22642 sentences, say if the filled-in prompt will work well and what to improve. Be concrete.";
    const r = await callClaude(`Goal: ${goal}

Filled prompt:
${filled}`, sys);
    setFeedback(r);
    setLoading(false);
    if (cpId && vals.every((v) => v.trim().length > 2)) window.CourseProgress.completeCheckpoint(lessonId, cpId, 10);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "drill"), /* @__PURE__ */ React.createElement("h3", { style: { marginBottom: 8 } }, "Fill in the prompt"), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("b", null, "Goal:"), " ", goal), /* @__PURE__ */ React.createElement("pre", { className: "code", style: { whiteSpace: "pre-wrap", marginBottom: 14 } }, preview), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr", gap: 10 } }, blanks.map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" } }, /* @__PURE__ */ React.createElement("label", { className: "tiny" }, b.label), /* @__PURE__ */ React.createElement("input", { type: "text", value: vals[i], onChange: (e) => setVals(vals.map((v, j) => j === i ? e.target.value : v)), placeholder: b.hint })))), /* @__PURE__ */ React.createElement("button", { className: "btn primary", style: { marginTop: 12 }, onClick: check, disabled: loading || vals.some((v) => !v.trim()) }, loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Checking ", /* @__PURE__ */ React.createElement(Dots, null)) : "Have Claude check it \u2192"), /* @__PURE__ */ React.createElement(
    RunConsole,
    {
      loading,
      output: feedback,
      onClear: () => setFeedback(""),
      label: "claude's check",
      height: 140,
      tone: "amber",
      emptyHint: "Fill the blanks, then ask Claude to check."
    }
  ));
}
function RewriteArena({ lessonId, cpId, original, task, criteria }) {
  const [v, setV] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const judge = async () => {
    if (v.trim().length < 20) return;
    setLoading(true);
    setRes(null);
    const sys = `You are a prompt engineering judge. Compare ORIGINAL vs USER REWRITE against the criteria: ${criteria}. Respond ONLY with minified JSON: {"winner":"user"|"original"|"tie", "why":"1 sentence", "userScore":0-100, "originalScore":0-100}. No markdown.`;
    const r = await callClaude(`TASK: ${task}

ORIGINAL:
${original}

USER REWRITE:
${v}`, sys);
    try {
      const j = JSON.parse(r.replace(/^```json\n?|\n?```$/g, "").trim());
      setRes(j);
      if (cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 15);
    } catch {
      setRes({ raw: r });
    }
    setLoading(false);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "arena"), /* @__PURE__ */ React.createElement("h3", { style: { marginBottom: 8 } }, "Rewrite this prompt \u2014 beat the original"), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("b", null, "Task:"), " ", task), /* @__PURE__ */ React.createElement("div", { className: "tiny" }, "the original (weak)"), /* @__PURE__ */ React.createElement("pre", { className: "code", style: { marginTop: 6, marginBottom: 14, fontSize: ".8rem" } }, original), /* @__PURE__ */ React.createElement("div", { className: "tiny" }, "your rewrite"), /* @__PURE__ */ React.createElement("textarea", { rows: 6, value: v, onChange: (e) => setV(e.target.value), placeholder: "Rewrite it. Make it structured, specific, and unambiguous." }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center", gap: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { className: "tiny", style: { flex: "1 1 240px", minWidth: 0 } }, "Judged on: ", criteria), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: judge, disabled: loading || v.trim().length < 20 }, loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Judging ", /* @__PURE__ */ React.createElement(Dots, null)) : "Enter the arena \u2192")), /* @__PURE__ */ React.createElement(
    RunConsole,
    {
      loading,
      output: res ? " " : "",
      onClear: () => setRes(null),
      label: res && res.winner === "user" ? "you won" : res && res.winner === "tie" ? "tie" : res && res.winner === "original" ? "original wins" : "verdict",
      tone: res && res.winner === "user" ? "ok" : res && res.winner === "original" ? "bad" : res && res.winner === "tie" ? "amber" : "default",
      height: 220,
      emptyHint: "Submit your rewrite to see the verdict."
    },
    res ? /* @__PURE__ */ React.createElement(React.Fragment, null, res.winner && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "tiny" }, "verdict"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--serif)", fontSize: "1.3rem", fontWeight: 700, marginTop: 4 } }, res.winner === "user" ? "\u{1F3C6} Your rewrite wins" : res.winner === "tie" ? "\u{1F91D} Tie" : "\u{1F9F1} Original still stronger")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right", fontSize: ".9rem" } }, /* @__PURE__ */ React.createElement("div", null, "you: ", /* @__PURE__ */ React.createElement("b", null, res.userScore)), /* @__PURE__ */ React.createElement("div", null, "og: ", /* @__PURE__ */ React.createElement("b", { style: { color: "var(--ink-3)" } }, res.originalScore)))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontSize: ".9rem", lineHeight: 1.5 } }, res.why || res.raw)) : loading ? /* @__PURE__ */ React.createElement("div", { className: "rc-loading" }, /* @__PURE__ */ React.createElement(Dots, null), " ", /* @__PURE__ */ React.createElement("span", { className: "small muted", style: { marginLeft: 8 } }, "judge weighing in\u2026")) : null
  ));
}
function DragReorder({ lessonId, cpId, blocks, correctOrder, prompt }) {
  const [order, setOrder] = useState(() => [...blocks].sort(() => Math.random() - 0.5));
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragId = useRef(null);
  const move = (from, to) => {
    const n = [...order];
    const [it] = n.splice(from, 1);
    n.splice(to, 0, it);
    setOrder(n);
    setChecked(false);
  };
  const check = () => {
    const ok2 = order.every((b, i) => b.id === correctOrder[i]);
    setOk(ok2);
    setChecked(true);
    if (ok2 && cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 15);
  };
  const nudge = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    move(i, j);
  };
  const reshuffle = () => {
    setOrder([...blocks].sort(() => Math.random() - 0.5));
    setChecked(false);
    setOk(false);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "order the sections"), /* @__PURE__ */ React.createElement("h3", { style: { marginBottom: 6 } }, prompt), /* @__PURE__ */ React.createElement("p", { className: "small muted" }, "Drag a card, or use the \u2191 \u2193 buttons. A strong prompt reads top-to-bottom: role \u2192 context \u2192 task \u2192 constraints \u2192 examples \u2192 format.")), /* @__PURE__ */ React.createElement("button", { className: "btn ghost small", onClick: reshuffle, style: { flexShrink: 0 } }, "\u21BB Shuffle")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, position: "relative" } }, order.map((b, i) => {
    const correct = checked && b.id === correctOrder[i];
    const wrong = checked && b.id !== correctOrder[i];
    const isDragging = dragIdx === i;
    const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: b.id,
        draggable: true,
        onDragStart: (e) => {
          dragId.current = i;
          setDragIdx(i);
          e.dataTransfer.effectAllowed = "move";
        },
        onDragEnd: () => {
          dragId.current = null;
          setDragIdx(null);
          setOverIdx(null);
        },
        onDragOver: (e) => {
          e.preventDefault();
          setOverIdx(i);
        },
        onDragLeave: () => {
          if (overIdx === i) setOverIdx(null);
        },
        onDrop: () => {
          if (dragId.current !== null && dragId.current !== i) move(dragId.current, i);
          dragId.current = null;
          setDragIdx(null);
          setOverIdx(null);
        },
        style: {
          display: "grid",
          gridTemplateColumns: "28px 20px 1fr auto",
          gap: 12,
          alignItems: "center",
          padding: "12px 14px",
          borderRadius: 10,
          border: `1px solid ${correct ? "var(--ok)" : wrong ? "var(--bad)" : isOver ? "var(--amber-ink)" : "var(--rule-2)"}`,
          background: correct ? "color-mix(in oklch, var(--ok) 10%, var(--paper))" : wrong ? "color-mix(in oklch, var(--bad) 10%, var(--paper))" : isOver ? "var(--amber-wash)" : "var(--paper-2)",
          boxShadow: isOver ? "0 0 0 2px color-mix(in oklch, var(--amber-ink) 30%, transparent)" : "none",
          opacity: isDragging ? 0.4 : 1,
          transform: isDragging ? "scale(0.98)" : "scale(1)",
          transition: "background .15s, border-color .15s, transform .15s, opacity .15s, box-shadow .15s",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: {
        width: 26,
        height: 26,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: correct ? "var(--ok)" : wrong ? "var(--bad)" : "var(--paper)",
        color: correct || wrong ? "var(--paper)" : "var(--ink-2)",
        border: correct || wrong ? "none" : "1px solid var(--rule-2)",
        fontFamily: "var(--mono)",
        fontSize: ".78rem",
        fontWeight: 700
      } }, i + 1),
      /* @__PURE__ */ React.createElement("div", { "aria-hidden": true, style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        opacity: 0.45,
        cursor: "grab"
      } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2 } }, /* @__PURE__ */ React.createElement(Dot, null), /* @__PURE__ */ React.createElement(Dot, null)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2 } }, /* @__PURE__ */ React.createElement(Dot, null), /* @__PURE__ */ React.createElement(Dot, null)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 2 } }, /* @__PURE__ */ React.createElement(Dot, null), /* @__PURE__ */ React.createElement(Dot, null))),
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, fontSize: ".95rem", letterSpacing: "-0.005em" } }, b.label), /* @__PURE__ */ React.createElement("div", { className: "small muted", style: { marginTop: 2, lineHeight: 1.45 } }, b.sample)),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            nudge(i, -1);
          },
          disabled: i === 0,
          title: "Move up",
          "aria-label": "Move up",
          style: nudgeBtn(i === 0)
        },
        "\u2191"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            nudge(i, 1);
          },
          disabled: i === order.length - 1,
          title: "Move down",
          "aria-label": "Move down",
          style: nudgeBtn(i === order.length - 1)
        },
        "\u2193"
      ))
    );
  })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 14, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { className: "small", style: { color: checked ? ok ? "var(--ok-ink)" : "var(--bad-ink)" : "var(--ink-3)", fontWeight: checked ? 600 : 400 } }, checked ? ok ? "\u2713 Perfect \u2014 that's the template." : "\u2717 Not quite. Green rows are in the right place." : "Order them, then check."), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: check }, "Check order")));
}
function Dot() {
  return /* @__PURE__ */ React.createElement("span", { style: { width: 3, height: 3, borderRadius: "50%", background: "var(--ink-3)", display: "block" } });
}
function nudgeBtn(disabled) {
  return {
    width: 24,
    height: 22,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--paper)",
    border: "1px solid var(--rule-2)",
    borderRadius: 5,
    color: disabled ? "var(--ink-4, #c8beb0)" : "var(--ink-2)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: ".72rem",
    lineHeight: 1,
    fontFamily: "var(--mono)",
    opacity: disabled ? 0.35 : 1,
    transition: "background .12s, color .12s"
  };
}
function SocraticTutor({ lessonId, cpId, topic, persona }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState(0);
  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 9e6);
  }, [messages, loading]);
  const systemPrompt = `You are a Socratic tutor for professionals learning Claude. Topic: ${topic}. ${persona || ""}
Rules:
- Respond in 2-4 short sentences.
- Ask a pointed follow-up question to probe understanding.
- Never dump all the answers. Guide.
- Tone: crisp, direct, professional voice.`;
  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    const r = await callClaude(newMsgs, systemPrompt);
    setMessages([...newMsgs, { role: "assistant", content: r }]);
    setLoading(false);
    setExchanges((x) => {
      const n = x + 1;
      if (n >= 3 && cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 15);
      return n;
    });
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card", style: { padding: 0, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 20px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "tutor mode"), /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "1.1rem" } }, "Chat with your topic tutor")), /* @__PURE__ */ React.createElement("span", { className: "chip amber" }, "socratic")), /* @__PURE__ */ React.createElement("div", { ref: scrollRef, style: { height: 320, overflowY: "auto", padding: "18px 20px", background: "var(--paper-2)", display: "flex", flexDirection: "column", gap: 12 } }, messages.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "small muted", style: { fontStyle: "italic" } }, "Ask anything about ", /* @__PURE__ */ React.createElement("b", null, topic), ". I'll answer with a question back."), messages.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 4 } }, m.role === "user" ? "you" : "tutor"), /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 14px", borderRadius: 12, background: m.role === "user" ? "var(--ink)" : "var(--paper)", color: m.role === "user" ? "var(--paper)" : "var(--ink)", border: m.role === "user" ? "none" : "1px solid var(--rule)", fontSize: ".92rem", lineHeight: 1.55, whiteSpace: "pre-wrap" } }, m.content))), loading && /* @__PURE__ */ React.createElement("div", { className: "small muted" }, /* @__PURE__ */ React.createElement(Dots, null))), /* @__PURE__ */ React.createElement("div", { style: { padding: "14px 16px", display: "flex", gap: 10, borderTop: "1px solid var(--rule)" } }, /* @__PURE__ */ React.createElement("input", { style: { flex: 1, fontFamily: "var(--sans)" }, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && send(), placeholder: "Type a question\u2026" }), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: send, disabled: loading || !input.trim() }, "Ask")));
}
function SemanticSpace({ lessonId, cpId }) {
  const seed = [
    // TECH — top-left quadrant
    { w: "database", x: 0.08, y: 0.18, cluster: "tech" },
    { w: "kubernetes", x: 0.22, y: 0.14, cluster: "tech" },
    { w: "server", x: 0.1, y: 0.38, cluster: "tech" },
    { w: "commit", x: 0.25, y: 0.32, cluster: "tech" },
    { w: "pr review", x: 0.08, y: 0.58, cluster: "tech" },
    // PM — top-right quadrant
    { w: "roadmap", x: 0.7, y: 0.14, cluster: "pm" },
    { w: "okr", x: 0.86, y: 0.22, cluster: "pm" },
    { w: "stakeholder", x: 0.68, y: 0.38, cluster: "pm" },
    { w: "kickoff", x: 0.88, y: 0.44, cluster: "pm" },
    // COFFEE — bottom-center
    { w: "espresso", x: 0.4, y: 0.74, cluster: "coffee" },
    { w: "latte", x: 0.56, y: 0.78, cluster: "coffee" },
    { w: "cortado", x: 0.46, y: 0.9, cluster: "coffee" },
    { w: "grinder", x: 0.62, y: 0.92, cluster: "coffee" },
    // MUSIC — bottom-left quadrant
    { w: "violin", x: 0.1, y: 0.78, cluster: "music" },
    { w: "sonata", x: 0.22, y: 0.9, cluster: "music" },
    { w: "concerto", x: 0.08, y: 0.92, cluster: "music" }
  ];
  const [points, setPoints] = useState(seed);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(null);
  const clusters = {
    tech: "oklch(.48 .15 250)",
    pm: "oklch(.48 .14 310)",
    coffee: "oklch(.48 .14 40)",
    music: "oklch(.48 .15 150)",
    user: "var(--amber-ink)"
  };
  const place = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const existingList = points.map((p) => p.w).join(", ");
    const sys = 'You map words into a 2D semantic space. Place the new word near semantically similar words already placed. Respond ONLY with minified JSON: {"x":0-1,"y":0-1,"near":"existingWord","why":"1 short sentence"}. No markdown.';
    const r = await callClaude(`Existing points with coordinates:
${points.map((p) => `${p.w} (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join("\n")}

Place the new word: "${input}"
Pick coordinates that put it near semantically-related existing words.`, sys);
    try {
      const j = JSON.parse(r.replace(/^```json\n?|\n?```$/g, "").trim());
      const np = { w: input, x: Math.max(0.05, Math.min(0.95, j.x)), y: Math.max(0.05, Math.min(0.95, j.y)), cluster: "user", why: j.why, near: j.near };
      setPoints([...points, np]);
      setHighlight(np.w);
      if (cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 15);
    } catch {
    }
    setInput("");
    setLoading(false);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "hero demo"), /* @__PURE__ */ React.createElement("h3", null, "Meaning lives in space")), /* @__PURE__ */ React.createElement("span", { className: "chip amber" }, "drop a word")), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginBottom: 14 } }, "Claude represents words as vectors. Related words sit near each other. Drop a word below \u2014 Claude places it where it belongs."), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", aspectRatio: "5/3", background: "radial-gradient(ellipse at center, var(--paper-2), var(--paper-3))", borderRadius: 12, overflow: "hidden", border: "1px solid var(--rule)" } }, /* @__PURE__ */ React.createElement("svg", { width: "100%", height: "100%", style: { position: "absolute", inset: 0 } }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("pattern", { id: "grid", width: "5%", height: "10%", patternUnits: "userSpaceOnUse" }, /* @__PURE__ */ React.createElement("path", { d: "M 100 0 L 0 0 0 100", fill: "none", stroke: "var(--rule)", strokeWidth: ".5" }))), /* @__PURE__ */ React.createElement("rect", { width: "100%", height: "100%", fill: "url(#grid)" })), [
    { label: "tech", x: 16, y: 4, color: clusters.tech },
    { label: "product", x: 82, y: 4, color: clusters.pm },
    { label: "music", x: 16, y: 68, color: clusters.music },
    { label: "coffee", x: 58, y: 68, color: clusters.coffee }
  ].map((l) => /* @__PURE__ */ React.createElement("div", { key: l.label, style: {
    position: "absolute",
    left: `${l.x}%`,
    top: `${l.y}%`,
    fontFamily: "var(--mono)",
    fontSize: ".62rem",
    letterSpacing: ".15em",
    color: l.color,
    opacity: 0.55,
    textTransform: "uppercase",
    fontWeight: 600,
    pointerEvents: "none",
    userSelect: "none"
  } }, "\u2014 ", l.label, " \u2014")), points.map((p, i) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: i,
      title: p.why || p.cluster,
      style: {
        position: "absolute",
        left: `${p.x * 100}%`,
        top: `${p.y * 100}%`,
        transform: "translate(-50%,-50%)",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: ".78rem",
        fontFamily: "var(--mono)",
        background: p.cluster === "user" ? "var(--amber)" : "var(--paper)",
        color: p.cluster === "user" ? "oklch(.18 .04 50)" : clusters[p.cluster] || "var(--ink)",
        border: `1px solid ${p.cluster === "user" ? "var(--amber-ink)" : clusters[p.cluster] || "var(--rule-2)"}`,
        boxShadow: highlight === p.w ? "0 0 0 4px var(--amber-wash), 0 2px 8px rgba(0,0,0,.15)" : "var(--shadow-sm)",
        fontWeight: p.cluster === "user" ? 600 : 400,
        animation: highlight === p.w ? "pulseIn .8s ease" : "none",
        whiteSpace: "nowrap"
      }
    },
    p.w
  )), /* @__PURE__ */ React.createElement("style", null, `@keyframes pulseIn { 0% { transform: translate(-50%,-50%) scale(0); opacity: 0; } 60% { transform: translate(-50%,-50%) scale(1.3); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; } }`)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 14 } }, /* @__PURE__ */ React.createElement("input", { style: { flex: 1, fontFamily: "var(--sans)" }, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && place(), placeholder: "Try: sprint, cappuccino, algorithm, cello\u2026" }), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: place, disabled: loading || !input.trim() }, loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Placing ", /* @__PURE__ */ React.createElement(Dots, null)) : "Place in space \u2192")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, padding: "10px 14px", background: highlight ? "var(--amber-wash)" : "var(--paper-2)", border: "1px solid var(--rule)", borderRadius: 8, fontSize: ".88rem", minHeight: 44, display: "flex", alignItems: "center" } }, highlight && points.find((p) => p.w === highlight)?.why ? /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, highlight), " landed near ", /* @__PURE__ */ React.createElement("b", null, points.find((p) => p.w === highlight).near), " \u2014 ", points.find((p) => p.w === highlight).why) : /* @__PURE__ */ React.createElement("span", { className: "muted", style: { fontStyle: "italic" } }, "Drop a word and Claude will explain where it landed.")));
}
function ClaudeMdBuilder({ lessonId, cpId }) {
  const [f, setF] = useState({
    project: "",
    stack: "",
    conventions: "",
    avoid: "",
    commands: "",
    tone: "Crisp, direct, skimmable."
  });
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const build = async () => {
    setLoading(true);
    setOut("");
    const sys = "You generate CLAUDE.md files. Output ONLY the markdown file content, ready to paste. Use short sections, bullet points, and code blocks. Be crisp and professional. No preamble, no meta-commentary.";
    const r = await callClaude(`Project: ${f.project}
Stack/tooling: ${f.stack}
Conventions to follow: ${f.conventions}
Things to avoid: ${f.avoid}
Useful commands: ${f.commands}
Desired tone: ${f.tone}

Produce a CLAUDE.md for this project.`, sys);
    setOut(r);
    setLoading(false);
    if (cpId) {
      window.CourseProgress.completeCheckpoint(lessonId, cpId, 25);
      window.CourseProgress.awardBadge("architect");
    }
  };
  const copy = () => {
    navigator.clipboard.writeText(out);
    window.toast?.("Copied CLAUDE.md", {});
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "builder"), /* @__PURE__ */ React.createElement("h3", null, "Generate your CLAUDE.md")), /* @__PURE__ */ React.createElement("span", { className: "chip amber" }, "takes ~15s")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, [
    ["project", "Project name + one-line summary", "e.g. Reporting dashboard \u2014 internal tool for build pipeline analytics"],
    ["stack", "Language, framework, important tools", "e.g. TypeScript, React 18, GraphQL, Jest, Vite"],
    ["conventions", "Coding + doc conventions", "e.g. Functional components only, tests colocated, team style guide"],
    ["avoid", "Anti-patterns + things not to do", "e.g. No new npm deps without approval, no any types"],
    ["commands", "Useful commands (build, test, lint)", "e.g. yarn build, yarn test, arc lint"]
  ].map(([k, label, ph]) => /* @__PURE__ */ React.createElement("label", { key: k, style: { display: "block" } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 4 } }, label), /* @__PURE__ */ React.createElement("textarea", { rows: k === "project" ? 2 : 3, value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }), placeholder: ph }))), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: build, disabled: loading || !f.project.trim() || !f.stack.trim() }, loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Drafting ", /* @__PURE__ */ React.createElement(Dots, null)) : "Generate CLAUDE.md \u2192")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 6 } }, "output"), /* @__PURE__ */ React.createElement("pre", { className: "code", style: { flex: 1, minHeight: 360, whiteSpace: "pre-wrap", fontSize: ".8rem", margin: 0 } }, loading ? "\u22EF drafting your CLAUDE.md" : out || "// Your generated CLAUDE.md will appear here.\n// Fill in the fields on the left and hit Generate."), out && /* @__PURE__ */ React.createElement("button", { className: "btn sm", style: { position: "absolute", top: 28, right: 8 }, onClick: copy }, "Copy"))));
}
function PromptTransform() {
  const stages = [
    {
      label: "vague",
      quality: 18,
      prompt: "write a launch email",
      note: "No role. No audience. No goal. No format. Claude has to guess everything."
    },
    {
      label: "specific",
      quality: 58,
      prompt: "Write a launch email announcing our new authentication service to internal engineers. Keep it short.",
      note: "Better: audience, subject, tone-hint. Still missing structure and success criteria."
    },
    {
      label: "structured",
      quality: 94,
      prompt: `You are a staff engineer drafting an internal launch announcement.

CONTEXT
We're rolling out AuthKit v2 \u2014 a new authentication service replacing the legacy SSO. It ships next Monday; opt-in for 2 weeks, then default.

AUDIENCE
Internal engineers (mixed seniority). They skim. They hate ceremony.

TASK
Write the launch email.

CONSTRAINTS
- Under 180 words
- One clear migration action at the top
- No marketing language
- Code-block the CLI command

FORMAT
Subject line, then body. No sign-off.`,
      note: "Role. Context. Task. Constraints. Format. Claude has everything it needs to nail it first try."
    }
  ];
  const [stageIdx, setStageIdx] = useState(0);
  const [outputs, setOutputs] = useState(["", "", ""]);
  const [loading, setLoading] = useState([false, false, false]);
  const run = async (i) => {
    const nextLoading = [...loading];
    nextLoading[i] = true;
    setLoading(nextLoading);
    const nextOut = [...outputs];
    nextOut[i] = "";
    setOutputs(nextOut);
    const r = await callClaude(stages[i].prompt);
    const words = r.split(/(\s+)/);
    let acc = "";
    for (let k = 0; k < words.length; k++) {
      acc += words[k];
      await new Promise((res) => setTimeout(res, 12));
      setOutputs((cur) => {
        const n = [...cur];
        n[i] = acc;
        return n;
      });
    }
    setLoading((cur) => {
      const n = [...cur];
      n[i] = false;
      return n;
    });
    if (i === 2) setStageIdx(2);
  };
  const active = stages[stageIdx];
  return /* @__PURE__ */ React.createElement("div", { className: "card pt-card", style: { padding: 0, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { className: "w-cols-2 pt-grid", style: { display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 620 } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "32px 28px", borderRight: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow amber" }, "the prompt"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--serif)", fontSize: "1.4rem", fontWeight: 600, marginTop: 4, textTransform: "lowercase", letterSpacing: "-0.02em" } }, "stage ", stageIdx + 1, " / 3 \xB7 ", active.label)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, stages.map((_, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      onClick: () => setStageIdx(i),
      style: {
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: "1px solid var(--rule-2)",
        background: i === stageIdx ? "var(--ink)" : "var(--paper)",
        color: i === stageIdx ? "var(--paper)" : "var(--ink-3)",
        fontFamily: "var(--mono)",
        fontSize: ".78rem",
        cursor: "pointer",
        padding: 0
      }
    },
    i + 1
  )))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("pre", { className: "code", style: { flex: "0 0 260px", whiteSpace: "pre-wrap", fontSize: ".82rem", height: 260, overflowY: "auto", margin: 0 } }, active.prompt), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, padding: "12px 14px", background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 10, minHeight: 82 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 6, color: "var(--amber-ink)" } }, "diagnosis"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".9rem", lineHeight: 1.55, color: "var(--ink-2)" } }, active.note))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 4 } }, "prompt quality"), /* @__PURE__ */ React.createElement("div", { style: { height: 6, background: "var(--rule)", borderRadius: 3, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${active.quality}%`, background: active.quality > 80 ? "var(--ok)" : active.quality > 40 ? "var(--amber)" : "var(--bad)", transition: "width .6s cubic-bezier(.2,.7,.2,1)" } }))), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: () => run(stageIdx), disabled: loading[stageIdx] }, loading[stageIdx] ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Running ", /* @__PURE__ */ React.createElement(Dots, null)) : `Run stage ${stageIdx + 1} \u2192`))), /* @__PURE__ */ React.createElement("div", { style: { padding: "32px 28px", display: "flex", flexDirection: "column", background: "var(--paper)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, minHeight: 48 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "claude's output"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "var(--serif)", fontSize: "1.4rem", fontWeight: 600, marginTop: 4, letterSpacing: "-0.02em" } }, outputs[stageIdx] ? "here's what you got" : "waiting for you")), /* @__PURE__ */ React.createElement("span", { className: "chip amber", style: { opacity: outputs[stageIdx] && !loading[stageIdx] ? 1 : 0 } }, outputs[stageIdx] ? `${outputs[stageIdx].length} chars` : "0 chars")), /* @__PURE__ */ React.createElement("div", { style: {
    flex: "0 0 380px",
    padding: "16px 18px",
    borderRadius: 12,
    background: stageIdx === 2 ? "linear-gradient(180deg, var(--amber-wash), var(--paper-2))" : "var(--paper-2)",
    border: stageIdx === 2 ? "1px solid oklch(0.85 0.06 75)" : "1px solid var(--rule)",
    fontSize: ".92rem",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    overflowY: "auto",
    height: 380,
    fontFamily: stageIdx === 2 ? "var(--sans)" : "var(--mono)",
    color: "var(--ink)"
  } }, outputs[stageIdx] || /* @__PURE__ */ React.createElement("span", { className: "muted small", style: { fontFamily: "var(--sans)", fontStyle: "italic" } }, 'Hit "Run stage ', stageIdx + 1, `" to see Claude's response. Try stages 1 \u2192 2 \u2192 3 to feel the jump.`), loading[stageIdx] && /* @__PURE__ */ React.createElement("span", { className: "caret", style: { display: "inline-block", width: 8, height: "1em", background: "var(--amber-ink)", verticalAlign: "-2px", animation: "blink 1s step-end infinite", marginLeft: 2 } })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, display: "flex", alignItems: "center", gap: 10, color: outputs[0] && outputs[2] && stageIdx === 2 ? "var(--ok-ink)" : "transparent", fontSize: ".88rem", minHeight: 24 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.2rem" } }, "\u2197"), /* @__PURE__ */ React.createElement("span", null, outputs[0] && outputs[2] && stageIdx === 2 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("b", null, Math.round(outputs[2].length / Math.max(1, outputs[0].length) * 100) / 100, "\xD7"), " the substance \u2014 and actually usable.") : "\xA0")))), /* @__PURE__ */ React.createElement("style", null, `@keyframes blink { 50% { opacity: 0; } }`));
}
function Tokenizer({ lessonId, cpId }) {
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog.");
  const tokens = useMemo(() => {
    if (!text) return [];
    const chunks = text.match(/(\s+|[\w']+|[^\w\s])/g) || [];
    const result = [];
    chunks.forEach((c) => {
      if (/^\s+$/.test(c)) {
        result.push({ t: c, ws: true });
        return;
      }
      if (c.length <= 4) {
        result.push({ t: c });
        return;
      }
      let i = 0;
      while (i < c.length) {
        const chunkLen = i === 0 ? 3 : Math.min(4, c.length - i);
        result.push({ t: c.slice(i, i + chunkLen), sub: i > 0 });
        i += chunkLen;
      }
    });
    return result;
  }, [text]);
  const nonWs = tokens.filter((t) => !t.ws).length;
  const hues = [40, 55, 130, 250, 310, 20, 160, 285];
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "under the hood"), /* @__PURE__ */ React.createElement("h3", null, "Claude reads tokens, not letters")), /* @__PURE__ */ React.createElement("span", { className: "chip" }, "~", nonWs, " tokens \xB7 ", text.length, " chars")), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginBottom: 14 } }, "Approximate BPE tokenization. Short common words stay whole. Long or rare words split into pieces."), /* @__PURE__ */ React.createElement("textarea", { rows: 3, value: text, onChange: (e) => {
    setText(e.target.value);
    if (e.target.value.length > 80 && cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 10);
  } }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 16, padding: "16px", background: "var(--paper-2)", borderRadius: 10, border: "1px solid var(--rule)", lineHeight: 2.2, fontSize: ".95rem" } }, tokens.map(
    (t, i) => t.ws ? /* @__PURE__ */ React.createElement("span", { key: i }, " ") : /* @__PURE__ */ React.createElement("span", { key: i, style: {
      background: `oklch(0.88 0.08 ${hues[i % hues.length]} / 0.6)`,
      color: "var(--ink)",
      padding: "3px 6px",
      borderRadius: 5,
      marginRight: 2,
      fontFamily: "var(--mono)",
      fontSize: ".82rem",
      border: t.sub ? "1px dashed var(--ink-3)" : "1px solid transparent"
    } }, t.t)
  )), /* @__PURE__ */ React.createElement("div", { className: "small muted", style: { marginTop: 10, fontStyle: "italic" } }, "Dashed borders = subword continuation pieces. Claude's context window is measured in tokens (~3-4 chars avg English). A 200k-token window \u2248 a 500-page book."));
}
function AgentLoop({ lessonId, cpId }) {
  const [goal, setGoal] = useState("Find the largest file in the repo and summarize its purpose.");
  const [steps, setSteps] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const tools = {
    list_files: (args) => `src/main.ts (12kb)
src/utils.ts (3kb)
src/renderer/engine.ts (48kb)
src/renderer/shaders.ts (22kb)
README.md (4kb)`,
    read_file: (args) => `// src/renderer/engine.ts \u2014 WebGL2 render engine
// Main entry: initEngine(canvas). Manages render loop, frame timing,
// shader compilation, and the scene graph. ~1200 LOC.
export function initEngine(canvas) { /* ... */ }`,
    answer: (args) => args.text
  };
  const run = async () => {
    setRunning(true);
    setDone(false);
    setSteps([]);
    const script = [
      { type: "think", text: "I need to find the largest file first. I'll list the repo." },
      { type: "tool", name: "list_files", args: { path: "src/" }, obs: tools.list_files() },
      { type: "think", text: "engine.ts is largest at 48kb. Reading it to summarize purpose." },
      { type: "tool", name: "read_file", args: { path: "src/renderer/engine.ts" }, obs: tools.read_file() },
      { type: "think", text: "It's a WebGL2 render engine. I have enough to answer." },
      { type: "final", text: "The largest file is src/renderer/engine.ts (48kb). It is a WebGL2 render engine that manages the render loop, frame timing, shader compilation, and the scene graph. Main entry point is initEngine(canvas)." }
    ];
    for (const s of script) {
      await new Promise((r) => setTimeout(r, 650));
      setSteps((cur) => [...cur, s]);
    }
    setRunning(false);
    setDone(true);
    if (cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 20);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "simulation"), /* @__PURE__ */ React.createElement("h3", null, "Watch an agent loop, step by step")), /* @__PURE__ */ React.createElement("span", { className: "chip amber" }, "think \u2192 act \u2192 observe")), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginBottom: 12 } }, "A real agent alternates between thinking and calling tools. Here's how Claude would tackle a small task."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end", marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 4 } }, "the goal"), /* @__PURE__ */ React.createElement("input", { type: "text", value: goal, onChange: (e) => setGoal(e.target.value), style: { fontFamily: "var(--sans)" } })), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: run, disabled: running }, running ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Running ", /* @__PURE__ */ React.createElement(Dots, null)) : done ? "Run again \u21BB" : "Start loop \u2192")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, minHeight: 320 } }, steps.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: {
    display: "grid",
    gridTemplateColumns: "80px 1fr",
    gap: 12,
    alignItems: "start",
    padding: "12px 14px",
    borderRadius: 10,
    background: s.type === "final" ? "color-mix(in oklch, var(--ok) 10%, var(--paper))" : s.type === "tool" ? "var(--paper-2)" : "var(--paper)",
    border: `1px solid ${s.type === "final" ? "var(--ok)" : "var(--rule)"}`,
    animation: "slideIn .4s cubic-bezier(.2,.7,.2,1)"
  } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { color: s.type === "tool" ? "var(--amber-ink)" : s.type === "final" ? "var(--ok)" : "var(--ink-3)" } }, s.type === "think" ? "\u25D0 think" : s.type === "tool" ? "\u25B8 tool" : s.type === "final" ? "\u2713 answer" : s.type), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".9rem", lineHeight: 1.55 } }, s.type === "tool" ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("code", { style: { fontFamily: "var(--mono)", fontSize: ".82rem", background: "var(--paper-3)", padding: "2px 6px", borderRadius: 4 } }, s.name, "(", JSON.stringify(s.args), ")"), /* @__PURE__ */ React.createElement("pre", { className: "code", style: { marginTop: 8, fontSize: ".78rem", maxHeight: 120, overflow: "auto" } }, s.obs)) : /* @__PURE__ */ React.createElement("div", { style: { whiteSpace: "pre-wrap" } }, s.text)))), !steps.length && /* @__PURE__ */ React.createElement("div", { className: "small muted", style: { textAlign: "center", padding: "40px 0", fontStyle: "italic" } }, 'Click "Start loop" to see the agent work.')), /* @__PURE__ */ React.createElement("style", null, `@keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`));
}
function PromptDiff({ weak, strong, takeaway }) {
  const w = weak.split(/(\s+)/);
  const s = strong.split(/(\s+)/);
  const wSet = new Set(weak.toLowerCase().split(/\s+/));
  const sSet = new Set(strong.toLowerCase().split(/\s+/));
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "diff view"), /* @__PURE__ */ React.createElement("h3", null, "What changed, word by word"))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 6, color: "var(--bad-ink)" } }, "\u2014 before"), /* @__PURE__ */ React.createElement("div", { style: { padding: 14, background: "color-mix(in oklch, var(--bad) 6%, var(--paper-2))", borderRadius: 10, fontSize: ".88rem", lineHeight: 1.7, border: "1px solid color-mix(in oklch, var(--bad) 20%, var(--rule))" } }, w.map((tok, i) => {
    const bare = tok.toLowerCase().trim();
    const removed = bare && !sSet.has(bare);
    return /* @__PURE__ */ React.createElement("span", { key: i, style: { background: removed ? "color-mix(in oklch, var(--bad) 25%, transparent)" : "transparent", padding: removed ? "1px 2px" : 0, borderRadius: 2, textDecoration: removed ? "line-through" : "none", textDecorationColor: "var(--bad)" } }, tok);
  }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 6, color: "var(--ok-ink)" } }, "+ after"), /* @__PURE__ */ React.createElement("div", { style: { padding: 14, background: "color-mix(in oklch, var(--ok) 6%, var(--paper-2))", borderRadius: 10, fontSize: ".88rem", lineHeight: 1.7, border: "1px solid color-mix(in oklch, var(--ok) 25%, var(--rule))" } }, s.map((tok, i) => {
    const bare = tok.toLowerCase().trim();
    const added = bare && !wSet.has(bare);
    return /* @__PURE__ */ React.createElement("span", { key: i, style: { background: added ? "color-mix(in oklch, var(--ok) 25%, transparent)" : "transparent", padding: added ? "1px 2px" : 0, borderRadius: 2, fontWeight: added ? 600 : 400 } }, tok);
  })))), takeaway && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, padding: "12px 14px", background: "var(--amber-wash)", border: "1px solid oklch(0.85 0.06 75)", borderRadius: 10, fontSize: ".9rem" } }, /* @__PURE__ */ React.createElement("b", null, "Takeaway:"), " ", takeaway));
}
function PromptOrrery() {
  const PARTS = [
    {
      id: "role",
      label: "Role",
      hue: 35,
      weight: 18,
      default: true,
      content: "You are a staff engineer writing internal documentation.",
      hint: "Who Claude is being. Sets vocabulary, seniority, tone."
    },
    {
      id: "context",
      label: "Context",
      hue: 55,
      weight: 22,
      default: true,
      content: "We're launching AuthKit v2 next Monday \u2014 a drop-in replacement for legacy SSO.",
      hint: "Background the model cannot know. The world your task lives in."
    },
    {
      id: "task",
      label: "Task",
      hue: 5,
      weight: 28,
      default: true,
      content: "Draft the internal launch email.",
      hint: "The single thing you want. One verb, one object."
    },
    {
      id: "constraints",
      label: "Constraints",
      hue: 270,
      weight: 16,
      default: false,
      content: "Under 180 words. No marketing language. One clear migration action at the top.",
      hint: "The invisible rails. Prevents Claude from wandering."
    },
    {
      id: "format",
      label: "Format",
      hue: 200,
      weight: 16,
      default: false,
      content: "Subject line, then body. No sign-off. CLI command in a code block.",
      hint: "The shape of the answer. Where structure lives."
    }
  ];
  const [active, setActive] = useState(() => Object.fromEntries(PARTS.map((p) => [p.id, p.default])));
  const [hover, setHover] = useState(null);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const toggle = (id) => setActive((a) => ({ ...a, [id]: !a[id] }));
  const activeParts = PARTS.filter((p) => active[p.id]);
  const quality = Math.min(100, activeParts.reduce((s, p) => s + p.weight, 0));
  const qColor = quality >= 80 ? "var(--ok)" : quality >= 40 ? "var(--amber-ink)" : "var(--bad)";
  const qLabel = quality >= 90 ? "production-ready" : quality >= 70 ? "solid" : quality >= 40 ? "thin" : quality >= 20 ? "weak" : "a wish, not a prompt";
  const assembled = PARTS.filter((p) => active[p.id]).map((p) => `${p.label.toUpperCase()}
${p.content}`).join("\n\n");
  const run = async () => {
    if (!assembled.trim()) return;
    setLoading(true);
    setOutput("");
    const r = await callClaude(assembled);
    const words = r.split(/(\s+)/);
    let acc = "";
    for (let i = 0; i < words.length; i++) {
      acc += words[i];
      await new Promise((res) => setTimeout(res, 10));
      setOutput(acc);
    }
    setLoading(false);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "orrery-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "orrery-stage orrery-stage-stack" }, /* @__PURE__ */ React.createElement("div", { className: "stack-head", style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny" }, "prompt foundry"), /* @__PURE__ */ React.createElement("h3", { style: { fontFamily: "var(--serif)", fontSize: "1.35rem", letterSpacing: "-0.01em", marginTop: 4 } }, "Five parts. Toggle each."), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginTop: 4, maxWidth: 380 } }, "Click a card to include or remove it. The quality score responds live.")), /* @__PURE__ */ React.createElement("div", { className: "q-inline", style: {
    flexShrink: 0,
    textAlign: "right",
    minWidth: 110,
    padding: "10px 14px",
    borderRadius: 10,
    background: "var(--paper)",
    border: "1px solid var(--rule)",
    boxShadow: "var(--shadow-sm)"
  } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { fontSize: ".62rem" } }, "quality"), /* @__PURE__ */ React.createElement("div", { style: {
    fontFamily: "var(--serif)",
    fontSize: "2rem",
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: "-0.03em",
    marginTop: 2,
    color: qColor,
    transition: "color .3s"
  } }, quality), /* @__PURE__ */ React.createElement("div", { style: {
    fontFamily: "var(--mono)",
    fontSize: ".62rem",
    letterSpacing: ".05em",
    color: "var(--ink-3)",
    marginTop: 3,
    textTransform: "uppercase"
  } }, qLabel), /* @__PURE__ */ React.createElement("div", { style: {
    marginTop: 8,
    height: 3,
    background: "var(--rule)",
    borderRadius: 2,
    overflow: "hidden"
  } }, /* @__PURE__ */ React.createElement("div", { style: {
    height: "100%",
    width: `${quality}%`,
    background: qColor,
    transition: "width .5s cubic-bezier(.2,.7,.2,1),background .3s"
  } })))), /* @__PURE__ */ React.createElement("div", { className: "stack-list" }, PARTS.map((p, i) => {
    const on = active[p.id];
    const color = `oklch(0.62 0.16 ${p.hue})`;
    const colorDim = `oklch(0.92 0.02 ${p.hue})`;
    const colorInk = `oklch(0.46 0.15 ${p.hue})`;
    const isHover = hover === p.id;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: p.id,
        type: "button",
        className: `stack-card ${on ? "on" : "off"}`,
        onClick: () => toggle(p.id),
        onMouseEnter: () => setHover(p.id),
        onMouseLeave: () => setHover(null),
        style: {
          "--accent": color,
          "--accent-dim": colorDim,
          "--accent-ink": colorInk
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "sc-rail" }),
      /* @__PURE__ */ React.createElement("div", { className: "sc-main" }, /* @__PURE__ */ React.createElement("div", { className: "sc-top" }, /* @__PURE__ */ React.createElement("div", { className: "sc-idx" }, String(i + 1).padStart(2, "0")), /* @__PURE__ */ React.createElement("div", { className: "sc-label" }, p.label), /* @__PURE__ */ React.createElement("div", { className: "sc-weight" }, "+", p.weight), /* @__PURE__ */ React.createElement("div", { className: "sc-toggle", "aria-hidden": true }, /* @__PURE__ */ React.createElement("span", { className: "sc-toggle-dot" }))), /* @__PURE__ */ React.createElement("div", { className: "sc-content" }, on ? p.content : /* @__PURE__ */ React.createElement("span", { className: "sc-off-text" }, "\u2014 not included \u2014")))
    );
  }))), /* @__PURE__ */ React.createElement("div", { className: "orrery-side" }, /* @__PURE__ */ React.createElement("div", { className: "os-head" }, /* @__PURE__ */ React.createElement("div", { className: "eyebrow amber" }, "the prompt, assembled"), /* @__PURE__ */ React.createElement("h3", { style: { fontSize: "1.3rem", marginTop: 4, letterSpacing: "-0.01em" } }, hover ? PARTS.find((p) => p.id === hover).label : activeParts.length === 0 ? "Nothing selected" : `${activeParts.length} of 5 parts`), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginTop: 6, minHeight: 44 } }, hover ? PARTS.find((p) => p.id === hover).hint : "Each part adds real signal. Remove one and watch the output wobble. Strong prompts are additive, not clever.")), /* @__PURE__ */ React.createElement("div", { className: "os-assembled" }, activeParts.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, activeParts.map((p) => /* @__PURE__ */ React.createElement("div", { key: p.id, style: {
    borderLeft: `3px solid oklch(0.62 0.16 ${p.hue})`,
    paddingLeft: 12,
    paddingTop: 2,
    paddingBottom: 2
  } }, /* @__PURE__ */ React.createElement("div", { style: {
    fontFamily: "var(--mono)",
    fontSize: ".62rem",
    letterSpacing: ".15em",
    color: `oklch(0.46 0.15 ${p.hue})`,
    textTransform: "uppercase",
    fontWeight: 700
  } }, p.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".84rem", lineHeight: 1.45, color: "var(--ink-2)", marginTop: 2 } }, p.content)))) : /* @__PURE__ */ React.createElement("div", { className: "small muted", style: { fontStyle: "italic", padding: "12px 0" } }, "No parts selected. Click a card.")), /* @__PURE__ */ React.createElement("div", { className: "os-runbar" }, /* @__PURE__ */ React.createElement("div", { className: "small muted" }, loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Streaming ", /* @__PURE__ */ React.createElement(Dots, null)) : output ? `${output.split(/\s+/).filter(Boolean).length} words \xB7 from ${activeParts.length} parts` : "Fire this prompt at Claude \u2192"), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: run, disabled: loading || !assembled }, loading ? "Running\u2026" : output ? "Run again \u2192" : "Run live \u2192")), /* @__PURE__ */ React.createElement("div", { className: "os-output" }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", null, "claude's output"), output && !loading && /* @__PURE__ */ React.createElement("span", { className: "muted", style: { textTransform: "none", letterSpacing: 0, fontFamily: "var(--mono)", fontSize: ".65rem" } }, "scroll \u2195")), output ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".88rem", lineHeight: 1.55, whiteSpace: "pre-wrap" } }, output, loading && /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: 6, height: "1em", background: "var(--amber-ink)", verticalAlign: "-2px", animation: "blink 1s step-end infinite", marginLeft: 2 } })) : /* @__PURE__ */ React.createElement("div", { className: "small muted", style: { fontStyle: "italic" } }, "Output appears here. Try running with 2 parts, then with all 5 \u2014 the difference is the point."))));
}
function RedactionDrill({ lessonId, cpId }) {
  const SEGMENTS = [
    { text: "Help me debug this failing integration. Here is the full log:\n\n", safe: true },
    { text: "[2024-11-03 14:22] POST /api/v2/orders ", safe: true },
    { text: "Authorization: Bearer sk-ant-a01-Xh4B7zK9mQ2pL8vN3sD5fR6tY7uI", sensitive: "API token" },
    { text: "\n[2024-11-03 14:22] user_id=", safe: true },
    { text: "acct_01HQW8NVXK5RT7", sensitive: "customer account ID" },
    { text: " email=", safe: true },
    { text: "[email protected]", sensitive: "customer PII (email)" },
    { text: "\n[2024-11-03 14:22] error: CARD_DECLINED (retry 3 of 3)\ncard last4=", safe: true },
    { text: "4242", safe: true },
    { text: " stripe_customer=", safe: true },
    { text: "cus_P4aQx9Kz8LmN", sensitive: "third-party customer identifier" },
    { text: "\n\nWhy is this failing and what should our retry logic do?", safe: true }
  ];
  const [redacted, setRedacted] = useState(() => new Array(SEGMENTS.length).fill(false));
  const [submitted, setSubmitted] = useState(false);
  const [hover, setHover] = useState(null);
  const sensitiveIdxs = SEGMENTS.map((s, i) => s.sensitive ? i : -1).filter((i) => i >= 0);
  const cleanCount = sensitiveIdxs.filter((i) => redacted[i]).length;
  const mistakeCount = redacted.filter((r, i) => r && !SEGMENTS[i].sensitive).length;
  const totalSensitive = sensitiveIdxs.length;
  const allClean = cleanCount === totalSensitive && mistakeCount === 0;
  const toggle = (i) => {
    if (submitted) return;
    setRedacted((r) => r.map((v, j) => j === i ? !v : v));
  };
  const submit = () => {
    setSubmitted(true);
    if (allClean && cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 20);
  };
  const reset = () => {
    setRedacted(new Array(SEGMENTS.length).fill(false));
    setSubmitted(false);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "drill \xB7 before you paste"), /* @__PURE__ */ React.createElement("h3", null, "Redact the sensitive parts")), /* @__PURE__ */ React.createElement("span", { className: "chip amber" }, cleanCount, " / ", totalSensitive, " caught")), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginBottom: 14 } }, "A teammate is about to paste this into Claude. ", /* @__PURE__ */ React.createElement("b", null, "Click every piece of the prompt that should never leave your machine."), " Clicking marks it redacted (replaced with a placeholder)."), /* @__PURE__ */ React.createElement("div", { style: {
    padding: "18px 20px",
    borderRadius: 10,
    background: submitted ? allClean ? "color-mix(in oklch, var(--ok) 8%, var(--paper-2))" : "color-mix(in oklch, var(--bad) 6%, var(--paper-2))" : "var(--paper-2)",
    border: `1px solid ${submitted ? allClean ? "var(--ok)" : "var(--bad)" : "var(--rule)"}`,
    fontFamily: "var(--mono)",
    fontSize: ".84rem",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    transition: "background .3s, border-color .3s"
  } }, SEGMENTS.map((seg, i) => {
    const isSensitive = !!seg.sensitive;
    const isRedacted = redacted[i];
    const isMistake = submitted && isRedacted && !isSensitive;
    const isMissed = submitted && isSensitive && !isRedacted;
    if (!isSensitive && !isRedacted) {
      return /* @__PURE__ */ React.createElement("span", { key: i, style: { color: "var(--ink-2)" } }, seg.text);
    }
    if (isMistake) {
      return /* @__PURE__ */ React.createElement("span", { key: i, style: {
        background: "color-mix(in oklch, var(--bad) 12%, transparent)",
        color: "var(--bad-ink)",
        textDecoration: "line-through",
        padding: "1px 4px",
        borderRadius: 3
      } }, seg.text);
    }
    if (isRedacted) {
      return /* @__PURE__ */ React.createElement(
        "span",
        {
          key: i,
          onClick: () => toggle(i),
          style: {
            display: "inline-block",
            background: submitted ? "var(--ok-ink)" : "var(--ink)",
            color: "var(--paper)",
            padding: "1px 8px",
            borderRadius: 4,
            cursor: submitted ? "default" : "pointer",
            fontFamily: "var(--mono)",
            fontSize: ".78rem",
            fontWeight: 600,
            letterSpacing: ".05em"
          }
        },
        "<REDACTED>"
      );
    }
    const missed = isMissed;
    return /* @__PURE__ */ React.createElement(
      "span",
      {
        key: i,
        onClick: () => toggle(i),
        onMouseEnter: () => setHover(i),
        onMouseLeave: () => setHover(null),
        title: seg.sensitive,
        style: {
          background: missed ? "color-mix(in oklch, var(--bad) 12%, transparent)" : hover === i ? "color-mix(in oklch, var(--amber) 50%, transparent)" : "color-mix(in oklch, var(--amber) 30%, transparent)",
          color: missed ? "var(--bad-ink)" : "var(--ink)",
          padding: "1px 4px",
          borderRadius: 3,
          cursor: submitted ? "default" : "pointer",
          borderBottom: missed ? "2px solid var(--bad)" : "1px dashed var(--amber-ink)",
          transition: "background .15s",
          fontWeight: missed ? 600 : 400
        }
      },
      seg.text
    );
  })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 14, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { className: "small muted", style: { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 14, height: 14, background: "color-mix(in oklch, var(--amber) 30%, transparent)", border: "1px dashed var(--amber-ink)", borderRadius: 3, flexShrink: 0 } }), "risky \u2014 click to redact"), /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { background: submitted ? "var(--ok-ink)" : "var(--ink)", borderRadius: 3, color: "var(--paper)", fontSize: ".62rem", padding: "2px 6px", fontWeight: 600, letterSpacing: ".04em", flexShrink: 0 } }, "REDACTED"), "cleaned"), hover != null && SEGMENTS[hover]?.sensitive && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--amber-ink)" } }, "\u2192 ", SEGMENTS[hover].sensitive)), submitted ? /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: reset }, "Reset & try again") : /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: submit }, "Submit paste \u2192")), submitted && /* @__PURE__ */ React.createElement("div", { style: {
    marginTop: 14,
    padding: "14px 16px",
    borderRadius: 10,
    background: allClean ? "color-mix(in oklch, var(--ok) 10%, var(--paper))" : "color-mix(in oklch, var(--bad) 8%, var(--paper))",
    border: `1px solid ${allClean ? "var(--ok)" : "var(--bad)"}`,
    fontSize: ".9rem",
    lineHeight: 1.55
  } }, allClean ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--ok-ink)" } }, "\u2713 Safe to paste."), " All four sensitive fields caught, no false positives. This is the habit \u2014 read before you paste.") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("b", { style: { color: "var(--bad-ink)" } }, "\u2717 Don't send this yet."), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, totalSensitive - cleanCount > 0 && /* @__PURE__ */ React.createElement("div", null, "\u2192 ", /* @__PURE__ */ React.createElement("b", null, totalSensitive - cleanCount), " sensitive ", totalSensitive - cleanCount === 1 ? "field is" : "fields are", " still exposed (highlighted red)."), mistakeCount > 0 && /* @__PURE__ */ React.createElement("div", null, "\u2192 You over-redacted ", /* @__PURE__ */ React.createElement("b", null, mistakeCount), " safe ", mistakeCount === 1 ? "field" : "fields", " \u2014 fine, but unnecessary.")))));
}
function FailureTagger({ lessonId, cpId }) {
  const MODES = [
    { id: "halluc", label: "Hallucination", color: "oklch(0.58 0.18 20)", textColor: "oklch(0.5 0.18 20)", desc: "Confidently invented a fact." },
    { id: "refusal", label: "Over-refusal", color: "oklch(0.62 0.16 280)", textColor: "oklch(0.5 0.16 280)", desc: "Refused something it should have done." },
    { id: "format", label: "Format drift", color: "oklch(0.60 0.14 200)", textColor: "oklch(0.46 0.14 200)", desc: "Ignored the requested shape." },
    { id: "offtopic", label: "Off-topic", color: "oklch(0.58 0.15 140)", textColor: "oklch(0.48 0.15 140)", desc: "Wandered away from the ask." }
  ];
  const CASES = [
    {
      id: "c1",
      prompt: "List the three files in our repo largest-by-bytes.",
      output: "The three largest files in your repo are src/bundle.js (4.2MB), dist/vendor.js (3.8MB), and assets/hero-video.mp4 (2.1MB).",
      correct: "halluc",
      why: "Claude had no repo access. It fabricated plausible-sounding file names and exact byte counts."
    },
    {
      id: "c2",
      prompt: "Write a short JSON object describing a generic user: {name, role, email}.",
      output: "I can't generate sample data with emails as that could be confused with a real person. Could you clarify your use case?",
      correct: "refusal",
      why: "The request is entirely benign \u2014 sample/synthetic data. This is a classic over-cautious refusal."
    },
    {
      id: "c3",
      prompt: 'Return a JSON array of 3 objects, each with keys "term" and "definition". No prose.',
      output: "Sure! Here are three important terms:\n\n1. **Context window** \u2014 The range of text the model can consider at once.\n2. **Token** \u2014 A unit of text the model processes.\n3. **Temperature** \u2014 Sampling randomness parameter.",
      correct: "format",
      why: "Explicitly asked for a JSON array, no prose. Got prose with numbered bullets."
    },
    {
      id: "c4",
      prompt: "Summarize the attached incident report in one sentence.",
      output: "Incidents are common in fast-moving teams. Here are seven best practices for post-mortems: 1. Blameless culture 2. Clear timeline 3. Root cause analysis\u2026",
      correct: "offtopic",
      why: "Didn't summarize the specific report \u2014 pivoted to generic advice about post-mortems."
    },
    {
      id: "c5",
      prompt: "What's the current version of our internal AuthKit library?",
      output: "AuthKit is currently at version 3.7.2, released on October 14, 2024, with bug fixes for the OAuth flow and a new MFA module.",
      correct: "halluc",
      why: "There is no way the model knows your internal library version. Fabricated version, date, and release notes."
    }
  ];
  const [picks, setPicks] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const pick = (caseId, modeId) => {
    if (submitted) return;
    setPicks((p) => ({ ...p, [caseId]: modeId }));
  };
  const allPicked = CASES.every((c) => picks[c.id]);
  const correctCount = CASES.filter((c) => picks[c.id] === c.correct).length;
  const submit = () => {
    setSubmitted(true);
    if (correctCount >= 4 && cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 25);
  };
  const reset = () => {
    setPicks({});
    setSubmitted(false);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "eval drill"), /* @__PURE__ */ React.createElement("h3", null, "Name the failure mode")), /* @__PURE__ */ React.createElement("span", { className: "chip amber" }, Object.keys(picks).length, " / ", CASES.length)), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginBottom: 14 } }, "Five real-looking Claude outputs. Each is broken differently. ", /* @__PURE__ */ React.createElement("b", null, "Tag each with how it went wrong."), " This is the core move of eval work \u2014 you can\\'t fix a class of failure until you can name it."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 18, padding: "12px 14px", background: "var(--paper-2)", borderRadius: 10, border: "1px solid var(--rule)" } }, MODES.map((m) => /* @__PURE__ */ React.createElement("div", { key: m.id, style: { display: "flex", alignItems: "flex-start", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 10, height: 10, borderRadius: 2, background: m.color, marginTop: 5, flexShrink: 0 } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".82rem", fontWeight: 600, color: "var(--ink)" } }, m.label), /* @__PURE__ */ React.createElement("div", { className: "small muted", style: { lineHeight: 1.4 } }, m.desc))))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, CASES.map((c, i) => {
    const picked = picks[c.id];
    const correct = submitted && picked === c.correct;
    const wrong = submitted && picked && picked !== c.correct;
    const mode = MODES.find((m) => m.id === picked);
    return /* @__PURE__ */ React.createElement("div", { key: c.id, style: {
      border: `1px solid ${correct ? "var(--ok)" : wrong ? "var(--bad)" : "var(--rule-2)"}`,
      borderRadius: 10,
      background: correct ? "color-mix(in oklch, var(--ok) 5%, var(--paper))" : wrong ? "color-mix(in oklch, var(--bad) 5%, var(--paper))" : "var(--paper)",
      overflow: "hidden",
      transition: "border-color .2s, background .2s"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "28px 1fr", gap: 12, padding: "12px 14px", alignItems: "start" } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: "var(--paper-3)",
      color: "var(--ink-2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--mono)",
      fontSize: ".7rem",
      fontWeight: 700,
      marginTop: 2
    } }, i + 1), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 4 } }, "prompt"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".88rem", color: "var(--ink-2)", marginBottom: 8, fontStyle: "italic" } }, '"', c.prompt, '"'), /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 4 } }, "claude's output"), /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: ".85rem",
      color: "var(--ink)",
      lineHeight: 1.55,
      padding: "10px 12px",
      background: "var(--paper-2)",
      borderRadius: 8,
      whiteSpace: "pre-wrap"
    } }, c.output))), /* @__PURE__ */ React.createElement("div", { style: {
      padding: "10px 14px 12px",
      borderTop: "1px solid var(--rule)",
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      alignItems: "center",
      background: picked ? "color-mix(in oklch, var(--paper-2) 60%, transparent)" : "transparent"
    } }, /* @__PURE__ */ React.createElement("span", { className: "tiny", style: { marginRight: 4 } }, "tag as:"), MODES.map((m) => {
      const isPicked = picked === m.id;
      const isTheAnswer = submitted && m.id === c.correct;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: m.id,
          onClick: () => pick(c.id, m.id),
          disabled: submitted,
          style: {
            padding: "5px 11px",
            borderRadius: 14,
            border: isTheAnswer ? `1.5px solid var(--ok)` : isPicked && wrong ? "1.5px solid var(--bad)" : `1px solid ${isPicked ? m.color : "var(--rule-2)"}`,
            background: isPicked ? `color-mix(in oklch, ${m.color} 15%, var(--paper))` : "var(--paper)",
            color: isPicked ? m.textColor || m.color : "var(--ink-2)",
            fontFamily: "var(--sans)",
            fontSize: ".78rem",
            fontWeight: isPicked ? 600 : 400,
            cursor: submitted ? "default" : "pointer",
            transition: "background .15s, border-color .15s"
          }
        },
        m.label,
        isTheAnswer && !isPicked && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, color: "var(--ok-ink)" } }, "\u2190 answer"),
        isPicked && submitted && (correct ? " \u2713" : " \u2717")
      );
    })), submitted && /* @__PURE__ */ React.createElement("div", { style: {
      padding: "10px 14px 12px",
      borderTop: "1px solid var(--rule)",
      fontSize: ".84rem",
      lineHeight: 1.55,
      color: "var(--ink-2)",
      background: "var(--paper-2)"
    } }, /* @__PURE__ */ React.createElement("b", { style: { color: correct ? "var(--ok-ink)" : "var(--amber-ink)" } }, correct ? "\u2713 Correct." : `Actually: ${MODES.find((m) => m.id === c.correct).label}.`), " ", c.why));
  })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "small muted" }, submitted ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("b", { style: { color: correctCount >= 4 ? "var(--ok-ink)" : correctCount >= 3 ? "var(--amber-ink)" : "var(--bad-ink)" } }, correctCount, " / ", CASES.length, " correct."), " ", correctCount >= 4 ? "You know what a failure looks like." : "Reread the mode descriptions \u2014 this is the skill.") : allPicked ? "Ready to submit." : `${CASES.length - Object.keys(picks).length} left to tag.`), submitted ? /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: reset }, "Try again") : /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: submit, disabled: !allPicked }, "Check my tags \u2192")));
}
function PromptLibraryShaper({ lessonId, cpId }) {
  const SAMPLE = `Write a PR review for the change in my auth-service repo. Use the style we agreed on in last week's #eng-chat thread. Focus on the stuff Jane and I care about.`;
  const [v, setV] = useState(SAMPLE);
  const [aiFeedback, setAiFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const checks = useMemo(() => {
    const s = v.toLowerCase();
    const hasPlaceholder = /<[A-Z_]{2,}>|\{\{[^}]+\}\}|\[YOUR[_ ][A-Z]+\]/i.test(v);
    const hasHardcoded = /auth-service|jane|my |#eng-chat|last week|my team|my repo/i.test(s);
    const hasWhenToUse = /when to use|use this when|for:|# when/i.test(s);
    const hasOutputExample = /example( output)?:|sample output|here's an example|→/i.test(s) || /```/.test(v);
    const hasFailureNote = /failure mode|tends to|watch out|caveat|note:/i.test(s);
    const hasRole = /you are|act as|your role/i.test(s);
    const hasStructure = v.split(/\n\n+/).length >= 3 || /(CONTEXT|TASK|CONSTRAINTS|FORMAT|EXAMPLE)/i.test(v);
    return [
      {
        id: "parameterized",
        label: "Parameterized",
        ok: hasPlaceholder && !hasHardcoded,
        partial: hasPlaceholder && hasHardcoded,
        hint: hasHardcoded ? "Swap hardcoded names (repo, teammates, channels) for <PLACEHOLDERS>." : hasPlaceholder ? "Good \u2014 has placeholders." : "No placeholders found. Add <PROJECT>, <TEAMMATE> etc."
      },
      {
        id: "when",
        label: '"When to use" note',
        ok: hasWhenToUse,
        partial: false,
        hint: hasWhenToUse ? "Good \u2014 future-you will thank you." : 'Add a one-line "# When to use: \u2026" at the top.'
      },
      {
        id: "example",
        label: "Sample output",
        ok: hasOutputExample,
        partial: false,
        hint: hasOutputExample ? "Good \u2014 sets expectations cleanly." : 'Show an "Example output:" so teammates know what to expect.'
      },
      {
        id: "failure",
        label: "Failure-mode note",
        ok: hasFailureNote,
        partial: false,
        hint: hasFailureNote ? "Good \u2014 forewarning compounds." : 'Add a "# Watch out: \u2026" note about the thing it gets wrong.'
      },
      {
        id: "structure",
        label: "Structured shape",
        ok: hasStructure && hasRole,
        partial: hasStructure || hasRole,
        hint: hasStructure && hasRole ? "Good \u2014 role + sections." : 'Add a role ("You are \u2026") and clear sections.'
      }
    ];
  }, [v]);
  const score = Math.round((checks.filter((c) => c.ok).length + checks.filter((c) => c.partial).length * 0.5) / checks.length * 100);
  const scoreColor = score >= 80 ? "var(--ok-ink)" : score >= 50 ? "var(--amber-ink)" : "var(--bad-ink)";
  const askClaude = async () => {
    setLoading(true);
    setAiFeedback("");
    const sys = "You review prompts for shareability on a team. In 2 sentences max, say the single biggest thing that would make this prompt safer to share with teammates. Be concrete and specific.";
    const r = await callClaude(`PROMPT TO REVIEW:
"""
${v}
"""`, sys);
    setAiFeedback(r);
    setLoading(false);
    if (score >= 80 && cpId) window.CourseProgress.completeCheckpoint(lessonId, cpId, 20);
  };
  const loadIdeal = () => {
    setV(`# When to use: drafting a PR review on any repo the team maintains.
# Watch out: tends to over-praise; strip the opener if it appears.

You are a senior reviewer on the <PROJECT> codebase.

CONTEXT
We follow the team conventions in the project's CLAUDE.md. The change is in <AREA>.

TASK
Review the diff below. Prioritize: correctness, test coverage, naming, and whether it matches our existing patterns.

FORMAT
Three sections: "Must fix", "Worth considering", "Nits". Bullet points, <=10 words each.

EXAMPLE OUTPUT
## Must fix
- Null check on line 42 \u2014 \`config\` can be undefined from \`loadEnv()\`.
## Worth considering
- Extract retry loop into helper; it's now duplicated in 3 files.
## Nits
- Prefer \`const\` over \`let\` on line 17.

DIFF
<paste diff here>`);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "shape for sharing"), /* @__PURE__ */ React.createElement("h3", null, "From personal prompt \u2192 team prompt")), /* @__PURE__ */ React.createElement("span", { className: "chip", style: { color: scoreColor, borderColor: scoreColor } }, "shareability \xB7 ", score)), /* @__PURE__ */ React.createElement("p", { className: "small muted", style: { marginBottom: 14 } }, 'Edit the prompt on the left. The checks on the right update live. At 80+, hit "Let Claude review" for a final sanity check.'), /* @__PURE__ */ React.createElement("div", { className: "w-cols-2", style: { display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, alignItems: "stretch" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny" }, "the prompt"), /* @__PURE__ */ React.createElement("button", { className: "btn sm ghost", onClick: loadIdeal }, "Load an ideal version")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      rows: 16,
      value: v,
      onChange: (e) => setV(e.target.value),
      style: { fontFamily: "var(--mono)", fontSize: ".8rem", flex: 1, minHeight: 360 }
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny" }, "shareability checks"), checks.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, style: {
    padding: "10px 12px",
    background: c.ok ? "color-mix(in oklch, var(--ok) 8%, var(--paper))" : c.partial ? "color-mix(in oklch, var(--amber) 18%, var(--paper))" : "var(--paper-2)",
    border: `1px solid ${c.ok ? "var(--ok)" : c.partial ? "var(--amber-ink)" : "var(--rule-2)"}`,
    borderRadius: 8,
    transition: "background .25s, border-color .25s"
  } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "20px 1fr", gap: 8, alignItems: "start" } }, /* @__PURE__ */ React.createElement("span", { style: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: c.ok ? "var(--ok)" : c.partial ? "var(--amber-ink)" : "var(--rule)",
    color: c.ok || c.partial ? "var(--paper)" : "var(--ink-3)",
    fontSize: ".7rem",
    fontWeight: 700,
    flexShrink: 0
  } }, c.ok ? "\u2713" : c.partial ? "~" : " "), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: ".86rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.25 } }, c.label), /* @__PURE__ */ React.createElement("div", { className: "small muted", style: { marginTop: 3, lineHeight: 1.4 } }, c.hint))))))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "tiny", style: { marginBottom: 4 } }, "score"), /* @__PURE__ */ React.createElement("div", { style: { height: 6, background: "var(--rule)", borderRadius: 3, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${score}%`, background: scoreColor, transition: "width .3s, background .3s" } }))), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: askClaude, disabled: loading }, loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Reviewing ", /* @__PURE__ */ React.createElement(Dots, null)) : "Let Claude review \u2192")), (aiFeedback || loading) && /* @__PURE__ */ React.createElement(
    RunConsole,
    {
      loading,
      output: aiFeedback,
      onClear: () => setAiFeedback(""),
      label: "claude's take",
      height: 180,
      tone: "amber"
    }
  ));
}
Object.assign(window, {
  callClaude,
  Dots,
  CheckpointFooter,
  RunConsole,
  PromptSandbox,
  PromptCompare,
  PromptGrader,
  Quiz,
  FillBlank,
  RewriteArena,
  DragReorder,
  SocraticTutor,
  SemanticSpace,
  ClaudeMdBuilder,
  PromptTransform,
  Tokenizer,
  AgentLoop,
  PromptDiff,
  PromptOrrery,
  RedactionDrill,
  FailureTagger,
  PromptLibraryShaper
});
window.mountWidget = function(id, Component, props) {
  const el = document.getElementById(id);
  if (!el) return;
  const root = ReactDOM.createRoot(el);
  root.render(/* @__PURE__ */ React.createElement(Component, { ...props }));
};
