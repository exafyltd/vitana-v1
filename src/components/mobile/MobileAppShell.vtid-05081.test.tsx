/**
 * VTID-05081 — the left-edge swipe opens the side drawer from any content in
 * the shell, including a node that React renders elsewhere (the kept-alive
 * News portal). The shell listens with native touch events, which bubble
 * through the DOM.
 */
import { createPortal } from 'react-dom';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('./TopAppBar', () => ({ TopAppBar: () => null }));
vi.mock('./SideDrawerNav', () => ({
  SideDrawerNav: ({ open }: { open: boolean }) => (open ? <div data-testid="drawer-open" /> : null),
}));

import { MobileAppShell } from './MobileAppShell';

afterEach(cleanup);

function swipe(target: Element, from: { x: number; y: number }, to: { x: number; y: number }) {
  fireEvent.touchStart(target, { touches: [{ clientX: from.x, clientY: from.y }] });
  fireEvent.touchEnd(target, { changedTouches: [{ clientX: to.x, clientY: to.y }] });
}

// A node React renders from outside the shell but that sits in the shell's DOM,
// as NewsKeepAliveSlot attaches the host's stable node.
function PortalChild({ host }: { host: HTMLElement }) {
  return createPortal(<p data-testid="portal-content">news</p>, host);
}

describe('MobileAppShell edge swipe (VTID-05081)', () => {
  it('opens the drawer from content rendered inside the shell', () => {
    render(
      <MemoryRouter>
        <MobileAppShell>
          <p data-testid="content">page</p>
        </MobileAppShell>
      </MemoryRouter>,
    );
    swipe(screen.getByTestId('content'), { x: 10, y: 300 }, { x: 120, y: 310 });
    expect(screen.queryByTestId('drawer-open')).not.toBeNull();
  });

  it('opens the drawer from portaled content attached inside the shell DOM', () => {
    // Same React root, like the app: the portal is rendered by a sibling of the
    // shell (the keep-alive host sits outside <Routes>), so React's own event
    // bubbling never passes through MobileAppShell.
    const stable = document.createElement('div');
    const { container } = render(
      <MemoryRouter>
        <MobileAppShell>
          <div data-testid="slot" ref={(el) => el && !el.contains(stable) && el.appendChild(stable)} />
        </MobileAppShell>
        <PortalChild host={stable} />
      </MemoryRouter>,
    );
    expect(container.contains(screen.getByTestId('portal-content'))).toBe(true);
    swipe(screen.getByTestId('portal-content'), { x: 10, y: 300 }, { x: 120, y: 310 });
    expect(screen.queryByTestId('drawer-open')).not.toBeNull();
  });

  it('ignores a swipe that starts away from the edge, is too short, or is vertical', () => {
    render(
      <MemoryRouter>
        <MobileAppShell>
          <p data-testid="content">page</p>
        </MobileAppShell>
      </MemoryRouter>,
    );
    const el = screen.getByTestId('content');
    swipe(el, { x: 100, y: 300 }, { x: 250, y: 300 });
    swipe(el, { x: 10, y: 300 }, { x: 40, y: 300 });
    swipe(el, { x: 10, y: 100 }, { x: 70, y: 400 });
    expect(screen.queryByTestId('drawer-open')).toBeNull();
  });
});
