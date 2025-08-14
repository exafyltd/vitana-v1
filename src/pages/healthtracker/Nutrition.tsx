import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

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

export default function Nutrition() {
  return (
    <AppLayout>
      <SEO title="Nutrition | Health" description="Track your nutrition and dietary habits" canonical={window.location.href} />
      <SubNavigation items={healthSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Nutrition</h1>
          <p className="text-muted-foreground">Monitor your daily nutrition intake, calories, and dietary patterns.</p>
        </div>
      </div>
    </AppLayout>
  );
}