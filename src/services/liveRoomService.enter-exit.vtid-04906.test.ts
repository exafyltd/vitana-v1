/**
 * VTID-04906 (LR-B) — liveRoomService.enterRoom / exitRoom against the
 * gateway contract (mocked fetch; nothing leaves the process).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'jwt-1' } } }) } },
}));
vi.mock('@/lib/gateway-base', () => ({ GATEWAY_BASE: 'https://gw.test' }));

import { liveRoomService, LiveRoomEnterError, enterErrorCode } from './liveRoomService';

const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe('enterRoom', () => {
  it('POSTs /live/rooms/:id/enter with the user JWT and returns url + token', async () => {
    fetchMock.mockReturnValue(json(200, { ok: true, daily_room_url: 'https://d/r', token: 'tok', is_host: false, counts: { in_room: 2 } }));
    const res = await liveRoomService.enterRoom('room-1');
    expect(fetchMock).toHaveBeenCalledWith('https://gw.test/api/v1/live/rooms/room-1/enter', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer jwt-1' }),
    }));
    expect(res).toMatchObject({ daily_room_url: 'https://d/r', token: 'tok', is_host: false });
  });

  it.each([
    [409, { error: 'NOT_LIVE' }, 'NOT_LIVE'],
    [402, { error: 'PAYMENT_REQUIRED' }, 'PAYMENT_REQUIRED'],
    [401, {}, 'UNAUTHENTICATED'],
    [404, {}, 'NOT_FOUND'],
    [500, {}, 'UNKNOWN'],
  ])('maps HTTP %i to %s', async (status, body, code) => {
    fetchMock.mockReturnValue(json(status, body));
    await expect(liveRoomService.enterRoom('room-1')).rejects.toMatchObject({ name: 'LiveRoomEnterError', code, status });
  });

  it('refuses a 200 without a token (a private room cannot be joined without one)', async () => {
    fetchMock.mockReturnValue(json(200, { ok: true, daily_room_url: 'https://d/r' }));
    await expect(liveRoomService.enterRoom('room-1')).rejects.toBeInstanceOf(LiveRoomEnterError);
  });

  it('enterErrorCode prefers the gateway error code', () => {
    expect(enterErrorCode(400, 'NOT_LIVE')).toBe('NOT_LIVE');
    expect(enterErrorCode(403)).toBe('FORBIDDEN');
  });
});

describe('exitRoom', () => {
  it('POSTs /live/rooms/:id/exit, with keepalive when asked', async () => {
    fetchMock.mockReturnValue(json(200, { ok: true }));
    await liveRoomService.exitRoom('room-1', { keepalive: true });
    expect(fetchMock).toHaveBeenCalledWith('https://gw.test/api/v1/live/rooms/room-1/exit', expect.objectContaining({
      method: 'POST',
      keepalive: true,
      headers: expect.objectContaining({ Authorization: 'Bearer jwt-1' }),
    }));
  });
});
