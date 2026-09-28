/**
 * VTID-04675: Admin › Notifications › Notifications tab.
 *
 * One row per notification type, grouped by who receives it. Each row has the
 * admin switch (confirmation first, with who it reaches), readiness, the
 * member category it belongs to, 7-day counts and its switch history.
 * Automations get their own switch under the type they send.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, History, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  localized,
  useNotificationControlAudit,
  useNotificationControls,
  useSetNotificationControl,
  type NotificationAudience,
  type NotificationControl,
  type TextReadiness,
} from "@/hooks/useNotificationControls";
import { notify, notifyError, t, useI18nLocale } from "@/lib/i18n-toast";
import { fmtDateTime, fmtNumber } from "@/lib/locale-format";

const AUDIENCES: NotificationAudience[] = ["member", "admin", "developer", "staff"];
// Most-used first; anything new or unknown lands at the end.
const GROUP_ORDER = [
  "posts", "chat", "scheduled", "orb", "community", "meetups", "live_rooms", "matches",
  "journey", "recommendations", "health", "wallet", "account", "admin", "other",
];
const groupRank = (g: string) => {
  const i = GROUP_ORDER.indexOf(g);
  return i === -1 ? GROUP_ORDER.length : i;
};
type StatusFilter = "all" | "on" | "off" | "new";

interface PendingSwitch {
  control: NotificationControl;
  sourceKey: string;
  automationName: string | null;
  enabled: boolean;
}

function readinessBadge(text: TextReadiness) {
  if (text === "ready") return <Badge variant="secondary">{t("notificationControls.readiness.ready")}</Badge>;
  if (text === "not_localized")
    return <Badge variant="destructive">{t("notificationControls.readiness.notLocalized")}</Badge>;
  return <Badge variant="outline">{t("notificationControls.readiness.unverified")}</Badge>;
}

function groupLabel(group: string): string {
  const key = `notificationControls.groups.${group}`;
  const label = t(key);
  return label === key ? group : label;
}

function AuditList({ type }: { type: string }) {
  const { data, isLoading, error } = useNotificationControlAudit(type);
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (error) return <p className="text-sm text-destructive">{t("notificationControls.historyError")}</p>;
  if (!data || data.length === 0)
    return <p className="text-sm text-muted-foreground">{t("notificationControls.historyEmpty")}</p>;
  return (
    <ul className="space-y-1 text-sm">
      {data.map((row, i) => (
        <li key={i} className="flex flex-wrap gap-x-2 text-muted-foreground">
          <span>{fmtDateTime(new Date(row.created_at))}</span>
          <span className="font-medium text-foreground">
            {row.new_enabled ? t("notificationControls.switchedOn") : t("notificationControls.switchedOff")}
          </span>
          {row.source_key && <span className="font-mono">{row.source_key}</span>}
          <span>{row.actor_email || t("notificationControls.system")}</span>
          {row.reason && <span>— {row.reason}</span>}
        </li>
      ))}
    </ul>
  );
}

function StatsLine({ control, statsError }: { control: NotificationControl; statsError: boolean }) {
  if (statsError || !control.stats) {
    return <p className="text-xs text-destructive">{t("notificationControls.statsUnavailable")}</p>;
  }
  const s = control.stats;
  if (!s.sent && !s.blocked_admin && !s.blocked_member && !s.last_sent_at) {
    return <p className="text-xs text-muted-foreground">{t("notificationControls.statsNone")}</p>;
  }
  return (
    <p className="text-xs text-muted-foreground">
      {t("notificationControls.statsLine", {
        sent: fmtNumber(s.sent),
        pushed: fmtNumber(s.pushed),
        read: fmtNumber(s.read),
        blockedAdmin: fmtNumber(s.blocked_admin),
        blockedMember: fmtNumber(s.blocked_member),
      })}
      {s.last_sent_at && <> · {t("notificationControls.lastSent", { when: fmtDateTime(new Date(s.last_sent_at)) })}</>}
    </p>
  );
}

function ControlRow({
  control,
  locale,
  statsError,
  onSwitch,
}: {
  control: NotificationControl;
  locale: string;
  statsError: boolean;
  onSwitch: (p: PendingSwitch) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const blockedOn = !control.enabled && !control.can_enable;
  return (
    <div className="py-4 border-b last:border-b-0 space-y-2" data-testid={`control-${control.type}`}>
      <div className="flex items-start gap-4">
        <Switch
          checked={control.enabled}
          disabled={blockedOn}
          onCheckedChange={(v) => onSwitch({ control, sourceKey: "", automationName: null, enabled: v })}
          aria-label={localized(control.label, locale)}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{localized(control.label, locale)}</span>
            <code className="text-xs text-muted-foreground">{control.type}</code>
            {readinessBadge(control.text)}
            {control.auto_registered && !control.enabled && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                {t("notificationControls.newType")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{localized(control.description, locale)}</p>
          <p className="text-xs text-muted-foreground">
            {control.category
              ? t("notificationControls.inCategory", { name: control.category.name || control.category.slug || "" })
              : t("notificationControls.noCategory")}
          </p>
          {blockedOn && <p className="text-xs text-destructive">{t("notificationControls.cannotEnableEnglish")}</p>}
          <StatsLine control={control} statsError={statsError} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
          <History className="h-4 w-4 me-1" />
          {t("notificationControls.history")}
        </Button>
      </div>

      {control.automations.length > 0 && (
        <div className="ms-12 space-y-2 border-s ps-4">
          <p className="text-xs font-medium text-muted-foreground">{t("notificationControls.automationsTitle")}</p>
          {control.automations.map((a) => (
            <div key={a.source_key} className="flex items-center gap-3 text-sm">
              <Switch
                checked={a.enabled}
                disabled={!a.enabled && !a.can_enable}
                onCheckedChange={(v) =>
                  onSwitch({ control, sourceKey: a.source_key, automationName: a.name, enabled: v })
                }
                aria-label={a.name || a.source_key}
              />
              <code className="text-xs">{a.source_key}</code>
              <span>{a.name || ""}</span>
              {readinessBadge(a.text)}
            </div>
          ))}
        </div>
      )}

      {showHistory && (
        <div className="ms-12">
          <AuditList type={control.type} />
        </div>
      )}
    </div>
  );
}

export function NotificationControlsTab() {
  const locale = useI18nLocale();
  const { data, isLoading, error } = useNotificationControls(7);
  const setControl = useSetNotificationControl();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pending, setPending] = useState<PendingSwitch | null>(null);
  const [reason, setReason] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.controls || []).filter((c) => {
      if (status === "on" && !c.enabled) return false;
      if (status === "off" && c.enabled) return false;
      if (status === "new" && !(c.auto_registered && !c.enabled)) return false;
      if (!q) return true;
      return [c.type, c.label.en, c.label.de, c.description.en, c.description.de].some((s) =>
        s.toLowerCase().includes(q),
      );
    });
  }, [data, query, status]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("notificationControls.loading")}
      </div>
    );
  }
  if (error || !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-destructive">
          {t("notificationControls.loadError", { message: (error as Error)?.message || "" })}
        </CardContent>
      </Card>
    );
  }

  const onCount = data.controls.filter((c) => c.enabled).length;
  const newCount = data.controls.filter((c) => c.auto_registered && !c.enabled).length;
  const audienceCount = pending ? data.audience[pending.control.audience] : null;

  const confirm = async () => {
    if (!pending) return;
    try {
      await setControl.mutateAsync({
        type: pending.control.type,
        enabled: pending.enabled,
        reason: reason.trim() || undefined,
        source_key: pending.sourceKey || undefined,
      });
      notify(pending.enabled ? "notificationControls.toastOn" : "notificationControls.toastOff");
    } catch {
      notifyError("notificationControls.toastFailed");
    } finally {
      setPending(null);
      setReason("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("notificationControls.summaryOn")}</p>
            <p className="text-2xl font-semibold">
              {onCount} / {data.controls.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("notificationControls.summaryNew")}</p>
            <p className="text-2xl font-semibold">{newCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("notificationControls.summaryRule")}</p>
            <p className="text-sm">{t("notificationControls.summaryRuleText")}</p>
          </CardContent>
        </Card>
      </div>

      {data.stats_error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {t("notificationControls.statsErrorBanner", { message: data.stats_error })}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="ps-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("notificationControls.searchPlaceholder")}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("notificationControls.filterAll")}</SelectItem>
            <SelectItem value="on">{t("notificationControls.filterOn")}</SelectItem>
            <SelectItem value="off">{t("notificationControls.filterOff")}</SelectItem>
            <SelectItem value="new">{t("notificationControls.filterNew")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {AUDIENCES.map((aud) => {
        const rows = filtered.filter((c) => c.audience === aud);
        if (rows.length === 0) return null;
        const groups = Array.from(new Set(rows.map((r) => r.group))).sort((a, b) => groupRank(a) - groupRank(b));
        return (
          <Card key={aud}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {t(`notificationControls.audience.${aud}`)}
                {data.audience[aud] !== null && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("notificationControls.audienceCount", { count: fmtNumber(data.audience[aud] ?? 0) })}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {groups.map((g) => (
                <div key={g}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {groupLabel(g)}
                  </h3>
                  {rows
                    .filter((r) => r.group === g)
                    .sort((a, b) => Number(b.enabled) - Number(a.enabled) || localized(a.label, locale).localeCompare(localized(b.label, locale)))
                    .map((c) => (
                      <ControlRow
                        key={c.type}
                        control={c}
                        locale={locale}
                        statsError={!!data.stats_error}
                        onSwitch={setPending}
                      />
                    ))}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground p-6">{t("notificationControls.noMatch")}</p>
      )}

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending &&
                t(pending.enabled ? "notificationControls.confirmOnTitle" : "notificationControls.confirmOffTitle", {
                  name: pending.automationName
                    ? `${localized(pending.control.label, locale)} · ${pending.automationName}`
                    : localized(pending.control.label, locale),
                })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                (pending.enabled
                  ? audienceCount !== null && audienceCount !== undefined
                    ? t("notificationControls.confirmOnBody", {
                        audience: t(`notificationControls.audienceNoun.${pending.control.audience}`),
                        count: fmtNumber(audienceCount),
                      })
                    : t("notificationControls.confirmOnBodyNoCount", {
                        audience: t(`notificationControls.audienceNoun.${pending.control.audience}`),
                      })
                  : t("notificationControls.confirmOffBody"))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="control-reason">{t("notificationControls.reasonLabel")}</Label>
            <Textarea
              id="control-reason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("notificationControls.reasonPlaceholder")}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("notificationControls.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} disabled={setControl.isPending}>
              {pending?.enabled ? t("notificationControls.confirmOn") : t("notificationControls.confirmOff")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default NotificationControlsTab;
