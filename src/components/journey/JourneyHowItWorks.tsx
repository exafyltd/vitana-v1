/**
 * First-time "how it works" explainer for My Longevity Journey (Guided Mode).
 *
 * Sits between the next-session hero card and the session catalog. Two blocks
 * (per the onboarding design): a white "So funktioniert's" card explaining the
 * guided journey vs. the session catalog, and a violet "Klicke die Sitzung"
 * card telling first-time users that tapping a session makes Vitana explain it.
 * Pure presentational — all copy comes from the i18n catalog.
 */

import { BookOpen, Heart, MousePointerClick, Search, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n-toast";

export function JourneyHowItWorks({ className }: { className?: string }) {
  // First-time users often don't realise the session list is further down the
  // page. Tapping the "Session overview" tile smooth-scrolls them straight to it.
  const scrollToSessionList = () => {
    if (typeof document === "undefined") return;
    document
      .getElementById("guided-session-list")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* How it works — guided journey vs. session catalog */}
      <Card className="rounded-3xl border border-category-2/10 bg-card/95 px-4 pb-5 pt-4 shadow-lg shadow-category-2/10">
        <h3 className="text-center text-base font-bold text-foreground">
          {t("screens.guidedCatalog.howItWorksTitle")}
        </h3>
        <div className="relative mt-4 grid grid-cols-2 gap-4">
          {/* dotted connector with heart between the two icons */}
          {/* design-allow-next-line: centring, not a layout direction (left-1/2 + -translate-x-1/2) */}
          <div aria-hidden className="absolute left-1/2 top-7 flex w-24 -translate-x-1/2 items-center justify-center gap-1">
            <span className="flex-1 border-t-2 border-dotted border-category-2/30" />
            <Heart className="h-3.5 w-3.5 text-category-4" />
            <span className="flex-1 border-t-2 border-dotted border-category-2/30" />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-category-2/40 to-category-4/40">
              <BookOpen className="h-7 w-7 text-primary-foreground" />
            </span>
            <span className="mt-2 text-sm font-bold text-category-7">
              {t("screens.guidedCatalog.howItWorksJourneyTitle")}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("screens.guidedCatalog.howItWorksJourneyBody")}
            </p>
          </div>
          <button
            type="button"
            onClick={scrollToSessionList}
            className="flex flex-col items-center rounded-2xl px-1 py-1 text-center transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-category-7/50"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-category-7/40 to-category-3/80 shadow-sm shadow-category-7/15">
              <Search className="h-7 w-7 text-primary-foreground" />
            </span>
            <span className="mt-2 text-sm font-bold text-category-7">
              {t("screens.guidedCatalog.howItWorksCatalogTitle")}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("screens.guidedCatalog.howItWorksCatalogBody")}
            </p>
          </button>
        </div>
      </Card>

      {/* Click the session — the one action a first-time user must understand */}
      <div className="relative mt-8 rounded-3xl bg-gradient-to-b from-category-2/25 to-category-2/20 px-4 pb-4 pt-9 text-center shadow-lg shadow-category-2/10">
        {/* design-allow-next-line: centring, not a layout direction (left-1/2 + -translate-x-1/2) */}
        <span className="absolute -top-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-category-2/25 bg-card shadow-md">
          <MousePointerClick className="h-6 w-6 text-category-2" />
        </span>
        <span aria-hidden className="absolute start-4 top-8 text-category-2/70">
          <Sparkles className="h-4 w-4" />
        </span>
        <span aria-hidden className="absolute end-4 top-12 text-category-2/70">
          <Sparkles className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-extrabold text-category-2">
          {t("screens.guidedCatalog.clickSessionTitle")}
        </h3>
        <p className="mx-auto mt-1.5 max-w-64 text-sm font-medium leading-relaxed text-category-2/80">
          {t("screens.guidedCatalog.clickSessionBody")}
        </p>
        <div className="mx-auto mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-card/95 px-4 py-2 shadow-sm">
          <span className="truncate text-sm font-semibold text-category-2">
            {t("screens.guidedCatalog.clickSessionPill")}
          </span>
          <Heart className="h-3.5 w-3.5 shrink-0 fill-category-4 text-category-4" />
        </div>
      </div>
    </div>
  );
}

export default JourneyHowItWorks;
