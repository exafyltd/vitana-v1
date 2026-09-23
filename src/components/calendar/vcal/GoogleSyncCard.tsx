/**
 * VTID-04372 — two-way Google Calendar sync, inside the "show in my calendar
 * app" sheet. Hidden entirely while the gateway reports it not configured,
 * so nothing is promised before it is switched on.
 *
 * VTID-04373 — a link to the quiet hours that reminders now respect.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { fmtDateTime } from "@/lib/locale-format";
import { disableGoogleSync, enableGoogleSync, fetchGoogleSyncStatus } from "@/lib/calendar-window-client";
import { useStartUnifiedGoogleConnect } from "@/hooks/useGoogleConnect";
import { SURFACE } from "./theme";

export function GoogleSyncCard() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["calendar-google-sync"], queryFn: fetchGoogleSyncStatus, staleTime: 30_000 });
  const connect = useStartUnifiedGoogleConnect();

  const turnOn = useMutation({
    mutationFn: enableGoogleSync,
    onSuccess: (r) => {
      // Google is not connected with the sync permission yet: go and grant it.
      // The member comes back to the calendar and turns it on from here.
      if (r === "needs_google") {
        connect.mutate({ include: ["calendar_sync"], mode: "incremental" });
        return;
      }
      notify("vcal.google.turnedOn");
      queryClient.invalidateQueries({ queryKey: ["calendar-google-sync"] });
    },
    onError: () => notifyError("vcal.google.error"),
  });

  const turnOff = useMutation({
    mutationFn: disableGoogleSync,
    onSuccess: () => {
      notify("vcal.google.turnedOff");
      queryClient.invalidateQueries({ queryKey: ["calendar-google-sync"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: () => notifyError("vcal.google.error"),
  });

  if (status.data?.availability !== "ready") return null;
  const on = status.data.enabled;
  const busy = turnOn.isPending || turnOff.isPending || connect.isPending;

  return (
    <section className="flex flex-col gap-2.5 rounded-[22px] bg-white p-4" data-testid="vcal-google-sync">
      <h3 className="m-0 text-[17px] font-extrabold">🔄 {t("vcal.google.title")}</h3>
      <p className="m-0 text-[15px] leading-relaxed">{t("vcal.google.intro")}</p>
      {on && (
        <p className="m-0 text-sm font-bold" data-testid="vcal-google-on">
          ✅ {t("vcal.google.on")}
          {status.data.last_push_at && (
            <span style={{ color: SURFACE.muted }}> · {t("vcal.google.lastSync", { date: fmtDateTime(status.data.last_push_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}</span>
          )}
        </p>
      )}
      {on && status.data.last_error && (
        <p className="m-0 text-sm font-bold" style={{ color: SURFACE.muted }}>
          ⚠️ {t("vcal.google.problem")}
        </p>
      )}
      <button
        type="button"
        disabled={busy || status.isLoading}
        onClick={() => (on ? turnOff.mutate() : turnOn.mutate())}
        className={`h-12 rounded-[18px] text-[15px] font-extrabold disabled:opacity-60 ${on ? "" : "text-white"}`}
        style={{ background: on ? SURFACE.track : SURFACE.primary }}
        data-testid="vcal-google-toggle"
      >
        {on ? t("vcal.google.turnOff") : t("vcal.google.turnOn")}
      </button>
    </section>
  );
}

export function QuietHoursNote({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  return (
    <section className="flex flex-col gap-2 rounded-[22px] bg-white p-4" data-testid="vcal-quiet-hours">
      <h3 className="m-0 text-[17px] font-extrabold">🌙 {t("vcal.quietHours.title")}</h3>
      <p className="m-0 text-[15px] leading-relaxed">{t("vcal.quietHours.body")}</p>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          navigate("/settings/notifications");
        }}
        className="h-12 rounded-[18px] text-[15px] font-extrabold"
        style={{ background: SURFACE.track }}
      >
        {t("vcal.quietHours.link")}
      </button>
    </section>
  );
}
