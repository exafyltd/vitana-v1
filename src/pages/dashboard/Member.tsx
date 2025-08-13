import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const dashboardSubItems = [
  { id: "overview", name: "Overview", path: "/dashboard" },
  { id: "member", name: "Community Member", path: "/dashboard/member" },
  { id: "toggle", name: "Dual-Role Toggle", path: "/dashboard/toggle" },
  { id: "summary", name: "AI Daily Summary", path: "/dashboard/summary" },
];

export default function Member() {
  return (
    <AppLayout>
      <SEO title="Community Member | Dashboard" description="Community member dashboard" canonical={window.location.href} />
      <SubNavigation items={dashboardSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Community Member</h1>
          <p className="text-muted-foreground">Manage your community member profile and settings.</p>
        </div>
      </div>
    </AppLayout>
  );
}