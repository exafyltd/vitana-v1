/**
 * E1 — Marketplace screen at /discover/marketplace.
 *
 * Discover-side counterpart to /comm/find-partner. Scoped to commercial
 * intents (commercial_buy + commercial_sell) and the read-only affiliate
 * products catalog (deferred — text placeholder in v1).
 *
 * Single page, two sub-views switched via ?view=:
 *   - "open"  → all open commercial intents (default)
 *   - "mine"  → only my commercial intents
 *
 * Click any card → /intents/match/:id (existing detail screen).
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { IntentCard } from "@/components/intents/IntentCard";
import { IntentComposer } from "@/components/intents/IntentComposer";
import {
  listMyIntents,
  getIntentBoard,
  type UserIntent,
  type IntentKind,
} from "@/lib/intentApi";
import { t } from '@/lib/i18n-toast';

type View = "open" | "mine";

const VIEW_OPTIONS: { value: View; icon: string; labelKey: string }[] = [
  { value: "open",  icon: "🛒", labelKey: "screens.discover.marketplaceView_open" },
  { value: "mine",  icon: "📝", labelKey: "screens.discover.marketplaceView_mine" },
];

const COMMERCIAL_KINDS: IntentKind[] = ["commercial_buy", "commercial_sell"];

function viewMeta(v: View) {
  return VIEW_OPTIONS.find((o) => o.value === v) ?? VIEW_OPTIONS[0];
}

export default function Marketplace() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = (searchParams.get("view") as View) || "open";
  const [view, setView] = useState<View>(initialView);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [openItems, setOpenItems] = useState<UserIntent[]>([]);
  const [myItems, setMyItems] = useState<UserIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = searchParams.get("view");
    if (current !== view) {
      const next = new URLSearchParams(searchParams);
      next.set("view", view);
      setSearchParams(next, { replace: true });
    }
  }, [view, searchParams, setSearchParams]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "open") {
        // Fetch both buy + sell separately and merge — getIntentBoard takes a single kind.
        const [buy, sell] = await Promise.all([
          getIntentBoard({ kind: "commercial_buy", limit: 30 }),
          getIntentBoard({ kind: "commercial_sell", limit: 30 }),
        ]);
        const merged = [...(buy.intents ?? []), ...(sell.intents ?? [])]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOpenItems(merged);
      } else {
        const all = await listMyIntents({ status: "open" });
        setMyItems(all.filter((it) => COMMERCIAL_KINDS.includes(it.intent_kind)));
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not load.");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { void refresh(); }, [refresh]);

  const active = viewMeta(view);
  const filterLabel = `${active.icon} ${t(active.labelKey)}`;

  return (
    <>
      <SEO title={t('screens.discover.marketplaceVitana')} description="Discover and post things to buy or sell in the Vitana community." />

      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <StandardHeader
          title={t('screens.discover.marketplace')}
          description="Buy and sell with the Vitana community."
        />

        <UtilityActionButton className="min-w-0" compact={isMobile}>
          <div className="flex items-center gap-2 min-w-max">
            <ExpandableSearchButton
              placeholder={t('screens.discover.searchMarketplace')}
              onSearch={() => { /* per-view search wiring — defer */ }}
              filterLabel={filterLabel}
              onFilterClick={() => setPickerOpen(true)}
            />
            <Button
              onClick={() => setComposerOpen(true)}
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">{t('screens.discover.post')}</span>
            </Button>
          </div>
        </UtilityActionButton>

        {!isMobile && (
          <SplitBar value={view} onValueChange={(v) => setView(v as View)} className="w-full mt-2">
            <SplitBarList>
              {VIEW_OPTIONS.map((o) => (
                <SplitBarTrigger key={o.value} value={o.value}>
                  {o.icon} {t(o.labelKey)}
                </SplitBarTrigger>
              ))}
            </SplitBarList>
          </SplitBar>
        )}

        <div className="mt-4">
          {loading && (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="text-sm text-destructive py-4">{t('screens.discover.couldnTLoadError', { error })}</div>
          )}

          {!loading && !error && view === "open" && (
            openItems.length === 0 ? (
              <EmptyState
                title={t('screens.discover.marketplaceQuiet')}
                body={t('screens.discover.marketplaceEmpty_body')}
                cta={{ label: t('screens.discover.marketplaceEmpty_cta'), onClick: () => setComposerOpen(true) }}
              />
            ) : (
              <div className="space-y-3">
                {openItems.map((it) => <IntentCard key={it.intent_id} intent={it} />)}
              </div>
            )
          )}

          {!loading && !error && view === "mine" && (
            myItems.length === 0 ? (
              <EmptyState
                title={t('screens.discover.noListingsYet')}
                body="Post a buy or sell request — the matchmaker will surface buyers/sellers."
                cta={{ label: "New listing", onClick: () => setComposerOpen(true) }}
              />
            ) : (
              <div className="space-y-3">
                {myItems.map((it) => (
                  <IntentCard key={it.intent_id} intent={it} to={`/intents/match/${it.intent_id}`} />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{t('screens.discover.chooseView')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 mt-4 pb-6">
            {VIEW_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { setView(o.value); setPickerOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  view === o.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                }`}
              >
                <span className="text-xl">{o.icon}</span>
                <span className="font-medium">{t(o.labelKey)}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <IntentComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPosted={() => { setComposerOpen(false); void refresh(); }}
        defaultKind="commercial_sell"
      />
    </>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}

function EmptyState({ title, body, cta }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="flex flex-col items-center">
        <ShoppingBag className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-5">{body}</p>
        {cta && <Button onClick={cta.onClick}>{cta.label}</Button>}
      </div>
    </div>
  );
}
