/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — the 14 ledger rows of
 * this lane are native: each web destination (with its `?tab=` variants)
 * resolves to a concrete native route file, and the ledger says `native`.
 * Red on origin/main (every row `not_started`, the three route files missing).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { resolveWebPath } from '../../src/navigation/resolve';

const APP = join(__dirname, '../../app');
const ledger = JSON.parse(readFileSync(join(__dirname, '../../parity/ledger.json'), 'utf8')) as {
  rows: Array<{ key: string; web_path: string; status: string }>;
};

const ROWS: Record<string, string> = {
  'SETTINGS.SUPPORT': '/support',
  'SETTINGS.SUPPORT_CONTACT': '/support?tab=contact',
  'SETTINGS.SUPPORT_COMMUNITY': '/support?tab=community',
  'SETTINGS.SUPPORT_FAQ': '/support?tab=faqs',
  'SETTINGS.SOCIAL': '/connectors',
  'CONNECTORS.AGENT': '/connectors?tab=agent',
  'CONNECTORS.AI': '/connectors?tab=ai',
  'CONNECTORS.FITNESS': '/connectors?tab=fitness',
  'CONNECTORS.HEALTH': '/connectors?tab=health',
  'CONNECTORS.MEDIA': '/connectors?tab=media',
  'CONNECTORS.OTHER': '/connectors?tab=other',
  'CONNECTORS.PRODUCTIVITY': '/connectors?tab=productivity',
  'CONNECTORS.SOCIAL': '/connectors?tab=social',
  'SETTINGS.CONNECTED_APPS': '/settings/connected-apps',
};

describe('support-connectors rows are native', () => {
  it.each(Object.entries(ROWS))('%s (%s) is native in the ledger', (key, path) => {
    const row = ledger.rows.find((r) => r.key === key);
    expect(row?.web_path).toBe(path);
    expect(row?.status).toBe('native');
  });

  it.each(Object.values(ROWS))('%s resolves to a native route, query kept', (path) => {
    const r = resolveWebPath(path);
    expect(r.kind).toBe('native');
    expect(r.href).toBe(path);
  });

  it.each(['(app)/support.tsx', '(app)/connectors.tsx', '(app)/settings/connected-apps.tsx'])('route file app/%s exists', (file) => {
    expect(existsSync(join(APP, file))).toBe(true);
  });
});
