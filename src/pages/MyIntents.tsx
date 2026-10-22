/**
 * VTID-01975: My intents page (P2-B).
 *
 * Lists the user's open intents grouped by kind. Each intent shows
 * match count + a "View matches" link → IntentMatchDetail.
 */

const PER_KIND_SLOT_CAP = 20; // VTID-02719: must mirror MATURE_MAX_OPEN_PER_KIND in gateway intent-throttle.ts

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { listMyIntents, type UserIntent, type IntentKind } from "@/lib/intentApi";
import { IntentCard } from "@/components/intents/IntentCard";
import { IntentComposer } from "@/components/intents/IntentComposer";
import { notifyError, t } from '@/lib/i18n-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import AppLayout from "@/components/AppLayout";
import { ScreenFrame, SpotlightLoading } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { TierBEmpty, TierBListSkeleton } from "@/components/spotlight/tier-b/TierBKit";

const KIND_TABS: { value: IntentKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "commercial_buy", label: "Buying" },
  { value: "commercial_sell", label: "Selling" },
  { value: "activity_seek", label: "Activities" },
  { value: "partner_seek", label: "Partner" },
  { value: "social_seek", label: "Social" },
  { value: "mutual_aid", label: "Mutual aid" },
];

// VTID-05111 — translated chip labels for the Spotlight branch (the legacy chips keep their English labels).
const SPOTLIGHT_KIND_LABEL_KEYS: Partial<Record<IntentKind | "all", string>> = {
  all: "screens.intents.kindFilter_all",
  commercial_buy: "screens.intents.kindFilter_commercialBuy",
  commercial_sell: "screens.intents.kindFilter_commercialSell",
  activity_seek: "screens.intents.kindFilter_activitySeek",
  partner_seek: "spotlightTierB.intents.kindPartner",
  social_seek: "screens.intents.kindFilter_socialSeek",
  mutual_aid: "screens.intents.kindFilter_mutualAid",
};

export default function MyIntents() {
  const isMobile = useIsMobile();
  const spotlight = useSpotlightEnabled();
  const { toast } = useToast();
  const [intents, setIntents] = useState<UserIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<IntentKind | "all">("all");
  const [composerOpen, setComposerOpen] = useState(false);

  // VTID-02719: always filter to open so a closed intent disappears from the
  // list as soon as the user returns from the detail page.
  const load = async () => {
    setLoading(true);
    try {
      const filters: { kind?: IntentKind; status?: string } = { status: "open" };
      if (tab !== "all") filters.kind = tab;
      const result = await listMyIntents(filters);
      setIntents(result);
    } catch (err: any) {
      notifyError('toasts.myintents.couldNotLoadIntents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMobile) return;
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tab, isMobile]);

  // Mobile users get the mobile-styled Find a Match → My Posts view.
  if (isMobile) {
    return <Navigate to="/comm/find-partner?view=posts" replace />;
  }

  // VTID-05111 — Spotlight Tier B (desktop + flag only; phones redirect above, flag-off keeps the screen below).
  // The legacy desktop page renders without AppLayout; the Spotlight frame puts it inside the app shell.
  if (spotlight) {
    const chip = (active: boolean) =>
      `rounded-full border px-3 py-1 text-sm transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
      }`;
    const kindLabel = (value: IntentKind | "all") => t(SPOTLIGHT_KIND_LABEL_KEYS[value] ?? "screens.intents.kindFilter_all");
    return (
      <AppLayout>
        <ScreenFrame
          archetype="collection"
          header={{ title: t('screens.myintents.myIntents'), description: t('screens.myintents.yourOpenRequestsListingsPartnerSearches'), emoji: '📌' }}
          utility={{
            children: (
              <Button onClick={() => setComposerOpen(true)} size="sm">
                <Plus className="me-1 h-4 w-4" /> {t('screens.myintents.new')}
              </Button>
            ),
          }}
        >
          <div className="flex flex-col gap-4">
            {!loading && (
              <p className="text-xs text-muted-foreground">
                {tab === "all"
                  ? t('screens.myintents.lengthOpenUpPer_kind_slot_capPerCategory', { length: intents.length, PER_KIND_SLOT_CAP })
                  : t('screens.myintents.lengthPer_kind_slot_capSlotsUsed', { length: intents.length, PER_KIND_SLOT_CAP })}
                {tab !== "all" && intents.length >= PER_KIND_SLOT_CAP && (
                  <span className="ms-2 text-status-warning">
                    {t('screens.myintents.capReachedCloseOnePostNew')} {kindLabel(tab)}
                  </span>
                )}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('spotlightTierB.intents.filtersAria')}>
              {KIND_TABS.map((k) => (
                <button key={k.value} type="button" aria-pressed={tab === k.value} onClick={() => setTab(k.value)} className={chip(tab === k.value)}>
                  {kindLabel(k.value)}
                </button>
              ))}
            </div>
            {loading ? (
              <TierBListSkeleton size="row" count={4} />
            ) : intents.length === 0 ? (
              <TierBEmpty titleKey="screens.myintents.noIntentsThisView" actionKey="screens.myintents.new" onAction={() => setComposerOpen(true)} />
            ) : (
              <div className="flex flex-col gap-3">
                {intents.map((intent) => (
                  <IntentCard key={intent.intent_id} intent={intent} to={`/intents/match/${intent.intent_id}`} variant="my-posts" />
                ))}
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {t('screens.myintents.browseWhatOthersLookingFor')} <Link to="/intents/board" className="underline">{t('screens.myintents.communityBoard')}</Link>
            </p>
          </div>
        </ScreenFrame>
        <IntentComposer open={composerOpen} onOpenChange={setComposerOpen} onPosted={() => load()} />
      </AppLayout>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('screens.myintents.myIntents')}</h1>
          <p className="text-sm text-muted-foreground">{t('screens.myintents.yourOpenRequestsListingsPartnerSearches')}</p>
          {!loading && (
            tab === "all" ? (
              <p className="text-xs text-muted-foreground mt-1">{t('screens.myintents.lengthOpenUpPer_kind_slot_capPerCategory', { length: intents.length, PER_KIND_SLOT_CAP })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">{t('screens.myintents.lengthPer_kind_slot_capSlotsUsed', { length: intents.length, PER_KIND_SLOT_CAP })}
                {intents.length >= PER_KIND_SLOT_CAP && (
                  <span className="ms-2 text-status-warning">{t('screens.myintents.capReachedCloseOnePostNew')} {KIND_TABS.find(k => k.value === tab)?.label.toLowerCase()}</span>
                )}
              </p>
            )
          )}
        </div>
        <Button onClick={() => setComposerOpen(true)} size="sm">
          <Plus className="h-4 w-4 me-1" /> {t('screens.myintents.new')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KIND_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              tab === t.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SpotlightLoading rows={4} />
      ) : intents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          {t('screens.myintents.noIntentsThisView')}
        </div>
      ) : (
        <SpotlightLoading loading={false}>
          <div className="space-y-3">
            {intents.map((intent) => (
              <IntentCard
                key={intent.intent_id}
                intent={intent}
                to={`/intents/match/${intent.intent_id}`}
                variant="my-posts"
              />
            ))}
          </div>
        </SpotlightLoading>
      )}

      <IntentComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPosted={() => load()}
      />

      <p className="text-xs text-muted-foreground text-center">
        {t('screens.myintents.browseWhatOthersLookingFor')} <Link to="/intents/board" className="underline">{t('screens.myintents.communityBoard')}</Link>
      </p>
    </div>
  );
}
