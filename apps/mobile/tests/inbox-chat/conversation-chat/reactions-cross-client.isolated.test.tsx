/**
 * Full emoji reactions — cross-client check, MOBILE half, against an ISOLATED
 * local database (Postgres + PostgREST started by the validation harness; never a
 * shared or live system). Opt-in: it runs only when ISODB_REST_URL points at
 * 127.0.0.1, so CI and normal `npm test` skip it.
 *
 * Steps (ISODB_STEP):
 *   mobile-add    — Alice long-presses a message, taps "+", picks 🍎 (outside the
 *                   six shortcuts); the row is in the database; a fresh bubble
 *                   (reload) shows 🍎.
 *   mobile-verify — after the web half removed 🍎 and toggled the legacy heart:
 *                   a fresh bubble shows no 🍎 and the pre-existing heart once.
 * The web half is src/lib/reactions/reactions-cross-client.isolated.test.tsx.
 */
import './mocks';
import http from 'node:http';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PostgrestClient } from '@supabase/postgrest-js';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { MessageBubble } from '../../../src/screens/chat/MessageBubble';
import type { ChatViewMessage } from '../../../src/screens/chat/data/types';
import { createChatDouble, makeChatWrapper } from './helpers';

jest.mock('../../../src/screens/chat/data/reactionEmoji', () => ({
  ...jest.requireActual('../../../src/screens/chat/data/reactionEmoji'),
  REACTION_PICKER_ENABLED: true, // the flag stays false in the app; the isolated check turns it on in-process only
}));

const REST = process.env.ISODB_REST_URL ?? '';
const STEP = process.env.ISODB_STEP ?? '';
const isolated = /^http:\/\/127\.0\.0\.1:\d+$/.test(REST);
const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const MSG = '33333333-3333-4333-8333-333333333333';
const APPLE = '\u{1F34E}';
const HEART = '\u2764\uFE0F';

jest.setTimeout(60_000);
afterAll(() => __setSupabaseForTests(null));

/** Minimal fetch over node:http, for 127.0.0.1 only. */
function localFetch(input: string | URL, init: { method?: string; headers?: Record<string, string> | Headers; body?: string } = {}) {
  const url = new URL(String(input));
  if (url.hostname !== '127.0.0.1') throw new Error(`refusing non-local host ${url.hostname}`);
  const headers: Record<string, string> = {};
  const h = init.headers as any;
  if (h && typeof h.forEach === 'function') h.forEach((v: string, k: string) => (headers[k] = v));
  else Object.assign(headers, h ?? {});
  return new Promise<any>((resolve, reject) => {
    const req = http.request(url, { method: init.method ?? 'GET', headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
          status: res.statusCode,
          statusText: res.statusMessage ?? '',
          headers: { get: (k: string) => (res.headers[k.toLowerCase()] as string | undefined) ?? null },
          text: async () => body,
          json: async () => JSON.parse(body),
        });
      });
    });
    req.on('error', reject);
    if (init.body) req.write(init.body);
    req.end();
  });
}

function dbAs(jwt: string) {
  return new PostgrestClient(REST, { headers: { Authorization: `Bearer ${jwt}` }, fetch: localFetch as never });
}

async function myRows(jwt: string, user: string) {
  const { data, error } = await dbAs(jwt).from('message_reactions').select('emoji, user_id').eq('message_id', MSG).eq('user_id', user);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ emoji: string }>;
}

const message: ChatViewMessage = {
  id: MSG,
  thread_id: BOB,
  sender_id: ALICE,
  body: 'hello',
  message_type: 'text',
  created_at: '2026-11-17T09:00:00.000Z',
  sender: { user_id: ALICE, display_name: 'Alice (mobile)' },
};

/** Mobile app as Alice: the real bubble, its real reactions hook, PostgREST to the isolated DB. */
function openAsAlice() {
  const jwt = process.env.ISODB_JWT_ALICE ?? '';
  const d = createChatDouble({ userId: ALICE });
  const db = dbAs(jwt);
  const client = { ...d.client, from: (t: string) => db.from(t), rpc: (fn: string, args: unknown) => db.rpc(fn, args as never) };
  __setSupabaseForTests(client as never);
  return render(<MessageBubble message={message} isOwn userId={ALICE} showSender showTime parent={null} parentUnavailable={false} />, {
    wrapper: makeChatWrapper({ client }),
  });
}

(isolated ? describe : describe.skip)('cross-client reactions — mobile half (isolated database)', () => {
  (STEP === 'mobile-add' ? it : it.skip)('adds 🍎 from the full picker; the database has it; a reload shows it', async () => {
    const jwt = process.env.ISODB_JWT_ALICE ?? '';
    expect(await myRows(jwt, ALICE)).not.toContainEqual(expect.objectContaining({ emoji: APPLE }));
    const view = openAsAlice();
    fireEvent(screen.getByTestId(`bubble-body-${MSG}`), 'longPress');
    fireEvent.press(screen.getByTestId('reaction-more-emojis', { includeHiddenElements: true }));
    expect(screen.getByTestId('emoji-picker')).toBeTruthy();
    fireEvent.press(screen.getByTestId('emoji-tab-food', { includeHiddenElements: true }));
    await act(async () => {
      fireEvent.press(screen.getByTestId(`emoji-${APPLE}`, { includeHiddenElements: true }));
    });
    await waitFor(async () => expect(await myRows(jwt, ALICE)).toContainEqual(expect.objectContaining({ emoji: APPLE })));
    view.unmount();

    openAsAlice(); // reload: a fresh bubble reads the reactions from the database
    await waitFor(() => expect(screen.getByTestId(`reaction-${APPLE}`)).toBeTruthy());
    console.log(`[mobile-add] database row for ${APPLE} by Alice present; reloaded bubble shows ${APPLE}`);
  });

  (STEP === 'mobile-verify' ? it : it.skip)('after the web removal, a reload shows no 🍎 and the existing heart once', async () => {
    const jwt = process.env.ISODB_JWT_ALICE ?? '';
    expect(await myRows(jwt, ALICE)).not.toContainEqual(expect.objectContaining({ emoji: APPLE }));
    openAsAlice();
    await waitFor(() => expect(screen.getByTestId(`reaction-${HEART}`)).toBeTruthy());
    expect(screen.queryByTestId(`reaction-${APPLE}`)).toBeNull();
    expect(screen.getAllByTestId(/^reaction-\u2764/)).toHaveLength(1);
    console.log(`[mobile-verify] reloaded bubble: no ${APPLE}; one heart chip`);
  });
});
