/**
 * VTID-01928: "Verify connection" dialog for the Google connectors on the
 * Connected Apps page. Calls the gateway's /api/v1/social-accounts/google/verify
 * endpoint, which in turn hits Gmail / Calendar / Contacts with the stored
 * OAuth token and reports per-service results. YouTube lives on its own
 * connection now and is verified through the dedicated YouTube flow.
 *
 * Purpose is to give the user visible, live proof that the OAuth connection
 * is actually usable — not merely that a DB row exists.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle, Music } from "lucide-react";
import { useVerifyGoogleConnection, useInvokeCapability, handleInsufficientScope, type GoogleVerifyResult } from "@/hooks/useGoogleConnect";
import { useEffect, useState } from "react";
import { t } from '@/lib/i18n-toast';

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
  const { gmail, calendar, contacts } = result.probes;
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
  ];
}

export function GoogleConnectionVerifyDialog({ open, onOpenChange }: Props) {
  const [hasRun, setHasRun] = useState(false);
  const { data, error, isFetching, refetch } = useVerifyGoogleConnection(false);

  // VTID-01939: Play-a-song panel — exercises the capability framework end-to-end.
  const invokeCapability = useInvokeCapability();
  const [songQuery, setSongQuery] = useState("Beat It Michael Jackson");
  const [playError, setPlayError] = useState<string | null>(null);
  const [lastPlay, setLastPlay] = useState<{ title?: string; channel?: string; url?: string } | null>(null);

  const playSong = () => {
    const query = songQuery.trim();
    if (!query) return;
    setPlayError(null);
    setLastPlay(null);
    invokeCapability.mutate(
      { capability: "music.play", args: { query } },
      {
        onSuccess: (result) => {
          const raw = result.raw ?? {};
          setLastPlay({
            title: typeof raw.title === "string" ? raw.title : undefined,
            channel: typeof raw.channel === "string" ? raw.channel : undefined,
            url: result.url,
          });
          if (result.url) {
            // music.youtube.com is an Android App Link, so the same URL opens
            // YouTube Music on mobile and the web player on desktop.
            window.open(result.url, "_blank", "noopener,noreferrer");
          }
        },
        onError: (err) => {
          if (handleInsufficientScope(err)) {
            setPlayError("Vitana needs more permissions to play music — tap Grant access in the toast.");
            return;
          }
          const message = err instanceof Error ? err.message : String(err);
          setPlayError(message);
        },
      },
    );
  };

  useEffect(() => {
    if (open && !hasRun) {
      setHasRun(true);
      refetch();
    }
    if (!open) {
      setHasRun(false);
      setPlayError(null);
      setLastPlay(null);
    }
  }, [open, hasRun, refetch]);

  const rows = buildRows(data);
  const passed = rows.filter(r => r.status === "ok").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('screens.settings.googleConnectionLiveCheck')}</DialogTitle>
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

          {/* VTID-01939: Play-a-song panel — proves the capability framework end-to-end. */}
          <div className="mt-6 rounded-md border p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Music className="h-4 w-4" /> Play a song (music.play capability)
            </div>
            <div className="text-xs text-muted-foreground">
              Calls <code>{t('screens.settings.postapiv1capabilitiesmusicPlay')}</code>. Gateway searches YouTube with your token and returns a <code>{t('screens.settings.musicYoutubeCom')}</code> URL — opens in YouTube Music on Android or the web player on desktop.
            </div>
            <div className="flex gap-2">
              <Input
                value={songQuery}
                onChange={(e) => setSongQuery(e.target.value)}
                placeholder='e.g. "One Moment in Time Whitney Houston"'
                disabled={invokeCapability.isPending}
                onKeyDown={(e) => { if (e.key === "Enter") playSong(); }}
              />
              <Button
                size="sm"
                onClick={playSong}
                disabled={invokeCapability.isPending || !songQuery.trim()}
              >
                {invokeCapability.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Play"}
              </Button>
            </div>
            {playError && (
              <div className="text-xs text-destructive break-words">{playError}</div>
            )}
            {lastPlay && !playError && (
              <div className="text-xs text-muted-foreground break-words">
                Opened <span className="font-medium text-foreground">{lastPlay.title}</span>
                {lastPlay.channel ? ` — ${lastPlay.channel}` : ""}.
                {lastPlay.url ? (
                  <>
                    {" "}
                    <a href={lastPlay.url} target="_blank" rel="noreferrer" className="underline">
                      Open again
                    </a>
                    .
                  </>
                ) : null}
              </div>
            )}
          </div>
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
