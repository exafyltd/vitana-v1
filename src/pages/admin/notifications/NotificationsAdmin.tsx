/**
 * VTID-04675: Admin › Notifications, rebuilt.
 *
 *   /admin/notifications             → Notifications (on/off switch per type)
 *   /admin/notifications/categories  → Categories (what members can switch)
 *   /admin/notifications/activity    → Activity (real counts, errors shown)
 *
 * One tab bar (AdminTabs, from admin-navigation); the old per-page
 * SubNavigation, the empty Templates/Subscriptions/Providers pages and the
 * duplicate route set are gone.
 */

import AppLayout from "@/components/AppLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminTabs from "@/components/admin/AdminTabs";
import { NotificationControlsTab } from "@/components/admin/notifications/NotificationControlsTab";
import { NotificationCategoriesTab } from "@/components/admin/notifications/NotificationCategoriesTab";
import { NotificationActivityTab } from "@/components/admin/notifications/NotificationActivityTab";
import { t } from "@/lib/i18n-toast";

export type NotificationsAdminTab = "notifications" | "categories" | "activity";

export default function NotificationsAdmin({ tab = "notifications" }: { tab?: NotificationsAdminTab }) {
  return (
    <AppLayout>
      <AdminTabs sectionKey="notifications" />
      <div className="space-y-6 p-4 sm:p-6">
        <AdminHeader
          title={t(`notificationControls.pages.${tab}.title`)}
          description={t(`notificationControls.pages.${tab}.description`)}
        />
        {tab === "notifications" && <NotificationControlsTab />}
        {tab === "categories" && <NotificationCategoriesTab />}
        {tab === "activity" && <NotificationActivityTab />}
      </div>
    </AppLayout>
  );
}
