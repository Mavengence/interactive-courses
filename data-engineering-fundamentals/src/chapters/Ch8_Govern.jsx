/* global React, Hero, SectionLabel, AntiPatterns, BestPractices, Takeaway, Panel, MMNames */
const { useState, useEffect, useRef } = React;

/* ============================================================
 * Ch8 · Govern — Permission Gate
 * Mock IDE editing dbt for dim_users.
 * Drag actor chips onto column rows. Ship → deploy animation.
 * If PII columns lack the required actor (canonicalEmployee / PII_Person) → Access Gateway blocks.
 * Toggle: Policy Zone gate.
 * ============================================================ */

const COLUMNS = [
  { id: 'user_id',          type: 'STRING', pii: false, required: null,                  note: 'non-PII internal id' },
  { id: 'employee_email',    type: 'STRING', pii: true,  required: 'canonicalEmployee',    note: 'identifies a human' },
  { id: 'account_id',     type: 'STRING', pii: true,  required: 'canonicalEmployee',    note: 'device ↔ user linkage' },
  { id: 'event_type',     type: 'INT',    pii: false, required: null,                  note: 'CVSS bucket, 0–4' },
  { id: 'manager_unixname',  type: 'STRING', pii: true,  required: 'canonicalEmployee',    note: 'identifies a human' },
];

const CHIPS = [
  { id: 'canonicalEmployee', labelKey: 'canonicalEmployee', swatch: '#7C5CFF' },
  { id: 'canonicalApp',      labelKey: 'canonicalApp',      swatch: '#2D7DFF' },
  { id: 'canonicalCW',       labelKey: 'canonicalCW',       swatch: '#22D3EE' },
  { id: 'none',              labelKey: 'none',              swatch: '#B9C0CA', label: 'none' },
];

function PermissionGateSim({ internalMode, reduceMotion }) {
  const N = MMNames(internalMode);
  const [assignments, setAssignments] = useState({}); // colId → chipId
  const [dragging, setDragging] = useState(null);
  // "required" = the catalog/infra requires PII Policy Zone (preset in scenario)
  // "zone"     = the user has added the data_classification directive to dbt
  const [zoneRequired, setZoneRequired] = useState(false);
  const [zone, setZone] = useState(false);
  const [shipState, setShipState] = useState('idle'); // idle | deploying | blocked | shipped
  const [console_, setConsole_] = useState([]);
  const [confetti, setConfetti] = useState(0);

  const assignTo = (colId) => {
    if (!dragging) return;
    setAssignments(a => ({...a, [colId]: dragging}));
    setDragging(null);
  };

  const clearCol = (colId) => {
    setAssignments(a => { const n = {...a}; delete n[colId]; return n; });
  };

  const ship = () => {
    setShipState('deploying');
    setConsole_(['[access-gateway] starting deploy of dim_users.spec…']);

    const violations = [];
    COLUMNS.forEach(c => {
      if (c.required) {
        const got = assignments[c.id];
        if (!got || got === 'none' || got !== c.required) {
          violations.push({ col: c.id, needed: N[c.required] });
        }
      }
    });

    let delay = reduceMotion ? 0 : 500;
    const push = (line, ms) => setTimeout(() => setConsole_(l => [...l, line]), (delay += (ms || 250)));

    push('[access-gateway] reading column actor annotations…', 300);
    push(`[access-gateway] ${COLUMNS.length} columns · ${COLUMNS.filter(c=>c.required).length} require actor annotations`, 250);

    if (violations.length > 0) {
      violations.forEach(v => {
        push(`[access-gateway] ✕ BLOCKED · column "${v.col}" missing required actor <${v.needed}>`, 200);
      });
      push('[access-gateway] deploy aborted. Patch dbt and re-ship.', 400);
      setTimeout(() => setShipState('blocked'), delay + 200);
    } else if (zoneRequired && !zone) {
      push(`[access-gateway] ✕ BLOCKED · catalog flags dataset as PII-regional · data_classification "pii_secure" required`, 250);
      push('[access-gateway] deploy aborted. Add <data_classification: pii_secure> to dbt header.', 400);
      setTimeout(() => setShipState('blocked'), delay + 200);
    } else {
      push('[access-gateway] ✓ actor annotations complete', 200);
      if (zone) push('[access-gateway] ✓ data_classification resolved · pii_secure', 150);
      push(`[access-gateway] ✓ ACL <${N.dataProjectAcl}: corp_assets> bound`, 150);
      push('[access-gateway] ✓ deployed to prod · v237 → v238', 250);
      setTimeout(() => {
        setShipState('shipped');
        setConfetti(c => c + 1);
      }, delay + 200);
    }
  };

  const reset = () => { setAssignments({}); setShipState('idle'); setConsole_([]); };
  const autofix = () => {
    const next = {...assignments};
    COLUMNS.forEach(c => { if (c.required) next[c.id] = c.required; });
    setAssignments(next); setShipState('idle'); setConsole_([]);
  };

  const chipLabel = (id) => {
    if (id === 'none') return 'none';
    return N[id] || id;
  };

  return (
    <Panel eyebrow="live simulator · deploy gate"
           title="Permission Gate"
           meta={shipState === 'shipped' ? '✓ shipped' : shipState === 'blocked' ? '✕ blocked' : shipState === 'deploying' ? 'deploying…' : 'ready to ship'}
           caption={`${N.access_gateway} reads the ${N.datasetspec} at deploy time. Every column that names a human must have an actor annotation. No annotation, no ship.`}>

      <div className="pg-layout">
        {/* actor chip rail */}
        <div className="pg-chip-rail">
          <div className="pg-rail-lab">Drag an actor</div>
          {CHIPS.map(c => (
            <div key={c.id}
                 className={`pg-chip ${dragging === c.id ? 'dragging' : ''}`}
                 draggable
                 onDragStart={() => setDragging(c.id)}
                 onDragEnd={() => setDragging(null)}
                 onClick={() => setDragging(d => d === c.id ? null : c.id)}
                 style={{'--sw': c.swatch}}>
              <span className="dot" />
              <code>{chipLabel(c.id)}</code>
            </div>
          ))}
          <div className="pg-rail-hint">Click a chip, then click a column, or drag.</div>
          <label className="pg-zone-toggle">
            <input type="checkbox" checked={zoneRequired} onChange={e => setZoneRequired(e.target.checked)} />
            <span>Catalog requires Policy Zone <code>pii_secure</code></span>
          </label>
          <label className="pg-zone-toggle" style={{marginTop:6}}>
            <input type="checkbox" checked={zone} onChange={e => setZone(e.target.checked)} />
            <span>Add <code>data_classification: pii_secure</code> to dbt</span>
          </label>
        </div>

        {/* IDE editor */}
        <div className="pg-ide">
          <div className="pg-ide-head">
            <span className="dots"><i/><i/><i/></span>
            <span className="f">dim_users.spec.yaml</span>
            <span className="sp">· 5 columns</span>
          </div>
          <div className="pg-ide-body">
            <div className="pg-ide-ln"><span className="ln">1</span><span><span className="tok-k">dataset</span>: <span className="tok-s">dim_users</span></span></div>
            <div className="pg-ide-ln"><span className="ln">2</span><span><span className="tok-k">owner</span>: <span className="tok-s">analytics_oncall</span></span></div>
            <div className="pg-ide-ln"><span className="ln">3</span><span><span className="tok-k">dataset_acl</span>: <span className="tok-s">corp_assets</span></span></div>
            {zone && <div className="pg-ide-ln"><span className="ln">4</span><span><span className="tok-k">data_classification</span>: <span className="tok-s">pii_secure</span></span></div>}
            <div className="pg-ide-ln"><span className="ln">{zone ? 5 : 4}</span><span><span className="tok-k">columns</span>:</span></div>
            {COLUMNS.map((c, i) => {
              const assigned = assignments[c.id];
              const ok = !c.required || assigned === c.required;
              const bad = c.required && (!assigned || assigned === 'none' || assigned !== c.required);
              return (
                <div key={c.id}
                     className={`pg-col-row ${bad ? 'bad' : ''} ${ok && c.required ? 'ok' : ''} ${dragging ? 'drop' : ''}`}
                     onDragOver={e => e.preventDefault()}
                     onDrop={() => assignTo(c.id)}
                     onClick={() => dragging && assignTo(c.id)}>
                  <span className="ln">{(zone ? 6 : 5) + i}</span>
                  <span className="pg-col-inner">
                    <span className="mk">-</span>
                    <span className="nm">{c.id}</span>
                    <span className="ty">: {c.type}</span>
                    {c.pii && <span className="pii">PII</span>}
                    <span className="actor">
                      {assigned ? (
                        <span className="pill-actor" onClick={(e) => { e.stopPropagation(); clearCol(c.id); }}>
                          actors: [<code>{chipLabel(assigned)}</code>]
                          <i>×</i>
                        </span>
                      ) : c.required ? (
                        <span className="pill-need">needs <code>{N[c.required]}</code></span>
                      ) : (
                        <span className="pill-opt">actor optional</span>
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Access Gateway console */}
      <div className={`pg-console ${shipState}`}>
        <div className="pg-console-head">
          <span>{N.access_gateway} · deploy log</span>
          <span className={`pg-status ${shipState}`}>
            {shipState === 'idle' && 'ready'}
            {shipState === 'deploying' && '● deploying'}
            {shipState === 'blocked' && '✕ blocked'}
            {shipState === 'shipped' && '✓ shipped'}
          </span>
        </div>
        <div className="pg-console-body">
          {console_.length === 0 ? <div className="empty">[access-gateway] waiting for ship…</div>
            : console_.map((l, i) => (
              <div key={i} className={`pg-c-ln ${l.includes('BLOCKED') || l.includes('aborted') ? 'err' : l.includes('✓') ? 'ok' : ''}`}>{l}</div>
            ))}
        </div>
      </div>

      <div className="ctl-row">
        <button className="btn btn-primary" onClick={ship} disabled={shipState === 'deploying'}>
          {shipState === 'deploying' ? '● Deploying…' : '🚢 Ship dbt'}
        </button>
        <button className="btn" onClick={autofix}>Autofix · assign PII actors</button>
        <button className="btn" onClick={reset}>Reset</button>
        {shipState === 'shipped' && <span style={{color:'var(--theme-green)', fontFamily:'var(--font-mono)', fontSize:12}}>✓ confetti {confetti}× · dbt v238 is live</span>}
        {shipState === 'blocked' && <span style={{color:'var(--theme-red)', fontFamily:'var(--font-mono)', fontSize:12}}>✕ patch the dbt and re-ship</span>}
      </div>
    </Panel>
  );
}

function Ch8_Govern({ chapter, internalMode, reduceMotion }) {
  const N = MMNames(internalMode);
  return (
    <>
      <Hero accent={chapter.hex}
            eyebrow={`Chapter ${chapter.n} · ${chapter.time}`}
            title={`Govern: privacy isn't an audit step. It's the <span class='accent'>deploy gate</span>.`}
            hook={`Every column that names a human, device, or contractor must declare what kind of identity it carries. ${N.access_gateway} reads that declaration at deploy time and refuses to ship a ${N.datasetspec} that has unannotated PII. You don't argue with it; you annotate and re-ship. This is the layer that makes the entire warehouse legally safe to query.`}
            meta={[
              { k: 'Deploy gate', v: N.access_gateway },
              { k: 'ACL', v: N.dataProjectAcl },
              { k: 'Actors', v: `${N.canonicalEmployee} · ${N.canonicalApp}` },
            ]} />

      <section className="section">
        <SectionLabel n="9.1">Actor annotations</SectionLabel>
        <h2 className="h2">Every column declares what it identifies.</h2>
        <p className="prose">
          A column isn't just a type: it's also a <em>subject</em>. <code>employee_email</code>
          identifies a person. <code>service_account_id</code> identifies an application.
          <code>contractor_id</code> identifies a contingent worker. Three canonical actors cover
          &gt;95% of cases:
        </p>
        <div className="cards-3">
          <div className="ccard">
            <div className="ccard-t">{N.canonicalEmployee}</div>
            <div className="ccard-n">Identifies a regular employee</div>
            <div className="ccard-d">Emails, unixnames, manager chains, device serials that map 1:1 to a person. Most common PII in corp data.</div>
          </div>
          <div className="ccard">
            <div className="ccard-t">{N.canonicalApp}</div>
            <div className="ccard-n">Identifies an application / service</div>
            <div className="ccard-d">Service account IDs, bot tokens, app UUIDs. Not human PII, but still sensitive: lives in a different ACL bucket.</div>
          </div>
          <div className="ccard">
            <div className="ccard-t">{N.canonicalCW}</div>
            <div className="ccard-n">Identifies a contingent worker</div>
            <div className="ccard-d">Legally distinct retention and access rules from regular employees. Mislabelling is a compliance incident.</div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionLabel n="9.2">The deploy gate</SectionLabel>
        <h2 className="h2">{N.access_gateway} reads the dbt, not your pull request.</h2>
        <p className="prose">
          Reviewers can miss an unannotated PII column. The deploy gate can't. When you ship a dbt,
          {' '}{N.access_gateway} walks every column, checks the declared actor set against the inferred
          PII class, resolves the {N.dataProjectAcl}, and (optionally) verifies the Policy Zone
          binding. Any failure: no ship. Patch and re-ship.
        </p>
        <PermissionGateSim internalMode={internalMode} reduceMotion={reduceMotion} />
      </section>

      <section className="section">
        <SectionLabel n="9.3">Policy zones & opaque transforms</SectionLabel>
        <p className="prose">
          A <strong>Policy Zone</strong> restricts a column so it's only readable inside a specific
          compute environment: for example, a regionally-isolated cluster that's approved for PII.
          Opaque transforms (UDFs that take PII in and emit derived non-PII out) must run with
          <code> network=NO_NETWORK</code> so they can't exfiltrate. Together these cover the
          "processing PII without leaking PII" case.
        </p>
        <div className="code">
          <div className="code-head"><span>dim_users.spec.yaml · the shipped annotation</span><span className="lang">YAML</span></div>
          <div className="code-body" dangerouslySetInnerHTML={{__html:
`<span class="tok-k">dataset</span>: <span class="tok-s">dim_users</span>
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
          }} />
        </div>
      </section>

      <AntiPatterns items={[
        `<b>Shipping a dbt without actor annotations.</b> The deploy fails. You'll be tempted to find a workaround. There is no workaround. Annotate the columns.`,
        `<b>Opaque transforms without <code>network=NO_NETWORK</code>.</b> A UDF that touches PII AND has network access is an exfil path. The audit team will find it.`,
        `<b>Catch-all ACL groups.</b> <code>eng_everyone</code> on a PII dataset is not governance. Scope the ${N.dataProjectAcl} to the project that needs it.`,
        `<b>Mislabelling contingent-worker columns as employees.</b> Retention windows differ. This is a compliance bug, not a bug.`,
      ]} />

      <BestPractices items={[
        `<b>Every PII column gets a <code>${N.canonicalEmployee}</code> / <code>${N.canonicalApp}</code> / <code>${N.canonicalCW}</code> actor.</b> No exceptions, no "we'll add it later."`,
        "<b>Opaque transforms on PII are network-isolated by default.</b> If you need the network, re-architect so PII never touches that transform.",
        "<b>ACLs scoped per-project, never per-team.</b> Teams reorg; projects don't. A per-project ACL survives reorgs and reads cleanly.",
        `<b>Policy Zones for region-restricted data.</b> EU-only data gets a EU-only zone; the column literally can't be read outside that compute environment.`,
      ]} />

      <Takeaway items={[
        `<b>Privacy isn't an audit step. It's the deploy gate.</b> ${N.access_gateway} refuses before the warehouse ever sees the column.`,
        `<b>Three actors cover &gt;95% of PII.</b> ${N.canonicalEmployee}, ${N.canonicalApp}, ${N.canonicalCW}. Know which applies; annotate.`,
        "<b>The dbt is the legal document.</b> Version it like code. Review it like a contract.",
      ]} />
    </>
  );
}

window.Ch8_Govern = Ch8_Govern;
