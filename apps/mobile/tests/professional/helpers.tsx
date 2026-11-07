/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — test harness for
 * the eight `/professional/*` screens. The only call these screens make is the
 * one the web's `<ProtectedRoute requiredRole="professional">` makes through
 * `useRole()`: the `get_role_preference` RPC. It is answered by the in-memory
 * Supabase double (tests/helpers/supabase-double.ts), which records every call
 * and never touches a network (`../helpers/no-network` replaces `fetch` with a
 * thrower in every lane test). Nothing is written anywhere.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactElement, ReactNode } from 'react';
import { configure, render } from '@testing-library/react-native';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { UIProvider } from '../../src/ports/ui';
import { __resetProfessionalGateForTests } from '../../src/screens/professional/ProfessionalGate';

// Every professional test imports this harness: give findBy*/waitFor 5 s
// instead of RNTL's 1 s default so the suite holds under default-worker load.
configure({ asyncUtilTimeout: 5000 });
// Chained 5 s waits must fit inside the test's own budget (Jest default 5 s).
jest.setTimeout(30000);

afterEach(() => {
  __resetProfessionalGateForTests();
});

export type RoleAnswer = { role: string } | { error: string } | 'pending';

export function createProfessionalSupabase(opts: { role?: RoleAnswer; exafyAdmin?: boolean; userId?: string } = {}) {
  const userId = opts.userId ?? 'u-pro';
  const answer: RoleAnswer = opts.role ?? { role: 'professional' };
  return createSupabaseDouble({
    session: fakeSession(userId, {
      user: { id: userId, app_metadata: { active_tenant_id: 't-maxina', ...(opts.exafyAdmin ? { exafy_admin: true } : {}) }, user_metadata: {} },
    }),
    tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }] },
    rpc: {
      get_role_preference: (): any => {
        if (answer === 'pending') return new Promise(() => undefined);
        if ('error' in answer) return { data: null, error: { message: answer.error } };
        return { data: [{ role: answer.role }], error: null };
      },
    },
  });
}

export function renderProfessional(
  ui: ReactElement,
  opts: { supabase?: ReturnType<typeof createProfessionalSupabase>; language?: string; direction?: 'ltr' | 'rtl'; gateway?: Record<string, unknown> } = {},
) {
  const supabase = opts.supabase ?? createProfessionalSupabase();
  const Base = makeWrapper({ client: supabase.client, language: opts.language ?? 'de-DE', themeMode: 'light', gateway: opts.gateway });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Base>
        <UIProvider colorScheme="light" direction={opts.direction ?? 'ltr'}>
          {children}
        </UIProvider>
      </Base>
    );
  }
  return { ...render(ui, { wrapper: Wrapper }), supabase };
}

/** Every rendered string, accessibility label and title under `root`. */
export function strings(root: any): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    for (const k of ['accessibilityLabel', 'placeholder', 'title']) if (typeof n.props?.[k] === 'string') out.push(n.props[k]);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}
