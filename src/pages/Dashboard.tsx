import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";


const dashboardSubItems = [
  { id: "overview", name: "Overview", path: "/dashboard" },
  { id: "member", name: "Community Member", path: "/dashboard/member" },
  { id: "toggle", name: "Dual-Role Toggle", path: "/dashboard/toggle" },
  { id: "summary", name: "AI Daily Summary", path: "/dashboard/summary" },
];


export default function Dashboard() {
  return (
    <AppLayout>
      <SEO title="Dashboard | VITANA" description="VITANA Dashboard" canonical={window.location.href} />
      <SubNavigation items={dashboardSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome to your dashboard. Navigate using the tabs above to access different sections.</p>
        </div>
      </div>
    </AppLayout>
  );
}
