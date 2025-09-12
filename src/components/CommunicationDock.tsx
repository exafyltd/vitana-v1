import DiaryOrb from "@/components/diary/DiaryOrb";

export default function CommunicationDock() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),0px)] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-7xl px-4 relative">
        {/* Communication Bar */}
        <div className="h-[var(--dock-h)] rounded-t-[var(--dock-radius)] bg-white shadow-2xl ring-1 ring-black/5 flex items-center gap-3 px-4">
          {/* Left controls remain unchanged - add existing mic, camera, input here */}
          <div className="flex-1 flex items-center gap-3">
            {/* Placeholder for existing controls */}
            <input 
              type="text" 
              placeholder="Type something..." 
              className="flex-1 border-0 outline-none bg-transparent text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Circular Diary orb anchored inside the bar corner */}
        <DiaryOrb />
      </div>
    </div>
  );
}
