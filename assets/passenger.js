// Repeat After Me: "Passenger or driver" lesson.
// Part 1, a model: a gene with an ERV copy in its first intron. Reads come from the gene's pre-mRNA and
// mRNA, and from the copy's own LTR-driven RNA; switches decide which are on. Made-up shapes, computed here.
// Part 2, real data: where each subfamily's copies sit relative to protein-coding genes (data/passenger.js).
// Test hooks: ?g=1&e=0&o=same|opp&lib=stranded|unstranded&rna=whole|polya; window.Passenger.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---- Model ----------------------------------------------------------------------------------
  var GENE = { start: 100, end: 900, exons: [[100, 160], [420, 470], [840, 900]] };   // + strand
  var ERV = { start: 230, end: 360, ltr: 20 };          // inside intron 1 (160-420)
  // own RNA: starts inside the 5' LTR and ends inside the 3' LTR, so its span depends on which way the copy points
  var tx = function () { return S.o === 'same' ? [ERV.start + 13, ERV.end - 3] : [ERV.start + 3, ERV.end - 13]; };
  var MATURE = 100, PRE = { whole: 12, polya: 2 }, OWN = 14;   // made-up levels, reads per position
  var STEP = 2;
  var DEF = { g: 1, e: 0, o: 'opp', lib: 'stranded', rna: 'whole' };
  var S = { g: DEF.g, e: DEF.e, o: DEF.o, lib: DEF.lib, rna: DEF.rna };
  (function readUrl() {
    var q = new URLSearchParams(location.search);
    if (q.has('g')) S.g = q.get('g') === '1' ? 1 : 0;
    if (q.has('e')) S.e = q.get('e') === '1' ? 1 : 0;
    if (q.get('o') === 'same' || q.get('o') === 'opp') S.o = q.get('o');
    if (q.get('lib') === 'stranded' || q.get('lib') === 'unstranded') S.lib = q.get('lib');
    if (q.get('rna') === 'whole' || q.get('rna') === 'polya') S.rna = q.get('rna');
  })();

  var ervStrand = function () { return S.o === 'same' ? 1 : -1; };
  function inExon(x) { return GENE.exons.some(function (e) { return x >= e[0] && x < e[1]; }); }
  // reads per position on one strand (+1 or -1)
  function cov(x, strand) {
    var c = 0;
    if (S.g && strand === 1 && x >= GENE.start && x < GENE.end) {
      c += PRE[S.rna];
      if (inExon(x)) c += MATURE;
    }
    var sp = tx();
    if (S.e && strand === ervStrand() && x >= sp[0] && x < sp[1]) c += OWN;
    return c;
  }
  function sum(a, b, strand) {
    var t = 0;
    for (var x = a; x < b; x += STEP) t += strand ? cov(x, strand) : cov(x, 1) + cov(x, -1);
    return t * STEP;
  }
  function mean(a, b, strand) { return sum(a, b, strand) / (b - a); }

  // The four readouts. Each says 'own' (points to the copy's own RNA), 'gene' (the host gene's RNA
  // carried through), 'mixed', or 'cant' (this test cannot tell here), with a sentence.
  function readout() {
    var reads = Math.round(sum(ERV.start, ERV.end) / 100);
    var body = mean(ERV.start + ERV.ltr, ERV.end - ERV.ltr);
    var flank = (sum(180, 220) + sum(370, 410)) / 80;
    var r = { reads: reads, ratio: null, own: null, tests: {} };
    r.tests.count = { v: 'cant', t: reads ? reads + ' reads on the copy. A count alone cannot say who made them.' : 'No reads on the copy.' };
    if (!reads) {
      r.tests.edge = r.tests.strand = r.tests.start = { v: 'cant', t: 'No reads to test.' };
      return r;
    }
    if (flank === 0) { r.ratio = Infinity; r.tests.edge = { v: 'own', t: 'Reads on the copy and none in the intron around it.' }; }
    else {
      r.ratio = body / flank;
      var rt = r.ratio.toFixed(1) + '×';
      r.tests.edge = r.ratio >= 2 ? { v: 'own', t: 'The copy has ' + rt + ' the reads of the intron around it: a step at its edges.' }
        : r.ratio <= 1.3 ? { v: 'gene', t: 'The copy has ' + rt + ' the reads of the intron around it: no step, the gene\'s RNA runs straight through.' }
        : { v: 'mixed', t: 'The copy has ' + rt + ' the reads of the intron around it: a small step.' };
    }
    if (S.lib === 'unstranded') r.tests.strand = { v: 'cant', t: 'Unstranded library: every read is counted on both strands, so the strand cannot be read.' };
    else {
      var on = sum(ERV.start, ERV.end, ervStrand()), all = sum(ERV.start, ERV.end);
      r.own = on / all;
      var pc = Math.round(100 * r.own) + '%';
      if (S.o === 'same') r.tests.strand = { v: 'cant', t: pc + ' of the reads run the copy\'s way, but so does the gene\'s RNA: when the copy points the same way as its gene, strand cannot tell them apart.' };
      else r.tests.strand = r.own >= 0.6 ? { v: 'own', t: pc + ' of the reads run the copy\'s way, against the gene: only the copy\'s own promoter makes those.' }
        : r.own <= 0.4 ? { v: 'gene', t: (r.own < 0.005 ? 'None of the reads run the copy\'s way; all run the gene\'s way.' : 'Only ' + pc + ' of the reads run the copy\'s way; the rest run the gene\'s way.') }
        : { v: 'mixed', t: pc + ' of the reads run the copy\'s way and the rest the gene\'s way: both are making RNA here.' };
    }
    var outer = S.o === 'same' ? mean(ERV.start, ERV.start + 10) : mean(ERV.end - 10, ERV.end);
    r.tests.start = body > 2 * Math.max(outer, 0.0001) ? { v: 'own', t: 'Coverage starts inside the 5\' LTR, where an LTR starts its RNA.' }
      : { v: body > 0 ? 'gene' : 'cant', t: 'Coverage is as high at the outer edge of the 5\' LTR as inside the copy: no start at the 5\' end.' };
    return r;
  }

  function drawModel() {
    var svg = $('locus'), W = Math.max(280, svg.parentNode.clientWidth - 22), L = 34, R = W - 8;
    var X = function (x) { return L + (R - L) * x / 1000; };
    var o = [], stranded = S.lib === 'stranded', CAP = 30, TH = 70;
    // gene and copy
    var gy = 26;
    o.push('<text class="lab" x="0" y="' + (gy + 4) + '">gene</text>');
    o.push('<line class="intron" x1="' + X(GENE.start) + '" x2="' + X(GENE.end) + '" y1="' + gy + '" y2="' + gy + '"/>');
    for (var a = 180; a < 900; a += 70) if (!inExon(a) && (a < ERV.start - 10 || a > ERV.end + 10)) o.push('<path class="chev" d="M' + (X(a) - 3) + ' ' + (gy - 4) + ' l5 4 l-5 4"/>');
    GENE.exons.forEach(function (e) { o.push('<rect class="exon' + (S.g ? ' on' : '') + '" x="' + X(e[0]) + '" y="' + (gy - 8) + '" width="' + (X(e[1]) - X(e[0])) + '" height="16" rx="2"/>'); });
    var ey = gy + 24, five = S.o === 'same' ? ERV.start : ERV.end - ERV.ltr, three = S.o === 'same' ? ERV.end - ERV.ltr : ERV.start;
    o.push('<text class="lab" x="0" y="' + (ey + 4) + '">ERV</text>');
    o.push('<rect class="ervbody" x="' + X(ERV.start + ERV.ltr) + '" y="' + (ey - 5) + '" width="' + (X(ERV.end - ERV.ltr) - X(ERV.start + ERV.ltr)) + '" height="10"/>');
    o.push('<rect class="ltr' + (S.e ? ' on' : '') + '" x="' + X(five) + '" y="' + (ey - 8) + '" width="' + (X(five + ERV.ltr) - X(five)) + '" height="16" rx="2"/>');
    o.push('<rect class="ltr" x="' + X(three) + '" y="' + (ey - 8) + '" width="' + (X(three + ERV.ltr) - X(three)) + '" height="16" rx="2"/>');
    var ax = S.o === 'same' ? X(ERV.end) + 4 : X(ERV.start) - 4, dir = S.o === 'same' ? 1 : -1;
    o.push('<path class="arrow" d="M' + ax + ' ' + (ey - 5) + ' l' + (6 * dir) + ' 5 l' + (-6 * dir) + ' 5"/>');
    o.push('<text class="sm" x="' + X(five + ERV.ltr / 2) + '" y="' + (ey + 20) + '" text-anchor="middle">5\' LTR</text>');
    // coverage tracks
    var tracks = stranded ? [{ s: 1, lab: '+ strand' }, { s: -1, lab: '− strand' }] : [{ s: 0, lab: 'all reads' }];
    var ty = ey + 36;
    o.push('<rect class="band" x="' + X(ERV.start) + '" y="' + (ty - 4) + '" width="' + (X(ERV.end) - X(ERV.start)) + '" height="' + (tracks.length * (TH + 18)) + '"/>');
    tracks.forEach(function (tk, k) {
      var base = ty + k * (TH + 18) + TH, pts = [], clipped = false;
      for (var x = 0; x <= 1000; x += STEP) {
        var c = tk.s ? cov(x, tk.s) : cov(x, 1) + cov(x, -1);
        if (c > CAP) clipped = true;
        pts.push(X(x).toFixed(1) + ',' + (base - TH * Math.min(c, CAP) / CAP).toFixed(1));
      }
      o.push('<text class="lab" x="0" y="' + (base - TH + 10) + '">' + tk.lab + '</text>');
      o.push('<polygon class="cov ' + (tk.s === -1 ? 'minus' : 'plus') + '" points="' + X(0) + ',' + base + ' ' + pts.join(' ') + ' ' + X(1000) + ',' + base + '"/>');
      o.push('<line class="base" x1="' + X(0) + '" x2="' + X(1000) + '" y1="' + base + '" y2="' + base + '"/>');
      if (clipped) o.push('<text class="sm" x="' + X(655) + '" y="' + (base - TH + 10) + '" text-anchor="middle">' + (W < 520 ? 'exons off scale' : 'exon reads run off the top') + '</text>');
    });
    var H = ty + tracks.length * (TH + 18) + 4;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = o.join('');
  }

  function renderReadout() {
    var r = readout(), lab = { own: 'own RNA', gene: 'gene\'s RNA', mixed: 'both', cant: 'can\'t tell' };
    var rows = [['count', 'Reads on the copy'], ['edge', 'Copy against the intron around it'], ['strand', 'Strand of the reads'], ['start', 'Where coverage starts']];
    $('tests').innerHTML = rows.map(function (x) {
      var t = r.tests[x[0]];
      return '<li class="t-' + t.v + '" data-test="' + x[0] + '"><b>' + x[1] + '</b><span class="pill">' + lab[t.v] + '</span><span class="why">' + esc(t.t) + '</span></li>';
    }).join('');
  }

  function renderControls() {
    [['g', S.g], ['e', S.e], ['o', S.o], ['lib', S.lib], ['rna', S.rna]].forEach(function (p) {
      document.querySelectorAll('[data-' + p[0] + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-' + p[0]) === String(p[1]))); });
    });
    document.querySelectorAll('[data-preset]').forEach(function (b) {
      var v = b.getAttribute('data-preset').split(',');
      b.setAttribute('aria-pressed', String(String(S.g) === v[0] && String(S.e) === v[1]));
    });
  }

  function drawAll() { drawModel(); renderReadout(); renderControls(); }
  ['g', 'e'].forEach(function (k) {
    document.querySelectorAll('[data-' + k + ']').forEach(function (b) { b.addEventListener('click', function () { S[k] = Number(b.getAttribute('data-' + k)); drawAll(); }); });
  });
  ['o', 'lib', 'rna'].forEach(function (k) {
    document.querySelectorAll('[data-' + k + ']').forEach(function (b) { b.addEventListener('click', function () { S[k] = b.getAttribute('data-' + k); drawAll(); }); });
  });
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () { var v = b.getAttribute('data-preset').split(','); S.g = Number(v[0]); S.e = Number(v[1]); drawAll(); });
  });
  $('reset').addEventListener('click', function () { Object.keys(DEF).forEach(function (k) { S[k] = DEF[k]; }); drawAll(); });

  // ---- Real data: where copies sit ------------------------------------------------------------
  var D = window.PASSENGER_DATA, RS = { sp: 'mouse', sub: 'IAPEz-int' };
  var DEFSUB = { mouse: 'IAPEz-int', human: 'HERVK-int' };
  var PLACE_LAB = { exon: 'exon', intron_same: 'intron, same way as the gene', intron_opp: 'intron, against the gene', intron_both: 'intron, genes both ways', intergenic: 'outside genes' };
  var CLS = function (c) { return /^(LINE|SINE|LTR|DNA)$/.test(c) ? c : 'other'; };
  function subOf(name) { var s = D.species[RS.sp].subs; for (var i = 0; i < s.length; i++) if (s[i][2] === name) return s[i]; return null; }
  function inGenes(r) { var n = r.slice(4), t = n[0] + n[1] + n[2] + n[3] + n[4]; return t ? 100 * (t - n[4]) / t : 0; }

  function drawScatter() {
    var svg = $('scatter'), W = Math.max(280, svg.parentNode.clientWidth - 22), H = Math.round(Math.min(360, W * 0.62));
    var narrow = W < 520, L = 50, Rm = 10, T = 10, B = 34, subs = D.species[RS.sp].subs;
    var X = function (d) { return L + (W - L - Rm) * Math.min(d, 35) / 35; }, Y = function (p) { return T + (H - T - B) * (1 - p / 100); };
    var o = [];
    [0, 25, 50, 75, 100].forEach(function (p) { o.push('<line class="grid" x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(p) + '" y2="' + Y(p) + '"/><text class="ax" x="' + (L - 4) + '" y="' + (Y(p) + 3) + '" text-anchor="end">' + p + '%</text>'); });
    [0, 5, 10, 20, 30].forEach(function (d) { o.push('<text class="ax" x="' + X(d) + '" y="' + (H - B + 13) + '" text-anchor="middle">' + d + '%</text>'); });
    o.push('<text class="axt" x="' + ((L + W - Rm) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + (narrow ? 'Median difference from original' : 'Copies differ from the original sequence (median)') + '</text>');
    o.push('<text class="axt" transform="translate(11,' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle">' + (narrow ? 'In protein-coding genes' : 'Copies inside protein-coding genes') + '</text>');
    var sel = null;
    subs.forEach(function (r) {
      if (r[3] === null) return;
      var t = r.slice(4).reduce(function (a, b) { return a + b; }, 0), rad = Math.max(1.6, Math.min(7, Math.sqrt(t) / 18));
      var c = '<circle class="dot ' + CLS(r[0]) + '" data-sub="' + esc(r[2]) + '" cx="' + X(r[3]).toFixed(1) + '" cy="' + Y(inGenes(r)).toFixed(1) + '" r="' + rad.toFixed(1) + '"><title>' + esc(r[2]) + '</title></circle>';
      o.push(c);
      if (r[2] === RS.sub) sel = r;
    });
    if (sel) o.push('<circle class="ring" cx="' + X(sel[3]).toFixed(1) + '" cy="' + Y(inGenes(sel)).toFixed(1) + '" r="10"/><text class="dlab" x="' + (X(sel[3]) + 12).toFixed(1) + '" y="' + (Y(inGenes(sel)) + 4).toFixed(1) + '">' + esc(sel[2]) + '</text>');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = o.join('');
  }

  function renderSub() {
    var r = subOf(RS.sub), box = $('subbox');
    if (!r) { box.innerHTML = '<p class="muted">No subfamily of that name in the ' + RS.sp + ' table.</p>'; return; }
    var n = r.slice(4), t = n.reduce(function (a, b) { return a + b; }, 0), P = D.places;
    var seg = P.map(function (p, i) { return n[i] ? '<span class="s p-' + p + '" style="width:' + (100 * n[i] / t).toFixed(2) + '%" title="' + PLACE_LAB[p] + '"></span>' : ''; }).join('');
    var leg = P.map(function (p, i) { return '<span><i class="s p-' + p + '"></i>' + PLACE_LAB[p] + ': ' + n[i].toLocaleString('en-US') + '</span>'; }).join('');
    var inside = n[1] + n[2] + n[3], ratio = n[1] ? (n[2] / n[1]).toFixed(1) : null;
    box.innerHTML = '<h3>' + esc(r[2]) + ' <span class="muted">' + esc(r[0] + ' / ' + r[1]) + '</span></h3>' +
      '<p class="muted">' + t.toLocaleString('en-US') + ' copies' + (r[3] !== null ? '; median ' + r[3].toFixed(1) + '% different from the original sequence' : '') + '.</p>' +
      '<div class="bar">' + seg + '</div><div class="legend">' + leg + '</div>' +
      '<p>' + Math.round(100 * n[4] / t) + '% of the copies sit outside protein-coding genes. ' +
      (inside ? 'Of the ' + inside.toLocaleString('en-US') + ' in introns, ' + n[2].toLocaleString('en-US') + ' point against the gene and ' + n[1].toLocaleString('en-US') + ' the same way' + (ratio && n[2] > n[1] ? ' (' + ratio + ' to 1)' : '') + '.' : 'None sit in introns.') + '</p>';
  }

  function renderData() {
    if (!D) return;
    document.querySelectorAll('[data-dsp]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-dsp') === RS.sp)); });
    drawScatter(); renderSub();
  }
  if (D) {
    document.querySelectorAll('[data-dsp]').forEach(function (b) { b.addEventListener('click', function () { RS.sp = b.getAttribute('data-dsp'); RS.sub = DEFSUB[RS.sp]; $('subfind').value = ''; renderData(); }); });
    $('scatter').addEventListener('click', function (ev) { var c = ev.target.closest('circle.dot'); if (c) { RS.sub = c.getAttribute('data-sub'); renderData(); } });
    $('subfind').addEventListener('change', function () { var v = $('subfind').value.trim(); if (v) { RS.sub = v; renderData(); } });
  }

  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { drawModel(); if (D) drawScatter(); }, 120); });
  window.Passenger = {
    state: function () { return { g: S.g, e: S.e, o: S.o, lib: S.lib, rna: S.rna }; },
    readout: readout,
    data: function () { return { sp: RS.sp, sub: RS.sub }; }
  };
  drawAll();
  renderData();
})();
