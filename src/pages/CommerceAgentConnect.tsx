/**
 * Commerce Portal — "Connect via AI Agent" (VTID-03600, Track 1 of the
 * merchant-onboarding-mesh follow-up). Lets a merchant point their own
 * Claude / ChatGPT / Gemini agent at the Vitanaland MCP server instead of
 * clicking through the manual connection form on /commerce/connections.
 *
 * No host (Claude, ChatGPT, or Gemini) documents a URL-based one-click
 * "pre-fill the add-connector dialog" deep link as of 2026-08 — verified
 * against each host's own docs before writing this screen, per the
 * never-guess-a-URL rule. All three require the merchant to paste the MCP
 * server URL manually; this screen exists to make that copy-paste (and the
 * few clicks around it) as short as possible, not to fake a one-click flow
 * that doesn't exist yet.
 *
 * Also honest about BLK-006: mcp.vitanaland.com has no DNS/public exposure
 * yet (vitana-platform vcaop/BLOCKERS.md), so the URL below is real but not
 * reachable from outside this session's environment until that ships.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Copy, Check, ArrowLeft, Info } from 'lucide-react';
import { t, notify } from '@/lib/i18n-toast';

const MCP_SERVER_URL = ((import.meta.env.VITE_MCP_AS_URL as string | undefined) || 'https://mcp.vitanaland.com').replace(
  /\/$/,
  '',
);

function AgentSteps({ titleKey, steps, noteKey }: { titleKey: string; steps: string[]; noteKey?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t(titleKey)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
          {steps.map((stepKey) => (
            <li key={stepKey}>{t(stepKey)}</li>
          ))}
        </ol>
        {noteKey && <p className="pt-1 text-xs text-muted-foreground">{t(noteKey)}</p>}
      </CardContent>
    </Card>
  );
}

export default function CommerceAgentConnect() {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    void navigator.clipboard.writeText(MCP_SERVER_URL);
    setCopied(true);
    notify('screens.commerceportal.agentConnect.copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <Link
        to="/commerce/connections"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('screens.commerceportal.agentConnect.back')}
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">{t('screens.commerceportal.agentConnect.title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t('screens.commerceportal.agentConnect.subtitle')}</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t('screens.commerceportal.agentConnect.notReachableYet')}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('screens.commerceportal.agentConnect.mcpUrlLabel')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 text-sm">
              {MCP_SERVER_URL}
            </code>
            <Button type="button" variant="outline" size="icon" onClick={copyUrl} aria-label={t('screens.commerceportal.agentConnect.copyUrl')}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AgentSteps
        titleKey="screens.commerceportal.agentConnect.claudeTitle"
        steps={[
          'screens.commerceportal.agentConnect.claudeStep1',
          'screens.commerceportal.agentConnect.claudeStep2',
          'screens.commerceportal.agentConnect.claudeStep3',
        ]}
      />

      <AgentSteps
        titleKey="screens.commerceportal.agentConnect.chatgptTitle"
        steps={[
          'screens.commerceportal.agentConnect.chatgptStep1',
          'screens.commerceportal.agentConnect.chatgptStep2',
          'screens.commerceportal.agentConnect.chatgptStep3',
        ]}
        noteKey="screens.commerceportal.agentConnect.chatgptNote"
      />

      <AgentSteps
        titleKey="screens.commerceportal.agentConnect.geminiTitle"
        steps={['screens.commerceportal.agentConnect.geminiStep1', 'screens.commerceportal.agentConnect.geminiStep2']}
        noteKey="screens.commerceportal.agentConnect.geminiNote"
      />
    </div>
  );
}
