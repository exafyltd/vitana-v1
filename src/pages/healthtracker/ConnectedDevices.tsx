import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Scale } from "lucide-react";

const healthTrackerSubItems = [
  { id: "overview", name: "Overview", path: "/health-tracker" },
  { id: "vitana-index", name: "My Vitana Index", path: "/health-tracker/vitana-index" },
  { id: "devices", name: "Connected Devices & Apps", path: "/health-tracker/devices" },
  { id: "tracking", name: "Daily & Weekly Tracking", path: "/health-tracker/tracking" },
  { id: "progress", name: "Progress & Goals", path: "/health-tracker/progress" },
];

const deviceCategories = [
  {
    title: "Wearable Sync",
    description: "Connect Apple Health, Fitbit, Garmin, and other wearables",
    icon: Smartphone,
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "IoT Wellness Devices",
    description: "Smart scale, blood pressure monitor, and other IoT devices",
    icon: Scale,
    color: "from-green-500/20 to-emerald-500/20",
  },
];

export default function ConnectedDevices() {
  return (
    <AppLayout>
      <SEO title="Connected Devices & Apps | Health Tracker" description="Sync your wearables and IoT wellness devices" canonical={window.location.href} />
      <SubNavigation items={healthTrackerSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-2xl font-semibold mb-4">Connected Devices & Apps</h1>
            <p className="text-muted-foreground">Sync your wearables, IoT wellness devices, and health apps to centralize your health data.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deviceCategories.map((category) => (
              <Card key={category.title} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-4`}>
                    <category.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}