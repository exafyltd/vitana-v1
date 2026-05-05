import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClientSTT } from "@/utils/clientSTT";
import {
  DiaryAudioRecorder,
  shouldUseBackendSTT,
  transcribeAudioBlob,
} from "@/utils/diaryAudioRecorder";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { getLocalStorageItem } from "@/lib/localStorage";
import { useQueryClient } from "@tanstack/react-query";
import { syncDiaryToIndex, formatIndexDelta } from "@/lib/diary-index-sync";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface VoiceDiaryRecorderProps {
  onRecordingChange?: (isRecording: boolean) => void;
  onSaveComplete?: () => void;
}

export default function VoiceDiaryRecorder({ onRecordingChange, onSaveComplete }: VoiceDiaryRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  // True once the user has started a recording in this session — kept true
  // even after they delete all the transcribed text so the editor stays
  // mounted (otherwise deleting the last character unmounts the textarea
  // and looks like a "save and exit" event to the user).
  const [hasActiveSession, setHasActiveSession] = useState(false);
  // Guards against double-saving when the user taps Save twice during the
  // network round-trip. Without this, two diary_entries inserts fire and
  // the same transcript is stored twice.
  const [isSaving, setIsSaving] = useState(false);

  const sttRef = useRef<ClientSTT | null>(null);
  const audioRecorderRef = useRef<DiaryAudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFinalTranscriptRef = useRef('');
  const lastFinalAtRef = useRef(0);
  const { toast } = useToast();
  const { selectedLanguage } = useLanguage();
  const { preferences } = useUserPreferences();
  const isAndroid = /Android/i.test(navigator.userAgent);
  const useBackendSTT = shouldUseBackendSTT();
  const queryClient = useQueryClient();

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cancel();
        audioRecorderRef.current = null;
      }
      if (sttRef.current) {
        try { sttRef.current.stop(); } catch { /* noop */ }
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const normalizeWords = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s'-]+/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const mergeFinalTranscript = (existing: string, incoming: string) => {
    const existingTrimmed = existing.trim();
    const incomingTrimmed = incoming.trim();

    if (!incomingTrimmed) return existingTrimmed;
    if (!existingTrimmed) return incomingTrimmed;

    const existingNormalized = normalizeWords(existingTrimmed).join(' ');
    const incomingNormalized = normalizeWords(incomingTrimmed).join(' ');

    if (!incomingNormalized) return existingTrimmed;
    if (
      existingNormalized === incomingNormalized ||
      existingNormalized.includes(incomingNormalized)
    ) {
      return existingTrimmed;
    }

    const existingWords = existingTrimmed.split(/\s+/);
    const incomingWords = incomingTrimmed.split(/\s+/);
    const existingWordsNorm = existingWords.map((word) => normalizeWords(word).join(''));
    const incomingWordsNorm = incomingWords.map((word) => normalizeWords(word).join(''));

    let overlap = 0;
    const maxOverlap = Math.min(existingWordsNorm.length, incomingWordsNorm.length);

    for (let size = maxOverlap; size > 0; size--) {
      const existingSuffix = existingWordsNorm.slice(-size).join(' ');
      const incomingPrefix = incomingWordsNorm.slice(0, size).join(' ');
      if (existingSuffix && existingSuffix === incomingPrefix) {
        overlap = size;
        break;
      }
    }

    const tailWords = incomingWords.slice(overlap).join(' ').trim();
    if (!tailWords) return existingTrimmed;

    return `${existingTrimmed} ${tailWords}`.trim();
  };

  const resolveLanguage = () => {
    // Resolve order:
    //   1. Server preferences (`stt_language`) — the source of truth the user
    //      saw when they configured language in Settings. Beats anything in
    //      WebView-isolated localStorage.
    //   2. LanguageContext.selectedLanguage — runtime value, which is itself
    //      hydrated from server prefs via LanguageContext.
    //   3. localStorage `selected_language` — last-resort fallback that's
    //      ONLY used when neither preferences nor selectedLanguage is set
    //      yet (very early page load).
    //   4. 'en-US' as the floor. Previously defaulted to 'de-DE' which was
    //      wrong for non-German users on iPhone Appilix WebView whose
    //      isolated localStorage had no entry for the key.
    const fromServer = preferences?.stt_language;
    if (fromServer) return fromServer.trim();
    if (selectedLanguage && selectedLanguage.trim()) return selectedLanguage.trim();
    const stored = getLocalStorageItem('global', 'language', 'selected_language');
    if (typeof stored === 'string' && stored.trim()) return stored.trim();
    return 'en-US';
  };

  const startBackendRecording = async () => {
    if (!DiaryAudioRecorder.isSupported()) {
      notifyError('toasts.memory.notSupported', 'toasts.memory.microphoneRecordingNotSupportedThisDevice');
      return;
    }

    const sttLanguage = resolveLanguage();
    console.log('[Voice Diary] Starting iOS-friendly MediaRecorder capture, language:', sttLanguage);

    try {
      const recorder = new DiaryAudioRecorder({ language: sttLanguage });
      await recorder.start();
      audioRecorderRef.current = recorder;

      setIsRecording(true);
      isRecordingRef.current = true;
      setHasActiveSession(true);
      setRecordingDuration(0);
      setTranscribedText('');
      setInterimText('');

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      notify('toasts.memory.recordingStarted', 'toasts.memory.speakNowYourAudioWillTranscribed');
    } catch (error: any) {
      console.error('[Voice Diary] MediaRecorder start failed:', error);
      audioRecorderRef.current?.cancel();
      audioRecorderRef.current = null;
      isRecordingRef.current = false;
      setIsRecording(false);
      const description = error?.name === 'NotAllowedError'
        ? "Microphone permission was denied. Enable it in Settings to record diary entries."
        : "Could not start recording. Please try again.";
      notifyError('toasts.memory.recordingError');
    }
  };

  const startRecording = async () => {
    if (useBackendSTT) {
      return startBackendRecording();
    }

    if (!ClientSTT.isSupported()) {
      notifyError('toasts.memory.notSupported', 'toasts.memory.speechRecognitionNotSupportedThisBrowser');
      return;
    }

    try {
      // Initialize ClientSTT with real-time callbacks
      const sttLanguage = resolveLanguage();
      const useContinuous = !isAndroid;
      console.log('[Voice Diary] Starting STT with language:', sttLanguage, 'continuous:', useContinuous);
      
      sttRef.current = new ClientSTT({
        language: sttLanguage,
        // Chrome Android does not reliably support continuous mode
        continuous: useContinuous,
        interimResults: true,
        onResult: (transcript, isFinal) => {
          const cleanedTranscript = transcript.trim();
          if (!cleanedTranscript) return;

          if (isFinal) {
            const normalized = cleanedTranscript.toLowerCase();
            const now = Date.now();
            const isImmediateDuplicate =
              normalized === lastFinalTranscriptRef.current &&
              now - lastFinalAtRef.current < 1500;

            if (isImmediateDuplicate) {
              console.log('[Voice Diary] Skipping duplicate final transcript:', cleanedTranscript);
              setInterimText('');
              return;
            }

            lastFinalTranscriptRef.current = normalized;
            lastFinalAtRef.current = now;

            setTranscribedText(prev => {
              const merged = mergeFinalTranscript(prev, cleanedTranscript);
              if (merged === prev.trim()) {
                console.log('[Voice Diary] Ignoring repeated final transcript chunk:', cleanedTranscript);
              }
              return merged;
            });
            setInterimText('');
          } else {
            // Show interim results
            setInterimText(cleanedTranscript);
          }
        },
        onError: (error) => {
          console.error('[Voice Diary] STT Error:', error);
          // Recoverable on mobile; let onEnd auto-restart
          if (error === 'no-speech' || error === 'aborted' || error === 'audio-capture') {
            return;
          }
          notifyError('toasts.memory.recognitionError', 'toasts.memory.speechRecognitionEncounteredErrorPleaseTry');
          stopRecording();
        },
        onEnd: () => {
          // Clear any pending restart
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
          }

          if (!isRecordingRef.current || !sttRef.current) {
            return;
          }

          // Clear interim text before restart to prevent stale carryover
          setInterimText('');

          restartTimeoutRef.current = setTimeout(() => {
            if (!isRecordingRef.current || !sttRef.current) return;
            try {
              sttRef.current.setLanguage(sttLanguage);
              sttRef.current.start();
            } catch (e) {
              console.warn('[Voice Diary] Failed to restart STT:', e);
            }
          }, isAndroid ? 750 : 350);
        }
      });

      sttRef.current.setLanguage(sttLanguage);
      sttRef.current.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setHasActiveSession(true);
      setRecordingDuration(0);
      setTranscribedText('');
      setInterimText('');
      lastFinalTranscriptRef.current = '';
      lastFinalAtRef.current = 0;
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      notify('toasts.memory.recordingStarted', 'toasts.memory.speakClearlyYouLlSee');
    } catch (error) {
      notifyError('toasts.memory.recordingError', 'toasts.memory.couldNotStartSpeechRecognitionPlease');
    }
  };

  const stopRecording = async () => {
    // Set ref FIRST to prevent onEnd from restarting
    isRecordingRef.current = false;

    // Clear any pending restart
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (audioRecorderRef.current) {
      const recorder = audioRecorderRef.current;
      audioRecorderRef.current = null;
      setIsRecording(false);
      setInterimText('');
      setIsTranscribing(true);

      try {
        const blob = await recorder.stop();
        if (!blob || blob.size === 0) {
          notifyError('toasts.memory.noAudioCaptured', 'toasts.memory.weDidnTCaptureAnyAudio');
          return;
        }

        const transcript = await transcribeAudioBlob(blob, resolveLanguage());
        if (!transcript) {
          notifyError('toasts.memory.noSpeechDetected', 'toasts.memory.weCouldnTHearAnySpeech');
          return;
        }

        setTranscribedText(prev => prev ? `${prev} ${transcript}`.trim() : transcript);
        notify('toasts.memory.recordingStopped', 'toasts.memory.reviewEditYourTranscriptionBeforeSaving');
      } catch (error: any) {
        console.error('[Voice Diary] Backend transcription failed:', error);
        notifyError('toasts.memory.transcriptionFailed');
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    if (sttRef.current) {
      sttRef.current.stop();
      setIsRecording(false);
      setInterimText('');

      notify('toasts.memory.recordingStopped', 'toasts.memory.reviewEditYourTranscriptionBeforeSaving');
    }
  };

  const saveDiaryEntry = async () => {
    if (isSaving) {
      // In-flight guard: a previous Save click is still awaiting its
      // insert. Without this, double-tapping the Save button (or even
      // a slightly delayed second tap during the network round-trip)
      // inserts the same entry twice.
      return;
    }
    if (!transcribedText.trim()) {
      notifyError('toasts.memory.noContent', 'toasts.memory.pleaseRecordEnterSomeContentBefore');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const savedText = transcribedText;
      const { error } = await supabase.from('diary_entries').insert({
        user_id: user.id,
        text: savedText,
        duration: recordingDuration,
        source: 'voice'
      });

      if (error) throw error;

      // VTID-01983: run the Index sync on the transcript.
      const sync = await syncDiaryToIndex(savedText);
      const moved = sync?.index_delta?.total ?? 0;

      // Reset form
      setTranscribedText("");
      setRecordingDuration(0);
      setHasActiveSession(false);

      // Refresh diary list + Vitana Index header badge.
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
      queryClient.invalidateQueries({ queryKey: ['vitana_index'] });
      onSaveComplete?.();

      if (sync && moved > 0) {
        const breakdown = formatIndexDelta(sync.index_delta);
        toast({
          title: `Saved · Vitana Index +${moved}`,
          description: breakdown
            ? `${breakdown}. Tap your Index to see the move.`
            : `${sync.health_features_written} health signals logged.`,
        });
      } else {
        notify('toasts.memory.entrySaved', 'toasts.memory.yourDiaryEntryHasAddedYour');
      }
    } catch (error) {
      notifyError('toasts.memory.saveFailed', 'toasts.memory.couldNotSaveYourDiaryEntry');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            size="lg"
            disabled={isTranscribing}
            className="h-16 w-16 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300"
          >
            {isTranscribing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-8 w-8" />}
          </Button>
        ) : (
          <div className="flex items-center gap-4">
            <Button
              onClick={stopRecording}
              size="lg"
              variant="destructive"
              className="h-16 w-16 rounded-full"
            >
              <Square className="h-8 w-8" />
            </Button>
            <div className="text-center">
              <Badge variant="destructive" className="animate-pulse">
                {t('screens.memory.recording')}
              </Badge>
              <div className="text-2xl font-mono font-bold text-destructive mt-1">
                {formatDuration(recordingDuration)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audio Visualization */}
      {isRecording && (
        <div className="flex justify-center">
          <div className="flex items-end gap-1 h-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-primary rounded-full w-2 animate-pulse"
                style={{
                  height: `${Math.random() * 40 + 20}px`,
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {isTranscribing && (
        <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('screens.memory.transcribingYourRecording')}
        </p>
      )}

      {/* Real-time Transcription Display.
          Stays mounted for the entire active recording session — even if
          the user deletes all transcribed text — so editing the result
          doesn't unmount the textarea and look like an unwanted "save". */}
      {(hasActiveSession || isRecording || transcribedText || isTranscribing) && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {isRecording
                  ? (useBackendSTT ? "Recording…" : "Live Transcription")
                  : "Your Voice Entry"}
              </h3>
              {!isRecording && recordingDuration > 0 && (
                <Badge variant="outline">{t('screens.memory.durationValue0', { value0: formatDuration(recordingDuration) })}</Badge>
              )}
            </div>

            {isRecording && useBackendSTT && (
              <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                {t('screens.memory.yourTranscriptionWillAppearHereAs')} <strong>{t('screens.memory.stop')}</strong>{t('screens.memory.yourPhoneSBrowserDoesnT')}
              </div>
            )}

            <Textarea
              value={transcribedText + (interimText ? ' ' + interimText : '')}
              onChange={(e) => !isRecording && setTranscribedText(e.target.value)}
              placeholder={
                isRecording
                  ? (useBackendSTT ? "Recording — your transcription will appear after you stop." : "Start speaking...")
                  : "Edit your transcribed text here, or record again to add more."
              }
              className="min-h-32"
              disabled={isRecording || isTranscribing}
            />

            {interimText && isRecording && !useBackendSTT && (
              <p className="text-xs text-muted-foreground italic">{t('screens.memory.interimTextAppearsGrayUntilFinalized')}
              </p>
            )}

            {!isRecording && !isTranscribing && (
              <div className="flex gap-2">
                <Button
                  onClick={saveDiaryEntry}
                  className="flex-1"
                  disabled={!transcribedText.trim() || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('screens.memory.saving2')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('screens.memory.saveEntry')}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTranscribedText('');
                    setRecordingDuration(0);
                    setHasActiveSession(false);
                  }}
                  disabled={isSaving}
                >{t('screens.memory.discard')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}