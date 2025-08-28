import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

export default withScreenId(function Meetups() {
  return (
    <AppLayout>
      <SEO title="Meetups | Community" description="Discover and join local meetups and events" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Meetups"
          description="Find and attend local wellness meetups and community events."
          emoji="🤝"
        />
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <p className="text-muted-foreground">Local meetups and wellness events will appear here.</p>
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_MEETUPS);