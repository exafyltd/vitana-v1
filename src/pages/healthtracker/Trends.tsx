import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { TrendingUp } from "lucide-react";

const healthSubItems = [
  { id: "overview", name: "Overview", path: "/health" },
  { id: "vitana-index", name: "Health Index", path: "/health/vitana-index" },
  { id: "nutrition", name: "Nutrition", path: "/health/nutrition" },
  { id: "hydration", name: "Hydration", path: "/health/hydration" },
  { id: "sleep", name: "Sleep", path: "/health/sleep" },
  { id: "exercise", name: "Exercise", path: "/health/exercise" },
  { id: "mental-health", name: "Mental Health", path: "/health/mental-health" },
  { id: "trends", name: "Trends", path: "/health/trends" },
];

export default function Trends() {
  return (
    <AppLayout>
      <SEO title="Trends | Health" description="View health trends and patterns over time" canonical={window.location.href} />
      <SubNavigation items={healthSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Your journey mapped over time! 📊"
            description="Analyze your health data trends and patterns over time to identify improvements."
            icon={TrendingUp}
          />
        </div>
      </div>
    </AppLayout>
  );
}