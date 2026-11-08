// Repeat After Me: "Which copies" lesson.
// Part 1, a model: twenty made-up copies of one subfamily, 100 reads before and 200 after, so the subfamily
// is always up two-fold. Presets and taps move reads between copies; the readout says what changed.
// Each copy's share of reads that fit it alone is taken from the real L1Md_T rows (data/copies.js).
// Part 2, real data: per-row shares for every mouse L1Md_T row, and the three-copies benchmark.
// Test hooks: ?preset=every|three|one|updown&view=all|own; window.Copies.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var D = window.COPIES_DATA;
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var pct = function (x, d) { return (100 * x).toFixed(d === undefined ? 0 : d) + '%'; };

  // ---- Model ----------------------------------------------------------------------------------
  var BEFORE = [14, 11, 9, 8, 7, 6, 6, 5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 1, 0];   // sums to 100
  var N = BEFORE.length, TOTAL_AFTER = 200, MOVE = 10;
  // which of the twenty real-data shares each copy gets: a fixed mixed order (copy 20, the silent one, gets the second lowest)
  var RANK = [9, 14, 2, 17, 6, 11, 19, 4, 15, 8, 12, 0, 16, 5, 10, 18, 7, 13, 3, 1];
  var SHARE = RANK.map(function (k) { return D ? D.model_shares[k] : 0.25; });
  function add(base, changes) { var a = base.slice(); Object.keys(changes).forEach(function (i) { a[i] += changes[i]; }); return a; }
  var PRESETS = {
    every: BEFORE.map(function (b) { return 2 * b; }),
    three: add(BEFORE, { 2: 34, 8: 33, 15: 33 }),
    one: add(BEFORE, { 19: 100 }),
    updown: add(BEFORE, { 0: -10, 1: -10, 5: 40, 10: 40, 16: 40 })
  };
  var S = { preset: 'every', view: 'all', after: PRESETS.every.slice() };
  (function readUrl() {
    var q = new URLSearchParams(location.search);
    if (PRESETS[q.get('preset')]) { S.preset = q.get('preset'); S.after = PRESETS[S.preset].slice(); }
    if (q.get('view') === 'all' || q.get('view') === 'own') S.view = q.get('view');
  })();

  // Move MOVE reads onto copy j, taken from the other copies in proportion to their reads (whole reads, largest remainder).
  function tap(j) {
    var others = [], pool = 0;
    for (var k = 0; k < N; k++) if (k !== j && S.after[k] > 0) { others.push(k); pool += S.after[k]; }
    var take = Math.min(MOVE, pool);
    if (!take) return;
    var parts = others.map(function (k) { var x = take * S.after[k] / pool; return { k: k, n: Math.floor(x), r: x - Math.floor(x) }; });
    var left = take - parts.reduce(function (a, p) { return a + p.n; }, 0);
    parts.sort(function (a, b) { return b.r - a.r || a.k - b.k; });
    for (var i = 0; i < left; i++) parts[i].n += 1;
    parts.forEach(function (p) { S.after[p.k] -= p.n; });
    S.after[j] += take;
    S.preset = matchPreset();
    drawAll();
  }
  function matchPreset() {
    var hit = 'custom';
    Object.keys(PRESETS).forEach(function (p) { if (PRESETS[p].every(function (v, i) { return v === S.after[i]; })) hit = p; });
    return hit;
  }

  function readout() {
    var before = BEFORE.reduce(function (a, b) { return a + b; }, 0), after = S.after.reduce(function (a, b) { return a + b; }, 0);
    var d = S.after.map(function (a, i) { return a - BEFORE[i]; });
    var up = d.filter(function (x) { return x > 0; }).length, down = d.filter(function (x) { return x < 0; }).length;
    var rise = d.filter(function (x) { return x > 0; }).reduce(function (a, b) { return a + b; }, 0);
    var top3 = d.filter(function (x) { return x > 0; }).sort(function (a, b) { return b - a; }).slice(0, 3).reduce(function (a, b) { return a + b; }, 0);
    var ownB = 0, ownA = 0;
    for (var i = 0; i < N; i++) { ownB += BEFORE[i] * SHARE[i]; ownA += S.after[i] * SHARE[i]; }
    return { before: before, after: after, fold: after / before, up: up, down: down, same: N - up - down,
      top3: rise ? top3 / rise : 0, ownBefore: ownB, ownAfter: ownA, ownFold: ownA / ownB };
  }

  function drawModel() {
    var svg = $('copysvg'), W = Math.max(280, svg.parentNode.clientWidth - 22), narrow = W < 520;
    var L = narrow ? 30 : 64, Rt = narrow ? 64 : 120, X0 = L, X1 = W - Rt, RH = 19, T = 18;
    var maxv = Math.max(110, Math.max.apply(null, S.after));
    var X = function (v) { return X0 + (X1 - X0) * v / maxv; };
    var o = [], own = S.view === 'own';
    o.push('<text class="hd" x="' + X0 + '" y="11">' + (own ? (narrow ? 'reads that fit one copy' : 'reads that fit one copy alone (solid)') : 'reads before (grey) and after') + '</text>');
    o.push('<text class="hd" x="' + (W - 2) + '" y="11" text-anchor="end">' + (own ? (narrow ? 'own' : 'own share') : 'change') + '</text>');
    for (var i = 0; i < N; i++) {
      var y = T + i * RH, b = BEFORE[i], a = S.after[i], dd = a - b;
      o.push('<g class="crow" data-i="' + i + '" role="button" tabindex="0" aria-label="Copy ' + (i + 1) + ': ' + b + ' reads before, ' + a + ' after. Tap to move ' + MOVE + ' reads onto it.">');
      o.push('<rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + RH + '"/>');
      o.push('<text class="lab" x="' + (L - 6) + '" y="' + (y + 13) + '" text-anchor="end">' + (narrow ? (i + 1) : 'copy ' + (i + 1)) + '</text>');
      o.push('<rect class="trk" x="' + X0 + '" y="' + (y + 3) + '" width="' + (X1 - X0) + '" height="13" rx="2"/>');
      if (b) o.push('<rect class="bef' + (own ? ' faint' : '') + '" x="' + X0 + '" y="' + (y + 3) + '" width="' + (X(b) - X0).toFixed(1) + '" height="4" rx="1"/>');
      if (a) {
        if (own) {
          o.push('<rect class="aft faint" x="' + X0 + '" y="' + (y + 8) + '" width="' + (X(a) - X0).toFixed(1) + '" height="8" rx="1"/>');
          o.push('<rect class="aft" x="' + X0 + '" y="' + (y + 8) + '" width="' + Math.max(0, X(a * SHARE[i]) - X0).toFixed(1) + '" height="8" rx="1"/>');
        } else o.push('<rect class="aft" x="' + X0 + '" y="' + (y + 8) + '" width="' + (X(a) - X0).toFixed(1) + '" height="8" rx="1"/>');
      }
      var lab, cls = 'chg';
      if (own) lab = pct(SHARE[i], SHARE[i] < 0.1 ? 1 : 0);
      else if (dd === 0) { lab = 'same'; cls += ' flat'; }
      else if (b === 0) { lab = (narrow ? '' : 'from 0 to ') + a; cls += ' up'; }
      else { lab = (a / b).toFixed(1) + '×' + (narrow ? '' : ' (' + (dd > 0 ? '+' : '−') + Math.abs(dd) + ')'); cls += dd > 0 ? ' up' : ' down'; }
      o.push('<text class="' + cls + '" x="' + (W - 2) + '" y="' + (y + 13) + '" text-anchor="end">' + lab + '</text>');
      o.push('</g>');
    }
    var H = T + N * RH + 4;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = o.join('');
  }

  function renderReadout() {
    var r = readout();
    var items = [
      ['sub', 'Subfamily', r.before + ' reads before, ' + r.after + ' after: ' + r.fold.toFixed(1) + '×, in every example.'],
      ['copies', 'Copies', r.up + ' went up, ' + r.down + ' went down, ' + r.same + ' stayed the same.'],
      ['top3', 'Three biggest risers', 'carry ' + pct(r.top3) + ' of the extra reads.'],
      ['own', 'Reads that fit one copy alone', r.ownBefore.toFixed(1) + ' before, ' + r.ownAfter.toFixed(1) + ' after: ' + r.ownFold.toFixed(1) + '×. This is what a copy-level count has to go on.']
    ];
    $('cread').innerHTML = items.map(function (x) { return '<li data-r="' + x[0] + '"><b>' + x[1] + '</b><span class="why">' + x[2] + '</span></li>'; }).join('');
  }

  function renderControls() {
    document.querySelectorAll('[data-preset]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-preset') === S.preset)); });
    document.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === S.view)); });
  }
  function drawAll() { drawModel(); renderReadout(); renderControls(); }

  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () { S.preset = b.getAttribute('data-preset'); S.after = PRESETS[S.preset].slice(); drawAll(); });
  });
  document.querySelectorAll('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () { S.view = b.getAttribute('data-view'); drawAll(); });
  });
  $('copysvg').addEventListener('click', function (ev) { var g = ev.target.closest('g.crow'); if (g) tap(Number(g.getAttribute('data-i'))); });
  $('copysvg').addEventListener('keydown', function (ev) {
    var g = ev.target.closest && ev.target.closest('g.crow');
    if (g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); tap(Number(g.getAttribute('data-i'))); }
  });
  $('reset').addEventListener('click', function () { S.preset = 'every'; S.view = 'all'; S.after = PRESETS.every.slice(); drawAll(); });

  // ---- Real data: share of each L1Md_T row's reads that fit it alone ---------------------------
  var G = { grp: 'all' };
  var GRP_LAB = { all: 'all rows', five: 'rows with the 5′ end', long: 'rows at least 6 kb long', short: 'rows under 1 kb' };
  var BIN_LAB = ['none', '<10%', '10–20%', '20–30%', '30–40%', '40–50%', '50–60%', '60–70%', '70–80%', '80–90%', '90–100%'];

  function drawHist() {
    var h = D.hist[G.grp], svg = $('histsvg'), W = Math.max(280, svg.parentNode.clientWidth - 22), narrow = W < 520;
    var Lm = 46, Rm = 6, T = 10, B = narrow ? 44 : 34, H = 230;
    var maxv = Math.max.apply(null, h.bins.map(function (n) { return n / h.n; }));
    var top = Math.ceil(maxv * 10) / 10;
    var bw = (W - Lm - Rm) / 11, Y = function (f) { return T + (H - T - B) * (1 - f / top); };
    var o = [];
    for (var g = 0; g <= top + 1e-9; g += 0.1) o.push('<line class="grid" x1="' + Lm + '" x2="' + (W - Rm) + '" y1="' + Y(g) + '" y2="' + Y(g) + '"/><text class="ax" x="' + (Lm - 4) + '" y="' + (Y(g) + 3) + '" text-anchor="end">' + Math.round(g * 100) + '%</text>');
    h.bins.forEach(function (n, i) {
      var x = Lm + i * bw, f = n / h.n;
      o.push('<rect class="hb' + (i === 0 ? ' none' : '') + '" x="' + (x + 2).toFixed(1) + '" y="' + Y(f).toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + (Y(0) - Y(f)).toFixed(1) + '"><title>' + BIN_LAB[i] + ': ' + fmt(n) + ' rows</title></rect>');
      var lx = x + bw / 2, ly = H - B + 12;
      if (narrow) o.push('<text class="ax" transform="translate(' + lx.toFixed(1) + ',' + ly + ') rotate(-45)" text-anchor="end">' + BIN_LAB[i] + '</text>');
      else o.push('<text class="ax" x="' + lx.toFixed(1) + '" y="' + ly + '" text-anchor="middle">' + BIN_LAB[i] + '</text>');
    });
    o.push('<text class="axt" transform="translate(11,' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle">Share of rows</text>');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = o.join('');
    $('histnote').textContent = fmt(h.n) + ' ' + GRP_LAB[G.grp] + '. Median share ' + pct(h.median, 1) + '; ' + fmt(h.under10) + ' under 10%, ' + fmt(h.none) + ' with none. Over all their tiled reads, ' + pct(h.unique / h.reads, 1) + ' fit one row alone.';
    document.querySelectorAll('[data-grp]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-grp') === G.grp)); });
  }

  function renderStats() {
    var s = D.stats;
    document.querySelectorAll('[data-stat]').forEach(function (el) {
      var v = el.getAttribute('data-stat').split('.').reduce(function (o, k) { return o[k]; }, s);
      el.textContent = fmt(v);
    });
  }

  function renderK3() {
    var head = '<thead><tr><th>Copy</th><th class="n">Bases</th><th class="n">Fits it alone</th><th class="n">True reads</th><th class="n">Telescope</th><th class="n">TElocal</th><th class="n">Unique only</th></tr></thead>';
    var body = D.k3.map(function (r) {
      return '<tr' + (r.truth ? ' class="true"' : '') + '><td>' + r.pos + (r.five ? ' <span class="five">5′ end</span>' : '') + '</td><td class="n">' + fmt(r.len) + '</td><td class="n">' + (r.share === null ? '–' : pct(r.share, 1)) +
        '</td><td class="n">' + fmt(r.truth) + '</td><td class="n">' + fmt(r.telescope) + '</td><td class="n">' + fmt(r.telocal) + '</td><td class="n">' + fmt(r.fc_uniq) + '</td></tr>';
    }).join('');
    $('k3table').innerHTML = head + '<tbody>' + body + '</tbody>';
  }

  if (D) {
    document.querySelectorAll('[data-grp]').forEach(function (b) { b.addEventListener('click', function () { G.grp = b.getAttribute('data-grp'); drawHist(); }); });
    renderStats(); drawHist(); renderK3();
  }

  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { drawModel(); if (D) drawHist(); }, 120); });
  window.Copies = {
    state: function () { return { preset: S.preset, view: S.view, after: S.after.slice(), grp: G.grp }; },
    readout: readout,
    shares: function () { return SHARE.slice(); },
    tap: tap,
    presets: function () { return Object.keys(PRESETS); }
  };
  drawAll();
})();
