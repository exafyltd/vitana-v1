/**
 * VTID-01975: Intent match detail page (P2-B).
 *
 * Drill-down view for a single intent. Shows the intent itself + its
 * top matches with action buttons. Used as the deeplink target from
 * push notifications.
 */

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { getIntent, getIntentMatches, getIncomingMatches, getOutgoingMatches, closeIntent, type UserIntent, type IntentMatch } from "@/lib/intentApi";
import { IntentCard } from "@/components/intents/IntentCard";
import { IntentMatchCard } from "@/components/intents/IntentMatchCard";
import { notify, notifyError, t } from '@/lib/i18n-toast';

export default function IntentMatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [intent, setIntent] = useState<UserIntent | null>(null);
  const [matches, setMatches] = useState<IntentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      let resolvedIntentId = id;
      let intentData: UserIntent | null = null;
      try {
        intentData = await getIntent(resolvedIntentId);
      } catch {
        // VTID-02864: if :id wasn't an intent_id, it might be a match_id —
        // some voice navigation paths historically passed match_id (per the
        // INTENTS.MATCH_DETAIL voice-tool description). Resolve it via
        // incoming/outgoing matches and redirect to the user's owning intent.
        const [incoming, outgoing] = await Promise.all([
          getIncomingMatches(200).catch(() => []),
          getOutgoingMatches(200).catch(() => []),
        ]);
        const matchRow =
          incoming.find((m) => m.match_id === id) ??
          outgoing.find((m) => m.match_id === id);
        if (matchRow) {
          // Try whichever side resolves to an intent we can fetch.
          const candidates = [matchRow.intent_a_id, matchRow.intent_b_id].filter(
            (x): x is string => typeof x === 'string' && x.length > 0,
          );
          for (const candidate of candidates) {
            try {
              intentData = await getIntent(candidate);
              resolvedIntentId = candidate;
              navigate(`/intents/match/${candidate}`, { replace: true });
              break;
            } catch {
              /* try the other side */
            }
          }
        }
        if (!intentData) {
          notifyError('toasts.intentmatchdetail.couldNotLoadMatchDetail');
          return;
        }
      }
      const matchesData = await getIntentMatches(resolvedIntentId, 10);
      setIntent(intentData);
      setMatches(matchesData);
    } catch {
      notifyError('toasts.intentmatchdetail.couldNotLoadMatchDetail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const handleClose = async () => {
    if (!id || !intent) return;
    try {
      await closeIntent(id);
      notify('toasts.intentmatchdetail.intentClosed');
      // VTID-02719: jump straight to /intents/mine so the user sees the freed slot.
      navigate("/intents/mine", { replace: true });
    } catch (err: any) {
      notifyError('toasts.intentmatchdetail.couldNotClose');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-4">
        <Link to="/intents/mine" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('screens.intentmatchdetail.backMyIntents')}
        </Link>
        <p className="text-muted-foreground">{t('screens.intentmatchdetail.intentNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
      <Link to="/intents/mine" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('screens.intentmatchdetail.backMyIntents')}
      </Link>

      <IntentCard intent={intent} />

      {intent.status === "open" && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose}>
            <X className="h-4 w-4 mr-1" /> {t('screens.intentmatchdetail.closeIntent')}
          </Button>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">{t('screens.intentmatchdetail.matchesLength', { length: matches.length })}
        </h2>
        {matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t('screens.intentmatchdetail.noMatchesYetWeLlKeep')}
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <IntentMatchCard
                key={match.match_id}
                match={match}
                perspective="outgoing"
                onAction={() => load()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
