import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Users } from "lucide-react";

import { communityNavigation } from "@/config/navigation";

export default function Groups() {
  return (
    <AppLayout>
      <SEO title="Groups | Community" description="Join and manage community groups" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Find your wellness tribe! 👥"
            description="Join groups with shared interests or create your own community groups."
            icon={Users}
          />
        </div>
      </div>
    </AppLayout>
  );
}