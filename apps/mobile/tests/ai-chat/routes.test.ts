/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — the lane's one ledger row is
 * native: `/comm/talk-to-vitana` (and its `?ticket=` deep link) resolves to the
 * concrete route file, which exists on a cold start, and the ledger says
 * `native`. Red on origin/main (row `not_started`, route file missing).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';

const APP = join(__dirname, '../../app');
const ledger = JSON.parse(readFileSync(join(__dirname, '../../parity/ledger.json'), 'utf8')) as {
  rows: Array<{ key: string; web_path: string; status: string; lane: string }>;
};

describe('ai-chat row is native', () => {
  it('COMM.TALK_TO_VITANA is native in the ledger', () => {
    const row = ledger.rows.find((r) => r.key === 'COMM.TALK_TO_VITANA');
    expect(row?.web_path).toBe('/comm/talk-to-vitana');
    expect(row?.lane).toBe('ai');
    expect(row?.status).toBe('native');
  });

  it.each(['/comm/talk-to-vitana', '/comm/talk-to-vitana?ticket=FB-0042'])('%s resolves to the native route, query kept', (path) => {
    const r = resolveWebPath(path);
    expect(r.kind).toBe('native');
    expect(r.href).toBe(path);
  });

  it('the route file exists and is listed as a native route', () => {
    expect(existsSync(join(APP, '(app)/comm/talk-to-vitana.tsx'))).toBe(true);
    expect(NATIVE_ROUTES).toContain('/comm/talk-to-vitana');
  });
});
