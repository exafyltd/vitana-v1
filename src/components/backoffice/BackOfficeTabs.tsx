// Vitanaland BackOffice — horizontal tab bar  (VTID-03833)
//
// Thin adapter that reads BACKOFFICE_SECTIONS from @/config/backoffice-navigation
// and feeds the section's tabs into the existing <SubNavigation> primitive —
// identical to <AdminTabs>, so BackOffice tabs share the admin visual style.
//
// Usage in any BackOffice page:
//   <AppLayout>
//     <BackOfficeTabs sectionKey="sales" />
//     {/* tab content here */}
//   </AppLayout>
//
// HARD RULE: NEVER replace AppLayout. BackOfficeTabs lives INSIDE the global
// frame so the ORB widget, ProfileDrawer, and sidebar stay constant.

import SubNavigation from "@/components/SubNavigation";
import { BACKOFFICE_SECTIONS } from "@/config/backoffice-navigation";

interface BackOfficeTabsProps {
  sectionKey: string;
  rightActions?: React.ReactNode;
  className?: string;
}

export default function BackOfficeTabs({ sectionKey, rightActions, className }: BackOfficeTabsProps) {
  const section = BACKOFFICE_SECTIONS.find((s) => s.key === sectionKey && !s.adminOnly);

  if (!section) {
    if (import.meta.env.DEV) {
      // Surface config drift loudly in dev so a typo doesn't silently render nothing
      console.error(`[BackOfficeTabs] Unknown sectionKey "${sectionKey}". Check BACKOFFICE_SECTIONS in @/config/backoffice-navigation.`);
    }
    return null;
  }

  const items = section.tabs.map((tab) => ({
    id: tab.key,
    name: tab.label,
    path: tab.path,
    i18nKey: `backoffice.${section.key}.tabs.${tab.key}`,
  }));

  return <SubNavigation items={items} rightActions={rightActions} className={className} />;
}
