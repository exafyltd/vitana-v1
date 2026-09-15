import { describe, it, expect, vi } from 'vitest';
import { parseSseChunk, consumeSseRelay } from './sse-relay-client';

describe('parseSseChunk', () => {
  it('parses a single complete event with id/event/data', () => {
    const { events, remainder } = parseSseChunk('id: 1\nevent: user_notification\ndata: {"a":1}\n\n');
    expect(events).toEqual([{ id: '1', event: 'user_notification', data: '{"a":1}' }]);
    expect(remainder).toBe('');
  });

  it('defaults event to "message" when no event: line is present', () => {
    const { events } = parseSseChunk('data: hello\n\n');
    expect(events).toEqual([{ id: null, event: 'message', data: 'hello' }]);
  });

  it('skips comment/heartbeat lines starting with ":"', () => {
    const { events } = parseSseChunk(': heartbeat 2026-01-01\n\ndata: real\n\n');
    expect(events).toEqual([{ id: null, event: 'message', data: 'real' }]);
  });

  it('carries an incomplete trailing block over as the remainder', () => {
    const { events, remainder } = parseSseChunk('data: complete\n\nid: 2\nevent: x\ndata: partial');
    expect(events).toEqual([{ id: null, event: 'message', data: 'complete' }]);
    expect(remainder).toBe('id: 2\nevent: x\ndata: partial');
  });

  it('joins multi-line data: fields with a newline', () => {
    const { events } = parseSseChunk('data: line1\ndata: line2\n\n');
    expect(events).toEqual([{ id: null, event: 'message', data: 'line1\nline2' }]);
  });

  it('parses multiple complete events from one chunk, in order', () => {
    const { events } = parseSseChunk('data: first\n\ndata: second\n\n');
    expect(events.map((e) => e.data)).toEqual(['first', 'second']);
  });

  it('strips a trailing \\r from each line (CRLF tolerance)', () => {
    const { events } = parseSseChunk('id: 1\r\nevent: x\r\ndata: y\r\n\r\n');
    expect(events).toEqual([{ id: '1', event: 'x', data: 'y' }]);
  });
});

function makeFetchMock(chunks: string[], opts: { ok?: boolean; status?: number } = {}) {
  let i = 0;
  const encoder = new TextEncoder();
  const reader = {
    read: vi.fn(async () => {
      if (i < chunks.length) {
        return { done: false, value: encoder.encode(chunks[i++]) };
      }
      return { done: true, value: undefined };
    }),
    releaseLock: vi.fn(),
  };
  return vi.fn().mockResolvedValue({
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    body: { getReader: () => reader },
  });
}

describe('consumeSseRelay', () => {
  it('sends the bearer token and invokes onEvent for each parsed event', async () => {
    const fetchMock = makeFetchMock(['event: connected\ndata: {}\n\n', 'event: user_notification\ndata: {"id":"n1"}\n\n']);
    vi.stubGlobal('fetch', fetchMock);

    const onEvent = vi.fn();
    await consumeSseRelay('https://gw/api/v1/realtime/user-notifications/stream', 'jwt-123', { onEvent });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw/api/v1/realtime/user-notifications/stream',
      expect.objectContaining({ headers: { Authorization: 'Bearer jwt-123' } }),
    );
    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenNthCalledWith(2, { id: null, event: 'user_notification', data: '{"id":"n1"}' });
    vi.unstubAllGlobals();
  });

  it('reassembles an event split across two chunks', async () => {
    const fetchMock = makeFetchMock(['event: user_notification\ndata: {"i', 'd":"n1"}\n\n']);
    vi.stubGlobal('fetch', fetchMock);

    const onEvent = vi.fn();
    await consumeSseRelay('https://gw/x', 'jwt', { onEvent });

    expect(onEvent).toHaveBeenCalledWith({ id: null, event: 'user_notification', data: '{"id":"n1"}' });
    vi.unstubAllGlobals();
  });

  it('throws when the response is not ok', async () => {
    const fetchMock = makeFetchMock([], { ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(consumeSseRelay('https://gw/x', 'jwt', { onEvent: vi.fn() })).rejects.toThrow('404');
    vi.unstubAllGlobals();
  });

  it('routes an onEvent handler exception to onError instead of throwing out of the loop', async () => {
    const fetchMock = makeFetchMock(['data: a\n\ndata: b\n\n']);
    vi.stubGlobal('fetch', fetchMock);

    const onEvent = vi.fn().mockImplementationOnce(() => { throw new Error('boom'); });
    const onError = vi.fn();
    await consumeSseRelay('https://gw/x', 'jwt', { onEvent, onError });

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
