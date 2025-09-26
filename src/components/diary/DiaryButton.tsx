import { useRef, useState, useEffect } from "react";
import { Mic, NotebookPen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiaryEntry {
  id: string;
  text: string;
  source: string;
  tags: string[];
  created_at: string;
}

type Status = "idle" | "recording" | "stopping";

export default function DiaryButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [isSupported, setIsSupported] = useState(true);
  const { toast } = useToast();
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const userStoppedRef = useRef<boolean>(false);
  const autoStopTimerRef = useRef<number | null>(null);

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
      toast({
        title: "Not Supported",
        description: "Voice dictation isn't supported in this browser.",
        variant: "destructive"
      });
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
    
    r.lang = navigator.language || "en-US";
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
      
      toast({
        title: "Recording Error",
        description: msg,
        variant: "destructive"
      });
    };

    r.onend = () => {
      const text = (transcriptRef.current || "").trim();
      setStatus("idle");
      
      // If natural end without user stopping and no text, do nothing
      if (!userStoppedRef.current && !text) return;
      
      if (text) {
        saveDiary({ text, source: "voice" });
        toastWithActions("Diary saved", [
          { label: "View", onClick: () => window.location.href = '/memory/diary' },
          { label: "Undo", onClick: () => undoLastDiary() }
        ]);
      } else {
        toast({
          title: "No Speech",
          description: "No speech detected. Try again closer to the mic.",
          variant: "destructive"
        });
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
    setTimeout(() => {
      // Check if we're still in stopping state
      setStatus(currentStatus => {
        if (currentStatus === "stopping") {
          const text = (transcriptRef.current || "").trim();
          if (text) {
            saveDiary({ text, source: "voice" });
            toastWithActions("Diary saved", [
              { label: "View", onClick: () => window.location.href = '/memory/diary' },
              { label: "Undo", onClick: () => undoLastDiary() }
            ]);
          }
          return "idle";
        }
        return currentStatus;
      });
    }, 2000);
  }

  function saveDiary({ text, source }: { text: string; source: string }) {
    try {
      const entry: DiaryEntry = {
        id: crypto.randomUUID(),
        text,
        source,
        tags: ['voice', 'diary'],
        created_at: new Date().toISOString()
      };

      const existingEntries = JSON.parse(localStorage.getItem('diary_entries') || '[]');
      const updatedEntries = [entry, ...existingEntries];
      localStorage.setItem('diary_entries', JSON.stringify(updatedEntries));
      
      (window as any).lastDiaryEntryId = entry.id;
    } catch (error) {
      console.error("Error saving diary entry:", error);
      toast({
        title: "Error",
        description: "Failed to save diary entry",
        variant: "destructive"
      });
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

  function undoLastDiary() {
    try {
      const entryId = (window as any).lastDiaryEntryId;
      if (!entryId) return;

      const existingEntries = JSON.parse(localStorage.getItem('diary_entries') || '[]');
      const filteredEntries = existingEntries.filter((entry: DiaryEntry) => entry.id !== entryId);
      localStorage.setItem('diary_entries', JSON.stringify(filteredEntries));
      
      toast({
        title: "Success",
        description: "Diary entry deleted"
      });
      (window as any).lastDiaryEntryId = null;
    } catch (error) {
      console.error("Error deleting diary entry:", error);
      toast({
        title: "Error", 
        description: "Failed to delete diary entry",
        variant: "destructive"
      });
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
          ? "text-white opacity-60 cursor-not-allowed" 
          : isRecording 
            ? "text-white diary-pulse" 
            : "text-white hover:scale-[1.03] active:scale-[0.98]"
      ].join(" ")}
      style={{
        background: isRecording ? "var(--brand-live)" : "radial-gradient(120% 120% at 30% 20%, #0f172a 0%, #0b1220 100%)"
      }}
    >
      {/* stacked mic + pen */}
      <span className="relative inline-block" aria-hidden="true">
        <Mic className="h-4 w-4 absolute -left-0.5 -top-0.5 opacity-95" />
        <NotebookPen className="h-4 w-4 translate-x-2 translate-y-2 opacity-95" />
      </span>
    </button>
  );
}