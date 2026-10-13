/**
 * VTID-05115 — Spotlight Phase 7.3: Dev (Command Hub) screens on the `workspace` archetype.
 *
 * Proves, without any network:
 *  - flag off (useSpotlightEnabled() = false): a Dev screen renders exactly the
 *    legacy tree — its SubNavigation section tabs, then the padded gradient wrapper,
 *    no [data-archetype];
 *  - flag on: the section tabs stay directly above <ScreenFrame archetype="workspace">
 *    (full width, no rail) with the same header, utility row, tabs and panes inside;
 *  - every routed Dev page (inside DevLayout) reads useSpotlightEnabled() once,
 *    composes ScreenFrame "workspace" behind it, and never moves SubNavigation inside it.
 */
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

let spotlightOn = false;

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({
  default: ({ items }: { items: { id?: string; name?: string; path: string }[] }) => (
    <nav data-testid="section-tabs">{items.map((i) => <a key={i.path} href={i.path}>{i.name ?? i.id}</a>)}</nav>
  ),
}));
vi.mock('@/components/dev/DevStandardHeader', () => ({ DevStandardHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/ui/utility-action-button', () => ({ UtilityActionButton: ({ children }: { children: ReactNode }) => <div data-testid="utility">{children}</div> }));
vi.mock('@/components/ui/expandable-search-button', () => ({ ExpandableSearchButton: () => null }));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => null }));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));

import AgentsWorker from './agents/Worker';

const LEGACY_WRAPPER =
  'p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to dark:from-background dark:via-background dark:to-background min-h-screen';

const at = (ui: React.ReactElement) => render(<MemoryRouter initialEntries={['/dev/agents/worker']}>{ui}</MemoryRouter>);

beforeEach(() => {
  spotlightOn = false;
});

describe('VTID-05115 Dev screen — flag off renders the legacy tree', () => {
  it('section tabs, then the padded gradient wrapper; no Spotlight frame', () => {
    const { container } = at(<AgentsWorker />);
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-spotlight-layout]')).toBeNull();
    const tabs = screen.getByTestId('section-tabs');
    expect(tabs.querySelector('a[href="/dev/agents/worker"]')).not.toBeNull();
    const wrapper = tabs.nextElementSibling as HTMLElement;
    expect(wrapper.className).toBe(LEGACY_WRAPPER);
    expect(wrapper.textContent).toContain('Worker Agents');
  });
});

describe('VTID-05115 Dev screen — flag on renders the workspace archetype', () => {
  it('keeps the section tabs directly above ScreenFrame "workspace" (full width, no rail) with the same content', () => {
    spotlightOn = true;
    const { container } = at(<AgentsWorker />);
    const frame = container.querySelector('[data-archetype="workspace"]') as HTMLElement;
    expect(frame).not.toBeNull();
    const tabs = screen.getByTestId('section-tabs');
    expect(tabs.nextElementSibling).toBe(frame);
    expect(frame.contains(tabs)).toBe(false);
    expect(container.querySelectorAll('[data-testid="section-tabs"]')).toHaveLength(1);
    const layout = frame.querySelector('[data-spotlight-layout]') as HTMLElement;
    expect(layout.getAttribute('data-width')).toBe('full');
    expect(frame.querySelector('[data-spotlight-rail]')).toBeNull();
    const stage = frame.querySelector('[data-spotlight-stage]') as HTMLElement;
    expect(stage.textContent).toContain('Worker Agents');
    expect(stage.querySelector('[data-testid="utility"]')).not.toBeNull();
    expect(stage.querySelectorAll('[role="tab"]').length).toBe(3);
    // the legacy padded wrapper is gone (ScreenFrame owns the gutters)
    expect([...container.querySelectorAll('div')].some((d) => d.className === LEGACY_WRAPPER)).toBe(false);
  });
});

describe('VTID-05115 Dev pages — source contract', () => {
  const ROOT = path.join(__dirname);
  // Not inside DevLayout, not on the workspace frame: /dev/login is a sign-in screen
  // (Phase 7.5 leftover form screen); DevReleases and DevDocsBacklog are not routed.
  const NOT_WORKSPACE = new Set(['DevLogin.tsx', 'DevReleases.tsx', 'DevDocsBacklog.tsx']);
  const files: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name) && !NOT_WORKSPACE.has(path.relative(ROOT, p))) files.push(p);
    }
  })(ROOT);

  it('finds the routed Dev pages', () => {
    expect(files.length).toBeGreaterThanOrEqual(42);
  });

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s composes ScreenFrame "workspace" behind useSpotlightEnabled()', (_rel, f) => {
    const src = fs.readFileSync(f, 'utf8');
    expect(src).toMatch(/<ScreenFrame\s+archetype="workspace"/);
    expect(src.split('useSpotlightEnabled()').length - 1).toBe(1);
    expect(src).toContain('const spotlight = useSpotlightEnabled();');
    expect(src).toMatch(/\{spotlight \? \(/);
    expect(src).toContain('<SubNavigation');
  });

  it('SubNavigation is never moved inside ScreenFrame (it stays the section tab bar above it)', () => {
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const m of src.matchAll(/<ScreenFrame[\s\S]*?<\/ScreenFrame>/g)) {
        expect(m[0], path.relative(ROOT, f)).not.toContain('<SubNavigation');
      }
    }
  });
});
