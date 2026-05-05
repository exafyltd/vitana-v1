import { useState, useRef } from "react";
import { Mic, Square, Send, Plus, X, Bug, Lightbulb, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { ClientSTT } from "@/utils/clientSTT";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalStorageItem } from "@/lib/localStorage";
import { notifyError, t } from '@/lib/i18n-toast';

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

interface FeedbackRecorderProps {
  onSubmitted?: () => void;
}

export function FeedbackRecorder({ onSubmitted }: FeedbackRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [reportType, setReportType] = useState<"bug_report" | "ux_improvement">("bug_report");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [affectedScreen, setAffectedScreen] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const sttRef = useRef<ClientSTT | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRecordingRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFinalTranscriptRef = useRef('');
  const lastFinalAtRef = useRef(0);
  const { toast } = useToast();
  const { selectedLanguage } = useLanguage();
  const isAndroid = /Android/i.test(navigator.userAgent);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Ported STT helpers from VoiceDiaryRecorder ---
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

  const startRecording = () => {
    if (!ClientSTT.isSupported()) {
      notifyError('toasts.feedback.notSupported', 'toasts.feedback.speechRecognitionNotSupportedThisBrowser');
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
        // Recoverable errors on mobile — let onEnd auto-restart
        if (error === 'no-speech' || error === 'aborted' || error === 'audio-capture') {
          return;
        }
        notifyError('toasts.feedback.recognitionError', 'toasts.feedback.speechRecognitionEncounteredErrorPleaseTry');
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
            console.warn('[FeedbackRecorder] Failed to restart STT:', e);
          }
        }, isAndroid ? 750 : 350);
      }
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
  };

  const stopRecording = () => {
    // Set ref FIRST to prevent onEnd from restarting
    isRecordingRef.current = false;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (sttRef.current) {
      sttRef.current.stop();
      setIsRecording(false);
      setInterimText('');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

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

  const handleSend = async () => {
    if (!transcript.trim()) {
      notifyError('toasts.feedback.noContent', 'toasts.feedback.pleaseRecordTypeYourFeedbackBefore');
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Upload attachments if any
      const uploadedUrls: string[] = [];
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('feedback-attachments')
          .upload(fileName, file);

        if (!uploadError) {
          const { data } = await supabase.storage
            .from('feedback-attachments')
            .createSignedUrl(fileName, 31536000);
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
          report_type: reportType,
          severity,
          affected_screen: affectedScreen || undefined,
          attachments: uploadedUrls,
        }),
      });

      const result = await res.json();
      if (!result.ok) throw new Error(result.error || 'Submit failed');

      // Reset form and show confirmation
      setTranscript('');
      setRecordingDuration(0);
      setAttachments([]);
      setPreviewUrls([]);
      setAffectedScreen('');
      setSeverity('medium');
      setReportType('bug_report');
      setShowConfirmation(true);

      onSubmitted?.();
    } catch (error) {
      console.error('[FeedbackRecorder] Send error:', error);
      notifyError('toasts.feedback.sendFailed', 'toasts.feedback.couldNotSendYourFeedbackPlease');
    } finally {
      setIsSending(false);
    }
  };

  // Confirmation state
  if (showConfirmation) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="p-4 rounded-full bg-green-100 dark:bg-green-950/30">
          <div className="p-3 rounded-full bg-green-200 dark:bg-green-900/40">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">{t('screens.feedback.reportSent')}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {t('screens.feedback.exafyTeamAppreciatesYourSupportMake')}
        </p>
        <Button variant="outline" onClick={() => setShowConfirmation(false)}>
          {t('screens.feedback.sendAnotherReport')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recording Controls - matching VoiceDiaryRecorder layout */}
      <div className="flex items-center justify-center relative py-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            size="lg"
            className="h-16 w-16 rounded-full bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300"
          >
            <Mic className="h-8 w-8" />
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
                {t('screens.feedback.recording')}
              </Badge>
              <div className="text-2xl font-mono font-bold text-destructive mt-1">
                {formatDuration(recordingDuration)}
              </div>
            </div>
          </div>
        )}

        {/* + button for attachments — absolute right, matching Health Diary layout */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          aria-label={t('screens.feedback.attachScreenshots')}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">{t('screens.feedback.tapMicDescribeIssue')}</p>

      {/* Audio Visualization - matching VoiceDiaryRecorder */}
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

      {/* Attachment Previews */}
      {previewUrls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {previewUrls.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
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

      {/* Transcript Area - in a Card matching VoiceDiaryRecorder */}
      {(isRecording || transcript) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                {isRecording ? "Live Transcription" : "Your Feedback"}
              </span>
              {!isRecording && recordingDuration > 0 && (
                <Badge variant="outline">{t('screens.feedback.durationValue0', { value0: formatDuration(recordingDuration) })}</Badge>
              )}
            </div>
            <Textarea
              value={transcript + (interimText ? ` ${interimText}` : '')}
              onChange={(e) => !isRecording && setTranscript(e.target.value)}
              placeholder={isRecording ? "Start speaking..." : "Edit your feedback or type directly..."}
              className="min-h-24"
              disabled={isRecording}
            />
            {interimText && isRecording && (
              <p className="text-xs text-muted-foreground italic">{t('screens.feedback.interimTextAppearsGrayUntilFinalized')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Type Toggle */}
      <div className="flex gap-2">
        <Button
          variant={reportType === "bug_report" ? "default" : "outline"}
          size="sm"
          className="gap-2 flex-1"
          onClick={() => setReportType("bug_report")}
        >
          <Bug className="h-4 w-4" />
          {t('screens.feedback.bugReport')}
        </Button>
        <Button
          variant={reportType === "ux_improvement" ? "default" : "outline"}
          size="sm"
          className="gap-2 flex-1"
          onClick={() => setReportType("ux_improvement")}
        >
          <Lightbulb className="h-4 w-4" />
          {t('screens.feedback.uxImprovement')}
        </Button>
      </div>

      {/* Metadata: Severity + Affected Screen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t('screens.feedback.severity')}</label>
          <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t('screens.feedback.low')}</SelectItem>
              <SelectItem value="medium">{t('screens.feedback.medium')}</SelectItem>
              <SelectItem value="high">{t('screens.feedback.high')}</SelectItem>
              <SelectItem value="critical">{t('screens.feedback.critical')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t('screens.feedback.affectedScreen')}</label>
          <Select value={affectedScreen} onValueChange={setAffectedScreen}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('screens.feedback.select')} />
            </SelectTrigger>
            <SelectContent>
              {SCREEN_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Send Button */}
      {transcript && !isRecording && (
        <Button
          onClick={handleSend}
          disabled={isSending}
          className="w-full gap-2"
          size="lg"
        >
          <Send className="h-4 w-4" />
          {isSending ? "Sending..." : "Send to Exafy Team"}
        </Button>
      )}
    </div>
  );
}
