import { useState, useRef } from "react";
import { Mic, Square, Send, Paperclip, X, Bug, Lightbulb, CheckCircle2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClientSTT } from "@/utils/clientSTT";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { toast } = useToast();
  const { selectedLanguage } = useLanguage();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = () => {
    if (!ClientSTT.isSupported()) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    sttRef.current = new ClientSTT({
      language: selectedLanguage || 'en-US',
      continuous: true,
      interimResults: true,
      onResult: (text, isFinal) => {
        if (isFinal) {
          setTranscript(prev => prev + (prev ? ' ' : '') + text);
          setInterimText('');
        } else {
          setInterimText(text);
        }
      },
      onError: () => {
        toast({
          title: "Recognition Error",
          description: "Speech recognition encountered an error. Please try again.",
          variant: "destructive",
        });
        stopRecording();
      },
      onEnd: () => {
        // Auto-restart if still recording
      }
    });

    sttRef.current.start();
    setIsRecording(true);
    setRecordingDuration(0);
    setTranscript('');
    setInterimText('');
    setShowConfirmation(false);

    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (sttRef.current && isRecording) {
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
      toast({
        title: "No Content",
        description: "Please record or type your feedback before sending.",
        variant: "destructive",
      });
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
      toast({
        title: "Send Failed",
        description: "Could not send your feedback. Please try again.",
        variant: "destructive",
      });
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
        <h3 className="text-lg font-semibold">Report Sent!</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          The Exafy team appreciates your support to make Vitanaland a better experience every day.
        </p>
        <Button variant="outline" onClick={() => setShowConfirmation(false)}>
          Send Another Report
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Report Type Toggle */}
      <div className="flex gap-2">
        <Button
          variant={reportType === "bug_report" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setReportType("bug_report")}
        >
          <Bug className="h-4 w-4" />
          Bug Report
        </Button>
        <Button
          variant={reportType === "ux_improvement" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setReportType("ux_improvement")}
        >
          <Lightbulb className="h-4 w-4" />
          UX Improvement
        </Button>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <Button onClick={startRecording} size="lg" className="gap-2">
            <Mic className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="destructive" onClick={stopRecording} size="lg" className="gap-2">
              <Square className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <Badge variant="destructive" className="animate-pulse">
                Recording
              </Badge>
              <span className="text-xs text-muted-foreground tabular-nums mt-1">
                {formatDuration(recordingDuration)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Audio Visualization */}
      {isRecording && (
        <div className="flex items-center justify-center py-3">
          <div className="flex items-end gap-1 h-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-destructive rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.1}s`,
                  minHeight: '4px',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Transcript Area */}
      {(isRecording || transcript) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isRecording ? "Live Transcription" : "Your Feedback"}
            </span>
            {!isRecording && recordingDuration > 0 && (
              <span className="text-xs text-muted-foreground">
                Duration: {formatDuration(recordingDuration)}
              </span>
            )}
          </div>
          <Textarea
            value={isRecording ? transcript + (interimText ? ` ${interimText}` : '') : transcript}
            onChange={(e) => !isRecording && setTranscript(e.target.value)}
            placeholder={isRecording ? "Start speaking..." : "Edit your feedback or type directly..."}
            className="min-h-24"
            disabled={isRecording}
          />
        </div>
      )}

      {/* Metadata: Severity + Affected Screen */}
      {(transcript || !isRecording) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Severity</label>
            <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Affected Screen</label>
            <Select value={affectedScreen} onValueChange={setAffectedScreen}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {SCREEN_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Attachments */}
      <div className="space-y-2">
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
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          Attach Screenshots
        </Button>

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
