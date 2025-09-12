import DiaryOrb from "@/components/diary/DiaryOrb";
import { Button } from "@/components/ui/button";
import { Mic, Video } from "lucide-react";

// Placeholder components for existing controls
function MicButton() {
  return (
    <Button variant="ghost" size="icon" title="Microphone">
      <Mic className="h-5 w-5" />
    </Button>
  );
}

function CameraButton() {
  return (
    <Button variant="ghost" size="icon" title="Camera">
      <Video className="h-5 w-5" />
    </Button>
  );
}

function ChatInput({ placeholder }: { placeholder: string }) {
  return (
    <input 
      type="text" 
      placeholder={placeholder}
      className="flex-1 border-0 outline-none bg-transparent text-sm placeholder:text-muted-foreground"
    />
  );
}

export default function CommunicationDock() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),0px)] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-7xl px-4">
        {/* IMPORTANT: relative here so the orb can anchor inside */}
        <div className="relative h-[var(--dock-h)] rounded-t-[var(--dock-radius)]
                        bg-white shadow-2xl ring-1 ring-black/5 px-4">

          {/* Left controls (restored) */}
          <div className="flex h-full items-center gap-3 pr-24 sm:pr-28">
            <MicButton />          
            <CameraButton />       
            <ChatInput placeholder="Type something..." />
          </div>

          {/* Orb sits INSIDE the bar, bottom-right */}
          <DiaryOrb />
        </div>
      </div>
    </div>
  );
}
