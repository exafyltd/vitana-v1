/**
 * VTID-04765: the gate between erase_user_data() and deleting the auth user.
 * Lives under src/ because the module is in supabase/functions/_shared, which
 * has no Deno test harness (same arrangement as storage-bridge-client.test.ts).
 */

import { describe, it, expect } from 'vitest';
import { decideAfterErase } from '../../supabase/functions/_shared/erase-user-data';

describe('VTID-04765 decideAfterErase', () => {
  it('deletes the account once every table was erased', () => {
    const d = decideAfterErase(null, {
      deleted: { memory_facts: 12, diary_entries: 3 },
      retained: ['wallet_ledger_entries'],
      errors: {},
      passes: 2,
    });
    expect(d).toEqual({ proceed: true, erased: true, detail: 'erased 15 rows from 2 tables' });
  });

  it('keeps the account when any table could not be erased', () => {
    const d = decideAfterErase(null, { deleted: { memory_facts: 1 }, errors: { locked_rows: 'locked by policy' } });
    expect(d.proceed).toBe(false);
    expect(d.detail).toContain('locked_rows');
  });

  it('keeps the account when the RPC itself fails', () => {
    expect(decideAfterErase({ code: '57014', message: 'canceling statement due to statement timeout' }, null).proceed).toBe(false);
  });

  it('keeps the account when the RPC returns nothing', () => {
    expect(decideAfterErase(null, null).proceed).toBe(false);
  });

  it('falls back to the old behaviour while the migration is not deployed yet', () => {
    for (const code of ['PGRST202', '42883']) {
      const d = decideAfterErase({ code, message: 'Could not find the function' }, null);
      expect(d).toMatchObject({ proceed: true, erased: false });
    }
  });
});
