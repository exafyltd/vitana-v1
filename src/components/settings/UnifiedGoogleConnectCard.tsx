/**
 * Phase 3 of the OAuth WebView simplification: one Google card that
 * covers Gmail / Calendar / Contacts / YouTube under a single consent
 * screen. Replaces the historical split where each Google service had
 * its own button (and YouTube ran its own OAuth flow on top).
 *
 * The card is additive — the existing per-service tiles still render in
 * Connected Apps so users who connected before this shipped don't see a
 * confusing "you've already connected, why is there a Connect button"
 * state. When all four sub-services are connected, the card collapses
 * into a status-only "All Google services connected" surface with a
 * Manage button that opens the existing GoogleConnectionVerifyDialog.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Mail, Calendar as CalendarIcon, Contact as ContactIcon, Youtube } from "lucide-react";
import { toast } from "sonner";
import {
  ALL_GOOGLE_SUB_SERVICES,
  useStartUnifiedGoogleConnect,
  useSocialConnections,
  useVerifyGoogleConnection,
  type GoogleSubService,
  type SocialConnection,
} from "@/hooks/useGoogleConnect";

interface Props {
  onManage?: () => void;
  className?: string;
}

const META: Record<GoogleSubService, { label: string; icon: JSX.Element; description: string }> = {
  gmail: {
    label: "Gmail",
    description: "Read your inbox so Vitana can summarize emails and surface relevant updates.",
    icon: <Mail className="h-5 w-5" />,
  },
  calendar: {
    label: "Calendar",
    description: "See upcoming events so Vitana can plan around your day.",
    icon: <CalendarIcon className="h-5 w-5" />,
  },
  contacts: {
    label: "Contacts",
    description: "Read your contacts so Vitana can recognize people you mention.",
    icon: <ContactIcon className="h-5 w-5" />,
  },
  youtube: {
    label: "YouTube",
    description: "Search YouTube for music playback through ORB.",
    icon: <Youtube className="h-5 w-5" />,
  },
};

export function UnifiedGoogleConnectCard({ onManage, className }: Props) {
  const { data: connections = [] } = useSocialConnections();
  const { data: verifyResult } = useVerifyGoogleConnection(true);
  const startUnified = useStartUnifiedGoogleConnect();

  // We treat a sub-service as "connected" if the relevant scope is in the
  // active google connection AND the live probe (when available) says so.
  // The probe check is what catches the case where the user revoked
  // access from their Google account but the row hasn't been tombstoned
  // yet by the refresher.
  const hasGoogleRow = useMemo(
    () => connections.some((c: SocialConnection) => c.provider === "google"),
    [connections],
  );
  const hasYoutubeRow = useMemo(
    () => connections.some((c: SocialConnection) => c.provider === "youtube"),
    [connections],
  );
  const probes = verifyResult?.probes;
  const scopes = verifyResult?.connection?.scopes ?? [];

  function isSubServiceConnected(s: GoogleSubService): boolean {
    if (s === "youtube") {
      // YouTube can be granted via either the unified google scope or
      // the legacy dedicated youtube provider.
      const inUnified = scopes.some((sc) => sc.endsWith("/auth/youtube.readonly"));
      return inUnified || hasYoutubeRow;
    }
    if (!hasGoogleRow) return false;
    const probe = probes?.[s as "gmail" | "calendar" | "contacts"];
    if (probe) return probe.ok;
    // No probe data yet — fall back to scope presence.
    const needle = `/auth/${s}.readonly`;
    return scopes.some((sc) => sc.endsWith(needle));
  }

  const connectedSet = useMemo(() => {
    const set = new Set<GoogleSubService>();
    for (const s of ALL_GOOGLE_SUB_SERVICES) if (isSubServiceConnected(s)) set.add(s);
    return set;
  }, [connections, verifyResult]);

  const allConnected = connectedSet.size === ALL_GOOGLE_SUB_SERVICES.length;

  // Default selection: any sub-service the user hasn't connected yet.
  // When everything's already connected we default to "all on" so the
  // card can still serve as a re-consent button.
  const [selected, setSelected] = useState<Set<GoogleSubService>>(() => {
    const s = new Set<GoogleSubService>(ALL_GOOGLE_SUB_SERVICES.filter((x) => !connectedSet.has(x)));
    if (s.size === 0) ALL_GOOGLE_SUB_SERVICES.forEach((x) => s.add(x));
    return s;
  });

  const toggle = (s: GoogleSubService) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const handleConnect = () => {
    if (selected.size === 0) {
      toast.error("Pick at least one Google service to connect.");
      return;
    }
    startUnified.mutate(
      { include: Array.from(selected), mode: hasGoogleRow ? "incremental" : "full" },
      {
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          toast.error(`Couldn't start Google sign-in: ${message}`);
        },
      },
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Google</span>
          {allConnected ? (
            <span className="inline-flex items-center gap-1 text-sm font-normal text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              All services connected
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>
          One consent screen covers every service you tick — Vitana asks Google for the matching permissions and stores a single token row.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_GOOGLE_SUB_SERVICES.map((s) => {
            const meta = META[s];
            const connected = connectedSet.has(s);
            return (
              <label
                key={s}
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                  connected ? "border-green-200 bg-green-50/40" : "border-border hover:bg-muted/40"
                }`}
              >
                <Checkbox
                  checked={selected.has(s)}
                  onCheckedChange={() => toggle(s)}
                  aria-label={meta.label}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {meta.icon}
                    <span className="font-medium">{meta.label}</span>
                    {connected ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleConnect} disabled={startUnified.isPending}>
            {startUnified.isPending
              ? "Opening Google…"
              : hasGoogleRow
                ? "Update Google connection"
                : "Connect Google"}
          </Button>
          {hasGoogleRow && onManage ? (
            <Button variant="outline" onClick={onManage}>
              Manage
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
