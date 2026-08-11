/**
 * Command Hub — Releases (R5 from Phase 3a plan).
 *
 * System-wide release matrix. Read/write across all tenants and all platform
 * components. Lives at /dev/releases inside the Command Hub shell.
 *
 * Auth (per Q1 / #351 — once enforced): Developer + Exafy super-admin only.
 * Today the route is wrapped by DevAuthGuard which only checks "is logged in";
 * the canonical guard tightening lands in #351 and is independent of this page.
 *
 * Spec: vitana-v1/docs/release-backlog-overview-screen.md § 4
 *
 * Phase 3a scope: read-only matrix view consuming useReleasesOverview().
 * Click-to-drill (release history drawer) is deferred to Phase 4 alongside the
 * write endpoints in #1842 (R9).
 */

import { useReleasesOverview } from '@/hooks/useReleasesOverview';
import type { Compatibility, ReleaseChannel, Surface } from '@/types/releases';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, ChevronsRight } from 'lucide-react';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function channelVariant(channel: ReleaseChannel | null): 'default' | 'secondary' | 'outline' {
  switch (channel) {
    case 'stable':
      return 'default';
    case 'beta':
      return 'secondary';
    case 'internal':
      return 'outline';
    default:
      return 'outline';
  }
}

function CompatibilityBadge({ status }: { status: Compatibility }) {
  // Re-uses existing semantic Badge variants — no new colors per spec.
  switch (status) {
    case 'ok':
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> ok
        </Badge>
      );
    case 'behind':
      return (
        <Badge variant="secondary" className="gap-1">
          <ChevronsRight className="h-3 w-3" /> behind
        </Badge>
      );
    case 'breaking':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> breaking
        </Badge>
      );
  }
}

function surfaceLabel(s: Surface): string {
  switch (s) {
    case 'desktop':
      return 'Desktop';
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'web':
      return 'Web';
    case 'api':
      return 'API';
    case 'sdk':
      return 'SDK';
    case 'command_hub':
      return 'Command Hub';
    default:
      return s;
  }
}

// -----------------------------------------------------------------------------
// Loading / error states
// -----------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Releases</h1>
        <p className="text-sm text-muted-foreground">
          Loading platform + tenant release matrix…
        </p>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="p-6 max-w-2xl">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Couldn't load release matrix</AlertTitle>
        <AlertDescription>
          {error.message}
          <br />
          <span className="text-xs opacity-80">
            If this persists: confirm the gateway has /api/v1/releases/overview
            mounted (see PR #1191 manual mount step).
          </span>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main page
// -----------------------------------------------------------------------------

export default function DevReleases() {
  const { data, isLoading, error } = useReleasesOverview();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <ErrorState error={new Error('No data returned')} />;

  const { platform, tenants } = data;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Releases</h1>
        <p className="text-sm text-muted-foreground">
          System-wide release matrix — platform components and tenant surfaces.
        </p>
      </div>

      {/* PLATFORM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Component</th>
                  <th className="px-4 py-2 font-medium">Version</th>
                  <th className="px-4 py-2 font-medium">Channel</th>
                  <th className="px-4 py-2 font-medium">Released</th>
                  <th className="px-4 py-2 font-medium text-right">Pending</th>
                </tr>
              </thead>
              <tbody>
                {platform.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      No platform components registered yet.
                    </td>
                  </tr>
                ) : (
                  platform.map((c) => (
                    <tr key={c.slug} className="border-t">
                      <td className="px-4 py-3 font-medium">{c.display_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {c.current_version ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {c.current_channel ? (
                          <Badge variant={channelVariant(c.current_channel)}>
                            {c.current_channel}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {relativeTime(c.current_released_at)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.pending_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* TENANTS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No tenant components registered yet.
            </div>
          ) : (
            <div className="divide-y">
              {tenants.map((tenant) => (
                <div key={tenant.tenant_id} className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{tenant.name}</h3>
                    <span className="text-xs text-muted-foreground font-mono">
                      {tenant.tenant_id.slice(0, 8)}…
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-medium">Surface</th>
                          <th className="px-3 py-2 font-medium">Version</th>
                          <th className="px-3 py-2 font-medium">Channel</th>
                          <th className="px-3 py-2 font-medium">Min platform</th>
                          <th className="px-3 py-2 font-medium">Compat</th>
                          <th className="px-3 py-2 font-medium text-right">Pending</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenant.surfaces.map((s) => (
                          <tr key={s.slug} className="border-t">
                            <td className="px-3 py-3 font-medium">{surfaceLabel(s.surface)}</td>
                            <td className="px-3 py-3 font-mono text-xs">
                              {s.current_version ?? '—'}
                            </td>
                            <td className="px-3 py-3">
                              {s.current_channel ? (
                                <Badge variant={channelVariant(s.current_channel)}>
                                  {s.current_channel}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                              {s.min_platform_version ?? '—'}
                            </td>
                            <td className="px-3 py-3">
                              <CompatibilityBadge status={s.compatibility} />
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {s.pending_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Phase 3a — read-only matrix. Click-to-drill (release history drawer) +
        backlog management ship in Phase 4 (#1842 R9 + #370 R10).
      </div>
    </div>
  );
}
