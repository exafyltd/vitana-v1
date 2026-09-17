/**
 * VTID-03976 — closes the remaining latent instances of the mobile-context
 * bug `useSmartRouting.mobile.test.ts` (VTID-03936) already pins for
 * `useSmartRouting`/`useRoleRouteEnforcement`: `useRole()`'s `currentRole`
 * is deliberately forced to `'community'` on mobile viewports for
 * permissioning (see `useRole.tsx`'s own comment), but these four
 * components were reading `currentRole` for an UNRELATED decision — global
 * vs. tenant-scoped directory search / messaging context — where the real
 * role is what matters, not the mobile permission pin. A mobile
 * patient/professional/staff/admin got treated as an anonymous community
 * member for search/messaging scope on every affected screen.
 *
 * A full `renderHook`/RTL pass on these four components would need heavy
 * Supabase/Tenant/Auth mocking for marginal extra confidence over a direct
 * source check — this repo already has the precedent for pinning this
 * exact defect shape via a source read (`sidebar.rtl.test.ts`,
 * `AboutDrawer.save-guard.test.ts`), so this follows that pattern: assert
 * `currentRole` no longer appears anywhere in each file, and `dbRole` does.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const FILES = [
  'src/components/contacts/AddContactDialog.tsx',
  'src/components/payment/GlobalPaymentRequest.tsx',
  'src/components/payment/GlobalSendFunds.tsx',
  'src/components/NewConversationPopup.tsx',
];

describe('mobile-context currentRole -> dbRole fix (VTID-03976)', () => {
  for (const file of FILES) {
    describe(file, () => {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8');

      it('no longer reads currentRole anywhere', () => {
        expect(src).not.toContain('currentRole');
      });

      it('reads dbRole from useRole() instead', () => {
        expect(src).toMatch(/const\s*\{\s*dbRole\s*\}\s*=\s*useRole\(\)/);
      });
    });
  }

  it('AddContactDialog: both global/tenant search branches now key off dbRole', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/components/contacts/AddContactDialog.tsx'), 'utf8');
    const matches = src.match(/const isGlobalContext = dbRole === 'community';/g) ?? [];
    // One in searchUsers(), one in the prefilledUserId auto-search effect.
    expect(matches.length).toBe(2);
  });

  it('NewConversationPopup: effectiveContext derivation keys off dbRole', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/components/NewConversationPopup.tsx'), 'utf8');
    expect(src).toContain("const effectiveContext = context || (dbRole === 'community' ? 'global' : 'tenant');");
  });
});
