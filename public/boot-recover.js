/*
 * VTID-04989 — no blank page while a new build rolls out.
 *
 * During an ECS rolling deploy old and new tasks serve side by side. If the
 * HTML comes from one build and a hashed file under /assets/ is requested
 * from a task running the other build, that request 404s. A lazy chunk is
 * recovered by GlobalErrorBoundary, but the entry bundle never runs, so React
 * never mounts and the page stays blank.
 *
 * The load balancer keeps a browser on one task (stickiness, set by the deploy
 * workflows). This file is the safety net behind it: when a script or
 * stylesheet under /assets/ fails to load before the app has mounted, reload
 * the page once. A reload asks for fresh HTML, which matches whatever build
 * now answers. At most one reload per minute, so a real outage cannot loop.
 *
 * Plain script, unhashed, served with no-cache (nginx `location /`), loaded
 * before the module entry so its listener is in place when the entry fails.
 */
(function () {
  'use strict';
  var KEY = 'vitana_boot_recover_at';
  var MIN_INTERVAL_MS = 60000;

  function isAssetElement(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toUpperCase();
    var url = tag === 'SCRIPT' ? el.src : tag === 'LINK' ? el.href : '';
    return typeof url === 'string' && url.indexOf('/assets/') !== -1;
  }

  function appMounted() {
    var root = document.getElementById('root');
    return !!(root && root.childElementCount > 0);
  }

  function reloadOnce() {
    try {
      var last = Number(window.sessionStorage.getItem(KEY) || 0);
      var now = Date.now();
      if (last && now - last < MIN_INTERVAL_MS) return false;
      window.sessionStorage.setItem(KEY, String(now));
    } catch (e) {
      // Storage unavailable (private mode): no guard, so do not reload.
      return false;
    }
    window.location.reload();
    return true;
  }

  window.addEventListener(
    'error',
    function (event) {
      if (!isAssetElement(event && event.target)) return;
      if (appMounted()) return; // a mounted app recovers its own lazy chunks
      reloadOnce();
    },
    true
  );

  window.__vitanaBootRecover = { isAssetElement: isAssetElement, reloadOnce: reloadOnce, KEY: KEY, MIN_INTERVAL_MS: MIN_INTERVAL_MS };
})();
