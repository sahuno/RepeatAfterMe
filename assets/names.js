/* Repeat After Me: the "Three names" lesson.
   A zoomable icicle (a tree drawn as rows of boxes) of RepeatMasker names for mouse and human,
   one raw table row whose name columns light up their level, four "labels that mislead" jumps,
   and a small double-counting toy. Vanilla JS, no dependencies. Data: window.NAMES_DATA from data/names.js.
   Test hooks (render instantly): ?sp=mouse|human&size=bp|rows&zoom=LINE|L1&sel=LINE|L1|L1Md_T&level=1..3&flag=b1|q|iap|only
   Paths join class, family and subfamily with "|" because some names contain "/".
   window.Names exposes go(patch), flag(id), state(), setInstant(bool), drawn(). */
(function () {
  'use strict';
  var D = window.NAMES_DATA;
  var fig = document.getElementById('icicle');
  if (!D || !fig) return;
  var svg = fig.querySelector('svg.ice');
  var crumbsEl = document.getElementById('crumbs');
  var panel = document.getElementById('panel');
  var noteEl = document.getElementById('flagnote');
  var rawEl = document.getElementById('raw');

  var SPNAME = { mouse: 'Mouse', human: 'Human' };
  var LEVEL = ['Genome', 'Class', 'Family', 'Subfamily'];
  var COLNAME = ['', 'repClass', 'repFamily', 'repName'];
  var ROWH = [30, 64, 64, 132], LAB = 22, GAP = 8;
  var COL = { LINE: '#E69F00', SINE: '#56B4E9', LTR: '#009E73', DNA: '#CC79A7', RC: '#F0E442', Retroposon: '#D55E00' };
  var CH = 7.3; // width of one 12 px monospace character
  var SEP = '|';

  // ---------- tree ----------
  var byPath = {};
  function add(node) { byPath[node.path] = node; return node; }
  var root = add({ n: 'Genome', depth: 0, path: '', parent: null, kids: [], v: {} });
  D.tree.forEach(function (c) {
    var cn = add({ n: c.n, depth: 1, path: c.n, parent: root, kids: [], v: c.v, te: c.te, cls: c.n });
    root.kids.push(cn);
    c.c.forEach(function (f) {
      var fn = add({ n: f.n, depth: 2, path: c.n + SEP + f.n, parent: cn, kids: [], v: f.v, te: c.te, cls: c.n });
      cn.kids.push(fn);
      f.c.forEach(function (s) {
        fn.kids.push(add({ n: s.n, depth: 3, path: fn.path + SEP + s.n, parent: fn, kids: [], v: s.v, te: c.te, cls: c.n, fold: s.fold }));
      });
    });
  });
  ['mouse', 'human'].forEach(function (sp) {
    var bp = 0, rows = 0;
    root.kids.forEach(function (c) { var v = c.v[sp] || [0, 0]; bp += v[0]; rows += v[1]; });
    var g = D.species[sp].genome;
    root.v[sp] = [g, rows];
    root.nr = root.nr || {};
    root.nr[sp] = Math.max(0, g - bp);
  });
  var noRep = add({ n: 'No repeat', depth: 1, path: '~norepeat', parent: root, kids: [], v: {}, synthetic: true });
  ['mouse', 'human'].forEach(function (sp) { noRep.v[sp] = [root.nr[sp], 0]; });
  root.kids.push(noRep);
  var ALL = Object.keys(byPath).map(function (k) { return byPath[k]; });

  // ---------- state ----------
  var q = new URLSearchParams(location.search);
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var instant = true; // first render is always instant
  var S = { sp: 'mouse', size: 'bp', zoom: '', sel: '', level: 0, flag: '' };

  function val(n, sp, size) { var v = n.v[sp]; if (!v) return 0; return size === 'rows' ? v[1] : v[0]; }
  function nodeOf(p) { return byPath[p] || null; }
  function isAnc(a, b) { for (var x = b; x; x = x.parent) if (x === a) return true; return false; } // a is b or above b

  function layout(sp, size) {
    (function lay(n, x0, x1) {
      n.t0 = x0; n.t1 = x1;
      var tot = 0; n.kids.forEach(function (k) { tot += val(k, sp, size); });
      if (n === root && size === 'bp') tot = Math.max(tot, val(root, sp, 'bp'));
      var x = x0;
      n.kids.forEach(function (k) { var w = tot > 0 ? (x1 - x0) * val(k, sp, size) / tot : 0; lay(k, x, x + w); x += w; });
    })(root, 0, 1);
  }

  // ---------- drawing ----------
  var W = 600, H = 0, rowTop = [];
  (function () { var y = 0; for (var d = 0; d < 4; d++) { y += LAB; rowTop[d] = y; y += ROWH[d] + GAP; } H = y - GAP; })();
  var drawnCount = 0;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pct(bp, sp) { var p = bp / D.species[sp].genome * 100; return p >= 0.995 ? p.toFixed(1) + '%' : p >= 0.01 ? p.toFixed(2) + '%' : p > 0 ? '<0.01%' : '0%'; }
  function big(n) { return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(n); }
  function metric(n) { var v = n.v[S.sp] || [0, 0]; return S.size === 'rows' ? big(v[1]) + ' rows' : pct(v[0], S.sp); }
  function fill(n) {
    if (n.depth === 0) return 'var(--genome)';
    if (n.synthetic) return null;
    var base = n.cls.replace(/\?$/, '');
    if (n.te && COL[base]) return /\?$/.test(n.cls) ? 'url(#hatch-' + base + ')' : COL[base];
    return 'var(--otherrep)';
  }
  function inkFor(n) { return (n.te && n.depth > 0) ? 'var(--ink-on-col)' : 'var(--ink)'; }
  function fit(s, px) { var max = Math.floor((px - 8) / CH); if (max < 2) return ''; return s.length <= max ? s : s.slice(0, Math.max(1, max - 1)) + '…'; }
  function label(n) { return n.fold ? n.n : n.n; }

  function draw() {
    W = Math.max(280, Math.round(svg.parentNode.clientWidth - 20));
    var out = [];
    out.push('<defs>');
    Object.keys(COL).forEach(function (k) {
      out.push('<pattern id="hatch-' + k + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="var(--surface)"/><rect width="3.5" height="7" fill="' + COL[k] + '"/></pattern>');
    });
    out.push('</defs>');
    for (var d = 0; d < 4; d++) {
      var on = S.level === d && d > 0;
      out.push('<text class="rowlab' + (on ? ' on' : '') + '" x="0" y="' + (rowTop[d] - 7) + '">' + LEVEL[d].toUpperCase() + (d ? ' · ' + COLNAME[d] : '') + (on ? '  ◀ the name you tapped' : '') + '</text>');
    }
    var selBox = null;
    drawnCount = 0;
    var MIN = 0.35; // px; narrower boxes are merged into one lighter strip with their thin neighbours
    function drawOne(n) {
      var a = n.c0 * W, b = n.c1 * W;
      if (!(b - a >= MIN) || b < 0 || a > W) return;
      var x0 = Math.max(0, a), x1 = Math.min(W, b), w = x1 - x0, y = rowTop[n.depth], h = ROWH[n.depth];
      drawnCount++;
      var dim = S.level > 0 && n.depth !== S.level;
      var f = fill(n);
      var cls = n.synthetic ? 'nr' : (w >= 3 ? 'box' : 'box thin');
      var name = n.depth === 0 ? SPNAME[S.sp] + ' genome' : label(n);
      var tip = (n.depth ? LEVEL[n.depth] + ' ' : '') + name + ' · ' + metric(n);
      var txt = '';
      var lab = fit(name, w), sub = fit(metric(n), w);
      if (lab && (n.depth < 3 || lab.length >= Math.min(name.length, 4))) {
        var tx = x0 + 5;
        txt += '<text x="' + tx.toFixed(1) + '" y="' + (y + (n.depth === 0 ? 19 : 18)) + '" fill="' + inkFor(n) + '" font-weight="600">' + esc(lab) + '</text>';
        if (sub && n.depth > 0 && n.depth < 3) txt += '<text x="' + tx.toFixed(1) + '" y="' + (y + 34) + '" fill="' + inkFor(n) + '">' + esc(sub) + '</text>';
        if (sub && n.depth === 3) txt += '<text x="' + tx.toFixed(1) + '" y="' + (y + 34) + '" fill="' + inkFor(n) + '">' + esc(sub) + '</text>';
      } else if (n.depth === 3 && w >= 14) {
        var vmax = Math.floor((h - 10) / CH), vs = name.length <= vmax ? name : name.slice(0, vmax - 1) + '…';
        var cx = x0 + w / 2 + 4, cy = y + h - 6;
        txt += '<text transform="translate(' + cx.toFixed(1) + ',' + cy + ') rotate(-90)" fill="' + inkFor(n) + '">' + esc(vs) + '</text>';
      }
      var focusable = !!txt && !n.synthetic;
      out.push('<g data-p="' + esc(n.path) + '"' + (dim ? ' class="dim"' : '') + (focusable ? ' tabindex="0" role="button" aria-label="' + esc(tip) + '"' : '') + '>' +
        '<title>' + esc(tip) + '</title>' +
        '<rect class="' + cls + '" x="' + x0.toFixed(2) + '" y="' + y + '" width="' + w.toFixed(2) + '" height="' + h + '"' + (f ? ' fill="' + f + '"' : '') + '/>' + txt + '</g>');
      if (n.path === S.sel && n.depth > 0) selBox = [x0, y, w, h];
    }
    function drawRun(r) {
      var x0 = Math.max(0, r.a), x1 = Math.min(W, r.b), w = x1 - x0;
      if (!(w > 0)) return;
      drawnCount++;
      var zoomNode = nodeOf(S.zoom) || root, canZoom = r.parent !== zoomNode;
      var tip = r.n + ' ' + LEVEL[r.depth].toLowerCase() + ' names in ' + (r.parent.depth ? r.parent.n : 'the genome') + ', each too thin to draw here' + (canZoom ? '. Tap to zoom in.' : '.');
      var dim = S.level > 0 && r.depth !== S.level;
      out.push('<g' + (canZoom ? ' data-run="' + esc(r.parent.path) + '"' : '') + (dim ? ' class="dim"' : '') + '><title>' + esc(tip) + '</title>' +
        '<rect class="run" x="' + x0.toFixed(2) + '" y="' + rowTop[r.depth] + '" width="' + w.toFixed(2) + '" height="' + ROWH[r.depth] + '" fill="' + fill(r.first) + '"/></g>');
    }
    (function walk(n) {
      drawOne(n);
      var run = null;
      function flush() { if (run) drawRun(run); run = null; }
      n.kids.forEach(function (k) {
        var a = k.c0 * W, b = k.c1 * W;
        if (!(b - a > 0)) return; // no such label in this species: nothing to draw
        if (b - a < MIN) {
          if (!run) run = { a: a, b: b, n: 0, parent: n, depth: k.depth, first: k };
          run.b = b; run.n++;
          return;
        }
        flush(); walk(k);
      });
      flush();
    })(root);
    if (selBox) out.push('<rect class="sel" x="' + (selBox[0] + 1.25).toFixed(2) + '" y="' + (selBox[1] + 1.25) + '" width="' + Math.max(0, selBox[2] - 2.5).toFixed(2) + '" height="' + (selBox[3] - 2.5) + '"/>');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('height', H);
    svg.innerHTML = out.join('');
  }

  // ---------- transitions ----------
  var anim = null;
  function targets() {
    layout(S.sp, S.size);
    var z = nodeOf(S.zoom) || root, a = z.t0, b = z.t1, span = (b - a) || 1;
    ALL.forEach(function (n) { n.d0 = (n.t0 - a) / span; n.d1 = (n.t1 - a) / span; });
  }
  function settle() { ALL.forEach(function (n) { n.c0 = n.d0; n.c1 = n.d1; }); draw(); }
  function animate() {
    if (anim) cancelAnimationFrame(anim.id);
    if (instant || reduced) { anim = null; settle(); return; }
    ALL.forEach(function (n) { n.f0 = n.c0 === undefined ? n.d0 : n.c0; n.f1 = n.c1 === undefined ? n.d1 : n.c1; });
    var t0 = performance.now(), dur = 650;
    anim = {};
    (function step(now) {
      var t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      ALL.forEach(function (n) { n.c0 = n.f0 + (n.d0 - n.f0) * e; n.c1 = n.f1 + (n.d1 - n.f1) * e; });
      draw();
      if (t < 1) anim.id = requestAnimationFrame(step); else anim = null;
    })(t0);
  }

  // ---------- state changes ----------
  function go(p) {
    p = p || {};
    ['sp', 'size', 'zoom', 'sel', 'level', 'flag'].forEach(function (k) { if (k in p) S[k] = p[k]; });
    if (!('level' in p)) S.level = 0;
    if (!('flag' in p)) S.flag = '';
    if (S.sp !== 'human') S.sp = 'mouse';
    if (S.size !== 'rows') S.size = 'bp';
    var z = nodeOf(S.zoom) || root;
    while (z !== root && (z.synthetic || z.depth > 2 || val(z, S.sp, S.size) <= 0)) z = z.parent;
    S.zoom = z.path;
    if (!nodeOf(S.sel)) S.sel = '';
    targets();
    animate();
    renderControls(); renderCrumbs(); renderPanel(); renderRaw(); renderFlags();
    try {
      var u = new URLSearchParams();
      if (S.sp !== 'mouse') u.set('sp', S.sp);
      if (S.size !== 'bp') u.set('size', S.size);
      if (S.zoom) u.set('zoom', S.zoom);
      if (S.sel) u.set('sel', S.sel);
      if (S.flag) u.set('flag', S.flag);
      var s = u.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
    } catch (e) { /* file:// or sandboxed: the address bar just does not update */ }
  }

  function clickNode(n) {
    if (!n || n.synthetic) return;
    instant = false;
    if (n.depth === 0) return go({ zoom: '', sel: '' });
    var z = nodeOf(S.zoom) || root;
    if (isAnc(n, z)) return go(n === z ? { zoom: n.parent.path, sel: n.path } : { zoom: n.path, sel: n.path });
    if (n.depth < 3) return go({ zoom: n.path, sel: n.path });
    return go({ zoom: n.parent.path, sel: n.path });
  }
  svg.addEventListener('click', function (e) {
    var r = e.target.closest('[data-run]');
    if (r) { var pn = nodeOf(r.getAttribute('data-run')); if (pn) { instant = false; go({ zoom: pn.path, sel: pn.path }); } return; }
    var g = e.target.closest('[data-p]'); if (g) clickNode(nodeOf(g.getAttribute('data-p')));
  });
  svg.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var g = e.target.closest('[data-p]'); if (!g) return;
    e.preventDefault();
    var p = g.getAttribute('data-p');
    clickNode(nodeOf(p));
    var again = svg.querySelector('[data-p="' + (window.CSS && CSS.escape ? CSS.escape(p) : p) + '"][tabindex]');
    if (again) again.focus();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-sp]'), function (b) {
    b.addEventListener('click', function () { instant = false; go({ sp: b.getAttribute('data-sp'), level: S.level, flag: S.flag }); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-size]'), function (b) {
    b.addEventListener('click', function () { instant = false; go({ size: b.getAttribute('data-size'), level: S.level, flag: S.flag }); });
  });
  var START = { sp: 'mouse', size: 'bp', zoom: '', sel: '', level: 0, flag: '' };
  function reset() { instant = false; go(START); }
  document.getElementById('reset').addEventListener('click', reset);
  crumbsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) { instant = false; go({ zoom: b.getAttribute('data-go'), sel: b.getAttribute('data-go') }); } });

  function renderControls() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-sp]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sp') === S.sp)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-size]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-size') === S.size)); });
  }
  function renderCrumbs() {
    var z = nodeOf(S.zoom) || root, chain = [];
    for (var x = z; x; x = x.parent) chain.unshift(x);
    crumbsEl.innerHTML = chain.map(function (n, i) {
      var name = n.depth === 0 ? 'Whole genome' : n.n;
      if (i === chain.length - 1) return '<span class="here">' + esc(name) + '</span>';
      return '<button type="button" data-go="' + esc(n.path) + '">' + esc(name) + '</button><span class="sep" aria-hidden="true">›</span>';
    }).join('') + (z !== root ? ' <button type="button" data-go="' + esc(z.parent.path) + '" aria-label="Zoom out one level">Zoom out</button>' : '');
  }

  function countSubs(n, sp, teOnly) {
    if (n.depth === 3) return n.fold ? n.fold[sp] || 0 : (val(n, sp, 'rows') > 0 ? 1 : 0);
    var c = 0; n.kids.forEach(function (k) { if (!k.synthetic && (!teOnly || k.te)) c += countSubs(k, sp, teOnly); }); return c;
  }
  function renderPanel() {
    var n = (S.sel && nodeOf(S.sel)) || (S.zoom && nodeOf(S.zoom)) || root;
    var parts = [];
    if (n.depth === 0) parts.push('<div class="path"><b>Whole genome</b> (primary chromosomes, gaps included)</div>');
    else if (n.synthetic) parts.push('<div class="path"><b>No repeat</b></div>');
    else {
      var chain = []; for (var x = n; x && x.depth > 0; x = x.parent) chain.unshift(LEVEL[x.depth] + ' <b>' + esc(x.n) + '</b>');
      parts.push('<div class="path">' + chain.join(' › ') + '</div>');
    }
    if (n.synthetic) {
      parts.push('<p>Bases with no RepeatMasker row: ' + pct(n.v.mouse[0], 'mouse') + ' of the mouse genome, ' + pct(n.v.human[0], 'human') + ' of the human genome. This includes gaps in the assembly.</p>');
      panel.innerHTML = parts.join(''); return;
    }
    var rows = [
      ['Share of genome', function (sp) { return pct(val(n, sp, 'bp'), sp); }],
      ['Bases covered', function (sp) { return (val(n, sp, 'bp') / 1e6).toFixed(val(n, sp, 'bp') < 1e6 ? 2 : 1) + ' Mb'; }],
      ['Rows in the table', function (sp) { return val(n, sp, 'rows').toLocaleString('en-US'); }]
    ];
    if (n.depth < 3 || n.fold) rows.push([n.fold ? 'Motif names' : n.depth === 0 ? 'Transposon subfamilies' : 'Subfamilies', function (sp) { return countSubs(n, sp, n.depth === 0).toLocaleString('en-US'); }]);
    var html = '<table class="cmp"><thead><tr><th></th><th>Mouse</th><th>Human</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><th scope="row">' + r[0] + '</th>';
      ['mouse', 'human'].forEach(function (sp) {
        var has = n.depth === 0 || val(n, sp, 'rows') > 0;
        html += has ? '<td' + (sp === S.sp ? ' class="cur"' : '') + '>' + r[1](sp) + '</td>' : '<td class="none">No such label</td>';
      });
      html += '</tr>';
    });
    parts.push(html + '</tbody></table>');
    if (n.fold) parts.push('<p class="muted">Short repeated letters such as (CA)n. Each motif is its own name in the table; they are folded into one box here.</p>');
    panel.innerHTML = parts.join('');
  }

  // ---------- the raw row ----------
  var RAWCOLS = ['bin', 'swScore', 'milliDiv', 'milliDel', 'milliIns', 'genoName', 'genoStart', 'genoEnd', 'genoLeft', 'strand', 'repName', 'repClass', 'repFamily', 'repStart', 'repEnd', 'repLeft', 'id'];
  var NAMECOL = { 10: 3, 11: 1, 12: 2 }; // column index -> level
  function rawPath(level) {
    var r = D.species[S.sp].firstRow;
    return level === 1 ? r[11] : level === 2 ? r[11] + SEP + r[12] : r[11] + SEP + r[12] + SEP + r[10];
  }
  function renderRaw() {
    var r = D.species[S.sp].firstRow, col = COL[r[11].replace(/\?$/, '')] || 'var(--genome)';
    var h = '<tr>' + RAWCOLS.map(function (c, i) { return '<th' + (NAMECOL[i] ? ' class="nm"' : '') + '>' + c + '</th>'; }).join('') + '</tr><tr>';
    h += r.map(function (v, i) {
      if (!NAMECOL[i]) return '<td>' + esc(v) + '</td>';
      return '<td><button type="button" data-level="' + NAMECOL[i] + '" style="--c:' + col + '" aria-pressed="' + (S.level === NAMECOL[i]) + '">' + esc(v) + '</button></td>';
    }).join('') + '</tr><tr class="lvl">' + r.map(function (v, i) { return '<td>' + (NAMECOL[i] ? LEVEL[NAMECOL[i]].toLowerCase() : '') + '</td>'; }).join('') + '</tr>';
    rawEl.innerHTML = h;
    var nameCell = rawEl.querySelector('th.nm'), box = rawEl.parentNode;
    if (nameCell && box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, nameCell.offsetLeft - 90);
  }
  rawEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-level]'); if (!b) return;
    var lv = Number(b.getAttribute('data-level')), p = rawPath(lv);
    var zoom = lv === 1 ? '' : lv === 2 ? nodeOf(p).parent.path : nodeOf(p).parent.path;
    instant = false;
    go({ level: lv, zoom: zoom, sel: p });
    document.getElementById('tree').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });

  // ---------- labels that mislead ----------
  function share(path, sp) { var n = nodeOf(path); return n ? pct(val(n, sp, 'bp'), sp) : '0%'; }
  function rowsOf(path, sp) { var n = nodeOf(path); return n ? val(n, sp, 'rows').toLocaleString('en-US') : '0'; }
  function qClasses(sp) { return root.kids.filter(function (c) { return /\?$/.test(c.n) && val(c, sp, 'rows') > 0; }).map(function (c) { return c.n; }); }
  var FLAGS = {
    b1: {
      go: { sp: 'mouse', zoom: 'SINE' + SEP + 'Alu', sel: 'SINE' + SEP + 'Alu' },
      note: function () { return 'In mouse, B1 and its relatives (PB1, B1F) are filed in family <b>Alu</b>. B1 and Alu both descend from the same RNA gene, 7SL. RepeatMasker files them together, but B1 is not Alu. Mouse SINE/Alu covers ' + share('SINE|Alu', 'mouse') + ' of the mouse genome; human SINE/Alu covers ' + share('SINE|Alu', 'human') + ' of the human genome. Switch species to compare.'; }
    },
    q: {
      go: { zoom: '', sel: 'DNA?' },
      note: function () { var m = qClasses('mouse'), h = qClasses('human'); return '<b>DNA?</b> is its own label, separate from <b>DNA</b>. Filter on class "DNA" and these rows drop out. Mouse has ' + m.length + ' classes with a "?" (' + m.join(', ') + '); human has ' + h.length + ' (' + h.join(', ') + '). Families can carry one too, such as <b>ERVK?</b> in mouse. The "?" classes are the thin striped boxes right of the coloured ones.'; }
    },
    iap: {
      go: { sp: 'mouse', zoom: 'LTR' + SEP + 'ERVK', sel: 'LTR' + SEP + 'ERVK' + SEP + 'IAPEz-int' },
      note: function () { return '<b>IAPEz-int</b> is the inside, or body, of a family of mouse endogenous retrovirus-like elements called IAP, for intracisternal A-particle ("-int" means internal). Its ends, the long terminal repeats, are filed under several other names, most often <b>IAPLTR1a_Mm</b> and <b>IAPLTR1_Mm</b>. One element, several names, separate rows: ' + rowsOf('LTR|ERVK|IAPEz-int', 'mouse') + ' body rows in mouse, and ' + rowsOf('LTR|ERVK|IAPLTR1a_Mm', 'mouse') + ' and ' + rowsOf('LTR|ERVK|IAPLTR1_Mm', 'mouse') + ' rows for those two end names. <a href="ltr.html">Body and ends</a> shows which ends sit next to which body.'; }
    },
    only: {
      go: { sp: 'mouse', zoom: 'SINE', sel: 'SINE' + SEP + 'B2' },
      note: function () { return 'The human table has no family labelled <b>B2</b> or <b>B4</b>. In mouse they cover ' + share('SINE|B2', 'mouse') + ' and ' + share('SINE|B4', 'mouse') + ' of the genome. Switch to human and their boxes shrink to nothing. The reverse: human <b>SVA</b> (class Retroposon, ' + share('Retroposon|SVA', 'human') + ' of the human genome) has no mouse label.'; }
    }
  };
  function flag(id, opts) {
    var f = FLAGS[id]; if (!f) return;
    instant = !!(opts && opts.instant);
    var p = {}; Object.keys(f.go).forEach(function (k) { p[k] = f.go[k]; }); p.flag = id;
    go(p);
  }
  function renderFlags() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-flag]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-flag') === S.flag)); });
    noteEl.innerHTML = S.flag && FLAGS[S.flag] ? FLAGS[S.flag].note() : '';
  }
  document.getElementById('flags').addEventListener('click', function (e) {
    var b = e.target.closest('[data-flag]'); if (!b) return;
    flag(b.getAttribute('data-flag'));
    fig.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });

  // ---------- sources ----------
  (function () {
    var s = [];
    ['mouse', 'human'].forEach(function (sp) {
      var m = D.species[sp];
      s.push('<div>' + SPNAME[sp] + ' (' + m.assembly + '): UCSC RepeatMasker table <a class="mono" href="' + esc(m.url) + '">' + esc(m.url.replace('https://', '')) + '</a>, file dated ' + m.fileDate + ', downloaded ' + D.downloaded + ', md5 <span class="mono">' + m.md5 + '</span>. Primary chromosomes only (' + m.rowsDropped.toLocaleString('en-US') + ' rows on patches, alternate and unplaced sequences left out).</div>');
    });
    s.push('<div>IAP names: Dfam records <a href="https://dfam.org/family/DF000004146/summary">DF000004146</a> (IAPEz-int, Repbase name IAPLTR1a_I_MM) and <a href="https://dfam.org/family/DF000001785/summary">DF000001785</a> (IAPLTR1a_Mm). B1 and Alu from 7SL RNA: <a href="https://doi.org/10.1016/j.tig.2007.02.002">Kriegs et al. 2007</a>.</div>');
    s.push('<div>Scripts that made the numbers: <a href="prep/rmsk_summary.py">rmsk_summary.py</a>, <a href="prep/link_families.py">link_families.py</a>, <a href="prep/build_names_json.py">build_names_json.py</a>.</div>');
    document.getElementById('sources').innerHTML = s.join('');
  })();

  // ---------- double-counting toy ----------
  (function () {
    var toy = document.getElementById('toy'), out = document.getElementById('toysum');
    if (!toy || !out) return;
    function upd() {
      var sum = 0, boxes = toy.querySelectorAll('input'), subsOnly = true, subsAll = true;
      Array.prototype.forEach.call(boxes, function (b) {
        if (b.checked) { sum += Number(b.getAttribute('data-n')); if (!b.hasAttribute('data-sub')) subsOnly = false; }
        else if (b.hasAttribute('data-sub')) subsAll = false;
      });
      var msg = 'Sum of ticked rows: <b>' + sum.toLocaleString('en-US') + '</b>. Reads that exist: <b>600</b>. ';
      if (sum > 600) msg += '<span class="bad">Counted ' + (sum / 600).toFixed(1).replace(/\.0$/, '') + ' times over: the same reads sit at every level.</span>';
      else if (sum < 600) msg += '<span class="bad">Some reads are left out.</span>';
      else if (subsOnly && subsAll) msg += '<span class="ok">Right: each read counted once, at the subfamily level.</span>';
      else msg += '<span class="ok">Each read counted once, but only as one lump. Subfamilies keep the detail.</span>';
      out.innerHTML = msg;
    }
    toy.addEventListener('change', upd);
    upd();
  })();

  // ---------- start ----------
  var start = { sp: q.get('sp') || 'mouse', size: q.get('size') || 'bp', zoom: q.get('zoom') || '', sel: q.get('sel') || '', level: Number(q.get('level')) || 0 };
  if (q.get('flag') && FLAGS[q.get('flag')]) flag(q.get('flag'), { instant: true });
  else go(start);
  instant = false;
  if (window.ResizeObserver) new ResizeObserver(function () { if (!anim) draw(); }).observe(svg.parentNode);
  else window.addEventListener('resize', function () { if (!anim) draw(); });

  window.Names = {
    go: function (p) { go(p); }, flag: flag, reset: reset,
    state: function () { return JSON.parse(JSON.stringify(S)); },
    setInstant: function (b) { instant = !!b; },
    drawn: function () { return drawnCount; }
  };
})();
