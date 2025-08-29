import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { ServiceDetailSplitScreen } from "@/components/ui/split-screen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import ServiceDetailDrawer from "@/components/health/ServiceDetailDrawer";
import { healthNavigation } from "@/config/navigation";
import { Stethoscope, Users, Target, Shield, Heart, Activity, Calendar, TestTube, UserCheck, Phone, FileText, CreditCard, Clock, Star, MessageSquare, TestTube2, Microscope, Package, Plane, Apple, Dumbbell, Brain } from "lucide-react";

const servicesData = {
  preventiveScreenings: [
    {
      id: "CT-301",
      title: "Annual Physical Exam",
      description: "Comprehensive health checkup and screening",
      icon: Stethoscope,
      color: "from-emerald-500/20 to-green-500/20",
      vitanaImpact: "+25 points"
    },
    {
      id: "CT-302", 
      title: "Cancer Screening Package",
      description: "Early detection screenings for various cancers",
      icon: Microscope,
      color: "from-blue-500/20 to-cyan-500/20",
      vitanaImpact: "+30 points"
    },
    {
      id: "CT-303",
      title: "Cardiovascular Assessment", 
      description: "Heart health evaluation and risk assessment",
      icon: Heart,
      color: "from-red-500/20 to-pink-500/20",
      vitanaImpact: "+35 points"
    },
    {
      id: "CT-304",
      title: "Metabolic Health Panel",
      description: "Diabetes, cholesterol, and metabolic markers",
      icon: TestTube2,
      color: "from-purple-500/20 to-violet-500/20",
      vitanaImpact: "+30 points"
    }
  ],
  coachingTraining: [
    {
      id: "CT-305",
      title: "Personal Health Coach",
      description: "One-on-one lifestyle and wellness coaching",
      icon: UserCheck,
      color: "from-green-500/20 to-emerald-500/20",
      vitanaImpact: "+25 points"
    },
    {
      id: "CT-306", 
      title: "Nutrition Training",
      description: "Personalized nutrition education and meal planning",
      icon: Apple,
      color: "from-orange-500/20 to-amber-500/20",
      vitanaImpact: "+20 points"
    },
    {
      id: "CT-307",
      title: "Fitness Training",
      description: "Personal training and exercise program design",
      icon: Dumbbell,
      color: "from-blue-500/20 to-indigo-500/20",
      vitanaImpact: "+30 points"
    },
    {
      id: "CT-308",
      title: "Mental Wellness Coach",
      description: "Stress management and mental health support",
      icon: Brain,
      color: "from-purple-500/20 to-pink-500/20",
      vitanaImpact: "+25 points"
    }
  ],
  groupPrograms: [
    {
      id: "CT-309",
      title: "30-Day Wellness Challenge",
      description: "Community-based health improvement program",
      icon: Target,
      color: "from-cyan-500/20 to-blue-500/20",
      suggestion: "3 people from your Longevity group joined this",
      vitanaImpact: "+40 points"
    },
    {
      id: "CT-310",
      title: "Mindfulness Group Sessions",
      description: "Group meditation and stress reduction classes",
      icon: Users,
      color: "from-green-500/20 to-teal-500/20",
      vitanaImpact: "+20 points"
    },
    {
      id: "CT-311",
      title: "Cooking Class Series",
      description: "Healthy cooking workshops and meal prep",
      icon: Users,
      color: "from-yellow-500/20 to-orange-500/20",
      vitanaImpact: "+25 points"
    },
    {
      id: "CT-312",
      title: "Walking Group",
      description: "Local community walking and hiking group",
      icon: Activity,
      color: "from-emerald-500/20 to-green-500/20",
      suggestion: "Meets 3x per week in your area",
      vitanaImpact: "+15 points"
    }
  ]
};

export default function WellnessServices() {
  const [activeSection, setActiveSection] = useState("preventiveScreenings");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleServiceClick = (service: any) => {
    setSelectedService(service);
    setDrawerOpen(true);
  };

  const renderServiceCards = (services: any[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card 
            key={service.id} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
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
                {service.count && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {service.count}
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
      <SubNavigation items={healthNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-domain-health-tint via-background to-domain-health-tint/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Services HUB"
            description="Book appointments, screenings, and wellness programs tailored to your needs."
            emoji="🏥"
          />

          {/* Split-Screen Layout */}
          <ServiceDetailSplitScreen
            leftTitle="Service Categories"
            rightTitle={activeSection === "preventiveScreenings" ? "Preventive Screenings" : 
                       activeSection === "coachingTraining" ? "Coaching & Training" : "Group Programs & Challenges"}
            leftContent={
              <div className="space-y-2">
                <Button
                  variant={activeSection === "preventiveScreenings" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("preventiveScreenings")}
                >
                  <Microscope className="w-4 h-4 mr-2" />
                  Preventive Screenings
                </Button>
                <Button
                  variant={activeSection === "coachingTraining" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("coachingTraining")}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Coaching & Training
                </Button>
                <Button
                  variant={activeSection === "groupPrograms" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection("groupPrograms")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Group Programs & Challenges
                </Button>
              </div>
            }
            rightContent={
              <div className="space-y-4">
                {activeSection === "preventiveScreenings" && (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Early detection and prevention services to maintain optimal health</p>
                    </div>
                    {renderServiceCards(servicesData.preventiveScreenings)}
                  </div>
                )}
                
                {activeSection === "coachingTraining" && (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Personalized coaching and training programs for lasting lifestyle changes</p>
                    </div>
                    {renderServiceCards(servicesData.coachingTraining)}
                  </div>
                )}
                
                {activeSection === "groupPrograms" && (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Community-driven programs and challenges for motivation and support</p>
                    </div>
                    {renderServiceCards(servicesData.groupPrograms)}
                  </div>
                )}
              </div>
            }
          />
        </div>
      </div>

      <ServiceDetailDrawer
        service={selectedService}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </AppLayout>
  );
}