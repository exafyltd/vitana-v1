/**
 * VTID-05458 — the embedded 1:1 call, driven by MOCKED signalling (a fake
 * realtime client; no real call, no media):
 *  - state machine: idle → outgoing ('calling') → connected ('active') → ended;
 *    incoming → accept / decline; no answer in 30 s;
 *  - the broadcasts built for each step (channel, event, payload);
 *  - CallManager renders the incoming-call modal, the "Calling…" screen and
 *    the in-call screen per state; the in-call screen without a WebRTC engine
 *    ends the call like the web does when media cannot start; with a fake
 *    engine it joins room:<callId> and shows the duration once a stream arrives.
 */
import '../../helpers/no-network';
import './mocks';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { __clearToastsForTests, __toastsForTests } from '../../../src/ports/ui';
import { registerWebRTCEngine, type MediaStreamLike, type PeerConnectionLike, type WebRTCEngine } from '../../../src/ports/webrtc';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { CALL_TIMEOUT_MS, useCallState, type CallData } from '../../../src/screens/chat/calls/useCallState';
import { CallManager, CallProvider, formatDuration, MessengerCall } from '../../../src/screens/chat/calls/CallProvider';
import { createChatDouble, makeChatWrapper, ME, PEER } from './helpers';

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  registerWebRTCEngine(null);
  __clearToastsForTests();
  jest.useRealTimers();
});

const incoming: CallData = { callId: 'call_1', callerId: PEER, recipientId: ME, isVideoCall: false, state: 'calling', callerName: 'Petra Peer', recipientName: 'Mia Me' };

function hook() {
  const d = createChatDouble({ tables: { profiles: [{ user_id: ME, display_name: 'Mia Me' }, { user_id: PEER, display_name: 'Petra Peer' }] } });
  const wrapper = makeChatWrapper({ client: d.client });
  const r = renderHook(() => useCallState(ME), { wrapper });
  return { d, r };
}

describe('useCallState (mocked signalling)', () => {
  it('subscribes to user:<me>:calls with presence key = me and tracks presence', () => {
    const { d } = hook();
    const ch = d.channels.get(`user:${ME}:calls`);
    expect(ch?.opts).toEqual({ config: { presence: { key: ME }, broadcast: { self: false } } });
    expect(ch?.track).toHaveBeenCalledWith(expect.objectContaining({ user_id: ME, online: true }));
  });

  it('incoming → accept: call-accepted on the caller channel, state active', async () => {
    const { d, r } = hook();
    act(() => d.emit(`user:${ME}:calls`, 'broadcast', 'incoming-call', incoming));
    expect(r.result.current.incomingCall?.callId).toBe('call_1');
    await act(async () => {
      await r.result.current.acceptCall(incoming);
    });
    expect(r.result.current.incomingCall).toBeNull();
    expect(r.result.current.activeCall).toMatchObject({ callId: 'call_1', state: 'active' });
    expect(d.broadcasts).toContainEqual({ channel: `user:${PEER}:calls`, event: 'call-accepted', payload: { ...incoming, state: 'active' } });
  });

  it('incoming → decline: call-rejected on the caller channel, nothing active', async () => {
    const { d, r } = hook();
    act(() => d.emit(`user:${ME}:calls`, 'broadcast', 'incoming-call', incoming));
    await act(async () => {
      await r.result.current.rejectCall(incoming);
    });
    expect(r.result.current.incomingCall).toBeNull();
    expect(r.result.current.activeCall).toBeNull();
    expect(d.broadcasts).toContainEqual({ channel: `user:${PEER}:calls`, event: 'call-rejected', payload: incoming });
  });

  it('an incoming call meant for someone else is ignored', () => {
    const { d, r } = hook();
    act(() => d.emit(`user:${ME}:calls`, 'broadcast', 'incoming-call', { ...incoming, recipientId: 'u-other' }));
    expect(r.result.current.incomingCall).toBeNull();
  });

  it('no answer in 30 s: call-no-answer to the caller, the modal closes', () => {
    jest.useFakeTimers();
    const { d, r } = hook();
    act(() => d.emit(`user:${ME}:calls`, 'broadcast', 'incoming-call', incoming));
    act(() => {
      jest.advanceTimersByTime(CALL_TIMEOUT_MS);
    });
    expect(r.result.current.incomingCall).toBeNull();
    expect(d.broadcasts).toContainEqual({ channel: `user:${PEER}:calls`, event: 'call-no-answer', payload: { ...incoming, state: 'no-answer' } });
  });

  it('idle → outgoing → connected → ended', async () => {
    jest.useFakeTimers();
    const { d, r } = hook();
    expect(r.result.current.activeCall).toBeNull();
    let callId = '';
    await act(async () => {
      const p = r.result.current.startCall(PEER, true);
      await jest.advanceTimersByTimeAsync(600);
      callId = await p;
    });
    expect(r.result.current.activeCall).toMatchObject({ callId, callerId: ME, recipientId: PEER, isVideoCall: true, state: 'calling', recipientName: 'Petra Peer' });
    const invite = d.broadcasts.find((b) => b.event === 'incoming-call');
    expect(invite?.channel).toBe(`user:${PEER}:calls`);
    expect(invite?.payload).toMatchObject({ callId, callerId: ME, recipientId: PEER, state: 'calling' });
    act(() => d.emit(`user:${ME}:calls`, 'broadcast', 'call-accepted', { ...invite?.payload, state: 'active' }));
    expect(r.result.current.activeCall?.state).toBe('active');
    await act(async () => {
      await r.result.current.endCall();
    });
    expect(r.result.current.activeCall).toBeNull();
    expect(d.broadcasts).toContainEqual(expect.objectContaining({ channel: `user:${PEER}:calls`, event: 'call-ended' }));
  });

  it('outgoing → rejected by the other side clears the call', async () => {
    jest.useFakeTimers();
    const { d, r } = hook();
    await act(async () => {
      const p = r.result.current.startCall(PEER, false);
      await jest.advanceTimersByTimeAsync(600);
      await p;
    });
    const invite = d.broadcasts.find((b) => b.event === 'incoming-call')?.payload;
    act(() => d.emit(`user:${ME}:calls`, 'broadcast', 'call-rejected', invite));
    expect(r.result.current.activeCall).toBeNull();
  });

  it('a broadcast that fails three times ends the outgoing call with an error', async () => {
    jest.useFakeTimers();
    const d = createChatDouble({ sendResult: 'error' });
    const r = renderHook(() => useCallState(ME), { wrapper: makeChatWrapper({ client: d.client }) });
    let err: unknown = null;
    await act(async () => {
      const p = r.result.current.startCall(PEER, false).catch((e: unknown) => {
        err = e;
      });
      await jest.advanceTimersByTimeAsync(5000);
      await p;
    });
    expect(String(err)).toMatch(/after 3 attempts/);
    expect(r.result.current.activeCall).toBeNull();
    expect(d.broadcasts.filter((b) => b.event === 'incoming-call')).toHaveLength(3);
  });
});

function managerTree(d: ReturnType<typeof createChatDouble>) {
  const Wrapper = makeChatWrapper({ client: d.client });
  return ({ children }: { children: ReactNode }) => (
    <Wrapper>
      <CallProvider userId={ME}>
        {children}
        <CallManager userId={ME} />
      </CallProvider>
    </Wrapper>
  );
}

describe('CallManager screens per state', () => {
  it('incoming call: the modal with caller, accept and decline; the toast is raised', async () => {
    const d = createChatDouble();
    render(<></>, { wrapper: managerTree(d) });
    act(() => d.emit(`user:${ME}:calls`, 'broadcast', 'incoming-call', incoming));
    expect(screen.getByTestId('incoming-call-modal-modal', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Petra Peer', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Incoming audio call…', { includeHiddenElements: true })).toBeTruthy();
    expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.common.incomingCall');
    await act(async () => {
      fireEvent.press(screen.getByTestId('incoming-call-reject', { includeHiddenElements: true }));
    });
    await waitFor(() => expect(screen.queryByText('Incoming audio call…', { includeHiddenElements: true })).toBeNull());
  });

  it('accept → the in-call screen; without a WebRTC engine it shows "Connection failed" and ends the call', async () => {
    jest.useFakeTimers();
    const d = createChatDouble();
    render(<></>, { wrapper: managerTree(d) });
    act(() => d.emit(`user:${ME}:calls`, 'broadcast', 'incoming-call', incoming));
    await act(async () => {
      fireEvent.press(screen.getByTestId('incoming-call-accept', { includeHiddenElements: true }));
    });
    expect(screen.getByTestId('messenger-call')).toBeTruthy();
    expect(screen.getByTestId('call-status').props.children).toBe('Initializing…');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4100);
    });
    expect(screen.getByTestId('call-status').props.children).toBe('Connection failed');
    expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.common.connectionError');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2100);
    });
    expect(screen.queryByTestId('messenger-call')).toBeNull();
    expect(d.broadcasts).toContainEqual(expect.objectContaining({ channel: `user:${PEER}:calls`, event: 'call-ended' }));
  });

  it('outgoing call shows the "Calling…" screen with End call', async () => {
    jest.useFakeTimers();
    const d = createChatDouble();
    let start: ((id: string, video: boolean) => Promise<string>) | null = null;
    const { useCall } = jest.requireActual('../../../src/screens/chat/calls/CallProvider') as typeof import('../../../src/screens/chat/calls/CallProvider');
    function Grab() {
      start = useCall().startCall;
      return null;
    }
    render(<Grab />, { wrapper: managerTree(d) });
    await act(async () => {
      const p = (start as unknown as (id: string, v: boolean) => Promise<string>)(PEER, false);
      await jest.advanceTimersByTimeAsync(600);
      await p;
    });
    expect(screen.getByTestId('calling-screen')).toBeTruthy();
    expect(screen.getByTestId('calling-status').props.children[0]).toBe('Calling');
    await act(async () => {
      fireEvent.press(screen.getByTestId('calling-end'));
    });
    expect(screen.queryByTestId('calling-screen')).toBeNull();
  });
});

describe('MessengerCall with a fake WebRTC engine', () => {
  function fakeEngine() {
    const track = (kind: string) => ({ kind, enabled: true, stop: jest.fn() });
    const audio = track('audio');
    const stream: MediaStreamLike = { getTracks: () => [audio], getAudioTracks: () => [audio], getVideoTracks: () => [] };
    const pcs: PeerConnectionLike[] = [];
    const engine: WebRTCEngine = {
      getUserMedia: jest.fn(async () => stream),
      createPeerConnection: jest.fn(() => {
        const pc: PeerConnectionLike = {
          addTrack: jest.fn(),
          ontrack: null,
          onicecandidate: null,
          setRemoteDescription: jest.fn(async () => undefined),
          setLocalDescription: jest.fn(async () => undefined),
          createOffer: jest.fn(async () => ({ type: 'offer', sdp: 'o' })),
          createAnswer: jest.fn(async () => ({ type: 'answer', sdp: 'a' })),
          addIceCandidate: jest.fn(async () => undefined),
          close: jest.fn(),
        };
        pcs.push(pc);
        return pc;
      }),
    };
    return { engine, pcs, audio, stream };
  }

  it('joins room:<callId>, offers to a peer that joins, shows the duration once the remote stream arrives, mutes', async () => {
    const { engine, pcs, audio, stream } = fakeEngine();
    registerWebRTCEngine(engine);
    const d = createChatDouble();
    render(<MessengerCall callId="call_9" userId={ME} recipientId={PEER} recipientName="Petra Peer" isVideoCall={false} onEndCall={jest.fn()} />, {
      wrapper: makeChatWrapper({ client: d.client }),
    });
    await waitFor(() => expect(screen.getByTestId('call-status').props.children).toBe('Connecting…'));
    expect(engine.getUserMedia).toHaveBeenCalledWith({ video: false, audio: true });
    expect(d.channels.get('room:call_9')?.opts).toEqual({ config: { broadcast: { self: true } } });
    expect(d.broadcasts).toContainEqual({ channel: `user:${PEER}:calls`, event: 'webrtc-ready', payload: { call_id: 'call_9', from_user_id: ME } });
    await act(async () => {
      d.emit('room:call_9', 'presence', 'join', { newPresences: [{ user_id: PEER }] });
    });
    await waitFor(() => expect(d.broadcasts.some((b) => b.channel === 'room:call_9' && b.event === 'offer')).toBe(true));
    expect(d.broadcasts.find((b) => b.event === 'offer')?.payload).toEqual({ offer: { type: 'offer', sdp: 'o' }, from: ME, to: PEER });
    await act(async () => {
      pcs[0].ontrack?.({ streams: [stream] });
    });
    await waitFor(() => expect(screen.getByTestId('call-status').props.children).toBe(formatDuration(0)));
    fireEvent.press(screen.getByTestId('call-toggle-audio'));
    expect(audio.enabled).toBe(false);
    expect(screen.getByTestId('call-toggle-audio').props.accessibilityLabel).toBe('Unmute microphone');
  });

  it('answers an offer addressed to me', async () => {
    const { engine, pcs } = fakeEngine();
    registerWebRTCEngine(engine);
    const d = createChatDouble();
    render(<MessengerCall callId="call_8" userId={ME} recipientId={PEER} recipientName="Petra Peer" isVideoCall={false} onEndCall={jest.fn()} />, {
      wrapper: makeChatWrapper({ client: d.client }),
    });
    await waitFor(() => expect(d.channels.get('room:call_8')).toBeTruthy());
    await act(async () => {
      d.emit('room:call_8', 'broadcast', 'offer', { offer: { type: 'offer', sdp: 'x' }, from: PEER, to: ME });
    });
    await waitFor(() => expect(d.broadcasts.some((b) => b.event === 'answer')).toBe(true));
    expect(pcs[0].setRemoteDescription).toHaveBeenCalledWith({ type: 'offer', sdp: 'x' });
    expect(d.broadcasts.find((b) => b.event === 'answer')?.payload).toEqual({ answer: { type: 'answer', sdp: 'a' }, from: ME, to: PEER });
  });
});
