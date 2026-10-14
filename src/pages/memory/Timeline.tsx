/**
 * VTID-05170 — Life Timeline P4: Memory → Timeline, rebuilt.
 *
 * The Vitana Index leads (score, five pillars, balance, weakest pillar); each
 * day shows what moved the Index, a "Your day" digest and the member's
 * moments, each with its measured influence or the pillar it counted toward.
 * Data: gateway /api/v1/timeline (VTID-05169). Plan:
 * vitana-platform docs/validation/VTID-05167/plan-sparring.md §5 P4.
 *
 * Desktop Spotlight → ScreenFrame "collection"; phones keep the app layout
 * and render the same body.
 */
import { useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { ScreenFrame } from "@/components/layout/spotlight";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { TimelineBody } from "@/components/timeline/TimelineBody";
import { memoryNavigation } from "@/config/navigation";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { t } from "@/lib/i18n-toast";

function Timeline() {
  const spotlight = useSpotlightEnabled();
  const [search, setSearch] = useState("");
  // Bumped by the timeline's Clear so the header search box (uncontrolled) empties too.
  const [searchBox, setSearchBox] = useState(0);

  if (spotlight) {
    return (
      <AppLayout>
        <SEO title={t("timeline.header.seoTitle")} description={t("timeline.header.description")} />
        <ScreenFrame
          archetype="collection"
          subNav={{ items: memoryNavigation }}
          header={{ title: t("timeline.header.title"), description: t("timeline.header.description"), emoji: "🧭" }}
          utility={{
            children: (
              <div className="flex min-w-max items-center gap-2.5">
                <ExpandableSearchButton key={searchBox} placeholder={t("timeline.searchPlaceholder")} onSearch={(q: string) => setSearch(q)} />
              </div>
            ),
          }}
        >
          <TimelineBody searchTerm={search} onClearSearch={() => { setSearch(""); setSearchBox((n) => n + 1); }} />
        </ScreenFrame>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title={t("timeline.header.seoTitle")} description={t("timeline.header.description")} />
      <SubNavigation items={memoryNavigation} />
      <div className="mx-auto w-full max-w-wide px-4 py-4 sm:px-6">
        <StandardHeader title={t("timeline.header.title")} description={t("timeline.header.description")} emoji="🧭" className="mb-4" />
        <TimelineBody />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Timeline, SCREEN_IDS.MEMORY_TIMELINE);
