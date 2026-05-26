#!/usr/bin/env bash
# ============================================================================
#  new-lesson.sh — stamp a new Codex Course lesson from the template.
#
#  Usage:
#    ./scripts/new-lesson.sh 13 my-slug "My Lesson Title" "Track name"
#
#  Produces:
#    lessons/13-my-slug.html          (copy of templates/lesson-template.html)
#    js/lessons/L13.js                (bespoke-widget stub)
#
#  Reminds you to register the lesson in js/lessons.js.
# ============================================================================
set -euo pipefail

if [[ $# -lt 4 ]]; then
  echo "usage: $0 <NN> <slug> <title> <track-name>" >&2
  echo "  example: $0 13 ship-it 'Ship it' 'Track 04 — Advanced'" >&2
  exit 1
fi

NN="$1"       # e.g. "13"
SLUG="$2"     # e.g. "ship-it"
TITLE="$3"    # e.g. "Ship it"
TRACK="$4"    # e.g. "Track 04 — Advanced"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/templates/lesson-template.html"
DEST="$ROOT/lessons/${NN}-${SLUG}.html"
WIDGET="$ROOT/js/lessons/L${NN}.js"

if [[ -e "$DEST" ]]; then
  echo "refusing to overwrite $DEST" >&2
  exit 1
fi

# Stamp the lesson HTML
sed -e "s|TEMPLATE:LESSON_TITLE|${TITLE}|g" \
    -e "s|TEMPLATE:TRACK_NAME|${TRACK}|g" \
    -e "s|lesson-NN|lesson-${NN}|g" \
    -e "s|LESSON NN|LESSON ${NN}|g" \
    -e "s|LNN|L${NN}|g" \
    "$SRC" > "$DEST"

# Stub the bespoke widget
cat > "$WIDGET" <<EOF
// Bespoke interactive widget for lesson ${NN} (${TITLE}).
// Mounted by js/final.js into #bespoke-host on the lesson page.
(function () {
  function mount(host) {
    host.innerHTML = '<p class="muted">Widget for lesson ${NN} not implemented yet.</p>';
  }
  window.addEventListener('DOMContentLoaded', function () {
    var host = document.getElementById('bespoke-host');
    if (host) mount(host);
  });
})();
EOF

echo "✓ wrote   $DEST"
echo "✓ wrote   $WIDGET"
echo
echo "next steps:"
echo "  1. edit  js/lessons.js  and add an entry for ${NN}-${SLUG}"
echo "  2. fill in the TEMPLATE:… tokens in $DEST"
echo "  3. run   python3 -m http.server 8787   and open /lessons/${NN}-${SLUG}.html"
