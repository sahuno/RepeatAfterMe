// Repeat After Me: "How copies are made" lesson.
// Real data from the UCSC mm10 RepeatMasker .out files (data/copying.js, built by prep/q3/build_copying_json.py):
// for a picked subfamily, the share of insertions covering each part of the consensus and 150 sampled insertions
// drawn along it; rows under 5% and 10% different by class.
// Test hooks: ?sub=<name>; window.Copying.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var D = window.COPYING_DATA;
  var NS = 'http://www.w3.org/2000/svg';
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var pct = function (a, b) { return (100 * a / b).toFixed(1) + '%'; };
  if (!D) return;
  var CLS = function (label) { return /^L1/.test(label) ? 'LINE' : label === 'SINE' ? 'SINE' : /^ERV/.test(label) ? 'LTR' : 'DNA'; };
  var S = { sub: 'L1Md_T' };
  (function readUrl() {
    var q = new URLSearchParams(location.search);
    if (D.subs.some(function (s) { return s.name === q.get('sub'); })) S.sub = q.get('sub');
  })();
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function sub() { return D.subs.filter(function (s) { return s.name === S.sub; })[0]; }
  function readout() {
    var s = sub();
    return { name: s.name, insertions: s.insertions, three: s.three, five: s.five, threePct: pct(s.three, s.insertions),
      fivePct: pct(s.five, s.insertions), medianBases: s.medianBases, consLen: s.consLen, medianDiv: s.medianDiv, lines: s.sample.length };
  }

  function draw() {
    var s = sub(), cls = CLS(s.label);
    var svg = $('stacksvg'); svg.textContent = '';
    var W = Math.max(280, svg.parentNode.clientWidth - 22), L = 30, R = W - 8;
    var yC = 14, hC = 64, gap = 22, lh = 1.6, yS = yC + hC + gap, hS = s.sample.length * lh, H = yS + hS + 30;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    var x = function (p) { return L + (R - L) * (p - 1) / (s.consLen - 1); };
    // coverage curve: share of insertions covering each of 100 bins
    var n = s.cov.length, bw = (R - L) / n, d = 'M' + L + ' ' + (yC + hC);
    s.cov.forEach(function (v, i) { var y = yC + hC * (1 - v); d += ' L' + (L + i * bw).toFixed(1) + ' ' + y.toFixed(1) + ' L' + (L + (i + 1) * bw).toFixed(1) + ' ' + y.toFixed(1); });
    d += ' L' + R + ' ' + (yC + hC) + ' Z';
    [0, 0.5, 1].forEach(function (g) {
      var y = yC + hC * (1 - g);
      el('line', { x1: L, x2: R, y1: y, y2: y, class: 'grid' }, svg);
      el('text', { x: L - 4, y: y + 3, 'text-anchor': 'end', class: 'ax' }, svg, (100 * g) + '%');
    });
    el('path', { d: d, class: 'cov ' + cls }, svg);
    el('text', { x: L, y: yC - 4, class: 'tl' }, svg, 'Share of insertions with this part');
    // sampled insertions
    el('text', { x: L, y: yS - 6, class: 'tl' }, svg, s.sample.length + ' insertions, sorted by where they start');
    var g = el('g', { class: 'stk ' + cls }, svg);
    s.sample.forEach(function (segs, i) {
      var y = yS + i * lh;
      segs.forEach(function (sg) {
        el('rect', { x: x(sg[0]).toFixed(1), y: y.toFixed(2), width: Math.max(0.8, x(sg[1]) - x(sg[0])).toFixed(1), height: (lh * 0.8).toFixed(2) }, g);
      });
    });
    var ya = yS + hS + 4;
    el('line', { x1: L, x2: R, y1: ya, y2: ya, class: 'axl' }, svg);
    el('text', { x: L, y: ya + 14, class: 'ax' }, svg, '5′ end, base 1');
    el('text', { x: R, y: ya + 14, 'text-anchor': 'end', class: 'ax' }, svg, '3′ end, base ' + fmt(s.consLen));
    el('text', { x: (L + R) / 2, y: ya + 26, 'text-anchor': 'middle', class: 'ax' }, svg, s.name + ' consensus');
    var r = readout();
    $('sread').innerHTML = '<b>' + r.name + '</b> (' + s.label + '): ' + fmt(r.insertions) + ' insertions. ' + fmt(r.three) + ' (' + r.threePct + ') have the 3′ end and ' +
      fmt(r.five) + ' (' + r.fivePct + ') the 5′ end. The median insertion covers ' + fmt(r.medianBases) + ' of ' + fmt(r.consLen) +
      ' consensus bases; the median row is ' + r.medianDiv.toFixed(1) + '% different from the consensus.';
  }

  function drawYoung() {
    var t = '<thead><tr><th>Class</th><th>Rows</th><th>Under 5%</th><th>Under 10%</th></tr></thead><tbody>';
    [['LINE', 'LINE'], ['SINE', 'SINE'], ['LTR', 'LTR (ERVs and relatives)'], ['DNA', 'DNA transposons']].forEach(function (c) {
      var v = D.classes[c[0]];
      t += '<tr><td><i class="sw ' + c[0] + '"></i>' + c[1] + '</td><td>' + fmt(v[0]) + '</td><td>' + fmt(v[1]) + '</td><td>' + fmt(v[2]) + '</td></tr>';
    });
    $('youngtable').innerHTML = t + '</tbody>';
  }

  var sel = $('subpick');
  D.subs.forEach(function (s) { var o = document.createElement('option'); o.value = s.name; o.textContent = s.name + ' (' + s.label + ')'; sel.appendChild(o); });
  sel.value = S.sub;
  sel.addEventListener('change', function () { S.sub = sel.value; draw(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 120); });
  window.Copying = { state: S, readout: readout, set: function (o) { Object.keys(o).forEach(function (k) { S[k] = o[k]; }); sel.value = S.sub; draw(); return readout(); } };
  drawYoung(); draw();
})();
