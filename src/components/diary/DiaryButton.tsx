import { useRef, useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { notify, notifyError } from '@/lib/i18n-toast';

type Status = "idle" | "recording" | "stopping";

export default function DiaryButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [isSupported, setIsSupported] = useState(true);
  const { toast } = useToast();
  const { selectedLanguage } = useLanguage();
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const userStoppedRef = useRef<boolean>(false);
  const autoStopTimerRef = useRef<number | null>(null);
  const lastEntryIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  function toggleRecording() {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle") {
      startRecording();
    }
  }

  async function startRecording() {
    if (status !== "idle") return;

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SR) {
      setIsSupported(false);
      notifyError('toasts.diary.notSupported', 'toasts.diary.voiceDictationIsnTSupportedThis');
      return;
    }

    // Optional pre-permission (helps Chrome)
    try {
      const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
      stream?.getTracks().forEach(track => track.stop());
    } catch {
      // Permission prompt may have been shown already
    }

    recognitionRef.current = new SR();
    const r = recognitionRef.current;
    
    r.lang = selectedLanguage || navigator.language || "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 1;

    transcriptRef.current = "";
    userStoppedRef.current = false;
    setStatus("recording");

    r.onresult = (e: any) => {
      const res = e.results?.[0]?.[0]?.transcript ?? "";
      transcriptRef.current += (transcriptRef.current ? " " : "") + res.trim();
    };

    r.onerror = (e: any) => {
      // Don't show error if we stopped it ourselves
      if (userStoppedRef.current && (e.error === "aborted" || e.error === "no-speech")) return;
      
      const msg = e.error === "not-allowed" 
        ? "Microphone permission is blocked."
        : e.error === "audio-capture" 
        ? "No microphone available."
        : e.error === "network" 
        ? "Network error during transcription."
        : e.error === "no-speech" 
        ? "No speech detected."
        : "Recording issue.";
      
      notifyError('toasts.diary.recordingError');
    };

    r.onend = async () => {
      const text = (transcriptRef.current || "").trim();
      setStatus("idle");
      
      // If natural end without user stopping and no text, do nothing
      if (!userStoppedRef.current && !text) return;
      
      if (text) {
        await saveDiary({ text, source: "voice" });
        toastWithActions("Diary saved", [
          { label: "View", onClick: () => { window.history.pushState({}, '', '/memory/diary'); window.dispatchEvent(new PopStateEvent('popstate')); } },
          { label: "Undo", onClick: () => undoLastDiary() }
        ]);
      } else {
        notifyError('toasts.diary.noSpeech', 'toasts.diary.noSpeechDetectedTryAgainCloser');
      }
    };

    try {
      r.start();
      
      // Safety auto-stop after 60s
      autoStopTimerRef.current = window.setTimeout(() => {
        stopRecording();
      }, 60000);
    } catch {}
  }

  function stopRecording() {
    if (status !== "recording") return;
    
    setStatus("stopping");
    userStoppedRef.current = true;
    
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    
    try {
      recognitionRef.current?.stop();
    } catch {}

    // Fallback guard: if onend doesn't fire, finalize after 2s
    setTimeout(async () => {
      // Check if we're still in stopping state
      setStatus(currentStatus => {
        if (currentStatus === "stopping") {
          const text = (transcriptRef.current || "").trim();
          if (text) {
            saveDiary({ text, source: "voice" }).then(() => {
              toastWithActions("Diary saved", [
                { label: "View", onClick: () => { window.history.pushState({}, '', '/memory/diary'); window.dispatchEvent(new PopStateEvent('popstate')); } },
                { label: "Undo", onClick: () => undoLastDiary() }
              ]);
            });
          }
          return "idle";
        }
        return currentStatus;
      });
    }, 2000);
  }

  async function saveDiary({ text, source }: { text: string; source: string }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifyError('toasts.diary.notAuthenticated', 'toasts.diary.pleaseLogSaveDiaryEntries');
        return;
      }

      const { data, error } = await supabase.from('diary_entries').insert({
        user_id: user.id,
        text,
        duration: 0,
        source: 'voice',
        tags: ['voice', 'diary']
      }).select().single();

      if (error) throw error;
      
      if (data) {
        lastEntryIdRef.current = data.id;
      }
    } catch (error) {
      console.error("Error saving diary entry:", error);
      notifyError('toasts.diary.error', 'toasts.diary.failedSaveDiaryEntry');
    }
  }

  function toastWithActions(message: string, actions: Array<{ label: string; onClick: () => void }>) {
    // Show main toast with first action  
    toast({
      title: message,
      description: new Date().toLocaleTimeString(),
      action: actions[0] ? (
        <button onClick={actions[0].onClick} className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
          {actions[0].label}
        </button>
      ) : undefined,
    });

    // Show undo option after 1 second
    if (actions[1]) {
      setTimeout(() => {
        toast({
          title: "Undo available",
          description: "Delete the last diary entry",
          action: (
            <button onClick={actions[1].onClick} className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
              {actions[1].label}
            </button>
          )
        });
      }, 1000);
    }
  }

  async function undoLastDiary() {
    try {
      const entryId = lastEntryIdRef.current;
      if (!entryId) return;

      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      
      notify('toasts.diary.success', 'toasts.diary.diaryEntryDeleted');
      lastEntryIdRef.current = null;
    } catch (error) {
      console.error("Error deleting diary entry:", error);
      notifyError('toasts.diary.error', 'toasts.diary.failedDeleteDiaryEntry');
    }
  }

  const isRecording = status === "recording";

  return (
    <button
      onClick={toggleRecording}
      onKeyDown={(e) => { 
        if (e.key === "Enter" || e.key === " ") { 
          e.preventDefault(); 
          toggleRecording();
        } 
      }}
      role="button"
      aria-label="Diary voice dictation"
      aria-pressed={isRecording}
      title={
        !isSupported 
          ? "Voice dictation not supported" 
          : isRecording 
            ? "Recording…" 
            : "Diary"
      }
      disabled={!isSupported}
      className={[
        "absolute right-4 md:right-5 bottom-2 md:bottom-3", // inside corner
        "h-12 w-12 md:h-14 md:w-14 rounded-full select-none",
        "ring-1 ring-black/10 shadow-[0_6px_18px_rgba(0,0,0,0.12)]",
        "grid place-items-center transition-transform duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !isSupported 
          ? "bg-purple-100/60 dark:bg-purple-900/20 text-purple-400 cursor-not-allowed" 
          : isRecording 
            ? "bg-red-600 text-white diary-pulse" 
            : "bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 hover:scale-[1.03] active:scale-[0.98]"
      ].join(" ")}
    >
      <FileText className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}