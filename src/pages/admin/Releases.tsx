/**
 * /admin/releases — tenant admin 3-tab Releases page (R10 from Phase 4).
 *
 * Tabs: Overview / Changelog / Backlog. All three share the same gateway
 * endpoints; the gateway scopes responses to the caller's tenant.
 *
 * Per P1 + R12: backlog items with `vtid_linked=true` show effective_status
 * from vtid_ledger and disable the local status edit affordance.
 *
 * Per F1: this page is mounted at /admin/releases (top-level, adjacent to
 * System in the admin sidebar — see R11 for nav entry).
 */

import { useState } from 'react';
import { useReleasesOverview } from '@/hooks/useReleasesOverview';
import { useReleaseHistory } from '@/hooks/useReleaseHistory';
import { useReleaseBacklog } from '@/hooks/useReleaseBacklog';
import type { Compatibility, ReleaseChannel, Surface } from '@/types/releases';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, ChevronsRight, Lock } from 'lucide-react';

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
  return `${Math.floor(days / 30)}mo ago`;
}

function channelVariant(channel: ReleaseChannel | null): 'default' | 'secondary' | 'outline' {
  if (channel === 'stable') return 'default';
  if (channel === 'beta') return 'secondary';
  return 'outline';
}

function surfaceLabel(s: Surface): string {
  switch (s) {
    case 'desktop': return 'Desktop';
    case 'ios': return 'iOS';
    case 'android': return 'Android';
    case 'web': return 'Web';
    case 'api': return 'API';
    case 'sdk': return 'SDK';
    case 'command_hub': return 'Command Hub';
  }
}

function CompatibilityBadge({ status }: { status: Compatibility }) {
  switch (status) {
    case 'ok':
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> ok</Badge>;
    case 'behind':
      return <Badge variant="secondary" className="gap-1"><ChevronsRight className="h-3 w-3" /> behind</Badge>;
    case 'breaking':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> breaking</Badge>;
  }
}

function OverviewTab() {
  const { data, isLoading, error } = useReleasesOverview();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Alert variant="destructive"><AlertTitle>Couldn't load overview</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
  if (!data) return <Alert><AlertDescription>No data.</AlertDescription></Alert>;

  const myTenant = data.tenants[0]; // tenant_admin sees length 1

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Platform I depend on</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Component</th>
                <th className="px-4 py-2 font-medium">Version</th>
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">Released</th>
              </tr>
            </thead>
            <tbody>
              {data.platform.map((c) => (
                <tr key={c.slug} className="border-t">
                  <td className="px-4 py-3 font-medium">{c.display_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.current_version ?? '—'}</td>
                  <td className="px-4 py-3">
                    {c.current_channel ? <Badge variant={channelVariant(c.current_channel)}>{c.current_channel}</Badge> : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{relativeTime(c.current_released_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {myTenant && (
        <Card>
          <CardHeader><CardTitle className="text-base">{myTenant.name} surfaces</CardTitle></CardHeader>
          <CardContent className="p-0">
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
                {myTenant.surfaces.map((s) => (
                  <tr key={s.slug} className="border-t">
                    <td className="px-3 py-3 font-medium">{surfaceLabel(s.surface)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{s.current_version ?? '—'}</td>
                    <td className="px-3 py-3">
                      {s.current_channel ? <Badge variant={channelVariant(s.current_channel)}>{s.current_channel}</Badge> : '—'}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{s.min_platform_version ?? '—'}</td>
                    <td className="px-3 py-3"><CompatibilityBadge status={s.compatibility} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.pending_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChangelogTab() {
  const { data, isLoading, error } = useReleaseHistory({});
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Alert variant="destructive"><AlertTitle>Couldn't load history</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
  if (!data || data.length === 0) return <Alert><AlertDescription>No releases recorded yet.</AlertDescription></Alert>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Authoring UI for changelogs ships in a follow-up. This view is read-only for now.
        Promoting a release to <Badge variant="default">stable</Badge> propagates the changelog to App Store /
        Play Store / vitanaland.com via the release-publisher worker.
      </p>
      {data.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{entry.component_slug}</span>
                <span className="font-mono text-sm font-bold">v{entry.version}</span>
                <Badge variant={channelVariant(entry.channel)}>{entry.channel}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{relativeTime(entry.released_at)}</span>
            </div>
            {entry.changelog && (
              <pre className="whitespace-pre-wrap text-xs bg-muted/30 p-3 rounded mt-2">
                {entry.changelog}
              </pre>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BacklogTab() {
  const { data, isLoading, error } = useReleaseBacklog({});
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <Alert variant="destructive"><AlertTitle>Couldn't load backlog</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
  if (!data || data.length === 0) return <Alert><AlertDescription>Backlog is empty.</AlertDescription></Alert>;

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{item.title}</div>
                {item.summary && (
                  <div className="text-sm text-muted-foreground mt-1">{item.summary}</div>
                )}
              </div>
              <Badge variant="outline">{item.effective_status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="font-mono">{item.component_slug ?? item.component_id.slice(0, 8)}</span>
              {item.target_version && <span>target: <span className="font-mono">{item.target_version}</span></span>}
              {item.target_channel && <Badge variant="outline" className="text-[10px]">{item.target_channel}</Badge>}
              {item.vtid && (
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span className="font-mono">{item.vtid}</span>
                  <span className="italic">(status read-through from VTID)</span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground pt-2">
        Phase 4 — read-only list. Create / edit / drop UI ships in a follow-up. VTID-linked
        items have their status pulled live from <code>vtid_ledger</code> per design decision P1
        and are read-only here — edit the linked VTID instead.
      </p>
    </div>
  );
}

export default function AdminReleases() {
  const [tab, setTab] = useState('overview');
  return (
    <div className="space-y-4 p-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold mb-1">Releases</h1>
        <p className="text-sm text-muted-foreground">
          Tenant release matrix — platform versions you depend on, your surfaces' versions,
          changelogs, and pending backlog.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
          <TabsTrigger value="backlog">Backlog</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="changelog" className="mt-4"><ChangelogTab /></TabsContent>
        <TabsContent value="backlog" className="mt-4"><BacklogTab /></TabsContent>
      </Tabs>
    </div>
  );
}
