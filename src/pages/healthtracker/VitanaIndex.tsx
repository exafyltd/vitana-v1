import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Activity } from "lucide-react";

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
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Your complete health picture! 🔍"
            description="Your detailed health score breakdown with comprehensive biomarker analysis and trends."
            icon={Activity}
          />
        </div>
      </div>
    </AppLayout>
  );
}