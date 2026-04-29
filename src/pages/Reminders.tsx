/**
 * VTID-02601 — Reminders list page.
 *
 * - Upcoming + Recent sections
 * - Per-row red trash (single-click + AlertDialog confirm)
 * - "Delete all" link (AlertDialog with count)
 * - "+ New reminder" modal with action_text + datetime-local picker
 *
 * Aligns with the plan: simple, fast surface for users who want to manage
 * their reminders. Voice path via ORB stays the primary creation flow.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useReminders, useCreateReminder, useDeleteReminder, useDeleteAllReminders, useCompleteReminder } from "@/hooks/useReminders";
import { ReminderRow } from "@/lib/reminders-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function isoLocalNow(plusMinutes = 5): string {
  const d = new Date(Date.now() + plusMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ReminderRowItem: React.FC<{ reminder: ReminderRow; onDelete: (r: ReminderRow) => void; onComplete: (r: ReminderRow) => void }> = ({ reminder, onDelete, onComplete }) => {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{reminder.action_text}</div>
        <div className="text-sm text-muted-foreground">{formatTime(reminder.next_fire_at)}</div>
        {reminder.description ? (
          <div className="text-xs text-muted-foreground mt-1 truncate">{reminder.description}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {reminder.status === "pending" || reminder.status === "fired" ? (
          <Button size="icon" variant="ghost" aria-label="Mark done" onClick={() => onComplete(reminder)}>
            <Check className="h-4 w-4 text-muted-foreground" />
          </Button>
        ) : null}
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete reminder"
          onClick={() => onDelete(reminder)}
          className="hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

const Reminders: React.FC = () => {
  const { data: list = [], isLoading } = useReminders({ include_fired: true, limit: 100 });
  const createMut = useCreateReminder();
  const deleteMut = useDeleteReminder();
  const deleteAllMut = useDeleteAllReminders();
  const completeMut = useCompleteReminder();

  const [openCreate, setOpenCreate] = useState(false);
  const [actionText, setActionText] = useState("");
  const [spokenMessage, setSpokenMessage] = useState("");
  const [whenLocal, setWhenLocal] = useState(isoLocalNow(5));
  const [description, setDescription] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<ReminderRow | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const upcoming = useMemo(
    () =>
      list
        .filter((r) => r.status === "pending" || r.status === "dispatching")
        .sort((a, b) => a.next_fire_at.localeCompare(b.next_fire_at)),
    [list],
  );
  const recent = useMemo(
    () =>
      list
        .filter((r) => r.status === "fired" || r.status === "completed" || r.status === "cancelled")
        .sort((a, b) => b.next_fire_at.localeCompare(a.next_fire_at))
        .slice(0, 30),
    [list],
  );

  const handleCreate = async () => {
    const text = actionText.trim();
    if (!text) {
      toast.error("Please enter what to remind you about");
      return;
    }
    if (!whenLocal) {
      toast.error("Please pick a time");
      return;
    }
    const fireAt = new Date(whenLocal);
    if (isNaN(fireAt.getTime())) {
      toast.error("Invalid time");
      return;
    }
    try {
      await createMut.mutateAsync({
        action_text: text,
        spoken_message: spokenMessage.trim() || `Time to ${text.toLowerCase()}`,
        scheduled_for_iso: fireAt.toISOString(),
        description: description.trim() || undefined,
      });
      toast.success("Reminder created");
      setOpenCreate(false);
      setActionText("");
      setSpokenMessage("");
      setDescription("");
      setWhenLocal(isoLocalNow(5));
    } catch (err: any) {
      toast.error(err?.message || "Failed to create reminder");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success("Reminder deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete reminder");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const r = await deleteAllMut.mutateAsync();
      toast.success(`${r.deleted} reminder${r.deleted === 1 ? "" : "s"} deleted`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete reminders");
    } finally {
      setConfirmDeleteAll(false);
    }
  };

  const handleComplete = async (r: ReminderRow) => {
    try {
      await completeMut.mutateAsync(r.id);
      toast.success("Marked done");
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark done");
    }
  };

  useEffect(() => {
    const prev = document.title;
    document.title = "Reminders | Vitana";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Reminders
          </h1>
          <p className="text-sm text-muted-foreground">Voice or tap. We chime + speak at the right moment.</p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {upcoming.length >= 2 ? (
        <button
          type="button"
          onClick={() => setConfirmDeleteAll(true)}
          className="text-xs text-muted-foreground hover:text-destructive underline self-end"
        >
          Delete all {upcoming.length} reminders
        </button>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No reminders yet. Tap the ORB and say <em>"Remind me at 8pm to take my magnesium."</em>
            </div>
          ) : (
            upcoming.map((r) => (
              <ReminderRowItem key={r.id} reminder={r} onDelete={setConfirmDelete} onComplete={handleComplete} />
            ))
          )}
        </CardContent>
      </Card>

      {recent.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((r) => (
              <ReminderRowItem key={r.id} reminder={r} onDelete={setConfirmDelete} onComplete={handleComplete} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Create modal */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New reminder</DialogTitle>
            <DialogDescription>Vitana will chime and speak at the scheduled time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="reminder-action">What to remind you about</Label>
              <Input
                id="reminder-action"
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="Take magnesium"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="reminder-when">When</Label>
              <Input
                id="reminder-when"
                type="datetime-local"
                value={whenLocal}
                onChange={(e) => setWhenLocal(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="reminder-spoken">Spoken message (optional)</Label>
              <Input
                id="reminder-spoken"
                value={spokenMessage}
                onChange={(e) => setSpokenMessage(e.target.value)}
                placeholder="Time to take your magnesium pills"
              />
            </div>
            <div>
              <Label htmlFor="reminder-desc">Notes (optional)</Label>
              <Input
                id="reminder-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reminder?</AlertDialogTitle>
            <AlertDialogDescription>{confirmDelete?.action_text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete-all confirm */}
      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all {upcoming.length} reminders?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be removed from your list. This can't be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reminders;
