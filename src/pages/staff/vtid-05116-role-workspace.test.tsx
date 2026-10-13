/**
 * VTID-05116 — Spotlight Phase 7.4: Professional + Staff screens on the `workspace` archetype.
 *
 * Proves, without any network:
 *  - flag off (useSpotlightEnabled() = false): each page renders exactly the legacy
 *    tree — AppLayout, then the padded wrapper that leaves room for the phone's
 *    bottom bar, no [data-archetype];
 *  - flag on: the same content inside <ScreenFrame archetype="workspace"> (full
 *    width, no rail), which owns the gutters;
 *  - the three role pages read useSpotlightEnabled() once and compose ScreenFrame
 *    "workspace" behind it.
 */
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

let spotlightOn = false;

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));

import StaffQueue from './Queue';
import StaffDashboard from './Dashboard';
import ProfessionalDashboard from '../professional/Dashboard';

const LEGACY_WRAPPER = 'p-6 pb-28 md:pb-6 space-y-6';
const PAGES = [
  { name: 'staff queue', url: '/staff/queue', Page: StaffQueue, title: 'screens.staff.patientQueue' },
  { name: 'staff dashboard', url: '/staff/dashboard', Page: StaffDashboard, title: 'screens.staff.staffDashboard' },
  { name: 'professional dashboard', url: '/professional/dashboard', Page: ProfessionalDashboard, title: 'screens.professional.professionalDashboard' },
];

const at = (url: string, ui: React.ReactElement) => render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

beforeEach(() => {
  spotlightOn = false;
});

describe.each(PAGES)('VTID-05116 $name', ({ url, Page, title }) => {
  it('flag off: AppLayout, then the padded legacy wrapper; no Spotlight frame', () => {
    const { container } = at(url, <Page />);
    expect(container.querySelector('[data-archetype]')).toBeNull();
    const layout = screen.getByTestId('app-layout');
    expect(layout.children).toHaveLength(1);
    const wrapper = layout.firstElementChild as HTMLElement;
    expect(wrapper.className).toBe(LEGACY_WRAPPER);
    expect(wrapper.querySelector('h1')?.textContent).toBe(title);
  });

  it('flag on: the same content inside ScreenFrame "workspace" (full width, no rail)', () => {
    spotlightOn = true;
    const { container } = at(url, <Page />);
    const layout = screen.getByTestId('app-layout');
    const frame = layout.firstElementChild as HTMLElement;
    expect(frame.getAttribute('data-archetype')).toBe('workspace');
    expect(frame.querySelector('[data-spotlight-layout]')?.getAttribute('data-width')).toBe('full');
    expect(frame.querySelector('[data-spotlight-rail]')).toBeNull();
    const stage = frame.querySelector('[data-spotlight-stage]') as HTMLElement;
    expect(stage.querySelector('h1')?.textContent).toBe(title);
    expect([...container.querySelectorAll('div')].some((d) => d.className === LEGACY_WRAPPER)).toBe(false);
  });
});

describe('VTID-05116 staff queue — same cards and actions on both paths', () => {
  it.each([false, true])('spotlight=%s renders the three queue cards with their actions', (on) => {
    spotlightOn = on;
    at('/staff/queue', <StaffQueue />);
    expect(screen.getAllByText('screens.staff.callPatient')).toHaveLength(2);
    expect(screen.getAllByText('screens.staff.assignRoom')).toHaveLength(2);
    expect(screen.getAllByText('screens.staff.viewProgress')).toHaveLength(1);
  });
});

describe('VTID-05116 Professional + Staff pages — source contract', () => {
  const ROOT = path.join(__dirname, '..');
  it.each(['staff/Queue.tsx', 'staff/Dashboard.tsx', 'professional/Dashboard.tsx'])('%s composes ScreenFrame "workspace" behind useSpotlightEnabled()', (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    expect(src).toMatch(/<ScreenFrame\s+archetype="workspace"/);
    expect(src.split('useSpotlightEnabled()').length - 1).toBe(1);
    expect(src).toContain('const spotlight = useSpotlightEnabled();');
    expect(src).toMatch(/\{spotlight \? \(/);
  });
});
