/**
 * VTID-02403: AI Assistant Connect Modal (ChatGPT / Claude) — Phase 1
 *
 * Paste-an-API-key modal. On submit:
 *   1. POST /apikey/:provider (encrypt + store)
 *   2. POST /verify/:provider (live check)
 *   3. Show result; on success, close + invalidate providers query.
 *
 * Security: The key is sent once to gateway over TLS; gateway encrypts with
 * AES-256-GCM (env key) and NEVER echoes it back. This component only displays
 * key_prefix + key_last4 on the success screen.
 */

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Shield, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useConnectAIProvider,
  useVerifyAIProvider,
  type AIProviderId,
} from "@/hooks/useAIAssistants";
import { t } from '@/lib/i18n-toast';

const PROVIDER_META: Record<
  AIProviderId,
  { display_name: string; key_url: string; key_url_label: string; placeholder: string; prefix: string }
> = {
  chatgpt: {
    display_name: "ChatGPT",
    key_url: "https://platform.openai.com/api-keys",
    key_url_label: "platform.openai.com/api-keys",
    placeholder: "sk-…",
    prefix: "sk-",
  },
  claude: {
    display_name: "Claude",
    key_url: "https://console.anthropic.com/settings/keys",
    key_url_label: "console.anthropic.com/settings/keys",
    placeholder: "sk-ant-…",
    prefix: "sk-ant-",
  },
};

interface AIAssistantConnectModalProps {
  open: boolean;
  provider: AIProviderId | null;
  onClose: () => void;
}

export function AIAssistantConnectModal({ open, provider, onClose }: AIAssistantConnectModalProps) {
  const isMobile = useIsMobile();
  const [apiKey, setApiKey] = useState("");
  const [phase, setPhase] = useState<"input" | "connecting" | "verifying" | "success" | "error">("input");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ last4: string; latency_ms: number } | null>(null);

  const connectMut = useConnectAIProvider();
  const verifyMut = useVerifyAIProvider();

  if (!provider) return null;
  const meta = PROVIDER_META[provider];

  const reset = () => {
    setApiKey("");
    setPhase("input");
    setErrorMsg(null);
    setVerifyResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setErrorMsg("Please paste your API key.");
      return;
    }
    if (!apiKey.startsWith(meta.prefix)) {
      setErrorMsg(`API key must start with "${meta.prefix}".`);
      return;
    }
    setErrorMsg(null);
    setPhase("connecting");
    try {
      const connectRes = await connectMut.mutateAsync({ provider, api_key: apiKey.trim() });
      setPhase("verifying");
      const verifyRes = await verifyMut.mutateAsync({ provider });
      if (verifyRes.status === "ok") {
        setVerifyResult({ last4: connectRes.key_last4, latency_ms: verifyRes.latency_ms });
        setPhase("success");
      } else {
        setErrorMsg(
          verifyRes.status === "unauthorized"
            ? "The provider rejected this key (unauthorized). Double-check it in your dashboard."
            : verifyRes.status === "network"
              ? "Network error reaching the provider. Please try again."
              : verifyRes.error || `Verification failed (${verifyRes.status}).`
        );
        setPhase("error");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setPhase("error");
    }
  };

  const busy = phase === "connecting" || phase === "verifying";

  const content = (
    <div className="space-y-4">
      {phase === "success" && verifyResult ? (
        <div className="space-y-3">
          <Alert variant="default" className="border-emerald-500/40 bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-sm">
              <strong>{meta.display_name}</strong> connected and verified.
              <div className="mt-1 text-xs text-muted-foreground">
                {t('screens.common.key')} <code>{meta.prefix}•••{verifyResult.last4}</code> — verified in {verifyResult.latency_ms}ms.
              </div>
            </AlertDescription>
          </Alert>
          <Button className="w-full" onClick={handleClose}>{t('screens.common.done')}</Button>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Paste a {meta.display_name} API key. We store it encrypted (AES-256-GCM) and
              never expose it again — only the last 4 characters are visible after verification.
            </p>
            <a
              href={meta.key_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Get your API key at {meta.key_url_label}
            </a>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ai-key-input">{t('screens.common.apiKey')}</Label>
            <Input
              id="ai-key-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={meta.placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={busy}
            />
          </div>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>{t('screens.common.encryptedTransitTlsAtRestAes256gcm')}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={busy} className="flex-1">
              {t('screens.common.cancel')}
            </Button>
            <Button onClick={handleConnect} disabled={busy || !apiKey} className="flex-1">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {phase === "connecting"
                ? "Saving…"
                : phase === "verifying"
                  ? "Verifying…"
                  : "Connect"}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left">{t('screens.common.connectDisplay_name', { display_name: meta.display_name })}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('screens.common.connectDisplay_name', { display_name: meta.display_name })}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
