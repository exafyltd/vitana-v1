/**
 * VTID-04848 — "Connect your AI agent": the preferred way to onboard.
 *
 * One step for the supplier: copy the Vitanaland MCP address into their own
 * AI assistant. Everything after that (registering the business, adding
 * products, the remaining setup) the assistant does through the gateway's
 * Commerce MCP tools (gateway VTID-04847), signed in as the supplier.
 *
 * The address and its Copy button are the only loud elements. Which
 * assistants work is one quiet line; the per-assistant clicks sit under
 * "Need help connecting?"; transport/auth/tool detail sits under "Advanced".
 * Manual registration stays available below as the fallback, never equal
 * weight.
 */
import { useState } from 'react';
import { Check, ChevronDown, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { t, notify } from '@/lib/i18n-toast';
import { COMMERCE_MCP_METADATA_URL, COMMERCE_MCP_TOOL_NAMES, COMMERCE_MCP_URL, SUPPORTED_ASSISTANTS } from '@/lib/commerce-mcp';

const K = 'screens.commerceportal.mcpConnect';

const HELP = [
  { id: 'claude', label: 'Claude', steps: [`${K}.claudeStep1`, `${K}.claudeStep2`, `${K}.claudeStep3`] },
  { id: 'chatgpt', label: 'ChatGPT', steps: [`${K}.chatgptStep1`, `${K}.chatgptStep2`, `${K}.chatgptStep3`] },
  { id: 'gemini', label: 'Gemini', steps: [`${K}.geminiStep1`, `${K}.geminiStep2`], note: `${K}.geminiNote` },
] as const;

interface McpConnectPanelProps {
  /** Opens manual registration — the fallback path. */
  onRegisterManually?: () => void;
}

export function McpConnectPanel({ onRegisterManually }: McpConnectPanelProps) {
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMERCE_MCP_URL);
      setCopied(true);
      notify(`${K}.copied`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions, insecure context): the address is
      // selectable text right above the button, so nothing is lost.
      notify(`${K}.copyBlocked`);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-200 bg-card p-5 shadow-xl shadow-amber-900/5 md:p-7" data-testid="mcp-connect-panel">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
        <Sparkles className="h-3.5 w-3.5" />
        {t(`${K}.badge`)}
      </span>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-foreground md:text-xl">{t(`${K}.title`)}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground md:text-base">{t(`${K}.lead`)}</p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code
          dir="ltr"
          data-testid="mcp-address"
          className="min-w-0 flex-1 select-all break-all rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-start font-mono text-sm text-amber-900 md:text-base"
        >
          {COMMERCE_MCP_URL}
        </code>
        <Button
          type="button"
          onClick={() => void copy()}
          data-testid="mcp-copy"
          className="h-12 shrink-0 rounded-xl bg-amber-700 px-5 font-semibold text-white shadow-sm hover:bg-amber-800"
        >
          {copied ? <Check className="me-2 h-4 w-4" /> : <Copy className="me-2 h-4 w-4" />}
          {copied ? t(`${K}.copied`) : t(`${K}.copy`)}
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {t(`${K}.worksWith`)}{' '}
        <span className="font-medium text-foreground" dir="ltr">
          {SUPPORTED_ASSISTANTS.join(' · ')}
        </span>
      </p>
      <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">{t(`${K}.thenSay`)}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(`${K}.confirmNote`)}</p>

      <button
        type="button"
        onClick={() => setHelpOpen((v) => !v)}
        aria-expanded={helpOpen}
        data-testid="mcp-help"
        className="mt-5 flex min-h-11 w-full items-center justify-between border-t border-border pt-3 text-start text-sm font-semibold text-foreground"
      >
        {t(`${K}.help`)}
        <ChevronDown className={`h-4 w-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
      </button>
      {helpOpen && (
        <Tabs defaultValue="claude" className="mt-2">
          <TabsList className="w-full justify-start gap-1 bg-muted p-1">
            {HELP.map((h) => (
              <TabsTrigger
                key={h.id}
                value={h.id}
                className="rounded-lg px-4 text-muted-foreground data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"
              >
                <span dir="ltr">{h.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {HELP.map((h) => (
            <TabsContent key={h.id} value={h.id} className="mt-4">
              <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-muted-foreground marker:text-amber-700/70">
                {h.steps.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ol>
              {'note' in h && <p className="mt-3 text-xs text-muted-foreground">{t(h.note)}</p>}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        aria-expanded={advancedOpen}
        data-testid="mcp-advanced"
        className="mt-2 flex min-h-11 w-full items-center justify-between text-start text-sm font-semibold text-foreground"
      >
        {t(`${K}.advanced`)}
        <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
      </button>
      {advancedOpen && (
        <dl className="mt-1 grid gap-x-4 gap-y-2 rounded-xl border border-border p-4 text-xs sm:grid-cols-[auto_1fr]">
          <dt className="font-medium text-foreground">{t(`${K}.advEndpoint`)}</dt>
          <dd className="break-all font-mono text-muted-foreground" dir="ltr">{COMMERCE_MCP_URL}</dd>
          <dt className="font-medium text-foreground">{t(`${K}.advTransport`)}</dt>
          <dd className="text-muted-foreground">{t(`${K}.advTransportValue`)}</dd>
          <dt className="font-medium text-foreground">{t(`${K}.advAuth`)}</dt>
          <dd className="text-muted-foreground">{t(`${K}.advAuthValue`)}</dd>
          <dt className="font-medium text-foreground">{t(`${K}.advMetadata`)}</dt>
          <dd className="break-all font-mono text-muted-foreground" dir="ltr">{COMMERCE_MCP_METADATA_URL}</dd>
          <dt className="font-medium text-foreground">{t(`${K}.advTools`)}</dt>
          <dd className="break-words font-mono text-muted-foreground" dir="ltr">{COMMERCE_MCP_TOOL_NAMES.join(', ')}</dd>
        </dl>
      )}

      {onRegisterManually && (
        <div className="mt-4 border-t border-border pt-4 text-center">
          <Button
            type="button"
            variant="ghost"
            onClick={onRegisterManually}
            data-testid="mcp-register-manually"
            className="min-h-11 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            {t(`${K}.manualFallback`)}
          </Button>
        </div>
      )}
    </div>
  );
}
