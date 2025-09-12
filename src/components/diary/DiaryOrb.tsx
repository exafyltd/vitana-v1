import { useRef, useState } from "react";
import { Mic, NotebookPen, Loader2 } from "lucide-react";
import DiaryQuickEntry from "@/components/diary/DiaryQuickEntry";

export default function DiaryOrb() {
  const [rec, setRec] = useState(false);
  const [busy] = useState(false);
  const [text, setText] = useState("");
  const recogRef = useRef<any>(null);

  function start() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { 
      setText(""); // Fallback: open empty sheet
      return; 
    }
    setRec(true);
    const r = new SR();
    r.lang = "en-US"; 
    r.interimResults = false; 
    r.continuous = false;
    r.onresult = (e: any) => { 
      setText(e.results?.[0]?.[0]?.transcript || ""); 
      setRec(false); 
    };
    r.onerror = () => { 
      setText(""); 
      setRec(false); 
    };
    recogRef.current = r; 
    r.start();
  }

  function stop() { 
    try { 
      recogRef.current?.stop(); 
    } catch {} 
    setRec(false); 
  }

  return (
    <>
      <button
        onClick={() => (rec ? stop() : start())}
        aria-label="Diary voice dictation"
        aria-pressed={rec}
        title={rec ? "Recording…" : "Diary"}
        className={[
          "absolute right-4 md:right-6 top-1/2 -translate-y-1/2",
          "h-12 w-12 md:h-14 md:w-14 rounded-full ring-1 ring-black/10",
          "shadow-[0_6px_18px_rgba(0,0,0,0.12)] grid place-items-center",
          "transition-transform duration-150 select-none",
          rec ? "bg-[hsl(var(--brand-live))] text-white diary-pulse" :
                "bg-slate-900 text-white hover:scale-[1.03] active:scale-[0.98]"
        ].join(" ")}
        style={{ 
          backgroundImage: rec ? "none" : "linear-gradient(180deg, #0f172a, #0b1220)" 
        }}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <div className="relative">
            <Mic className="h-5 w-5 absolute -left-0.5 -top-0.5 opacity-90" />
            <NotebookPen className="h-5 w-5 translate-x-2 translate-y-2 opacity-90" />
          </div>
        )}
      </button>

      {/* Open sheet when transcript (or fallback) is ready */}
      <DiaryQuickEntry open={text !== ""} text={text} onClose={() => setText("")} />
    </>
  );
}