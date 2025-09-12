import { Button } from "@/components/ui/button";
import { Mic, Loader2 } from "lucide-react";
import { useState } from "react";
import DiaryQuickEntry from "@/components/diary/DiaryQuickEntry";

export default function CommunicationDock() {
  const [isRec, setIsRec] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),0px)] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-7xl px-4">
        <div className="h-[var(--dock-h)] rounded-t-[var(--dock-radius)] bg-white shadow-2xl ring-1 ring-black/5 flex items-center gap-3 px-4">
          {/* Left: existing controls — leave as-is */}
          <div className="flex-1">{/* existing input / icons remain untouched */}</div>

          {/* Right: DIARY (voice dictation) */}
          <DiaryVoiceButton
            isRec={isRec}
            isBusy={isBusy}
            onStart={() => startVoice(setIsRec, setIsBusy, setDraft)}
            onStop={() => stopVoice(setIsRec)}
          />
        </div>
      </div>

      <DiaryQuickEntry open={Boolean(draft)} text={draft} onClose={() => setDraft("")} />
    </div>
  );
}

/** Minimal in-browser speech-to-text (Web Speech API); non-blocking, safe fallback */
let recog: any;
function startVoice(setRec: any, setBusy: any, setDraft: any) {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    setDraft(""); // open empty sheet as fallback
    return;
  }
  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  recog = new SR(); 
  recog.lang = "en-US"; 
  recog.interimResults = false; 
  recog.continuous = false;
  setRec(true); 
  setBusy(false);
  recog.onresult = (e: any) => { 
    const t = e.results?.[0]?.[0]?.transcript || ""; 
    setDraft(t); 
    setRec(false); 
  };
  recog.onerror = () => { 
    setDraft(""); 
    setRec(false); 
  };
  recog.start();
}

function stopVoice(setRec: any) { 
  try { 
    recog?.stop(); 
  } catch {} 
  setRec(false); 
}

function DiaryVoiceButton({ isRec, isBusy, onStart, onStop }: {
  isRec: boolean;
  isBusy: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <Button
      size="lg"
      onClick={isRec ? onStop : onStart}
      className={`h-11 px-4 rounded-full gap-2 ${
        isRec ? "bg-[hsl(var(--brand-live))] text-white hover:opacity-90" : ""
      }`}
      aria-pressed={isRec}
      aria-label="Diary voice dictation"
    >
      {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
      <span className="hidden sm:inline">{isRec ? "Recording…" : "Diary"}</span>
    </Button>
  );
}