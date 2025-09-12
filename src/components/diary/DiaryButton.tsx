import { useEffect, useRef, useState } from "react";
import { Mic, NotebookPen } from "lucide-react";
import { DiaryQuickEntry } from "./DiaryQuickEntry";

export default function DiaryButton() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [rec, setRec] = useState(false);
  const longPressId = useRef<number | null>(null);
  const recogRef = useRef<any>(null);

  // ---- Long-press (≥450ms) starts voice; tap opens text sheet ----
  function onPointerDown(e: React.PointerEvent) {
    if (longPressId.current) window.clearTimeout(longPressId.current);
    longPressId.current = window.setTimeout(() => startVoice(), 450);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (longPressId.current) {
      window.clearTimeout(longPressId.current);
      longPressId.current = null;
      if (!rec) {
        // it was a tap, not a hold
        setNote(""); 
        setOpen(true); // text mode: open empty sheet
      } else {
        stopVoice(); // releasing after hold stops recording
      }
    }
  }

  function startVoice() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { 
      setNote(""); 
      setOpen(true); 
      return; 
    } // fallback to text
    
    const r = new SR();
    r.lang = "en-US"; 
    r.interimResults = false; 
    r.continuous = false;
    r.onresult = (e: any) => { 
      setNote(e.results?.[0]?.[0]?.transcript || ""); 
      setRec(false); 
      setOpen(true); 
    };
    r.onerror = () => { 
      setNote(""); 
      setRec(false); 
      setOpen(true); 
    };
    recogRef.current = r; 
    setRec(true); 
    r.start();
  }

  function stopVoice() { 
    try { 
      recogRef.current?.stop(); 
    } catch {} 
    setRec(false); 
  }

  return (
    <>
      <button
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => { 
          if (e.key === "Enter" || e.key === " ") { 
            e.preventDefault(); 
            setNote(""); 
            setOpen(true); 
          } 
        }}
        aria-label="Diary"
        aria-pressed={rec}
        title={rec ? "Recording…" : "Diary"}
        className={[
          "absolute right-4 md:right-5 bottom-2 md:bottom-3", // inside corner
          "h-12 w-12 md:h-14 md:w-14 rounded-full select-none",
          "ring-1 ring-black/10 shadow-[0_6px_18px_rgba(0,0,0,0.12)]",
          "grid place-items-center transition-transform duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          rec ? "bg-[var(--brand-live)] text-white diary-pulse" :
                "text-white hover:scale-[1.03] active:scale-[0.98]"
        ].join(" ")}
        style={{
          background: rec ? undefined : "radial-gradient(120% 120% at 30% 20%, #0f172a 0%, #0b1220 100%)"
        }}
      >
        {/* stacked mic + pen */}
        <span className="relative inline-block" aria-hidden="true">
          <Mic className="h-4 w-4 absolute -left-0.5 -top-0.5 opacity-95" />
          <NotebookPen className="h-4 w-4 translate-x-2 translate-y-2 opacity-95" />
        </span>
      </button>

      <DiaryQuickEntry
        open={open}
        text={note}
        onClose={() => { 
          setOpen(false); 
          setNote(""); 
        }}
        autoFocusText // focus textarea when opened via tap or after transcript
      />
    </>
  );
}