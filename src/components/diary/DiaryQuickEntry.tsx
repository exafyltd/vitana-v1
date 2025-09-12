import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface DiaryQuickEntryProps {
  open: boolean;
  text?: string;
  onClose: () => void;
}

export default function DiaryQuickEntry({ open, text = "", onClose }: DiaryQuickEntryProps) {
  const [note, setNote] = useState(text);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);

  useEffect(() => setNote(text), [text]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>New Diary Entry</SheetTitle>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          <textarea
            value={note} 
            onChange={e => setNote(e.target.value)}
            placeholder="How are you today?"
            className="min-h-[140px] w-full rounded-md border p-3"
          />
          <div className="grid grid-cols-3 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input 
                type="range" 
                min={1} 
                max={5} 
                value={mood} 
                onChange={e => setMood(+e.target.value)}
              /> 
              Mood
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="range" 
                min={1} 
                max={5} 
                value={energy} 
                onChange={e => setEnergy(+e.target.value)}
              /> 
              Energy
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="range" 
                min={1} 
                max={5} 
                value={stress} 
                onChange={e => setStress(+e.target.value)}
              /> 
              Stress
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked /> 
            Save to Infinite Memory
          </label>
        </div>

        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-[hsl(var(--brand-live))] hover:opacity-90 text-white"
            onClick={() => {
              // TODO: persist diary entry; emit analytics
              // window.dispatchEvent(new CustomEvent("diary.entry.create", { detail: { note, mood, energy, stress } }));
              onClose();
            }}
          >
            Save Entry
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}