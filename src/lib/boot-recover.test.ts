/**
 * VTID-04989 — public/boot-recover.js and the nginx rules behind it.
 *
 * During a rolling deploy the entry bundle can 404 (HTML from one build, file
 * asked of the other). nginx must never let that 404 be cached, and the page
 * must reload itself instead of staying blank. The script is plain JS loaded
 * from /public, so this suite evaluates the real file in jsdom.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = readFileSync(path.join(ROOT, 'public/boot-recover.js'), 'utf8');
const KEY = 'vitana_boot_recover';

type Api = {
  MAX_RELOADS: number;
  WINDOW_MS: number;
  DELAYS_MS: number[];
  isAssetElement: (el: unknown) => boolean;
  nextReloadDelay: (now: number) => number;
};

const REAL_LOCATION = { href: window.location.href, origin: window.location.origin };
let reload: ReturnType<typeof vi.fn>;
let listeners: Array<(e: Event) => void>;
let api: Api;

function load() {
  listeners = [];
  const realAdd = window.addEventListener.bind(window);
  const spy = vi.spyOn(window, 'addEventListener').mockImplementation(
    (type: string, fn: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => {
      if (type === 'error' && typeof fn === 'function') listeners.push(fn as (e: Event) => void);
      realAdd(type, fn, opts);
    },
  );
  new Function(SCRIPT)();
  spy.mockRestore();
  api = (window as unknown as { __vitanaBootRecover: Api }).__vitanaBootRecover;
}

function failedScript(src: string): Event {
  const el = document.createElement('script');
  el.src = src;
  const ev = new Event('error');
  Object.defineProperty(ev, 'target', { value: el });
  return ev;
}

function fire(ev: Event) {
  listeners.forEach((fn) => fn(ev));
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  document.body.innerHTML = '<div id="root"></div>';
  reload = vi.fn();
  // Keep jsdom's real origin: element .src/.href resolve against it.
  const { href, origin } = REAL_LOCATION;
  Object.defineProperty(window, 'location', { configurable: true, value: { href, origin, reload } });
  load();
});

afterEach(() => {
  listeners.forEach((fn) => window.removeEventListener('error', fn, true));
  vi.useRealTimers();
});

describe('boot-recover.js (VTID-04989)', () => {
  it('a failed /assets/ entry before mount reloads after the first delay', () => {
    fire(failedScript('/assets/index-NEW.js'));
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(api.DELAYS_MS[0]);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('waits 2 s, 10 s, 45 s on successive page loads, then stops', () => {
    expect(api.DELAYS_MS).toEqual([2000, 10000, 45000]);
    const now = Date.now();
    expect(api.nextReloadDelay(now)).toBe(2000);
    expect(api.nextReloadDelay(now + 3000)).toBe(10000);
    expect(api.nextReloadDelay(now + 14000)).toBe(45000);
    expect(api.nextReloadDelay(now + 60000)).toBe(-1);
  });

  it('the cap resets after the window', () => {
    const now = Date.now();
    for (let i = 0; i < api.MAX_RELOADS; i++) api.nextReloadDelay(now);
    expect(api.nextReloadDelay(now + 1000)).toBe(-1);
    expect(api.nextReloadDelay(now + api.WINDOW_MS + 1)).toBe(2000);
  });

  it('schedules one reload per page load even if several files fail', () => {
    fire(failedScript('/assets/index-NEW.js'));
    fire(failedScript('/assets/vendor-NEW.js'));
    vi.advanceTimersByTime(60000);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem(KEY)!).count).toBe(1);
  });

  it('ignores files outside /assets/ and other origins', () => {
    fire(failedScript('/boot-recover.js'));
    fire(failedScript('https://gateway.vitanaland.com/command-hub/orb-widget.js'));
    fire(failedScript('https://cdn.example.com/assets/index-x.js'));
    vi.advanceTimersByTime(60000);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does nothing once the app has mounted (GlobalErrorBoundary owns that)', () => {
    document.getElementById('root')!.appendChild(document.createElement('div'));
    fire(failedScript('/assets/Calendar-x.js'));
    vi.advanceTimersByTime(60000);
    expect(reload).not.toHaveBeenCalled();
  });

  it('never reloads when sessionStorage is unavailable (cannot loop)', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    fire(failedScript('/assets/index-NEW.js'));
    vi.advanceTimersByTime(60000);
    expect(reload).not.toHaveBeenCalled();
    get.mockRestore();
  });

  it('a failed stylesheet under /assets/ counts too', () => {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = '/assets/index-NEW.css';
    const ev = new Event('error');
    Object.defineProperty(ev, 'target', { value: el });
    fire(ev);
    vi.advanceTimersByTime(2000);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('index.html and nginx.conf keep the rollout guarantees (VTID-04989)', () => {
  const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const nginx = readFileSync(path.join(ROOT, 'nginx.conf'), 'utf8');

  it('boot-recover.js is the first script in <head>', () => {
    const head = html.slice(0, html.indexOf('</head>'));
    const firstScript = head.match(/<script[^>]*>/);
    expect(firstScript?.[0]).toBe('<script src="/boot-recover.js">');
  });

  it('a missing /assets/ file is a 404 that is never cached', () => {
    const assets = nginx.slice(nginx.indexOf('location /assets/'), nginx.indexOf('location @asset_missing'));
    expect(assets).toMatch(/error_page 404 = @asset_missing;/);
    const missing = nginx.slice(nginx.indexOf('location @asset_missing'));
    expect(missing).toMatch(/add_header Cache-Control "no-store" always;\s*return 404;/);
  });

  it('boot-recover.js is revalidated, and never answered by the SPA fallback', () => {
    const block = nginx.slice(nginx.indexOf('location = /boot-recover.js'));
    expect(block).toMatch(/add_header Cache-Control "no-cache" always;\s*try_files \$uri =404;/);
  });
});
