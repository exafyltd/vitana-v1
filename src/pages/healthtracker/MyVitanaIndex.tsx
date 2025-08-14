import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TestTube, Dna, Microscope, Droplet, AlertCircle, Shield } from "lucide-react";

const healthTrackerSubItems = [
  { id: "overview", name: "Overview", path: "/health-tracker" },
  { id: "vitana-index", name: "My Vitana Index", path: "/health-tracker/vitana-index" },
  { id: "devices", name: "Connected Devices & Apps", path: "/health-tracker/devices" },
  { id: "tracking", name: "Daily & Weekly Tracking", path: "/health-tracker/tracking" },
  { id: "progress", name: "Progress & Goals", path: "/health-tracker/progress" },
];

const vitanaIndexCards = [
  {
    title: "Biomarker Data",
    description: "Comprehensive biomarker analysis and trends",
    icon: TestTube,
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Genomics",
    description: "Genetic analysis and personalized insights",
    icon: Dna,
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Metabolomics",
    description: "Metabolic profiling and optimization",
    icon: Activity,
    color: "from-purple-500/20 to-violet-500/20",
  },
  {
    title: "Microbiome",
    description: "Gut health analysis and recommendations",
    icon: Microscope,
    color: "from-orange-500/20 to-amber-500/20",
  },
  {
    title: "Blood Markers",
    description: "Blood test results and monitoring",
    icon: Droplet,
    color: "from-red-500/20 to-pink-500/20",
  },
  {
    title: "Allergy Tests",
    description: "Allergen identification and management",
    icon: AlertCircle,
    color: "from-yellow-500/20 to-orange-500/20",
  },
  {
    title: "Cancer Screening Results",
    description: "Preventive screening results and follow-ups",
    icon: Shield,
    color: "from-teal-500/20 to-cyan-500/20",
  },
];

export default function MyVitanaIndex() {
  return (
    <AppLayout>
      <SEO title="My Vitana Index | Health Tracker" description="Detailed view of your health score breakdown and biomarkers" canonical={window.location.href} />
      <SubNavigation items={healthTrackerSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-2xl font-semibold mb-4">My Vitana Index</h1>
            <p className="text-muted-foreground">Your detailed health score breakdown with comprehensive biomarker analysis and trends.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vitanaIndexCards.map((card) => (
              <Card key={card.title} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                    <card.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {card.description}
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