// Repeat After Me: navigation shared by every lesson page. Needs site.css.
// Adds a side menu (this page's sections and the list of lessons) and previous/next lesson links.
// The lesson order lives here once, in the order of the home-page lesson cards; add new lessons to LESSONS.
// Each lesson section needs <section id="..."> with an <h2> to appear in the menu.
(function () {
  'use strict';
  var LESSONS = [
    { href: 'names.html', title: 'Three names' },
    { href: 'ltr.html', title: 'Body and ends' },
    { href: 'copying.html', title: 'How copies are made' },
    { href: 'zoos.html', title: 'Two zoos' },
    { href: 'strains.html', title: 'Not in the reference' },
    { href: 'multimap.html', title: 'One read, many places' },
    { href: 'tools.html', title: 'Counting tools' },
    { href: 'copies.html', title: 'Which copies' },
    { href: 'units.html', title: 'Rows or subfamilies' },
    { href: 'passenger.html', title: 'Passenger or driver' },
    { href: 'checklist.html', title: 'Before you show it' }
  ];
  var here = location.pathname.split('/').pop() || 'index.html';
  var idx = -1;
  LESSONS.forEach(function (l, i) { if (l.href === here) idx = i; });
  var header = document.querySelector('header.lesson');
  if (idx < 0 || !header) return;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // Side menu
  var heads = Array.prototype.slice.call(document.querySelectorAll('section[id] > h2'));
  var aside = document.createElement('aside');
  aside.className = 'lnav';
  aside.setAttribute('aria-label', 'Lesson menu');
  aside.innerHTML = '<details><summary>Contents</summary><div class="lnav-body">' +
    '<p class="lnav-h">On this page</p><ol class="lnav-secs">' +
    heads.map(function (h) { return '<li><a href="#' + esc(h.parentNode.id) + '">' + esc(h.textContent) + '</a></li>'; }).join('') +
    '</ol><p class="lnav-h">Lessons</p><ol class="lnav-lessons">' +
    LESSONS.map(function (l, i) { return '<li><a href="' + l.href + '"' + (i === idx ? ' aria-current="page"' : '') + '>' + esc(l.title) + '</a></li>'; }).join('') +
    '</ol></div></details>';
  header.parentNode.insertBefore(aside, header.nextSibling);
  var details = aside.querySelector('details');
  var wide = window.matchMedia('(min-width: 1280px)');
  var fit = function () { details.open = wide.matches; };
  fit();
  if (wide.addEventListener) wide.addEventListener('change', fit); else wide.addListener(fit);
  aside.querySelectorAll('.lnav-secs a').forEach(function (a) {
    a.addEventListener('click', function () { if (!wide.matches) details.open = false; });
  });

  // Mark the section being read
  if ('IntersectionObserver' in window) {
    var links = {};
    aside.querySelectorAll('.lnav-secs a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && links[e.target.id]) {
          Object.keys(links).forEach(function (k) { links[k].classList.toggle('on', k === e.target.id); });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach(function (h) { io.observe(h.parentNode); });
  }

  // Previous and next lesson
  var prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
  var pager = document.createElement('nav');
  pager.className = 'lpager';
  pager.setAttribute('aria-label', 'Previous and next lesson');
  pager.innerHTML =
    (prev ? '<a class="prev" rel="prev" href="' + prev.href + '"><span>Previous lesson</span><b>' + esc(prev.title) + '</b></a>' : '') +
    (next ? '<a class="next" rel="next" href="' + next.href + '"><span>Next lesson</span><b>' + esc(next.title) + '</b></a>'
          : '<a class="next" href="./#lessons"><span>Last lesson so far</span><b>All lessons</b></a>');
  var footer = document.querySelector('footer');
  (footer ? footer.parentNode : document.body).insertBefore(pager, footer);

  window.LessonNav = { lessons: LESSONS.slice(), index: idx };
})();
