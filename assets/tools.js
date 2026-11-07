// Repeat After Me: "Counting tools" lesson. Six made-up copies, one set of reads, seven counting rules.
// Every rule runs on the same reads in the browser; nothing is drawn by hand.
// Test hooks: ?u=0.2&x=1&lv=0,2,0,0,1,0&m=emcopy, and window.Tools.
(function () {
  'use strict';
  var COPIES = [
    { id: 'A1', sub: 'A' }, { id: 'A2', sub: 'A' }, { id: 'A3', sub: 'A' }, { id: 'A4', sub: 'A' },
    { id: 'B1', sub: 'B' }, { id: 'B2', sub: 'B' }
  ];
  var SUBS = ['A', 'B'];
  var PER_LEVEL = 30;      // reads made by a copy at level 1
  var CROSS = 0.15;        // share of each copy that both subfamilies have in common, when switched on
  var DEF = { u: 0.2, x: true, lv: [0, 2, 0, 0, 1, 0], m: 'emcopy' };

  var METHODS = {
    uniq: { lab: 'Unique only', perCopy: true,
      desc: 'Counts only reads that fit one place and drops the rest. This is a MAPQ 255 filter, or TEcount with --mode uniq.' },
    fcm: { lab: '-M', perCopy: true,
      desc: 'featureCounts -M without --fraction: every place a read fits gets a whole read, so one read is counted several times.' },
    fcfrac: { lab: '-M --fraction', perCopy: true,
      desc: 'featureCounts -M --fraction: a read that fits n places gives 1/n to each.' },
    tetx: { lab: 'TEtranscripts', perCopy: false,
      desc: 'TEcount in its default multi mode: EM shares each read between the copies it fits, then the copies are added up, so it reports one count per subfamily.' },
    emcopy: { lab: 'Copy EM', perCopy: true,
      desc: 'The same EM, reported per copy, as TElocal, SQuIRE and Telescope do. A copy\'s share of a shared read depends on how many reads fit that copy alone.' },
    telescope: { lab: 'Telescope default', perCopy: true,
      desc: 'Telescope\'s default mode: after EM, each read goes whole to its most likely copy, and a read with several equally likely copies is left out.' },
    salmonte: { lab: 'SalmonTE', perCopy: false,
      desc: 'Reads are matched to one sequence per repeat type instead of the genome (here, one per subfamily), so copies are never told apart; reads that fit both subfamilies are shared by EM.' }
  };
  var ORDER = ['uniq', 'fcm', 'fcfrac', 'tetx', 'emcopy', 'telescope', 'salmonte'];

  var S = { u: DEF.u, x: DEF.x, lv: DEF.lv.slice(), m: DEF.m };
  (function readUrl() {
    var q = new URLSearchParams(location.search);
    if (q.has('u')) { var u = Number(q.get('u')); if (u >= 0 && u <= 0.6) S.u = u; }
    if (q.has('x')) S.x = q.get('x') !== '0';
    if (q.has('lv')) { var lv = q.get('lv').split(',').map(Number); if (lv.length === 6 && lv.every(function (v) { return v === 0 || v === 1 || v === 2; })) S.lv = lv; }
    if (q.has('m') && METHODS[q.get('m')]) S.m = q.get('m');
  })();

  // ---- The reads ------------------------------------------------------------------------------
  // Each switched-on copy makes PER_LEVEL reads per level, spread evenly along it (no randomness).
  // Where a read starts decides which copies it fits: its own unique stretch, the stretch its
  // subfamily shares, or the stretch both subfamilies share.
  function makeReads() {
    var reads = [], x = S.x ? CROSS : 0;
    COPIES.forEach(function (c, i) {
      var n = PER_LEVEL * S.lv[i];
      for (var k = 0; k < n; k++) {
        var pos = (k + 0.5) / n, fits;
        if (pos < S.u) fits = [i];
        else if (pos >= 1 - x) fits = COPIES.map(function (_, j) { return j; });
        else fits = COPIES.map(function (d, j) { return d.sub === c.sub ? j : -1; }).filter(function (j) { return j >= 0; });
        reads.push({ src: i, pos: pos, fits: fits });
      }
    });
    return reads;
  }

  // Reads with the same set of places behave the same way, so group them.
  function groups(reads, key) {
    var g = {};
    reads.forEach(function (r) {
      var f = key ? key(r.fits) : r.fits, k = f.join(',');
      (g[k] = g[k] || { fits: f, n: 0 }).n++;
    });
    return Object.keys(g).map(function (k) { return g[k]; });
  }

  // Plain EM over K places of equal length. Returns expected reads per place and the final shares.
  function em(gs, K) {
    var theta = [], N = 0, i, it;
    for (i = 0; i < K; i++) theta.push(1 / K);
    gs.forEach(function (g) { N += g.n; });
    var cnt = new Array(K).fill(0);
    if (!N) return { cnt: cnt, theta: theta };
    for (it = 0; it < 2000; it++) {
      cnt = new Array(K).fill(0);
      gs.forEach(function (g) {
        var tot = 0;
        g.fits.forEach(function (j) { tot += theta[j]; });
        g.fits.forEach(function (j) { cnt[j] += tot > 0 ? g.n * theta[j] / tot : g.n / g.fits.length; });
      });
      var next = cnt.map(function (c) { return c / N; }), diff = 0;
      for (i = 0; i < K; i++) diff = Math.max(diff, Math.abs(next[i] - theta[i]));
      theta = next;
      if (diff < 1e-12) break;
    }
    return { cnt: cnt, theta: theta };
  }

  function subTotals(perCopy) {
    var t = { A: 0, B: 0 };
    perCopy.forEach(function (v, i) { t[COPIES[i].sub] += v; });
    return t;
  }

  function compute(m) {
    var reads = makeReads(), K = COPIES.length, copy = new Array(K).fill(0), sub, e;
    var truth = new Array(K).fill(0);
    reads.forEach(function (r) { truth[r.src]++; });
    if (m === 'uniq') reads.forEach(function (r) { if (r.fits.length === 1) copy[r.fits[0]]++; });
    else if (m === 'fcm') reads.forEach(function (r) { r.fits.forEach(function (j) { copy[j]++; }); });
    else if (m === 'fcfrac') reads.forEach(function (r) { r.fits.forEach(function (j) { copy[j] += 1 / r.fits.length; }); });
    else if (m === 'emcopy' || m === 'tetx') copy = em(groups(reads), K).cnt;
    else if (m === 'telescope') {
      e = em(groups(reads), K);
      reads.forEach(function (r) {
        var best = Math.max.apply(null, r.fits.map(function (j) { return e.theta[j]; }));
        var top = r.fits.filter(function (j) { return e.theta[j] >= best * (1 - 1e-6); });
        if (top.length === 1 && best > 0) copy[top[0]]++;
      });
    } else if (m === 'salmonte') {
      var toSub = function (fits) { var s = {}; fits.forEach(function (j) { s[COPIES[j].sub === 'A' ? 0 : 1] = 1; }); return Object.keys(s).map(Number); };
      var es = em(groups(reads, toSub), 2).cnt;
      sub = { A: es[0], B: es[1] };
    }
    if (!sub) sub = subTotals(copy);
    var perCopy = METHODS[m].perCopy;
    var off = 0;
    if (perCopy) copy.forEach(function (v, i) { off += Math.abs(v - truth[i]); });
    return {
      method: m, copy: perCopy ? copy : null, sub: sub, truth: truth, truthSub: subTotals(truth),
      reads: reads.length, counted: sub.A + sub.B, off: perCopy ? off : null
    };
  }

  // ---- Drawing --------------------------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('copysvg');
  function fmt(v) { var r = Math.round(v * 10) / 10; return (Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r) : r.toFixed(1)).toString(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function draw() {
    var box = svg.parentNode, W = Math.max(280, box.clientWidth - 22), narrow = W < 520;
    var res = compute(S.m), all = ORDER.map(compute);
    var maxCopy = 1, maxSub = 1;
    all.forEach(function (r) {
      if (r.copy) r.copy.forEach(function (v) { maxCopy = Math.max(maxCopy, v); });
      maxSub = Math.max(maxSub, r.sub.A, r.sub.B);
    });
    res.truth.forEach(function (v) { maxCopy = Math.max(maxCopy, v); });
    var L = Math.round(W * (narrow ? 0.5 : 0.55)), GAP = 16, R = W - L - GAP, X0 = L + GAP;
    var ROW = 50, TOP = 22, o = [], x = S.x ? CROSS : 0, reads = res.reads ? makeReads() : [];
    o.push('<defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" class="hatchbg"/><line x1="0" y1="0" x2="0" y2="5" class="hatchline"/></pattern></defs>');
    o.push('<text class="colhead" x="0" y="12">' + (narrow ? 'Copies (tap one)' : 'Copies and their reads (tap to switch)') + '</text>');
    o.push('<text class="colhead" x="' + X0 + '" y="12">' + (narrow ? 'Count  |  true' : esc(METHODS[S.m].lab) + ' count  |  true') + '</text>');
    COPIES.forEach(function (c, i) {
      var y = TOP + i * ROW, lv = S.lv[i], cls = 'sf' + c.sub;
      var lvTxt = lv === 0 ? 'off' : lv === 1 ? 'on' : 'on ×2';
      o.push('<g class="copy ' + cls + (lv ? '' : ' offc') + '" data-i="' + i + '" tabindex="0" role="button" aria-label="Copy ' + c.id + ', ' + lvTxt + '. Press to change.">');
      o.push('<rect class="hit" x="0" y="' + y + '" width="' + L + '" height="' + (ROW - 4) + '"/>');
      o.push('<text class="clab" x="0" y="' + (y + 13) + '">' + c.id + ' <tspan class="lv">' + lvTxt + '</tspan></text>');
      var by = y + 28, bh = 13;
      o.push('<rect class="z uniq" x="0" y="' + by + '" width="' + (L * S.u) + '" height="' + bh + '"/>');
      o.push('<rect class="z shared" x="' + (L * S.u) + '" y="' + by + '" width="' + (L * (1 - S.u - x)) + '" height="' + bh + '"/>');
      if (x) o.push('<rect class="z cross" x="' + (L * (1 - x)) + '" y="' + by + '" width="' + (L * x) + '" height="' + bh + '" fill="url(#hatch)"/>');
      reads.forEach(function (r) { if (r.src === i) o.push('<rect class="rd" x="' + (L * r.pos - 0.6).toFixed(1) + '" y="' + (by - 9) + '" width="1.2" height="7"/>'); });
      o.push('</g>');
      // right side: this method's count for the copy
      if (res.copy) {
        var v = res.copy[i], t = res.truth[i], sx = R / maxCopy;
        o.push('<rect class="track" x="' + X0 + '" y="' + by + '" width="' + R + '" height="' + bh + '"/>');
        o.push('<rect class="est ' + cls + '" x="' + X0 + '" y="' + by + '" width="' + (v * sx).toFixed(1) + '" height="' + bh + '"/>');
        o.push('<rect class="truth" x="' + (X0 + t * sx - 1).toFixed(1) + '" y="' + (by - 4) + '" width="2" height="' + (bh + 8) + '"/>');
        o.push('<text class="num' + (Math.abs(v - t) > 0.5 ? ' bad' : '') + '" x="' + X0 + '" y="' + (by - 6) + '">' + fmt(v) + '  |  ' + fmt(t) + '</text>');
      } else if (i === 0 || i === 4) {
        o.push('<text class="na" x="' + X0 + '" y="' + (by + 10) + '">not reported per copy</text>');
      }
    });
    var y0 = TOP + COPIES.length * ROW + 10;
    o.push('<line class="sep" x1="0" x2="' + W + '" y1="' + (y0 - 4) + '" y2="' + (y0 - 4) + '"/>');
    SUBS.forEach(function (s, k) {
      var y = y0 + k * 38 + 8, v = res.sub[s], t = res.truthSub[s], sx = R / maxSub;
      o.push('<text class="clab" x="0" y="' + (y + 18) + '">Subfamily ' + s + ' total</text>');
      o.push('<rect class="track" x="' + X0 + '" y="' + (y + 8) + '" width="' + R + '" height="13"/>');
      o.push('<rect class="est sf' + s + '" x="' + X0 + '" y="' + (y + 8) + '" width="' + (v * sx).toFixed(1) + '" height="13"/>');
      o.push('<rect class="truth" x="' + (X0 + t * sx - 1).toFixed(1) + '" y="' + (y + 4) + '" width="2" height="21"/>');
      o.push('<text class="num' + (Math.abs(v - t) > 0.5 ? ' bad' : '') + '" x="' + X0 + '" y="' + (y + 2) + '">' + fmt(v) + '  |  ' + fmt(t) + '</text>');
    });
    var H = y0 + 2 * 38 + 14;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.innerHTML = o.join('');
    renderControls();
    renderNote(res);
    renderTable(all);
  }

  function renderNote(r) {
    var t = METHODS[S.m].desc + ' ';
    if (!r.reads) { $('modelnote').innerHTML = 'Every copy is off, so there are no reads. Tap a copy to switch it on.'; return; }
    var sA = 'Subfamily A: ' + fmt(r.sub.A) + ' (true ' + fmt(r.truthSub.A) + '); B: ' + fmt(r.sub.B) + ' (true ' + fmt(r.truthSub.B) + ').';
    if (r.copy) t += 'Copy counts are off by ' + fmt(r.off) + ' reads in total. ' + sA;
    else t += sA;
    if (S.u === 0 && (S.m === 'emcopy' || S.m === 'tetx')) t += ' No read fits one copy alone, so EM has nothing to go on and splits each subfamily\'s reads evenly between its copies.';
    if (S.m === 'telescope' && r.counted < r.reads) t += ' ' + fmt(r.reads - r.counted) + ' of the ' + r.reads + ' reads tie between equally likely copies and are left out.';
    if (S.m === 'fcm') t += ' ' + fmt(r.counted) + ' reads counted from ' + r.reads + ' that exist.';
    $('modelnote').innerHTML = t;
  }

  function renderTable(all) {
    var tr = all[0];
    var h = '<thead><tr><th>Rule</th><th class="r">A</th><th class="r">B</th><th class="r">Counted</th><th class="r">Off by</th></tr></thead><tbody>';
    h += '<tr class="truthrow"><td>True</td><td class="r">' + fmt(tr.truthSub.A) + '</td><td class="r">' + fmt(tr.truthSub.B) + '</td><td class="r">' + tr.reads + '</td><td class="r">0</td></tr>';
    all.forEach(function (r) {
      var bad = function (v, t) { return Math.abs(v - t) > 0.5 ? ' bad' : ''; };
      h += '<tr data-m="' + r.method + '"' + (r.method === S.m ? ' class="on"' : '') + '><td>' + esc(METHODS[r.method].lab) + '</td>' +
        '<td class="r' + bad(r.sub.A, r.truthSub.A) + '">' + fmt(r.sub.A) + '</td>' +
        '<td class="r' + bad(r.sub.B, r.truthSub.B) + '">' + fmt(r.sub.B) + '</td>' +
        '<td class="r' + bad(r.counted, r.reads) + '">' + fmt(r.counted) + '</td>' +
        '<td class="r' + (r.off === null ? ' na' : r.copy.some(function (v, i) { return Math.abs(v - r.truth[i]) > 0.5; }) ? ' bad' : '') + '">' + (r.off === null ? '–' : fmt(r.off)) + '</td></tr>';
    });
    $('sumtable').innerHTML = h + '</tbody>';
  }

  function renderControls() {
    document.querySelectorAll('[data-m]').forEach(function (b) { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === S.m)); });
    document.querySelectorAll('[data-x]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-x') === '1') === S.x)); });
    document.querySelectorAll('[data-u]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-u')) === S.u)); });
    document.querySelectorAll('[data-lv]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lv') === S.lv.join(','))); });
    $('u').value = Math.round(S.u * 100);
    $('uout').textContent = Math.round(S.u * 100) + '%';
  }

  // ---- Events ---------------------------------------------------------------------------------
  function cycle(i) { S.lv[i] = (S.lv[i] + 1) % 3; draw(); }
  svg.addEventListener('click', function (ev) {
    var g = ev.target.closest('g.copy');
    if (g) cycle(Number(g.getAttribute('data-i')));
  });
  svg.addEventListener('keydown', function (ev) {
    var g = ev.target.closest && ev.target.closest('g.copy');
    if (g && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      var i = Number(g.getAttribute('data-i'));
      cycle(i);
      var again = svg.querySelector('g.copy[data-i="' + i + '"]');
      if (again) again.focus();
    }
  });
  document.querySelectorAll('button[data-m]').forEach(function (b) { b.addEventListener('click', function () { S.m = b.getAttribute('data-m'); draw(); }); });
  document.querySelectorAll('[data-x]').forEach(function (b) { b.addEventListener('click', function () { S.x = b.getAttribute('data-x') === '1'; draw(); }); });
  document.querySelectorAll('[data-u]').forEach(function (b) { b.addEventListener('click', function () { S.u = Number(b.getAttribute('data-u')); draw(); }); });
  document.querySelectorAll('[data-lv]').forEach(function (b) { b.addEventListener('click', function () { S.lv = b.getAttribute('data-lv').split(',').map(Number); draw(); }); });
  $('u').addEventListener('input', function () { S.u = Number($('u').value) / 100; draw(); });
  $('sumtable').addEventListener('click', function (ev) {
    var tr = ev.target.closest('tr[data-m]');
    if (tr) { S.m = tr.getAttribute('data-m'); draw(); }
  });
  $('reset').addEventListener('click', function () { S.u = DEF.u; S.x = DEF.x; S.lv = DEF.lv.slice(); S.m = DEF.m; draw(); });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 120); });

  window.Tools = {
    state: function () { return { u: S.u, x: S.x, lv: S.lv.slice(), m: S.m }; },
    result: function (m) { return compute(m || S.m); },
    methods: ORDER.slice()
  };
  draw();
})();
