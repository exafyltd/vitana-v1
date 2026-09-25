/**
 * VTID-04406 — Mail, Calendar & Contacts on the Connected Apps screen.
 *
 * One row per app, one switch per row — the way assistants connect external
 * apps: tap, grant access on the provider's own screen if needed, done.
 * Everything comes from the gateway hub (GET /api/v1/connected-apps), so a
 * switch is only offered when the backend can actually honour it.
 *
 *   Google / Microsoft  → consent screen, then back here with the app on.
 *   Apple (iCloud)      → Apple ID + app-specific password, once for all three.
 *   Android contacts    → the phone's contact picker (Android Chrome).
 *
 * Used by both the mobile and the desktop Connected Apps screens.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { formatDistanceToNow } from "@/lib/locale-format";
import { isAppilixWebView, redirectViaSystemBrowser } from "@/lib/webview";
import {
  APP_ORDER,
  ConnectedAppsError,
  connectApp,
  contactPickerSupported,
  disconnectApp,
  fetchConnectedApps,
  importAndroidContacts,
  pickDeviceContacts,
  readGrantReturn,
  syncConnectedApp,
  type AppKind,
  type ConnectedAppId,
  type ConnectedAppState,
} from "@/lib/connected-apps-client";

export const CONNECTED_APPS_QUERY_KEY = ["connected-apps"] as const;

const APP_EMOJI: Record<ConnectedAppId, string> = {
  gmail: "📧",
  "outlook-mail": "📨",
  "apple-mail": "✉️",
  "google-calendar": "📅",
  "outlook-calendar": "🗓️",
  "apple-calendar": "📆",
  "google-contacts": "👥",
  "outlook-contacts": "📇",
  "iphone-contacts": "📱",
  "android-contacts": "🤖",
};

const KIND_EMOJI: Record<AppKind, string> = { mail: "📬", calendar: "📅", contacts: "👥" };

/** Which switch is being turned, so only that row shows a spinner. */
type Busy = { id: ConnectedAppId; to: "on" | "off" } | null;

function subline(app: ConnectedAppState, pendingConsent: boolean): { text: string; tone: "muted" | "ok" | "warn" } {
  if (pendingConsent) return { text: t("mailhub.status.finishInBrowser"), tone: "warn" };
  if (app.availability !== "ready") return { text: t("mailhub.status.notAvailable"), tone: "muted" };
  if (app.status === "needs_reconnect") return { text: t("mailhub.status.needsReconnect"), tone: "warn" };
  if (app.status === "off") return { text: t(`mailhub.apps.${app.id}.what`), tone: "muted" };
  const parts: string[] = [];
  if (app.account) parts.push(app.account);
  if (app.last_error) return { text: t("mailhub.status.syncProblem"), tone: "warn" };
  const r = app.last_result ?? {};
  if (typeof r.imported === "number") parts.push(t("mailhub.status.contactsCount", { count: r.imported }));
  else if (typeof r.busy === "number") parts.push(t("mailhub.status.busyCount", { count: r.busy }));
  if (app.last_sync_at) parts.push(t("mailhub.status.syncedAgo", { ago: formatDistanceToNow(new Date(app.last_sync_at), { addSuffix: true }) }));
  return { text: parts.length ? parts.join(" · ") : t("mailhub.status.on"), tone: "ok" };
}

export function MailCalendarContactsPanel({ className = "" }: { className?: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<Busy>(null);
  const [pendingConsent, setPendingConsent] = useState<ConnectedAppId | null>(null);
  const [appleFor, setAppleFor] = useState<ConnectedAppId | null>(null);
  const [offFor, setOffFor] = useState<ConnectedAppState | null>(null);
  const [androidHelp, setAndroidHelp] = useState(false);

  const apps = useQuery({
    queryKey: CONNECTED_APPS_QUERY_KEY,
    queryFn: fetchConnectedApps,
    staleTime: 15_000,
    // While a consent finishes in the phone's browser, watch for the app to come on.
    refetchInterval: pendingConsent ? 3_000 : false,
    retry: (n, err) => !(err instanceof ConnectedAppsError && err.status === 401) && n < 2,
  });

  const byId = useMemo(() => {
    const m = new Map<ConnectedAppId, ConnectedAppState>();
    for (const a of apps.data ?? []) m.set(a.id, a);
    return m;
  }, [apps.data]);

  // Back from a provider's consent screen (desktop / same-window flow).
  useEffect(() => {
    const ret = readGrantReturn(window.location.search);
    // Google errors keep their existing retry toast on the page; Microsoft is new here.
    if (!ret.app && !(ret.error && ret.provider === "microsoft")) return;
    if (ret.app) notify("mailhub.toasts.turnedOn", undefined, { app: t(`mailhub.apps.${ret.app}.name`) });
    else notifyError("mailhub.toasts.consentFailed");
    const p = new URLSearchParams(window.location.search);
    ["app", "connected", "username", "provider", "error", "error_detail", "error_hint", "status"].forEach((k) => p.delete(k));
    const q = p.toString();
    window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
    queryClient.invalidateQueries({ queryKey: CONNECTED_APPS_QUERY_KEY });
  }, [queryClient]);

  // Stop watching once the pending app is on, or after two minutes.
  useEffect(() => {
    if (!pendingConsent) return;
    if (byId.get(pendingConsent)?.status === "on") {
      notify("mailhub.toasts.turnedOn", undefined, { app: t(`mailhub.apps.${pendingConsent}.name`) });
      setPendingConsent(null);
      return;
    }
    const timer = setTimeout(() => setPendingConsent(null), 120_000);
    return () => clearTimeout(timer);
  }, [pendingConsent, byId]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: CONNECTED_APPS_QUERY_KEY });

  const turnOn = useMutation({
    mutationFn: async (vars: { id: ConnectedAppId; apple?: { apple_id: string; app_password: string } }) => {
      if (vars.id === "android-contacts") {
        const picked = await pickDeviceContacts();
        if (picked.length === 0) return { status: "cancelled" as const };
        const result = await importAndroidContacts(picked);
        return { status: "imported" as const, result };
      }
      return connectApp(vars.id, {
        return: isAppilixWebView() ? "mobile" : "web",
        ...(vars.apple ?? {}),
      });
    },
    onMutate: (vars) => setBusy({ id: vars.id, to: "on" }),
    onSuccess: (out, vars) => {
      if (out.status === "consent_required") {
        if (isAppilixWebView()) setPendingConsent(vars.id);
        redirectViaSystemBrowser(out.auth_url);
        return;
      }
      if (out.status === "cancelled") return;
      setAppleFor(null);
      if (out.status === "imported") {
        notify("mailhub.toasts.contactsImported", undefined, { count: Number(out.result.imported ?? 0) });
      } else {
        notify("mailhub.toasts.turnedOn", undefined, { app: t(`mailhub.apps.${vars.id}.name`) });
        if (out.sync && !out.sync.ok) notifyError("mailhub.toasts.firstSyncFailed");
      }
      refresh();
    },
    onError: (err) => {
      const code = err instanceof ConnectedAppsError ? err.code : "";
      if (code === "apple_auth_failed") notifyError("mailhub.apple.wrongPassword");
      else if (code === "apple_unreachable") notifyError("mailhub.apple.unreachable");
      else if (code === "not_configured") notifyError("mailhub.toasts.notAvailable");
      else notifyError("mailhub.toasts.couldNotTurnOn");
    },
    onSettled: () => setBusy(null),
  });

  const turnOff = useMutation({
    mutationFn: (vars: { id: ConnectedAppId; removeData: boolean }) => disconnectApp(vars.id, vars.removeData),
    onMutate: (vars) => setBusy({ id: vars.id, to: "off" }),
    onSuccess: (_r, vars) => {
      setOffFor(null);
      notify("mailhub.toasts.turnedOff", undefined, { app: t(`mailhub.apps.${vars.id}.name`) });
      refresh();
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: () => notifyError("mailhub.toasts.couldNotTurnOff"),
    onSettled: () => setBusy(null),
  });

  const syncNow = useMutation({
    mutationFn: (id: ConnectedAppId) => syncConnectedApp(id),
    onMutate: (id) => setBusy({ id, to: "on" }),
    onSuccess: (r) => {
      if (r.ok) notify("mailhub.toasts.synced");
      else notifyError("mailhub.toasts.syncFailed");
      refresh();
      queryClient.invalidateQueries({ queryKey: ["calendar-window"] });
    },
    onError: () => notifyError("mailhub.toasts.syncFailed"),
    onSettled: () => setBusy(null),
  });

  const onToggle = (app: ConnectedAppState, next: boolean) => {
    if (!next) {
      setOffFor(app);
      return;
    }
    if (app.id === "android-contacts" && !contactPickerSupported()) {
      setAndroidHelp(true);
      return;
    }
    if (app.method === "app_password" && !(apps.data ?? []).some((a) => a.provider === "apple" && a.status === "on")) {
      setAppleFor(app.id);
      return;
    }
    turnOn.mutate({ id: app.id });
  };

  if (apps.isError) {
    const expired = apps.error instanceof ConnectedAppsError && apps.error.status === 401;
    return (
      <div className={`rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground ${className}`} data-testid="mailhub-error">
        {expired ? t("mailhub.errors.sessionExpired") : t("mailhub.errors.loadFailed")}
      </div>
    );
  }

  // VTID-04536: the calendar's "Connect Google / Apple / Outlook" buttons land
  // here with ?connect=<app>. One tap starts this panel's own connect flow —
  // a tap, not an automatic redirect, because the Android app shell only
  // opens the provider's page from a user gesture.
  const requested = byId.get(new URLSearchParams(window.location.search).get("connect") as ConnectedAppId);

  return (
    <div className={`space-y-5 ${className}`} data-testid="mailhub-panel">
      {requested && requested.status !== "on" && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-card p-4" data-testid="mailhub-requested">
          <div className="text-sm">
            {requested.availability === "ready"
              ? t("mailhub.requested.hint", { app: t(`mailhub.apps.${requested.id}.name`) })
              : t("mailhub.requested.unavailable", { app: t(`mailhub.apps.${requested.id}.name`) })}
          </div>
          {requested.availability === "ready" && (
            <Button
              className="self-start"
              disabled={busy?.id === requested.id}
              onClick={() => onToggle(requested, true)}
              data-testid="mailhub-requested-connect"
            >
              {t("mailhub.requested.connect", { app: t(`mailhub.apps.${requested.id}.name`) })}
            </Button>
          )}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{t("mailhub.intro")}</p>
      {(Object.keys(APP_ORDER) as AppKind[]).map((kind) => (
        <section key={kind} aria-labelledby={`mailhub-${kind}`} className="space-y-2">
          <h3 id={`mailhub-${kind}`} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <span aria-hidden>{KIND_EMOJI[kind]}</span>
            {t(`mailhub.kinds.${kind}`)}
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {APP_ORDER[kind].map((id) => {
              const app = byId.get(id);
              const loading = apps.isLoading || !app;
              const rowBusy = busy?.id === id;
              const line = app ? subline(app, pendingConsent === id) : { text: "", tone: "muted" as const };
              const checked = !!app && (rowBusy ? busy?.to === "on" : app.status !== "off");
              const disabled = loading || rowBusy || (app?.availability !== "ready" && app?.status === "off");
              return (
                <li key={id} className="flex items-center gap-3 px-4 py-3" data-testid={`mailhub-row-${id}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl" aria-hidden>
                    {APP_EMOJI[id]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{t(`mailhub.apps.${id}.name`)}</div>
                    <div
                      className={`truncate text-xs ${
                        line.tone === "warn" ? "text-amber-600 dark:text-amber-400" : line.tone === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                      }`}
                    >
                      {loading ? t("mailhub.status.loading") : line.text}
                    </div>
                    {app && app.status !== "off" && (app.syncs || app.status === "needs_reconnect") && (
                      <div className="mt-1 flex gap-3 text-xs">
                        {app.status === "needs_reconnect" ? (
                          <button
                            type="button"
                            className="font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
                            disabled={rowBusy || app.availability !== "ready"}
                            onClick={() => (app.method === "app_password" ? setAppleFor(app.id) : turnOn.mutate({ id: app.id }))}
                          >
                            {t("mailhub.actions.reconnect")}
                          </button>
                        ) : app.id === "android-contacts" ? (
                          <button
                            type="button"
                            className="font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
                            disabled={rowBusy}
                            onClick={() => (contactPickerSupported() ? turnOn.mutate({ id: app.id }) : setAndroidHelp(true))}
                          >
                            {t("mailhub.actions.addMore")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
                            disabled={rowBusy}
                            onClick={() => syncNow.mutate(app.id)}
                          >
                            {t("mailhub.actions.syncNow")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(v) => app && onToggle(app, v)}
                    aria-label={t("mailhub.actions.toggleAria", { app: t(`mailhub.apps.${id}.name`) })}
                    data-testid={`mailhub-toggle-${id}`}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <AppleSignInDialog
        appId={appleFor}
        busy={turnOn.isPending}
        onClose={() => setAppleFor(null)}
        onSubmit={(apple_id, app_password) => appleFor && turnOn.mutate({ id: appleFor, apple: { apple_id, app_password } })}
      />
      <TurnOffDialog
        app={offFor}
        busy={turnOff.isPending}
        onClose={() => setOffFor(null)}
        onConfirm={(removeData) => offFor && turnOff.mutate({ id: offFor.id, removeData })}
      />
      <ResponsiveDialog open={androidHelp} onOpenChange={setAndroidHelp}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>🤖 {t("mailhub.android.title")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("mailhub.android.body")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <button type="button" className="h-11 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground" onClick={() => setAndroidHelp(false)}>
              {t("mailhub.actions.gotIt")}
            </button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}

function AppleSignInDialog({
  appId,
  busy,
  onClose,
  onSubmit,
}: {
  appId: ConnectedAppId | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (appleId: string, password: string) => void;
}) {
  const [appleId, setAppleId] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (!appId) setPassword("");
  }, [appId]);
  const valid = /.+@.+/.test(appleId.trim()) && password.replace(/\s+/g, "").length >= 16;
  return (
    <ResponsiveDialog open={!!appId} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-w-md" data-testid="mailhub-apple-dialog">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>🍎 {t("mailhub.apple.title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t("mailhub.apple.intro")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-4">
          <ol className="list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
            <li>
              {t("mailhub.apple.step1")}{" "}
              <a href="https://account.apple.com/account/manage" target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
                account.apple.com
              </a>
            </li>
            <li>{t("mailhub.apple.step2")}</li>
            <li>{t("mailhub.apple.step3")}</li>
          </ol>
          <label className="block space-y-1 text-sm font-medium">
            <span>{t("mailhub.apple.appleId")}</span>
            <Input type="email" autoComplete="username" inputMode="email" dir="ltr" value={appleId} onChange={(e) => setAppleId(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>{t("mailhub.apple.appPassword")}</span>
            <Input
              type="password"
              autoComplete="new-password"
              dir="ltr"
              placeholder={t("mailhub.apple.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">🔒 {t("mailhub.apple.privacy")}</p>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="flex-col gap-2 sm:flex-row">
          <button type="button" className="h-11 flex-1 rounded-xl border border-border px-4 font-semibold" onClick={onClose}>
            {t("mailhub.actions.cancel")}
          </button>
          <button
            type="button"
            disabled={!valid || busy}
            className="h-11 flex-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
            onClick={() => onSubmit(appleId.trim(), password)}
            data-testid="mailhub-apple-submit"
          >
            {busy ? t("mailhub.apple.checking") : t("mailhub.apple.connect")}
          </button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function TurnOffDialog({
  app,
  busy,
  onClose,
  onConfirm,
}: {
  app: ConnectedAppState | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (removeData: boolean) => void;
}) {
  const [removeData, setRemoveData] = useState(false);
  useEffect(() => setRemoveData(false), [app?.id]);
  const name = app ? t(`mailhub.apps.${app.id}.name`) : "";
  return (
    <ResponsiveDialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-w-md" data-testid="mailhub-off-dialog">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("mailhub.off.title", { app: name })}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {app ? t(`mailhub.off.body.${app.kind}`) : ""}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {app?.kind === "contacts" && (
          <ResponsiveDialogBody>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={removeData} onCheckedChange={(v) => setRemoveData(v === true)} className="mt-0.5" />
              <span>{t("mailhub.off.removeContacts")}</span>
            </label>
          </ResponsiveDialogBody>
        )}
        <ResponsiveDialogFooter className="flex-col gap-2 sm:flex-row">
          <button type="button" className="h-11 flex-1 rounded-xl border border-border px-4 font-semibold" onClick={onClose}>
            {t("mailhub.actions.keepOn")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-destructive px-4 font-semibold text-destructive-foreground disabled:opacity-50"
            onClick={() => onConfirm(removeData)}
            data-testid="mailhub-off-confirm"
          >
            {t("mailhub.actions.turnOff")}
          </button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
