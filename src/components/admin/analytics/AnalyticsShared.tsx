/**
 * Shared building blocks for the /admin/insights product analytics screens
 * (BOOTSTRAP-PRODUCT-ANALYTICS). Follows the Navigator Telemetry visual
 * pattern: compact KPI cards, bordered list rows with count badges, and a
 * segmented 7/30/90-day selector.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

export function DaysSelect({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  return (
    <Select value={String(days)} onValueChange={(v) => onChange(parseInt(v))}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">{t("screens.admin.last7Days")}</SelectItem>
        <SelectItem value="30">{t("screens.admin.last30Days")}</SelectItem>
        <SelectItem value="90">{t("screens.admin.last90Days")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="truncate text-xs uppercase text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{typeof value === "number" ? fmtNumber(value) : value}</div>
      </CardContent>
    </Card>
  );
}

export function CountListCard({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[60vh] overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="space-y-1">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded border px-2 py-1.5 text-sm"
              >
                <span className="truncate font-mono">{row.label}</span>
                <Badge variant="secondary">{fmtNumber(row.count)}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsStates({
  isLoading,
  error,
  isEmpty,
}: {
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground">{t("screens.admin.loadingAnalytics")}</p>;
  if (error) {
    return (
      <p className="text-sm text-destructive">{(error as Error)?.message || t("screens.admin.noAnalyticsData")}</p>
    );
  }
  if (isEmpty) {
    return <AdminEmptyState title={t("screens.admin.noAnalyticsData")} description={t("screens.admin.analyticsMetadataNote")} />;
  }
  return null;
}

export function PrivacyNote({ textKey = "screens.admin.analyticsMetadataNote" }: { textKey?: string }) {
  return <p className="text-xs text-muted-foreground">{t(textKey)}</p>;
}

export function pct(rate: number): string {
  return `${fmtNumber(Math.round(rate * 1000) / 10)}%`;
}
