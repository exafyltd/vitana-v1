import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

const healthTrackerSubItems = [
  { id: "overview", name: "Overview", path: "/health-tracker" },
  { id: "vitana-index", name: "My Vitana Index", path: "/health-tracker/vitana-index" },
  { id: "devices", name: "Connected Devices & Apps", path: "/health-tracker/devices" },
  { id: "tracking", name: "Daily & Weekly Tracking", path: "/health-tracker/tracking" },
  { id: "progress", name: "Progress & Goals", path: "/health-tracker/progress" },
];

export default function VitanaIndex() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO title="My Vitana Index | Health Tracker" description="Your comprehensive health index score breakdown" canonical={window.location.href} />
      <SubNavigation items={healthTrackerSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Shortened Header Bar - Welcome Message Only */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Your complete health picture! 🔍</h1>
                <p className="text-muted-foreground">Your detailed health score breakdown with comprehensive biomarker analysis and trends.</p>
              </div>
            </div>
            
            {/* Small Index Card - Only Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}