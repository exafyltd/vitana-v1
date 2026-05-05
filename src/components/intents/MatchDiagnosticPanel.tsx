/**
 * E6 — diagnostic panel rendered under the Find a Match error banner.
 *
 * Auto-runs `runMatchDiagnostic()` on mount, then renders a compact
 * report (origin, gateway, online flag, SW status, auth presence,
 * probe results). Includes Re-run + Copy-report buttons so the user
 * can paste the JSON into a chat instead of plumbing remote DevTools.
 *
 * Mounted only when `FindPartner` is in the error state on the
 * matches view; bears no cost on the happy path.
 */

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { runMatchDiagnostic, type DiagnosticReport } from '@/lib/matchDiagnostic';

export function MatchDiagnosticPanel() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(true);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setReport(await runMatchDiagnostic());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Diagnostic failed');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const copy = async () => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Diagnostic copied' });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-4 space-y-3 text-xs font-mono">
      <div className="flex items-center justify-between">
        <span className="text-sm font-sans font-semibold">Diagnostic</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void run()} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-run'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void copy()} disabled={!report}>
            Copy
          </Button>
        </div>
      </div>

      {busy && !report && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Running probes…
        </div>
      )}

      {error && <p className="text-destructive break-all">{error}</p>}

      {report && (
        <div className="space-y-2">
          <Row k="origin" v={report.origin} />
          <Row k="gateway" v={report.gatewayUrl} />
          <Row k="online" v={String(report.online)} bad={!report.online} />
          <Row
            k="serviceWorker"
            v={`${report.serviceWorker}${report.swScript ? ` (${report.swScript})` : ''}`}
          />
          <Row
            k="auth token"
            v={report.tokenPresent ? `present (${report.tokenSnippet})` : 'MISSING'}
            bad={!report.tokenPresent}
          />
          <Row k="captured" v={report.capturedAt} />

          <div className="pt-2 border-t border-border space-y-1">
            {report.probes.map((p) => (
              <Row
                key={p.label}
                k={p.label}
                v={`${p.detail} (${p.ms}ms)`}
                bad={!p.ok}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-28 shrink-0">{k}</span>
      <span className={bad ? 'text-destructive break-all' : 'break-all'}>{v}</span>
    </div>
  );
}
