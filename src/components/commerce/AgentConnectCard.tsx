/**
 * The one thing this portal is about (VTID-03882): paste one address into your
 * own AI agent. Replaces the whole `/commerce/agent-connect` page — every
 * string here is an existing `screens.commerceportal.agentConnect.*` key.
 *
 * Honesty, not marketing: the pill and its detail say BOTH that the address is
 * not reachable yet (BLK-006) AND that the live server exposes read-only tools
 * today, so "create a business via your agent" is a promise with a date on it,
 * not a thing the merchant can do this minute. The manual path below the hero
 * is the one that works, which is why it was demoted rather than removed.
 */
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Copy, Sparkles } from 'lucide-react';
import { t, notify } from '@/lib/i18n-toast';
import { MCP_SERVER_URL } from '@/lib/commerce-host';

const HOSTS = [
  {
    id: 'claude',
    tab: 'screens.commerceportal.agentConnect.tabClaude',
    steps: [
      'screens.commerceportal.agentConnect.claudeStep1',
      'screens.commerceportal.agentConnect.claudeStep2',
      'screens.commerceportal.agentConnect.claudeStep3',
    ],
  },
  {
    id: 'chatgpt',
    tab: 'screens.commerceportal.agentConnect.tabChatgpt',
    steps: [
      'screens.commerceportal.agentConnect.chatgptStep1',
      'screens.commerceportal.agentConnect.chatgptStep2',
      'screens.commerceportal.agentConnect.chatgptStep3',
    ],
    note: 'screens.commerceportal.agentConnect.chatgptNote',
  },
  {
    id: 'gemini',
    tab: 'screens.commerceportal.agentConnect.tabGemini',
    steps: [
      'screens.commerceportal.agentConnect.geminiStep1',
      'screens.commerceportal.agentConnect.geminiStep2',
    ],
    note: 'screens.commerceportal.agentConnect.geminiNote',
  },
] as const;

export function AgentConnectCard() {
  const [copied, setCopied] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const reduce = useReducedMotion();

  const copyUrl = () => {
    void navigator.clipboard.writeText(MCP_SERVER_URL);
    setCopied(true);
    notify('screens.commerceportal.agentConnect.copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      {/* Breathing halo behind the card. Skipped entirely under
          prefers-reduced-motion rather than animated more slowly. */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-amber-500/10 blur-2xl"
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative rounded-3xl border border-amber-500/25 bg-slate-900/70 p-5 shadow-2xl backdrop-blur md:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            {t('screens.commerceportal.agentConnect.title')}
          </span>
          <button
            type="button"
            onClick={() => setDetailOpen((v) => !v)}
            aria-expanded={detailOpen}
            className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
          >
            {t('screens.commerceportal.agentStatusPill')}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {detailOpen && (
          <p className="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-400">
            {t('screens.commerceportal.agentStatusDetail')}
          </p>
        )}

        <p className="mt-4 text-base leading-relaxed text-slate-200 md:text-lg">
          {t('screens.commerceportal.agentPromise')}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code
            dir="ltr"
            className="min-w-0 flex-1 truncate rounded-xl border border-amber-500/25 bg-slate-950/80 px-4 py-3 text-start font-mono text-sm text-amber-200 md:text-base"
          >
            {MCP_SERVER_URL}
          </code>
          <Button
            type="button"
            onClick={copyUrl}
            className="h-12 shrink-0 rounded-xl bg-amber-500 px-5 font-semibold text-slate-950 hover:bg-amber-400"
          >
            {copied ? <Check className="me-2 h-4 w-4" /> : <Copy className="me-2 h-4 w-4" />}
            {copied
              ? t('screens.commerceportal.agentConnect.copied')
              : t('screens.commerceportal.agentConnect.copyUrl')}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t('screens.commerceportal.agentUrlHint')}</p>

        <Tabs defaultValue="claude" className="mt-6">
          <TabsList className="w-full justify-start gap-1 bg-slate-950/70 p-1">
            {HOSTS.map((h) => (
              <TabsTrigger
                key={h.id}
                value={h.id}
                className="rounded-lg px-4 text-slate-400 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-200"
              >
                {t(h.tab)}
              </TabsTrigger>
            ))}
          </TabsList>
          {HOSTS.map((h) => (
            <TabsContent key={h.id} value={h.id} className="mt-4">
              <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-slate-300 marker:text-amber-500/70">
                {h.steps.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ol>
              {'note' in h && h.note && <p className="mt-3 text-xs text-slate-500">{t(h.note)}</p>}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
