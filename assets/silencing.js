// Repeat After Me: "What keeps copies silent" lesson.
// A picker over published experiments in mouse cells: which silencing layer was removed and which families
// made RNA, as each paper names them. Text only from the sources cited on the page (see q16_spec.md).
// Test hooks: ?ex=<id>; window.Silencing.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var LAYERS = [
    { k: 'pirna', name: 'piRNA', who: 'germ cells' },
    { k: 'h3k9', name: 'H3K9me3', who: 'SETDB1, KAP1' },
    { k: 'dnam', name: 'DNA methylation', who: 'DNMT1, 3A, 3B' }
  ];
  var EX = [
    { id: 'setdb1-es', label: 'SETDB1 removed, embryonic stem cells', cell: 'Mouse embryonic stem cells', removed: ['h3k9'], wake: 'many',
      woke: ['RLTR1B', 'GLN', 'ERVK10C', 'ETn', 'ETnERV', 'MMTV', 'ETnERV2/MusD', 'RLTR45', 'IAP-d', 'RLTR10'], not: ['L1', 'class III ERVs'],
      quote: '"between 4 and 20% of all genomic copies of 10 Class I or II ERVs subfamilies ... were de-repressed in the SETDB1 KO line"; L1 and representative class III ERVs were not de-repressed.',
      src: 'Karimi et al. 2011' },
    { id: 'kap1-es', label: 'KAP1 (TRIM28) removed, embryonic stem cells and early embryos', cell: 'Mouse embryonic stem cells and early embryos', removed: ['h3k9'], wake: 'many',
      woke: ['IAP', 'other ERVs'], not: [],
      quote: '"KAP1 deletion leads to a marked upregulation of a range of ERVs, in particular IAP elements, in mouse embryonic stem (ES) cells and in early embryos."',
      src: 'Rowe et al. 2010' },
    { id: 'dnmt-es', label: 'DNA methylation removed (Dnmt1, 3a, 3b), embryonic stem cells', cell: 'Mouse embryonic stem cells', removed: ['dnam'], wake: 'few',
      woke: [], not: ['every ERV subfamily, at 4% of copies or more', 'L1'],
      quote: '"no ERV subfamily showed reactivation of ≥4% of genomic copies in DNMT TKO cells" (Karimi et al.); "ERVs are minimally derepressed" (Matsui et al.).',
      src: 'Karimi et al. 2011; Matsui et al. 2010' },
    { id: 'both-es', label: 'SETDB1 and DNMT1 both knocked down, embryonic stem cells', cell: 'Mouse embryonic stem cells', removed: ['h3k9', 'dnam'], wake: 'many',
      woke: ['GLN', 'RLTR4/MLV', 'ERVK10C', 'IAPE-z', 'ETnERV2/MusD'], not: [],
      quote: 'Knocking down SETDB1 "induced expression of GLN, RLTR4/MLV, ERVK10C, IAPE-z and in particular ETnERV2/MusD ERVs"; adding Dnmt1 knockdown raised expression further only for "the young IAPE-z subfamily, for which the double KD behaves synergistically".',
      src: 'Karimi et al. 2011' },
    { id: 'setdb1-tumour', label: 'SETDB1 removed, B16 melanoma and LLC tumour cells', cell: 'Mouse tumour cells: B16 melanoma, Lewis lung carcinoma', removed: ['h3k9'], wake: 'many',
      woke: ['MMERGLN', 'MMVL30', 'MMERVK10C', 'other LTR elements'], not: [],
      quote: '"Hundreds of TE insertions were activated in Setdb1 KO cells"; "Induced TEs were predominantly LTR-type (79–84%), including MMERGLN, MMVL30, and MMERVK10C elements."',
      src: 'Griffin et al. 2021' },
    { id: 'miwi2-germ', label: 'MIWI2 (piRNA pathway) removed, male germline', cell: 'Mouse male germ cells', removed: ['pirna'], wake: 'many',
      woke: ['transposable elements (families not named in the abstract)'], not: [],
      quote: 'Miwi2-deficient mice showed "a marked and progressive loss of germ cells with age", phenotypes that "may be linked to an inappropriate activation of transposable elements".',
      src: 'Carmell et al. 2007' }
  ];
  var S = { ex: 'setdb1-es' };
  (function readUrl() {
    var q = new URLSearchParams(location.search);
    if (EX.some(function (e) { return e.id === q.get('ex'); })) S.ex = q.get('ex');
  })();
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function ex() { return EX.filter(function (e) { return e.id === S.ex; })[0]; }
  function readout() { var e = ex(); return { id: e.id, removed: e.removed.slice(), woke: e.woke.slice(), not: e.not.slice(), src: e.src }; }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function draw() {
    var e = ex(), germ = e.id === 'miwi2-germ';
    var svg = $('layersvg'); svg.textContent = '';
    var W = 340, H = 206;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', Math.min(560, Math.max(280, svg.parentNode.clientWidth - 22)));
    var yD = 176, cx1 = 120, cx2 = 220;
    el('line', { x1: 10, x2: 330, y1: yD, y2: yD, class: 'dna' }, svg);
    el('rect', { x: cx1, y: yD - 8, width: cx2 - cx1, height: 16, rx: 3, class: 'copy' }, svg);
    el('text', { x: (cx1 + cx2) / 2, y: yD + 22, 'text-anchor': 'middle', class: 'sm' }, svg, 'transposon copy');
    // layers, nearest the DNA at the bottom
    LAYERS.slice().reverse().forEach(function (L, i) {
      var y = yD - 32 - i * 26, off = e.removed.indexOf(L.k) >= 0, faded = L.k === 'pirna' && !germ;
      el('rect', { x: 20, y: y, width: 230, height: 20, rx: 10, class: 'band ' + L.k + (off ? ' off' : '') + (faded ? ' faded' : '') }, svg);
      var t = el('text', { x: 32, y: y + 14, class: 'bl' + (off ? ' off' : '') + (faded ? ' faded' : '') }, svg, L.name);
      el('tspan', { class: 'who', dx: 6 }, t, L.who);
      el('text', { x: 256, y: y + 14, class: 'sm' + (faded ? ' faded' : '') }, svg, off ? 'removed' : faded ? 'germline only' : '');
    });
    // RNA from the copy when the experiment woke families
    var n = e.wake === 'many' ? 3 : 1;
    // drawn above the layers, as RNA that got out
    var yTop = yD - 32 - 2 * 26 - 6;
    for (var k = 0; k < n; k++) {
      var x0 = 140 + k * 26, d = 'M' + x0 + ' ' + yTop;
      for (var s = 1; s <= 4; s++) d += ' q 6 -5 0 -10';
      el('path', { d: d, class: 'rna' + (e.wake === 'few' ? ' faint' : '') }, svg);
    }
    el('text', { x: 20, y: 22, class: 'tl' }, svg, e.wake === 'few' ? 'Little RNA from the copy' : 'RNA from the copy');
    var h = '<p class="cell">' + esc(e.cell) + '</p>';
    if (e.woke.length) h += '<p class="k">Woke</p><ul class="chips">' + e.woke.map(function (w) { return '<li class="woke">' + esc(w) + '</li>'; }).join('') + '</ul>';
    if (e.not.length) h += '<p class="k">Did not wake</p><ul class="chips">' + e.not.map(function (w) { return '<li class="not">' + esc(w) + '</li>'; }).join('') + '</ul>';
    h += '<p class="q">' + esc(e.quote) + ' <span class="src">(' + esc(e.src) + ')</span></p>';
    $('exread').innerHTML = h;
  }

  var sel = $('expick');
  EX.forEach(function (e) { var o = document.createElement('option'); o.value = e.id; o.textContent = e.label; sel.appendChild(o); });
  sel.value = S.ex;
  sel.addEventListener('change', function () { S.ex = sel.value; draw(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 120); });
  window.Silencing = { state: S, readout: readout, experiments: EX.map(function (e) { return e.id; }),
    set: function (o) { Object.keys(o).forEach(function (k) { S[k] = o[k]; }); sel.value = S.ex; draw(); return readout(); } };
  draw();
})();
