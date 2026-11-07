// Repeat After Me, "Counting tools": the table of real tool runs on simulated reads.
// Numbers come only from data/tools_bench.js (built by prep/q10/build_bench_json.py from the benchmark tables).
// Test hooks: window.Bench.state(), window.Bench.value(rule) -> [counted %, wrong-copy % or null].
(function () {
  'use strict';
  var D = window.TOOLS_BENCH, box = document.getElementById('benchtable');
  if (!D || !box) return;
  var S = { sp: 'mouse', sc: 'all', bin: 'young' };
  var fmt = function (v) { return v.toFixed(1) + '%'; };

  function draw() {
    var s = D.species[S.sp].scenarios[S.sc], vals = s.values[S.bin], b = s.bins[S.bin];
    var h = '<thead><tr><th>Rule</th><th class="r">Reads counted</th><th class="r">On a wrong copy</th></tr></thead><tbody>';
    D.rules.forEach(function (r) {
      var v = vals[r.key];
      var wrong = v[1] === null ? (r.key === 'TEcount_multi' ? 'no copies' : 'counts reads twice') : fmt(v[1]);
      h += '<tr data-rule="' + r.key + '"><td>' + r.label + '</td><td class="r' + (v[0] > 100.05 ? ' bad' : '') + '">' + fmt(v[0]) +
        '</td><td class="r' + (v[1] === null ? ' na' : '') + '">' + wrong + '</td></tr>';
    });
    box.innerHTML = h + '</tbody>';
    document.getElementById('benchnote').textContent = (S.sp === 'mouse' ? 'Mouse (mm10): ' : 'Human (hg38): ') + b.subfamilies.toLocaleString('en-US') + ' subfamilies, ' +
      b.reads.toLocaleString('en-US') + ' reads cut from ' + (S.sc === 'all' ? 'every copy of each' : 'three copies of each') + '.';
    document.querySelectorAll('[data-bsp]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-bsp') === S.sp)); x.hidden = !D.species[x.getAttribute('data-bsp')]; });
    document.querySelectorAll('[data-bsc]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-bsc') === S.sc)); });
    document.querySelectorAll('[data-bbin]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-bbin') === S.bin)); });
  }
  document.querySelectorAll('[data-bsp]').forEach(function (x) { x.addEventListener('click', function () { if (D.species[x.getAttribute('data-bsp')]) { S.sp = x.getAttribute('data-bsp'); draw(); } }); });
  document.querySelectorAll('[data-bsc]').forEach(function (x) { x.addEventListener('click', function () { S.sc = x.getAttribute('data-bsc'); draw(); }); });
  document.querySelectorAll('[data-bbin]').forEach(function (x) { x.addEventListener('click', function () { S.bin = x.getAttribute('data-bbin'); draw(); }); });
  window.Bench = {
    state: function () { return { sp: S.sp, sc: S.sc, bin: S.bin }; },
    value: function (k) { return D.species[S.sp].scenarios[S.sc].values[S.bin][k]; }
  };
  draw();
})();
