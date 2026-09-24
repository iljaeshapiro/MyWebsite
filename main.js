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
  /* The logo is the switch: its sun or moon shows what a click will do. A stored
     choice always wins; until the visitor makes one, the site is dark. */

  var toggle = document.getElementById('mode-toggle');

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
  applyMode(storedMode() || 'dark');

  toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
    applyMode(next);
    try { localStorage.setItem('ilja-mode', next); } catch (e) {}
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

  /* publishes the band's height rather than writing the margin: styles.css
     reads --band-h for the band itself, the hero's offset and the toggle's
     centring, so the three can never drift apart */
  function positionHero() {
    root.style.setProperty('--band-h', (hero.offsetHeight * 0.10) + 'px');
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
     auto-scrolls into view, and never so far that the pill band leaves the
     top of the screen; later switches don't scroll. */

  var pills = document.querySelectorAll('.pill');
  var hoverbar = document.querySelector('.hoverbar');
  var tabs = {};
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tab) {
    tabs[tab.id] = tab;
  });

  var currentTab = null;
  var hasAutoScrolled = false;
  var hasBlobAutoScrolled = false;
  var TAB_FADE_MS = 320;           /* keep in step with --step in styles.css */
  var SCROLL_MS = 500;

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /* html carries scroll-behavior: smooth (styles.css §2), and a scrollTo that
     does not say otherwise inherits it — so each frame below would ask for a
     NEW smooth scroll to a target 16ms further on, the browser would restart
     its own easing every time, and the travel would advance in visible steps.
     Switching the property off for the duration is what stops that; a
     behavior: 'instant' argument would read better but throws outright on
     browsers older than early 2022 instead of degrading.
     scrollRun also gives a later call the right to take over: an earlier loop
     sees its id go stale and drops out rather than fighting for the scroll. */
  var scrollRun = 0;

  /* maxY, when given, caps the travel: the page never scrolls past it */
  function scrollNearestOverTime(el, duration, maxY) {
    var overflow = el.getBoundingClientRect().bottom - window.innerHeight;
    if (overflow <= 0) return;
    var from = window.scrollY;
    var to = from + overflow;
    if (maxY !== undefined) to = Math.min(to, maxY);
    if (to <= from) return;
    var start = null;
    var run = ++scrollRun;

    root.style.scrollBehavior = 'auto';

    function step(timestamp) {
      if (run !== scrollRun) return;              /* a newer scroll took over */
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      window.scrollTo(0, from + (to - from) * easeInOutQuad(progress));
      if (progress < 1) requestAnimationFrame(step);
      else root.style.scrollBehavior = '';
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
        var bandTop = hoverbar.getBoundingClientRect().top + window.scrollY;
        scrollNearestOverTime(incoming, SCROLL_MS, bandTop);
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
  /* All seven subjects live in the markup; exactly one is ever visible. The panel
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


  /* ── 3b. PHONE CAROUSEL — the strip as a swipeable row ──────────────────── */
  /* ≤ 767px only (mobile.css). Scroll-snap does the swiping. This sets --d on
     each icon (0 in the middle, 1 at a side slot) for the fade, lights the
     matching dot, and selects the middle icon once the swipe has stopped.
     A tap on a side icon slides it to the middle. */

  var phone = window.matchMedia('(max-width: 767px)');
  var strip = document.querySelector('.strip');
  var dots = document.querySelectorAll('.strip-dots span');
  var stripTicking = false;
  var settleTimer = null;

  /* returns the index of the icon nearest the middle */
  function updateStrip() {
    stripTicking = false;
    var centre = strip.scrollLeft + strip.clientWidth / 2;
    var nearest = 0;
    var best = Infinity;

    Array.prototype.forEach.call(icons, function (icon, i) {
      if (!phone.matches) { icon.style.removeProperty('--d'); return; }
      if (!icon.offsetWidth) return;              /* tab still hidden */
      var off = Math.abs(icon.offsetLeft + icon.offsetWidth / 2 - centre);
      icon.style.setProperty('--d', Math.min(off / icon.offsetWidth, 1).toFixed(3));
      if (off < best) { best = off; nearest = i; }
    });
    Array.prototype.forEach.call(dots, function (dot, i) {
      dot.classList.toggle('is-active', i === nearest);
    });
    return nearest;
  }

  strip.addEventListener('scroll', function () {
    if (!phone.matches) return;
    if (!stripTicking) {
      stripTicking = true;
      requestAnimationFrame(updateStrip);
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () {
      var icon = icons[updateStrip()];
      if (!icon.hasAttribute('aria-current')) openSubject(icon.dataset.target);
    }, 120);
  }, { passive: true });

  Array.prototype.forEach.call(icons, function (icon) {
    icon.addEventListener('click', function () {
      if (!phone.matches) return;
      strip.scrollTo({
        left: icon.offsetLeft + icon.offsetWidth / 2 - strip.clientWidth / 2,
        behavior: motionQuery.matches ? 'auto' : 'smooth'
      });
    });
  });

  /* fires when the Expertise tab first opens (width 0 → real), on rotation,
     and when the width crosses 767px — where updateStrip clears --d */
  new ResizeObserver(updateStrip).observe(strip);


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
     retract, and pulls each panel's animation in from its own file. */

  var menu = document.querySelector('.menu');

  if (menu) {
    var solTrigger = menu.querySelector('.trigger');
    var blobs = menu.querySelectorAll('.blob');

    var FADE_MS = 300;                 /* keep in step with .panel transition in styles.css §9b */

    var current = null;   /* the settled, visible panel */
    var leaving = null;   /* the panel currently fading out, if any */
    var wantId  = null;   /* id of the most recently clicked bubble — the incoming panel */

    /* The panel animations live one-per-file in imagery/solutions_animations/
       and are pulled in the first time their panel opens, so the file is the
       single source and index.html stays free of them. They are injected, not
       <img>-linked, because injected markup still inherits currentColor, the
       site's tokens and the light/dark toggle — an <img> would see none of it
       and could only follow the OS setting.
       NOTE: fetch is blocked on file://, so opening index.html by double-click
       leaves these frames empty. Serve the folder to see them:
           python3 -m http.server 8000
       A failed fetch is swallowed: the frame stays empty and the panel's text,
       which is the part that matters, still reads. */

    var animCache = {};

    var loadAnim = function (panel, done) {
      var frame = panel.querySelector('.anim__frame[data-anim]');
      if (!frame || frame.firstElementChild) return done();
      var name = frame.getAttribute('data-anim');

      if (!animCache[name]) {
        animCache[name] = fetch('imagery/solutions_animations/' + name + '.svg')
          .then(function (response) {
            if (!response.ok) throw new Error(response.status);
            return response.text();
          });
      }

      animCache[name].then(function (markup) {
        if (!frame.firstElementChild) frame.innerHTML = markup;
        done();
      }, done);
    };

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
      loadAnim(panel, function () { playPanel(panel); });
      current = panel;

      /* only the very first bubble picked per page load auto-scrolls, same as
         the pill band's own one-time behaviour (§2) */
      if (!hasBlobAutoScrolled) {
        hasBlobAutoScrolled = true;
        if (!motionQuery.matches) scrollNearestOverTime(panel, SCROLL_MS);
      }
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
