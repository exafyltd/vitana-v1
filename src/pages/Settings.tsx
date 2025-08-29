import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useRTL } from "@/components/RTLProvider";
import { settingsNavigation } from "@/config/navigation";
import { Languages, RotateCcw, Shield, Bell, Settings as SettingsIcon, Smartphone, CreditCard, HelpCircle, Users } from "lucide-react";
import StandardHeader from "@/components/StandardHeader";

export default function Settings() {
  const navigate = useNavigate();
  const { isRTL, toggleRTL } = useRTL();

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
      title: "Connected Apps & Integrations",
      description: "Manage your connected applications",
      icon: Smartphone,
      path: "/settings/connected-apps",
      color: "from-purple-100 to-violet-100"
    },
    {
      id: "tenant-role",
      title: "Tenant & Role Switcher",
      description: "Switch between roles and tenants",
      icon: Users,
      path: "/settings/tenant-role",
      color: "from-indigo-100 to-blue-100"
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
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Fine-tune your Vitana experience!"
            description="Manage your account settings, privacy, and preferences to personalize your wellness journey."
            emoji="⚙️"
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-card border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Protected</span>
                </div>
                <h3 className="font-semibold text-foreground">Privacy Status</h3>
                <p className="text-sm text-muted-foreground">All privacy settings active</p>
              </CardContent>
            </Card>

            <Card className="bg-card border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">5 Active</span>
                </div>
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <p className="text-sm text-muted-foreground">5 notification types enabled</p>
              </CardContent>
            </Card>

            <Card className="bg-card border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">3 Apps</span>
                </div>
                <h3 className="font-semibold text-foreground">Connected Apps</h3>
                <p className="text-sm text-muted-foreground">Health apps & wearables</p>
              </CardContent>
            </Card>

            <Card className="bg-card border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">Premium</span>
                </div>
                <h3 className="font-semibold text-foreground">Subscription</h3>
                <p className="text-sm text-muted-foreground">Active until Dec 2024</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-card border shadow-sm mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => navigate('/settings/privacy')}
                  className="flex flex-col items-center p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Shield className="w-6 h-6 text-primary mb-2" />
                  <span className="text-sm font-medium">Manage Privacy</span>
                </button>
                <button 
                  onClick={() => navigate('/settings/notifications')}
                  className="flex flex-col items-center p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Bell className="w-6 h-6 text-primary mb-2" />
                  <span className="text-sm font-medium">Edit Notifications</span>
                </button>
                <button 
                  onClick={() => navigate('/settings/connected-apps')}
                  className="flex flex-col items-center p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Smartphone className="w-6 h-6 text-primary mb-2" />
                  <span className="text-sm font-medium">Add App</span>
                </button>
                 <button 
                   onClick={toggleRTL}
                   className="flex flex-col items-center p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                 >
                   <Languages className="w-6 h-6 text-primary mb-2" />
                   <span className="text-sm font-medium">{isRTL ? 'LTR Mode' : 'RTL Mode'}</span>
                 </button>
               </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryCards.map((card) => (
              <Card 
                key={card.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-card border shadow-sm"
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