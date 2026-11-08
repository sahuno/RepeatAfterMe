// Repeat After Me: "Rows or subfamilies" lesson.
// Real data from the UCSC mm10 RepeatMasker .out files (data/units.js, built by prep/q8/build_units_json.py):
// two example insertions drawn to scale with the consensus parts they match, what lies between rows of one
// insertion genome-wide, the table size per unit, and a subfamily picker.
// Test hooks: ?ex=0|1&sub=<name>; window.Units.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var D = window.UNITS_DATA;
  var NS = 'http://www.w3.org/2000/svg';
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var pct = function (a, b) { return (100 * a / b).toFixed(1) + '%'; };
  if (!D) return;
  var MAIN = ['L1Md_T', 'IAPEz-int'];
  var NOTES = [
    'One L1Md_T insertion in three rows. Together they match consensus bases 2,997 to 6,582 with no gap, so nothing of this L1 is missing between them; like most L1Md_T rows it lacks the 5′ end, here bases 1 to 2,996 (<a href="copies.html">Which copies</a>). Two whole elements sit inside it: an MTA_Mm, 5.6% different from its consensus against 11.5% to 15.9% for the L1 rows, which fits a later insertion, and a B2_Mm2 at 15.7%, which does not say either way.',
    'One IAP insertion in six rows: a complete LTR at each end, named IAPLTR2a2_Mm, and four rows of body, named IAPEz-int. The body rows match bases 9 to 193, 168 to 662, 1,359 to 1,636 and 5,736 to 6,479 of the 6,481-base consensus, so most of the body is gone: a deletion. The RLTR27 row inside is 30.9% different, more than the IAP rows, so it is not a later insertion.'
  ];
  var GAPNAMES = {
    younger: 'A transposon row closer to its own consensus than the rows around it (fits a later insertion)',
    none: 'Nothing, and the same name on both sides',
    other: 'Only simple repeats or other non-transposon rows',
    ltrbody: 'Nothing, and the name changes (an ERV\'s LTR and body)',
    older: 'A transposon row no closer to its consensus'
  };
  var UNITNAMES = [['classes', 'Classes'], ['families', 'Families'], ['subfamilies', 'Subfamilies'], ['insertions', 'Insertions'], ['rows', 'Rows']];
  var S = { ex: 0, sub: 'L1Md_T' };
  (function readUrl() {
    var q = new URLSearchParams(location.search);
    if (q.get('ex') === '0' || q.get('ex') === '1') S.ex = +q.get('ex');
    if (D.pick.some(function (p) { return p.name === q.get('sub'); })) S.sub = q.get('sub');
  })();

  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  // consensus begin, end and length from the .out columns ("+": begin end (left); "C": (left) end begin)
  function cons(r) {
    var p = r[6].split(' '), num = function (s) { return +s.replace(/[()]/g, ''); };
    if (r[5] === '+') return { b: num(p[0]), e: num(p[1]), len: num(p[1]) + num(p[2]) };
    return { b: num(p[2]), e: num(p[1]), len: num(p[1]) + num(p[0]) };
  }
  function clsVar(c) { return c.split('/')[0]; }

  function drawExample() {
    var ex = D.examples[S.ex], main = MAIN[S.ex];
    var svg = $('exsvg'); svg.textContent = '';
    var W = Math.max(280, svg.parentNode.clientWidth - 22), L = 6, R = W - 6;
    var yG = 46, hG = 14, yC = 132, hC = 12, H = yC + hC + 34;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    var lo = ex.start, hi = ex.end, gx = function (p) { return L + (R - L) * (p - lo) / (hi - lo); };
    el('text', { x: L, y: 12, class: 'tl' }, svg, ex.chrom + ':' + fmt(lo + 1) + '-' + fmt(hi) + ', ' + fmt(hi - lo) + ' bases');
    el('line', { x1: L, x2: R, y1: yG + hG / 2, y2: yG + hG / 2, class: 'dna' }, svg);
    var clen = 0;
    // the rows of one copy can disagree by a base on the consensus length; use the largest
    ex.rows.forEach(function (r) { if (r[2] === main) clen = Math.max(clen, cons(r).len); });
    var cx = function (p) { return L + (R - L) * (p - 1) / (clen - 1); };
    // fan lines first, so the boxes sit on top
    ex.rows.forEach(function (r) {
      if (r[2] !== main) return;
      var c = cons(r);
      el('path', { d: 'M' + gx(r[0]).toFixed(1) + ' ' + (yG + hG) + ' L' + cx(c.b).toFixed(1) + ' ' + yC + ' L' + cx(c.e).toFixed(1) + ' ' + yC + ' L' + gx(r[1]).toFixed(1) + ' ' + (yG + hG) + 'Z', class: 'fan ' + clsVar(r[3]) }, svg);
    });
    var lastX = -99, lastUp = false;
    ex.rows.forEach(function (r, i) {
      var x1 = gx(r[0]), x2 = gx(r[1]);
      el('rect', { x: x1.toFixed(1), y: yG, width: Math.max(1.5, x2 - x1 - 1).toFixed(1), height: hG, rx: 2, class: 'gr ' + (r[7] ? clsVar(r[3]) : 'other') }, svg);
      var mx = (x1 + x2) / 2, up = (mx - lastX < 16) && !lastUp;
      el('text', { x: mx.toFixed(1), y: up ? yG - 16 : yG - 4, 'text-anchor': 'middle', class: 'num' + (r[7] ? '' : ' o') }, svg, String(i + 1));
      lastX = mx; lastUp = up;
    });
    el('rect', { x: L, y: yC, width: R - L, height: hC, rx: 2, class: 'cbar' }, svg);
    ex.rows.forEach(function (r) {
      if (r[2] !== main) return;
      var c = cons(r);
      el('rect', { x: cx(c.b).toFixed(1), y: yC, width: Math.max(1.5, cx(c.e) - cx(c.b)).toFixed(1), height: hC, class: 'cseg ' + clsVar(r[3]) }, svg);
    });
    el('text', { x: L, y: yC + hC + 14, class: 'ax' }, svg, '1');
    el('text', { x: R, y: yC + hC + 14, 'text-anchor': 'end', class: 'ax' }, svg, fmt(clen));
    el('text', { x: (L + R) / 2, y: yC + hC + 28, 'text-anchor': 'middle', class: 'tl' }, svg, main + ' consensus');
    $('exnote').innerHTML = NOTES[S.ex];
    var t = '<thead><tr><th>#</th><th>Position</th><th>Name</th><th>% different</th><th>Consensus</th><th>This insertion</th></tr></thead><tbody>';
    ex.rows.forEach(function (r, i) {
      var c = cons(r);
      t += '<tr class="' + (r[7] ? 'in' : 'out') + '"><td>' + (i + 1) + '</td><td>' + fmt(r[0] + 1) + '-' + fmt(r[1]) + '</td><td><i class="sw ' + (r[7] ? clsVar(r[3]) : 'other') + '"></i>' + r[2] + '</td><td>' + r[4].toFixed(1) + '</td><td>' + fmt(c.b) + '-' + fmt(c.e) + ' of ' + fmt(c.len) + '</td><td>' + (r[7] ? 'yes' : 'no') + '</td></tr>';
    });
    $('extable').innerHTML = t + '</tbody>';
  }

  function drawGaps() {
    var tot = D.gaps.reduce(function (a, b) { return a + b; }, 0);
    var order = D.gapKeys.map(function (k, i) { return [k, D.gaps[i]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var t = '<thead><tr><th>Inside the gap</th><th>Gaps</th><th>Share</th></tr></thead><tbody>';
    order.forEach(function (o) { t += '<tr><td>' + GAPNAMES[o[0]] + '</td><td>' + fmt(o[1]) + '</td><td>' + pct(o[1], tot) + '</td></tr>'; });
    $('gaptable').innerHTML = t + '</tbody>';
  }

  function drawUnits() {
    var box = $('ubars'), max = Math.log10(D.units.rows);
    box.innerHTML = UNITNAMES.map(function (u) {
      var n = D.units[u[0]], w = 100 * Math.log10(n) / max;
      return '<div class="ub" data-unit="' + u[0] + '"><span class="k">' + u[1] + '</span><span class="track"><span class="bar" style="width:' + w.toFixed(1) + '%"></span></span><span class="v">' + fmt(n) + '</span></div>';
    }).join('');
  }

  function subRead() {
    var p = D.pick.filter(function (x) { return x.name === S.sub; })[0];
    var split = p.perIns.slice(1).reduce(function (a, b) { return a + b; }, 0);
    return { name: p.name, rows: p.rows, insertions: p.insertions, split: split, withOther: p.withOther, partners: p.partners, perIns: p.perIns };
  }
  function drawSub() {
    var r = subRead(), max = Math.max.apply(null, r.perIns);
    var labels = ['1 row', '2 rows', '3 rows', '4 rows', '5 or more'];
    var h = '<p><b>' + r.name + '</b> is one feature in a subfamily test, ' + fmt(r.insertions) + ' insertions, and ' + fmt(r.rows) + ' rows in a row test. ' +
      fmt(r.split) + ' of its insertions are split into two or more rows.';
    if (r.withOther) h += ' In ' + fmt(r.withOther) + ' insertions RepeatMasker joins it with rows of another name' +
      (r.partners.length ? ', most often ' + r.partners.slice(0, 2).map(function (q) { return q[0] + ' (' + fmt(q[1]) + ')'; }).join(' and ') : '') + '.';
    h += '</p><div class="pib" role="img" aria-label="Insertions of ' + r.name + ' by number of rows">';
    r.perIns.forEach(function (n, i) {
      h += '<div class="pi"><span class="k">' + labels[i] + '</span><span class="track"><span class="bar" style="width:' + (100 * n / max).toFixed(1) + '%"></span></span><span class="v">' + fmt(n) + '</span></div>';
    });
    $('subread').innerHTML = h + '</div>';
  }

  function syncButtons() {
    document.querySelectorAll('[data-ex]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.ex === S.ex)); });
  }
  function drawAll() { syncButtons(); drawExample(); drawSub(); }

  var sel = $('subpick');
  D.pick.forEach(function (p) { var o = document.createElement('option'); o.value = p.name; o.textContent = p.name + ' (' + p.fam + ')'; sel.appendChild(o); });
  sel.value = S.sub;
  sel.addEventListener('change', function () { S.sub = sel.value; drawSub(); });
  document.querySelectorAll('[data-ex]').forEach(function (b) { b.addEventListener('click', function () { S.ex = +b.dataset.ex; drawAll(); }); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawExample, 120); });

  window.Units = {
    state: S, subRead: subRead,
    set: function (o) { Object.keys(o).forEach(function (k) { S[k] = o[k]; }); sel.value = S.sub; drawAll(); return subRead(); }
  };
  drawGaps(); drawUnits(); drawAll();
})();
