/**
 * Regression test for VTID-03801 — the Chinese Notification Settings screen
 * stayed in German regardless of the selected language.
 *
 * Root cause: this hook fetched `/notifications/category-preferences` with
 * no `?locale=` param, so the gateway resolved locale via its own 5-minute
 * server-side cache (`getUserLocale`) instead of the language the widget was
 * actually showing. The React Query cache key also had no locale component,
 * so even after the gateway cache expired, a stale German response stayed
 * cached client-side for any user who had ever loaded the screen once.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockUseAuth = vi.fn();
vi.mock('@/context/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'test-jwt' } },
      })),
    },
  },
}));

import { useNotificationCategoryPreferences } from '@/hooks/useNotificationCategoryPreferences';

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function grouped() {
  return { chat: [], calendar: [], community: [] };
}

describe('useNotificationCategoryPreferences locale (VTID-03801)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: grouped() }),
      })),
    );
  });

  it('passes the live selected language as ?locale= — not left to the gateway default', async () => {
    mockUseLanguage.mockReturnValue({ selectedLanguage: 'zh-CN' });
    const qc = new QueryClient();
    renderHook(() => useNotificationCategoryPreferences(), { wrapper: wrapper(qc) });

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/notifications/category-preferences?locale=zh');
  });

  it('keys the cache by language, so switching from German to Chinese refetches', async () => {
    const qc = new QueryClient();

    mockUseLanguage.mockReturnValue({ selectedLanguage: 'de-DE' });
    const { rerender } = renderHook(() => useNotificationCategoryPreferences(), {
      wrapper: wrapper(qc),
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('locale=de');

    mockUseLanguage.mockReturnValue({ selectedLanguage: 'zh-CN' });
    rerender();

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toContain('locale=zh');
  });
});
