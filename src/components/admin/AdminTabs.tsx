// Maxina Tenant Admin — horizontal tab bar
//
// Thin adapter that reads ADMIN_SECTIONS from @/config/admin-navigation and
// feeds the section's tabs into the existing <SubNavigation> primitive so the
// admin tabs share visual style with the rest of vitana-v1 (rounded pills,
// border-b backdrop).
//
// Usage in any admin page:
//   <AppLayout>
//     <AdminTabs sectionKey="assistant" />
//     {/* tab content here */}
//   </AppLayout>
//
// HARD RULE (see plan): NEVER replace AppLayout. AdminTabs lives INSIDE the
// global frame so the ORB widget, ProfileDrawer, and sidebar stay constant.

import SubNavigation from "@/components/SubNavigation";
import { ADMIN_SECTIONS } from "@/config/admin-navigation";

interface AdminTabsProps {
  sectionKey: string;
  rightActions?: React.ReactNode;
  className?: string;
}

export default function AdminTabs({ sectionKey, rightActions, className }: AdminTabsProps) {
  const section = ADMIN_SECTIONS.find((s) => s.key === sectionKey);

  if (!section) {
    if (import.meta.env.DEV) {
      // Surface config drift loudly in dev so a typo doesn't silently render nothing
      console.error(`[AdminTabs] Unknown sectionKey "${sectionKey}". Check ADMIN_SECTIONS in @/config/admin-navigation.`);
    }
    return null;
  }

  const items = section.tabs.map((tab) => ({
    id: tab.key,
    name: tab.label,
    path: tab.path,
    i18nKey: `admin.${section.key}.tabs.${tab.key}`,
  }));

  return <SubNavigation items={items} rightActions={rightActions} className={className} />;
}
