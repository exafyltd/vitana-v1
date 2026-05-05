import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useVaeaChannels, type VaeaChannel } from "@/hooks/useVaea";
import { t } from '@/lib/i18n-toast';

const PLATFORMS: VaeaChannel["platform"][] = ["maxina", "slack", "discord", "telegram", "reddit", "custom"];

export function VaeaChannelsPanel() {
  const { channels, loading, error, reload, create, patch, remove } = useVaeaChannels();
  const [showForm, setShowForm] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{t('screens.business.autopilotChannels')}</CardTitle>
            <CardDescription>
              Channels Autopilot listens to for referral opportunities. Each channel can be paused, set to dry-run, or removed.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />
            {showForm ? "Close" : "Add channel"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded border border-destructive/20 bg-destructive/10 p-3 flex items-center justify-between gap-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={reload}>Retry</Button>
          </div>
        )}

        {showForm && (
          <AddChannelForm onSubmit={async (payload) => { await create(payload); setShowForm(false); }} />
        )}

        {channels.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No channels yet. Autopilot won't hear anything until you add at least one.
          </p>
        ) : (
          channels.map((channel) => (
            <div key={channel.id} className="rounded border bg-white/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{channel.platform}</Badge>
                  <span className="font-medium text-sm">{channel.display_name || channel.channel_key}</span>
                  {channel.dry_run && <Badge variant="secondary" className="text-xs">{t('screens.business.dryrun')}</Badge>}
                  {!channel.active && <Badge variant="destructive" className="text-xs">{t('screens.business.paused')}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={channel.active}
                    disabled={togglingId === channel.id}
                    onCheckedChange={async (v) => {
                      setTogglingId(channel.id);
                      try { await patch(channel.id, { active: v }); } finally { setTogglingId(null); }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      setRemovingId(channel.id);
                      try { await remove(channel.id); } finally { setRemovingId(null); }
                    }}
                    disabled={removingId === channel.id}
                  >
                    {removingId === channel.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {channel.last_error && (
                <p className="text-xs text-destructive italic">Last error: {channel.last_error}</p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AddChannelForm({ onSubmit }: { onSubmit: (payload: Partial<VaeaChannel>) => Promise<void> }) {
  const [platform, setPlatform] = useState<VaeaChannel["platform"]>("maxina");
  const [channelKey, setChannelKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="rounded border bg-muted/30 p-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Platform</span>
          <select
            className="w-full h-11 rounded-md border px-3 text-sm bg-background"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as VaeaChannel["platform"])}
          >
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">{t('screens.business.channelKeyId')}</span>
          <Input className="h-11" value={channelKey} onChange={(e) => setChannelKey(e.target.value)} placeholder="Platform-specific identifier" />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="text-muted-foreground">{t('screens.business.displayNameOptional')}</span>
        <Input className="h-11" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Friendly label" />
      </label>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="flex justify-end">
        <Button
          className="h-11 px-5 w-full md:w-auto"
          disabled={busy || !channelKey.trim()}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await onSubmit({ platform, channel_key: channelKey.trim(), display_name: displayName.trim() || null, dry_run: true });
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Add channel
        </Button>
      </div>
    </div>
  );
}
