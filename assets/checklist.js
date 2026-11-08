// Repeat After Me: "Before you show it" lesson.
// Ten checks for a repeat result. The reader marks each: not checked, passes, fails. Marking shows a passing or
// failing example (made-up shapes, except the real L1Md_T numbers in checks 2, 6 and 7), and the panel below builds
// the sentences the result has earned. State lives in the address: ?s=<ten letters, n/p/f>.
// Test hooks: window.Checklist.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---- Checks ----------------------------------------------------------------------------------
  // fig: which drawing; pass/fail: caption under the drawing for each state.
  var CHECKS = [
    { id: 'label', title: 'Label', fig: 'text',
      pass: 'You counted the table label L1Md_T, at subfamily level, and the paper you compare with also reports L1Md_T.',
      fail: 'You compare your L1Md_T with a paper\'s L1MdTf_I: the mm10 table holds both labels, as different rows.' },
    { id: 'lost', title: 'Reads lost', fig: 'seg',
      pass: 'Counted the reads that fit one place and the reads that fit several, 45.1% of L1Md_T\'s simulated reads, and reported that 54.9% never aligned.',
      fail: 'Counted unique reads only: 21.5% of L1Md_T\'s simulated reads. The count follows how mappable the copies are more than how much RNA they make.' },
    { id: 'rule', title: 'Second counting rule', fig: 'fold',
      data: { pass: [['Unique only', 2.0], ['EM', 1.9]], fail: [['Unique only', 2.0], ['EM', 1.1]] },
      pass: 'The rise is about two-fold whether reads that fit several places are left out or shared by EM.',
      fail: 'Two-fold with unique reads only, 1.1-fold once the shared reads are counted: the rise rests on a few unique reads.' },
    { id: 'strand', title: 'Strand and edges', fig: 'strand',
      pass: 'Reads run the copy\'s way and stop at its edges: a step up over the copy, nothing on the gene\'s strand.',
      fail: 'Reads run the gene\'s way at the same depth through the intron and the copy: the gene\'s RNA carries the copy.' },
    { id: 'start', title: 'Where the RNA starts', fig: 'start',
      pass: 'Coverage starts inside the copy\'s 5′ end, where an L1 keeps its promoter.',
      fail: 'Coverage is as high in the DNA before the 5′ end as inside the copy: no start at the promoter.' },
    { id: 'outside', title: 'Copies outside genes', fig: 'fold',
      data: { pass: [['Outside genes', 2.0], ['In introns', 2.0]], fail: [['Outside genes', 1.0], ['In introns', 2.4]] },
      pass: 'Copies outside genes rise as much as copies in introns.',
      fail: 'Only copies in introns rise: the rise follows the host genes.' },
    { id: 'copies', title: 'Named copies', fig: 'copies',
      pass: 'A copy whose reads fit it alone 35.3% of the time (chr7, 1,014 bases): a copy-level count can follow it.',
      fail: 'A copy whose reads fit it alone 1.5% of the time (chrX, 6,458 bases): in the simulated test it made 1,006 reads and the tools gave it 64 and 38.' },
    { id: 'browser', title: 'A look in the genome browser', fig: 'browser',
      pass: 'Reads cover the copy from end to end and stop at its edges.',
      fail: 'Reads pile on the first bases of a short copy, next to another element: they are the neighbour\'s reads.' },
    { id: 'samples', title: 'Replicates and DNA contamination', fig: 'dots',
      pass: 'All three treated samples are up about two-fold, and every sample has the same share of reads between genes.',
      fail: 'One treated sample carries the rise, and it has three times the share of reads between genes that the others have: a sign of DNA in the RNA.' },
    { id: 'other', title: 'An independent method', fig: 'text',
      pass: 'Transcription start sites, mapped in the same samples, sit inside the 5′ end of the copies you name.',
      fail: 'RT-qPCR on total RNA with primers in the L1 body and no no-RT control: it counts RNA from any copy, and any DNA.' }
  ];
  var SENTENCES = [
    { t: 'Reads assigned to L1Md_T rose two-fold.', needs: [0] },
    { t: 'The rise does not depend on how reads that fit several places were counted.', needs: [0, 1, 2] },
    { t: 'L1Md_T copies made this RNA from their own promoters, not as passengers of genes.', needs: [0, 3, 4, 5] },
    { t: 'These L1Md_T copies changed: (name them).', needs: [0, 6, 7] },
    { t: 'Every replicate shows it, and DNA contamination does not explain it.', needs: [0, 8] },
    { t: 'An independent method agrees.', needs: [0, 9] }
  ];
  var N = CHECKS.length;
  var S = { s: [] };
  for (var i = 0; i < N; i++) S.s.push('n');
  (function readUrl() {
    var q = new URLSearchParams(location.search).get('s');
    if (q && /^[npf]+$/.test(q) && q.length === N) S.s = q.split('');
  })();
  function writeUrl() {
    try {
      var u = new URL(location.href);
      if (S.s.every(function (x) { return x === 'n'; })) u.searchParams.delete('s'); else u.searchParams.set('s', S.s.join(''));
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* the page works without it */ }
  }

  // ---- Figures (SVG strings). Made-up shapes except where data are passed in. ------------------
  var W = 260;
  function frame(h, inner) { return '<svg viewBox="0 0 ' + W + ' ' + h + '" width="100%" role="img" preserveAspectRatio="xMinYMin meet">' + inner + '</svg>'; }
  function seg(state) {
    // L1Md_T, 2,000 simulated reads (One read, many places): 430 one place, 472 several, 1,098 never aligned
    var parts = [['one place', 430, 'u'], ['several places', 472, 'm'], ['never aligned', 1098, 'l']];
    var x = 0, o = ['<text class="fh" x="1" y="11">L1Md_T reads; solid = counted</text>'];
    parts.forEach(function (p, k) {
      var w = (W - 2) * p[1] / 2000, counted = p[2] === 'u' || (state === 'pass' && p[2] === 'm');
      var cls = 'sg ' + p[2] + (counted ? ' on' : '');
      o.push('<rect class="' + cls + '" x="' + (1 + x).toFixed(1) + '" y="18" width="' + (w - 1).toFixed(1) + '" height="18" rx="2"/>');
      o.push('<rect class="' + cls + '" x="1" y="' + (46 + 15 * k) + '" width="10" height="10" rx="2"/><text class="fl" x="16" y="' + (55 + 15 * k) + '">' + p[0] + ' ' + (100 * p[1] / 2000).toFixed(1) + '%' + (counted ? ', counted' : '') + '</text>');
      x += w;
    });
    return frame(92, o.join(''));
  }
  function fold(c, state) {
    var d = c.data[state], o = ['<text class="fh" x="1" y="11">change, after against before</text>'], max = 2.5, X0 = 92;
    d.forEach(function (r, k) {
      var y = 20 + k * 22, w = (W - X0 - 40) * r[1] / max;
      o.push('<text class="fl" x="' + (X0 - 6) + '" y="' + (y + 12) + '" text-anchor="end">' + r[0] + '</text>');
      o.push('<rect class="fb" x="' + X0 + '" y="' + (y + 2) + '" width="' + w.toFixed(1) + '" height="13" rx="2"/>');
      o.push('<text class="fv" x="' + (X0 + w + 5).toFixed(1) + '" y="' + (y + 13) + '">' + r[1].toFixed(1) + '×</text>');
    });
    var x1 = X0 + (W - X0 - 40) / max;
    o.push('<line class="ref" x1="' + x1.toFixed(1) + '" x2="' + x1.toFixed(1) + '" y1="18" y2="' + (20 + d.length * 22) + '"/><text class="fs" x="' + x1.toFixed(1) + '" y="' + (30 + d.length * 22) + '" text-anchor="middle">1×</text>');
    return frame(34 + d.length * 22, o.join(''));
  }
  // a coverage track: f(x) for x in 0..100 gives height 0..1
  function track(y, h, f, cls) {
    var pts = [];
    for (var x = 0; x <= 100; x += 1) pts.push((4 + (W - 8) * x / 100).toFixed(1) + ',' + (y + h - h * f(x)).toFixed(1));
    return '<polygon class="cv ' + cls + '" points="4,' + (y + h) + ' ' + pts.join(' ') + ' ' + (W - 4) + ',' + (y + h) + '"/><line class="bl" x1="4" x2="' + (W - 4) + '" y1="' + (y + h) + '" y2="' + (y + h) + '"/>';
  }
  var X = function (x) { return 4 + (W - 8) * x / 100; };
  function copyBox(y, a, b, label, five) {
    var o = '<rect class="cp" x="' + X(a) + '" y="' + y + '" width="' + (X(b) - X(a)) + '" height="8" rx="1"/>';
    if (five) o += '<rect class="cp5" x="' + X(a) + '" y="' + (y - 2) + '" width="' + (X(a + 6) - X(a)) + '" height="12" rx="1"/>';
    return o + '<text class="fs" x="' + ((X(a) + X(b)) / 2) + '" y="' + (y + 20) + '" text-anchor="middle">' + label + '</text>';
  }
  function strand(state) {
    var inC = function (x) { return x >= 35 && x < 65; };
    var own = state === 'pass' ? function (x) { return inC(x) ? 0.7 : 0; } : function () { return 0; };
    var gene = state === 'pass' ? function () { return 0.05; } : function () { return 0.45; };
    return frame(124, '<text class="fh" x="4" y="11">gene runs right; copy points left</text>' + copyBox(18, 35, 65, 'L1Md_T copy', false) +
      '<text class="fs" x="4" y="58">gene\'s strand</text>' + track(48, 26, gene, 'g') + '<text class="fs" x="4" y="98">copy\'s strand</text>' + track(88, 26, own, 'o'));
  }
  function start(state) {
    var f = state === 'pass' ? function (x) { return x < 20 ? 0.02 : x < 80 ? 0.75 : 0.02; } : function (x) { return x < 80 ? 0.6 : 0.02; };
    return frame(80, '<text class="fh" x="4" y="11">copy pointing right, 5′ end at left</text>' + copyBox(18, 20, 80, 'L1Md_T copy, 5′ end marked', true) + track(48, 28, f, 'o'));
  }
  function browser(state) {
    var o = '<text class="fh" x="4" y="11">reads over one named copy</text>';
    if (state === 'pass') return frame(80, o + copyBox(18, 25, 75, 'L1Md_T copy', false) + track(48, 28, function (x) { return x >= 25 && x < 75 ? 0.7 : 0.03; }, 'o'));
    o += '<rect class="nb" x="' + X(30) + '" y="18" width="' + (X(38) - X(30)) + '" height="8" rx="1"/><text class="fs" x="' + (X(30) - 3) + '" y="26" text-anchor="end">tRNA</text>';
    o += '<rect class="cp" x="' + X(38) + '" y="18" width="' + (X(70) - X(38)) + '" height="8" rx="1"/><text class="fs" x="' + X(56) + '" y="38" text-anchor="middle">short L1Md_T copy</text>';
    return frame(80, o + track(48, 28, function (x) { return x >= 26 && x < 46 ? 0.8 : 0.02; }, 'o'));
  }
  function copies(state) {
    var r = state === 'pass' ? ['chr7 copy, 1,014 bases', 0.353] : ['chrX copy, 6,458 bases', 0.015];
    var w = (W - 8) * r[1];
    return frame(62, '<text class="fh" x="4" y="11">' + r[0] + '</text><rect class="trk" x="4" y="20" width="' + (W - 8) + '" height="16" rx="2"/><rect class="fb" x="4" y="20" width="' + Math.max(1.5, w).toFixed(1) + '" height="16" rx="2"/><text class="fv" x="' + (8 + Math.max(1.5, w)).toFixed(1) + '" y="52">' + (100 * r[1]).toFixed(1) + '% of its reads fit it alone</text>');
  }
  function dots(state) {
    var fc = state === 'pass' ? [1.9, 2.1, 2.0] : [1.1, 1.2, 4.0];
    var ig = state === 'pass' ? [1, 1, 1, 1, 1, 1] : [1, 1, 1, 1, 1, 3];
    var o = ['<text class="fh" x="4" y="11">one dot per sample, against control mean</text>'];
    var X0 = 100, X1 = W - 10, sx = function (v) { return X0 + (X1 - X0) * v / 4.5; };
    o.push('<text class="fl" x="' + (X0 - 6) + '" y="32" text-anchor="end">change</text>');
    [1, 2, 3, 4].forEach(function (v) { o.push('<line class="gr" x1="' + sx(v) + '" x2="' + sx(v) + '" y1="20" y2="70"/><text class="fs" x="' + sx(v) + '" y="80" text-anchor="middle">' + v + '×</text>'); });
    o.push('<circle class="dc" cx="' + sx(1) + '" cy="28" r="4"/>');
    fc.forEach(function (v, k) { o.push('<circle class="dt" cx="' + sx(v).toFixed(1) + '" cy="' + (24 + 4 * k) + '" r="4"/>'); });
    o.push('<text class="fl" x="' + (X0 - 6) + '" y="60" text-anchor="end">between genes</text>');
    ig.forEach(function (v, k) { o.push('<circle class="' + (k < 3 ? 'dc' : 'dt') + '" cx="' + sx(v).toFixed(1) + '" cy="' + (52 + 4 * (k % 3)) + '" r="4"/>'); });
    o.push('<text class="fs" x="4" y="96"><tspan class="kc">●</tspan> control   <tspan class="kt">●</tspan> treated</text>');
    return frame(102, o.join(''));
  }
  function figure(c, state) {
    var st = state === 'f' ? 'fail' : 'pass';
    if (c.fig === 'text') return '<p class="ex">' + esc(c[st]) + '</p>';
    var svg = { seg: seg, strand: strand, start: start, browser: browser, copies: copies, dots: dots }[c.fig];
    return (c.fig === 'fold' ? fold(c, st) : svg(st)) + '<p class="ex">' + esc(c[st]) + '</p>';
  }

  // ---- Sentences --------------------------------------------------------------------------------
  function verdict() {
    return SENTENCES.map(function (s) {
      var failed = s.needs.filter(function (k) { return S.s[k] === 'f'; });
      var open = s.needs.filter(function (k) { return S.s[k] === 'n'; });
      return { t: s.t, needs: s.needs, v: failed.length ? 'no' : open.length ? 'open' : 'yes', failed: failed, open: open };
    });
  }
  var nums = function (ks) { return ks.map(function (k) { return k + 1; }).join(', '); };
  function renderSay() {
    var v = verdict(), yes = v.filter(function (x) { return x.v === 'yes'; }).length;
    $('saysum').textContent = yes + ' of ' + v.length + ' sentences earned.';
    $('saylist').innerHTML = v.map(function (x, k) {
      var why = x.v === 'yes' ? 'You can say this.' : x.v === 'no' ? 'Do not say this: check ' + nums(x.failed) + ' failed.' : 'Not yet: check ' + nums(x.open) + ' still open.';
      return '<li class="s-' + x.v + '" data-s="' + k + '"><b>' + esc(x.t) + '</b><span class="why">' + why + '</span></li>';
    }).join('');
    document.querySelectorAll('.cmark').forEach(function (el) {
      var k = Number(el.getAttribute('data-k'));
      el.textContent = 'Needed for sentence ' + nums(SENTENCES.map(function (s, j) { return s.needs.indexOf(k) >= 0 ? j : -1; }).filter(function (j) { return j >= 0; })) + '.';
    });
  }
  function asText() {
    var lab = { n: 'not checked', p: 'passes', f: 'fails' }, v = verdict();
    return 'Result: L1Md_T up two-fold\n\nChecks\n' + CHECKS.map(function (c, k) { return (k + 1) + '. ' + c.title + ': ' + lab[S.s[k]]; }).join('\n') +
      '\n\nWhat I can say\n' + v.map(function (x) { return (x.v === 'yes' ? '[yes] ' : x.v === 'no' ? '[no]  ' : '[open] ') + x.t; }).join('\n') + '\n';
  }

  // ---- Cards ------------------------------------------------------------------------------------
  function renderCard(k) {
    var c = CHECKS[k], card = document.querySelector('.ck[data-k="' + k + '"]');
    card.setAttribute('data-state', S.s[k]);
    card.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === S.s[k])); });
    card.querySelector('.cfig').innerHTML = '<div class="exlab">' + (S.s[k] === 'f' ? 'A failing example' : 'A passing example') + '</div>' + figure(c, S.s[k]);
  }
  function renderAll() { for (var k = 0; k < N; k++) renderCard(k); renderSay(); writeUrl(); }

  document.querySelectorAll('.ck').forEach(function (card) {
    var k = Number(card.getAttribute('data-k'));
    card.querySelectorAll('[data-m]').forEach(function (b) {
      b.addEventListener('click', function () { S.s[k] = b.getAttribute('data-m'); renderCard(k); renderSay(); writeUrl(); });
    });
  });
  $('copytext').addEventListener('click', function () {
    var t = asText(), pre = $('saytext');
    pre.textContent = t; pre.hidden = false;
    try { if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { $('copied').textContent = 'Copied.'; }, function () { $('copied').textContent = 'Select the text below to copy it.'; }); } catch (e) { /* text stays visible */ }
  });
  $('clearall').addEventListener('click', function () { for (var k = 0; k < N; k++) S.s[k] = 'n'; $('saytext').hidden = true; $('copied').textContent = ''; renderAll(); });

  window.Checklist = {
    state: function () { return S.s.join(''); },
    verdict: verdict,
    text: asText,
    set: function (s) { if (/^[npf]+$/.test(s) && s.length === N) { S.s = s.split(''); renderAll(); } }
  };
  renderAll();
})();
