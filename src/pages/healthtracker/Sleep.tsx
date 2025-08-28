import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Moon } from "lucide-react";
import { healthTrackerNavigation } from "@/config/navigation";

export default function Sleep() {
  return (
    <AppLayout>
      <SEO title="Sleep | Health" description="Track your sleep patterns and quality" canonical={window.location.href} />
      <SubNavigation items={healthTrackerNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Rest well, live better! 😴"
            description="Monitor your sleep duration, quality, and patterns for better rest."
            icon={Moon}
          />
        </div>
      </div>
    </AppLayout>
  );
}