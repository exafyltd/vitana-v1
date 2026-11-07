/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the one
 * door to the WebRTC engine of the embedded 1:1 call (web
 * `src/hooks/useWebRTC.ts`, which uses the browser's `getUserMedia` and
 * `RTCPeerConnection`). The shapes below are the subset the web hook uses.
 *
 * The engine of this build is `react-native-webrtc` (program library map §3;
 * its config plugin `@config-plugins/react-native-webrtc` is registered in
 * app.config.ts with the app's existing camera / microphone usage strings):
 * `mediaDevices.getUserMedia`, `RTCPeerConnection` and `RTCView` (the stream
 * view, fed by `stream.toURL()`). It is loaded on first use, so a screen that
 * never calls never loads the native module. If the native module is missing
 * (a JS-only runtime such as Expo Go), `getWebRTCEngine()` returns null and
 * the call screen ends the call the way the web does when media cannot start
 * (MessengerCall.tsx:97-102: "Connection error" toast, end after 2 s).
 *
 * Unit tests register a fake engine with `registerWebRTCEngine` (which wins
 * over the native one) and never load react-native-webrtc; the live call
 * across two sessions is a G1 owner step.
 */
import { createElement, type ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface MediaTrackLike {
  enabled: boolean;
  readonly kind?: string;
  stop(): void;
}

export interface MediaStreamLike {
  getTracks(): MediaTrackLike[];
  getAudioTracks(): MediaTrackLike[];
  getVideoTracks(): MediaTrackLike[];
}

export interface PeerConnectionLike {
  addTrack(track: MediaTrackLike, stream: MediaStreamLike): void;
  ontrack: ((event: { streams: MediaStreamLike[] }) => void) | null;
  onicecandidate: ((event: { candidate: unknown | null }) => void) | null;
  setRemoteDescription(description: unknown): Promise<void>;
  setLocalDescription(description: unknown): Promise<void>;
  createOffer(): Promise<unknown>;
  createAnswer(): Promise<unknown>;
  addIceCandidate(candidate: unknown): Promise<void>;
  close(): void;
}

export interface WebRTCEngine {
  getUserMedia(constraints: { audio: boolean; video: boolean }): Promise<MediaStreamLike>;
  createPeerConnection(config: { iceServers: Array<{ urls: string }> }): PeerConnectionLike;
  /** Renders a stream (local preview or the remote peer); absent = avatar only. */
  StreamView?: ComponentType<{ stream: MediaStreamLike; style?: StyleProp<ViewStyle>; muted?: boolean }>;
}

/** The subset of the react-native-webrtc module the adapter uses. */
export interface ReactNativeWebRTCModule {
  mediaDevices: { getUserMedia(constraints: { audio: boolean; video: boolean }): Promise<unknown> };
  RTCPeerConnection: new (config: { iceServers: Array<{ urls: string }> }) => unknown;
  RTCSessionDescription: new (init: unknown) => unknown;
  RTCIceCandidate: new (init: unknown) => unknown;
  RTCView: ComponentType<{ streamURL?: string; style?: StyleProp<ViewStyle>; objectFit?: 'contain' | 'cover'; mirror?: boolean; zOrder?: number }>;
}

/**
 * Wraps react-native-webrtc in the engine shape. The web hook passes plain
 * `{ type, sdp }` / candidate objects through the broadcast channel; the
 * native peer connection takes `RTCSessionDescription` / `RTCIceCandidate`
 * instances, so they are wrapped here and nowhere else.
 */
export function reactNativeWebRTCEngine(rtc: ReactNativeWebRTCModule): WebRTCEngine {
  const StreamView: NonNullable<WebRTCEngine['StreamView']> = ({ stream, style, muted }) =>
    createElement(rtc.RTCView, {
      streamURL: (stream as unknown as { toURL(): string }).toURL(),
      style,
      objectFit: 'cover',
      // The own preview is mirrored and drawn above the remote video.
      mirror: !!muted,
      zOrder: muted ? 1 : 0,
    });
  return {
    getUserMedia: async (constraints) => (await rtc.mediaDevices.getUserMedia(constraints)) as MediaStreamLike,
    createPeerConnection(config) {
      const pc = new rtc.RTCPeerConnection(config) as {
        addTrack(track: unknown, stream: unknown): unknown;
        setRemoteDescription(d: unknown): Promise<void>;
        setLocalDescription(d: unknown): Promise<void>;
        createOffer(): Promise<unknown>;
        createAnswer(): Promise<unknown>;
        addIceCandidate(c: unknown): Promise<void>;
        close(): void;
        addEventListener(type: string, fn: (event: never) => void): void;
      };
      const wrapper: PeerConnectionLike = {
        ontrack: null,
        onicecandidate: null,
        addTrack: (track, stream) => void pc.addTrack(track, stream),
        setRemoteDescription: (d) => pc.setRemoteDescription(new rtc.RTCSessionDescription(d)),
        setLocalDescription: (d) => pc.setLocalDescription(d),
        createOffer: () => pc.createOffer(),
        createAnswer: () => pc.createAnswer(),
        addIceCandidate: (c) => pc.addIceCandidate(new rtc.RTCIceCandidate(c)),
        close: () => pc.close(),
      };
      pc.addEventListener('track', (event: { streams?: MediaStreamLike[] }) => wrapper.ontrack?.({ streams: event.streams ?? [] }));
      pc.addEventListener('icecandidate', (event: { candidate?: unknown }) => wrapper.onicecandidate?.({ candidate: event.candidate ?? null }));
      return wrapper;
    },
    StreamView,
  };
}

let registered: WebRTCEngine | null = null;
let overridden = false;
let native: WebRTCEngine | null | undefined;

function loadNativeEngine(): WebRTCEngine | null {
  if (native !== undefined) return native;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rtc = require('react-native-webrtc') as ReactNativeWebRTCModule;
    native = rtc?.RTCPeerConnection && rtc.mediaDevices ? reactNativeWebRTCEngine(rtc) : null;
  } catch {
    native = null;
  }
  return native;
}

export function getWebRTCEngine(): WebRTCEngine | null {
  return overridden ? registered : loadNativeEngine();
}

/** Replaces the engine (tests register a fake, or null for "no media"). `undefined` restores react-native-webrtc. */
export function registerWebRTCEngine(next: WebRTCEngine | null | undefined): void {
  overridden = next !== undefined;
  registered = next ?? null;
}
