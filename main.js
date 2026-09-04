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
    toggle.setAttribute('aria-label', 'Switch to ' + next + ' mode');
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


  /* ── 1b. HERO REVEAL + POSITION ─────────────────────────────────────────── */
  /* The hero is on screen at load, so its .reveal elements fire immediately —
     no IntersectionObserver needed. Layer2 is pushed down by a plain margin
     (never a scale/zoom) so its own weight, plus the hoverbar hanging off its
     bottom edge, settles correctly once fonts and layout are final. */

  Array.prototype.forEach.call(document.querySelectorAll('#layer2 .reveal, #layer2 .beat'), function (el) {
    el.classList.add('is-in');
  });

  var hero = document.getElementById('layer2');

  function positionHero() {
    hero.style.marginTop = (hero.offsetHeight * 0.10) + 'px';
  }

  positionHero();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(positionHero);
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(positionHero, 150);
  });


  /* ── 2. PILL BAND — one tab visible at a time ───────────────────────────── */
  /* Nothing is open on load. A pill click highlights it immediately — before
     the crossfade even starts, so the active state never lags the click — then
     the outgoing tab fades out and the incoming one fades in. Re-clicking the
     open pill is a no-op. Only the very first tab opened per page load
     auto-scrolls into view; later switches don't. */

  var pills = document.querySelectorAll('.pill');
  var tabs = {};
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tab) {
    tabs[tab.id] = tab;
  });

  var currentTab = null;
  var hasAutoScrolled = false;
  var TAB_FADE_MS = 320;           /* keep in step with --step in styles.css */
  var SCROLL_MS = 500;

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function scrollNearestOverTime(el, duration) {
    var overflow = el.getBoundingClientRect().bottom - window.innerHeight;
    if (overflow <= 0) return;
    var from = window.scrollY;
    var to = from + overflow;
    var start = null;
    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      window.scrollTo(0, from + (to - from) * easeInOutQuad(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setActivePill(id) {
    Array.prototype.forEach.call(pills, function (pill) {
      if (pill.dataset.tab === id) pill.setAttribute('aria-current', 'true');
      else pill.removeAttribute('aria-current');
    });
  }

  function tabAfterFade(el, cb) {
    var fired = false;
    var done = function () {
      if (fired) return;
      fired = true;
      el.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
      cb();
    };
    var onEnd = function (e) {
      if (e.target === el && e.propertyName === 'opacity') done();
    };
    var timer = setTimeout(done, TAB_FADE_MS + 80);
    el.addEventListener('transitionend', onEnd);
  }

  function open(id) {
    var incoming = tabs[id];
    incoming.hidden = false;
    incoming.classList.add('is-entering');
    void incoming.getBoundingClientRect();
    incoming.classList.remove('is-entering');
    currentTab = id;

    Array.prototype.forEach.call(incoming.querySelectorAll('.reveal, .beat'), function (el) {
      el.classList.add('is-in');
    });

    if (!hasAutoScrolled) {
      hasAutoScrolled = true;
      if (!motionQuery.matches) {
        scrollNearestOverTime(incoming, SCROLL_MS);
      }
    }
  }

  function selectPill(pill) {
    var id = pill.dataset.tab;
    if (id === currentTab) return;          /* re-clicking the open pill is a no-op */
    setActivePill(id);                      /* highlight the new pill right away */

    if (!currentTab) { open(id); return; }

    var outgoing = tabs[currentTab];
    currentTab = null;

    if (motionQuery.matches) {
      outgoing.hidden = true;
      open(id);
      return;
    }
    outgoing.classList.add('is-leaving');
    tabAfterFade(outgoing, function () {
      outgoing.classList.remove('is-leaving');
      outgoing.hidden = true;
      open(id);
    });
  }

  Array.prototype.forEach.call(pills, function (pill) {
    pill.addEventListener('click', function () { selectPill(pill); });
  });


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


  /* ── 5. SOLUTIONS FAN — pick a bubble, hand off to its answer ─────────── */
  /* The fan opens on hover / :focus-within entirely in CSS (§9b). This swaps
     the answer panel with a 300ms fade-out / 300ms fade-in handoff: the
     outgoing panel is fully gone before the incoming one begins. It also
     retriggers the incoming panel's SVG animation and drives the .is-picked
     retract. Extended from prototypes/solutions_for_you_v4/main.js. */

  var menu = document.querySelector('.menu');

  if (menu) {
    var solTrigger = menu.querySelector('.trigger');
    var blobs = menu.querySelectorAll('.blob');

    var FADE_MS = 300;                 /* keep in step with .panel transition in styles.css §9b */

    var current = null;   /* the settled, visible panel */
    var leaving = null;   /* the panel currently fading out, if any */
    var wantId  = null;   /* id of the most recently clicked bubble — the incoming panel */

    /* an animation only replays if its class is removed and re-added with a
       reflow in between — otherwise the browser sees no change */
    var playPanel = function (panel) {
      var svg = panel.querySelector('.anim');
      if (!svg) return;
      svg.classList.remove('is-playing');
      void svg.getBoundingClientRect();
      svg.classList.add('is-playing');
    };

    /* run cb once the panel's own opacity transition ends, with a timeout guard
       for reduced motion / interrupted transitions where the event may not fire */
    var afterFade = function (el, cb) {
      var fired = false;
      var done = function () {
        if (fired) return;
        fired = true;
        el.removeEventListener('transitionend', onEnd);
        clearTimeout(timer);
        cb();
      };
      var onEnd = function (e) {
        if (e.target === el && e.propertyName === 'opacity') done();
      };
      var timer = setTimeout(done, FADE_MS + 80);
      el.addEventListener('transitionend', onEnd);
    };

    var enter = function (panel) {
      panel.hidden = false;
      panel.classList.add('is-entering');    /* opacity 0 */
      void panel.getBoundingClientRect();     /* reflow, so removing the class transitions */
      panel.classList.remove('is-entering');  /* -> opacity 1 over FADE_MS */
      playPanel(panel);
      current = panel;
    };

    /* the incoming panel is always whichever bubble was clicked last */
    var bringInLatest = function () {
      var panel = wantId && document.getElementById(wantId);
      if (panel && panel !== current) enter(panel);
    };

    var beginLeave = function (panel) {
      leaving = panel;
      panel.classList.remove('is-entering');
      panel.classList.add('is-leaving');      /* opacity 1 -> 0 over FADE_MS */
      afterFade(panel, function () {
        panel.classList.remove('is-leaving');
        panel.hidden = true;
        if (leaving === panel) leaving = null;
        bringInLatest();
      });
    };

    var selectSolution = function (id) {
      wantId = id;
      var target = document.getElementById(id);
      if (!target || (target === current && !leaving)) return;

      var outgoing = current;
      current = null;

      if (outgoing && outgoing !== leaving) beginLeave(outgoing);
      else if (!leaving) bringInLatest();     /* nothing on screen — straight in */
      /* else: a leave is already running; its completion reads wantId */
    };

    Array.prototype.forEach.call(blobs, function (blob) {
      blob.addEventListener('click', function () {
        /* .is-picked retracts the fan even with the pointer still on this
           bubble — :hover would otherwise hold it open */
        menu.classList.add('is-picked');

        var id = blob.dataset.target;
        Array.prototype.forEach.call(blobs, function (b) {
          if (b.dataset.target === id) b.setAttribute('aria-current', 'true');
          else b.removeAttribute('aria-current');
        });

        selectSolution(id);
      });
    });

    /* retracted-and-waiting is undone only by returning to the trigger itself */
    solTrigger.addEventListener('mouseenter', function () { menu.classList.remove('is-picked'); });
    solTrigger.addEventListener('focus', function () { menu.classList.remove('is-picked'); });
  }

})();
