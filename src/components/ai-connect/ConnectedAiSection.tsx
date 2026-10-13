/**
 * VTID-05133 — Settings → Connected apps → "Connected AI".
 *
 *   - Connect ChatGPT / Connect Claude: the three manual steps and the address
 *     to paste (one-click buttons come with the directory listings, a later
 *     phase). Hidden while the gateway does not serve the connector, so there
 *     is never a button that leads nowhere.
 *   - The member's connected assistants (ai_connection_grants): what each may
 *     use, per category, and Disconnect (immediate; Maxina-side).
 *   - "Let other members' AI assistants find me" (profile_privacy_settings.
 *     ai_discoverable, default off).
 *
 * Desktop (ConnectedApps.tsx) and mobile (MobileConnectedAppsView.tsx) render
 * the same component.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Copy, Check, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { t, notifyError } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_MCP_CHATGPT_URL,
  COMMUNITY_MCP_URL,
  fetchCommunityMcpReady,
  getAiDiscoverable,
  listAiConnections,
  revokeAiConnection,
  setAiDiscoverable,
  updateAiConnection,
  type AiConnection,
  type GrantCategory,
} from '@/lib/ai-connections';

const K = 'aiConnect';
type Assistant = 'chatgpt' | 'claude';

function ConnectSteps({ assistant, onClose }: { assistant: Assistant; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = assistant === 'chatgpt' ? COMMUNITY_MCP_CHATGPT_URL : COMMUNITY_MCP_URL;
  const name = assistant === 'chatgpt' ? 'ChatGPT' : 'Claude';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-testid={`ai-connect-steps-${assistant}`}>
        <DialogHeader>
          <DialogTitle>{t(`${K}.settings.howTitle`, { assistant: name })}</DialogTitle>
          <DialogDescription>{t(`${K}.settings.lead`)}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-foreground">
          <li>1. {t(assistant === 'chatgpt' ? `${K}.settings.step1Chatgpt` : `${K}.settings.step1Claude`)}</li>
          <li>
            2. {t(`${K}.settings.step2`)}
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
              <code className="min-w-0 flex-1 break-all text-xs" data-testid="ai-connect-url" dir="ltr">
                {url}
              </code>
              <Button size="sm" variant="outline" onClick={() => void copy()}>
                {copied ? <Check className="me-1 h-4 w-4" /> : <Copy className="me-1 h-4 w-4" />}
                {copied ? t(`${K}.settings.copied`) : t(`${K}.settings.copy`)}
              </Button>
            </div>
          </li>
          <li>3. {t(`${K}.settings.step3`)}</li>
        </ol>
        {/* Wrapped: this DialogContent hides its direct-child buttons ([&>button]:sr-only). */}
        <div>
          <Button variant="outline" onClick={onClose} className="mt-2 w-full" data-testid="ai-connect-steps-close">
            {t(`${K}.settings.close`)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConnectionRow({ c }: { c: AiConnection }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['ai-connections'] });
  const update = useMutation({
    mutationFn: (categories: GrantCategory[]) => updateAiConnection(c.clientId, categories),
    onSuccess: refresh,
    onError: () => notifyError(`${K}.settings.saveFailed`),
  });
  const revoke = useMutation({
    mutationFn: () => revokeAiConnection(c.clientId),
    onSuccess: refresh,
    onError: () => notifyError(`${K}.settings.saveFailed`),
  });
  const shown: GrantCategory[] = c.categories.includes('commerce') ? [...COMMUNITY_CATEGORIES, 'commerce'] : [...COMMUNITY_CATEGORIES];
  const busy = update.isPending || revoke.isPending;
  const name = c.clientName ?? t(`${K}.settings.unknownClient`);

  return (
    <li className="rounded-xl border border-border bg-card p-4" data-testid={`ai-connection-${c.clientId}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground" dir="auto">
            {c.redirectHost ? `${c.redirectHost} · ` : ''}
            {c.createdAt ? t(`${K}.settings.connectedSince`, { date: fmtDate(new Date(c.createdAt)) }) : ''}
          </p>
        </div>
        {c.revokedAt ? (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">{t(`${K}.settings.disconnected`)}</span>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => revoke.mutate()} data-testid="ai-connection-disconnect">
            <Unplug className="me-1 h-4 w-4" />
            {t(`${K}.settings.disconnect`)}
          </Button>
        )}
      </div>
      {c.revokedAt ? (
        <p className="mt-2 text-xs text-muted-foreground">{t(`${K}.settings.disconnectedNote`)}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((cat) => (
            <li key={cat} className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">{t(`${K}.categories.${cat}`)}</span>
              <Switch
                checked={c.categories.includes(cat)}
                disabled={busy}
                data-testid={`ai-connection-category-${cat}`}
                onCheckedChange={(on) => update.mutate(on ? [...c.categories, cat] : c.categories.filter((x) => x !== cat))}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function ConnectedAiSection() {
  const qc = useQueryClient();
  const [steps, setSteps] = useState<Assistant | null>(null);
  const ready = useQuery({ queryKey: ['community-mcp-ready'], queryFn: () => fetchCommunityMcpReady(), staleTime: 10 * 60 * 1000 });
  const connections = useQuery({ queryKey: ['ai-connections'], queryFn: listAiConnections, retry: false });
  const findable = useQuery({ queryKey: ['ai-discoverable'], queryFn: getAiDiscoverable, retry: false });
  const setFindable = useMutation({
    mutationFn: (v: boolean) => setAiDiscoverable(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-discoverable'] }),
    onError: () => notifyError(`${K}.settings.saveFailed`),
  });

  return (
    <section data-testid="connected-ai-section" className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Bot className="h-5 w-5" aria-hidden />
          {t(`${K}.settings.title`)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t(`${K}.settings.lead`)}</p>
      </div>

      {ready.data === true && (
        <div className="flex flex-col gap-2 sm:flex-row" data-testid="connected-ai-buttons">
          <Button className="flex-1" onClick={() => setSteps('chatgpt')} data-testid="connect-chatgpt">
            {t(`${K}.settings.connectChatgpt`)}
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => setSteps('claude')} data-testid="connect-claude">
            {t(`${K}.settings.connectClaude`)}
          </Button>
        </div>
      )}

      {connections.isError ? (
        <p className="text-sm text-muted-foreground">{t(`${K}.settings.loadFailed`)}</p>
      ) : connections.data && connections.data.length > 0 ? (
        <ul className="space-y-3">
          {connections.data.map((c) => (
            <ConnectionRow key={c.clientId} c={c} />
          ))}
        </ul>
      ) : connections.data ? (
        <p className="text-sm text-muted-foreground" data-testid="connected-ai-empty">
          {t(`${K}.settings.empty`)}
        </p>
      ) : null}

      <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <label htmlFor="ai-discoverable" className="min-w-0 text-start">
          <span className="block text-sm font-medium text-foreground">{t(`${K}.settings.findableTitle`)}</span>
          <span className="block text-xs text-muted-foreground">{t(`${K}.settings.findableDesc`)}</span>
        </label>
        <Switch
          id="ai-discoverable"
          data-testid="ai-discoverable-switch"
          checked={findable.data === true}
          disabled={findable.isLoading || findable.isError || setFindable.isPending}
          onCheckedChange={(v) => setFindable.mutate(v)}
        />
      </div>

      {steps && <ConnectSteps assistant={steps} onClose={() => setSteps(null)} />}
    </section>
  );
}

export default ConnectedAiSection;
