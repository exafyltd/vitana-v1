/**
 * Memory → Permissions. VTID-05172 (Life Timeline P6): what Vitana may learn
 * from (one saved switch per life area, the five pillars first, app usage
 * last) and the member's usage data (count, export, delete all). Replaces the
 * former page of decorative switches that saved nothing and stock cards.
 * Desktop Spotlight → ScreenFrame "collection"; phones keep the app layout.
 */
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { ScreenFrame } from "@/components/layout/spotlight";
import { LearningSwitches } from "@/components/memory/learning/LearningSwitches";
import { UsageDataCard } from "@/components/memory/learning/UsageDataCard";
import { memoryNavigation } from "@/config/navigation";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { t } from "@/lib/i18n-toast";

function Body() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" data-testid="memory-permissions">
      <LearningSwitches />
      <div className="space-y-4">
        <UsageDataCard />
      </div>
    </div>
  );
}

function Permissions() {
  const spotlight = useSpotlightEnabled();
  const seo = <SEO title={t("screens.memory.memoryPermissionsVitanaMemory")} description={t("memoryLearning.header.permissionsDescription")} />;

  if (spotlight) {
    return (
      <AppLayout>
        {seo}
        <ScreenFrame
          archetype="collection"
          subNav={{ items: memoryNavigation }}
          header={{ title: t("memoryLearning.header.permissionsTitle"), description: t("memoryLearning.header.permissionsDescription"), emoji: "🔒" }}
        >
          <Body />
        </ScreenFrame>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {seo}
      <SubNavigation items={memoryNavigation} />
      <div className="mx-auto w-full max-w-wide space-y-4 px-4 py-4 sm:px-6">
        <StandardHeader title={t("memoryLearning.header.permissionsTitle")} description={t("memoryLearning.header.permissionsDescription")} emoji="🔒" />
        <Body />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Permissions, SCREEN_IDS.MEMORY_PERMISSIONS);
