/**
 * OAuth consent page for the Vitanaland MCP authorization server
 * (VTID-03546 / BLK-007). The embedded AS in vcaop-mcp validates the
 * authorize request and 302s HERE with the request parameters; this page
 * authenticates the user via their existing Supabase session, lets them
 * tick the scopes they actually approve, and posts the decision back to
 * the AS — which returns the client redirect (carrying the single-use
 * code) that we then follow. The AS renders no HTML itself, and nothing
 * on this page can widen scopes: granted = requested ∩ registered ∩
 * what the human ticked (enforced server-side too).
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldQuestion } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n-toast';

const AS_BASE = ((import.meta.env.VITE_MCP_AS_URL as string | undefined) || 'https://mcp.vitanaland.com').replace(/\/$/, '');

const PARAM_KEYS = [
  'client_id',
  'redirect_uri',
  'response_type',
  'scope',
  'state',
  'code_challenge',
  'code_challenge_method',
  'resource',
] as const;

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const params = useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of PARAM_KEYS) {
      const v = searchParams.get(k);
      if (v) out[k] = v;
    }
    return out;
  }, [searchParams]);

  const clientName = searchParams.get('client_name') || params.client_id || '';
  const scopes = useMemo(() => (params.scope ?? '').split(' ').filter(Boolean), [params.scope]);
  const valid = Boolean(params.client_id && params.redirect_uri && params.code_challenge);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session?.access_token)));
  }, []);

  useEffect(() => {
    // Default: everything the client asked for is pre-ticked; the user unticks.
    setChecked(Object.fromEntries(scopes.map((s) => [s, true])));
  }, [scopes]);

  const scopeLabel = (scope: string) => {
    const label = t(`screens.oauthconsent.scopes.${scope}`);
    return label.includes('missing:') || label.startsWith('screens.') ? scope : label;
  };

  const submit = async (approved: boolean) => {
    setWorking(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (approved && !token) {
        setError(t('screens.oauthconsent.noSession'));
        return;
      }
      const approvedScopes = scopes.filter((s) => checked[s]);
      if (approved && approvedScopes.length === 0) {
        setError(t('screens.oauthconsent.nothingSelected'));
        return;
      }
      const res = await fetch(`${AS_BASE}/oauth/authorize/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          params,
          supabase_access_token: approved ? token : '',
          approved,
          approved_scopes: approvedScopes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.redirect_to) {
        setError(t('screens.oauthconsent.decisionFailed'));
        return;
      }
      window.location.assign(body.redirect_to as string);
    } catch {
      setError(t('screens.oauthconsent.decisionFailed'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <ShieldQuestion className="mb-2 h-8 w-8 text-primary" aria-hidden />
          <CardTitle>{t('screens.oauthconsent.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('screens.oauthconsent.clientWants', { client: clientName })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!valid ? (
            <p className="text-center text-sm text-destructive">{t('screens.oauthconsent.invalidRequest')}</p>
          ) : hasSession === false ? (
            <p className="text-center text-sm text-muted-foreground">{t('screens.oauthconsent.noSession')}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">{t('screens.oauthconsent.scopesIntro')}</p>
              <ul className="space-y-2">
                {scopes.map((scope) => (
                  <li key={scope} className="flex items-start gap-2">
                    <Checkbox
                      id={`scope-${scope}`}
                      checked={checked[scope] ?? false}
                      onCheckedChange={(v) => setChecked((c) => ({ ...c, [scope]: v === true }))}
                    />
                    <label htmlFor={`scope-${scope}`} className="text-sm leading-tight text-foreground">
                      {scopeLabel(scope)}
                    </label>
                  </li>
                ))}
              </ul>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" disabled={working || hasSession !== true} onClick={() => void submit(true)}>
                  {working ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('screens.oauthconsent.working')}
                    </>
                  ) : (
                    t('screens.oauthconsent.approve')
                  )}
                </Button>
                <Button className="flex-1" variant="outline" disabled={working} onClick={() => void submit(false)}>
                  {t('screens.oauthconsent.deny')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
