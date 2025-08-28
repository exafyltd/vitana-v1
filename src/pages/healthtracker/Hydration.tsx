import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Droplets } from "lucide-react";
import { healthTrackerNavigation } from "@/config/navigation";

export default function Hydration() {
  return (
    <AppLayout>
      <SEO title="Hydration | Health" description="Track your daily water intake and hydration levels" canonical={window.location.href} />
      <SubNavigation items={healthTrackerNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Stay hydrated, stay healthy! 💧"
            description="Monitor your daily water intake and maintain optimal hydration levels."
            icon={Droplets}
          />
        </div>
      </div>
    </AppLayout>
  );
}