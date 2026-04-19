/**
 * VTID-01928: "Verify connection" dialog for the Google connectors on the
 * Connected Apps page. Calls the gateway's /api/v1/social-accounts/google/verify
 * endpoint, which in turn hits Gmail / Calendar / Contacts / YouTube with the
 * stored OAuth token and reports per-service results.
 *
 * Purpose is to give the user visible, live proof that the OAuth connection
 * is actually usable — not merely that a DB row exists.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useVerifyGoogleConnection, type GoogleVerifyResult } from "@/hooks/useGoogleConnect";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProbeRow = {
  key: string;
  name: string;
  status: "ok" | "fail";
  summary: string;
  detail?: string;
};

function buildRows(result: GoogleVerifyResult | undefined): ProbeRow[] {
  if (!result?.probes) return [];
  const { gmail, calendar, contacts, youtube } = result.probes;
  return [
    {
      key: "gmail",
      name: "Gmail",
      status: gmail.ok ? "ok" : "fail",
      summary: gmail.ok
        ? `${gmail.email} — ${gmail.messages_total ?? 0} messages, ${gmail.threads_total ?? 0} threads`
        : gmail.error ?? `HTTP ${gmail.status}`,
    },
    {
      key: "calendar",
      name: "Google Calendar",
      status: calendar.ok ? "ok" : "fail",
      summary: calendar.ok
        ? `${calendar.calendars ?? 0} calendar(s); primary: ${calendar.primary ?? "(none)"}`
        : calendar.error ?? `HTTP ${calendar.status}`,
    },
    {
      key: "contacts",
      name: "Google Contacts",
      status: contacts.ok ? "ok" : "fail",
      summary: contacts.ok
        ? contacts.total_people != null
          ? `${contacts.total_people} contacts visible`
          : "connection reachable (People API returned OK)"
        : contacts.error ?? `HTTP ${contacts.status}`,
    },
    {
      key: "youtube",
      name: "YouTube",
      status: youtube.ok ? "ok" : "fail",
      summary: youtube.ok
        ? youtube.has_channel
          ? `Channel: ${youtube.channel_title} (${youtube.subscriber_count ?? "0"} subscribers)`
          : "API reachable — no YouTube channel on this account"
        : youtube.error ?? `HTTP ${youtube.status}`,
    },
  ];
}

export function GoogleConnectionVerifyDialog({ open, onOpenChange }: Props) {
  const [hasRun, setHasRun] = useState(false);
  const { data, error, isFetching, refetch } = useVerifyGoogleConnection(false);

  useEffect(() => {
    if (open && !hasRun) {
      setHasRun(true);
      refetch();
    }
    if (!open) setHasRun(false);
  }, [open, hasRun, refetch]);

  const rows = buildRows(data);
  const passed = rows.filter(r => r.status === "ok").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Google connection — live check</DialogTitle>
          <DialogDescription>
            Calls Gmail, Calendar, Contacts and YouTube with your stored OAuth token and reports what came back.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Probing Google APIs…
            </div>
          )}

          {error && !isFetching && (
            <div className="text-sm text-destructive py-4 break-words">
              Couldn't reach the verify endpoint: {error instanceof Error ? error.message : String(error)}
            </div>
          )}

          {!isFetching && data?.ok && (
            <div className="space-y-3 py-2">
              <div className="text-sm text-muted-foreground break-words">
                <span className="font-medium text-foreground">{data.connection?.email}</span> —
                connected {data.connection?.connected_at?.slice(0, 10)},
                refresh_token {data.connection?.has_refresh_token ? "present" : "missing"},
                token expires {data.connection?.token_expires_at?.slice(11, 19)} UTC.
              </div>
              <ul className="space-y-2">
                {rows.map(r => (
                  <li key={r.key} className="flex items-start gap-3 rounded-md border p-3">
                    {r.status === "ok"
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                        {r.summary}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="text-xs text-muted-foreground pt-1">
                {passed} / {rows.length} services reachable.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Re-run check
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
