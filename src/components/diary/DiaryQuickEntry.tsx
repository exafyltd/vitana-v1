import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function DiaryQuickEntry({
  open,
  text = "",
  onClose
}: {
  open: boolean;
  text?: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState(text);
  const [saving, setSaving] = useState(false);

  // Update note when text prop changes
  useEffect(() => {
    setNote(text);
  }, [text]);

  const handleSave = () => {
    setSaving(true);
    
    // Emit diary.entry.create event (stub)
    console.log("diary.entry.create", { note, mood: 3, energy: 3, stress: 3 });
    
    // Close after a short delay
    setTimeout(() => {
      setSaving(false);
      onClose();
    }, 500);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>New Diary Entry</SheetTitle>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            placeholder="How are you today?" 
            className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="grid grid-cols-3 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="range" min={1} max={5} defaultValue={3} className="flex-1" />
              Mood
            </label>
            <label className="flex items-center gap-2">
              <input type="range" min={1} max={5} defaultValue={3} className="flex-1" />
              Energy
            </label>
            <label className="flex items-center gap-2">
              <input type="range" min={1} max={5} defaultValue={3} className="flex-1" />
              Stress
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked className="rounded border border-input" />
            Save to Infinite Memory
          </label>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            className="bg-[hsl(var(--brand-live))] hover:opacity-90 text-white" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Entry"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}