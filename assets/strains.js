// Repeat After Me: "Not in the reference" lesson.
// Part 1: per-strain counts of reference copies a strain lacks and copies it carries that the reference lacks,
// from the Nellåker et al. 2012 catalogue (data/strains.js, built by prep/q7/build_strains_json.py), with a
// chromosome 19 picture: the reference track and the picked strain's track.
// Part 2: a diagram of where reads go in the two cases.
// Test hooks: ?strain=<id>&fam=all|IAP|L1|ETn|SINE|oLTR&case=mouse|ref; window.Strains.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var D = window.STRAINS_DATA;
  var NS = 'http://www.w3.org/2000/svg';
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var FAM = { all: 'all families', IAP: 'IAP', L1: 'L1', ETn: 'ETn', SINE: 'SINE', oLTR: 'other LTR' };
  var KIND = [['sub', 'C57BL/6 substrain'], ['lab', 'Classical laboratory strains'], ['wild', 'Wild-derived strains']];
  var S = { strain: 'BALB', fam: 'all', kase: 'mouse' };
  if (!D) return;
  var ids = D.strains.map(function (s) { return s.id; });
  (function readUrl() {
    var q = new URLSearchParams(location.search);
    if (ids.indexOf(q.get('strain')) >= 0) S.strain = q.get('strain');
    if (FAM[q.get('fam')]) S.fam = q.get('fam');
    if (q.get('case') === 'mouse' || q.get('case') === 'ref') S.kase = q.get('case');
  })();

  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function strain(id) { return D.strains.filter(function (s) { return s.id === id; })[0]; }
  function counts(s, fam) {
    if (fam === 'all') return [s.lacks, s.extra];
    return s.byGroup[fam];
  }
  // chromosome 19 rows for the picked strain and family: [start, group, ref, states]
  function chromCounts(id, fam) {
    var k = ids.indexOf(id), lack = 0, extra = 0, both = 0;
    D.chrom.rows.forEach(function (r) {
      if (fam !== 'all' && r[1] !== fam) return;
      var v = r[3].charAt(k);
      if (v === 'd') lack++; else if (v === 'i') extra++; else if (r[2] === 1 && v === '1') both++;
    });
    return { lack: lack, extra: extra, both: both };
  }
  function readout() {
    var s = strain(S.strain), c = counts(s, S.fam), ch = chromCounts(S.strain, S.fam);
    return { name: s.name, fam: S.fam, lacks: c[0], extra: c[1], chrLacks: ch.lack, chrExtra: ch.extra, chrBoth: ch.both };
  }

  // ---- strain bars (HTML) ----
  function drawBars() {
    var box = $('sbars'); box.textContent = '';
    var max = 1;
    D.strains.forEach(function (s) { var c = counts(s, S.fam); max = Math.max(max, c[0], c[1]); });
    var head = document.createElement('div'); head.className = 'shead';
    head.innerHTML = '<span>Strain</span><span class="l">Lacks</span><span>Extra</span>';
    box.appendChild(head);
    KIND.forEach(function (kd) {
      var g = document.createElement('div'); g.className = 'sgrp'; g.textContent = kd[1]; box.appendChild(g);
      D.strains.filter(function (s) { return s.kind === kd[0]; }).forEach(function (s) {
        var c = counts(s, S.fam);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'srow'; b.dataset.strain = s.id;
        b.setAttribute('aria-pressed', String(s.id === S.strain));
        b.setAttribute('aria-label', s.name + ': lacks ' + fmt(c[0]) + ' reference copies, carries ' + fmt(c[1]) + ' extra');
        var pl = 100 * c[0] / max, pr = 100 * c[1] / max;
        // numbers sit outside the bar; strains.css caps the longest bar so the number always fits
        b.innerHTML = '<span class="nm">' + s.name + '</span>' +
          '<span class="side l"><span class="v">' + fmt(c[0]) + '</span><span class="bar" style="--p:' + pl.toFixed(2) + '"></span></span>' +
          '<span class="side r"><span class="bar" style="--p:' + pr.toFixed(2) + '"></span><span class="v">' + fmt(c[1]) + '</span></span>';
        b.addEventListener('click', function () { S.strain = s.id; drawAll(); });
        box.appendChild(b);
      });
    });
  }

  function drawRead() {
    var r = readout(), fam = r.fam === 'all' ? '' : r.fam === 'oLTR' ? ' other LTR' : ' ' + r.fam;
    $('sread').innerHTML = '<b>' + r.name + '</b> lacks ' + fmt(r.lacks) + ' reference' + fam + ' copies and carries ' +
      fmt(r.extra) + fam + ' copies the reference does not have. On chromosome 19 below: ' + fmt(r.chrLacks) +
      ' lacking, ' + fmt(r.chrExtra) + ' extra.';
  }

  // ---- chromosome 19 (SVG) ----
  function drawChrom() {
    var svg = $('chrsvg'); svg.textContent = '';
    var W = Math.max(280, svg.parentNode.clientWidth - 22), L = 4, R = W - 6, TH = 26;
    var y1 = 18, y2 = y1 + TH + 26, H = y2 + TH + 26;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    var len = D.chrom.length, x = function (p) { return L + (R - L) * p / len; };
    var k = ids.indexOf(S.strain), s = strain(S.strain);
    el('text', { x: L, y: y1 - 5, class: 'tl' }, svg, 'C57BL/6J, the reference');
    el('text', { x: L, y: y2 - 5, class: 'tl' }, svg, s.name);
    el('rect', { x: L, y: y1, width: R - L, height: TH, class: 'trk' }, svg);
    el('rect', { x: L, y: y2, width: R - L, height: TH, class: 'trk' }, svg);
    var gb = el('g', {}, svg), gl = el('g', {}, svg), ge = el('g', {}, svg);
    D.chrom.rows.forEach(function (r) {
      if (S.fam !== 'all' && r[1] !== S.fam) return;
      var v = r[3].charAt(k), px = x(r[0]).toFixed(1);
      // reference track: every copy the reference has; orange when the picked strain lacks it
      if (r[2] === 1) el('line', { x1: px, x2: px, y1: y1, y2: y1 + TH, class: 't ' + (v === 'd' ? 'lack' : 'both') }, v === 'd' ? gl : gb);
      // strain track: copies the strain has; blue when the reference lacks them
      if (v === 'i') el('line', { x1: px, x2: px, y1: y2, y2: y2 + TH, class: 't extra' }, ge);
      else if (r[2] === 1 && v !== 'd') el('line', { x1: px, x2: px, y1: y2, y2: y2 + TH, class: 't both' }, gb);
    });
    var ya = y2 + TH;
    el('line', { x1: L, x2: R, y1: ya + 0.5, y2: ya + 0.5, class: 'axl' }, svg);
    [0, 20, 40, 60].forEach(function (mb, i) {
      var px = x(mb * 1e6);
      el('line', { x1: px, x2: px, y1: ya, y2: ya + 4, class: 'axl' }, svg);
      el('text', { x: px, y: ya + 15, class: 'ax', 'text-anchor': i === 0 ? 'start' : i === 3 ? 'end' : 'middle' }, svg, mb + (i === 3 ? ' Mb' : ''));
    });
  }

  // ---- where the reads go (SVG diagram, fixed coordinates) ----
  var LISTS = {
    mouse: [
      'Reads from inside the copy also fit other copies of the same family, so the aligner places them on those copies, or drops them if they fit too many places (<a href="multimap.html">One read, many places</a>).',
      'Reads that run from the copy into the DNA beside it fit the reference only in part; the aligner trims the part that does not fit, or drops the read.',
      'No row of the repeat table names this copy, so no count can report it. Its RNA is credited to other copies or lost.'
    ],
    ref: [
      'The copy is not in your mouse\'s DNA, so it makes no RNA and its row gets no reads of its own.',
      'Reads made by other copies that fit it as well can still be shared onto it by a counting tool that splits such reads.',
      'Beside C57BL/6J samples, the row looks switched off. The copy is missing, not silenced.'
    ]
  };
  function seg(svg, x1, x2, y) { el('line', { x1: x1, x2: x2, y1: y, y2: y, class: 'dna' }, svg); }
  function brk(svg, y) { el('text', { x: 180, y: y + 4, 'text-anchor': 'middle', class: 'sm' }, svg, '//'); }
  function read(svg, x1, x2, y, cut) { el('rect', { x: x1, y: y - 2, width: x2 - x1, height: 4, rx: 1, class: 'rd' + (cut ? ' cut' : '') }, svg); }
  function arrow(svg, xa, ya, xb, yb) {
    var my = (ya + yb) / 2;
    el('path', { d: 'M' + xa + ' ' + ya + ' C' + xa + ' ' + my + ' ' + xb + ' ' + my + ' ' + xb + ' ' + yb, class: 'arr' }, svg);
  }
  function drawReads() {
    var svg = $('readsvg'); svg.textContent = '';
    var W = 340, H = 172, yM = 40, yR = 118;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', Math.min(560, Math.max(280, svg.parentNode.clientWidth - 22)));
    el('text', { x: 10, y: 12, class: 'tl' }, svg, 'Your mouse');
    el('text', { x: 10, y: yR + 44, class: 'tl' }, svg, 'Reference, C57BL/6J');
    [yM, yR].forEach(function (y) { seg(svg, 10, 170, y); brk(svg, y); seg(svg, 190, 330, y); });
    // the other copy of the same family exists in both genomes
    el('rect', { x: 230, y: yM - 6, width: 70, height: 12, rx: 2, class: 'cp other' }, svg);
    el('rect', { x: 230, y: yR - 6, width: 70, height: 12, rx: 2, class: 'cp other' }, svg);
    el('text', { x: 265, y: yR + 22, 'text-anchor': 'middle', class: 'sm' }, svg, 'another IAP copy');
    if (S.kase === 'mouse') {
      el('rect', { x: 70, y: yM - 6, width: 70, height: 12, rx: 2, class: 'cp' }, svg);
      el('text', { x: 105, y: yM + 22, 'text-anchor': 'middle', class: 'sm' }, svg, 'IAP copy');
      el('line', { x1: 70, x2: 70, y1: yR - 7, y2: yR + 7, class: 'dna' }, svg);
      el('text', { x: 70, y: yR + 22, 'text-anchor': 'middle', class: 'sm' }, svg, 'no copy here');
      read(svg, 52, 82, yM - 14); read(svg, 92, 116, yM - 14); read(svg, 118, 138, yM - 22);
      // inside reads land on the other copy
      read(svg, 236, 260, yR - 14); read(svg, 270, 290, yR - 14);
      arrow(svg, 104, yM - 10, 248, yR - 18); arrow(svg, 128, yM - 18, 280, yR - 18);
      // the junction read fits only in part
      read(svg, 52, 70, yR - 14); read(svg, 70, 82, yR - 14, true);
      arrow(svg, 61, yM - 10, 61, yR - 18);
    } else {
      el('line', { x1: 70, x2: 70, y1: yM - 7, y2: yM + 7, class: 'dna' }, svg);
      el('text', { x: 70, y: yM + 22, 'text-anchor': 'middle', class: 'sm' }, svg, 'no copy here');
      el('rect', { x: 70, y: yR - 6, width: 70, height: 12, rx: 2, class: 'cp lack' }, svg);
      el('text', { x: 105, y: yR + 22, 'text-anchor': 'middle', class: 'sm' }, svg, 'IAP copy');
      el('text', { x: 105, y: yR - 14, 'text-anchor': 'middle', class: 'x' }, svg, '0 own reads');
      read(svg, 238, 262, yM - 14); read(svg, 268, 292, yM - 14);
      read(svg, 238, 262, yR - 14); read(svg, 268, 292, yR - 14);
      arrow(svg, 250, yM - 10, 250, yR - 18); arrow(svg, 280, yM - 10, 280, yR - 18);
      arrow(svg, 244, yM - 10, 130, yR - 26);
    }
    $('rlist').innerHTML = LISTS[S.kase].map(function (t) { return '<li>' + t + '</li>'; }).join('');
  }

  function syncButtons() {
    document.querySelectorAll('[data-fam]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.fam === S.fam)); });
    document.querySelectorAll('[data-case]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.case === S.kase)); });
  }
  function drawAll() { syncButtons(); drawBars(); drawRead(); drawChrom(); drawReads(); }

  document.querySelectorAll('[data-fam]').forEach(function (b) { b.addEventListener('click', function () { S.fam = b.dataset.fam; drawAll(); }); });
  document.querySelectorAll('[data-case]').forEach(function (b) { b.addEventListener('click', function () { S.kase = b.dataset.case; drawAll(); }); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { drawChrom(); drawReads(); }, 120); });

  window.Strains = {
    state: S, readout: readout, chromCounts: chromCounts,
    set: function (o) { Object.keys(o).forEach(function (k) { S[k] = o[k]; }); drawAll(); return readout(); }
  };
  drawAll();
})();
