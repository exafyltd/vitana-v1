/**
 * iOS-friendly diary voice capture.
 *
 * Web Speech API (webkitSpeechRecognition) does not work in iOS WKWebView
 * (Appilix shell, Capacitor, in-app browsers, etc.) — calling `start()`
 * triggers an immediate `service-not-allowed`/`not-allowed` error.
 *
 * For those cases we record the microphone with MediaRecorder and ship the
 * audio to the `transcribe-audio` Supabase edge function for backend STT.
 */

import { supabase } from "@/integrations/supabase/client";

const IS_IOS_DEVICE =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));

const HAS_SAFARI_UA =
  typeof navigator !== 'undefined' &&
  /Safari/i.test(navigator.userAgent) &&
  !/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);

const IS_APPILIX_WEBVIEW =
  typeof window !== 'undefined' && !!(window as any).appilix?.postMessage;

/**
 * Returns true when the runtime cannot reliably use Web Speech API for STT
 * and should instead capture audio via MediaRecorder + backend transcription.
 *
 * iOS WKWebView wrappers (Appilix, Capacitor, in-app browsers) expose
 * webkitSpeechRecognition but `start()` immediately rejects with
 * `service-not-allowed`. Pure iOS Safari supports the API but only in
 * non-continuous mode; we still fall back to MediaRecorder there for a
 * consistent experience with Android.
 */
export function shouldUseBackendSTT(): boolean {
  if (typeof window === 'undefined') return false;
  if (IS_APPILIX_WEBVIEW) return true;
  if (IS_IOS_DEVICE) return true;
  return false;
}

export function isIOSDevice(): boolean {
  return IS_IOS_DEVICE;
}

export function isAppilixWebView(): boolean {
  return IS_APPILIX_WEBVIEW;
}

export function isIOSSafari(): boolean {
  return IS_IOS_DEVICE && HAS_SAFARI_UA;
}

interface PickedMime {
  mimeType: string;
  fileExt: string;
}

function pickRecorderMime(): PickedMime {
  const candidates: PickedMime[] = [
    { mimeType: 'audio/webm;codecs=opus', fileExt: 'webm' },
    { mimeType: 'audio/webm', fileExt: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', fileExt: 'ogg' },
    { mimeType: 'audio/mp4;codecs=mp4a.40.2', fileExt: 'm4a' },
    { mimeType: 'audio/mp4', fileExt: 'm4a' },
    { mimeType: 'audio/aac', fileExt: 'aac' },
    { mimeType: 'audio/mpeg', fileExt: 'mp3' },
  ];
  const MR: any = (window as any).MediaRecorder;
  if (MR && typeof MR.isTypeSupported === 'function') {
    for (const c of candidates) {
      try {
        if (MR.isTypeSupported(c.mimeType)) return c;
      } catch {
        /* ignore */
      }
    }
  }
  // Safari without isTypeSupported: assume mp4
  return { mimeType: '', fileExt: 'm4a' };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)) as unknown as number[]
    );
  }
  return btoa(binary);
}

export interface DiaryAudioRecorderOptions {
  language: string;
  onError?: (message: string) => void;
}

/**
 * Lightweight MediaRecorder wrapper that mirrors the start/stop lifecycle
 * VoiceDiaryRecorder uses with ClientSTT, but produces an audio blob that
 * we then transcribe server-side.
 */
export class DiaryAudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mime: PickedMime = pickRecorderMime();
  private stopPromise: Promise<Blob> | null = null;

  constructor(private opts: DiaryAudioRecorderOptions) {}

  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (window as any).MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }

  async start(): Promise<void> {
    if (!DiaryAudioRecorder.isSupported()) {
      throw new Error('MediaRecorder is not supported in this browser');
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.chunks = [];
    const MR: any = (window as any).MediaRecorder;
    this.mediaRecorder = this.mime.mimeType
      ? new MR(this.mediaStream, { mimeType: this.mime.mimeType })
      : new MR(this.mediaStream);

    this.mediaRecorder!.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.stopPromise = new Promise<Blob>((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const type = this.mime.mimeType || this.chunks[0]?.type || 'audio/mp4';
        const blob = new Blob(this.chunks, { type });
        this.cleanupStream();
        resolve(blob);
      };
    });

    this.mediaRecorder!.start();
  }

  /**
   * Stop recording and return the captured audio blob (or null if nothing
   * was captured).
   */
  async stop(): Promise<Blob | null> {
    if (!this.mediaRecorder) {
      this.cleanupStream();
      return null;
    }
    if (this.mediaRecorder.state === 'inactive') {
      this.cleanupStream();
      return null;
    }
    const promise = this.stopPromise;
    try {
      this.mediaRecorder.stop();
    } catch (e) {
      console.warn('[DiaryAudioRecorder] stop() threw:', e);
      this.cleanupStream();
      return null;
    }
    return promise || null;
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        /* noop */
      }
    }
    this.cleanupStream();
    this.chunks = [];
  }

  getMimeType(): string {
    return this.mime.mimeType || 'audio/mp4';
  }

  private cleanupStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }
}

/**
 * Transcribe a recorded audio blob via the `transcribe-audio` Supabase
 * edge function. Returns the transcript or throws on failure.
 */
export async function transcribeAudioBlob(
  blob: Blob,
  language: string
): Promise<string> {
  if (!blob || blob.size === 0) {
    throw new Error('No audio captured');
  }

  const base64Audio = await blobToBase64(blob);
  const { data, error } = await supabase.functions.invoke('transcribe-audio', {
    body: {
      audio: base64Audio,
      language,
      mimeType: blob.type || 'audio/mp4',
    },
  });

  if (error) {
    console.error('[transcribeAudioBlob] Edge function error:', error, 'data:', data);
    // FunctionsHttpError loses the response body — pull details from `data`.
    const detail = (data && (data.details || data.error)) ? ` — ${data.details || data.error}` : '';
    throw new Error(`${error.message || 'Transcription failed'}${detail}`);
  }

  if (data?.error) {
    const detail = data.details ? ` — ${data.details}` : '';
    throw new Error(`${data.error}${detail}`);
  }

  const transcript = (data?.transcript || '').trim();
  return transcript;
}
