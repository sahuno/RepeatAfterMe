// Repeat After Me: "Two zoos" lesson. Data: data/zoo.js (built by prep/q6/build_zoo_json.py).
// One row per RepeatMasker class/family label: mouse bar and human bar side by side, bar length = share of
// the genome, dark part = bases in copies under 3% different from their subfamily's original sequence.
// Test hooks: window.Zoos.state(), window.Zoos.pick(label), window.Zoos.stats().
(function () {
  'use strict';
  var D = window.ZOO_DATA, box = document.getElementById('zoogrid'), panel = document.getElementById('zoopanel');
  if (!D || !box) return;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SP = ['mouse', 'human'], CLASSES = ['LINE', 'SINE', 'LTR', 'DNA', 'Retroposon'], MIN = 0.05;
  var MARK = {
    iap: 'IAP: 46 of the 115 published mouse insertion mutations (Gagnier et al. 2019).',
    etn: 'ETn/MusD: 31 mutations, 28 of them ETn (Gagnier et al. 2019).',
    erb2: 'ERV-β2 group, annotated ETnERV3 with RLTR13A ends: 4 mutations; not part of ETn/MusD (Gagnier et al. 2019).',
    mlv: 'MLV: 7 mutations (Gagnier et al. 2019); "the most active mouse ERV on a per provirus basis" (Maksakova et al. 2006).',
    vl30: 'VL30: behind the non-agouti mutation, moved with MLV\'s help (Gagnier et al. 2019).',
    b1: 'B1: 1 of the 8 SINE insertion mutations (Gagnier et al. 2019).',
    b2: 'B2: 7 of the 8 SINE insertion mutations (Gagnier et al. 2019).',
    l1md: 'L1: 12 mutations; TF, A and GF are the active mouse L1 subfamilies (Gagnier et al. 2019; Goodier et al. 2001).',
    hl1: 'LINE-1 is active in humans: 80–100 retrotransposition-competent L1s per person (Brouha et al. 2003). The sources name the element, not RepeatMasker subfamilies.',
    halu: 'Alu is active in humans, moved by LINE-1 proteins (Kazazian and Moran 2017). The sources name the element, not RepeatMasker subfamilies.',
    hsva: 'SVA is active in humans, moved by LINE-1 proteins (Kazazian and Moran 2017). The sources name the element, not RepeatMasker subfamilies.'
  };
  var S = { pick: 'LTR/ERVK' };
  var pct = function (bp, sp) { return 100 * bp / D.species[sp].genome_bp; };
  var fmt = function (v) { return v >= 10 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v >= 0.001 ? v.toFixed(3) : v > 0 ? 'under 0.001' : '0'; };

  // index: label -> {mouse: fam, human: fam}
  var byLabel = {};
  SP.forEach(function (sp) {
    D.species[sp].families.forEach(function (f) {
      var lab = f.cls + '/' + f.fam;
      (byLabel[lab] = byLabel[lab] || { cls: f.cls.replace(/\?$/, ''), label: lab })[sp] = f;
    });
  });
  var maxPct = 0;
  Object.keys(byLabel).forEach(function (l) { SP.forEach(function (sp) { if (byLabel[l][sp]) maxPct = Math.max(maxPct, pct(byLabel[l][sp].bp, sp)); }); });

  function stats() {
    var s = {};
    SP.forEach(function (sp) {
      var all = 0, ltr = 0;
      D.species[sp].families.forEach(function (f) { all += f.ybp; if (f.cls.replace(/\?$/, '') === 'LTR') ltr += f.ybp; });
      s[sp] = { young: pct(all, sp), youngLTR: pct(ltr, sp) };
    });
    return s;
  }

  function bar(f, sp) {
    if (!f) return '<div class="zb none">no such label</div>';
    var p = pct(f.bp, sp), y = pct(f.ybp, sp), w = 100 * p / maxPct, mk = f.marker || f.has_marked;
    return '<div class="zb"><div class="track"><span class="all ' + sp + '" style="width:' + w.toFixed(2) + '%"><span class="young" style="width:' + (p ? 100 * y / p : 0).toFixed(2) + '%"></span></span></div>' +
      '<div class="num">' + fmt(p) + '%' + (y > 0 ? ' · young ' + fmt(y) + '%' : '') + (mk ? ' <span class="mk" title="new insertions documented">●</span>' : '') + '</div></div>';
  }

  function draw() {
    var h = '';
    CLASSES.forEach(function (c) {
      var labs = Object.keys(byLabel).filter(function (l) { return byLabel[l].cls === c; });
      var shown = labs.filter(function (l) { return SP.some(function (sp) { return byLabel[l][sp] && pct(byLabel[l][sp].bp, sp) >= MIN; }); });
      shown.sort(function (a, b) {
        var m = function (l) { return Math.max(byLabel[l].mouse ? pct(byLabel[l].mouse.bp, 'mouse') : 0, byLabel[l].human ? pct(byLabel[l].human.bp, 'human') : 0); };
        return m(b) - m(a);
      });
      if (!shown.length) return;
      var hidden = labs.length - shown.length;
      h += '<div class="zclass"><h3><span class="sw ' + c + '"></span>' + c + '</h3><div class="zhead"><span></span><span>Mouse</span><span>Human</span></div>';
      shown.forEach(function (l) {
        var r = byLabel[l];
        h += '<button type="button" class="zrow' + (S.pick === l ? ' on' : '') + '" data-label="' + esc(l) + '" aria-pressed="' + (S.pick === l) + '">' +
          '<span class="zlab">' + esc(l.split('/').slice(1).join('/')) + '</span>' + bar(r.mouse, 'mouse') + bar(r.human, 'human') + '</button>';
      });
      if (hidden > 0) h += '<p class="zmore">' + hidden + ' smaller ' + c + ' famil' + (hidden === 1 ? 'y' : 'ies') + ' under ' + MIN + '% of the genome in both species not shown.</p>';
      h += '</div>';
    });
    box.innerHTML = h;
    renderPanel();
  }

  function subTable(f, sp) {
    if (!f) return '<p class="muted">The ' + sp + ' table has no family with this label.</p>';
    var rows = f.top.map(function (t, i) {
      return '<tr class="' + (i >= 8 ? 'extra' : '') + '"><td>' + esc(t[0]) + (t[5] ? ' <span class="mk" title="new insertions documented">●</span>' : '') + '</td><td class="r">' + t[1].toLocaleString('en-US') +
        '</td><td class="r">' + t[3].toLocaleString('en-US') + '</td><td class="r">' + (t[2] ? Math.round(100 * t[4] / t[2]) : 0) + '%</td></tr>';
    });
    var extra = rows.length > 8 ? '<details class="more"><summary>' + (rows.length - 8) + ' more marked subfamilies</summary><div class="tw"><table class="cmp"><tbody>' + rows.slice(8).join('') + '</tbody></table></div></details>' : '';
    var keys = {};
    if (f.marker) keys[f.marker] = 1;
    f.top.forEach(function (t) { if (t[5]) keys[t[5]] = 1; });
    var notes = Object.keys(keys).map(function (k) { return '<li><span class="mk">●</span> ' + esc(MARK[k]) + '</li>'; }).join('');
    return '<p class="muted">' + f.nsub + ' subfamilies; ' + fmt(pct(f.bp, sp)) + '% of the genome, ' + fmt(pct(f.ybp, sp)) + '% in young copies. Most young bases first:</p>' +
      '<div class="tw"><table class="cmp"><thead><tr><th>Subfamily</th><th class="r">Copies</th><th class="r">Young copies</th><th class="r">Young bases</th></tr></thead><tbody>' + rows.slice(0, 8).join('') + '</tbody></table></div>' + extra +
      (notes ? '<ul class="marks">' + notes + '</ul>' : '');
  }

  function renderPanel() {
    var r = byLabel[S.pick];
    if (!r) { panel.innerHTML = ''; return; }
    panel.innerHTML = '<h3>' + esc(S.pick) + '</h3><div class="zcols"><div><h4>Mouse</h4>' + subTable(r.mouse, 'mouse') + '</div><div><h4>Human</h4>' + subTable(r.human, 'human') + '</div></div>';
  }

  box.addEventListener('click', function (ev) {
    var b = ev.target.closest('.zrow');
    if (b) { S.pick = b.getAttribute('data-label'); draw(); panel.scrollIntoView({ block: 'nearest' }); }
  });
  var st = stats();
  document.querySelectorAll('[data-stat]').forEach(function (el) {
    var k = el.getAttribute('data-stat').split('.');
    el.textContent = fmt(st[k[0]][k[1]]) + '%';
  });
  window.Zoos = {
    state: function () { return { pick: S.pick }; },
    pick: function (l) { if (byLabel[l]) { S.pick = l; draw(); } },
    stats: stats
  };
  draw();
})();
