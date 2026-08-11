import { useState, useRef, useEffect } from "react";
import {
  Mic, Square, Save, Send, Plus, X, Bug, Lightbulb,
  CheckCircle2, Type, Camera, Image as ImageIcon, Paperclip, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClientSTT } from "@/utils/clientSTT";
import {
  DiaryAudioRecorder,
  shouldUseBackendSTT,
  transcribeAudioBlob,
} from "@/utils/diaryAudioRecorder";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { getLocalStorageItem } from "@/lib/localStorage";
import { useQueryClient } from "@tanstack/react-query";
import { formatDuration, mergeFinalTranscript } from "@/utils/sttHelpers";
import { cn } from "@/lib/utils";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || 'https://gateway-q74ibpv6ia-uc.a.run.app';

const SCREEN_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "community", label: "Community" },
  { value: "community/events", label: "Community - Events" },
  { value: "discover", label: "Discover" },
  { value: "discover/marketplace", label: "Discover - Marketplace" },
  { value: "business-hub", label: "Business Hub" },
  { value: "inbox", label: "Inbox" },
  { value: "inbox/messages", label: "Inbox - Messages" },
  { value: "health", label: "Health" },
  { value: "health/dashboard", label: "Health - Dashboard" },
  { value: "ai-assistant", label: "AI Assistant" },
  { value: "ai-assistant/orb", label: "AI Assistant - ORB" },
  { value: "wallet", label: "Wallet" },
  { value: "sharing", label: "Sharing" },
  { value: "memory/diary", label: "Memory - Diary" },
  { value: "memory/garden", label: "Memory - Garden" },
  { value: "calendar", label: "Calendar" },
  { value: "settings", label: "Settings" },
  { value: "profile", label: "Profile" },
  { value: "live-rooms", label: "Live Rooms" },
  { value: "notifications", label: "Notifications" },
  { value: "other", label: "Other" },
];

export type CaptureMode = 'health' | 'bug_report' | 'ux_improvement';

interface UnifiedCaptureCardProps {
  mode: CaptureMode;
  onModeChange?: (mode: 'bug_report' | 'ux_improvement') => void;
  onRecordingChange?: (isRecording: boolean) => void;
  onSaveComplete?: () => void;
  onSubmitted?: () => void;
}

export function UnifiedCaptureCard({
  mode,
  onModeChange,
  onRecordingChange,
  onSaveComplete,
  onSubmitted,
}: UnifiedCaptureCardProps) {
  const isHealthMode = mode === 'health';
  const isBugMode = !isHealthMode;

  // ---- Shared state ----
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  // iOS WKWebView (Appilix shell) reports webkitSpeechRecognition as present
  // but start() always fails with `service-not-allowed` — see
  // diaryAudioRecorder.ts. When true, capture goes through MediaRecorder +
  // backend transcription instead, same as VoiceDiaryRecorder/MobileSupport.
  const [isTranscribing, setIsTranscribing] = useState(false);

  // ---- Bug-mode state ----
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [affectedScreen, setAffectedScreen] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // ---- Refs ----
  const sttRef = useRef<ClientSTT | null>(null);
  const audioRecorderRef = useRef<DiaryAudioRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFinalTranscriptRef = useRef('');
  const lastFinalAtRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { toast } = useToast();
  const { selectedLanguage } = useLanguage();
  const { translate } = useTranslation();
  const queryClient = useQueryClient();
  const isAndroid = /Android/i.test(navigator.userAgent);
  const useBackendSTT = shouldUseBackendSTT();

  // Progressive disclosure: show expanded UI when recording or transcript exists
  const hasContent = isRecording || transcript.length > 0 || isTranscribing;

  // Notify parent of recording state
  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  // Tear down any in-flight capture on unmount so a dropped screen doesn't
  // leave a mic stream open or a timer running.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cancel();
        audioRecorderRef.current = null;
      }
      if (sttRef.current) {
        try { sttRef.current.stop(); } catch { /* noop */ }
      }
    };
  }, []);

  const resolveSttLanguage = () => {
    const storedLanguage = getLocalStorageItem('global', 'language', 'selected_language');
    return (typeof storedLanguage === 'string' ? storedLanguage : selectedLanguage)?.trim() || 'de-DE';
  };

  // ---- Backend STT (iOS WKWebView / Appilix) ----
  const startBackendRecording = async () => {
    if (!DiaryAudioRecorder.isSupported()) {
      toast({
        title: translate('capture.notSupported'),
        description: translate('capture.notSupportedDesc'),
        variant: "destructive",
      });
      return;
    }

    try {
      const recorder = new DiaryAudioRecorder({ language: resolveSttLanguage() });
      await recorder.start();
      audioRecorderRef.current = recorder;

      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingDuration(0);
      setTranscript('');
      setInterimText('');
      setShowConfirmation(false);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      if (isHealthMode) {
        toast({
          title: translate('capture.recordingStarted'),
          description: translate('capture.recordingStartedDesc'),
        });
      }
    } catch (error) {
      console.error('[UnifiedCapture] MediaRecorder start failed:', error);
      audioRecorderRef.current?.cancel();
      audioRecorderRef.current = null;
      isRecordingRef.current = false;
      setIsRecording(false);
      toast({
        title: translate('capture.recognitionError'),
        description: translate('capture.recognitionErrorDesc'),
        variant: "destructive",
      });
    }
  };

  const stopBackendRecording = async () => {
    const recorder = audioRecorderRef.current;
    audioRecorderRef.current = null;
    setIsRecording(false);
    setInterimText('');

    if (!recorder) return;
    setIsTranscribing(true);

    try {
      const blob = await recorder.stop();
      if (!blob || blob.size === 0) {
        toast({
          title: translate('capture.recognitionError'),
          description: translate('capture.recognitionErrorDesc'),
          variant: "destructive",
        });
        return;
      }

      const text = await transcribeAudioBlob(blob, resolveSttLanguage());
      if (text) {
        setTranscript(prev => mergeFinalTranscript(prev, text));
      }

      if (isHealthMode) {
        toast({
          title: translate('capture.recordingStopped'),
          description: translate('capture.recordingStoppedDesc'),
        });
      }
    } catch (error) {
      console.error('[UnifiedCapture] Backend transcription failed:', error);
      toast({
        title: translate('capture.recognitionError'),
        description: translate('capture.recognitionErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  // ---- STT Logic ----
  const startRecording = () => {
    if (useBackendSTT) {
      void startBackendRecording();
      return;
    }

    if (!ClientSTT.isSupported()) {
      toast({
        title: translate('capture.notSupported'),
        description: translate('capture.notSupportedDesc'),
        variant: "destructive",
      });
      return;
    }

    const storedLanguage = getLocalStorageItem('global', 'language', 'selected_language');
    const sttLanguage = (typeof storedLanguage === 'string' ? storedLanguage : selectedLanguage)?.trim() || 'de-DE';
    const useContinuous = !isAndroid;

    sttRef.current = new ClientSTT({
      language: sttLanguage,
      continuous: useContinuous,
      interimResults: true,
      onResult: (text, isFinal) => {
        const cleaned = text.trim();
        if (!cleaned) return;

        if (isFinal) {
          const normalized = cleaned.toLowerCase();
          const now = Date.now();
          const isImmediateDuplicate =
            normalized === lastFinalTranscriptRef.current &&
            now - lastFinalAtRef.current < 1500;

          if (isImmediateDuplicate) {
            setInterimText('');
            return;
          }

          lastFinalTranscriptRef.current = normalized;
          lastFinalAtRef.current = now;
          setTranscript(prev => mergeFinalTranscript(prev, cleaned));
          setInterimText('');
        } else {
          setInterimText(cleaned);
        }
      },
      onError: (error) => {
        if (error === 'no-speech' || error === 'aborted' || error === 'audio-capture') {
          return;
        }
        toast({
          title: translate('capture.recognitionError'),
          description: translate('capture.recognitionErrorDesc'),
          variant: "destructive",
        });
        stopRecording();
      },
      onEnd: () => {
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = null;
        }
        if (!isRecordingRef.current || !sttRef.current) return;
        setInterimText('');
        restartTimeoutRef.current = setTimeout(() => {
          if (!isRecordingRef.current || !sttRef.current) return;
          try {
            sttRef.current.setLanguage(sttLanguage);
            sttRef.current.start();
          } catch (e) {
            console.warn('[UnifiedCapture] Failed to restart STT:', e);
          }
        }, isAndroid ? 750 : 350);
      },
    });

    sttRef.current.setLanguage(sttLanguage);
    sttRef.current.start();
    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingDuration(0);
    setTranscript('');
    setInterimText('');
    lastFinalTranscriptRef.current = '';
    lastFinalAtRef.current = 0;
    setShowConfirmation(false);

    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    if (isHealthMode) {
      toast({
        title: translate('capture.recordingStarted'),
        description: translate('capture.recordingStartedDesc'),
      });
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (audioRecorderRef.current) {
      void stopBackendRecording();
      return;
    }

    if (sttRef.current) {
      sttRef.current.stop();
      setIsRecording(false);
      setInterimText('');
      if (isHealthMode) {
        toast({
          title: translate('capture.recordingStopped'),
          description: translate('capture.recordingStoppedDesc'),
        });
      }
    }
  };

  // ---- Health: Save diary entry ----
  const saveDiaryEntry = async () => {
    if (!transcript.trim()) {
      toast({ title: translate('capture.noContent'), description: translate('capture.noContentDesc'), variant: "destructive" });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('diary_entries').insert({
        user_id: user.id,
        text: transcript.trim(),
        duration: recordingDuration,
        source: 'voice',
      });
      if (error) throw error;

      setTranscript("");
      setRecordingDuration(0);
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
      onSaveComplete?.();

      toast({ title: translate('capture.entrySaved'), description: translate('capture.entrySavedDesc') });
    } catch {
      toast({ title: translate('capture.saveFailed'), description: translate('capture.saveFailedDesc'), variant: "destructive" });
    }
  };

  // ---- Bug: File handling ----
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    setAttachments(prev => [...prev, ...imageFiles]);
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrls(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // ---- Bug: Submit feedback ----
  const handleSendFeedback = async () => {
    if (!transcript.trim()) {
      toast({ title: translate('capture.noContent'), description: translate('capture.noContentBugDesc'), variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('feedback-attachments').upload(fileName, file);
        if (!uploadError) {
          const { data } = await supabase.storage.from('feedback-attachments').createSignedUrl(fileName, 31536000);
          if (data?.signedUrl) uploadedUrls.push(data.signedUrl);
        }
      }

      const res = await fetch(`${GATEWAY_URL}/api/v1/voice-feedback/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transcript: transcript.trim(),
          report_type: mode,
          severity,
          affected_screen: affectedScreen || undefined,
          attachments: uploadedUrls,
        }),
      });

      const result = await res.json();
      if (!result.ok) throw new Error(result.error || 'Submit failed');

      setTranscript('');
      setRecordingDuration(0);
      setAttachments([]);
      setPreviewUrls([]);
      setAffectedScreen('');
      setSeverity('medium');
      setShowConfirmation(true);
      onSubmitted?.();
    } catch (error) {
      console.error('[UnifiedCapture] Send error:', error);
      toast({ title: translate('capture.sendFailed'), description: translate('capture.sendFailedDesc'), variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // ---- Bug: Confirmation state ----
  if (isBugMode && showConfirmation) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm min-h-[340px] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 rounded-full bg-green-100 dark:bg-green-950/30">
          <div className="p-3 rounded-full bg-green-200 dark:bg-green-900/40">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">{translate('capture.reportSent')}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {translate('capture.reportSentDesc')}
        </p>
        <Button variant="outline" onClick={() => setShowConfirmation(false)}>
          {translate('capture.sendAnother')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-sm min-h-[340px] flex flex-col">
      {/* ---- Hero Mic Area ---- */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-8 pb-4">
        {/* Mic button */}
        <div className="relative">
          {isRecording && (
            <>
              <div className="absolute inset-0 -m-3 rounded-full bg-primary/10 animate-ping" />
              <div className="absolute inset-0 -m-1.5 rounded-full bg-primary/5" />
            </>
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            className={cn(
              "relative z-10 h-20 w-20 rounded-full flex items-center justify-center transition-all shadow-lg",
              isRecording
                ? "bg-destructive text-destructive-foreground scale-110"
                : isHealthMode
                  ? "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
                  : "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 dark:text-orange-300"
            )}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <Square className="h-8 w-8" />
            ) : isTranscribing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Mic className="h-9 w-9" />
            )}
          </button>
        </div>

        {/* Status text */}
        {isRecording ? (
          <div className="mt-4 flex items-center gap-3">
            <Badge variant="destructive" className="animate-pulse">{translate('capture.recording')}</Badge>
            <span className="text-xl font-mono font-bold text-destructive">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        ) : isTranscribing ? (
          <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {translate('capture.transcribing', 'Transcribing your recording…')}
          </p>
        ) : (
          !hasContent && (
            <p className="mt-4 text-sm text-muted-foreground">
              {isHealthMode ? translate('capture.tapToRecord') : translate('capture.tapToDescribe')}
            </p>
          )
        )}

        {/* Waveform visualization */}
        {isRecording && (
          <div className="flex items-end gap-1 h-10 mt-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-primary rounded-full w-2 animate-pulse"
                style={{
                  height: `${Math.random() * 32 + 12}px`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- Progressive: Transcript + contextual fields ---- */}
      {hasContent && (
        <div className="px-4 pb-4 space-y-3">
          {/* Transcript area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {isRecording
                  ? (useBackendSTT ? translate('capture.recording') : translate('capture.liveTranscription'))
                  : isHealthMode ? translate('capture.yourVoiceEntry') : translate('capture.yourFeedback')}
              </span>
              {!isRecording && recordingDuration > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {formatDuration(recordingDuration)}
                </Badge>
              )}
            </div>

            {isRecording && useBackendSTT && (
              <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                {translate('capture.backendRecordingHint', 'Recording — your transcription will appear after you tap Stop.')}
              </div>
            )}

            <Textarea
              value={transcript + (interimText ? ` ${interimText}` : '')}
              onChange={(e) => !isRecording && setTranscript(e.target.value)}
              placeholder={isRecording ? translate('capture.startSpeaking') : translate('capture.editOrType')}
              className="min-h-20 text-sm"
              disabled={isRecording || isTranscribing}
            />
            {interimText && isRecording && (
              <p className="text-[10px] text-muted-foreground italic">
                {translate('capture.interimHint')}
              </p>
            )}
          </div>

          {/* ---- Compact action row ---- */}
          {isBugMode && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Button
                variant="outline"
                size="xs"
                className="gap-1.5 text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
                {translate('capture.attach')}
              </Button>
            </div>
          )}

          {/* Bug attachment previews */}
          {isBugMode && previewUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border">
                  <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute top-0 right-0 p-0.5 bg-destructive text-destructive-foreground rounded-bl-lg"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ---- Bug contextual fields ---- */}
          {isBugMode && (
            <div className="space-y-3">
              {/* Report type toggle */}
              <div className="flex gap-2">
                <Button
                  variant={mode === "bug_report" ? "default" : "outline"}
                  size="xs"
                  className="gap-1.5 flex-1"
                  onClick={() => onModeChange?.("bug_report")}
                >
                  <Bug className="h-3.5 w-3.5" />
                  {translate('capture.bugReport')}
                </Button>
                <Button
                  variant={mode === "ux_improvement" ? "default" : "outline"}
                  size="xs"
                  className="gap-1.5 flex-1"
                  onClick={() => onModeChange?.("ux_improvement")}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  {translate('capture.uxImprovement')}
                </Button>
              </div>

              {/* Severity + affected screen */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">{translate('capture.severity')}</label>
                  <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{translate('capture.low')}</SelectItem>
                      <SelectItem value="medium">{translate('capture.medium')}</SelectItem>
                      <SelectItem value="high">{translate('capture.high')}</SelectItem>
                      <SelectItem value="critical">{translate('capture.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">{translate('capture.affectedScreen')}</label>
                  <Select value={affectedScreen} onValueChange={setAffectedScreen}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={translate('capture.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SCREEN_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ---- Save / Send action ---- */}
          {transcript.trim() && !isRecording && (
            isHealthMode ? (
              <Button onClick={saveDiaryEntry} className="w-full gap-2" size="sm">
                <Save className="h-4 w-4" />
                {translate('capture.saveEntry')}
              </Button>
            ) : (
              <Button
                onClick={handleSendFeedback}
                disabled={isSending}
                className="w-full gap-2"
                size="sm"
              >
                <Send className="h-4 w-4" />
                {isSending ? translate('capture.sending') : translate('capture.sendToTeam')}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
