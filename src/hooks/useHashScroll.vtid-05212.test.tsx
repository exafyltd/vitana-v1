/**
 * VTID-05212 C3 — `useHashScroll` lands a deep link on its section and
 * consumes the hash; and the Connectors screen wires it to the Mail, Calendar
 * & Contacts section on desktop and mobile (source checks for the page, which
 * needs dozens of providers to render).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useHashScroll, HASH_SCROLL_RETRY_MS, HASH_SCROLL_SETTLE_MS } from './useHashScroll';
import { CONNECTOR_SECTION_HASHES, MAIL_CALENDAR_CONTACTS_ANCHOR } from '@/components/settings/connected-apps/anchors';

let goTo: (to: string) => void = () => {};

function Page() {
  useHashScroll(CONNECTOR_SECTION_HASHES);
  const loc = useLocation();
  goTo = useNavigate();
  return (
    <div>
      <div data-testid="loc">{loc.pathname + loc.search + loc.hash}</div>
      <div id={MAIL_CALENDAR_CONTACTS_ANCHOR}>mail, calendar, contacts</div>
    </div>
  );
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/connectors" element={<Page />} />
      </Routes>
    </MemoryRouter>,
  );
}

let scrolled: Element[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  scrolled = [];
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolled.push(this);
  } as Element['scrollIntoView'];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useHashScroll (VTID-05212)', () => {
  it.each(['#calendar', '#contacts'])('%s scrolls to the Mail, Calendar & Contacts section and drops the hash, keeping the query', (hash) => {
    const { getByTestId } = renderAt(`/connectors?tab=productivity${hash}`);
    act(() => {
      vi.advanceTimersByTime(HASH_SCROLL_RETRY_MS);
    });
    expect(scrolled.length).toBeGreaterThan(0);
    expect(scrolled.every((el) => el.id === MAIL_CALENDAR_CONTACTS_ANCHOR)).toBe(true);
    expect(getByTestId('loc').textContent).toBe('/connectors?tab=productivity');
  });

  it('following the same link again scrolls again (the hash was consumed)', () => {
    renderAt('/connectors#contacts');
    act(() => {
      vi.advanceTimersByTime(HASH_SCROLL_RETRY_MS);
    });
    const first = scrolled.length;
    act(() => goTo('/connectors#contacts'));
    act(() => {
      vi.advanceTimersByTime(HASH_SCROLL_RETRY_MS);
    });
    expect(scrolled.length).toBeGreaterThan(first);
  });

  describe('late content (the section drifts after the first scrolls)', () => {
    const lastSettle = Math.max(...HASH_SCROLL_SETTLE_MS);
    const placeSectionAt = (top: number) => {
      const el = document.getElementById(MAIL_CALENDAR_CONTACTS_ANCHOR)!;
      el.getBoundingClientRect = () => ({ top, bottom: top + 100, left: 0, right: 0, width: 0, height: 100, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    };

    it('scrolls again when the section has drifted away from the top', () => {
      renderAt('/connectors?tab=productivity#calendar');
      act(() => {
        vi.advanceTimersByTime(HASH_SCROLL_RETRY_MS);
      });
      const afterFirst = scrolled.length;
      placeSectionAt(900);
      act(() => {
        vi.advanceTimersByTime(lastSettle);
      });
      expect(scrolled.length).toBeGreaterThan(afterFirst);
    });

    it('does not move a section that is already at the top', () => {
      renderAt('/connectors#calendar');
      act(() => {
        vi.advanceTimersByTime(HASH_SCROLL_RETRY_MS);
      });
      const afterFirst = scrolled.length;
      placeSectionAt(16);
      act(() => {
        vi.advanceTimersByTime(lastSettle);
      });
      expect(scrolled).toHaveLength(afterFirst);
    });

    it.each(['wheel', 'touchstart', 'keydown', 'pointerdown'])('stops once the member takes over (%s)', (name) => {
      renderAt('/connectors#calendar');
      act(() => {
        vi.advanceTimersByTime(HASH_SCROLL_RETRY_MS);
      });
      const afterFirst = scrolled.length;
      placeSectionAt(900);
      act(() => {
        window.dispatchEvent(new Event(name));
        vi.advanceTimersByTime(lastSettle);
      });
      expect(scrolled).toHaveLength(afterFirst);
    });
  });

  it('an unknown hash or no hash does nothing and stays in the URL', () => {
    const { getByTestId } = renderAt('/connectors#somewhere-else');
    act(() => {
      vi.advanceTimersByTime(HASH_SCROLL_RETRY_MS);
    });
    expect(scrolled).toHaveLength(0);
    expect(getByTestId('loc').textContent).toBe('/connectors#somewhere-else');
  });
});

describe('Connectors wires the card deep links (VTID-05212)', () => {
  const page = readFileSync(resolve(__dirname, '../pages/settings/ConnectedApps.tsx'), 'utf8');
  const mobile = readFileSync(resolve(__dirname, '../components/settings/MobileConnectedAppsView.tsx'), 'utf8');

  it('calls useHashScroll before the mobile early return, so both layouts get it', () => {
    const hook = page.indexOf('useHashScroll(CONNECTOR_SECTION_HASHES)');
    expect(hook).toBeGreaterThan(0);
    expect(hook).toBeLessThan(page.indexOf('if (isMobile) {'));
  });

  it('desktop: the anchor sits on the Mail, Calendar & Contacts section', () => {
    const anchor = page.indexOf('id={MAIL_CALENDAR_CONTACTS_ANCHOR}');
    expect(anchor).toBeGreaterThan(0);
    expect(page.indexOf('<MailCalendarContactsPanel', anchor)).toBeGreaterThan(anchor);
  });

  it('mobile: the anchor wraps the Mail, Calendar & Contacts section', () => {
    const anchor = mobile.indexOf('id={MAIL_CALENDAR_CONTACTS_ANCHOR}');
    expect(anchor).toBeGreaterThan(0);
    expect(mobile.indexOf('<MailCalendarContactsSection', anchor)).toBeGreaterThan(anchor);
  });

  it('both hashes point at that section', () => {
    expect(CONNECTOR_SECTION_HASHES).toEqual({ calendar: MAIL_CALENDAR_CONTACTS_ANCHOR, contacts: MAIL_CALENDAR_CONTACTS_ANCHOR });
  });
});
