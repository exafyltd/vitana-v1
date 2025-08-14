import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Star, Bookmark } from "lucide-react";

const discoverSubItems = [
  { id: "overview", name: "Overview", path: "/discover" },
  { id: "trending", name: "Trending", path: "/discover/trending" },
  { id: "recommendations", name: "Recommendations", path: "/discover/recommendations" },
  { id: "saved", name: "Saved", path: "/discover/saved" },
];

export default function Discover() {
  const navigate = useNavigate();

  const categoryCards = [
    {
      id: "trending",
      title: "Trending",
      description: "What's popular in wellness right now",
      icon: TrendingUp,
      path: "/discover/trending",
      color: "from-orange-100 to-red-100"
    },
    {
      id: "recommendations",
      title: "Recommendations",
      description: "Personalized content just for you",
      icon: Star,
      path: "/discover/recommendations",
      color: "from-blue-100 to-purple-100"
    },
    {
      id: "saved",
      title: "Saved",
      description: "Your bookmarked wellness content",
      icon: Bookmark,
      path: "/discover/saved",
      color: "from-green-100 to-teal-100"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Discover | VITANA" description="Discover new content, trends, and recommendations on VITANA" canonical={window.location.href} />
      <SubNavigation items={discoverSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Discover something amazing today! 🌟</h1>
            <p className="text-muted-foreground">Explore new wellness content, trends, and personalized recommendations just for you.</p>
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