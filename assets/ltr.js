/* Repeat After Me: the "Body and ends" lesson.
   Every number comes from window.LTR_DATA (data/ltr.js), built by prep/ltr_structure.py and friends
   from the public UCSC RepeatMasker tables. Vanilla JS, hand-written SVG, no dependencies.
   Test hooks: ?sp=mouse|human&d=50|200|1000&body=IAPEz-int&ltr=IAPLTR1a_Mm
   window.LTR exposes set(patch), reset(), state(). */
(function () {
  'use strict';
  var L = window.LTR_DATA, N = window.NAMES_DATA;
  if (!L) return;
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var CH = 7.3;
  var DEF = { mouse: { body: 'IAPEz-int', ltr: 'IAPLTR1a_Mm' }, human: { body: 'HERVK-int', ltr: 'LTR5_Hs' } };
  var SPNAME = { mouse: 'mouse', human: 'human' };
  var FAM = [['ERVK', 'var(--f-ERVK)'], ['ERV1', 'var(--f-ERV1)'], ['ERVL', 'var(--f-ERVL)'], ['ERVL-MaLR', 'var(--f-MaLR)']];
  var FAMCOL = {}; FAM.forEach(function (f) { FAMCOL[f[0]] = f[1]; });
  function famCol(f) { return FAMCOL[f] || 'var(--f-other)'; }

  var S = { sp: 'mouse', d: '200', body: DEF.mouse.body, ltr: DEF.mouse.ltr };
  function sp() { return L.species[S.sp]; }
  function main() { return sp().byD['200']; }
  function cur() { return sp().byD[S.d]; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function pc(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function width(svg) { return Math.max(300, Math.round(svg.parentNode.clientWidth - 20)); }
  function fit(s, px) { var max = Math.floor((px - 6) / CH); if (max < 2) return ''; return s.length <= max ? s : s.slice(0, max - 1) + '…'; }
  function put(svg, w, h, html) { svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = html; }
  function ucsc(asm, chrom, s, e) { return 'https://genome.ucsc.edu/cgi-bin/hgTracks?db=' + asm + '&position=' + chrom + ':' + (s + 1) + '-' + e; }

  // ---------- 1. one copy, three rows ----------
  function drawCopy() {
    var svg = $('copysvg'), W = width(svg), ex = main().examples[S.body] || main().examples[DEF[S.sp].body];
    var asm = sp().assembly, pv = ex.provirus, so = ex.solo;
    var pad = 30, span = pv.end - pv.start, k = (W - 2 * pad) / span;
    var X = function (pos) { return pad + (pos - pv.start) * k; };
    var o = [];
    var isBody = function (r) { return /(-int|[-_]I)$/.test(r[2]); };
    // group consecutive rows into parts for the headings
    var parts = [];
    pv.rows.forEach(function (r) { var kind = isBody(r) ? 'body' : 'end'; var last = parts[parts.length - 1]; if (last && last.kind === kind) { last.e = r[1]; last.n++; } else parts.push({ kind: kind, s: r[0], e: r[1], n: 1 }); });
    o.push('<line class="dna" x1="0" y1="43" x2="' + W + '" y2="43"/>');
    parts.forEach(function (p, i) {
      var cx = (X(p.s) + X(p.e)) / 2;
      var head = p.kind === 'body' ? 'BODY (-int)' : 'END (LTR)';
      o.push('<text class="hd" x="' + cx.toFixed(1) + '" y="18" text-anchor="middle">' + head + '</text>');
      var five = (pv.strand === '+') === (i === 0);
      if (p.kind === 'end') o.push('<text class="sm" x="' + (i === 0 ? X(p.s) : X(p.e)).toFixed(1) + '" y="92" text-anchor="' + (i === 0 ? 'start' : 'end') + '">' + (five ? '5′ end' : '3′ end') + '</text>');
      if (p.kind === 'body') {
        var bn = {}; pv.rows.forEach(function (r) { if (/(-int|[-_]I)$/.test(r[2])) bn[r[2]] = 1; });
        o.push('<text x="' + cx.toFixed(1) + '" y="74" text-anchor="middle">' + esc(fit(Object.keys(bn).join(', '), X(p.e) - X(p.s))) + '</text>');
      }
    });
    pv.rows.forEach(function (r) {
      var x0 = X(r[0]), w = Math.max(1, X(r[1]) - x0), body = isBody(r);
      o.push('<g><title>' + esc(r[2] + ' · ' + fmt(r[1] - r[0]) + ' bp · ' + (r[3] / 10).toFixed(1) + '% from its reference') + '</title><rect x="' + x0.toFixed(1) + '" y="30" width="' + w.toFixed(1) + '" height="26" rx="2" fill="var(' + (body ? '--part-body' : '--part-ltr') + ')"/></g>');
      var i = pv.rows.indexOf(r);
      if (!body && (i === 0 || i === pv.rows.length - 1)) o.push('<text x="' + (i === 0 ? x0 : x0 + w).toFixed(1) + '" y="74" text-anchor="' + (i === 0 ? 'start' : 'end') + '">' + esc(r[2]) + '</text>');
    });
    // direction of the element
    var ax = pv.strand === '+' ? W - 8 : 8, dir = pv.strand === '+' ? 1 : -1;
    o.push('<path d="M' + (ax - 8 * dir) + ',38 L' + ax + ',43 L' + (ax - 8 * dir) + ',48" fill="none" stroke="var(--ink-2)" stroke-width="1.5"/>');
    // solo LTR on the same scale
    o.push('<text class="hd" x="' + pad + '" y="124">A SOLO LTR, SAME SCALE</text>');
    o.push('<line class="dna" x1="0" y1="149" x2="' + W + '" y2="149"/>');
    var sx = pad;
    so.rows.forEach(function (r) {
      var w = Math.max(1, (r[1] - r[0]) * k);
      o.push('<g><title>' + esc(r[2] + ' · ' + fmt(r[1] - r[0]) + ' bp · ' + (r[3] / 10).toFixed(1) + '% from its reference') + '</title><rect x="' + sx.toFixed(1) + '" y="136" width="' + w.toFixed(1) + '" height="26" rx="2" fill="var(--part-ltr)"/></g>');
      sx += w;
    });
    o.push('<text x="' + pad + '" y="180">' + esc(so.rows[0][2]) + ': one end, no body</text>');
    // scale bar
    var kb = 1000 * k;
    o.push('<line class="axis" x1="' + pad + '" y1="206" x2="' + (pad + kb).toFixed(1) + '" y2="206"/><line class="axis" x1="' + pad + '" y1="202" x2="' + pad + '" y2="210"/><line class="axis" x1="' + (pad + kb).toFixed(1) + '" y1="202" x2="' + (pad + kb).toFixed(1) + '" y2="210"/><text class="sm" x="' + (pad + kb + 8).toFixed(1) + '" y="210">1 kb</text>');
    put(svg, W, 218, o.join(''));

    // rows table
    var head = '<tr><th>genoName</th><th>genoStart</th><th>genoEnd</th><th>strand</th><th class="nm">repName</th><th>part</th><th>milliDiv</th></tr>';
    var row = function (r, chrom, strand, part) {
      return '<tr><td class="m">' + chrom + '</td><td class="m">' + r[0] + '</td><td class="m">' + r[1] + '</td><td class="m">' + strand + '</td><td><span class="sw" style="background:var(' + (/(-int|[-_]I)$/.test(r[2]) ? '--part-body' : '--part-ltr') + ')"></span>' + esc(r[2]) + '</td><td>' + part + '</td><td class="m">' + r[3] + '</td></tr>';
    };
    var h = head;
    pv.rows.forEach(function (r) { h += row(r, pv.chrom, pv.strand, /(-int|[-_]I)$/.test(r[2]) ? 'body' : 'end'); });
    h += '<tr class="lvl"><td colspan="7">the solo LTR</td></tr>';
    so.rows.forEach(function (r) { h += row(r, so.chrom, so.strand, 'solo end'); });
    $('copyrows').innerHTML = h;

    var names = {}; pv.rows.forEach(function (r) { names[r[2]] = 1; });
    var bodyRows = pv.rows.filter(isBody).length;
    var bodyR = pv.rows.filter(isBody), touching = bodyR.every(function (r, i) { return i === 0 || r[0] === bodyR[i - 1][1]; });
    var t = 'In the table this one copy is <b>' + pv.rows.length + ' rows</b> with <b>' + Object.keys(names).length + ' names</b>' +
      (bodyRows > 1 ? '; the body alone is split over ' + bodyRows + ' rows' + (touching ? ' that meet exactly, so the split is in the table, not in the DNA' : '') : '') + '. ';
    var pr = sp().pair;
    var endsRows = pv.rows.filter(function (r) { return !isBody(r); });
    if (pr && endsRows.length === 2 && pr.chrom === pv.chrom && pr.ltr1[0] === endsRows[0][0] && pr.ltr2[1] === endsRows[1][1]) {
      t += 'Its two ends, compared base by base, match at <b>' + fmt(pr.identical) + ' of ' + fmt(pr.len1) + '</b> positions. ' +
        '<span class="q">"Because the LTRs are identical at the time of integration, the number of differences between the LTRs can be used to infer the relative age of a provirus"</span> (Subramanian et al. 2011). ' +
        'So this is a young copy; the page picked the youngest intact copy it could find, so this is a best case. Gene conversion or recombination can also make two ends look more alike than their age suggests. ' +
        'A sequencing read lying wholly inside one end fits the other end just as well, unless it covers one of the few differences. ';
    } else {
      t += 'The base-by-base comparison of the two ends is shown for the default copy of each species. ';
    }
    t += 'See it in the UCSC Genome Browser: <a href="' + ucsc(asm, pv.chrom, pv.start, pv.end) + '">this copy</a>, <a href="' + ucsc(asm, so.chrom, so.start, so.end) + '">the solo LTR</a>.';
    $('copynote').innerHTML = t;
  }

  // ---------- 2. which ends go with which body ----------
  function groupList() {
    var g = main().groups;
    return Object.keys(g).sort(function (a, b) { return (g[b].l[0] + g[b].l[1]) - (g[a].l[0] + g[a].l[1]); });
  }
  function fillBodyPick() {
    var g = main().groups, sel = $('bodypick');
    sel.innerHTML = groupList().map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === S.body ? ' selected' : '') + '>' + esc(k + ' · ' + g[k].f + ' · ' + fmt(g[k].l[0] + g[k].l[1]) + ' LTRs') + '</option>';
    }).join('');
  }
  function drawFlank() {
    var svg = $('flanksvg'), W = width(svg), fl = (main().flank[S.body] || []).slice(0, 8), spread = main().spread || {};
    if (!fl.length) { put(svg, W, 40, '<text x="0" y="24">No LTR sits next to this body within 200 bp.</text>'); $('flanknote').innerHTML = ''; return; }
    var lw = Math.min(160, Math.max.apply(null, fl.map(function (f) { return f[0].length; })) * CH + 12);
    var max = fl[0][1], bw = W - lw - 60, o = [], y = 6;
    fl.forEach(function (f) {
      var w = Math.max(2, bw * f[1] / max), other = spread[f[0]] && spread[f[0]][0][0] !== S.body ? spread[f[0]][0] : null;
      o.push('<g><title>' + esc(f[0] + ' sits next to ' + S.body + ' ' + fmt(f[1]) + ' times' + (other ? '; more often next to ' + other[0] + ' (' + fmt(other[1]) + ')' : '')) + '</title>' +
        '<text x="' + (lw - 8) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(fit(f[0], lw)) + '</text>' +
        '<rect x="' + lw + '" y="' + y + '" width="' + w.toFixed(1) + '" height="20" rx="3" fill="var(--part-ltr)"/>' +
        '<text x="' + (lw + w + 6).toFixed(1) + '" y="' + (y + 15) + '">' + fmt(f[1]) + (other ? ' *' : '') + '</text></g>');
      y += 28;
    });
    var anyOther = fl.some(function (f) { return spread[f[0]] && spread[f[0]][0][0] !== S.body; });
    if (anyOther) { o.push('<text class="sm" x="' + lw + '" y="' + (y + 12) + '">* this end name sits next to another body more often (hover for which)</text>'); y += 20; }
    put(svg, W, y + 4, o.join(''));
    var g = main().groups[S.body], all = main().sameEnds;
    $('flanknote').innerHTML = 'The table files these as separate subfamilies; in the genome most of them sit at the ends of the same body, <b>' + esc(S.body) + '</b>. Short bars can be chance neighbours. ' +
      'Of its ' + fmt(g.b[0]) + ' copies with an end on both sides, <b>' + pc(g.se, g.b[0]) + '%</b> carry the same name at both ends. Across all ' + SPNAME[S.sp] + ' groups it is ' + pc(all[0], all[1]) + '%. Different names at the two ends of one copy can be naming noise or a real recombinant.';
  }

  // ---------- 3. how many ends still have a body ----------
  function stacked(o, y, x0, w, label, total, segs) {
    o.push('<text x="0" y="' + (y - 8) + '"><tspan font-weight="600">' + label + '</tspan><tspan class="sm" dx="8">' + fmt(total) + '</tspan></text>');
    var x = x0;
    segs.forEach(function (s) {
      var sw = total ? w * s[1] / total : 0;
      if (sw <= 0) return;
      o.push('<g><title>' + esc(s[0] + ': ' + fmt(s[1]) + ' (' + pc(s[1], total) + '%)') + '</title><rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + Math.max(0, sw - 2).toFixed(1) + '" height="30" rx="3" fill="var(' + s[2] + ')"/></g>');
      var lab = s[0] + ' ' + pc(s[1], total) + '%';
      if (sw > lab.length * CH + 10) o.push('<text x="' + (x + 6).toFixed(1) + '" y="' + (y + 20) + '" fill="' + (s[2] === '--part-ltr' ? 'var(--part-ltr-ink)' : 'var(--ink)') + '" style="fill:' + (s[2] === '--part-ltr' ? 'var(--part-ltr-ink)' : 'var(--ink)') + '">' + esc(lab) + '</text>');
      else if (sw > 34) o.push('<text x="' + (x + 4).toFixed(1) + '" y="' + (y + 20) + '" style="fill:' + (s[2] === '--part-ltr' ? 'var(--part-ltr-ink)' : 'var(--ink)') + '">' + pc(s[1], total) + '%</text>');
      x += sw;
    });
  }
  function drawSolo() {
    var svg = $('solosvg'), W = width(svg), g = cur().groups[S.body], o = [];
    Array.prototype.forEach.call(document.querySelectorAll('[data-d]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-d') === S.d)); });
    if (!g) { put(svg, W, 40, '<text x="0" y="24">Fewer than 50 LTRs in this group at this distance.</text>'); $('solonote').innerHTML = ''; return; }
    stacked(o, 26, 0, W, 'Ends (LTRs) of ' + S.body, g.l[0] + g.l[1], [['with a body', g.l[0], '--part-ltr'], ['solo', g.l[1], '--part-none']]);
    stacked(o, 98, 0, W, 'Bodies (' + S.body + ')', g.b[0] + g.b[1] + g.b[2], [['both ends', g.b[0], '--part-ltr'], ['one end', g.b[1], '--part-one'], ['alone', g.b[2], '--part-none']]);
    var ly = 150, lx = 0;
    [['with a body / both ends', '--part-ltr'], ['one end', '--part-one'], ['solo / alone', '--part-none']].forEach(function (l) {
      o.push('<rect x="' + lx + '" y="' + (ly - 10) + '" width="11" height="11" rx="2" fill="var(' + l[1] + ')"/><text class="sm" x="' + (lx + 16) + '" y="' + ly + '">' + l[0] + '</text>');
      lx += l[0].length * 6.8 + 34;
    });
    put(svg, W, 158, o.join(''));
    var shares = ['50', '200', '1000'].map(function (D) { var x = sp().byD[D].groups[S.body]; return x ? pc(x.l[1], x.l[0] + x.l[1]) + '%' : 'n/a'; });
    var boths = ['50', '200', '1000'].map(function (D) { var x = sp().byD[D].groups[S.body]; return x ? fmt(x.b[0]) : 'n/a'; });
    $('solonote').innerHTML = '<b>' + pc(g.l[1], g.l[0] + g.l[1]) + '%</b> of these LTRs have no body within ' + S.d + ' bp; ' + fmt(g.sf) + ' of those solo LTRs are near full length (at least 80% of their reference sequence). ' +
      'At 50 / 200 / 1000 bp the solo share is ' + shares.join(' / ') + ', and the bodies with both ends number ' + boths.join(' / ') + ': the rule moves the second more than the first. "Solo" here means no body row nearby, not a proven recombination.';
    drawCheck();
  }
  function drawCheck() {
    var h = L.species.human.byD[S.d].groups['HERVK-int'], v = L.validation;
    if (!h) { $('check').innerHTML = ''; return; }
    $('check').innerHTML = '<h3>Compared with a published count</h3>' +
      '<p>HERV-K (HML-2) is a group of human endogenous retroviruses, the most recently active in the human genome. Subramanian et al. 2011 found its proviruses with BLAT (a fast sequence-search tool), starting from K113, a well-studied HML-2 provirus, plus 8 more from RepeatMasker. They found its solo LTRs from RepeatMasker rows. Their solo count therefore comes from a method much like this page\'s, on an older genome build and annotation: a consistency check, not an independent one.</p>' +
      '<table><tr><th></th><th>This page (hg38, within ' + S.d + ' bp)</th><th>Subramanian et al. 2011 (hg19)</th></tr>' +
      '<tr><td>Solo LTRs, near full length</td><td class="n">' + fmt(h.sf) + ' (at least 80% of the reference)</td><td class="n">' + fmt(v.soloLTRs) + ' (' + v.soloRule + ')</td></tr>' +
      '<tr><td>Proviruses</td><td class="n">' + fmt(h.b[0]) + ' with both ends, ' + fmt(h.b[1]) + ' with one, ' + fmt(h.b[2]) + ' body alone</td><td class="n">' + fmt(v.proviruses) + ' (full-length and near full-length)</td></tr></table>' +
      '<p class="muted">The provirus counts are not like for like: a body here is any stretch of HERVK-int, however short.</p>';
  }

  // ---------- 4. older groups have fewer bodies left ----------
  var tip = $('agetip');
  function drawAge() {
    var svg = $('agesvg'), W = width(svg), H = Math.round(Math.min(420, Math.max(300, W * 0.55)));
    var g = cur().groups, keys = Object.keys(g).filter(function (k) { return g[k].div != null; });
    var ml = 46, mr = 12, mt = 10, mb = 44, pw = W - ml - mr, ph = H - mt - mb;
    var xmax = Math.ceil(Math.max.apply(null, keys.map(function (k) { return g[k].div / 10; })) / 5) * 5;
    var nmax = Math.max.apply(null, keys.map(function (k) { return g[k].l[0] + g[k].l[1]; }));
    var X = function (v) { return ml + pw * v / xmax; }, Y = function (v) { return mt + ph * (1 - v / 100); };
    var o = [];
    for (var t = 0; t <= 100; t += 25) o.push('<line class="grid" x1="' + ml + '" y1="' + Y(t) + '" x2="' + (ml + pw) + '" y2="' + Y(t) + '"/><text class="sm" x="' + (ml - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + t + '%</text>');
    for (var xv = 0; xv <= xmax; xv += 5) o.push('<line class="axis" x1="' + X(xv) + '" y1="' + (mt + ph) + '" x2="' + X(xv) + '" y2="' + (mt + ph + 5) + '"/><text class="sm" x="' + X(xv) + '" y="' + (mt + ph + 18) + '" text-anchor="middle">' + xv + '%</text>');
    o.push('<line class="axis" x1="' + ml + '" y1="' + (mt + ph) + '" x2="' + (ml + pw) + '" y2="' + (mt + ph) + '"/>');
    o.push('<text class="sm" x="' + (ml + pw) + '" y="' + (H - 4) + '" text-anchor="end">median difference of its LTRs from their reference → older</text>');
    o.push('<text class="sm" x="' + ml + '" y="' + (H - 4) + '">solo LTRs (%) ↑</text>');
    keys.sort(function (a, b) { return (g[b].l[0] + g[b].l[1]) - (g[a].l[0] + g[a].l[1]); });
    var selXY = null;
    keys.forEach(function (k) {
      var n = g[k].l[0] + g[k].l[1], r = 4 + 9 * Math.sqrt(n / nmax), x = X(g[k].div / 10), y = Y(100 * g[k].l[1] / n);
      o.push('<circle class="dot" data-g="' + esc(k) + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + famCol(g[k].f) + '"/>');
      if (k === S.body) selXY = [x, y, r];
    });
    if (selXY) {
      o.push('<circle class="selring" cx="' + selXY[0].toFixed(1) + '" cy="' + selXY[1].toFixed(1) + '" r="' + (selXY[2] + 4).toFixed(1) + '"/>');
      var right = selXY[0] < ml + pw * 0.7;
      o.push('<text x="' + (selXY[0] + (right ? selXY[2] + 8 : -selXY[2] - 8)).toFixed(1) + '" y="' + (selXY[1] + 4).toFixed(1) + '" text-anchor="' + (right ? 'start' : 'end') + '" font-weight="600" style="paint-order:stroke;stroke:var(--surface);stroke-width:3px">' + esc(S.body) + '</text>');
    }
    put(svg, W, H, o.join(''));
    var fams = {}; keys.forEach(function (k) { fams[FAMCOL[g[k].f] ? g[k].f : 'other'] = 1; });
    $('agelegend').innerHTML = FAM.filter(function (f) { return fams[f[0]]; }).map(function (f) { return '<span><i style="background:' + f[1] + '"></i>' + f[0] + '</span>'; }).join('') +
      (fams.other ? '<span><i style="background:var(--f-other)"></i>other families</span>' : '') + '<span class="muted">Dot size: number of LTRs</span>';
    var gs = g[S.body];
    $('agenote').innerHTML = 'Rank correlation (Spearman: 1 means older groups always have a higher solo share, 0 means no link) between age and solo share: <b>' + cur().rho.toFixed(2) + '</b> across ' + cur().nGroups + ' ' + SPNAME[S.sp] + ' groups with at least 50 LTRs. ' +
      'That fits solo LTRs piling up over time by recombination. But old bodies also decay until RepeatMasker breaks them up, renames them or misses them, and LTR fragments of any length count as solo here; both raise the solo share without recombination. It is a pattern in these tables, not a measured rate.' +
      (gs ? ' <b>' + esc(S.body) + '</b>: ' + (gs.div / 10).toFixed(1) + '% median difference, ' + pc(gs.l[1], gs.l[0] + gs.l[1]) + '% solo.' : '');
  }
  $('agesvg').addEventListener('mousemove', function (e) {
    var c = e.target.closest('[data-g]');
    if (!c) { tip.hidden = true; return; }
    var k = c.getAttribute('data-g'), g = cur().groups[k], n = g.l[0] + g.l[1];
    tip.innerHTML = esc(k) + '<br>' + esc(g.f) + ' · ' + fmt(n) + ' LTRs<br>' + pc(g.l[1], n) + '% solo · ' + (g.div / 10).toFixed(1) + '% from reference';
    var box = this.parentNode.getBoundingClientRect();
    tip.hidden = false;
    var x = e.clientX - box.left + 14, y = e.clientY - box.top + 14;
    if (x + 270 > box.width) x = Math.max(0, e.clientX - box.left - 280);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  $('agesvg').addEventListener('mouseleave', function () { tip.hidden = true; });
  $('agesvg').addEventListener('click', function (e) { var c = e.target.closest('[data-g]'); if (c) set({ body: c.getAttribute('data-g') }); });

  // ---------- 5. what this does to your counts ----------
  function fillLtrPick() {
    var r = main().roles, sel = $('ltrpick');
    var names = Object.keys(r).sort(function (a, b) { return tot(r[b]) - tot(r[a]); });
    sel.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '"' + (n === S.ltr ? ' selected' : '') + '>' + esc(n + ' · ' + fmt(tot(r[n])) + ' copies') + '</option>'; }).join('');
  }
  function tot(x) { return (x['5p'] || 0) + (x['3p'] || 0) + (x.solo || 0); }
  function drawRoles() {
    var svg = $('rolesvg'), W = width(svg), r = main().roles[S.ltr], o = [];
    if (!r) { put(svg, W, 40, '<text x="0" y="24">Fewer than 50 copies of this name.</text>'); return; }
    var n = tot(r), sp5 = r['5p'] || 0, sp3 = r['3p'] || 0, so = r.solo || 0;
    stacked(o, 26, 0, W, S.ltr, n, [['5′ end of a copy', sp5, '--part-ltr'], ['3′ end of a copy', sp3, '--part-body'], ['solo', so, '--part-none']]);
    var ly = 78, lx = 0;
    [['5′ end of a copy', '--part-ltr'], ['3′ end of a copy', '--part-body'], ['solo, no body nearby', '--part-none']].forEach(function (l) {
      o.push('<rect x="' + lx + '" y="' + (ly - 10) + '" width="11" height="11" rx="2" fill="var(' + l[1] + ')"/><text class="sm" x="' + (lx + 16) + '" y="' + ly + '">' + l[0] + '</text>');
      lx += l[0].length * 6.8 + 34;
    });
    put(svg, W, 86, o.join(''));
    var partner = (main().spread[S.ltr] || [])[0];
    var pr = sp().pair;
    var items = [
      'Of ' + fmt(n) + ' copies of <b>' + esc(S.ltr) + '</b>, <b>' + pc(so, n) + '%</b> are solo, ' + pc(sp5, n) + '% start a copy and ' + pc(sp3, n) + '% end one. A read count for ' + esc(S.ltr) + ' adds all of them together.' +
        (partner ? ' When a copy of this name has a body, it is most often ' + esc(partner[0]) + '.' : ''),
      'Reads on a body row can only come from places where body sequence remains. Reads on an LTR row can also come from solo LTRs. Either can come from a host gene\'s transcript that runs through the copy, for example inside an intron.',
      'A solo LTR can still act as a promoter: <span class="q">"their inherent promoter activity can affect expression of neighboring genes"</span> (Subramanian et al. 2011). So a higher count for an LTR name does not by itself mean full-length proviral RNA is being made.',
      'The two ends of a young copy are identical or nearly so (the ' + SPNAME[S.sp] + ' example in the first figure: ' + fmt(pr.identical) + ' of ' + fmt(pr.len1) + ' bases match), and so are many copies of the same name. A read lying wholly inside one of them fits several places equally well, so the aligner (the program that places each read on the genome) cannot choose. That is the multi-mapping problem, the subject of a later lesson.'
    ];
    $('takeaways').innerHTML = items.map(function (t) { return '<li>' + t + '</li>'; }).join('');
  }

  // ---------- sources ----------
  (function () {
    var s = [];
    if (N) ['mouse', 'human'].forEach(function (k) {
      var m = N.species[k];
      s.push('<div>' + (k === 'mouse' ? 'Mouse' : 'Human') + ' (' + m.assembly + '): UCSC RepeatMasker table <a class="mono" href="' + esc(m.url) + '">' + esc(m.url.replace('https://', '')) + '</a>, file dated ' + m.fileDate + ', md5 <span class="mono">' + m.md5 + '</span>; class LTR and LTR? rows on primary chromosomes.</div>');
    });
    s.push('<div>Copies rebuilt by position with <a href="prep/ltr_structure.py">ltr_structure.py</a> (rule in its header); the two ends compared with <a href="prep/ltr_pair_identity.py">ltr_pair_identity.py</a> using sequence from the <a href="https://api.genome.ucsc.edu/">UCSC REST API</a>; page data built by <a href="prep/build_ltr_json.py">build_ltr_json.py</a>.</div>');
    s.push('<div>Quotes and the HML-2 count: Subramanian RP, Wildschutte JH, Russo C, Coffin JM. <a href="https://doi.org/10.1186/1742-4690-8-90">Identification, characterization, and comparative genomic distribution of the HERV-K (HML-2) group of human endogenous retroviruses</a>. Retrovirology 2011;8:90.</div>');
    $('sources').innerHTML = s.join('');
  })();

  // ---------- state ----------
  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-sp]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sp') === S.sp)); });
    fillBodyPick(); fillLtrPick();
    drawCopy(); drawFlank(); drawSolo(); drawAge(); drawRoles();
    try {
      var u = new URLSearchParams();
      if (S.sp !== 'mouse') u.set('sp', S.sp);
      if (S.d !== '200') u.set('d', S.d);
      if (S.body !== DEF[S.sp].body) u.set('body', S.body);
      if (S.ltr !== bestLtr(S.body)) u.set('ltr', S.ltr);
      var q = u.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
    } catch (e) { /* file:// or sandboxed */ }
  }
  function bestLtr(body) {
    var fl = main().flank[body] || [], r = main().roles;
    for (var i = 0; i < fl.length; i++) if (r[fl[i][0]]) return fl[i][0];
    var sp_ = main().spread || {};
    for (var n in r) if (sp_[n] && sp_[n][0][0] === body) return n;
    return null;
  }
  function set(p) {
    if (p.sp && p.sp !== S.sp) { S.sp = p.sp === 'human' ? 'human' : 'mouse'; S.body = DEF[S.sp].body; S.ltr = bestLtr(S.body) || S.ltr; }
    if (p.d && sp().byD[p.d]) S.d = p.d;
    if (p.body && main().groups[p.body]) {
      S.body = p.body;
      if (!p.ltr) { var b = bestLtr(S.body); if (b) S.ltr = b; }
    }
    if (p.ltr && main().roles[p.ltr]) S.ltr = p.ltr;
    render();
  }
  function reset() { S = { sp: 'mouse', d: '200', body: DEF.mouse.body, ltr: DEF.mouse.ltr }; S.ltr = bestLtr(S.body) || S.ltr; render(); }

  Array.prototype.forEach.call(document.querySelectorAll('[data-sp]'), function (b) { b.addEventListener('click', function () { set({ sp: b.getAttribute('data-sp') }); }); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-d]'), function (b) { b.addEventListener('click', function () { set({ d: b.getAttribute('data-d') }); }); });
  $('bodypick').addEventListener('change', function () { set({ body: this.value }); });
  $('ltrpick').addEventListener('change', function () { set({ ltr: this.value }); });
  $('reset').addEventListener('click', reset);

  var q = new URLSearchParams(location.search);
  S.sp = q.get('sp') === 'human' ? 'human' : 'mouse';
  S.body = DEF[S.sp].body; S.ltr = bestLtr(S.body) || DEF[S.sp].ltr;
  set({ d: q.get('d') || '200', body: q.get('body') || undefined, ltr: q.get('ltr') || undefined });
  var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(render, 120); });
  window.LTR = { set: set, reset: reset, state: function () { return JSON.parse(JSON.stringify(S)); } };
})();
