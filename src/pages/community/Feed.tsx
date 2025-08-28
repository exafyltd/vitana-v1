import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

export default withScreenId(function Feed() {
  return (
    <AppLayout>
      <SEO title="Feed | Community" description="Stay updated with your community feed" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Community Feed"
          description="Stay updated with posts, updates, and activities from your community."
          emoji="📱"
        />
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <p className="text-muted-foreground">Your personalized community feed will appear here.</p>
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_FEED);