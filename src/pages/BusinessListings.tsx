/**
 * VTID-01975: Business Hub My Listings (P2-B).
 *
 * Provider-side commercial_sell listings management. Pro-role gated.
 * Reuses IntentCard for rendering and IntentComposer (defaulting to
 * commercial_sell) for the create flow.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { useIsReseller } from "@/hooks/useIsReseller";
import { listMyIntents, type UserIntent } from "@/lib/intentApi";
import { IntentCard } from "@/components/intents/IntentCard";
import { IntentComposer } from "@/components/intents/IntentComposer";
import { notifyError, t } from '@/lib/i18n-toast';

export default function BusinessListings() {
  const { toast } = useToast();
  const { isReseller } = useIsReseller();
  const [listings, setListings] = useState<UserIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await listMyIntents({ kind: "commercial_sell" });
      setListings(result);
    } catch (err: any) {
      notifyError('toasts.businesslistings.couldNotLoadListings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (!isReseller) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-4">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Business Hub
        </Link>
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Listings are available for Pro accounts.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
      <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Business Hub
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('screens.businesslistings.myListings')}</h1>
          <p className="text-sm text-muted-foreground">{t('screens.businesslistings.servicesProductsYouReOfferingMatches')}</p>
        </div>
        <Button size="sm" onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New listing
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No listings yet. Click <span className="font-medium">{t('screens.businesslistings.newListing')}</span> to add one — or open ORB and just say <em>{t('screens.businesslistings.iMOfferingX')}</em>.
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((intent) => (
            <IntentCard
              key={intent.intent_id}
              intent={intent}
              to={`/intents/match/${intent.intent_id}`}
            />
          ))}
        </div>
      )}

      <IntentComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        defaultKind="commercial_sell"
        onPosted={() => load()}
      />
    </div>
  );
}
