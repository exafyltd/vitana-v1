// Maxina Tenant Admin — generic placeholder page
//
// Rendered by the /admin/* wildcard route until a section's real content lands.
// Wraps in <AppLayout> so the global frame (sidebar, ProfileDrawer with role
// switcher, ORB widget) stays constant — per the hard rule in the plan.
//
// Reads the current pathname to figure out which section and tab are active,
// then renders <AdminTabs> and a wave-aware body.

import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import {
  ADMIN_SECTIONS,
  getAdminSectionByPath,
  getAdminTabByPath,
} from "@/config/admin-navigation";
import { t } from '@/lib/i18n-toast';
import { ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';

export default function AdminPlaceholder() {
  const spotlight = useSpotlightEnabled();
  const location = useLocation();
  const pathname = location.pathname;

  const section = getAdminSectionByPath(pathname);
  const tab = getAdminTabByPath(pathname);

  // Bare /admin → land on the default tab of the Overview section
  if (pathname === "/admin") {
    const overview = ADMIN_SECTIONS.find((s) => s.key === "overview");
    const defaultTab = overview?.tabs.find((t) => t.key === overview.defaultTab);
    if (defaultTab) {
      return <Navigate to={defaultTab.path} replace />;
    }
  }

  // Section root with no tab → redirect to the section's default tab
  if (section && !tab && pathname === section.basePath) {
    const defaultTab = section.tabs.find((t) => t.key === section.defaultTab);
    if (defaultTab) {
      return <Navigate to={defaultTab.path} replace />;
    }
  }

  // No matching section at all — fall through to 404-style body still inside AppLayout
  if (!section) {
    const adminBody = (
      <>
          <div className="text-6xl font-bold text-muted-foreground mb-4">404</div>
          <p className="text-lg text-muted-foreground mb-2">{t('screens.admin.noAdminSectionMatches')} <code className="font-mono text-sm">{pathname}</code>
          </p>
          <p className="text-sm text-muted-foreground">{t('screens.admin.sidebarCanonicalListSectionsPickOne')}
          </p>
      </>
    );

    return (
      <AppLayout>
        {spotlight ? (
          <ScreenFrame archetype="workspace">
            <div className="flex flex-col items-center justify-center py-16 text-center">{adminBody}</div>
          </ScreenFrame>
        ) : (
          // design-allow-next-line: legacy (flag-off) 404 body keeps its viewport-relative centring unchanged
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">{adminBody}</div>
        )}
      </AppLayout>
    );
  }

  const wave = section.wave;
  const sectionLabel = section.label;
  const tabLabel = tab?.label ?? section.tabs[0]?.label ?? "";

  const adminBody2 = (
    <>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl font-semibold">{sectionLabel}</h1>
            <span className="text-muted-foreground">›</span>
            <h2 className="text-2xl font-semibold text-muted-foreground">{tabLabel}</h2>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border text-xs font-medium mb-4">
              {wave === 1 ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-status-warning" />{t('screens.admin.comingWave1')}
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />{t('screens.admin.comingWave2')}
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">{t('screens.admin.sidebarProfileDrawerRoleSwitcherOrb')}
            </p>
          </div>
        </div>
    </>
  );

  return (
    <AppLayout>
      <AdminTabs sectionKey={section.key} />
      {spotlight ? (
        <ScreenFrame archetype="workspace">
          {adminBody2}
        </ScreenFrame>
      ) : (
        <div className="px-6 py-10">{adminBody2}</div>
      )}
    </AppLayout>
  );
}
