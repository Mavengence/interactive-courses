/* ============================================================
 * Lesson 03 — Modeling: Star schema diagram-toy
 * ============================================================ */
(function () {
  const M3 = window.M3 = window.M3 || {};
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, parent = null) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) {
      if (attrs[k] === undefined || attrs[k] === null) continue;
      el.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(el);
    return el;
  };

  /* ============================================================
   * Star Schema, dissected
   * Center fact_orders + 4 surrounding dim tables.
   * Hover a dim → highlight FK link + SQL clause.
   * ============================================================ */
  M3.StarSchema = function (root) {
    if (!root) return;
    const svgEl = root.querySelector('#ss-svg');
    const sqlEl = root.querySelector('#ss-sql');
    const noteEl = root.querySelector('#ss-note');
    if (!svgEl) return;

    const ROW_H = 22;
    const HEAD_H = 38;
    const PAD = 14; /* breathing room for drop-shadow halo */

    /* Coordinates in viewBox 760 × 540.
     * Layout (packed for no clipping + stable drop-shadow halo):
     *   dim_user  (TL)  ───────────  dim_product (TR)
     *                  fact_orders
     *   dim_date  (BL)  ───────────  dim_store   (BR)
     */
    const TABLES = {
      fact: {
        kind: 'fact',
        title: 'fact_orders',
        sub:   'one row per order · ~120M rows/yr',
        /* 7 rows: HEAD_H + 7*ROW_H = 38 + 154 = 192. Centered vertically (540/2=270). */
        x: 270, y: 174, w: 220, h: HEAD_H + 7 * ROW_H,
        cols: [
          { name: 'order_id',   type: 'bigint',   tag: 'PK' },
          { name: 'user_sk',    type: 'int',      tag: 'FK', dim: 'user' },
          { name: 'product_sk', type: 'int',      tag: 'FK', dim: 'product' },
          { name: 'date_sk',    type: 'int',      tag: 'FK', dim: 'date' },
          { name: 'store_sk',   type: 'int',      tag: 'FK', dim: 'store' },
          { name: 'amount',     type: 'decimal',  tag: 'M' },
          { name: 'quantity',   type: 'int',      tag: 'M' },
        ],
      },
      user: {
        kind: 'dim',
        title: 'dim_user',
        sub: 'who · SCD2',
        /* 5 rows: 38 + 110 = 148 */
        x: 22, y: 22, w: 200, h: HEAD_H + 5 * ROW_H,
        cols: [
          { name: 'user_sk',     type: 'int',     tag: 'PK' },
          { name: 'user_id',     type: 'string',  tag: 'NK' },
          { name: 'country',     type: 'string' },
          { name: 'signed_up',   type: 'date' },
          { name: 'valid_from',  type: 'date' },
        ],
      },
      product: {
        kind: 'dim',
        title: 'dim_product',
        sub: 'what',
        x: 538, y: 22, w: 200, h: HEAD_H + 5 * ROW_H,
        cols: [
          { name: 'product_sk', type: 'int',     tag: 'PK' },
          { name: 'sku',        type: 'string',  tag: 'NK' },
          { name: 'category',   type: 'string' },
          { name: 'price_band', type: 'string' },
          { name: 'launched',   type: 'date' },
        ],
      },
      date: {
        kind: 'dim',
        title: 'dim_date',
        sub: 'when · conformed',
        /* 4 rows: 38 + 88 = 126.  y so that y+h ≤ 540-PAD: 540-14-126 = 400 */
        x: 22, y: 392, w: 200, h: HEAD_H + 4 * ROW_H,
        cols: [
          { name: 'date_sk',     type: 'int',     tag: 'PK' },
          { name: 'date',        type: 'date' },
          { name: 'day_of_week', type: 'string' },
          { name: 'is_weekend',  type: 'bool' },
        ],
      },
      store: {
        kind: 'dim',
        title: 'dim_store',
        sub: 'where',
        x: 538, y: 392, w: 200, h: HEAD_H + 4 * ROW_H,
        cols: [
          { name: 'store_sk',  type: 'int',     tag: 'PK' },
          { name: 'store_id',  type: 'string',  tag: 'NK' },
          { name: 'region',    type: 'string' },
          { name: 'channel',   type: 'string' },
        ],
      },
    };

    /* notes shown when hovering a given dim or fact */
    const NOTES = {
      user: {
        head: 'dim_user · who',
        body: 'Joined to <code>fact_orders</code> on <code>user_sk</code>. <b>SCD2</b>: when a user changes country, insert a new row with <code>valid_from / valid_to</code>; old facts still join to the old row, history preserved.',
      },
      product: {
        head: 'dim_product · what',
        body: 'Joined on <code>product_sk</code>. Holds the descriptive context for the measure (category, price band). Most filters in BI dashboards land here.',
      },
      date: {
        head: 'dim_date · when',
        body: 'A <b>conformed dimension</b> shared by every fact in the warehouse. <code>date_sk</code> as int (e.g. 20260415) is faster to join than a true date.',
      },
      store: {
        head: 'dim_store · where',
        body: 'Joined on <code>store_sk</code>. Region/channel rollups. Surrogate key (<code>store_sk</code>) so the source\'s natural <code>store_id</code> can change without rewiring history.',
      },
      fact: {
        head: 'fact_orders · the measurement',
        body: 'Holds <em>only</em> foreign keys + numeric <b>measures</b>. No descriptive strings. One row = one business event. This is the table the aggregations actually scan.',
      },
      _idle: {
        head: 'Star schema, dissected',
        body: 'Hover a table to see its role and the join it serves. The <em>fact</em> is at the center holding the measurements and FKs. Each <em>dimension</em> is a point of the star, holding the descriptive context.',
      },
    };

    /* render styled token-colored sql */
    const SQL = `<span class="kw">SELECT</span>
  <span class="dim" data-d="date">d</span>.day_of_week,
  <span class="dim" data-d="product">p</span>.category,
  <span class="agg">SUM</span>(f.amount)         <span class="kw">AS</span> revenue,
  <span class="agg">COUNT</span>(*)              <span class="kw">AS</span> orders
<span class="kw">FROM</span>   fact_orders            f
<span class="kw">JOIN</span>   dim_date    <span class="dim" data-d="date">d</span> <span class="kw">ON</span> f.date_sk    = <span class="dim" data-d="date">d</span>.date_sk
<span class="kw">JOIN</span>   dim_user    <span class="dim" data-d="user">u</span> <span class="kw">ON</span> f.user_sk    = <span class="dim" data-d="user">u</span>.user_sk
<span class="kw">JOIN</span>   dim_product <span class="dim" data-d="product">p</span> <span class="kw">ON</span> f.product_sk = <span class="dim" data-d="product">p</span>.product_sk
<span class="kw">JOIN</span>   dim_store   <span class="dim" data-d="store">s</span> <span class="kw">ON</span> f.store_sk   = <span class="dim" data-d="store">s</span>.store_sk
<span class="kw">WHERE</span>  <span class="dim" data-d="user">u</span>.country = <span class="lit">'US'</span>
  <span class="kw">AND</span>  <span class="dim" data-d="date">d</span>.is_weekend
<span class="kw">GROUP BY</span> 1, 2;`;
    sqlEl.innerHTML = SQL;

    /* clear svg */
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

    /* defs: arrow markers */
    const defs = svg('defs', {}, svgEl);
    ['idle', 'hot'].forEach(kind => {
      const m = svg('marker', {
        id: `ss-arrow-${kind}`, viewBox: '0 0 10 10',
        refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto'
      }, defs);
      svg('path', {
        d: 'M 0 0 L 10 5 L 0 10 z',
        fill: kind === 'hot' ? 'var(--m3-link-hot)' : 'var(--m3-link)'
      }, m);
    });

    /* draw lines first (under tables) */
    const linkLayer = svg('g', { class: 'ss-links' }, svgEl);
    const tableLayer = svg('g', { class: 'ss-tables' }, svgEl);

    /* row anchor — returns { x, y } of the right or left edge of a column row */
    function rowAnchor(tableKey, colName, side) {
      const t = TABLES[tableKey];
      const idx = t.cols.findIndex(c => c.name === colName);
      const y = t.y + HEAD_H + idx * ROW_H + ROW_H / 2;
      const x = side === 'right' ? t.x + t.w : t.x;
      return { x, y };
    }

    /* build links: each fact FK to its dim's PK */
    const links = [];
    TABLES.fact.cols.forEach(c => {
      if (c.tag !== 'FK') return;
      const dimKey = c.dim;
      const dim = TABLES[dimKey];
      const pkCol = dim.cols.find(cc => cc.tag === 'PK').name;

      /* decide sides based on dim position */
      const factCx = TABLES.fact.x + TABLES.fact.w / 2;
      const dimCx = dim.x + dim.w / 2;
      const factSide = dimCx < factCx ? 'left' : 'right';
      const dimSide  = dimCx < factCx ? 'right' : 'left';

      const a = rowAnchor('fact', c.name, factSide);
      const b = rowAnchor(dimKey, pkCol, dimSide);

      /* gentle cubic curve */
      const midX = (a.x + b.x) / 2;
      const d = `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
      const line = svg('path', {
        class: 'ss-link',
        'data-dim': dimKey,
        d,
        fill: 'none',
        'marker-start': `url(#ss-arrow-idle)`,
      }, linkLayer);
      links.push({ dim: dimKey, line });
    });

    /* table cards */
    const tableEls = {};
    Object.keys(TABLES).forEach(key => {
      const t = TABLES[key];
      const g = svg('g', {
        class: `ss-table ss-table-${t.kind}`,
        'data-key': key,
        transform: `translate(${t.x} ${t.y})`,
      }, tableLayer);

      /* card body */
      svg('rect', {
        class: 'ss-card',
        x: 0, y: 0, width: t.w, height: t.h,
        rx: 8, ry: 8,
      }, g);

      /* header strip */
      svg('rect', {
        class: 'ss-card-head',
        x: 0, y: 0, width: t.w, height: HEAD_H,
        rx: 8, ry: 8,
      }, g);
      /* head bottom rule */
      svg('line', {
        class: 'ss-card-rule',
        x1: 0, y1: HEAD_H, x2: t.w, y2: HEAD_H,
      }, g);

      /* title */
      const title = svg('text', {
        class: 'ss-title',
        x: 14, y: 19,
      }, g);
      title.textContent = t.title;
      const sub = svg('text', {
        class: 'ss-sub',
        x: 14, y: 32,
      }, g);
      sub.textContent = t.sub;

      /* rows */
      t.cols.forEach((c, i) => {
        const ry = HEAD_H + i * ROW_H;

        /* full-width row (transparent) so we can draw row hover */
        svg('rect', {
          class: 'ss-row-bg',
          'data-col': c.name,
          x: 0, y: ry, width: t.w, height: ROW_H,
        }, g);

        /* tag badge box */
        if (c.tag) {
          const tagW = c.tag === 'PK' ? 20 : c.tag === 'FK' ? 20 : c.tag === 'NK' ? 20 : 16;
          svg('rect', {
            class: `ss-tag ss-tag-${c.tag}`,
            x: 10, y: ry + 5, width: tagW, height: ROW_H - 10,
            rx: 3, ry: 3,
          }, g);
          const tagT = svg('text', {
            class: 'ss-tag-text',
            x: 10 + tagW / 2, y: ry + 14,
            'text-anchor': 'middle',
          }, g);
          tagT.textContent = c.tag;
        }

        /* column name */
        const nameT = svg('text', {
          class: `ss-col ss-col-${c.tag || 'plain'}`,
          x: 38, y: ry + 14,
        }, g);
        nameT.textContent = c.name;

        /* type, right-aligned */
        const typeT = svg('text', {
          class: 'ss-type',
          x: t.w - 10, y: ry + 14,
          'text-anchor': 'end',
        }, g);
        typeT.textContent = c.type;

        /* row-bottom thin rule */
        if (i < t.cols.length - 1) {
          svg('line', {
            class: 'ss-row-rule',
            x1: 8, y1: ry + ROW_H, x2: t.w - 8, y2: ry + ROW_H,
          }, g);
        }
      });

      tableEls[key] = g;
    });

    /* hover handlers */
    function setHot(key) {
      svgEl.classList.toggle('hot', !!key);
      Object.keys(tableEls).forEach(k => {
        const isHot = key && (k === key || (key === 'fact' && TABLES.fact.cols.some(c => c.dim === k)));
        tableEls[k].classList.toggle('hot', !!key && k === key);
        tableEls[k].classList.toggle('dim', !!key && k !== key && !(key === 'fact' && k !== 'fact' && false));
      });
      /* Actually: when hovering a dim, fact stays normal; when hovering fact, dims stay normal */
      Object.keys(tableEls).forEach(k => {
        tableEls[k].classList.remove('hot', 'dim');
      });
      if (key) {
        tableEls[key].classList.add('hot');
        if (key !== 'fact') tableEls.fact.classList.add('hot-partner');
        else Object.keys(tableEls).forEach(k => k !== 'fact' && tableEls[k].classList.add('hot-partner'));
      }
      Object.keys(tableEls).forEach(k => {
        if (key && !tableEls[k].classList.contains('hot') && !tableEls[k].classList.contains('hot-partner')) {
          tableEls[k].classList.add('dim');
        } else {
          tableEls[k].classList.remove('dim');
        }
      });

      /* links */
      links.forEach(l => {
        l.line.classList.remove('hot', 'dim');
        if (!key) return;
        const isLinkHot = (key === 'fact') || (l.dim === key);
        l.line.classList.toggle('hot', isLinkHot);
        l.line.classList.toggle('dim', !isLinkHot);
      });
      links.forEach(l => {
        l.line.setAttribute('marker-start', `url(#ss-arrow-${l.line.classList.contains('hot') ? 'hot' : 'idle'})`);
      });

      /* highlight fact FK rows */
      const factG = tableEls.fact;
      factG.querySelectorAll('.ss-row-bg').forEach(r => r.classList.remove('hot'));
      if (key && key !== 'fact') {
        const fkCol = TABLES.fact.cols.find(c => c.dim === key);
        if (fkCol) {
          const r = factG.querySelector(`.ss-row-bg[data-col="${fkCol.name}"]`);
          if (r) r.classList.add('hot');
        }
      } else if (key === 'fact') {
        TABLES.fact.cols.forEach(c => {
          if (c.tag === 'FK' || c.tag === 'M') {
            const r = factG.querySelector(`.ss-row-bg[data-col="${c.name}"]`);
            if (r) r.classList.add('hot');
          }
        });
      }

      /* highlight SQL */
      sqlEl.querySelectorAll('.dim').forEach(d => {
        d.classList.toggle('hot', key && (key === 'fact' || d.dataset.d === key));
      });

      /* note */
      const note = key ? NOTES[key] : NOTES._idle;
      noteEl.querySelector('.ss-note-head').textContent = note.head;
      noteEl.querySelector('.ss-note-body').innerHTML = note.body;
    }

    Object.keys(tableEls).forEach(k => {
      const g = tableEls[k];
      g.addEventListener('mouseenter', () => setHot(k));
      g.addEventListener('mouseleave', () => setHot(null));
    });
    /* sql hover */
    sqlEl.querySelectorAll('.dim').forEach(d => {
      d.addEventListener('mouseenter', () => setHot(d.dataset.d));
      d.addEventListener('mouseleave', () => setHot(null));
    });

    setHot(null);
  };

  /* auto-init when present.
   * Guard against DOMContentLoaded having already fired (e.g., dynamic script injection). */
  function _initStar() {
    M3.StarSchema(document.getElementById('fig-star'));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initStar);
  } else {
    _initStar();
  }
})();
