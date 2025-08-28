import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Brain } from "lucide-react";
import { healthTrackerNavigation } from "@/config/navigation";

export default function MentalHealth() {
  return (
    <AppLayout>
      <SEO title="Mental Health | Health" description="Track your mental wellness and mood" canonical={window.location.href} />
      <SubNavigation items={healthTrackerNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Your mind matters most! 🧠"
            description="Monitor your mental wellness, mood tracking, and mindfulness practices."
            icon={Brain}
          />
        </div>
      </div>
    </AppLayout>
  );
}