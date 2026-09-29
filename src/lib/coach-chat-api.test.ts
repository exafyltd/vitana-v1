/**
 * VTID-04448: the Health Coach chat goes through the gateway conversation API,
 * and the Gemini memory edge functions it used to call are gone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.mock('@/lib/community-gateway', () => ({
  communityFetch: (...args: unknown[]) => fetchMock(...args),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 't',
            user: { id: 'user-1', app_metadata: { active_tenant_id: 'tenant-1' } },
          },
        },
      }),
    },
  },
}));

import { sendCoachMessage } from './coach-chat-api';

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

describe('sendCoachMessage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    sessionStorage.clear();
  });

  it('posts one text turn to /api/v1/conversation/turn with the caller ids and language', async () => {
    fetchMock.mockResolvedValue(ok({ ok: true, reply: 'Hallo!', thread_id: 'th-1' }));
    const r = await sendCoachMessage('Wie schlafe ich besser?', 'de-DE');
    expect(r).toEqual({ reply: 'Hallo!', threadId: 'th-1' });
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/v1/conversation/turn');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      channel: 'orb',
      user_id: 'user-1',
      tenant_id: 'tenant-1',
      lang: 'de',
      message: { type: 'text', text: 'Wie schlafe ich besser?' },
      ui_context: { surface: 'orb', screen: 'health_coach' },
    });
    expect(body.thread_id).toBeUndefined();
  });

  it('continues the same thread on the next message', async () => {
    fetchMock.mockResolvedValue(ok({ ok: true, reply: 'a', thread_id: 'th-9' }));
    await sendCoachMessage('one', 'en');
    await sendCoachMessage('two', 'en');
    const body = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(body.thread_id).toBe('th-9');
  });

  it('throws on a refusal so the chat can show an error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ ok: false, error: 'IDENTITY_MISMATCH' }) });
    await expect(sendCoachMessage('x', 'en')).rejects.toThrow('IDENTITY_MISMATCH');
  });

  it('throws when the reply is missing', async () => {
    fetchMock.mockResolvedValue(ok({ ok: true }));
    await expect(sendCoachMessage('x', 'en')).rejects.toThrow();
  });
});

describe('the Gemini memory edge functions are gone (tree guard)', () => {
  const REMOVED = [
    'ai-chat',
    'search-memories',
    'reinforce-memory',
    'generate-memory-embedding',
    'extract-diary-insights',
    'extract-user-interests',
    'refresh-memory-metadata',
  ];

  it('no source file invokes them and no function directory remains', async () => {
    const { readdirSync, readFileSync, statSync, existsSync } = await import('fs');
    const { join } = await import('path');
    for (const name of REMOVED) {
      expect(existsSync(join('supabase/functions', name))).toBe(false);
    }
    const offenders: string[] = [];
    const pattern = new RegExp(`(functions\\.invoke\\(|/functions/v1/)['"\`]?(${REMOVED.join('|')})['"\`/]`);
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry !== 'node_modules') walk(full);
        } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
          if (pattern.test(readFileSync(full, 'utf8'))) offenders.push(full);
        }
      }
    };
    walk('src');
    walk('supabase/functions');
    expect(offenders).toEqual([]);
  });

  it('config.toml declares none of them', async () => {
    const { readFileSync } = await import('fs');
    const toml = readFileSync('supabase/config.toml', 'utf8');
    for (const name of REMOVED) {
      expect(toml).not.toContain(`[functions.${name}]`);
    }
  });
});
