/**
 * VTID-04937 — returning from a post must land the reader where they left the
 * feed, even when the page is still growing as media loads.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { restoreWindowScroll } from '@/lib/feed-scroll-restore';

let pageHeight = 0;
let resizeCallbacks: Array<() => void> = [];

class FakeResizeObserver {
  constructor(private cb: () => void) {}
  observe() {
    resizeCallbacks.push(this.cb);
  }
  disconnect() {
    resizeCallbacks = resizeCallbacks.filter((c) => c !== this.cb);
  }
}

/** Grow the page and notify observers, as a late-loading image would. */
const growPageTo = (height: number) => {
  pageHeight = height;
  for (const cb of [...resizeCallbacks]) cb();
};

const flushFrames = () => vi.advanceTimersByTime(40);

describe('restoreWindowScroll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pageHeight = 0;
    resizeCallbacks = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    // The browser clamps scroll to what the page can scroll to.
    window.scrollTo = vi.fn((_x: number, y: number) => {
      Object.defineProperty(window, 'scrollY', { value: Math.min(y, pageHeight), configurable: true });
    }) as unknown as typeof window.scrollTo;
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('restores immediately when the page is already tall enough', () => {
    pageHeight = 10_000;
    const onSettled = vi.fn();
    restoreWindowScroll(6000, { onSettled });

    flushFrames();

    expect(window.scrollY).toBe(6000);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(resizeCallbacks).toHaveLength(0);
  });

  it('keeps re-applying as the page grows until the saved spot is reachable (the bug)', () => {
    pageHeight = 1500; // media deep in the feed has not sized itself yet
    const onSettled = vi.fn();
    restoreWindowScroll(6000, { onSettled });

    flushFrames();
    expect(window.scrollY).toBe(1500); // clamped — a one-shot restore stopped here
    expect(onSettled).not.toHaveBeenCalled();

    growPageTo(4000);
    expect(window.scrollY).toBe(4000);
    growPageTo(9000);

    expect(window.scrollY).toBe(6000);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(resizeCallbacks).toHaveLength(0);
  });

  it('stops as soon as the reader scrolls themselves', () => {
    pageHeight = 1500;
    const onSettled = vi.fn();
    restoreWindowScroll(6000, { onSettled });
    flushFrames();

    window.dispatchEvent(new Event('touchstart'));
    growPageTo(9000);

    expect(window.scrollY).toBe(1500);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('gives up after the time cap', () => {
    pageHeight = 1500;
    const onSettled = vi.fn();
    restoreWindowScroll(6000, { onSettled, timeoutMs: 2000 });
    flushFrames();

    vi.advanceTimersByTime(2000);
    growPageTo(9000);

    expect(window.scrollY).toBe(1500);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('cancel stops it before anything is applied', () => {
    pageHeight = 10_000;
    const onSettled = vi.fn();
    const cancel = restoreWindowScroll(6000, { onSettled });

    cancel();
    flushFrames();

    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});
