/**
 * VTID-05097 — MobileSupport voice input: when the Web Speech API fails before
 * recognising anything (Android WebView without a speech service), switch to
 * MediaRecorder + backend STT silently instead of showing a mic error.
 */
import type { ReactNode } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MobileSupport from './MobileSupport';

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

const { Pass, Nothing } = vi.hoisted(() => ({
  Pass: ({ children }: { children?: ReactNode }) => children ?? null,
  Nothing: () => null,
}));
vi.mock('@/components/mobile/MobileAppShell', () => ({ MobileAppShell: Pass }));
vi.mock('@/components/mobile/MobileBottomNav', () => ({ MobileBottomNav: Nothing }));
vi.mock('@/components/StandardHeader', () => ({ default: Nothing }));
vi.mock('@/components/ui/utility-action-button', () => ({ UtilityActionButton: Nothing }));
vi.mock('@/components/ui/expandable-search-button', () => ({ ExpandableSearchButton: Nothing }));
vi.mock('@/components/ui/MobileModePill', () => ({ MobileModePill: Nothing }));
vi.mock('@/components/mobile/MobileActionChips', () => ({ VitanaIndexChip: Nothing, AutopilotChip: Nothing }));
vi.mock('@/hooks/use-autopilot', () => ({ useAutopilot: () => ({ pendingCount: 0 }) }));
vi.mock('@/components/AutopilotPopup', () => ({ AutopilotPopup: Nothing }));
vi.mock('@/components/support/MyTicketsList', () => ({ MyTicketsList: Nothing }));
vi.mock('@/lib/orbActivate', () => ({ activateOrbForSupportReport: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: vi.fn() } } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ selectedLanguage: 'de-DE' }) }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: Pass,
}));
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
      this.onerror?.({ error: 'service-not-allowed' });
      this.onend?.();
    }, 0);
  }
  stop() { this.onend?.(); }
  abort() {}
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

describe('MobileSupport voice input — Web Speech fails before any result (VTID-05097)', () => {
  it('switches to backend recording without a mic error', async () => {
    const { container } = render(<MobileSupport />);
    const mic = container.querySelector('svg.lucide-mic')?.closest('button');
    expect(mic).toBeTruthy();
    fireEvent.click(mic as HTMLElement);

    await waitFor(() => expect(recorderStartMock).toHaveBeenCalledTimes(1));
    expect(markWebSpeechUnavailableMock).toHaveBeenCalledTimes(1);
    expect(FailingRecognition.instanceCount).toBe(1);
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });
});
