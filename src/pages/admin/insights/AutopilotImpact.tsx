import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function AutopilotImpact() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="✈️"
          title="Autopilot Impact"
          description="Measure the impact of automated actions on community health"
        />
        <AdminEmptyState
          title="Autopilot Impact Metrics"
          description="Autopilot impact metrics coming soon — actions delivered, acceptance rate, top automations."
        />
      </div>
    </AppLayout>
  );
}
