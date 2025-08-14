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

export default function Hydration() {
  return (
    <AppLayout>
      <SEO title="Hydration | Health" description="Track your daily water intake and hydration levels" canonical={window.location.href} />
      <SubNavigation items={healthSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Hydration</h1>
          <p className="text-muted-foreground">Monitor your daily water intake and maintain optimal hydration levels.</p>
        </div>
      </div>
    </AppLayout>
  );
}