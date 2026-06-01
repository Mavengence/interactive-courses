(() => {
  const { useState, useEffect, useRef } = React;
  const COLUMNS = [
    { id: "user_id", type: "STRING", pii: false, required: null, note: "non-PII internal id" },
    { id: "employee_email", type: "STRING", pii: true, required: "canonicalEmployee", note: "identifies a human" },
    { id: "account_id", type: "STRING", pii: true, required: "canonicalEmployee", note: "device \u2194 user linkage" },
    { id: "event_type", type: "INT", pii: false, required: null, note: "CVSS bucket, 0\u20134" },
    { id: "manager_unixname", type: "STRING", pii: true, required: "canonicalEmployee", note: "identifies a human" }
  ];
  const CHIPS = [
    { id: "canonicalEmployee", labelKey: "canonicalEmployee", swatch: "#7C5CFF" },
    { id: "canonicalApp", labelKey: "canonicalApp", swatch: "#2D7DFF" },
    { id: "canonicalCW", labelKey: "canonicalCW", swatch: "#22D3EE" },
    { id: "none", labelKey: "none", swatch: "#B9C0CA", label: "none" }
  ];
  function PermissionGateSim({ internalMode, reduceMotion }) {
    const N = MMNames(internalMode);
    const [assignments, setAssignments] = useState({});
    const [dragging, setDragging] = useState(null);
    const [zoneRequired, setZoneRequired] = useState(false);
    const [zone, setZone] = useState(false);
    const [shipState, setShipState] = useState("idle");
    const [console_, setConsole_] = useState([]);
    const [confetti, setConfetti] = useState(0);
    const assignTo = (colId) => {
      if (!dragging) return;
      setAssignments((a) => ({ ...a, [colId]: dragging }));
      setDragging(null);
    };
    const clearCol = (colId) => {
      setAssignments((a) => {
        const n = { ...a };
        delete n[colId];
        return n;
      });
    };
    const ship = () => {
      setShipState("deploying");
      setConsole_(["[access-gateway] starting deploy of dim_users.spec\u2026"]);
      const violations = [];
      COLUMNS.forEach((c) => {
        if (c.required) {
          const got = assignments[c.id];
          if (!got || got === "none" || got !== c.required) {
            violations.push({ col: c.id, needed: N[c.required] });
          }
        }
      });
      let delay = reduceMotion ? 0 : 500;
      const push = (line, ms) => setTimeout(() => setConsole_((l) => [...l, line]), delay += ms || 250);
      push("[access-gateway] reading column actor annotations\u2026", 300);
      push(`[access-gateway] ${COLUMNS.length} columns \xB7 ${COLUMNS.filter((c) => c.required).length} require actor annotations`, 250);
      if (violations.length > 0) {
        violations.forEach((v) => {
          push(`[access-gateway] \u2715 BLOCKED \xB7 column "${v.col}" missing required actor <${v.needed}>`, 200);
        });
        push("[access-gateway] deploy aborted. Patch dbt and re-ship.", 400);
        setTimeout(() => setShipState("blocked"), delay + 200);
      } else if (zoneRequired && !zone) {
        push(`[access-gateway] \u2715 BLOCKED \xB7 catalog flags dataset as PII-regional \xB7 data_classification "pii_secure" required`, 250);
        push("[access-gateway] deploy aborted. Add <data_classification: pii_secure> to dbt header.", 400);
        setTimeout(() => setShipState("blocked"), delay + 200);
      } else {
        push("[access-gateway] \u2713 actor annotations complete", 200);
        if (zone) push("[access-gateway] \u2713 data_classification resolved \xB7 pii_secure", 150);
        push(`[access-gateway] \u2713 ACL <${N.dataProjectAcl}: corp_assets> bound`, 150);
        push("[access-gateway] \u2713 deployed to prod \xB7 v237 \u2192 v238", 250);
        setTimeout(() => {
          setShipState("shipped");
          setConfetti((c) => c + 1);
        }, delay + 200);
      }
    };
    const reset = () => {
      setAssignments({});
      setShipState("idle");
      setConsole_([]);
    };
    const autofix = () => {
      const next = { ...assignments };
      COLUMNS.forEach((c) => {
        if (c.required) next[c.id] = c.required;
      });
      setAssignments(next);
      setShipState("idle");
      setConsole_([]);
    };
    const chipLabel = (id) => {
      if (id === "none") return "none";
      return N[id] || id;
    };
    return /* @__PURE__ */ React.createElement(
      Panel,
      {
        eyebrow: "live simulator \xB7 deploy gate",
        title: "Permission Gate",
        meta: shipState === "shipped" ? "\u2713 shipped" : shipState === "blocked" ? "\u2715 blocked" : shipState === "deploying" ? "deploying\u2026" : "ready to ship",
        caption: `${N.access_gateway} reads the ${N.datasetspec} at deploy time. Every column that names a human must have an actor annotation. No annotation, no ship.`
      },
      /* @__PURE__ */ React.createElement("div", { className: "pg-layout" }, /* @__PURE__ */ React.createElement("div", { className: "pg-chip-rail" }, /* @__PURE__ */ React.createElement("div", { className: "pg-rail-lab" }, "Drag an actor"), CHIPS.map((c) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: c.id,
          className: `pg-chip ${dragging === c.id ? "dragging" : ""}`,
          draggable: true,
          onDragStart: () => setDragging(c.id),
          onDragEnd: () => setDragging(null),
          onClick: () => setDragging((d) => d === c.id ? null : c.id),
          style: { "--sw": c.swatch }
        },
        /* @__PURE__ */ React.createElement("span", { className: "dot" }),
        /* @__PURE__ */ React.createElement("code", null, chipLabel(c.id))
      )), /* @__PURE__ */ React.createElement("div", { className: "pg-rail-hint" }, "Click a chip, then click a column, or drag."), /* @__PURE__ */ React.createElement("label", { className: "pg-zone-toggle" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: zoneRequired, onChange: (e) => setZoneRequired(e.target.checked) }), /* @__PURE__ */ React.createElement("span", null, "Catalog requires Policy Zone ", /* @__PURE__ */ React.createElement("code", null, "pii_secure"))), /* @__PURE__ */ React.createElement("label", { className: "pg-zone-toggle", style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: zone, onChange: (e) => setZone(e.target.checked) }), /* @__PURE__ */ React.createElement("span", null, "Add ", /* @__PURE__ */ React.createElement("code", null, "data_classification: pii_secure"), " to dbt"))), /* @__PURE__ */ React.createElement("div", { className: "pg-ide" }, /* @__PURE__ */ React.createElement("div", { className: "pg-ide-head" }, /* @__PURE__ */ React.createElement("span", { className: "dots" }, /* @__PURE__ */ React.createElement("i", null), /* @__PURE__ */ React.createElement("i", null), /* @__PURE__ */ React.createElement("i", null)), /* @__PURE__ */ React.createElement("span", { className: "f" }, "dim_users.spec.yaml"), /* @__PURE__ */ React.createElement("span", { className: "sp" }, "\xB7 5 columns")), /* @__PURE__ */ React.createElement("div", { className: "pg-ide-body" }, /* @__PURE__ */ React.createElement("div", { className: "pg-ide-ln" }, /* @__PURE__ */ React.createElement("span", { className: "ln" }, "1"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "dataset"), ": ", /* @__PURE__ */ React.createElement("span", { className: "tok-s" }, "dim_users"))), /* @__PURE__ */ React.createElement("div", { className: "pg-ide-ln" }, /* @__PURE__ */ React.createElement("span", { className: "ln" }, "2"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "owner"), ": ", /* @__PURE__ */ React.createElement("span", { className: "tok-s" }, "analytics_oncall"))), /* @__PURE__ */ React.createElement("div", { className: "pg-ide-ln" }, /* @__PURE__ */ React.createElement("span", { className: "ln" }, "3"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "dataset_acl"), ": ", /* @__PURE__ */ React.createElement("span", { className: "tok-s" }, "corp_assets"))), zone && /* @__PURE__ */ React.createElement("div", { className: "pg-ide-ln" }, /* @__PURE__ */ React.createElement("span", { className: "ln" }, "4"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "data_classification"), ": ", /* @__PURE__ */ React.createElement("span", { className: "tok-s" }, "pii_secure"))), /* @__PURE__ */ React.createElement("div", { className: "pg-ide-ln" }, /* @__PURE__ */ React.createElement("span", { className: "ln" }, zone ? 5 : 4), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "tok-k" }, "columns"), ":")), COLUMNS.map((c, i) => {
        const assigned = assignments[c.id];
        const ok = !c.required || assigned === c.required;
        const bad = c.required && (!assigned || assigned === "none" || assigned !== c.required);
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: c.id,
            className: `pg-col-row ${bad ? "bad" : ""} ${ok && c.required ? "ok" : ""} ${dragging ? "drop" : ""}`,
            onDragOver: (e) => e.preventDefault(),
            onDrop: () => assignTo(c.id),
            onClick: () => dragging && assignTo(c.id)
          },
          /* @__PURE__ */ React.createElement("span", { className: "ln" }, (zone ? 6 : 5) + i),
          /* @__PURE__ */ React.createElement("span", { className: "pg-col-inner" }, /* @__PURE__ */ React.createElement("span", { className: "mk" }, "-"), /* @__PURE__ */ React.createElement("span", { className: "nm" }, c.id), /* @__PURE__ */ React.createElement("span", { className: "ty" }, ": ", c.type), c.pii && /* @__PURE__ */ React.createElement("span", { className: "pii" }, "PII"), /* @__PURE__ */ React.createElement("span", { className: "actor" }, assigned ? /* @__PURE__ */ React.createElement("span", { className: "pill-actor", onClick: (e) => {
            e.stopPropagation();
            clearCol(c.id);
          } }, "actors: [", /* @__PURE__ */ React.createElement("code", null, chipLabel(assigned)), "]", /* @__PURE__ */ React.createElement("i", null, "\xD7")) : c.required ? /* @__PURE__ */ React.createElement("span", { className: "pill-need" }, "needs ", /* @__PURE__ */ React.createElement("code", null, N[c.required])) : /* @__PURE__ */ React.createElement("span", { className: "pill-opt" }, "actor optional")))
        );
      })))),
      /* @__PURE__ */ React.createElement("div", { className: `pg-console ${shipState}` }, /* @__PURE__ */ React.createElement("div", { className: "pg-console-head" }, /* @__PURE__ */ React.createElement("span", null, N.access_gateway, " \xB7 deploy log"), /* @__PURE__ */ React.createElement("span", { className: `pg-status ${shipState}` }, shipState === "idle" && "ready", shipState === "deploying" && "\u25CF deploying", shipState === "blocked" && "\u2715 blocked", shipState === "shipped" && "\u2713 shipped")), /* @__PURE__ */ React.createElement("div", { className: "pg-console-body" }, console_.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty" }, "[access-gateway] waiting for ship\u2026") : console_.map((l, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `pg-c-ln ${l.includes("BLOCKED") || l.includes("aborted") ? "err" : l.includes("\u2713") ? "ok" : ""}` }, l)))),
      /* @__PURE__ */ React.createElement("div", { className: "ctl-row" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: ship, disabled: shipState === "deploying" }, shipState === "deploying" ? "\u25CF Deploying\u2026" : "\u{1F6A2} Ship dbt"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: autofix }, "Autofix \xB7 assign PII actors"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: reset }, "Reset"), shipState === "shipped" && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--theme-green)", fontFamily: "var(--font-mono)", fontSize: 12 } }, "\u2713 confetti ", confetti, "\xD7 \xB7 dbt v238 is live"), shipState === "blocked" && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--theme-red)", fontFamily: "var(--font-mono)", fontSize: 12 } }, "\u2715 patch the dbt and re-ship"))
    );
  }
  function Ch8_Govern({ chapter, internalMode, reduceMotion }) {
    const N = MMNames(internalMode);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Hero,
      {
        accent: chapter.hex,
        eyebrow: `Chapter ${chapter.n} \xB7 ${chapter.time}`,
        title: `Govern: privacy isn't an audit step. It's the <span class='accent'>deploy gate</span>.`,
        hook: `Every column that names a human, device, or contractor must declare what kind of identity it carries. ${N.access_gateway} reads that declaration at deploy time and refuses to ship a ${N.datasetspec} that has unannotated PII. You don't argue with it; you annotate and re-ship. This is the layer that makes the entire warehouse legally safe to query.`,
        meta: [
          { k: "Deploy gate", v: N.access_gateway },
          { k: "ACL", v: N.dataProjectAcl },
          { k: "Actors", v: `${N.canonicalEmployee} \xB7 ${N.canonicalApp}` }
        ]
      }
    ), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "9.1" }, "Actor annotations"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, "Every column declares what it identifies."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A column isn't just a type: it's also a ", /* @__PURE__ */ React.createElement("em", null, "subject"), ". ", /* @__PURE__ */ React.createElement("code", null, "employee_email"), "identifies a person. ", /* @__PURE__ */ React.createElement("code", null, "service_account_id"), " identifies an application.", /* @__PURE__ */ React.createElement("code", null, "contractor_id"), " identifies a contingent worker. Three canonical actors cover >95% of cases:"), /* @__PURE__ */ React.createElement("div", { className: "cards-3" }, /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, N.canonicalEmployee), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Identifies a regular employee"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "Emails, unixnames, manager chains, device serials that map 1:1 to a person. Most common PII in corp data.")), /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, N.canonicalApp), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Identifies an application / service"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "Service account IDs, bot tokens, app UUIDs. Not human PII, but still sensitive: lives in a different ACL bucket.")), /* @__PURE__ */ React.createElement("div", { className: "ccard" }, /* @__PURE__ */ React.createElement("div", { className: "ccard-t" }, N.canonicalCW), /* @__PURE__ */ React.createElement("div", { className: "ccard-n" }, "Identifies a contingent worker"), /* @__PURE__ */ React.createElement("div", { className: "ccard-d" }, "Legally distinct retention and access rules from regular employees. Mislabelling is a compliance incident.")))), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "9.2" }, "The deploy gate"), /* @__PURE__ */ React.createElement("h2", { className: "h2" }, N.access_gateway, " reads the dbt, not your pull request."), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "Reviewers can miss an unannotated PII column. The deploy gate can't. When you ship a dbt,", " ", N.access_gateway, " walks every column, checks the declared actor set against the inferred PII class, resolves the ", N.dataProjectAcl, ", and (optionally) verifies the Policy Zone binding. Any failure: no ship. Patch and re-ship."), /* @__PURE__ */ React.createElement(PermissionGateSim, { internalMode, reduceMotion })), /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(SectionLabel, { n: "9.3" }, "Policy zones & opaque transforms"), /* @__PURE__ */ React.createElement("p", { className: "prose" }, "A ", /* @__PURE__ */ React.createElement("strong", null, "Policy Zone"), " restricts a column so it's only readable inside a specific compute environment: for example, a regionally-isolated cluster that's approved for PII. Opaque transforms (UDFs that take PII in and emit derived non-PII out) must run with", /* @__PURE__ */ React.createElement("code", null, " network=NO_NETWORK"), ` so they can't exfiltrate. Together these cover the "processing PII without leaking PII" case.`), /* @__PURE__ */ React.createElement("div", { className: "code" }, /* @__PURE__ */ React.createElement("div", { className: "code-head" }, /* @__PURE__ */ React.createElement("span", null, "dim_users.spec.yaml \xB7 the shipped annotation"), /* @__PURE__ */ React.createElement("span", { className: "lang" }, "YAML")), /* @__PURE__ */ React.createElement("div", { className: "code-body", dangerouslySetInnerHTML: {
      __html: `<span class="tok-k">dataset</span>: <span class="tok-s">dim_users</span>
<span class="tok-k">owner</span>: <span class="tok-s">analytics_oncall</span>
<span class="tok-k">${N.dataProjectAcl}</span>: <span class="tok-s">corp_assets</span>
<span class="tok-k">data_classification</span>: <span class="tok-s">pii_secure</span>

<span class="tok-k">columns</span>:
  <span class="tok-k">- name</span>: <span class="tok-s">employee_email</span>
    <span class="tok-k">actors</span>: [<span class="tok-s">${N.canonicalEmployee}</span>]
  <span class="tok-k">- name</span>: <span class="tok-s">account_id</span>
    <span class="tok-k">actors</span>: [<span class="tok-s">${N.canonicalEmployee}</span>]
  <span class="tok-k">- name</span>: <span class="tok-s">manager_unixname</span>
    <span class="tok-k">actors</span>: [<span class="tok-s">${N.canonicalEmployee}</span>]
  <span class="tok-k">- name</span>: <span class="tok-s">event_type</span>
    <span class="tok-c"># non-PII, no actor required</span>

<span class="tok-k">transforms</span>:
  <span class="tok-k">- name</span>: <span class="tok-s">hash_account_id</span>
    <span class="tok-k">kind</span>: <span class="tok-s">opaque</span>
    <span class="tok-k">network</span>: <span class="tok-s">NO_NETWORK</span>  <span class="tok-c"># can't exfiltrate PII</span>`
    } }))), /* @__PURE__ */ React.createElement(AntiPatterns, { items: [
      `<b>Shipping a dbt without actor annotations.</b> The deploy fails. You'll be tempted to find a workaround. There is no workaround. Annotate the columns.`,
      `<b>Opaque transforms without <code>network=NO_NETWORK</code>.</b> A UDF that touches PII AND has network access is an exfil path. The audit team will find it.`,
      `<b>Catch-all ACL groups.</b> <code>eng_everyone</code> on a PII dataset is not governance. Scope the ${N.dataProjectAcl} to the project that needs it.`,
      `<b>Mislabelling contingent-worker columns as employees.</b> Retention windows differ. This is a compliance bug, not a bug.`
    ] }), /* @__PURE__ */ React.createElement(BestPractices, { items: [
      `<b>Every PII column gets a <code>${N.canonicalEmployee}</code> / <code>${N.canonicalApp}</code> / <code>${N.canonicalCW}</code> actor.</b> No exceptions, no "we'll add it later."`,
      "<b>Opaque transforms on PII are network-isolated by default.</b> If you need the network, re-architect so PII never touches that transform.",
      "<b>ACLs scoped per-project, never per-team.</b> Teams reorg; projects don't. A per-project ACL survives reorgs and reads cleanly.",
      `<b>Policy Zones for region-restricted data.</b> EU-only data gets a EU-only zone; the column literally can't be read outside that compute environment.`
    ] }), /* @__PURE__ */ React.createElement(Takeaway, { items: [
      `<b>Privacy isn't an audit step. It's the deploy gate.</b> ${N.access_gateway} refuses before the warehouse ever sees the column.`,
      `<b>Three actors cover &gt;95% of PII.</b> ${N.canonicalEmployee}, ${N.canonicalApp}, ${N.canonicalCW}. Know which applies; annotate.`,
      "<b>The dbt is the legal document.</b> Version it like code. Review it like a contract."
    ] }));
  }
  window.Ch8_Govern = Ch8_Govern;
})();
