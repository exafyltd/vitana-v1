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
import { Stethoscope, Users, Target, Shield, Heart, Activity, Calendar, TestTube, UserCheck, Phone, FileText, CreditCard, Clock, Star, MessageSquare, TestTube2, Microscope, Package } from "lucide-react";

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
  medical: [
    {
      id: "CT-304",
      title: "Doctor",
      description: "Book appointments with specialists",
      icon: Stethoscope,
      color: "from-red-500/20 to-pink-500/20"
    },
    {
      id: "CT-305",
      title: "Telemed",
      description: "Virtual consultations available",
      icon: Phone,
      color: "from-indigo-500/20 to-purple-500/20"
    }
  ],
  wellness: [
    {
      id: "CT-306",
      title: "Coaching",
      description: "Personal health coaching sessions",
      icon: UserCheck,
      color: "from-green-500/20 to-emerald-500/20",
      vitanaImpact: "+20 points"
    },
    {
      id: "CT-307",
      title: "Training",
      description: "Fitness and movement training",
      icon: Target,
      color: "from-orange-500/20 to-amber-500/20",
      vitanaImpact: "+30 points"
    },
    {
      id: "CT-308",
      title: "Group Program",
      description: "Community wellness challenges",
      icon: Users,
      color: "from-cyan-500/20 to-blue-500/20",
      suggestion: "3 people from your Longevity group joined this"
    }
  ],
  insurance: [
    {
      id: "CT-309",
      title: "Coverage",
      description: "View your insurance coverage",
      icon: Shield,
      color: "from-teal-500/20 to-green-500/20"
    },
    {
      id: "CT-310",
      title: "Claim Log",
      description: "Track your insurance claims",
      icon: FileText,
      color: "from-slate-500/20 to-gray-500/20"
    },
    {
      id: "CT-311",
      title: "Submit Claim",
      description: "File new insurance claims",
      icon: CreditCard,
      color: "from-violet-500/20 to-purple-500/20"
    }
  ],
  myServices: [
    {
      id: "CT-312",
      title: "Booking History",
      description: "View past appointments and bookings",
      icon: Clock,
      color: "from-amber-500/20 to-orange-500/20"
    },
    {
      id: "CT-313",
      title: "Saved",
      description: "Your saved services and providers",
      icon: Star,
      color: "from-pink-500/20 to-rose-500/20"
    },
    {
      id: "CT-314",
      title: "Feedback",
      description: "Rate and review services",
      icon: MessageSquare,
      color: "from-indigo-500/20 to-blue-500/20"
    }
  ]
};

export default function WellnessServices() {
  const navigate = useNavigate();
  const { getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("preventive");

  const latestActions = getLatestActions(2);

  const renderServiceCards = (services: any[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card key={service.id} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105">
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
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-8 h-8 text-pink-500 drop-shadow-sm" />
              <h1 className="text-3xl font-bold text-foreground">Your comprehensive care hub! 🏥</h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Autopilot Card */}
              <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-white/20" onClick={() => setAutopilotOpen(true)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Health Autopilot</CardTitle>
                      <CardDescription className="text-sm">AI-powered health recommendations</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {latestActions.slice(0, 2).map((action, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="text-muted-foreground">{action.title}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-3 text-blue-600 hover:text-blue-700">
                    View all suggestions
                  </Button>
                </CardContent>
              </Card>

              {/* Vitana Index Card */}
              <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-white/20" onClick={() => navigate('/healthtracker/vitana-index')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Vitana Index</CardTitle>
                      <CardDescription className="text-sm">Your health score overview</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <VitanaIndexMini />
                </CardContent>
              </Card>
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
                        Preventive
                      </TabsTrigger>
                      <TabsTrigger value="medical" className="justify-start data-[state=active]:bg-primary/10">
                        Medical
                      </TabsTrigger>
                      <TabsTrigger value="wellness" className="justify-start data-[state=active]:bg-primary/10">
                        Wellness
                      </TabsTrigger>
                      <TabsTrigger value="insurance" className="justify-start data-[state=active]:bg-primary/10">
                        Insurance
                      </TabsTrigger>
                      <TabsTrigger value="myServices" className="justify-start data-[state=active]:bg-primary/10">
                        My Services
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
                <TabsContent value="medical" className="mt-0">
                  {renderServiceCards(servicesData.medical)}
                </TabsContent>
                <TabsContent value="wellness" className="mt-0">
                  {renderServiceCards(servicesData.wellness)}
                </TabsContent>
                <TabsContent value="insurance" className="mt-0">
                  {renderServiceCards(servicesData.insurance)}
                </TabsContent>
                <TabsContent value="myServices" className="mt-0">
                  {renderServiceCards(servicesData.myServices)}
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
    </AppLayout>
  );
}