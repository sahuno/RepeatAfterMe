/* Repeat After Me: the "One read, many places" lesson (question 9, multi-mapping).
   Section 1 is a model with made-up copies; sections 3-4 read window.MULTIMAP_DATA (data/multimap.js).
   Test hooks: ?len=36..150&div=0..15&pos=0..&n=24|200|2000&seed=1.. and, for the real data, &sp=mouse|human&rl=50|100&sub=L1Md_A
   window.Multi exposes set(patch), state(), places(). Vanilla JS, no dependencies. */
(function () {
  'use strict';
  var E = 1000, NDRAW = 24, MAXP = 10, COUNTS = [24, 200, 2000];
  var svg = document.getElementById('copies');
  if (!svg) return;
  var verdictEl = document.getElementById('verdict'), sweepEl = document.getElementById('sweep');
  var inLen = document.getElementById('len'), inDiv = document.getElementById('div'), inPos = document.getElementById('pos');

  function num(v, lo, hi, d) { v = Number(v); return v === v && v !== null && String(v) !== '' ? Math.min(hi, Math.max(lo, v)) : d; }
  var q = new URLSearchParams(location.search);
  var S = {
    len: Math.round(num(q.get('len') || NaN, 36, 150, 100)),
    div: num(q.get('div') || NaN, 0, 15, 1.4),
    pos: Math.round(num(q.get('pos') || NaN, 0, E - 36, 260)),
    seed: Math.round(num(q.get('seed') || NaN, 1, 1e9, 7)),
    n: COUNTS.indexOf(Number(q.get('n'))) >= 0 ? Number(q.get('n')) : 2000
  };
  var NC = S.n;

  // ---------- model ----------
  // Each copy position gets one fixed random number; a position is changed when that number is below
  // the divergence. Raising Copy age adds changes and never moves the old ones.
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var U = null, uSeed = '', cum = null, cumKey = '';
  function prepare() {
    // Drawn in order from one seed, so copies 1-24 look the same whatever the copy count.
    if (uSeed !== S.seed + ':' + S.n) { NC = S.n; var r = rng(S.seed); U = new Float32Array(NC * E); for (var i = 0; i < U.length; i++) U[i] = r(); uSeed = S.seed + ':' + S.n; cumKey = ''; }
    var key = S.seed + ':' + S.n + ':' + S.div;
    if (cumKey === key) return;
    var d = S.div / 100;
    cum = new Int32Array(NC * (E + 1));          // cum[c][p] = changes in copy c before position p
    for (var c = 0; c < NC; c++) {
      var o = c * (E + 1), s = 0;
      for (var p = 0; p < E; p++) { cum[o + p] = s; if (U[c * E + p] < d) s++; }
      cum[o + E] = s;
    }
    cumKey = key;
  }
  function changes(c, a, b) { var o = c * (E + 1); return cum[o + b] - cum[o + a]; }
  function changed(c, p) { return U[c * E + p] < S.div / 100; }
  // A copy matches the read only if neither it nor copy 1 has a change inside the read: every change is its own letter.
  function places(pos, len) {
    var b = pos + len, out = [0];
    if (changes(0, pos, b) > 0) return out;
    for (var c = 1; c < NC; c++) if (changes(c, pos, b) === 0) out.push(c);
    return out;
  }
  function mapq(n) { return n === 1 ? 255 : n === 2 ? 3 : n <= 4 ? 1 : 0; }
  function kind(n) { return n === 1 ? 'unique' : n <= MAXP ? 'multi' : 'drop'; }

  // ---------- drawing ----------
  var COL = { fit: 'var(--LINE)' };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function draw() {
    prepare();
    var W = Math.max(280, Math.round(svg.parentNode.clientWidth - 20));
    var L = 24, R = 34, X = function (p) { return L + (W - L - R) * p / E; };
    var top = 26, rowH = 11, y0 = 48, H = y0 + NDRAW * rowH + 4;
    var fits = places(S.pos, S.len), fit = {};
    fits.forEach(function (c) { fit[c] = true; });
    var a = X(S.pos), b = X(S.pos + S.len), out = [];
    out.push('<rect class="band" x="' + a.toFixed(1) + '" y="' + (top - 10) + '" width="' + (b - a).toFixed(1) + '" height="' + (H - top + 8) + '"/>');
    out.push('<text class="rowlab" x="0" y="' + (top - 14 + 0) + '">THE READ</text>');
    out.push('<rect class="read" x="' + a.toFixed(1) + '" y="' + top + '" width="' + (b - a).toFixed(1) + '" height="9"/>');
    for (var p = S.pos; p < S.pos + S.len; p++) if (changed(0, p)) out.push('<rect class="tick" x="' + (X(p) - 0.6).toFixed(1) + '" y="' + top + '" width="1.6" height="9"/>');
    out.push('<text class="rowlab" x="0" y="' + (y0 - 6) + '">' + (NC > NDRAW ? 'COPIES 1–' + NDRAW + ' OF ' + NC.toLocaleString('en-US') : 'COPIES') + '</text>');
    for (var c = 0; c < NDRAW; c++) {
      var y = y0 + c * rowH;
      out.push('<g' + (fit[c] ? ' class="fit"' : '') + '>');
      out.push('<text class="num" x="' + (L - 6) + '" y="' + (y + 8) + '" text-anchor="end">' + (c + 1) + '</text>');
      out.push('<rect class="copy" x="' + L + '" y="' + (y + 3) + '" width="' + (W - L - R) + '" height="3"/>');
      if (fit[c]) out.push('<rect x="' + a.toFixed(1) + '" y="' + y + '" width="' + (b - a).toFixed(1) + '" height="9" fill="' + COL.fit + '"/>');
      var o = c * E;
      for (var p2 = 0; p2 < E; p2++) if (U[o + p2] < S.div / 100) {
        var inside = p2 >= S.pos && p2 < S.pos + S.len;
        out.push('<rect class="tick' + (inside ? ' in' : '') + '" x="' + (X(p2) - 0.6).toFixed(1) + '" y="' + (y + (inside ? 0 : 1.5)) + '" width="' + (inside ? 1.6 : 1.2) + '" height="' + (inside ? 9 : 6) + '"/>');
      }
      if (fit[c]) out.push('<text class="fitlab" x="' + (W - R + 5) + '" y="' + (y + 8) + '">fits</text>');
      out.push('</g>');
    }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('height', H);
    svg.innerHTML = out.join('');
    renderVerdict(fits.length, fits.filter(function (c) { return c < NDRAW; }).length);
    renderSweep();
  }

  function renderVerdict(n, shown) {
    var hidden = NC > NDRAW && n > 1 ? ' (' + shown + ' of them among the ' + NDRAW + ' drawn)' : '';
    var k = kind(n), html;
    if (k === 'unique') html = '<b>Fits 1 place.</b> STAR writes it with MAPQ 255, and a unique-only count keeps it.' + (S.pos !== null && changes(0, S.pos, S.pos + S.len) ? ' Copy 1 has a change of its own inside the read, so no other copy matches.' : '');
    else if (k === 'multi') html = '<b>Fits ' + n + ' places equally well' + hidden + '.</b> STAR writes all ' + n + ', marks one at random as primary, and gives each MAPQ ' + mapq(n) + '. A unique-only count drops it.';
    else html = '<b>Fits ' + n.toLocaleString('en-US') + ' places' + hidden + '.</b> More than 10: STAR writes nothing for this read and counts it as "mapped to too many loci" (or, when every starting match is also in too many places, as "unmapped: other"; see the table below). Neither a unique-only count nor a multi-mapper count sees it.';
    verdictEl.className = 'verdict ' + k;
    verdictEl.innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll('.rulestable tr[data-k]'), function (tr) {
      var lo = Number(tr.getAttribute('data-k')), hi = lo === 1 ? 1 : lo === 2 ? 2 : lo === 3 ? 4 : lo === 5 ? 10 : Infinity;
      tr.classList.toggle('on', n >= lo && n <= hi);
    });
  }

  // Every read position along copy 1 at once: how many of those reads land in each bucket.
  function renderSweep() {
    var tot = E - S.len + 1, cnt = { unique: 0, multi: 0, drop: 0 };
    for (var p = 0; p < tot; p++) cnt[kind(places(p, S.len).length)]++;
    var seg = function (k, lab) { var f = cnt[k] / tot * 100; return f > 0 ? '<span class="s ' + k + '" style="width:' + f.toFixed(2) + '%"></span>' : ''; };
    var pc = function (k) { var f = cnt[k] / tot * 100; return (f > 0 && f < 1 ? '<1' : Math.round(f)) + '%'; };
    sweepEl.innerHTML = '<div class="sweeplab">Every possible ' + S.len + '-base read from copy 1</div>' +
      '<div class="bar" role="img" aria-label="' + pc('unique') + ' fit one place, ' + pc('multi') + ' fit 2 to 10 places, ' + pc('drop') + ' fit more than 10">' + seg('unique') + seg('multi') + seg('drop') + '</div>' +
      '<div class="legend"><span><i class="s unique"></i>1 place, kept: ' + pc('unique') + '</span><span><i class="s multi"></i>2–10 places, MAPQ 3/1/0: ' + pc('multi') + '</span><span><i class="s drop"></i>more than 10, thrown away: ' + pc('drop') + '</span></div>';
  }

  // ---------- controls ----------
  function sync() {
    inPos.max = String(E - S.len);
    if (S.pos > E - S.len) S.pos = E - S.len;
    inLen.value = S.len; inDiv.value = S.div; inPos.value = S.pos;
    document.getElementById('lenout').textContent = S.len + ' bases';
    document.getElementById('divout').textContent = S.div.toFixed(1) + '% different';
    document.getElementById('posout').textContent = 'base ' + S.pos;
    Array.prototype.forEach.call(document.querySelectorAll('[data-div]'), function (bt) { bt.setAttribute('aria-pressed', String(Number(bt.getAttribute('data-div')) === S.div)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-n]'), function (bt) { bt.setAttribute('aria-pressed', String(Number(bt.getAttribute('data-n')) === S.n)); });
    try {
      var u = new URLSearchParams(location.search);
      u.set('len', S.len); u.set('div', S.div); u.set('pos', S.pos); u.set('n', S.n); if (S.seed !== 7) u.set('seed', S.seed); else u.delete('seed');
      history.replaceState(null, '', location.pathname + '?' + u.toString() + location.hash);
    } catch (e) { /* file:// or sandboxed */ }
  }
  function set(p) { Object.keys(p).forEach(function (k) { S[k] = p[k]; }); sync(); draw(); }
  inLen.addEventListener('input', function () { set({ len: Number(inLen.value) }); });
  inDiv.addEventListener('input', function () { set({ div: Number(inDiv.value) }); });
  inPos.addEventListener('input', function () { set({ pos: Number(inPos.value) }); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-div]'), function (bt) {
    bt.addEventListener('click', function () { set({ div: Number(bt.getAttribute('data-div')) }); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-n]'), function (bt) {
    bt.addEventListener('click', function () { set({ n: Number(bt.getAttribute('data-n')) }); });
  });
  document.getElementById('shuffle').addEventListener('click', function () { set({ seed: S.seed + 1 }); });

  sync(); draw();
  if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(svg.parentNode);
  else window.addEventListener('resize', draw);

  // ---------- real data (sections 3 and 4) ----------
  // window.MULTIMAP_DATA: per species, subs = [class, family, subfamily, bp, median divergence %, run x4];
  // run = [reads, unique, nh2, nh3_4, nh5_10, nh11_up, too_many, no_window, other_unmapped, home].
  var realApi = null; // set below when the data file is present
  var RD = window.MULTIMAP_DATA, realbox = document.getElementById('realbox'), onebox = document.getElementById('onebox');
  var RS = { sp: q.get('sp') === 'human' ? 'human' : 'mouse', rl: q.get('rl') === '50' ? '50' : '100', sub: q.get('sub') || '' };
  var CLASSCOL = { LINE: 'var(--LINE)', SINE: 'var(--SINE)', LTR: 'var(--LTR)', DNA: 'var(--DNA)' };
  var MARK = { mouse: ['L1Md_A', 'L1Md_T', 'IAPEz-int', 'MERVL-int', 'B1_Mm', 'L1_Mus3'], human: ['L1HS', 'AluYa5', 'AluSx', 'SVA_F', 'HERVK-int', 'L1PA7'] };
  var START_SUB = { mouse: 'L1Md_A', human: 'L1HS' };
  var I = { reads: 0, unique: 1, nh2: 2, nh3_4: 3, nh5_10: 4, nh11_up: 5, too_many: 6, no_window: 7, other: 8, home: 9 };
  var RUNLAB = ['50 bases, default', '100 bases, default', '50 bases, limits 100', '100 bases, limits 100'];
  function runIdx(setting, rl) { return (setting === 'te100' ? 2 : 0) + (rl === '50' ? 0 : 1); }
  function subsOf(sp) { return RD.species[sp].subs; }
  function find(sp, name) { var s = subsOf(sp); for (var i = 0; i < s.length; i++) if (s[i][2] === name) return s[i]; return null; }
  function uniqShare(r) { return r[I.reads] ? r[I.unique] / r[I.reads] : 0; }
  function pc(x) { x *= 100; return x > 0 && x < 1 ? '<1%' : x > 99 && x < 100 ? '>99%' : Math.round(x) + '%'; }

  if (!RD) { if (realbox) realbox.innerHTML = '<p class="note">The real numbers have not been computed yet.</p>'; }
  else {
    realbox.innerHTML =
      '<div class="controls">' +
      '<div class="seg" role="group" aria-label="Species"><span class="lab">Species</span><button type="button" data-rsp="mouse">Mouse</button><button type="button" data-rsp="human">Human</button></div>' +
      '<div class="seg" role="group" aria-label="Read length"><span class="lab">Read length</span><button type="button" data-rl="50">50 bases</button><button type="button" data-rl="100">100 bases</button></div>' +
      '<label class="seg findsub"><span class="lab">Find</span><input id="subfind" list="sublist" placeholder="subfamily name" autocomplete="off" spellcheck="false"><datalist id="sublist"></datalist></label>' +
      '</div>' +
      '<figure class="ice"><div class="icebox"><svg id="scatter" class="ice" role="img" aria-label="Scatter plot: each subfamily as a dot, divergence across, share of reads placed in one place up."></svg></div>' +
      '<p class="note" id="scatternote"></p>' +
      '<figcaption>Dot area: bases the subfamily covers. Colours: class, as on every page; grey dots are other repeats. Divergence is the median for the subfamily, read from the RepeatMasker table; dots past 30% sit on the right edge. Reads are perfect copies of the reference and single-end, STAR 2.7.11b default settings. Real data has sequencing errors, strain differences and splicing, so real losses differ.</figcaption></figure>';
    var sc = document.getElementById('scatter'), finder = document.getElementById('subfind'), dl = document.getElementById('sublist'), dlFor = '';
    var pts = [];
    function drawScatter() {
      var W = Math.max(280, Math.round(sc.parentNode.clientWidth - 20)), H = Math.round(Math.min(420, Math.max(260, W * 0.55)));
      var L = 40, R = 12, T = 12, B = 38, XMAX = 30;
      var X = function (d) { return L + (W - L - R) * Math.min(d, XMAX) / XMAX; }, Y = function (f) { return T + (H - T - B) * (1 - f); };
      var ri = runIdx('default', RS.rl), subs = subsOf(RS.sp), maxbp = 0, out = [];
      subs.forEach(function (s) { if (s[3] > maxbp) maxbp = s[3]; });
      [0, 0.25, 0.5, 0.75, 1].forEach(function (f) { out.push('<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(f) + '" y2="' + Y(f) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (Y(f) + 4) + '" text-anchor="end">' + Math.round(f * 100) + '%</text>'); });
      [0, 5, 10, 15, 20, 25, 30].forEach(function (d) { out.push('<text class="ax" x="' + X(d) + '" y="' + (H - B + 16) + '" text-anchor="middle">' + d + (d === 30 ? '+' : '') + '%</text>'); });
      out.push('<text class="axt" x="' + ((L + W - R) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">Copies differ from the original sequence (median) →</text>');
      out.push('<text class="axt" transform="translate(11,' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle">Reads placed in one place →</text>');
      pts = [];
      var order = subs.slice().sort(function (a, b) { return b[3] - a[3]; });   // big dots first, small ones on top
      order.forEach(function (s) {
        if (s[4] === null || s[4] === undefined) return;
        var x = X(s[4]), y = Y(uniqShare(s[5 + ri])), r = Math.max(1.6, 9 * Math.sqrt(s[3] / maxbp));
        var col = CLASSCOL[s[0].replace(/\?$/, '')] || 'var(--otherrep)';
        out.push('<circle class="dot' + (s[2] === RS.sub ? ' on' : '') + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + col + '"/>');
        pts.push([x, y, s[2]]);
      });
      // Labels: the picked subfamily first, then the marked ones; each takes the first spot that does not overlap a placed label.
      var placed = [];
      [RS.sub].concat(MARK[RS.sp].filter(function (n) { return n !== RS.sub; })).forEach(function (n) {
        var s = find(RS.sp, n); if (!s || s[4] === null) return;
        var x = X(s[4]), y = Y(uniqShare(s[5 + ri])), w = n.length * 6.8 + 4, h = 13;
        var spots = [[8, -6], [8, 16], [-8, -6], [-8, 16], [8, -20], [8, 30], [-8, -20], [-8, 30], [8, -34], [8, 44]];
        for (var k = 0; k < spots.length; k++) {
          var dx = spots[k][0], ty = y + spots[k][1], x0 = dx > 0 ? x + dx : x + dx - w;
          if (x0 < L || x0 + w > W - 2 || ty - h < 0 || ty > H - B) continue;
          var hit = placed.some(function (b) { return x0 < b[0] + b[2] && b[0] < x0 + w && ty - h < b[1] && b[1] - h < ty; });
          if (hit) continue;
          placed.push([x0, ty, w]);
          if (Math.abs(spots[k][1] + 6) > 8) out.push('<line class="lead" x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (x + dx * 0.8).toFixed(1) + '" y2="' + (ty - (spots[k][1] > 0 ? 11 : -2)).toFixed(1) + '"/>');
          out.push('<text class="dlab' + (n === RS.sub ? ' on' : '') + '" x="' + (x + dx).toFixed(1) + '" y="' + ty.toFixed(1) + '" text-anchor="' + (dx > 0 ? 'start' : 'end') + '">' + esc(n) + '</text>');
          break;
        }
      });
      var on = find(RS.sp, RS.sub);
      if (on && on[4] !== null) out.push('<circle class="ring" cx="' + X(on[4]).toFixed(1) + '" cy="' + Y(uniqShare(on[5 + ri])).toFixed(1) + '" r="11"/>');
      sc.setAttribute('viewBox', '0 0 ' + W + ' ' + H); sc.setAttribute('height', H);
      sc.innerHTML = out.join('');
      // one sentence that summarises the whole species at this read length
      var young = subs.filter(function (s) { return s[4] !== null && s[4] < 3; }), old = subs.filter(function (s) { return s[4] !== null && s[4] >= 10; });
      function med(a) { var v = a.map(function (s) { return uniqShare(s[5 + ri]); }).sort(function (p, q2) { return p - q2; }); return v.length ? v[Math.floor((v.length - 1) / 2)] : 0; }
      document.getElementById('scatternote').innerHTML = (RS.sp === 'mouse' ? 'Mouse' : 'Human') + ', ' + RS.rl + '-base reads: in the ' + young.length + ' subfamilies whose copies differ by less than 3%, the median subfamily has ' + pc(med(young)) + ' of its reads placed in one place; in the ' + old.length + ' subfamilies at 10% or more, ' + pc(med(old)) + '.';
    }
    sc.addEventListener('click', function (e) {
      var b = sc.getBoundingClientRect(), vb = sc.viewBox.baseVal, k = vb.width / b.width;
      var x = (e.clientX - b.left) * k, y = (e.clientY - b.top) * k, best = null, bd = 18 * k;
      pts.forEach(function (p) { var d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = p; } });
      if (best) setReal({ sub: best[2] });
    });
    finder.addEventListener('change', function () { var s = find(RS.sp, finder.value.trim()); if (s) setReal({ sub: s[2] }); });
    Array.prototype.forEach.call(realbox.querySelectorAll('[data-rsp]'), function (b) { b.addEventListener('click', function () { setReal({ sp: b.getAttribute('data-rsp') }); }); });
    Array.prototype.forEach.call(realbox.querySelectorAll('[data-rl]'), function (b) { b.addEventListener('click', function () { setReal({ rl: b.getAttribute('data-rl') }); }); });

    var SEGS = [
      ['unique', '1 place: kept by a unique-only count', function (r) { return r[I.unique]; }],
      ['multi', 'several places, written with MAPQ 3, 1 or 0', function (r) { return r[I.nh2] + r[I.nh3_4] + r[I.nh5_10] + r[I.nh11_up]; }],
      ['drop', 'too many places: not written', function (r) { return r[I.too_many]; }],
      ['never', 'never aligned: its starting matches sit in too many places', function (r) { return r[I.no_window]; }],
      ['other', 'unmapped for another reason', function (r) { return r[I.other]; }]
    ];
    function renderOne() {
      var s = find(RS.sp, RS.sub);
      if (!s) { onebox.innerHTML = '<p class="muted">No subfamily of that name in the ' + RS.sp + ' table.</p>'; return; }
      var html = '<div class="panel"><div class="path">' + esc(s[0]) + ' › ' + esc(s[1]) + ' › <b>' + esc(s[2]) + '</b></div>' +
        '<p>' + (s[3] / 1e6).toFixed(s[3] < 1e6 ? 2 : 1) + ' Mb of the ' + RS.sp + ' genome; copies differ from the original sequence by ' + (s[4] === null ? 'an unknown amount' : s[4].toFixed(1) + '% (median)') + '.</p><div class="bars">';
      for (var i = 0; i < 4; i++) {
        var r = s[5 + i], n = r[I.reads] || 1, aria = [];
        html += '<div class="barrow' + (runIdx('default', RS.rl) === i ? ' cur' : '') + '"><div class="barlab">' + RUNLAB[i] + '</div><div class="bar">';
        SEGS.forEach(function (g) { var v = g[2](r) / n; if (v > 0) html += '<span class="s ' + g[0] + '" style="width:' + (v * 100).toFixed(2) + '%" title="' + esc(g[1] + ': ' + pc(v)) + '"></span>'; aria.push(g[1] + ' ' + pc(v)); });
        html += '</div><div class="barnum">' + pc(r[I.unique] / n) + ' in 1 place</div></div>';
      }
      var otherSeen = [0, 1, 2, 3].some(function (i) { return s[5 + i][I.other] > 0; }); // empty in every run so far; shown only if present
      html += '</div><div class="legend">' + SEGS.filter(function (g) { return g[0] !== 'other' || otherSeen; }).map(function (g) { return '<span><i class="s ' + g[0] + '"></i>' + g[1] + '</span>'; }).join('') + '</div>';
      var d = s[5 + runIdx('default', RS.rl)], t = s[5 + runIdx('te100', RS.rl)], nd = d[I.reads] || 1;
      var lostD = (d[I.too_many] + d[I.no_window]) / nd, lostT = (t[I.too_many] + t[I.no_window]) / (t[I.reads] || 1);
      html += '<p>With default settings and ' + RS.rl + '-base reads, STAR writes nothing for ' + pc(lostD) + ' of these reads (' + pc(d[I.no_window] / nd) + ' never aligned, ' + pc(d[I.too_many] / nd) + ' in too many places). Raising both limits to 100 brings that to ' + pc(lostT) + '. The share in one place hardly changes, because higher limits keep more multi-mapped reads but leave each one in several places.</p></div>';
      onebox.innerHTML = html;
    }
    function renderRealControls() {
      Array.prototype.forEach.call(realbox.querySelectorAll('[data-rsp]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-rsp') === RS.sp)); });
      Array.prototype.forEach.call(realbox.querySelectorAll('[data-rl]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-rl') === RS.rl)); });
      if (dlFor !== RS.sp) { dl.innerHTML = subsOf(RS.sp).map(function (s) { return '<option value="' + esc(s[2]) + '">'; }).join(''); dlFor = RS.sp; }
      finder.value = RS.sub;
    }
    function setReal(p) {
      if (p.sp && p.sp !== RS.sp && !('sub' in p)) p.sub = START_SUB[p.sp];
      Object.keys(p).forEach(function (k) { RS[k] = p[k]; });
      if (!find(RS.sp, RS.sub)) RS.sub = START_SUB[RS.sp];
      renderRealControls(); drawScatter(); renderOne();
      try {
        var u = new URLSearchParams(location.search);
        u.set('sp', RS.sp); u.set('rl', RS.rl); u.set('sub', RS.sub);
        history.replaceState(null, '', location.pathname + '?' + u.toString() + location.hash);
      } catch (e) { /* file:// */ }
    }
    realApi = setReal;
    setReal({});
    if (window.ResizeObserver) new ResizeObserver(function () { drawScatter(); }).observe(sc.parentNode);
  }

  window.Multi = {
    set: set,
    state: function () { return JSON.parse(JSON.stringify(S)); },
    places: function () { prepare(); return places(S.pos, S.len).length; },
    real: function (p) { if (p && realApi) realApi(p); return JSON.parse(JSON.stringify(RS)); }
  };
})();
