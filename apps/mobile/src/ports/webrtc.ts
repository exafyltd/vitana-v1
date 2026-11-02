/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the one
 * door to a native WebRTC engine for the embedded 1:1 call (web
 * `src/hooks/useWebRTC.ts`, which uses the browser's `getUserMedia` and
 * `RTCPeerConnection`). The shapes below are the subset the web hook uses.
 *
 * No engine is registered in this build: `react-native-webrtc` (program
 * library map §3) is a native module that needs an `apps/mobile/package.json`
 * dependency and a prebuild config plugin, both outside this lane's paths.
 * Until a build registers one, `getWebRTCEngine()` returns null and the call
 * screen ends the call the way the web does when media cannot start
 * (MessengerCall.tsx:95-99: "Connection error" toast, end after 2 s).
 * Unit tests register a fake engine; the live call is a G1 owner step.
 */
import type { ComponentType } from 'react';
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

let engine: WebRTCEngine | null = null;

export function getWebRTCEngine(): WebRTCEngine | null {
  return engine;
}

/** A build with a native WebRTC module registers it here (and tests register a fake). */
export function registerWebRTCEngine(next: WebRTCEngine | null): void {
  engine = next;
}
