import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Apple } from "lucide-react";
import { healthTrackerNavigation } from "@/config/navigation";

export default function Nutrition() {
  return (
    <AppLayout>
      <SEO title="Nutrition | Health" description="Track your nutrition and dietary habits" canonical={window.location.href} />
      <SubNavigation items={healthTrackerNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Fuel your body, nourish your soul! 🥗"
            description="Monitor your daily nutrition intake, calories, and dietary patterns."
            icon={Apple}
          />
        </div>
      </div>
    </AppLayout>
  );
}