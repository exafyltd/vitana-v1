import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import ServiceDetailDrawer from "@/components/health/ServiceDetailDrawer";
import { Stethoscope, Users, Target, Shield, Heart, Activity, Calendar, TestTube, UserCheck, Phone, FileText, CreditCard, Clock, Star, MessageSquare, TestTube2, Microscope, Package, Plane } from "lucide-react";

const healthSubItems = [
  { id: "overview", name: "Overview", path: "/health" },
  { id: "pillars", name: "Pillars of Health", path: "/health/pillars" },
  { id: "services", name: "Services HUB", path: "/health/services" },
  { id: "conditions", name: "Conditions & Risks", path: "/health/conditions" },
  { id: "education", name: "Education & Resources", path: "/health/education" },
];

const servicesData = {
  preventive: [
    {
      id: "CT-301",
      title: "Lab Test",
      description: "Comprehensive blood work and analysis",
      icon: TestTube,
      color: "from-emerald-500/20 to-green-500/20",
      vitanaImpact: "+25 points"
    },
    {
      id: "CT-302", 
      title: "Screening",
      description: "Preventive health screenings",
      icon: Microscope,
      color: "from-blue-500/20 to-cyan-500/20",
      vitanaImpact: "+15 points"
    },
    {
      id: "CT-303",
      title: "Package", 
      description: "Complete wellness packages",
      icon: Package,
      color: "from-purple-500/20 to-violet-500/20",
      vitanaImpact: "+40 points"
    }
  ],
  labTests: [
    {
      id: "CT-304",
      title: "Biomarker Panel",
      description: "Advanced biomarker testing for longevity optimization",
      icon: TestTube2,
      color: "from-green-500/20 to-emerald-500/20",
      vitanaImpact: "+30 points"
    },
    {
      id: "CT-305", 
      title: "Genetic Testing",
      description: "Comprehensive genetic analysis for personalized health",
      icon: Microscope,
      color: "from-blue-500/20 to-indigo-500/20",
      vitanaImpact: "+35 points"
    }
  ],
  coaching: [
    {
      id: "CT-306",
      title: "Personal Training",
      description: "One-on-one fitness coaching sessions",
      icon: Target,
      color: "from-orange-500/20 to-amber-500/20",
      vitanaImpact: "+30 points"
    },
    {
      id: "CT-307",
      title: "Health Coaching",
      description: "Personalized lifestyle and wellness coaching",
      icon: UserCheck,
      color: "from-green-500/20 to-emerald-500/20",
      vitanaImpact: "+25 points"
    }
  ],
  groupPrograms: [
    {
      id: "CT-308",
      title: "Group Fitness",
      description: "Community fitness classes and challenges",
      icon: Users,
      color: "from-cyan-500/20 to-blue-500/20",
      suggestion: "3 people from your Longevity group joined this"
    },
    {
      id: "CT-309",
      title: "Wellness Challenges", 
      description: "Monthly community wellness challenges",
      icon: Target,
      color: "from-purple-500/20 to-violet-500/20",
      vitanaImpact: "+20 points"
    }
  ]
};

export default function WellnessServices() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("preventive");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const latestActions = getLatestActions(2);

  const handleServiceClick = (service: any) => {
    setSelectedService(service);
    setDrawerOpen(true);
  };

  const renderServiceCards = (services: any[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card 
            key={service.id} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105"
            onClick={() => handleServiceClick(service)}
          >
            <CardHeader className="pb-4">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                <service.icon className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {service.description}
                  </CardDescription>
                </div>
                {service.vitanaImpact && (
                  <Badge variant="secondary" className="ml-2 text-xs bg-emerald-100 text-emerald-700">
                    {service.vitanaImpact}
                  </Badge>
                )}
              </div>
              {service.suggestion && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">{service.suggestion}</p>
                </div>
              )}
              <div className="flex gap-2 pt-3">
                <Button size="sm" className="flex-1" onClick={(e) => e.stopPropagation()}>
                  Book
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={(e) => e.stopPropagation()}>
                  Add to Plan
                </Button>
                <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                  Ask AI
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <SEO title="Services HUB | Health" description="Access comprehensive healthcare and wellness services" canonical={window.location.href} />
      <SubNavigation items={healthSubItems} />
      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Shortened Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Services HUB 🏥</h1>
                <p className="text-muted-foreground">Book appointments, screenings, and wellness programs tailored to your needs.</p>
              </div>
            </div>
            
            {/* Autopilot Card with Live Badge Counter */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
              onClick={() => setAutopilotOpen(true)}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
                >
                  {pendingCount}
                </Badge>
              )}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                  {latestActions.map((action, index) => (
                    <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                      <span>{action.icon}</span>
                      <span className="truncate">{action.title}</span>
                    </div>
                  ))}
                  {pendingCount > 2 && (
                    <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                      +{pendingCount - 2} more actions
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Vitana Index Card - Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

          {/* Services Hub Content */}
          <div className="grid grid-cols-12 gap-6">
            {/* Navigation Tabs */}
            <div className="col-span-12 md:col-span-3">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Services</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                  <TabsList className="grid w-full grid-cols-1 gap-1 bg-transparent">
                    <TabsTrigger value="preventive" className="justify-start data-[state=active]:bg-primary/10">
                      Preventive Screenings
                    </TabsTrigger>
                    <TabsTrigger value="labTests" className="justify-start data-[state=active]:bg-primary/10">
                      Lab Tests
                    </TabsTrigger>
                    <TabsTrigger value="coaching" className="justify-start data-[state=active]:bg-primary/10">
                      Coaching & Personal Training
                    </TabsTrigger>
                    <TabsTrigger value="groupPrograms" className="justify-start data-[state=active]:bg-primary/10">
                      Group Programs & Challenges
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Content Area */}
            <div className="col-span-12 md:col-span-9">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="preventive" className="mt-0">
                {renderServiceCards(servicesData.preventive)}
              </TabsContent>
              <TabsContent value="labTests" className="mt-0">
                {renderServiceCards(servicesData.labTests)}
              </TabsContent>
              <TabsContent value="coaching" className="mt-0">
                {renderServiceCards(servicesData.coaching)}
              </TabsContent>
              <TabsContent value="groupPrograms" className="mt-0">
                {renderServiceCards(servicesData.groupPrograms)}
              </TabsContent>
            </Tabs>
            </div>
          </div>
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />

      <ServiceDetailDrawer
        service={selectedService}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </AppLayout>
  );
}