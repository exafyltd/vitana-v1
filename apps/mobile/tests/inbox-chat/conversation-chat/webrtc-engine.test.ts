/**
 * VTID-05458 fix 1 — task 5: the embedded call's real WebRTC engine.
 * `src/ports/webrtc.ts` wraps react-native-webrtc (here a FAKE module: no
 * native code, no media, no call): getUserMedia passes the constraints,
 * descriptions / candidates from the signalling channel become
 * RTCSessionDescription / RTCIceCandidate, the native `track` / `icecandidate`
 * events reach the web-shaped `ontrack` / `onicecandidate`, the stream view is
 * an RTCView fed by `stream.toURL()`. Without an override the port loads the
 * native module; a runtime without it gets null; a registered engine wins.
 */
import { createElement } from 'react';

type Listener = (e: unknown) => void;

function fakeRtc() {
  const created: FakePc[] = [];
  class FakePc {
    config: unknown;
    listeners: Record<string, Listener> = {};
    remote: unknown;
    local: unknown;
    candidates: unknown[] = [];
    tracks: unknown[] = [];
    closed = false;
    constructor(config: unknown) {
      this.config = config;
      created.push(this);
    }
    addEventListener(type: string, fn: Listener) {
      this.listeners[type] = fn;
    }
    addTrack(track: unknown) {
      this.tracks.push(track);
    }
    async setRemoteDescription(d: unknown) {
      this.remote = d;
    }
    async setLocalDescription(d: unknown) {
      this.local = d;
    }
    async createOffer() {
      return { type: 'offer', sdp: 'o' };
    }
    async createAnswer() {
      return { type: 'answer', sdp: 'a' };
    }
    async addIceCandidate(c: unknown) {
      this.candidates.push(c);
    }
    close() {
      this.closed = true;
    }
  }
  class SessionDescription {
    constructor(public init: unknown) {}
  }
  class IceCandidate {
    constructor(public init: unknown) {}
  }
  const RTCView = (props: Record<string, unknown>) => createElement('RTCView', props);
  const stream = { toURL: () => 'stream-1', getTracks: () => [], getAudioTracks: () => [], getVideoTracks: () => [] };
  const mediaDevices = { getUserMedia: jest.fn(async () => stream) };
  return { module: { mediaDevices, RTCPeerConnection: FakePc, RTCSessionDescription: SessionDescription, RTCIceCandidate: IceCandidate, RTCView }, created, stream, SessionDescription, IceCandidate };
}

describe('reactNativeWebRTCEngine', () => {
  it('maps the web hook\'s calls onto react-native-webrtc', async () => {
    const { reactNativeWebRTCEngine } = jest.requireActual('../../../src/ports/webrtc') as typeof import('../../../src/ports/webrtc');
    const rtc = fakeRtc();
    const engine = reactNativeWebRTCEngine(rtc.module as never);
    const s = await engine.getUserMedia({ audio: true, video: false });
    expect(rtc.module.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    const ice = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const pc = engine.createPeerConnection(ice);
    const native = rtc.created[0];
    expect(native.config).toEqual(ice);
    await pc.setRemoteDescription({ type: 'offer', sdp: 'x' });
    expect(native.remote).toBeInstanceOf(rtc.SessionDescription);
    expect((native.remote as { init: unknown }).init).toEqual({ type: 'offer', sdp: 'x' });
    await pc.addIceCandidate({ candidate: 'c' });
    expect(native.candidates[0]).toBeInstanceOf(rtc.IceCandidate);
    const onTrack = jest.fn();
    const onIce = jest.fn();
    pc.ontrack = onTrack;
    pc.onicecandidate = onIce;
    native.listeners.track({ streams: [s] });
    native.listeners.icecandidate({ candidate: { candidate: 'c2' } });
    native.listeners.icecandidate({});
    expect(onTrack).toHaveBeenCalledWith({ streams: [s] });
    expect(onIce).toHaveBeenNthCalledWith(1, { candidate: { candidate: 'c2' } });
    expect(onIce).toHaveBeenNthCalledWith(2, { candidate: null });
    pc.close();
    expect(native.closed).toBe(true);
    const StreamView = engine.StreamView as unknown as (p: { stream: unknown; muted?: boolean }) => { props: Record<string, unknown> };
    const view = StreamView({ stream: s, muted: true });
    expect(view.props).toMatchObject({ streamURL: 'stream-1', objectFit: 'cover', mirror: true });
  });
});

describe('getWebRTCEngine', () => {
  afterEach(() => jest.resetModules());

  it('loads react-native-webrtc when no engine is registered', () => {
    const rtc = fakeRtc();
    jest.doMock('react-native-webrtc', () => rtc.module, { virtual: true });
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const port = require('../../../src/ports/webrtc') as typeof import('../../../src/ports/webrtc');
      const engine = port.getWebRTCEngine();
      expect(engine).not.toBeNull();
      engine?.createPeerConnection({ iceServers: [] });
      expect(rtc.created).toHaveLength(1);
    });
  });

  it('returns null when the native module cannot load (a JS-only runtime)', () => {
    jest.doMock(
      'react-native-webrtc',
      () => {
        throw new Error('WebRTC native module not found');
      },
      { virtual: true },
    );
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const port = require('../../../src/ports/webrtc') as typeof import('../../../src/ports/webrtc');
      expect(port.getWebRTCEngine()).toBeNull();
    });
  });

  it('a registered engine wins; undefined restores the native one', () => {
    const rtc = fakeRtc();
    jest.doMock('react-native-webrtc', () => rtc.module, { virtual: true });
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const port = require('../../../src/ports/webrtc') as typeof import('../../../src/ports/webrtc');
      const fake = { getUserMedia: jest.fn(), createPeerConnection: jest.fn() };
      port.registerWebRTCEngine(fake as never);
      expect(port.getWebRTCEngine()).toBe(fake);
      port.registerWebRTCEngine(null);
      expect(port.getWebRTCEngine()).toBeNull();
      port.registerWebRTCEngine(undefined);
      expect(port.getWebRTCEngine()).not.toBeNull();
    });
  });
});
