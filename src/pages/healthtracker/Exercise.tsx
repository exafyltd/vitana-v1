import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Dumbbell } from "lucide-react";

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

export default function Exercise() {
  return (
    <AppLayout>
      <SEO title="Exercise | Health" description="Track your workouts and physical activity" canonical={window.location.href} />
      <SubNavigation items={healthSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Move your body, energize your life! 💪"
            description="Log your workouts, track progress, and monitor your fitness goals."
            icon={Dumbbell}
          />
        </div>
      </div>
    </AppLayout>
  );
}