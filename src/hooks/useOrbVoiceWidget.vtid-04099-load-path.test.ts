/**
 * VTID-04099 — the ORB widget load path on mobile.
 *
 * The complaint this addresses is not the server's: `orb-widget.js` is 281 KB,
 * cross-origin from the gateway, and `defer`red, and this hook's own comment
 * records "on slow mobile (4G/3G WebView) it executes only after the 1.7MB
 * main bundle finishes parsing — easily 15-30s in the wild". None of that is
 * visible in gateway telemetry, which starts its clock at `session/start`.
 *
 * Source-level checks, matching the established pattern for this repo's
 * widget/bootstrap assertions (index.html and the deferred IIFE have no
 * importable surface to unit test).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const repoRoot = join(__dirname, '../..');
const indexHtml = readFileSync(join(repoRoot, 'index.html'), 'utf8');
const hookSrc = readFileSync(join(repoRoot, 'src/hooks/useOrbVoiceWidget.ts'), 'utf8');

describe('index.html widget preload', () => {
  it('preloads the widget as a script', () => {
    expect(indexHtml).toMatch(/<link rel="preload" as="script"[^>]*orb-widget\.js/);
  });

  it('preloads with crossorigin — a mismatch makes the browser fetch it twice', () => {
    const tag = indexHtml.match(/<link rel="preload" as="script"[^>]*orb-widget\.js[^>]*>/)?.[0] ?? '';
    expect(tag).toContain('crossorigin');
  });

  it('preload and script URLs are byte-identical, including the ?v= cache buster', () => {
    // Drift here is worse than having no preload at all: two different URLs
    // means two full 281 KB downloads on every cold load.
    const preload = indexHtml.match(/<link rel="preload" as="script"[^>]*href="([^"]+orb-widget\.js[^"]*)"/)?.[1];
    const script = indexHtml.match(/<script src="([^"]+orb-widget\.js[^"]*)"/)?.[1];
    expect(preload).toBeDefined();
    expect(script).toBeDefined();
    expect(preload).toBe(script);
  });

  it('still loads the widget deferred — preload must not change execution order', () => {
    expect(indexHtml).toMatch(/<script src="[^"]*orb-widget\.js[^"]*" defer><\/script>/);
  });
});

describe('widget init polling cadence', () => {
  it('polls fast for the first second instead of a flat 500ms tick', () => {
    expect(hookSrc).toContain('FAST_POLL_MS');
    expect(hookSrc).toMatch(/const FAST_POLL_MS = 50;/);
    expect(hookSrc).toMatch(/const FAST_POLL_ATTEMPTS = 20;/);
  });

  it('keeps the slow cadence for genuinely slow connections', () => {
    expect(hookSrc).toMatch(/const SLOW_POLL_MS = 500;/);
  });

  it('keeps the 60s ceiling so the FAB appears eventually rather than never', () => {
    expect(hookSrc).toMatch(/TOTAL_BUDGET_MS = 60_000/);
    expect(hookSrc).toContain('Widget script never loaded');
  });

  it('cancels cleanly on unmount — a self-rescheduling timer leaks without this', () => {
    expect(hookSrc).toMatch(/cancelled = true;/);
    expect(hookSrc).toMatch(/if \(timer\) clearTimeout\(timer\);/);
  });

  it('no longer uses a fixed setInterval for widget discovery', () => {
    expect(hookSrc).not.toMatch(/setInterval\([\s\S]{0,400}tryInit/);
  });
});
