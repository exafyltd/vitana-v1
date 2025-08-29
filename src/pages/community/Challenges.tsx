import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { communityNavigation } from "@/config/navigation";

export default function Challenges() {
  return (
    <AppLayout>
      <SEO title="Challenges | Community" description="Participate in wellness challenges" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Challenge yourself, achieve greatness!"
            description="Join community wellness challenges and compete with others to achieve your goals."
            emoji="🏆"
          />
        </div>
      </div>
    </AppLayout>
  );
}