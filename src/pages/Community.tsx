import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, MapPin, Radio, Trophy } from "lucide-react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "matchmaking", name: "Matchmaking", path: "/community/matchmaking" },
  { id: "groups", name: "Groups", path: "/community/groups" },
  { id: "meetups", name: "Meetups", path: "/community/meetups" },
  { id: "live-rooms", name: "Live Rooms", path: "/community/live-rooms" },
  { id: "challenges", name: "Challenges", path: "/community/challenges" },
];

export default function Community() {
  const navigate = useNavigate();

  const categoryCards = [
    {
      id: "matchmaking",
      title: "Matchmaking",
      description: "Find your perfect wellness partner",
      icon: Heart,
      path: "/community/matchmaking",
      color: "from-pink-100 to-rose-100"
    },
    {
      id: "groups",
      title: "Groups",
      description: "Join wellness communities that inspire you",
      icon: Users,
      path: "/community/groups",
      color: "from-blue-100 to-cyan-100"
    },
    {
      id: "meetups",
      title: "Meetups",
      description: "Attend local wellness events and gatherings",
      icon: MapPin,
      path: "/community/meetups",
      color: "from-green-100 to-teal-100"
    },
    {
      id: "live-rooms",
      title: "Live Rooms",
      description: "Join live wellness sessions and discussions",
      icon: Radio,
      path: "/community/live-rooms",
      color: "from-purple-100 to-violet-100"
    },
    {
      id: "challenges",
      title: "Challenges",
      description: "Participate in community wellness challenges",
      icon: Trophy,
      path: "/community/challenges",
      color: "from-orange-100 to-amber-100"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Community" description="Connect with the community through groups, events, and matchmaking" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Connect to someone interesting today! 🤝</h1>
            <p className="text-muted-foreground">Build meaningful connections with like-minded individuals in your wellness journey.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryCards.map((card) => (
              <Card 
                key={card.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/20"
                onClick={() => navigate(card.path)}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                    <card.icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{card.title}</h3>
                  <p className="text-muted-foreground text-sm">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}