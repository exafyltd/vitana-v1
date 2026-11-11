/**
 * VTID-05207 — inline "Say Hello 👋" greeting composer.
 *
 * Opened from NewMemberCard. It fetches a greeting SUGGESTION from the gateway
 * (POST /api/v1/community/new-member/:userId/greeting-suggestion), prefills an
 * editable field with it, and lets the sender:
 *   - edit the text,
 *   - ask for a different suggestion ("Try another" — previously seen ones are
 *     passed as `avoid` so it varies and never repeats within the session),
 *   - see which language the suggestion is in ("in {language}"),
 *   - and on an explicit Send deliver ONE private DM to the newcomer via
 *     POST /api/v1/chat/send with content_data.source = 'new_member_greeting'.
 *
 * Owner decision D2=b: the greeting is a PRIVATE DM on explicit Send — never a
 * public comment and never auto-sent. Pressing "Say Hello" on the card alone
 * only opens this composer; nothing is sent until Send is pressed here.
 *
 * The Send control is disabled while a submit is in flight (no double submit).
 * On success the composer collapses and the card is hidden for this sender in
 * the current session (fetchGreetedMemberIds already hides it on next load).
 * A server refusal from the greeting guard surfaces one non-alarming message
 * and is never retried automatically.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GATEWAY_BASE } from "@/lib/gateway-base";
import { getI18nLocale, notify, notifyError, t } from "@/lib/i18n-toast";

/**
 * The gateway suggestion route returns a short locale code (e.g. 'de' / 'en').
 * A bare code ("in en" / "auf de") is not clear to a non-technical member, so
 * map it to a localized language NAME in the sender's current UI locale (e.g.
 * "Englisch" when the UI is German). Fail safe: if Intl.DisplayNames is
 * unavailable or the code is unknown, fall back to the raw code so the
 * affordance never throws and never goes blank.
 */
function languageNameFor(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return code;
  try {
    const display = new Intl.DisplayNames([getI18nLocale()], { type: "language" });
    return display.of(trimmed) || trimmed;
  } catch {
    return trimmed;
  }
}

export interface NewMemberGreetingComposerProps {
  /** The newcomer the greeting is addressed to. */
  userId: string;
  /** Called after a greeting was successfully sent (card hides for this sender). */
  onSent?: () => void;
  /** Called when the sender dismisses the composer without sending. */
  onCancel?: () => void;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface SuggestionResponse {
  ok?: boolean;
  suggestion?: string;
  language?: string;
}

export function NewMemberGreetingComposer({
  userId,
  onSent,
  onCancel,
}: NewMemberGreetingComposerProps) {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(true);
  const [sending, setSending] = useState(false);
  // Every suggestion the sender has already been offered this session, so
  // "Try another" never repeats one of them.
  const seen = useRef<string[]>([]);

  const requestSuggestion = useCallback(async () => {
    setLoadingSuggestion(true);
    try {
      const headers = await authHeaders();
      const resp = await fetch(
        `${GATEWAY_BASE}/api/v1/community/new-member/${userId}/greeting-suggestion`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ avoid: seen.current }),
        },
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = (await resp.json()) as SuggestionResponse;
      const suggestion = (json.suggestion || "").trim();
      if (!json.ok || !suggestion) throw new Error("no suggestion");
      seen.current = [...seen.current, suggestion];
      setText(suggestion);
      if (json.language) setLanguage(json.language);
    } catch {
      notifyError("newsCard.greeting.suggestionFailed");
    } finally {
      setLoadingSuggestion(false);
    }
  }, [userId]);

  useEffect(() => {
    void requestSuggestion();
  }, [requestSuggestion]);

  const handleSend = useCallback(async () => {
    if (sending) return;
    const content = text.trim();
    if (!content) {
      notifyError("newsCard.greeting.emptyGreeting");
      return;
    }
    setSending(true);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_BASE}/api/v1/chat/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          receiver_id: userId,
          content,
          message_type: "text",
          content_data: { source: "new_member_greeting" },
        }),
      });
      if (resp.status === 403) {
        // The greeting guard declined this send. One calm message, no retry.
        notify("newsCard.greeting.notAllowed");
        return;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      notify("newsCard.greeting.sentToast", "newsCard.greeting.sentToastDesc");
      onSent?.();
    } catch {
      notifyError("newsCard.greeting.sendFailed");
    } finally {
      setSending(false);
    }
  }, [sending, text, userId, onSent]);

  return (
    <div
      className="mt-4 rounded-2xl border border-sys-member-card-border bg-sys-member-tint/40 p-3"
      data-testid="new-member-greeting-composer"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor="new-member-greeting-field"
          className="text-sm font-semibold text-sys-member-accent"
        >
          {t("newsCard.greeting.fieldLabel")}
        </label>
        {language && (
          <span
            className="text-xs text-muted-foreground"
            data-testid="greeting-language"
          >
            {t("newsCard.greeting.inLanguage", { language: languageNameFor(language) })}
          </span>
        )}
      </div>

      <Textarea
        id="new-member-greeting-field"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("newsCard.greeting.placeholder")}
        disabled={loadingSuggestion || sending}
        rows={2}
        className="mt-2 resize-none text-start"
        data-testid="greeting-text"
      />

      {loadingSuggestion && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {t("newsCard.greeting.loadingSuggestion")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          className="gap-2 rounded-full bg-category-2/40 text-category-2 hover:bg-category-2/80 font-semibold shadow-sm"
          onClick={handleSend}
          disabled={sending || loadingSuggestion}
          data-testid="greeting-send"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {sending ? t("newsCard.greeting.sending") : t("newsCard.greeting.send")}
        </Button>
        <Button
          variant="outline"
          className="gap-2 rounded-full border-[1.5px] border-sys-member-accent bg-card text-sys-member-accent hover:bg-sys-member-tint dark:bg-sys-member-card"
          onClick={() => void requestSuggestion()}
          disabled={sending || loadingSuggestion}
          data-testid="greeting-try-another"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t("newsCard.greeting.tryAnother")}
        </Button>
        <Button
          variant="ghost"
          className="rounded-full text-muted-foreground"
          onClick={() => onCancel?.()}
          disabled={sending}
          data-testid="greeting-cancel"
        >
          {t("newsCard.greeting.cancel")}
        </Button>
      </div>
    </div>
  );
}
