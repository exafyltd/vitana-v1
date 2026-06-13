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
  return (
    <div className={cn("space-y-4", className)}>
      {/* How it works — guided journey vs. session catalog */}
      <Card className="rounded-3xl border border-violet-100/80 bg-white/95 px-4 pb-5 pt-4 shadow-lg shadow-violet-200/30">
        <h3 className="text-center text-base font-bold text-slate-900">
          {t("screens.guidedCatalog.howItWorksTitle")}
        </h3>
        <div className="relative mt-4 grid grid-cols-2 gap-4">
          {/* dotted connector with heart between the two icons */}
          <div aria-hidden className="absolute left-1/2 top-7 flex w-24 -translate-x-1/2 items-center justify-center gap-1">
            <span className="flex-1 border-t-2 border-dotted border-violet-300/70" />
            <Heart className="h-3.5 w-3.5 text-pink-300" />
            <span className="flex-1 border-t-2 border-dotted border-violet-300/70" />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-300 to-pink-300">
              <BookOpen className="h-7 w-7 text-white" />
            </span>
            <span className="mt-2 text-sm font-bold text-sky-600">
              {t("screens.guidedCatalog.howItWorksJourneyTitle")}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("screens.guidedCatalog.howItWorksJourneyBody")}
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-teal-400">
              <Search className="h-7 w-7 text-white" />
            </span>
            <span className="mt-2 text-sm font-bold text-sky-600">
              {t("screens.guidedCatalog.howItWorksCatalogTitle")}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("screens.guidedCatalog.howItWorksCatalogBody")}
            </p>
          </div>
        </div>
      </Card>

      {/* Click the session — the one action a first-time user must understand */}
      <div className="relative mt-8 rounded-3xl bg-gradient-to-b from-violet-200/90 to-purple-200/80 px-4 pb-4 pt-9 text-center shadow-lg shadow-violet-300/30">
        <span className="absolute -top-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-violet-200 bg-white shadow-md">
          <MousePointerClick className="h-6 w-6 text-violet-600" />
        </span>
        <span aria-hidden className="absolute left-4 top-8 text-violet-400/70">
          <Sparkles className="h-4 w-4" />
        </span>
        <span aria-hidden className="absolute right-4 top-12 text-violet-400/70">
          <Sparkles className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-extrabold text-violet-700">
          {t("screens.guidedCatalog.clickSessionTitle")}
        </h3>
        <p className="mx-auto mt-1.5 max-w-[16rem] text-sm font-medium leading-relaxed text-violet-900/80">
          {t("screens.guidedCatalog.clickSessionBody")}
        </p>
        <div className="mx-auto mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 shadow-sm">
          <span className="truncate text-sm font-semibold text-violet-700">
            {t("screens.guidedCatalog.clickSessionPill")}
          </span>
          <Heart className="h-3.5 w-3.5 shrink-0 fill-pink-400 text-pink-400" />
        </div>
      </div>
    </div>
  );
}

export default JourneyHowItWorks;
