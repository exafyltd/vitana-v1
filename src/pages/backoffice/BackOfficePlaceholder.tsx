// Vitanaland BackOffice — generic placeholder page  (VTID-03833)
//
// Rendered by the /backoffice/* wildcard route until a section's real content
// lands. Wraps in <AppLayout> so the global frame (sidebar, ProfileDrawer with
// role switcher, ORB widget) stays constant — the same hard rule as
// AdminPlaceholder, which this file mirrors.
//
// Reads the current pathname to figure out which section and tab are active,
// then renders <BackOfficeTabs> and a wave-aware body (wave 1/2/3).

import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import BackOfficeTabs from "@/components/backoffice/BackOfficeTabs";
import {
  BACKOFFICE_HOME,
  canUseBackOfficeSection,
  getBackOfficeSectionByPath,
  getBackOfficeTabByPath,
  getBackOfficeTabWave,
} from "@/config/backoffice-navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { t } from "@/lib/i18n-toast";

export default function BackOfficePlaceholder() {
  const location = useLocation();
  const pathname = location.pathname;
  const { translate } = useTranslation();
  const erpAccess = useMyErpAccess();

  const section = getBackOfficeSectionByPath(pathname);
  const tab = getBackOfficeTabByPath(pathname);

  // Bare /backoffice → land on the Overview dashboard
  if (pathname === "/backoffice") {
    return <Navigate to={BACKOFFICE_HOME} replace />;
  }

  // Section root with no tab → redirect to the section's default tab
  if (section && !tab && pathname === section.basePath) {
    const defaultTab = section.tabs.find((tb) => tb.key === section.defaultTab);
    if (defaultTab) {
      return <Navigate to={defaultTab.path} replace />;
    }
  }

  // No matching section at all — 404-style body still inside AppLayout
  if (!section) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="text-6xl font-bold text-muted-foreground mb-4">404</div>
          <p className="text-lg text-muted-foreground mb-2">
            {t("screens.backoffice.noSectionMatches")} <code className="font-mono text-sm" dir="ltr">{pathname}</code>
          </p>
          <p className="text-sm text-muted-foreground">{t("screens.backoffice.sidebarIsCanonical")}</p>
        </div>
      </AppLayout>
    );
  }

  const wave = getBackOfficeTabWave(section, tab);
  const sectionLabel = translate(`sidebar.backoffice.${section.key}`, section.label);
  // VTID-03834: capability gate (mirrors the sidebar filter; the gateway enforces on data)
  const allowed = erpAccess.isLoading || canUseBackOfficeSection(section, erpAccess.data?.capabilities ?? null);
  if (!allowed) {
    return (
      <AppLayout>
        <BackOfficeTabs sectionKey={section.key} />
        <div className="px-6 py-10">
          <div className="max-w-3xl mx-auto rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <h1 className="text-xl font-semibold mb-2">{sectionLabel}</h1>
            <p className="text-sm text-muted-foreground">{t("screens.backoffice.noAccess")}</p>
            <p className="text-xs text-muted-foreground mt-2" dir="ltr">{(section.capabilities ?? []).join(" · ")}</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  const effectiveTab = tab ?? section.tabs[0];
  const tabLabel = effectiveTab
    ? translate(`backoffice.${section.key}.tabs.${effectiveTab.key}`, effectiveTab.label)
    : "";
  const waveKey = wave === 1 ? "comingWave1" : wave === 2 ? "comingWave2" : "comingWave3";

  return (
    <AppLayout>
      <BackOfficeTabs sectionKey={section.key} />
      <div className="px-6 py-10" data-screen-id={`BO-${section.key}-${effectiveTab?.key ?? ""}`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl font-semibold">{sectionLabel}</h1>
            <span className="text-muted-foreground" aria-hidden="true">›</span>
            <h2 className="text-2xl font-semibold text-muted-foreground">{tabLabel}</h2>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border text-xs font-medium mb-4">
              <span
                className={
                  wave === 1 ? "h-2 w-2 rounded-full bg-amber-500" : "h-2 w-2 rounded-full bg-muted-foreground"
                }
                aria-hidden="true"
              />
              {t(`screens.backoffice.${waveKey}`)}
            </div>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">{t("screens.backoffice.placeholderBody")}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
