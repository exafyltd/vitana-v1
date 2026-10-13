/**
 * VTID-05113 — Spotlight Phase 7.1: admin screens on the `workspace` archetype.
 *
 * Proves, without any network:
 *  - flag off (useSpotlightEnabled() = false): the admin page renders exactly the
 *    legacy tree — AdminTabs, then the old padded wrapper, no [data-archetype];
 *  - flag on: AdminTabs stays the section tab bar (admin-shell contract, SR-05)
 *    directly above <ScreenFrame archetype="workspace">, which renders the full
 *    width layout with the same content inside it;
 *  - the loading state of a migrated page is the workspace skeleton, not a spinner;
 *  - every admin page that renders AppLayout composes ScreenFrame "workspace"
 *    behind useSpotlightEnabled(), and every page that had AdminTabs still has it.
 */
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

let spotlightOn = false;
let settingsLoading = false;

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SubNavigation', () => ({
  default: ({ items }: { items: { id: string; path: string }[] }) => (
    <nav data-testid="admin-tabs">{items.map((i) => <a key={i.id} href={i.path}>{i.id}</a>)}</nav>
  ),
}));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useAdminSettings', () => ({
  useTenantSettings: () =>
    settingsLoading
      ? { isLoading: true, data: undefined }
      : { isLoading: false, data: { feature_flags: { desktop_spotlight: true } } },
  useUpdateTenantSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useAdminAutopilot', () => ({
  useAutopilotWaves: () => ({ isLoading: true, data: undefined, error: null }),
  useToggleWave: () => ({ mutate: vi.fn(), isPending: false }),
}));

import SettingsFeatureFlags from './settings/FeatureFlags';
import AutopilotPlanning from './autopilot/Planning';

const inRouter = (ui: React.ReactElement) => render(<MemoryRouter initialEntries={['/admin/settings/feature-flags']}>{ui}</MemoryRouter>);

beforeEach(() => {
  spotlightOn = false;
  settingsLoading = false;
});

describe('VTID-05113 admin page — flag off renders the legacy tree', () => {
  it('AdminTabs, then the padded legacy wrapper; no Spotlight frame', () => {
    const { container } = inRouter(<SettingsFeatureFlags />);
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-spotlight-layout]')).toBeNull();
    const tabs = screen.getByTestId('admin-tabs');
    expect(tabs.querySelector('a[href="/admin/settings/feature-flags"]')).not.toBeNull();
    const wrapper = tabs.nextElementSibling as HTMLElement;
    expect(wrapper.className).toBe('p-6 space-y-4');
    expect(wrapper.textContent).toContain('Desktop Spotlight');
  });
});

describe('VTID-05113 admin page — flag on renders the workspace archetype', () => {
  it('keeps AdminTabs as the section tab bar directly above ScreenFrame "workspace" (full width, no rail)', () => {
    spotlightOn = true;
    const { container } = inRouter(<SettingsFeatureFlags />);
    const frame = container.querySelector('[data-archetype="workspace"]') as HTMLElement;
    expect(frame).not.toBeNull();
    const tabs = screen.getByTestId('admin-tabs');
    expect(tabs.nextElementSibling).toBe(frame);
    expect(frame.contains(tabs)).toBe(false);
    expect(container.querySelectorAll('[data-testid="admin-tabs"]')).toHaveLength(1);
    const layout = frame.querySelector('[data-spotlight-layout]') as HTMLElement;
    expect(layout.getAttribute('data-width')).toBe('full');
    expect(frame.querySelector('[data-spotlight-rail]')).toBeNull();
    // same content, same controls
    const stage = frame.querySelector('[data-spotlight-stage]') as HTMLElement;
    expect(stage.textContent).toContain('Desktop Spotlight');
    expect(stage.querySelectorAll('button[role="checkbox"]').length).toBeGreaterThanOrEqual(7);
    // the legacy padded wrapper is gone (ScreenFrame owns the gutters)
    expect([...container.querySelectorAll('div')].some((d) => d.className === 'p-6 space-y-4')).toBe(false);
  });

  it('a loading admin page shows the workspace skeleton, never a spinner', () => {
    spotlightOn = true;
    const { container } = inRouter(<AutopilotPlanning />);
    expect(container.querySelector('[data-archetype-skeleton="workspace"]')).not.toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });
});

describe('VTID-05113 admin pages — source contract', () => {
  const ROOT = path.join(__dirname);
  const files: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name)) files.push(p);
    }
  })(ROOT);
  const pages = files.filter((f) => /<AppLayout[\s>]/.test(fs.readFileSync(f, 'utf8')));

  it('finds the admin pages', () => {
    expect(pages.length).toBeGreaterThanOrEqual(95);
  });

  it.each(pages.map((f) => [path.relative(ROOT, f), f]))('%s composes ScreenFrame "workspace" behind useSpotlightEnabled()', (_rel, f) => {
    const src = fs.readFileSync(f, 'utf8');
    expect(src).toMatch(/<ScreenFrame\s+archetype="workspace"/);
    expect(src).toContain('const spotlight = useSpotlightEnabled();');
    expect(src).toMatch(/\{spotlight \? \(/);
  });

  it('AdminTabs is never moved inside ScreenFrame (it stays the section tab bar above it)', () => {
    for (const f of pages) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/<ScreenFrame[\s\S]*?<\/ScreenFrame>/g)) {
        expect(m[0], path.relative(ROOT, f)).not.toContain('<AdminTabs');
      }
    }
  });
});
