import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, TrendingUp, Star, FileText, Bot } from "lucide-react";

const aiSubItems = [
  { id: "overview", name: "Overview", path: "/ai" },
  { id: "insights", name: "Insights", path: "/ai/insights" },
  { id: "recommendations", name: "Recommendations", path: "/ai/recommendations" },
  { id: "daily-summary", name: "Daily Summary", path: "/ai/daily-summary" },
  { id: "companion", name: "AI Companion", path: "/ai/companion" },
];

export default function AI() {
  const navigate = useNavigate();

  const categoryCards = [
    {
      id: "insights",
      title: "Insights",
      description: "AI-powered analysis of your wellness data",
      icon: Brain,
      path: "/ai/insights",
      color: "from-purple-100 to-indigo-100"
    },
    {
      id: "recommendations",
      title: "Recommendations",
      description: "Personalized AI suggestions for your wellness",
      icon: Star,
      path: "/ai/recommendations",
      color: "from-blue-100 to-cyan-100"
    },
    {
      id: "daily-summary",
      title: "Daily Summary",
      description: "AI-generated daily wellness reports",
      icon: FileText,
      path: "/ai/daily-summary",
      color: "from-green-100 to-emerald-100"
    },
    {
      id: "companion",
      title: "AI Companion",
      description: "Your personal AI wellness assistant",
      icon: Bot,
      path: "/ai/companion",
      color: "from-pink-100 to-rose-100"
    }
  ];

  return (
    <AppLayout>
      <SEO title="AI Intelligence" description="Access AI-powered insights, recommendations, and personalized assistance" canonical={window.location.href} />
      <SubNavigation items={aiSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Let AI guide your wellness journey! 🤖</h1>
            <p className="text-muted-foreground">Get personalized insights, smart recommendations, and AI assistance tailored specifically to your wellness goals.</p>
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