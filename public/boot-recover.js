/*
 * VTID-04989 — no blank page while a new build rolls out.
 *
 * During an ECS rolling deploy old and new tasks serve side by side for 1–2
 * minutes. If the HTML comes from one build and a hashed file under /assets/
 * is answered by a task of the other build, that request 404s. A lazy chunk is
 * recovered by GlobalErrorBoundary, but if the entry bundle fails React never
 * mounts and the page stays blank.
 *
 * nginx marks that 404 `no-store` (so Cloudflare and the browser never keep
 * it). This script is the second half: when a same-origin script or
 * stylesheet under /assets/ fails before the app has mounted, reload the page.
 * At most MAX_RELOADS reloads per WINDOW_MS, waiting DELAYS_MS before each,
 * so the attempts span the rollout overlap. No sessionStorage → no reload
 * (it can never loop).
 *
 * Plain script, unhashed, first element in <head> so its listener exists
 * before the module entry is requested. Served with `no-cache` (nginx).
 */
(function () {
  'use strict';
  var KEY = 'vitana_boot_recover';
  var MAX_RELOADS = 3;
  var WINDOW_MS = 180000;
  var DELAYS_MS = [2000, 10000, 45000];
  var scheduled = false;

  function isAssetElement(el) {
    if (!el || !el.tagName) return false;
    var tag = String(el.tagName).toUpperCase();
    var raw = tag === 'SCRIPT' ? el.src : tag === 'LINK' ? el.href : '';
    if (!raw || typeof raw !== 'string') return false;
    try {
      var url = new URL(raw, window.location.href);
      return url.origin === window.location.origin && url.pathname.indexOf('/assets/') === 0;
    } catch (e) {
      return false;
    }
  }

  function appMounted() {
    var root = document.getElementById('root');
    return !!(root && root.childElementCount > 0);
  }

  // Returns the delay before the next reload, or -1 when no reload is allowed.
  function nextReloadDelay(now) {
    var state;
    try {
      state = JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
    } catch (e) {
      return -1; // storage unavailable: no guard, so never reload
    }
    if (!state || typeof state.first !== 'number' || now - state.first > WINDOW_MS) {
      state = { first: now, count: 0 };
    }
    if (state.count >= MAX_RELOADS) return -1;
    var delay = DELAYS_MS[state.count];
    state.count += 1;
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      return -1;
    }
    return delay;
  }

  function onError(event) {
    if (scheduled) return;
    if (!isAssetElement(event && event.target)) return;
    if (appMounted()) return; // a mounted app recovers its own lazy chunks
    var delay = nextReloadDelay(Date.now());
    if (delay < 0) return;
    scheduled = true;
    window.setTimeout(function () {
      window.location.reload();
    }, delay);
  }

  window.addEventListener('error', onError, true);

  window.__vitanaBootRecover = {
    KEY: KEY,
    MAX_RELOADS: MAX_RELOADS,
    WINDOW_MS: WINDOW_MS,
    DELAYS_MS: DELAYS_MS,
    isAssetElement: isAssetElement,
    nextReloadDelay: nextReloadDelay,
  };
})();
