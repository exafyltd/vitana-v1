/**
 * VTID-03567: Raw analytics event explorer (/admin/insights/events).
 *
 * Filterable feed of the latest product_analytics_events rows (metadata
 * only — the pipeline never stores raw message text). Consumes the
 * previously-unused useAdminAnalyticsEvents hook. The gateway endpoint
 * returns the newest N rows with no cursor, so this is deliberately a
 * "latest events" view, not deep pagination.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminAnalyticsEvents, AnalyticsEventRow } from "@/hooks/useAdminProductAnalytics";
import { AnalyticsStates, PrivacyNote } from "@/components/admin/analytics/AnalyticsShared";
import { fmtDateTime, fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const EVENT_TYPES = ["journey", "assistant", "feature", "interest", "friction", "performance", "content"] as const;
const ALL_TYPES = "all";

function EventRow({ event }: { event: AnalyticsEventRow }) {
  const [expanded, setExpanded] = useState(false);
  const hasProps = event.properties && Object.keys(event.properties).length > 0;
  return (
    <div className="rounded border text-sm">
      <button
        type="button"
        onClick={() => hasProps && setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left"
      >
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {fmtDateTime(new Date(event.occurred_at))}
        </span>
        <span className="font-mono text-xs font-medium">{event.event_name}</span>
        <Badge variant="secondary">{event.event_type}</Badge>
        <Badge variant="outline">{event.source}</Badge>
        <span className="truncate font-mono text-xs text-muted-foreground">{event.screen_route}</span>
        {event.feature_key && (
          <span className="truncate font-mono text-xs text-muted-foreground">{event.feature_key}</span>
        )}
        {hasProps && (
          <span className="ml-auto text-xs text-primary">
            {expanded ? "−" : "+"} {t("screens.admin.paProperties")}
          </span>
        )}
      </button>
      {expanded && hasProps && (
        <pre className="max-h-64 overflow-auto border-t bg-muted/40 px-3 py-2 font-mono text-xs">
          {JSON.stringify(event.properties, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function Events() {
  const [eventType, setEventType] = useState<string>(ALL_TYPES);
  const [nameInput, setNameInput] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [limit, setLimit] = useState(100);

  const { data, isLoading, error } = useAdminAnalyticsEvents({
    event_type: eventType === ALL_TYPES ? undefined : eventType,
    event_name: nameFilter || undefined,
    limit,
  });

  const isEmpty = !!data && data.events.length === 0;

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="🔎"
          title={t("screens.admin.paEventExplorer")}
          description={t("screens.admin.paEventsDesc")}
        />

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES}>{t("screens.admin.paAllTypes")}</SelectItem>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => setNameFilter(nameInput.trim())}
              onKeyDown={(e) => {
                if (e.key === "Enter") setNameFilter(nameInput.trim());
              }}
              placeholder={t("screens.admin.paEventNameFilter")}
              className="w-[220px]"
            />
            <Select value={String(limit)} onValueChange={(v) => setLimit(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
            {data && (
              <span className="ml-auto text-xs text-muted-foreground">
                {t("screens.admin.paShowingLatest", { count: fmtNumber(data.count) })}
              </span>
            )}
          </CardContent>
        </Card>

        <AnalyticsStates isLoading={isLoading} error={error} isEmpty={isEmpty} />

        {data && !isEmpty && (
          <>
            <div className="space-y-1.5">
              {data.events.map((event, i) => (
                <EventRow key={`${event.occurred_at}-${event.session_id}-${i}`} event={event} />
              ))}
            </div>
            <PrivacyNote />
          </>
        )}
      </div>
    </AppLayout>
  );
}
