/**
 * Public /changelog (R18 from Phase 5).
 *
 * No-auth, end-user-facing changelog. Renders the response from
 * GET /api/v1/releases/changelog/public (vitana-platform R17), which filters
 * to channel='stable' AND release_components.public_changelog=TRUE per P4.
 *
 * Mobile-friendly — this is the ONLY release surface visible on mobile per
 * the Q3 mobile-Community-only policy.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';

const GATEWAY_URL = (import.meta as any).env?.VITE_GATEWAY_URL ?? '';

interface PublicChangelogEntry {
  component_slug: string | null;
  display_name: string | null;
  surface: string | null;
  version: string;
  released_at: string;
  changelog: string;
}

async function fetchPublicChangelog(): Promise<PublicChangelogEntry[]> {
  const r = await fetch(`${GATEWAY_URL}/api/v1/releases/changelog/public`);
  if (!r.ok) throw new Error(`Failed to load changelog: ${r.status}`);
  const data = await r.json();
  return (data?.entries ?? []) as PublicChangelogEntry[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function surfaceLabel(s: string | null): string {
  switch (s) {
    case 'desktop': return 'Desktop';
    case 'ios': return 'iOS';
    case 'android': return 'Android';
    case 'web': return 'Web';
    default: return s ?? '—';
  }
}

export default function Changelog() {
  const [entries, setEntries] = useState<PublicChangelogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicChangelog()
      .then((data) => { if (!cancelled) setEntries(data); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  // Group entries by surface for clearer reading
  const bySurface = new Map<string, PublicChangelogEntry[]>();
  if (entries) {
    for (const e of entries) {
      const s = surfaceLabel(e.surface);
      const list = bySurface.get(s) ?? [];
      list.push(e);
      bySurface.set(s, list);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-primary">
          <Sparkles className="h-6 w-6" />
          <h1 className="text-3xl font-bold">What's new</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Recent stable releases across MAXINA and vitanaland.com.
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!entries && !error && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {entries && entries.length === 0 && (
        <Alert>
          <AlertDescription>No releases published yet.</AlertDescription>
        </Alert>
      )}

      {entries && entries.length > 0 && Array.from(bySurface.entries()).map(([surface, list]) => (
        <section key={surface} className="space-y-3">
          <h2 className="text-lg font-semibold">{surface}</h2>
          {list.map((entry, i) => (
            <Card key={`${entry.component_slug}-${entry.version}-${i}`}>
              <CardContent className="p-5">
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <div className="font-mono text-lg font-bold">v{entry.version}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(entry.released_at)}</div>
                </div>
                {entry.changelog ? (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                    {entry.changelog}
                  </pre>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No release notes.</span>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
