/**
 * Regression tests for VTID-03552 — Daily Diary voice recording
 * "disconnects" immediately on iOS WKWebView (Appilix shell).
 *
 * UnifiedCaptureCard is the ONLY component MobileDailyDiary.tsx renders for
 * voice capture (both the Health Diary and Bug Reports tabs). Unlike its
 * siblings VoiceDiaryRecorder.tsx and MobileSupport.tsx, it always used the
 * browser Web Speech API (ClientSTT / webkitSpeechRecognition) directly and
 * never checked shouldUseBackendSTT(). On iOS WKWebView (Appilix), Safari's
 * `webkitSpeechRecognition` global exists — so ClientSTT.isSupported()
 * reports true — but calling `.start()` fails immediately with a
 * `service-not-allowed` error (documented at the top of
 * diaryAudioRecorder.ts). That error isn't in the component's ignored-error
 * list, so onError tore the recording down right after it started: the user
 * taps the mic, sees a flash of the recording UI, and it "disconnects."
 *
 * shouldUseBackendSTT()/DiaryAudioRecorder/transcribeAudioBlob are mocked
 * directly at the module boundary (rather than fighting the UA-sniffing
 * constants inside diaryAudioRecorder.ts, which are computed once at module
 * import time and can't be re-stubbed mid-test) — the thing under test is
 * whether UnifiedCaptureCard *branches* on that boundary correctly, not
 * whether the UA-sniffing itself is correct.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnifiedCaptureCard } from './UnifiedCaptureCard';

const getUserMock = vi.fn();
const functionsInvokeMock = vi.fn();
const shouldUseBackendSTTMock = vi.fn();
const recorderStartMock = vi.fn();
const recorderStopMock = vi.fn();
const recorderCancelMock = vi.fn();
const transcribeAudioBlobMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => getUserMock(...a) },
    functions: { invoke: (...a: unknown[]) => functionsInvokeMock(...a) },
    from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
  },
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ translate: (_k: string, fallback?: string) => fallback ?? _k }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ selectedLanguage: 'en-US' }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

type FakeWindow = typeof window & { webkitSpeechRecognition?: unknown };

// The real iOS WKWebView failure mode: the global exists (so
// ClientSTT.isSupported() is true) but start() always fails asynchronously
// with `service-not-allowed`. Used to prove the fixed code path never
// touches this at all when shouldUseBackendSTT() is true.
class FlakyWebkitSpeechRecognition {
  static instanceCount = 0;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  constructor() {
    FlakyWebkitSpeechRecognition.instanceCount += 1;
  }
  start() {
    this.onstart?.();
    setTimeout(() => {
      this.onerror?.({ error: 'service-not-allowed' });
      this.onend?.();
    }, 0);
  }
  stop() { this.onend?.(); }
  abort() {}
}

vi.mock('@/utils/diaryAudioRecorder', () => {
  class MockDiaryAudioRecorder {
    static isSupported() { return true; }
    constructor(public opts: { language: string }) {}
    start(...a: unknown[]) { return recorderStartMock(...a); }
    stop(...a: unknown[]) { return recorderStopMock(...a); }
    cancel(...a: unknown[]) { return recorderCancelMock(...a); }
  }
  return {
    DiaryAudioRecorder: MockDiaryAudioRecorder,
    shouldUseBackendSTT: (...a: unknown[]) => shouldUseBackendSTTMock(...a),
    transcribeAudioBlob: (...a: unknown[]) => transcribeAudioBlobMock(...a),
  };
});

// Deterministic baseline before every single test, regardless of which
// describe block or how prior tests left the shared vi.fn() mocks — plain
// vi.fn()s created outside vi.spyOn are NOT reliably reset by
// vi.restoreAllMocks() (it degrades to mockClear() for non-spies), so each
// test explicitly (re)establishes its own expectations rather than trusting
// leftover state from the previous test.
beforeEach(() => {
  vi.clearAllMocks();
  shouldUseBackendSTTMock.mockReturnValue(false);
  recorderStartMock.mockResolvedValue(undefined);
  recorderStopMock.mockResolvedValue(new Blob(['fake-audio'], { type: 'audio/webm' }));
  recorderCancelMock.mockReturnValue(undefined);
  transcribeAudioBlobMock.mockResolvedValue('hello from the diary');
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

describe('UnifiedCaptureCard — iOS/Appilix voice capture (VTID-03552)', () => {
  beforeEach(() => {
    FlakyWebkitSpeechRecognition.instanceCount = 0;
    (window as FakeWindow).webkitSpeechRecognition = FlakyWebkitSpeechRecognition;
    shouldUseBackendSTTMock.mockReturnValue(true);
  });

  afterEach(() => {
    delete (window as FakeWindow).webkitSpeechRecognition;
  });

  it('uses MediaRecorder + backend transcription, never the browser Speech Recognition API, for Health Diary entries', async () => {
    render(<UnifiedCaptureCard mode="health" />);

    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => expect(recorderStartMock).toHaveBeenCalled());

    // Recording must still be active — not torn down by a
    // service-not-allowed error from an API it never should have touched.
    expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();

    // The whole point of the fix: the flaky browser API must never be used.
    expect(FlakyWebkitSpeechRecognition.instanceCount).toBe(0);
  });

  it('uses MediaRecorder + backend transcription for Bug Reports too (same UnifiedCaptureCard)', async () => {
    render(<UnifiedCaptureCard mode="bug_report" />);

    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => expect(recorderStartMock).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
    expect(FlakyWebkitSpeechRecognition.instanceCount).toBe(0);
  });

  it('completes a full record → stop → transcribe cycle and lands the transcript in the editable textarea', async () => {
    render(<UnifiedCaptureCard mode="health" />);

    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    await waitFor(() => screen.getByRole('button', { name: /stop recording/i }));

    fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));

    await waitFor(() => expect(transcribeAudioBlobMock).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByDisplayValue(/hello from the diary/i)).toBeInTheDocument();
    });

    // And the entry is now actually saveable — the terminal proof the
    // capture pipeline produced usable content, not a silently dropped one.
    // (The translate() mock returns the raw key text, not the English copy.)
    expect(screen.getByRole('button', { name: 'capture.saveEntry' })).toBeEnabled();
  });

  it('surfaces a clear error and resets the mic instead of hanging when the microphone permission is denied', async () => {
    recorderStartMock.mockRejectedValueOnce(new Error('NotAllowedError'));

    render(<UnifiedCaptureCard mode="health" />);
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /stop recording/i })).not.toBeInTheDocument();
  });
});

describe('UnifiedCaptureCard — desktop/Android still uses the live Web Speech API', () => {
  beforeEach(() => {
    shouldUseBackendSTTMock.mockReturnValue(false);
    class WorkingSpeechRecognition {
      onresult: ((e: { resultIndex: number; results: unknown }) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      onstart: (() => void) | null = null;
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      start() { this.onstart?.(); }
      stop() { this.onend?.(); }
      abort() {}
    }
    (window as FakeWindow).webkitSpeechRecognition = WorkingSpeechRecognition;
  });

  afterEach(() => {
    delete (window as FakeWindow).webkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  it('does not route desktop/Android through the backend MediaRecorder path', async () => {
    render(<UnifiedCaptureCard mode="health" />);
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    await waitFor(() => screen.getByRole('button', { name: /stop recording/i }));
    expect(recorderStartMock).not.toHaveBeenCalled();
  });
});
