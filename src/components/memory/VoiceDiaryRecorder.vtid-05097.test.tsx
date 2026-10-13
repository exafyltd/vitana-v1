/**
 * VTID-05097 — VoiceDiaryRecorder: when the Web Speech API fails before
 * recognising anything (Android WebView without a speech service), switch to
 * MediaRecorder + backend STT silently instead of showing "Erkennungsfehler".
 */
import { render, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceDiaryRecorder from './VoiceDiaryRecorder';

const shouldUseBackendSTTMock = vi.fn();
const markWebSpeechUnavailableMock = vi.fn();
const recorderStartMock = vi.fn();
const notifyErrorMock = vi.fn();

vi.mock('@/utils/diaryAudioRecorder', () => {
  class MockDiaryAudioRecorder {
    static isSupported() { return true; }
    constructor(public opts: { language: string }) {}
    start(...a: unknown[]) { return recorderStartMock(...a); }
    stop() { return Promise.resolve(new Blob(['a'], { type: 'audio/webm' })); }
    cancel() {}
  }
  return {
    DiaryAudioRecorder: MockDiaryAudioRecorder,
    shouldUseBackendSTT: (...a: unknown[]) => shouldUseBackendSTTMock(...a),
    shouldFallbackToBackendSTT: (error: string, gotResult: boolean) =>
      !gotResult && ['not-allowed', 'service-not-allowed', 'network'].includes(error),
    markWebSpeechUnavailable: (...a: unknown[]) => markWebSpeechUnavailableMock(...a),
    transcribeAudioBlob: vi.fn().mockResolvedValue('hallo'),
  };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: vi.fn() } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ selectedLanguage: 'de-DE' }) }));
vi.mock('@/hooks/useUserPreferences', () => ({ useUserPreferences: () => ({ preferences: {} }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/lib/diary-index-sync', () => ({ formatIndexDelta: () => '' }));
vi.mock('@/lib/memory-api', () => ({ saveDiaryEntry: vi.fn() }));
vi.mock('@/lib/i18n-toast', () => ({
  notify: vi.fn(),
  notifyError: (...a: unknown[]) => notifyErrorMock(...a),
  t: (k: string) => k,
}));

type FakeWindow = typeof window & { webkitSpeechRecognition?: unknown };

class FailingRecognition {
  static instanceCount = 0;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  constructor() { FailingRecognition.instanceCount += 1; }
  start() {
    this.onstart?.();
    setTimeout(() => {
      this.onerror?.({ error: 'not-allowed' });
      this.onend?.();
    }, 0);
  }
  stop() { this.onend?.(); }
  abort() {}
}

function micButton(container: HTMLElement): HTMLElement {
  const btn = container.querySelector('svg.lucide-mic')?.closest('button');
  if (!btn) throw new Error('mic button not found');
  return btn as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  FailingRecognition.instanceCount = 0;
  (window as FakeWindow).webkitSpeechRecognition = FailingRecognition;
  shouldUseBackendSTTMock.mockReturnValue(false);
  recorderStartMock.mockResolvedValue(undefined);
});

afterEach(() => {
  delete (window as FakeWindow).webkitSpeechRecognition;
});

describe('VoiceDiaryRecorder — Web Speech fails before any result (VTID-05097)', () => {
  it('switches to backend recording without the recognition-error toast', async () => {
    const { container } = render(<VoiceDiaryRecorder />);
    fireEvent.click(micButton(container));

    await waitFor(() => expect(recorderStartMock).toHaveBeenCalledTimes(1));
    expect(markWebSpeechUnavailableMock).toHaveBeenCalledTimes(1);
    expect(FailingRecognition.instanceCount).toBe(1);
    expect(notifyErrorMock).not.toHaveBeenCalledWith('toasts.memory.recognitionError', expect.anything());
  });
});
