/* ============================================================================
   presenter-overlay.js — self-served presenter aid for deck-stage decks.
   Additive only: reads the rendered DOM, never touches deck-stage internals.

   Keys:  N        cycle overlay   (hidden → timer pill → timer + notes)
          Shift+T  reset the talk timer

   Reads per-slide data from the rendered <section> attributes:
     data-label          slide title (shown as current/next)
     data-speaker-notes  notes text
     data-time-budget    minutes planned for this slide (optional; enables
                         the pace indicator when present on any slide)
   ============================================================================ */
(function () {
  if (window.__PRESENTER_OVERLAY__) return;
  window.__PRESENTER_OVERLAY__ = true;

  var MODE_HIDDEN = 0, MODE_TIMER = 1, MODE_NOTES = 2;
  var mode = MODE_HIDDEN;
  var startedAt = null; // ms timestamp of first reveal / last reset

  var root = document.createElement('div');
  root.setAttribute('data-presenter-overlay', '');
  root.style.cssText =
    'position:fixed;left:14px;bottom:14px;z-index:2147483000;pointer-events:none;' +
    'font-family:Inter,-apple-system,sans-serif;display:none;max-width:min(560px,44vw);';
  var pill = document.createElement('div');
  pill.style.cssText =
    'display:inline-flex;gap:14px;align-items:baseline;background:rgba(8,8,9,.82);' +
    'color:#fff;border-radius:10px;padding:8px 14px;font-size:15px;font-weight:600;' +
    'font-variant-numeric:tabular-nums;backdrop-filter:blur(4px);';
  var notesBox = document.createElement('div');
  notesBox.style.cssText =
    'display:none;margin-top:8px;background:rgba(8,8,9,.88);color:#E4E6EB;' +
    'border-radius:10px;padding:12px 16px;font-size:15px;line-height:1.45;' +
    'font-weight:500;backdrop-filter:blur(4px);';
  root.appendChild(pill); root.appendChild(notesBox);
  document.documentElement.appendChild(root);

  function sections() {
    return Array.prototype.slice.call(document.querySelectorAll('deck-stage section'));
  }
  function activeIndex(secs) {
    for (var i = 0; i < secs.length; i++) if (secs[i].hasAttribute('data-deck-active')) return i;
    return 0;
  }
  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(s / 60);
    return m + ':' + ('0' + (s % 60)).slice(-2);
  }
  function pace(secs, idx, elapsedMs) {
    // No pace on slides without a budget (backup/Q&A slides) — the sums would
    // read as "whole deck total" and show a nonsense ahead/behind value.
    if (isNaN(parseFloat(secs[idx].getAttribute('data-time-budget') || ''))) return null;
    var any = false, before = 0, through = 0;
    for (var i = 0; i < secs.length; i++) {
      var b = parseFloat(secs[i].getAttribute('data-time-budget') || '');
      if (!isNaN(b)) { any = true; if (i < idx) before += b; if (i <= idx) through += b; }
    }
    if (!any) return null;
    var el = elapsedMs / 60000;
    if (el > through) return { txt: '▲ ' + fmt((el - through) * 60000) + ' behind', color: '#FF6B6B' };
    if (el < before)  return { txt: '▼ ' + fmt((before - el) * 60000) + ' ahead',  color: '#7BDCB5' };
    return { txt: 'on pace', color: '#9FB3C8' };
  }

  function render() {
    if (mode === MODE_HIDDEN) { root.style.display = 'none'; return; }
    root.style.display = 'block';
    var secs = sections();
    if (!secs.length) { pill.textContent = 'no deck'; return; }
    var idx = activeIndex(secs);
    var elapsed = startedAt == null ? 0 : Date.now() - startedAt;
    var cur = secs[idx], next = secs[idx + 1];

    var parts = [];
    parts.push('<span style="color:#5AA0FF;">' + fmt(elapsed) + '</span>');
    parts.push('<span>' + (idx + 1) + '/' + secs.length + '</span>');
    var p = pace(secs, idx, elapsed);
    if (p) parts.push('<span style="color:' + p.color + ';">' + p.txt + '</span>');
    if (next) {
      var nl = next.getAttribute('data-label') || ('slide ' + (idx + 2));
      parts.push('<span style="color:#B0B3B8;font-weight:500;">next: ' +
        nl.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>');
    }
    pill.innerHTML = parts.join('<span style="color:#65686C;">·</span>');

    if (mode === MODE_NOTES) {
      var notes = (cur && cur.getAttribute('data-speaker-notes')) || '(no notes)';
      notesBox.textContent = notes;
      notesBox.style.display = 'block';
    } else {
      notesBox.style.display = 'none';
    }
  }

  // tick the clock
  setInterval(function () { if (mode !== MODE_HIDDEN) render(); }, 1000);

  // follow slide changes
  var mo = new MutationObserver(function () { if (mode !== MODE_HIDDEN) render(); });
  function watch() {
    var stage = document.querySelector('deck-stage');
    if (stage) mo.observe(stage, { attributes: true, subtree: true, attributeFilter: ['data-deck-active'] });
    else setTimeout(watch, 400);
  }
  watch();

  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    var tag = t && t.tagName ? t.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || (t && t.isContentEditable)) return;
    if (e.key === 'n' || e.key === 'N') {
      mode = (mode + 1) % 3;
      if (mode !== MODE_HIDDEN && startedAt == null) startedAt = Date.now();
      render();
    } else if (e.key === 'T' && e.shiftKey) {
      startedAt = Date.now();
      render();
    }
  }, true);
})();
