/**
 * VTID-04360 — the supervisor feedback screens carry no hardcoded English;
 * every label they use exists in every shipped locale.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ADMIN_TICKET_STATUSES } from './admin-ticket-labels';

const LOCALES = ['de', 'en', 'es', 'sr', 'fr', 'pl', 'pt', 'ru', 'tr', 'zh', 'ar'];
const root = path.join(__dirname, '..', '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const catalog = (l: string) => JSON.parse(read(`i18n/${l}/supportTickets.json`)).supportTickets;

// `_pending_review` (and any `_`-prefixed key) is the translate pipeline's
// metadata, not a label — skip it, as backoffice-navigation.test.ts does.
function flatKeys(o: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatKeys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('admin feedback labels', () => {
  it('every locale has the same admin / adminList keys as English', () => {
    const en = catalog('en');
    const enKeys = [...flatKeys(en.admin, 'admin.'), ...flatKeys(en.adminList, 'adminList.')].sort();
    for (const l of LOCALES) {
      const c = catalog(l);
      const keys = [...flatKeys(c.admin, 'admin.'), ...flatKeys(c.adminList, 'adminList.')].sort();
      expect({ l, keys }).toEqual({ l, keys: enKeys });
    }
  });

  it('every status the screens can show has a label', () => {
    const en = catalog('en');
    for (const s of ADMIN_TICKET_STATUSES) expect(en.admin.status[s]).toBeTruthy();
  });

  it('the drawer and the list page no longer hold English label maps', () => {
    for (const f of ['pages/admin/feedback/TicketActionDrawer.tsx', 'pages/admin/feedback/Feedback.tsx']) {
      const src = read(f);
      expect(src).not.toMatch(/STATUS_LABEL|"Run failed|"Activating…"|"Rolling back…"|"Approving…"|Code defect —/);
    }
  });

  it('the retired NewTicketPopup is gone from the screen registry', () => {
    expect(fs.readFileSync(path.join(root, '..', 'docs', 'SCREEN_REGISTRY.md'), 'utf8')).not.toContain('NewTicketPopup');
  });
});
