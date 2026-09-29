/**
 * VTID-04675: Admin › Notifications › Activity tab.
 *
 * Real numbers from user_notifications and the block counters: per day and
 * per type — created, pushed, read, held by the admin switch, held by the
 * member's own choice. A failed read shows the error, never a 0.
 */

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { localized, useNotificationActivity, useNotificationControls, type ActivityRow } from "@/hooks/useNotificationControls";
import { t, useI18nLocale } from "@/lib/i18n-toast";
import { fmtDate, fmtNumber } from "@/lib/locale-format";

type Totals = Omit<ActivityRow, "day" | "type">;
const ZERO: Totals = { sent: 0, pushed: 0, read: 0, blocked_admin: 0, blocked_member: 0 };

function add(a: Totals, b: Totals): Totals {
  return {
    sent: a.sent + b.sent,
    pushed: a.pushed + b.pushed,
    read: a.read + b.read,
    blocked_admin: a.blocked_admin + b.blocked_admin,
    blocked_member: a.blocked_member + b.blocked_member,
  };
}

function Cells({ v }: { v: Totals }) {
  return (
    <>
      <TableCell className="text-end">{fmtNumber(v.sent)}</TableCell>
      <TableCell className="text-end">{fmtNumber(v.pushed)}</TableCell>
      <TableCell className="text-end">{fmtNumber(v.read)}</TableCell>
      <TableCell className="text-end">{fmtNumber(v.blocked_admin)}</TableCell>
      <TableCell className="text-end">{fmtNumber(v.blocked_member)}</TableCell>
    </>
  );
}

function Head({ first }: { first: string }) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>{first}</TableHead>
        <TableHead className="text-end">{t("notificationControls.activity.sent")}</TableHead>
        <TableHead className="text-end">{t("notificationControls.activity.pushed")}</TableHead>
        <TableHead className="text-end">{t("notificationControls.activity.read")}</TableHead>
        <TableHead className="text-end">{t("notificationControls.activity.blockedAdmin")}</TableHead>
        <TableHead className="text-end">{t("notificationControls.activity.blockedMember")}</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function NotificationActivityTab() {
  const locale = useI18nLocale();
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useNotificationActivity(days);
  const { data: controls } = useNotificationControls(7);

  const labelFor = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of controls?.controls || []) m.set(c.type, localized(c.label, locale));
    return (type: string) => m.get(type) || type;
  }, [controls, locale]);

  const { byDay, byType, total } = useMemo(() => {
    const dayMap = new Map<string, Totals>();
    const typeMap = new Map<string, Totals>();
    let sum = ZERO;
    for (const r of data || []) {
      dayMap.set(r.day, add(dayMap.get(r.day) || ZERO, r));
      typeMap.set(r.type, add(typeMap.get(r.type) || ZERO, r));
      sum = add(sum, r);
    }
    return {
      byDay: [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0])),
      byType: [...typeMap.entries()].sort((a, b) => b[1].sent + b[1].blocked_admin - (a[1].sent + a[1].blocked_admin)),
      total: sum,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t("notificationControls.activity.intro")}</p>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[7, 30, 90].map((d) => (
              <SelectItem key={d} value={String(d)}>
                {t("notificationControls.activity.lastDays", { days: d })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("notificationControls.loading")}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6 text-destructive">
            {t("notificationControls.activity.error", { message: (error as Error).message })}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("notificationControls.activity.byType")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <Head first={t("notificationControls.activity.type")} />
                <TableBody>
                  {byType.map(([type, v]) => (
                    <TableRow key={type}>
                      <TableCell>
                        <div className="font-medium">{labelFor(type)}</div>
                        <code className="text-xs text-muted-foreground">{type}</code>
                      </TableCell>
                      <Cells v={v} />
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell>{t("notificationControls.activity.total")}</TableCell>
                    <Cells v={total} />
                  </TableRow>
                </TableBody>
              </Table>
              {byType.length === 0 && (
                <p className="p-4 text-center text-muted-foreground">{t("notificationControls.activity.empty")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("notificationControls.activity.byDay")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <Head first={t("notificationControls.activity.day")} />
                <TableBody>
                  {byDay.map(([day, v]) => (
                    <TableRow key={day}>
                      <TableCell>{fmtDate(new Date(`${day}T00:00:00Z`))}</TableCell>
                      <Cells v={v} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default NotificationActivityTab;
