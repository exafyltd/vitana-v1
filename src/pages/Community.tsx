import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const communitySubItems = [
  { id: "feed", name: "Feed", path: "/community" },
  { id: "matchmaking", name: "Matchmaking", path: "/community/matchmaking" },
  { id: "groups", name: "Groups", path: "/community/groups" },
  { id: "meetups", name: "Meetups", path: "/community/meetups" },
  { id: "live-rooms", name: "Live Rooms", path: "/community/live-rooms" },
  { id: "challenges", name: "Challenges", path: "/community/challenges" },
];

export default function Community() {
  return (
    <AppLayout>
      <SEO title="Community | VITANA" description="Connect with the VITANA community through groups, events, and matchmaking" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Community</h1>
          <p className="text-muted-foreground">Connect with like-minded individuals, join groups, and participate in community events. Navigate using the tabs above to explore different community features.</p>
        </div>
      </div>
    </AppLayout>
  );
}