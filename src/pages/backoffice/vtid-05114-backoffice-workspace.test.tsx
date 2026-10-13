/**
 * VTID-05114 — Spotlight Phase 7.2: BackOffice screens on the `workspace` archetype.
 *
 * Proves, without any network:
 *  - flag off (useSpotlightEnabled() = false): a BackOffice screen renders exactly
 *    the legacy tree — BackOfficeTabs, then BackOfficePage's padded wrapper with the
 *    screen id, no [data-archetype];
 *  - flag on: BackOfficeTabs stays the section tab bar directly above
 *    <ScreenFrame archetype="workspace"> (full width, no rail) with the same header,
 *    capability gate and content inside it;
 *  - the /backoffice/* placeholder follows the same split (404 and wave body);
 *  - every BackOffice page reads useSpotlightEnabled() once and goes through the
 *    workspace wrapper (or composes ScreenFrame itself), and BackOfficeTabs is never
 *    moved inside ScreenFrame.
 */
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

let spotlightOn = false;
let erpAccess: { isLoading: boolean; data: unknown } = { isLoading: false, data: undefined };

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SubNavigation', () => ({
  default: ({ items }: { items: { id: string; path: string }[] }) => (
    <nav data-testid="section-tabs">{items.map((i) => <a key={i.id} href={i.path}>{i.id}</a>)}</nav>
  ),
}));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (_k: string, fallback?: string) => fallback ?? _k }) }));
vi.mock('@/hooks/useBackOfficeAccess', () => ({ useMyErpAccess: () => erpAccess }));
vi.mock('@/hooks/useBackOfficeCommands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useBackOfficeCommands')>()),
  useBackOfficeApprovals: () => ({ isLoading: false, data: [], error: null }),
}));

import BackOfficeInbox from './overview/Inbox';
import BackOfficePlaceholder from './BackOfficePlaceholder';
import BackOfficeWorkspacePage from './BackOfficeWorkspacePage';

const ME = { ok: true, user_id: 'u1', tenant_id: 't1', role: 'backoffice', is_exafy_admin: false, capabilities: ['approvals.view'], defaults: [], explicit: [], can_manage_access: false, catalog: [] };

const at = (url: string, ui: React.ReactElement) => render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

beforeEach(() => {
  spotlightOn = false;
  erpAccess = { isLoading: false, data: ME };
});

describe('VTID-05114 BackOffice screen — flag off renders the legacy tree', () => {
  it('BackOfficeTabs, then the padded BackOfficePage wrapper with the screen id; no Spotlight frame', () => {
    const { container } = at('/backoffice/inbox', <BackOfficeInbox />);
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-spotlight-layout]')).toBeNull();
    const tabs = screen.getByTestId('section-tabs');
    expect(tabs.querySelector('a[href="/backoffice/inbox"]')).not.toBeNull();
    const wrapper = tabs.nextElementSibling as HTMLElement;
    expect(wrapper.className).toBe('p-6 space-y-4');
    expect(wrapper.getAttribute('data-screen-id')).toBe('BO-002');
    expect(wrapper.textContent).toContain('screens.backoffice.inbox.title');
  });
});

describe('VTID-05114 BackOffice screen — flag on renders the workspace archetype', () => {
  it('keeps BackOfficeTabs directly above ScreenFrame "workspace" (full width, no rail) with the same content', () => {
    spotlightOn = true;
    const { container } = at('/backoffice/inbox', <BackOfficeInbox />);
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
    const screenRoot = stage.querySelector('[data-screen-id="BO-002"]') as HTMLElement;
    expect(screenRoot).not.toBeNull();
    expect(screenRoot.textContent).toContain('screens.backoffice.inbox.title');
    expect(screenRoot.textContent).toContain('screens.backoffice.inbox.empty');
    // the legacy padded wrapper is gone (ScreenFrame owns the gutters)
    expect([...container.querySelectorAll('div')].some((d) => d.className === 'p-6 space-y-4')).toBe(false);
  });

  it('keeps the capability gate inside the frame', () => {
    spotlightOn = true;
    const { container } = at(
      '/backoffice/audit/receipts',
      <BackOfficeWorkspacePage spotlight sectionKey="audit" screenId="BO-X" title="T" description="D" capabilities={['erp.admin']}>
        <p>secret content</p>
      </BackOfficeWorkspacePage>,
    );
    const stage = container.querySelector('[data-archetype="workspace"] [data-spotlight-stage]') as HTMLElement;
    expect(stage.textContent).toContain('screens.backoffice.noAccess');
    expect(stage.textContent).not.toContain('secret content');
  });

  it('the placeholder keeps BackOfficeTabs above the frame for a known section and frames the 404 body', () => {
    spotlightOn = true;
    erpAccess = { isLoading: true, data: undefined };
    const known = at('/backoffice/sales/orders', <BackOfficePlaceholder />);
    const frame = known.container.querySelector('[data-archetype="workspace"]') as HTMLElement;
    expect(frame).not.toBeNull();
    expect(screen.getByTestId('section-tabs').nextElementSibling).toBe(frame);
    expect(frame.querySelector('[data-screen-id="BO-sales-orders"]')).not.toBeNull();
    known.unmount();

    const unknown = at('/not-backoffice', <BackOfficePlaceholder />);
    const frame404 = unknown.container.querySelector('[data-archetype="workspace"]') as HTMLElement;
    expect(frame404.textContent).toContain('404');
    expect(unknown.container.querySelector('[data-testid="section-tabs"]')).toBeNull();
  });

  it('the placeholder renders the legacy tree with the flag off', () => {
    erpAccess = { isLoading: true, data: undefined };
    const { container } = at('/backoffice/sales/orders', <BackOfficePlaceholder />);
    expect(container.querySelector('[data-archetype]')).toBeNull();
    const wrapper = screen.getByTestId('section-tabs').nextElementSibling as HTMLElement;
    expect(wrapper.className).toBe('px-6 py-10');
    expect(wrapper.getAttribute('data-screen-id')).toBe('BO-sales-orders');
  });
});

describe('VTID-05114 BackOffice pages — source contract', () => {
  const ROOT = path.join(__dirname);
  const files: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name) && e.name !== 'BackOfficeWorkspacePage.tsx') files.push(p);
    }
  })(ROOT);

  it('finds the BackOffice pages', () => {
    expect(files.length).toBeGreaterThanOrEqual(27);
  });

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s reads useSpotlightEnabled() once and renders the workspace frame behind it', (_rel, f) => {
    const src = fs.readFileSync(f, 'utf8');
    expect(src.split('useSpotlightEnabled()').length - 1).toBe(1);
    expect(src).toContain('const spotlight = useSpotlightEnabled();');
    expect(src).not.toMatch(/from "@\/components\/backoffice\/BackOfficePage"/);
    const viaWrapper = /<BackOfficeWorkspacePage spotlight=\{spotlight\}/.test(src);
    const ownFrame = /<ScreenFrame\s+archetype="workspace"/.test(src) && /\{spotlight \? \(/.test(src);
    expect(viaWrapper || ownFrame).toBe(true);
  });

  it('BackOfficeTabs is never moved inside ScreenFrame (it stays the section tab bar above it)', () => {
    for (const f of [...files, path.join(ROOT, 'BackOfficeWorkspacePage.tsx')]) {
      // comments may name the tags; only the JSX counts
      const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const m of src.matchAll(/<ScreenFrame[\s\S]*?<\/ScreenFrame>/g)) {
        expect(m[0], path.relative(ROOT, f)).not.toContain('<BackOfficeTabs');
      }
    }
  });

  it('the wrapper renders BackOfficePage unchanged when the flag is off', () => {
    const src = fs.readFileSync(path.join(ROOT, 'BackOfficeWorkspacePage.tsx'), 'utf8');
    expect(src).toContain('return spotlight ? <BackOfficeWorkspaceFrame {...props} /> : <BackOfficePage {...props} />;');
  });
});
