/* ════════════════════════════════════════════════════════════════════════════
   SPLASH INTRO — behaviour
   Ilja Shapiro · v3

   The intro itself is entirely CSS keyframes on a delay (splash.css §2–§6).
   This file does only what CSS cannot: decide whether the visitor sees it at
   all, end it, and let them skip it.

   IT RUNS IN <head>, BEFORE <body> IS PARSED — the same trick the mode script
   next to it uses. That ordering is the whole no-flash story: splash.css
   leaves the layer at display:none, and this file stamps .splash-on on <html>
   only when the intro is going to play. A returning visitor, a reduced-motion
   visitor and a no-JavaScript visitor therefore never see one black frame.

   Because the markup carries `is-running` in index.html, the keyframes start
   as the splash is parsed, not when the page finishes loading. Nothing here
   starts the show; it only stops it.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ── 1. THE GATE — once per browser session ─────────────────────────────── */
  /* Arrive, and you get the show. Reload, navigate back, open a section and
     come back — you do not. Reduced motion never gets it.

     sessionStorage can throw outright in a locked-down browser, so every touch
     is wrapped: a visitor who cannot store anything still gets the site, and
     simply sees the intro each time. Same shape as the mode script's handling
     of localStorage in main.js §1. */

  var seen = false;
  try { seen = !!sessionStorage.getItem('ilja-splash'); } catch (e) {}

  if (seen) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try { sessionStorage.setItem('ilja-splash', '1'); } catch (e) {}

  root.classList.add('splash-on');


  /* ── 1a. THE HANDOFF — the lens opens onto the LIGHT site ───────────────── */
  /* Black → paper is the reveal the intro was drawn for, so the splash puts the
     visitor there. It needs no mode machinery of its own: writing the site's own
     store is enough. The inline mode script above has already run and found it
     empty, main.js §1 reads it a moment later and applies it, and the wordmark
     toggle overwrites it on one click — after which the visitor's choice wins
     for good.

     This sits AFTER both returns on purpose. A visitor who is not being shown
     the splash does not get their mode rewritten: a reduced-motion visitor
     keeps whatever their system asks for, and a returning visitor is already
     holding 'light' from the arrival that did show it.

     AN EXPLICIT CHOICE OUTRANKS THE HANDOFF, and the guard below is what makes
     that true. The gate above is per-SESSION but this store is permanent, so
     without it every new session would stamp 'light' over a visitor who had
     clicked the wordmark and asked for dark — the toggle would appear to
     forget itself overnight. Only an empty store is filled in.

     The attribute is stamped here rather than left to main.js because this runs
     in <head>: the page is painted light from the first frame, never dark-then-
     light. */
  var chosen = null;
  try { chosen = localStorage.getItem('ilja-mode'); } catch (e) {}

  if (chosen !== 'light' && chosen !== 'dark') {
    try { localStorage.setItem('ilja-mode', 'light'); } catch (e) {}
    root.setAttribute('data-mode', 'light');
  }


  /* ── 2. ENDING IT ───────────────────────────────────────────────────────── */

  var timer = null;

  function finish() {
    clearTimeout(timer);
    root.classList.remove('splash-on');       /* releases the scroll lock too */
  }

  /* The sequence ends when the lens finishes. Both halves of that moment — when
     it starts and how long it takes — are read straight out of splash.css, so
     this file never holds a second opinion about the timing. parseFloat on
     "4000ms" gives 4000; the unit is dropped, which is what we want. */
  function endsAt() {
    var cs = getComputedStyle(root);
    var ms = function (name) { return parseFloat(cs.getPropertyValue(name)) || 0; };
    return (ms('--t-lens') + ms('--d-lens')) * (ms('--p') || 1);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var splash = document.getElementById('splash');
    if (!splash) { finish(); return; }        /* markup gone — never trap the page */

    /* the lens finishing is the real signal; the timer is the backstop for a
       browser without @property, where --lens cannot tween and no animation
       ever ends */
    timer = setTimeout(finish, endsAt() + 200);

    splash.addEventListener('animationend', function (event) {
      if (event.animationName === 'sp-lens') finish();
    });

    /* skip — click the black, or press Escape */
    splash.addEventListener('click', finish);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') finish();
    });
  });

})();
