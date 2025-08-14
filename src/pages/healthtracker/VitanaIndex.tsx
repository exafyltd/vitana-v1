import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const healthTrackerSubItems = [
  { id: "overview", name: "Overview", path: "/health-tracker" },
  { id: "vitana-index", name: "My Vitana Index", path: "/health-tracker/vitana-index" },
  { id: "devices", name: "Connected Devices & Apps", path: "/health-tracker/devices" },
  { id: "tracking", name: "Daily & Weekly Tracking", path: "/health-tracker/tracking" },
  { id: "progress", name: "Progress & Goals", path: "/health-tracker/progress" },
];

export default function VitanaIndex() {
  return (
    <AppLayout>
      <SEO title="My Vitana Index | Health Tracker" description="Your comprehensive health index score breakdown" canonical={window.location.href} />
      <SubNavigation items={healthTrackerSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">My Vitana Index</h1>
          <p className="text-muted-foreground">Your detailed health score breakdown with comprehensive biomarker analysis and trends.</p>
        </div>
      </div>
    </AppLayout>
  );
}