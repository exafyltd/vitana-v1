/**
 * VTID-05133 — the member approves their AI assistant for the Maxina Community
 * connector (gateway /mcp/community*). Rendered by CommerceConnectAuthorize,
 * the single page Supabase Auth sends every OAuth consent to, when the pending
 * authorization asked for the Community resource.
 *
 * Approve = record the categories (ai_connection_grant_from_authorization)
 * FIRST, then approve with Supabase. If recording fails, nothing is approved
 * (fail closed): the assistant would otherwise get a token it cannot use.
 */
import { useState } from 'react';
import { Check, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { t } from '@/lib/i18n-toast';
import { COMMUNITY_CATEGORIES, grantFromAuthorization, type CommunityCategory } from '@/lib/ai-connections';

export interface CommunityConsentProps {
  authorizationId: string;
  clientName: string | null;
  redirectHost: string | null;
  email: string | null;
  /** Supabase approve/deny; returns the assistant's redirect URL. */
  decide: (approve: boolean) => Promise<string | null>;
  /** Navigates away (window.location.assign in the app; a spy in tests). */
  go: (url: string) => void;
}

const K = 'aiConnect';

export function CommunityConsent({ authorizationId, clientName, redirectHost, email, decide, go }: CommunityConsentProps) {
  const [selected, setSelected] = useState<Set<CommunityCategory>>(() => new Set(COMMUNITY_CATEGORIES));
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const client = clientName ?? t(`${K}.settings.unknownClient`);

  const toggle = (c: CommunityCategory, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(c);
      else next.delete(c);
      return next;
    });

  const finish = async (approve: boolean) => {
    setWorking(true);
    setFailed(false);
    try {
      if (approve) await grantFromAuthorization(authorizationId, [...selected]);
      const next = await decide(approve);
      if (!next) throw new Error('no_redirect');
      setRedirecting(true);
      go(next);
    } catch {
      setFailed(true);
    } finally {
      setWorking(false);
    }
  };

  if (redirecting) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t(`${K}.consent.redirecting`)}</p>
      </div>
    );
  }

  return (
    <div data-testid="community-consent">
      <ShieldCheck className="h-8 w-8 text-primary" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold text-foreground">{t(`${K}.consent.title`, { client })}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`${K}.consent.lead`, { client })}</p>
      {email && <p className="mt-2 text-xs text-muted-foreground">{t(`${K}.consent.signedInAs`, { email })}</p>}

      <p className="mt-5 text-sm font-medium text-foreground">{t(`${K}.consent.chooseTitle`, { client })}</p>
      <ul className="mt-2 space-y-3">
        {COMMUNITY_CATEGORIES.map((c) => (
          <li key={c} className="flex items-start justify-between gap-3">
            <label htmlFor={`ai-cat-${c}`} className="min-w-0 text-start">
              <span className="block text-sm font-medium text-foreground">{t(`${K}.categories.${c}`)}</span>
              <span className="block text-xs text-muted-foreground">{t(`${K}.categories.${c}Desc`)}</span>
            </label>
            <Switch
              id={`ai-cat-${c}`}
              data-testid={`consent-category-${c}`}
              checked={selected.has(c)}
              onCheckedChange={(on) => toggle(c, on)}
              disabled={working}
            />
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
        <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {t(`${K}.consent.readOnly`)}
      </p>
      <p className="mt-2 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground" data-testid="consent-not-shared">
        <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {t(`${K}.consent.notShared`)}
      </p>
      {redirectHost && (
        <p className="mt-3 rounded-xl border border-border p-3 text-xs leading-relaxed text-foreground" data-testid="consent-redirect-host">
          {t(`${K}.consent.redirectsTo`, { host: redirectHost })}
        </p>
      )}

      {selected.size === 0 && <p className="mt-4 text-sm text-muted-foreground">{t(`${K}.consent.noneSelected`)}</p>}
      {failed && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {t(`${K}.consent.failed`)}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          disabled={working || selected.size === 0}
          onClick={() => void finish(true)}
          data-testid="consent-approve"
          className="h-12 flex-1 rounded-xl font-semibold"
        >
          {working ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
          {t(`${K}.consent.approve`)}
        </Button>
        <Button variant="outline" disabled={working} onClick={() => void finish(false)} data-testid="consent-deny" className="h-12 flex-1 rounded-xl font-semibold">
          {t(`${K}.consent.deny`)}
        </Button>
      </div>
    </div>
  );
}
