import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "matchmaking", name: "Matchmaking", path: "/community/matchmaking" },
  { id: "groups", name: "Groups", path: "/community/groups" },
  { id: "meetups", name: "Meetups", path: "/community/meetups" },
  { id: "live-rooms", name: "Live Rooms", path: "/community/live-rooms" },
  { id: "challenges", name: "Challenges", path: "/community/challenges" },
];

export default function Matchmaking() {
  return (
    <AppLayout>
      <SEO title="Matchmaking | Community" description="Find compatible community members" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Matchmaking</h1>
          <p className="text-muted-foreground">Discover compatible community members based on your interests and wellness goals.</p>
        </div>
      </div>
    </AppLayout>
  );
}