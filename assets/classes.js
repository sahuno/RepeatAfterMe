/* Repeat After Me: the four-class stage.
   One stage, four modes. Each mode animates how that class of repeat copies itself.
   Vanilla JS, no dependencies. Needs classes.css and the <figure id="stage"> markup from index.html.
   Test hooks: ?class=LTR&step=3&seed=1 renders that step with no animation; ?n=8 pre-runs eight actions;
   ?tools=1 (SINE) and ?today=1 (DNA) preset the switches; ?act=recombine with step runs the LTR Recombine scene.
   window.RepeatStage exposes copy(), recombine(), many(n), reset(), setMode(), setInstant(), setTools(), setToday(), state(). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var fig = document.getElementById('stage');
  if (!fig) return;
  var svg = fig.querySelector('.stage-svg');
  var capEl = fig.querySelector('.stage-caption');
  var cntEl = fig.querySelector('.stage-count');
  var actBtn = fig.querySelector('.stage-act');
  var x10Btn = fig.querySelector('.stage-x10');
  var resetBtn = fig.querySelector('.stage-reset');
  var secWrap = fig.querySelector('.stage-secondary');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-stage-tab]'));

  // Geometry in viewBox units
  var W = 800, H = 480, EH = 34, HOVER = 46, OUT_Y = 110;
  var ROWS = [296, 406];
  var X0 = 60, X1 = 700, RAIL0 = 40, TURN_X = 720;

  var CLS = {
    LINE: { w: 170, cap: 20, action: 'Copy', idle: 'This is a LINE. Press Copy.' },
    SINE: { w: 44, action: 'Copy', idle: 'This is a SINE. Press Copy.' },
    LTR: { w: 200, cap: 26, action: 'Copy', idle: 'This is an LTR element. Press Copy.' },
    DNA: { w: 140, action: 'Cut and paste', idle: 'This is a DNA transposon. Press Cut and paste.' }
  };

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var q = new URLSearchParams(location.search);
  var seed = Number(q.get('seed')) || Math.floor(Math.random() * 1e9);
  var rnd = mulberry32(seed);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var instant = reduced, speed = 1, busy = false;
  var mode = 'LINE';
  var stateBy = {};
  var S = null;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name), st = '';
    for (var k in attrs) {
      if (k === 'style') continue;
      var v = attrs[k];
      if ((k === 'fill' || k === 'stroke') && String(v).indexOf('var(') >= 0) st += k + ':' + v + ';';
      else e.setAttribute(k, v);
    }
    if (attrs.style) st += attrs.style;
    if (st) e.setAttribute('style', st);
    if (parent) parent.appendChild(e);
    return e;
  }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function tween(ms, fn) {
    return new Promise(function (res) {
      if (instant) { fn(1); res(); return; }
      var d = Math.max(1, ms / speed), t0 = performance.now();
      function step(now) { var p = Math.min(1, (now - t0) / d); fn(ease(p)); if (p < 1) requestAnimationFrame(step); else res(); }
      requestAnimationFrame(step);
    });
  }
  function hold(ms) { return instant ? Promise.resolve() : new Promise(function (r) { setTimeout(r, ms / speed); }); }

  // ----- static scenery -----
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  var gBack = el('g', {}, svg), gItems = el('g', {}, svg), gActors = el('g', {}, svg);
  el('text', { x: 36, y: 44, 'class': 'region' }, gBack).textContent = 'outside';
  el('rect', { x: 16, y: 196, width: 768, height: 270, rx: 24, 'class': 'nucleus' }, gBack);
  el('text', { x: 36, y: 452, 'class': 'region' }, gBack).textContent = 'nucleus';
  ROWS.forEach(function (y) {
    el('line', { x1: RAIL0, y1: y - 8, x2: TURN_X, y2: y - 8, 'class': 'rail' }, gBack);
    el('line', { x1: RAIL0, y1: y + 8, x2: TURN_X, y2: y + 8, 'class': 'rail' }, gBack);
  });
  el('path', { d: 'M' + TURN_X + ' ' + (ROWS[0] - 8) + ' A63 63 0 0 1 ' + TURN_X + ' ' + (ROWS[1] + 8), 'class': 'rail' }, gBack);
  el('path', { d: 'M' + TURN_X + ' ' + (ROWS[0] + 8) + ' A47 47 0 0 1 ' + TURN_X + ' ' + (ROWS[1] - 8), 'class': 'rail' }, gBack);

  // ----- elements on the DNA -----
  function label(g, x, t) { el('text', { x: x, y: -10, 'text-anchor': 'middle', 'class': 'lbl' }, g).textContent = t; }
  function drawItem(it, parent) {
    var g = el('g', { 'class': 'item' }, parent), c = it.cls, w = it.w;
    if (c === 'LINE') {
      el('rect', { x: 0, y: 0, width: w, height: EH, rx: 5, fill: 'var(--LINE)' }, g);
      if (it.kind !== 'short') el('rect', { x: 0, y: 0, width: CLS.LINE.cap, height: EH, rx: 5, fill: 'var(--LINE-d)' }, g);
      el('rect', { x: w - 9, y: 9, width: 5, height: EH - 18, rx: 2, fill: 'var(--surface)', opacity: 0.8 }, g);
      if (it.kind === 'orig') { label(g, 10, 'head'); label(g, w - 8, 'tail'); }
    } else if (c === 'SINE') {
      el('rect', { x: 0, y: 0, width: w, height: EH, rx: 5, fill: 'var(--SINE)' }, g);
      if (it.kind === 'orig') label(g, w / 2, 'short');
    } else if (c === 'LTR') {
      var cap = CLS.LTR.cap;
      if (it.kind === 'solo') { el('rect', { x: 0, y: 0, width: cap, height: EH, rx: 5, fill: 'var(--LTR-d)' }, g); }
      else {
        el('rect', { x: 0, y: 0, width: w, height: EH, rx: 5, fill: 'var(--LTR)', opacity: 0.55 }, g);
        el('rect', { x: 0, y: 0, width: cap, height: EH, rx: 5, fill: 'var(--LTR-d)' }, g);
        el('rect', { x: w - cap, y: 0, width: cap, height: EH, rx: 5, fill: 'var(--LTR-d)' }, g);
        if (it.kind === 'orig') { label(g, cap / 2, 'end'); label(g, w / 2, 'body'); label(g, w - cap / 2, 'end'); }
      }
    } else if (c === 'DNA') {
      el('rect', { x: 0, y: 0, width: w, height: EH, rx: 5, fill: 'var(--DNA)' }, g);
      var gx = w / 2 - 30;
      el('rect', { x: gx, y: 8, width: 60, height: EH - 16, rx: 3, fill: 'var(--DNA-l)', opacity: S.today ? 0.45 : 1 }, g);
      if (S.today) el('path', { d: 'M' + (gx + 24) + ' 6 l6 8 l-8 6 l9 8', fill: 'none', stroke: 'var(--DNA-d)', 'stroke-width': 3 }, g);
      if (it.kind === 'orig') label(g, w / 2, 'cutter');
    }
    return g;
  }
  function place(g, x, row) { g.setAttribute('transform', 'translate(' + x + ' ' + (ROWS[row] - EH / 2) + ')'); }
  function render() {
    while (gItems.firstChild) gItems.removeChild(gItems.firstChild);
    S.items.forEach(function (it) { place(drawItem(it, gItems), it.x, it.row); });
    countLine();
  }
  function countLine() {
    var c = S.counts, t;
    if (mode === 'LINE') t = 'Copies: ' + c.copies + '. Full length: ' + c.full + '. Stopped early: ' + c.short + '.';
    else if (mode === 'SINE') t = 'Copies: ' + c.copies + '. Lost: ' + c.lost + '.';
    else if (mode === 'LTR') t = 'Copies: ' + c.copies + '. Solo LTRs: ' + c.solo + '.';
    else t = (c.failed ? 'Tries: ' + c.failed + '. ' : '') + 'Moves: ' + c.moves + '. Copies: 1.';
    cntEl.textContent = t;
  }
  function caption(t) { capEl.textContent = t; }

  // A free stretch of DNA at least w wide. Row 0 fills before row 1.
  function findSite(w, minX) {
    var pad = 10, options = [];
    ROWS.forEach(function (_, r) {
      var occ = S.items.filter(function (i) { return i.row === r; }).map(function (i) { return [i.x - pad, i.x + i.w + pad]; }).sort(function (a, b) { return a[0] - b[0]; });
      var cur = Math.max(X0, minX || X0);
      occ.forEach(function (iv) { if (iv[0] - cur >= w) options.push({ row: r, lo: cur, hi: iv[0] - w }); cur = Math.max(cur, iv[1]); });
      if (X1 - cur >= w) options.push({ row: r, lo: cur, hi: X1 - w });
    });
    if (!options.length) return null;
    var r0 = options.filter(function (o) { return o.row === 0; }), pool = r0.length ? r0 : options;
    var o = pool[Math.floor(rnd() * pool.length)];
    return { row: o.row, x: Math.round(o.lo + rnd() * Math.min(o.hi - o.lo, 50)) };
  }

  // ----- moving parts -----
  function wave(len) {
    var d = 'M0 0';
    for (var i = 6; i <= len; i += 6) d += ' L' + i + ' ' + (5 * Math.sin(i / 9)).toFixed(1);
    if (len % 6) d += ' L' + len.toFixed(1) + ' ' + (5 * Math.sin(len / 9)).toFixed(1);
    return d;
  }
  function actor() {
    var g = el('g', { 'class': 'actor' }, gActors);
    var A = {
      g: g, x: 0, y: 0,
      at: function (x, y) { A.x = x; A.y = y; g.setAttribute('transform', 'translate(' + x + ' ' + y + ')'); },
      moveTo: function (x, y, ms) { var x0 = A.x, y0 = A.y; return tween(ms, function (p) { A.at(lerp(x0, x, p), lerp(y0, y, p)); }); },
      rna: function (cls, len) {
        var p = el('path', { 'class': 'rna', stroke: 'var(--' + cls + ')' }, g);
        var o = { el: p, len: 0, setLen: function (l) { o.len = l; p.setAttribute('d', wave(l)); } };
        o.setLen(len); return o;
      },
      tools: function (len, opt) {
        opt = opt || {};
        var tg = el('g', { 'class': 'tools', opacity: 0 }, g);
        var st = opt.fill ? 'fill:' + opt.fill + ';' : '';
        if (opt.beads !== false) [0.25, 0.45, 0.65].forEach(function (f) { el('circle', { cx: len * f, cy: 0, r: 5, 'class': 'tool', style: st }, tg); });
        el('rect', { x: len - 8, y: -9, width: 26, height: 18, rx: 6, 'class': 'tool', style: st }, tg);
        el('path', { d: 'M' + (len + 5) + ' 9 l-5 10 l10 0 z', 'class': 'tool', style: st }, tg);
        return { g: tg, appear: function (p) { tg.setAttribute('opacity', p); }, at: function (x, y) { tg.setAttribute('transform', 'translate(' + x + ' ' + y + ')'); } };
      },
      fade: function (op) { g.setAttribute('opacity', op); },
      remove: function () { if (g.parentNode) g.parentNode.removeChild(g); }
    };
    return A;
  }
  function spark(x, y) {
    var c = el('circle', { cx: x, cy: y, r: 2, 'class': 'spark' }, gActors);
    return tween(450, function (p) { c.setAttribute('r', 2 + 20 * p); c.setAttribute('opacity', 1 - p); }).then(function () { c.parentNode && c.parentNode.removeChild(c); });
  }
  function makeCutter(parent, cx, cy, broken) {
    var g = el('g', { opacity: 0, transform: 'translate(' + cx + ' ' + cy + ')' }, parent);
    var l = el('rect', { x: -28, y: -8, width: 24, height: 16, rx: 6, 'class': 'tool', transform: 'rotate(-18 -4 0)' }, g);
    var r = el('rect', { x: 4, y: -8, width: 24, height: 16, rx: 6, 'class': 'tool', transform: 'rotate(18 4 0)' }, g);
    el('circle', { cx: 0, cy: 0, r: 7, 'class': 'tool' }, g);
    if (broken) el('path', { d: 'M-3 -9 l4 6 l-5 4 l5 7', fill: 'none', stroke: 'var(--surface)', 'stroke-width': 2.5 }, g);
    return { g: g, l: l, r: r };
  }
  function growCopy(site, w, colour, ms) {
    var tmp = el('rect', { x: site.x + w, y: ROWS[site.row] - EH / 2, width: 0, height: EH, rx: 5, fill: colour }, gItems);
    return tween(ms, function (p) { tmp.setAttribute('x', site.x + w - w * p); tmp.setAttribute('width', w * p); });
  }
  function blocked(text) { var s = [{ text: text, run: function () { return Promise.resolve(); } }]; s.blocked = true; return s; }
  var NO_ROOM = 'No room left. Press Reset to start again.';

  // ----- scenes -----
  function sceneLINE() {
    var src = S.items.filter(function (i) { return i.kind === 'orig'; })[0];
    var f = rnd() < 0.22 ? 1 : 0.1 + 0.45 * rnd();
    var w = Math.round(CLS.LINE.w * f);
    var site = findSite(w, 30 + CLS.LINE.w - w);
    if (!site) return blocked(NO_ROOM);
    var A = actor(), rna, tools, sx = src.x, sy = ROWS[src.row], hov = ROWS[site.row] - EH / 2 - HOVER;
    return [
      { text: 'The cell reads the element into an RNA copy.', run: function () { A.at(sx, sy - EH / 2 - 12); rna = A.rna('LINE', 0); return tween(900, function (p) { rna.setLen(src.w * p); }); } },
      { text: 'The RNA copy leaves the nucleus.', run: function () { return A.moveTo(sx + 40, OUT_Y, 900); } },
      { text: 'It makes its own tools, and they grab on.', run: function () { tools = A.tools(src.w); return tween(700, function (p) { tools.appear(p); }); } },
      { text: 'They carry it back in and pick a spot.', run: function () { return A.moveTo(site.x + w - src.w, hov, 1000); } },
      { text: 'The tool nicks the DNA.', run: function () { return spark(site.x + w, ROWS[site.row]); } },
      { text: 'It writes the copy from the tail end, backwards.', run: function () { return growCopy(site, w, 'var(--LINE)', 1100); } },
      { text: f >= 1 ? 'Full length, head and all. A copy like this can copy itself again.' : 'Stopped early. No head, so this copy can never copy itself.',
        run: function () { return tween(500, function (p) { A.fade(1 - p); }).then(function () { A.remove(); S.items.push({ cls: 'LINE', kind: f >= 1 ? 'full' : 'short', row: site.row, x: site.x, w: w }); S.counts.copies++; if (f >= 1) S.counts.full++; else S.counts.short++; render(); }); } }
    ];
  }

  function sceneSINE() {
    var src = S.items.filter(function (i) { return i.kind === 'orig'; })[0], w = CLS.SINE.w;
    var site = S.toolsNearby ? findSite(w) : null;
    if (S.toolsNearby && !site) return blocked(NO_ROOM);
    var A = actor(), rna, tools, sx = src.x, sy = ROWS[src.row];
    var steps = [
      { text: 'The cell reads it into an RNA copy.', run: function () { A.at(sx, sy - EH / 2 - 12); rna = A.rna('SINE', 0); return tween(600, function (p) { rna.setLen(w * p); }); } },
      { text: 'The RNA leaves the nucleus.', run: function () { return A.moveTo(sx + 60, OUT_Y, 900); } }
    ];
    if (!S.toolsNearby) {
      steps.push({ text: 'It has no tools of its own.', run: function () { return hold(700); } });
      steps.push({ text: 'Nothing happens. The copy is lost. Switch on LINE tools and try again.', run: function () { return tween(900, function (p) { A.fade(1 - p); }).then(function () { A.remove(); S.counts.lost++; render(); }); } });
      return steps;
    }
    var hov = ROWS[site.row] - EH / 2 - HOVER;
    steps.push({ text: "It borrows LINE's tools.", run: function () { tools = A.tools(w, { beads: false, fill: 'var(--LINE)' }); tools.appear(1); return tween(900, function (p) { tools.at(lerp(-360, 0, p), lerp(60, 0, p)); }); } });
    steps.push({ text: 'They carry it back in and pick a spot.', run: function () { return A.moveTo(site.x, hov, 900); } });
    steps.push({ text: 'The tool nicks the DNA.', run: function () { return spark(site.x + w, ROWS[site.row]); } });
    steps.push({ text: 'Short, so the copy is written quickly.', run: function () { return growCopy(site, w, 'var(--SINE)', 500); } });
    steps.push({ text: 'A new short copy.', run: function () { return tween(400, function (p) { A.fade(1 - p); }).then(function () { A.remove(); S.items.push({ cls: 'SINE', kind: 'sine', row: site.row, x: site.x, w: w }); S.counts.copies++; render(); }); } });
    return steps;
  }

  function sceneLTR() {
    var src = null;
    for (var i = S.items.length - 1; i >= 0; i--) if (S.items[i].cls === 'LTR' && S.items[i].kind !== 'solo') { src = S.items[i]; break; }
    if (!src) return blocked('Only solo LTRs are left, and a solo LTR has no body to copy. Press Reset to start again.');
    var w = CLS.LTR.w, cap = CLS.LTR.cap;
    var site = findSite(w);
    if (!site) return blocked(NO_ROOM);
    var A = actor(), rna, bubble, bar, sx = src.x, sy = ROWS[src.row], hov = ROWS[site.row] - EH / 2 - HOVER;
    return [
      { text: 'The left end starts the reading.', run: function () { A.at(sx, sy - EH / 2 - 12); rna = A.rna('LTR', 0); return tween(900, function (p) { rna.setLen(w * p); }); } },
      { text: 'The RNA leaves the nucleus.', run: function () { return A.moveTo(sx + 20, OUT_Y, 900); } },
      { text: 'Packed into a virus-like particle, the RNA is turned back into DNA, with an end on each side.', run: function () {
        bubble = el('ellipse', { cx: w / 2, cy: 0, rx: 0, ry: 0, 'class': 'bubble', stroke: 'var(--LTR)' }, A.g);
        return tween(600, function (p) { bubble.setAttribute('rx', 122 * p); bubble.setAttribute('ry', 44 * p); }).then(function () {
          bar = el('g', { opacity: 0 }, A.g);
          el('rect', { x: 0, y: -7, width: w, height: 14, rx: 4, fill: 'var(--LTR)', opacity: 0.55 }, bar);
          el('rect', { x: 0, y: -7, width: cap, height: 14, rx: 4, fill: 'var(--LTR-d)' }, bar);
          el('rect', { x: w - cap, y: -7, width: cap, height: 14, rx: 4, fill: 'var(--LTR-d)' }, bar);
          return tween(700, function (p) { rna.el.setAttribute('opacity', 1 - p); bar.setAttribute('opacity', p); });
        });
      } },
      { text: 'The particle comes back in, and the new copy slots into the DNA.', run: function () {
        return A.moveTo(site.x, hov, 1000)
          .then(function () { return tween(400, function (p) { bubble.setAttribute('opacity', 1 - p); }); })
          .then(function () {
            var rects = Array.prototype.slice.call(bar.querySelectorAll('rect'));
            return tween(500, function (p) { A.at(site.x, lerp(hov, ROWS[site.row], p)); rects.forEach(function (r) { r.setAttribute('y', -7 - (EH / 2 - 7) * p); r.setAttribute('height', 14 + (EH - 14) * p); }); });
          })
          .then(function () { A.remove(); S.items.push({ cls: 'LTR', kind: 'full', row: site.row, x: site.x, w: w }); S.counts.copies++; render(); });
      } }
    ];
  }

  function sceneRecombine() {
    var idx = -1;
    for (var i = S.items.length - 1; i >= 0; i--) if (S.items[i].cls === 'LTR' && S.items[i].kind !== 'solo') { idx = i; break; }
    if (idx < 0) return blocked('No body left to drop. Press Copy first.');
    var it = S.items[idx], w = it.w, cap = CLS.LTR.cap, bw = w - 2 * cap;
    var A = actor(), left, right, body, loop;
    return [
      { text: 'The two ends line up and the body loops out.', run: function () {
        S.items.splice(idx, 1); render();
        A.at(it.x, ROWS[it.row] - EH / 2);
        loop = el('path', { 'class': 'loop', fill: 'var(--LTR)', stroke: 'var(--LTR)' }, A.g);
        body = el('rect', { x: cap, y: 0, width: bw, height: EH, fill: 'var(--LTR)', opacity: 0.55 }, A.g);
        left = el('rect', { x: 0, y: 0, width: cap, height: EH, rx: 5, fill: 'var(--LTR-d)' }, A.g);
        right = el('rect', { x: w - cap, y: 0, width: cap, height: EH, rx: 5, fill: 'var(--LTR-d)' }, A.g);
        return tween(1400, function (p) {
          var b = bw * (1 - p);
          body.setAttribute('width', b); right.setAttribute('x', cap + b);
          loop.setAttribute('d', 'M' + cap + ' 0 C ' + (cap - 50 * p) + ' ' + (-150 * p) + ' ' + (cap + b + 50 * p) + ' ' + (-150 * p) + ' ' + (cap + b) + ' 0 Z');
        });
      } },
      { text: 'The body drops out.', run: function () { return tween(700, function (p) { loop.setAttribute('transform', 'translate(0 ' + (-60 * p) + ')'); loop.setAttribute('opacity', 1 - p); }); } },
      { text: 'One end remains: a solo LTR.', run: function () { A.remove(); S.items.push({ cls: 'LTR', kind: 'solo', row: it.row, x: it.x, w: cap }); S.counts.solo++; render(); return Promise.resolve(); } }
    ];
  }

  function sceneDNA() {
    var src = S.items.filter(function (i) { return i.cls === 'DNA'; })[0], w = CLS.DNA.w;
    var site = S.today ? null : findSite(w);
    if (!S.today && !site) return blocked(NO_ROOM);
    var A = actor(), rna, cutter, moving, sx = src.x, sy = ROWS[src.row];
    var steps = [
      { text: S.today ? 'The cell tries to read the cutter gene.' : 'The cell reads the cutter gene into RNA.', run: function () { A.at(sx, sy - EH / 2 - 12); rna = A.rna('DNA', 0); return tween(700, function (p) { rna.setLen(w * p); }); } },
      { text: 'The RNA leaves the nucleus.', run: function () { return A.moveTo(sx + 30, OUT_Y, 900); } }
    ];
    if (S.today) {
      steps.push({ text: 'In mouse and human the cutter gene is broken. The cutter falls apart, and nothing moves anymore.', run: function () {
        cutter = makeCutter(A.g, w / 2, 0, true);
        return tween(500, function (p) { rna.el.setAttribute('opacity', 1 - p); cutter.g.setAttribute('opacity', p); })
          .then(function () { return tween(900, function (p) { cutter.l.setAttribute('transform', 'translate(' + (-34 * p) + ' ' + (44 * p) + ') rotate(' + (-18 - 40 * p) + ' -4 0)'); cutter.r.setAttribute('transform', 'translate(' + (34 * p) + ' ' + (44 * p) + ') rotate(' + (18 + 40 * p) + ' 4 0)'); cutter.g.setAttribute('opacity', 1 - p); }); })
          .then(function () { A.remove(); S.counts.failed++; countLine(); });
      } });
      return steps;
    }
    var hov = ROWS[site.row] - EH / 2 - HOVER;
    steps.push({ text: 'Outside, the RNA becomes a cutter.', run: function () { cutter = makeCutter(A.g, w / 2, 0, false); return tween(600, function (p) { rna.el.setAttribute('opacity', 1 - p); cutter.g.setAttribute('opacity', p); }); } });
    steps.push({ text: 'The cutter comes back to the element.', run: function () { return A.moveTo(sx, sy - EH / 2 - HOVER, 900).then(function () { return A.moveTo(sx, sy - EH / 2 - 26, 400); }); } });
    steps.push({ text: 'The cutter lifts the whole element out.', run: function () {
      S.items.splice(S.items.indexOf(src), 1); render();
      moving = el('g', { transform: 'translate(0 26)' }, A.g);
      drawItem({ cls: 'DNA', kind: 'moving', w: w }, moving);
      return A.moveTo(sx, sy - EH / 2 - HOVER + 6, 700);
    } });
    steps.push({ text: 'It pastes it in somewhere else.', run: function () { return A.moveTo(site.x, hov + 6, 1000).then(function () { return A.moveTo(site.x, ROWS[site.row] - EH / 2 - 26, 500); }); } });
    steps.push({ text: 'Moved, not copied. Still one.', run: function () { A.remove(); S.items.push({ cls: 'DNA', kind: 'orig', row: site.row, x: site.x, w: w }); S.counts.moves++; render(); return Promise.resolve(); } });
    return steps;
  }

  function scene() { return mode === 'LINE' ? sceneLINE() : mode === 'SINE' ? sceneSINE() : mode === 'LTR' ? sceneLTR() : sceneDNA(); }

  // ----- running -----
  function play(steps, upTo) {
    var n = Math.min(steps.length, upTo == null ? steps.length : upTo), i = 0;
    return new Promise(function (done) {
      (function next() {
        if (i >= n) { done(steps); return; }
        var s = steps[i++];
        caption(s.text);
        Promise.resolve(s.run()).then(function () { return (!instant && i < n) ? hold(250) : null; }).then(next);
      })();
    });
  }
  function setDisabled(d) {
    [actBtn, x10Btn, resetBtn].concat(tabs, Array.prototype.slice.call(secWrap.querySelectorAll('button,input'))).forEach(function (b) { b.disabled = d; });
  }
  function run(build) {
    if (busy) return Promise.resolve();
    busy = true; setDisabled(true);
    return play(build()).then(function () { busy = false; setDisabled(false); }, function (e) { busy = false; setDisabled(false); throw e; });
  }
  function many(n) {
    if (busy) return Promise.resolve();
    busy = true; setDisabled(true); speed = 5;
    var i = 0;
    return new Promise(function (done) {
      (function next() {
        if (i++ >= n) { done(); return; }
        var s = scene();
        play(s).then(function () { if (s.blocked) done(); else next(); });
      })();
    }).then(function () { speed = 1; busy = false; setDisabled(false); });
  }

  function initState(m) {
    return { items: [{ cls: m, kind: 'orig', row: 0, x: 80, w: CLS[m].w }], counts: { copies: 0, full: 0, short: 0, lost: 0, solo: 0, moves: 0, failed: 0 }, toolsNearby: false, today: false };
  }
  function makeSwitch(text, on, cb) {
    var l = document.createElement('label'); l.className = 'switch';
    var i = document.createElement('input'); i.type = 'checkbox'; i.checked = on;
    i.addEventListener('change', function () { cb(i.checked); });
    l.appendChild(i); l.appendChild(document.createTextNode(text));
    return l;
  }
  function secondary() {
    while (secWrap.firstChild) secWrap.removeChild(secWrap.firstChild);
    if (mode === 'SINE') secWrap.appendChild(makeSwitch('LINE tools nearby', S.toolsNearby, function (v) { S.toolsNearby = v; }));
    else if (mode === 'LTR') { var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Recombine'; b.addEventListener('click', function () { run(sceneRecombine); }); secWrap.appendChild(b); }
    else if (mode === 'DNA') secWrap.appendChild(makeSwitch('Today', S.today, function (v) { S.today = v; render(); }));
  }
  function setMode(m) {
    if (busy || !CLS[m]) return;
    mode = m;
    if (!stateBy[m]) stateBy[m] = initState(m);
    S = stateBy[m];
    fig.setAttribute('data-mode', m);
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-stage-tab') === m)); });
    actBtn.textContent = CLS[m].action;
    x10Btn.setAttribute('aria-label', CLS[m].action + ' ten times');
    secondary();
    while (gActors.firstChild) gActors.removeChild(gActors.firstChild);
    render();
    caption(CLS[m].idle);
  }
  function reset() { if (busy) return; stateBy[mode] = initState(mode); setMode(mode); }

  actBtn.addEventListener('click', function () { run(scene); });
  x10Btn.addEventListener('click', function () { many(10); });
  resetBtn.addEventListener('click', reset);
  tabs.forEach(function (t) { t.addEventListener('click', function () { setMode(t.getAttribute('data-stage-tab')); }); });

  // ----- start, and the still-frame hooks -----
  var m0 = (q.get('class') || 'LINE').toUpperCase();
  setMode(CLS[m0] ? m0 : 'LINE');
  if (q.get('tools') === '1') { S.toolsNearby = true; secondary(); }
  if (q.get('today') === '1') { S.today = true; secondary(); render(); }
  (function stills() {
    var n = Number(q.get('n')) || 0, step = q.get('step');
    if (!n && step == null) return;
    var was = instant; instant = true; busy = true;
    var i = 0;
    (function next() {
      if (i++ >= n) { finish(); return; }
      var s = scene();
      play(s).then(function () { if (s.blocked) finish(); else next(); });
    })();
    function finish() {
      var p = step == null ? Promise.resolve() : play(q.get('act') === 'recombine' ? sceneRecombine() : scene(), Number(step));
      p.then(function () { instant = was; busy = false; });
    }
  })();

  window.RepeatStage = {
    copy: function () { return run(scene); },
    recombine: function () { return run(sceneRecombine); },
    many: many, reset: reset, setMode: setMode,
    setInstant: function (v) { instant = !!v; },
    setTools: function (v) { S.toolsNearby = !!v; secondary(); },
    setToday: function (v) { S.today = !!v; secondary(); render(); },
    state: function () { return { mode: mode, seed: seed, items: S.items.map(function (i) { return { cls: i.cls, kind: i.kind, row: i.row, x: i.x, w: i.w }; }), counts: JSON.parse(JSON.stringify(S.counts)), caption: capEl.textContent, busy: busy }; }
  };
})();
