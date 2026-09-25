/**
 * The calendar's "+" (VTID-04536): add an entry by hand. The form is the one
 * members already know; saving goes through the gateway so default reminders
 * apply and the new entry shows up in every view straight away.
 */
import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MobileEventForm } from "@/components/calendar/MobileEventForm";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";
import { createCalendarEntry } from "@/lib/calendar-window-client";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { HEADING_FONT } from "./labels";
import { SURFACE } from "./theme";

export function AddEntrySheet({ day, role, onClose }: { day: Date; role: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const create = useMutation({
    mutationFn: (e: Partial<CalendarEvent>) =>
      createCalendarEntry(
        {
          title: String(e.title ?? "").trim(),
          start_time: String(e.start_time),
          end_time: e.end_time && Date.parse(e.end_time) > Date.parse(String(e.start_time)) ? e.end_time : null,
          location: e.location ?? null,
          event_type: String(e.event_type ?? "personal"),
        },
        role,
      ),
    onSuccess: () => {
      notify("vcal.add.created");
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
      onClose();
    },
    onError: () => notifyError("vcal.add.error"),
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vcal-add-title"
        aria-busy={create.isPending}
        className="flex max-h-[92vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-background p-6 pb-28 md:rounded-[28px] md:pb-6"
        style={{ color: SURFACE.ink }}
        onClick={(e) => e.stopPropagation()}
        data-testid="vcal-add-sheet"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="vcal-add-title" className="m-0 text-[22px] font-bold" style={{ fontFamily: HEADING_FONT }}>
            {t("vcal.add.title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("vcal.entry.close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-extrabold shadow-sm"
          >
            ✕
          </button>
        </div>
        <MobileEventForm initialDate={day} onCancel={onClose} onSubmit={(e) => !create.isPending && create.mutate(e)} />
      </div>
    </div>
  );
}
