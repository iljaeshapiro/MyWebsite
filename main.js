/* ════════════════════════════════════════════════════════════════════════════
   SWISS EDITORIAL GRID · behaviour
   Ilja Shapiro · v3
   Vanilla, no dependencies. Motion is metronomic: it snaps, it never springs.
   The mode is already applied before first paint by the inline <head> script;
   this file only flips it from here on and keeps the button in sync.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var root = document.documentElement;
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');


  /* ── 1. MODE TOGGLE — light / dark ──────────────────────────────────────── */
  /* The logo is the switch: its mark shows the mode, its label says what a click
     will do. A stored choice always wins. Until the visitor makes one, the
     operating system decides, and keeps deciding while the page is open. */

  var toggle = document.getElementById('mode-toggle');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function storedMode() {
    var m = null;
    try { m = localStorage.getItem('ilja-mode'); } catch (e) {}
    return (m === 'light' || m === 'dark') ? m : null;
  }

  function applyMode(mode) {
    var next = mode === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-mode', mode);
    toggle.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    /* the visible wordmark leads the name, so "click Ilja Shapiro" still works */
    toggle.setAttribute('aria-label', 'Ilja Shapiro — switch to ' + next + ' mode');
    toggle.setAttribute('title', 'Switch to ' + next + ' mode');
  }

  /* resolve and stamp the mode the page is actually painted in, and sync the button */
  applyMode(storedMode() || (darkQuery.matches ? 'dark' : 'light'));

  toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
    applyMode(next);
    try { localStorage.setItem('ilja-mode', next); } catch (e) {}
  });

  darkQuery.addEventListener('change', function (event) {
    if (storedMode()) return;                   /* an explicit choice outranks the OS */
    applyMode(event.matches ? 'dark' : 'light');
  });


  /* ── 1a. HERO ARTWORK — it trails the page rather than matching it ──────── */

  var heroBg = document.querySelector('.hero__bg');
  var heroTicking = false;

  function moveHero() {
    heroTicking = false;
    heroBg.style.transform = 'translate3d(0,' + (window.scrollY * 0.35) + 'px,0)';
  }

  window.addEventListener('scroll', function () {
    if (heroTicking || motionQuery.matches) return;
    heroTicking = true;
    requestAnimationFrame(moveHero);
  }, { passive: true });


  /* ── 2. SCROLL-SPY NAV — five links ─────────────────────────────────────── */
  /* The navbar lists Research record before About me, but on the page About me
     comes first. So the observed list is sorted into document order — otherwise
     "the first section in view wins" below would read the wrong one as active. */

  var navLinks = {};
  var sections = [];

  Array.prototype.forEach.call(document.querySelectorAll('.nav__link'), function (link) {
    var id = link.getAttribute('href').slice(1);
    var section = document.getElementById(id);
    if (!section) return;
    navLinks[id] = link;
    sections.push(section);
  });

  sections.sort(function (a, b) {
    return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
  });

  var inView = {};

  var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { inView[entry.target.id] = entry.isIntersecting; });

    var active = null;
    sections.forEach(function (section) {
      if (!active && inView[section.id]) active = section.id;
    });
    sections.forEach(function (section) {
      if (section.id === active) navLinks[section.id].setAttribute('aria-current', 'true');
      else navLinks[section.id].removeAttribute('aria-current');
    });
  }, { rootMargin: '-45% 0px -45% 0px' });

  sections.forEach(function (section) { navObserver.observe(section); });


  /* ── 3. STRIP ICON → SUBJECT DROPDOWN ───────────────────────────────────── */
  /* All six subjects live in the markup; exactly one is ever visible. The panel
     animates its own height around the one on show, so opening a longer subject
     grows it and a shorter one shrinks it. The icons select — they never toggle
     shut, so the last icon clicked is always the one displayed. */

  var icons = document.querySelectorAll('.icon');
  var panel = document.getElementById('subject-panel');

  function openSubject(id) {
    var from = panel.offsetHeight;

    Array.prototype.forEach.call(icons, function (icon) {
      var article = document.getElementById(icon.dataset.target);
      var isOpen = icon.dataset.target === id;

      if (isOpen) icon.setAttribute('aria-current', 'true');
      else icon.removeAttribute('aria-current');
      if (!article) return;

      article.hidden = !isOpen;
      article.classList.toggle('is-open', isOpen);
    });

    if (motionQuery.matches) return;

    var to = panel.scrollHeight;
    if (from === to) return;

    panel.style.height = from + 'px';
    requestAnimationFrame(function () { panel.style.height = to + 'px'; });
    panel.addEventListener('transitionend', function () {
      panel.style.height = '';                  /* hand the height back to the content */
    }, { once: true });
  }

  Array.prototype.forEach.call(icons, function (icon) {
    icon.addEventListener('click', function () {
      if (icon.hasAttribute('aria-current')) return;      /* already showing */
      openSubject(icon.dataset.target);
    });
  });


  /* ── 4. PENDING LINKS — announced disabled, so behave disabled ──────────── */

  document.addEventListener('click', function (event) {
    var dead = event.target.closest('a[aria-disabled="true"]');
    if (dead) event.preventDefault();
  });


  /* ── 5. REVEAL ON SCROLL ────────────────────────────────────────────────── */
  /* .reveal fades a block in; .beat sweeps a section's accent register along
     the grid (dark only — in light the register is simply already there).
     The strip icons carry no .reveal — they must stay flush along their top edge. */

  var reveals = document.querySelectorAll('.reveal, .beat');

  if (motionQuery.matches) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    Array.prototype.forEach.call(reveals, function (el) { revealObserver.observe(el); });
  }

})();
