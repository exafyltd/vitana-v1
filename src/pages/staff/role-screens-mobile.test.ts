/**
 * VTID-04001 — source-check: the professional/staff routes without a screen
 * render ComingSoonPlaceholder (translated at render), never inline JSX
 * evaluated in App's own render (which froze the boot-time de-DE locale);
 * and the staff queue cards wrap on a phone.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('role screens on mobile (VTID-04001)', () => {
  it('no professional/staff route carries an inline title+subtitle stub any more', () => {
    const app = read('src/App.tsx');
    expect(app).not.toContain('<AppLayout><div className="p-6"><h1');
    for (const path of ['/professional/schedule', '/professional/tools', '/professional/referrals', '/professional/billing', '/professional/profile', '/professional/education', '/staff/tasks', '/staff/schedule', '/staff/reports', '/staff/communications', '/staff/tools', '/staff/time']) {
      const i = app.indexOf(`<Route path="${path}" element={`);
      expect(i).toBeGreaterThan(-1);
      const block = app.slice(i, i + 700);
      expect(block).toMatch(/<ComingSoonPlaceholder icon=\{\w+\} titleKey="screens\.common\.\w+" \/>/);
    }
  });

  it('the staff queue cards stack their actions under wrapping metadata below sm', () => {
    const q = read('src/pages/staff/Queue.tsx');
    expect(q.split('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between').length - 1).toBe(3);
    expect(q.split('flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground').length - 1).toBe(3);
    expect(q).not.toContain('<div className="flex justify-between items-center">');
    expect(q).toContain('<CardTitle className="truncate text-lg">');
  });

  it('the role pages leave room for the fixed bottom bar so the last card stays reachable', () => {
    for (const f of ['src/pages/staff/Queue.tsx', 'src/pages/staff/Dashboard.tsx', 'src/pages/professional/Dashboard.tsx']) {
      expect(read(f)).toContain('<div className="p-6 pb-28 md:pb-6 space-y-6">');
    }
  });
});
