import { useRef, useState } from "react";
import { Mic, NotebookPen } from "lucide-react";
import { toast } from "sonner";

interface DiaryEntry {
  id: string;
  text: string;
  source: string;
  tags: string[];
  created_at: string;
}

export default function DiaryButton() {
  const [rec, setRec] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recogRef = useRef<any>(null);
  const timeoutRef = useRef<number | null>(null);

  function toggleRecording() {
    if (rec) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function startRecording() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SR) {
      setIsSupported(false);
      toast.error("Voice dictation isn't supported in this browser");
      return;
    }

    // Check microphone permission
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => {
        const recognition = new SR();
        recognition.lang = navigator.language || 'en-US';
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setRec(true);
          // Auto-stop at 60s for safety
          timeoutRef.current = window.setTimeout(() => {
            stopRecording();
          }, 60000);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          saveDiaryEntry(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setRec(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          if (event.error === 'not-allowed') {
            toast.error("Allow mic in browser settings");
          } else {
            toast.error("Recording failed. Please try again.");
          }
        };

        recognition.onend = () => {
          setRec(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        };

        recogRef.current = recognition;
        recognition.start();
      })
      .catch(() => {
        toast.error("Allow mic in browser settings");
      });
  }

  function stopRecording() {
    if (recogRef.current) {
      recogRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setRec(false);
  }

  function saveDiaryEntry(transcript: string) {
    const finalTranscript = transcript.trim() || "(no speech detected)";
    
    if (finalTranscript === "(no speech detected)") {
      toast.error("No speech detected");
      return;
    }

    try {
      // Create diary entry
      const entry: DiaryEntry = {
        id: crypto.randomUUID(),
        text: finalTranscript,
        source: 'voice',
        tags: ['voice', 'diary'],
        created_at: new Date().toISOString()
      };

      // Get existing entries
      const existingEntries = JSON.parse(localStorage.getItem('diary_entries') || '[]');
      const updatedEntries = [entry, ...existingEntries];
      
      // Save to localStorage
      localStorage.setItem('diary_entries', JSON.stringify(updatedEntries));

      // Show success toast with actions
      toast.success("Diary saved", {
        description: new Date().toLocaleTimeString(),
        action: {
          label: "View",
          onClick: () => window.location.href = '/memory/diary'
        },
        duration: 10000
      });

      // Store entry ID for potential undo
      (window as any).lastDiaryEntryId = entry.id;
      
      // Show undo option for 10 seconds
      setTimeout(() => {
        if ((window as any).lastDiaryEntryId === entry.id) {
          toast("Undo available", {
            description: "Delete the last diary entry",
            action: {
              label: "Undo",
              onClick: () => undoDiaryEntry(entry.id)
            },
            duration: 5000
          });
        }
      }, 1000);

    } catch (error) {
      console.error("Error saving diary entry:", error);
      toast.error("Failed to save diary entry");
    }
  }

  function undoDiaryEntry(entryId: string) {
    try {
      const existingEntries = JSON.parse(localStorage.getItem('diary_entries') || '[]');
      const filteredEntries = existingEntries.filter((entry: DiaryEntry) => entry.id !== entryId);
      localStorage.setItem('diary_entries', JSON.stringify(filteredEntries));
      
      toast.success("Diary entry deleted");
      (window as any).lastDiaryEntryId = null;
    } catch (error) {
      console.error("Error deleting diary entry:", error);
      toast.error("Failed to delete diary entry");
    }
  }

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
      aria-pressed={rec}
      title={
        !isSupported 
          ? "Voice dictation not supported" 
          : rec 
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
          : rec 
            ? "text-white diary-pulse" 
            : "text-white hover:scale-[1.03] active:scale-[0.98]"
      ].join(" ")}
      style={{
        background: rec ? "var(--brand-live)" : "radial-gradient(120% 120% at 30% 20%, #0f172a 0%, #0b1220 100%)"
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