/**
 * VTID-05106 — hover/focus intent prefetch (SR-23): ≥ 80 ms dwell, once per
 * path, internal links only, leaving early cancels.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveIntentPath, startIntentPrefetch } from './intentPrefetch';

const ORIGIN = window.location.origin;

function link(href: string, attrs: Record<string, string> = {}) {
  const a = document.createElement('a');
  a.setAttribute('href', href);
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  a.appendChild(document.createElement('span')).textContent = 'x';
  document.body.appendChild(a);
  return a;
}

const over = (el: Element) => el.dispatchEvent(new Event('pointerover', { bubbles: true }));
const out = (el: Element, relatedTarget: Element | null = document.body) => {
  const e = new Event('pointerout', { bubbles: true });
  Object.defineProperty(e, 'relatedTarget', { value: relatedTarget });
  el.dispatchEvent(e);
};

describe('resolveIntentPath', () => {
  it('normalises internal links and rejects everything the router does not own', () => {
    expect(resolveIntentPath(link('/discover/'), ORIGIN)).toBe('/discover');
    expect(resolveIntentPath(link('/comm/events-meetups?tab=all#x'), ORIGIN)).toBe('/comm/events-meetups');
    expect(resolveIntentPath(link('/app/home'), ORIGIN, '/app/')).toBe('/home');
    expect(resolveIntentPath(link('https://example.com/home'), ORIGIN)).toBeNull();
    expect(resolveIntentPath(link('#section'), ORIGIN)).toBeNull();
    expect(resolveIntentPath(link('/file.pdf', { download: '' }), ORIGIN)).toBeNull();
    expect(resolveIntentPath(link('/home', { target: '_blank' }), ORIGIN)).toBeNull();
    expect(resolveIntentPath(link('mailto:a@b.c'), ORIGIN)).toBeNull();
  });
});

describe('startIntentPrefetch', () => {
  let stop: () => void;
  const onIntent = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onIntent.mockReset();
    stop = startIntentPrefetch({ onIntent });
  });
  afterEach(() => {
    stop();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('warms after 80 ms of hover, once per path', () => {
    const a = link('/discover');
    over(a.firstChild as Element);
    vi.advanceTimersByTime(79);
    expect(onIntent).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onIntent).toHaveBeenCalledWith('/discover');

    out(a);
    over(a);
    vi.advanceTimersByTime(200);
    expect(onIntent).toHaveBeenCalledTimes(1);
  });

  it('leaving before the dwell cancels; moving inside the link does not', () => {
    const a = link('/home');
    over(a);
    vi.advanceTimersByTime(40);
    out(a, a.firstChild as Element); // still inside the link
    vi.advanceTimersByTime(40);
    expect(onIntent).toHaveBeenCalledTimes(1);

    const b = link('/calendar');
    over(b);
    vi.advanceTimersByTime(40);
    out(b);
    vi.advanceTimersByTime(200);
    expect(onIntent).not.toHaveBeenCalledWith('/calendar');
  });

  it('keyboard focus is intent too', () => {
    const a = link('/inbox');
    a.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(80);
    expect(onIntent).toHaveBeenCalledWith('/inbox');
  });

  it('cleanup removes the listeners', () => {
    stop();
    const a = link('/wallet');
    over(a);
    vi.advanceTimersByTime(200);
    expect(onIntent).not.toHaveBeenCalled();
    stop = () => {};
  });
});
