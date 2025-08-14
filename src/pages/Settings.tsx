import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Bell, Settings as SettingsIcon, Smartphone, CreditCard, HelpCircle } from "lucide-react";

const settingsSubItems = [
  { id: "overview", name: "Overview", path: "/settings" },
  { id: "privacy", name: "Privacy", path: "/settings/privacy" },
  { id: "notifications", name: "Notifications", path: "/settings/notifications" },
  { id: "preferences", name: "Preferences", path: "/settings/preferences" },
  { id: "connected-apps", name: "Connected Apps", path: "/settings/connected-apps" },
  { id: "billing", name: "Billing", path: "/settings/billing" },
  { id: "support", name: "Support", path: "/settings/support" },
];

export default function Settings() {
  const navigate = useNavigate();

  const categoryCards = [
    {
      id: "privacy",
      title: "Privacy",
      description: "Control your data and privacy settings",
      icon: Shield,
      path: "/settings/privacy",
      color: "from-red-100 to-pink-100"
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Manage your notification preferences",
      icon: Bell,
      path: "/settings/notifications",
      color: "from-blue-100 to-indigo-100"
    },
    {
      id: "preferences",
      title: "Preferences",
      description: "Customize your app experience",
      icon: SettingsIcon,
      path: "/settings/preferences",
      color: "from-green-100 to-emerald-100"
    },
    {
      id: "connected-apps",
      title: "Connected Apps",
      description: "Manage your connected applications",
      icon: Smartphone,
      path: "/settings/connected-apps",
      color: "from-purple-100 to-violet-100"
    },
    {
      id: "billing",
      title: "Billing",
      description: "Manage your subscription and payments",
      icon: CreditCard,
      path: "/settings/billing",
      color: "from-orange-100 to-amber-100"
    },
    {
      id: "support",
      title: "Support",
      description: "Get help and contact support",
      icon: HelpCircle,
      path: "/settings/support",
      color: "from-cyan-100 to-teal-100"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Settings" description="Manage your account settings, privacy, and preferences" canonical={window.location.href} />
      <SubNavigation items={settingsSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Personalize your wellness experience! ⚙️</h1>
            <p className="text-muted-foreground">Customize your journey with personalized settings, privacy controls, and preferences that work perfectly for you.</p>
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