/**
 * VTID-02601 — Reminders list page.
 *
 * Layered model:
 *   1. Suggested by Vitana — created_via='system' (Autopilot-driven; placeholder
 *      until the autopilot-worker starts populating these).
 *   2. Scheduled by you — created_via in ('voice','ui'), still pending/dispatching.
 *   3. Recent — any origin, fired/completed/cancelled (last 30).
 *
 * Voice (ORB) is the primary creation path. Manual "Add" is available as a
 * de-emphasized ghost-button — present, not promoted.
 *
 * Filter modes (?filter=upcoming|completed|missed) bypass the layered grouping
 * and render a single titled section. See PR #347 for filter details.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useReminders, useCreateReminder, useDeleteReminder, useDeleteAllReminders, useCompleteReminder } from "@/hooks/useReminders";
import { ReminderRow } from "@/lib/reminders-api";
import EnableRemindersPrompt from "@/components/reminders/EnableRemindersPrompt";
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
import { Bell, Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { notifyError, notifySuccess } from '@/lib/i18n-toast';

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
  const isSystem = reminder.created_via === "system";
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-medium truncate">{reminder.action_text}</div>
          {isSystem ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Vitana
            </span>
          ) : null}
        </div>
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

type ReminderFilter = "upcoming" | "completed" | "missed";
const VALID_FILTERS: readonly ReminderFilter[] = ["upcoming", "completed", "missed"];

const Reminders: React.FC = () => {
  const { data: list = [], isLoading } = useReminders({ include_fired: true, limit: 100 });
  const createMut = useCreateReminder();
  const deleteMut = useDeleteReminder();
  const deleteAllMut = useDeleteAllReminders();
  const completeMut = useCompleteReminder();

  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const activeFilter: ReminderFilter | null =
    VALID_FILTERS.includes(filterParam as ReminderFilter) ? (filterParam as ReminderFilter) : null;

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
  // Split the active queue by origin so the UI can lead with what Vitana
  // is scheduling and follow with what the user manually added.
  const suggestedByVitana = useMemo(
    () => upcoming.filter((r) => r.created_via === "system"),
    [upcoming],
  );
  const scheduledByYou = useMemo(
    () => upcoming.filter((r) => r.created_via === "voice" || r.created_via === "ui"),
    [upcoming],
  );
  const recent = useMemo(
    () =>
      list
        .filter((r) => r.status === "fired" || r.status === "completed" || r.status === "cancelled")
        .sort((a, b) => b.next_fire_at.localeCompare(a.next_fire_at))
        .slice(0, 30),
    [list],
  );
  // Fired-but-not-yet-completed: the reminder went off but the user hasn't
  // acknowledged it. This is what a `custom_reminder` push deep-link wants.
  const missed = useMemo(
    () =>
      list
        .filter((r) => r.status === "fired")
        .sort((a, b) => b.next_fire_at.localeCompare(a.next_fire_at)),
    [list],
  );
  const completed = useMemo(
    () =>
      list
        .filter((r) => r.status === "completed")
        .sort((a, b) => b.next_fire_at.localeCompare(a.next_fire_at)),
    [list],
  );

  const filteredView: { title: string; items: ReminderRow[]; emptyText: string } | null = useMemo(() => {
    switch (activeFilter) {
      case "upcoming":
        return { title: "Upcoming", items: upcoming, emptyText: "No upcoming reminders." };
      case "completed":
        return { title: "Completed", items: completed, emptyText: "No completed reminders yet." };
      case "missed":
        return { title: "Missed", items: missed, emptyText: "No missed reminders — you're all caught up." };
      default:
        return null;
    }
  }, [activeFilter, upcoming, completed, missed]);

  const clearFilter = () => setSearchParams({});

  const handleCreate = async () => {
    const text = actionText.trim();
    if (!text) {
      notifyError('toasts.reminders.pleaseEnterWhatRemindYouAbout');
      return;
    }
    if (!whenLocal) {
      notifyError('toasts.reminders.pleasePickTime');
      return;
    }
    const fireAt = new Date(whenLocal);
    if (isNaN(fireAt.getTime())) {
      notifyError('toasts.reminders.invalidTime');
      return;
    }
    try {
      await createMut.mutateAsync({
        action_text: text,
        spoken_message: spokenMessage.trim() || `Time to ${text.toLowerCase()}`,
        scheduled_for_iso: fireAt.toISOString(),
        description: description.trim() || undefined,
      });
      notifySuccess('toasts.reminders.reminderCreated');
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
      notifySuccess('toasts.reminders.reminderDeleted');
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
      notifySuccess('toasts.reminders.markedDone');
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark done");
    }
  };

  useEffect(() => {
    const prev = document.title;
    document.title = filteredView ? `${filteredView.title} reminders | Vitana` : "Reminders | Vitana";
    return () => {
      document.title = prev;
    };
  }, [filteredView]);

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Reminders
        </h1>
        <p className="text-sm text-muted-foreground">
          {filteredView
            ? `Showing ${filteredView.title.toLowerCase()} reminders.`
            : "What Vitana is scheduling for you. Talk to the ORB to add naturally."}
        </p>
      </div>

      <EnableRemindersPrompt />

      {!filteredView ? (
        <div className="flex items-center justify-between gap-3 -mt-2">
          {upcoming.length >= 2 ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteAll(true)}
              className="text-xs text-muted-foreground hover:text-destructive underline"
            >
              Delete all {upcoming.length} reminders
            </button>
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add manually
          </Button>
        </div>
      ) : null}

      {filteredView ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">{filteredView.title}</CardTitle>
            <button
              type="button"
              onClick={clearFilter}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Show all
            </button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : filteredView.items.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">{filteredView.emptyText}</div>
            ) : (
              filteredView.items.map((r) => (
                <ReminderRowItem key={r.id} reminder={r} onDelete={setConfirmDelete} onComplete={handleComplete} />
              ))
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Suggested by Vitana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : suggestedByVitana.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Vitana hasn't suggested any reminders yet. Once Autopilot connects, contextual nudges will appear here.
                </div>
              ) : (
                suggestedByVitana.map((r) => (
                  <ReminderRowItem key={r.id} reminder={r} onDelete={setConfirmDelete} onComplete={handleComplete} />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scheduled by you</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : scheduledByYou.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Tap the ORB and say <em>"Remind me at 8pm to take my magnesium."</em>
                </div>
              ) : (
                scheduledByYou.map((r) => (
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
        </>
      )}

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
