/**
 * VTID-04358 — "Show in my calendar app": create, copy or turn off the
 * private subscription link (Apple / Google / Outlook).
 *
 * The gateway keeps only a hash of the link, so a link is shown once, right
 * after it is created. Later the sheet can only replace it or turn it off.
 *
 * VTID-04682: opened for one app (Google / Apple / Outlook), the sheet hands
 * the fresh link straight to that app's own "add calendar by URL" page, so
 * the member's Vitana entries appear there in two taps — no keys needed.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";
import { createFeedLink, fetchFeedStatus, revokeFeedLink, webcalUrl } from "@/lib/calendar-window-client";
import { SURFACE } from "./theme";
import { HEADING_FONT } from "./labels";
import { GoogleSyncCard, QuietHoursNote } from "./GoogleSyncCard";

export type SubscribeProvider = "google" | "apple" | "outlook";

/** Where each app adds a calendar from a URL. Apple opens the webcal link itself. */
export function providerAddUrl(provider: SubscribeProvider, httpsUrl: string): string {
  switch (provider) {
    case "google":
      return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl(httpsUrl))}`;
    case "outlook":
      return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=Vitana`;
    case "apple":
      return webcalUrl(httpsUrl);
  }
}

export function SubscribeSheet({ onClose, provider }: { onClose: () => void; provider?: SubscribeProvider }) {
  const queryClient = useQueryClient();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);

  const status = useQuery({ queryKey: ["calendar-feed-status"], queryFn: fetchFeedStatus, staleTime: 30_000 });

  const create = useMutation({
    mutationFn: createFeedLink,
    onSuccess: (url) => {
      setFreshUrl(url);
      queryClient.invalidateQueries({ queryKey: ["calendar-feed-status"] });
    },
    onError: () => notifyError("vcal.subscribe.error"),
  });

  const revoke = useMutation({
    mutationFn: revokeFeedLink,
    onSuccess: () => {
      setFreshUrl(null);
      notify("vcal.subscribe.revoked");
      queryClient.invalidateQueries({ queryKey: ["calendar-feed-status"] });
    },
    onError: () => notifyError("vcal.subscribe.error"),
  });

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    if (!freshUrl) return;
    try {
      await navigator.clipboard.writeText(freshUrl);
      notify("vcal.subscribe.copied");
    } catch {
      notifyError("vcal.subscribe.copyError");
    }
  };

  const active = status.data?.active ?? false;
  const busy = create.isPending || revoke.isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vcal-subscribe-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] p-6 pb-28 md:rounded-[28px] md:pb-6"
        style={{ background: SURFACE.page, color: SURFACE.ink, fontFamily: "Nunito, system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
        data-testid="vcal-subscribe-sheet"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="vcal-subscribe-title" className="m-0 text-[22px] font-medium" style={{ fontFamily: HEADING_FONT }}>
            {provider ? t(`vcal.subscribe.titleFor.${provider}`) : t("vcal.subscribe.title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("vcal.entry.close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg"
          >
            ✕
          </button>
        </div>

        <p className="m-0 text-[15px] leading-relaxed">{provider ? t(`vcal.subscribe.introFor.${provider}`) : t("vcal.subscribe.intro")}</p>
        <p className="m-0 rounded-2xl bg-white px-4 py-3 text-sm" style={{ color: SURFACE.muted }}>
          🔒 {t("vcal.subscribe.privacy")}
        </p>

        {freshUrl ? (
          <div className="flex flex-col gap-2.5" data-testid="vcal-subscribe-fresh">
            <label className="text-[13px]" style={{ color: SURFACE.muted }} htmlFor="vcal-feed-url">
              {t("vcal.subscribe.yourLink")}
            </label>
            <input
              id="vcal-feed-url"
              readOnly
              value={freshUrl}
              dir="ltr"
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 w-full rounded-2xl bg-white px-3 text-sm"
            />
            <span className="text-sm" style={{ color: SURFACE.muted }}>
              {t("vcal.subscribe.onlyOnce")}
            </span>
            {provider && (
              <a
                href={providerAddUrl(provider, freshUrl)}
                target={provider === "apple" ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="flex h-14 items-center justify-center rounded-[18px] px-3 text-center text-base font-medium text-white"
                style={{ background: SURFACE.primary }}
                data-testid="vcal-subscribe-open-provider"
              >
                {t(`vcal.subscribe.openIn.${provider}`)}
              </a>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={copy} className="h-[52px] rounded-2xl text-[15px]" style={{ background: SURFACE.track }}>
                {t("vcal.subscribe.copy")}
              </button>
              {!provider && (
                <a
                  href={webcalUrl(freshUrl)}
                  className="flex h-[52px] items-center justify-center rounded-2xl px-3 text-center text-[15px] font-medium leading-tight text-white"
                  style={{ background: SURFACE.primary }}
                >
                  {t("vcal.subscribe.openApp")}
                </a>
              )}
            </div>
          </div>
        ) : active ? (
          <p className="m-0 text-[15px]" data-testid="vcal-subscribe-active">
            ✓ {t("vcal.subscribe.activeSince", { date: fmtDate(status.data!.created_at!, { day: "numeric", month: "long", year: "numeric" }) })}
          </p>
        ) : null}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={busy || status.isLoading}
            onClick={() => create.mutate()}
            className="h-14 rounded-[18px] text-base font-medium text-white disabled:opacity-60"
            style={{ background: SURFACE.primary }}
            data-testid="vcal-subscribe-create"
          >
            {active || freshUrl ? t("vcal.subscribe.replace") : provider ? t(`vcal.subscribe.createFor.${provider}`) : t("vcal.subscribe.create")}
          </button>
          {(active || freshUrl) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => revoke.mutate()}
              className="h-12 rounded-[18px] text-[15px] disabled:opacity-60"
              style={{ background: SURFACE.track }}
              data-testid="vcal-subscribe-revoke"
            >
              {t("vcal.subscribe.revoke")}
            </button>
          )}
          {(active || freshUrl) && (
            <span className="text-sm" style={{ color: SURFACE.muted }}>
              {t("vcal.subscribe.replaceHint")}
            </span>
          )}
        </div>

        {!provider && <GoogleSyncCard />}
        {!provider && <QuietHoursNote onNavigate={onClose} />}
      </div>
    </div>
  );
}
