import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import ServiceDetailDrawer from "@/components/health/ServiceDetailDrawer";
import { healthNavigation } from "@/config/navigation";
import { Stethoscope, Users, Target, Shield, Heart, Activity, Calendar, TestTube, UserCheck, Phone, FileText, CreditCard, Clock, Star, MessageSquare, TestTube2, Microscope, Package, Plane } from "lucide-react";

const servicesData = {
  preventive: [
    {
      id: "CT-301",
      title: "Annual Physical",
      description: "Comprehensive health checkup and screening",
      icon: Stethoscope,
      color: "from-emerald-500/20 to-green-500/20",
      vitanaImpact: "+25 points"
    },
    {
      id: "CT-302", 
      title: "Cancer Screening",
      description: "Early detection screenings for various cancers",
      icon: Microscope,
      color: "from-blue-500/20 to-cyan-500/20",
      vitanaImpact: "+30 points"
    },
    {
      id: "CT-303",
      title: "Wellness Package", 
      description: "Complete preventive care bundle",
      icon: Package,
      color: "from-purple-500/20 to-violet-500/20",
      vitanaImpact: "+40 points"
    }
  ],
  medical: [
    {
      id: "CT-304",
      title: "Specialist Consultation",
      description: "Expert medical consultations and second opinions",
      icon: UserCheck,
      color: "from-red-500/20 to-pink-500/20",
      vitanaImpact: "+20 points"
    },
    {
      id: "CT-305", 
      title: "Lab Tests",
      description: "Comprehensive blood work and diagnostics",
      icon: TestTube,
      color: "from-blue-500/20 to-indigo-500/20",
      vitanaImpact: "+25 points"
    },
    {
      id: "CT-306",
      title: "Imaging Services",
      description: "MRI, CT, X-ray and other diagnostic imaging",
      icon: Activity,
      color: "from-gray-500/20 to-slate-500/20",
      vitanaImpact: "+15 points"
    }
  ],
  wellness: [
    {
      id: "CT-307",
      title: "Personal Training",
      description: "One-on-one fitness coaching sessions",
      icon: Target,
      color: "from-orange-500/20 to-amber-500/20",
      vitanaImpact: "+30 points"
    },
    {
      id: "CT-308",
      title: "Health Coaching",
      description: "Personalized lifestyle and wellness coaching",
      icon: Heart,
      color: "from-green-500/20 to-emerald-500/20",
      vitanaImpact: "+25 points"
    },
    {
      id: "CT-309",
      title: "Group Programs",
      description: "Community wellness classes and challenges",
      icon: Users,
      color: "from-cyan-500/20 to-blue-500/20",
      suggestion: "3 people from your Longevity group joined this"
    }
  ],
  insurance: [
    {
      id: "CT-310",
      title: "Coverage Review",
      description: "Review and optimize your health insurance",
      icon: Shield,
      color: "from-indigo-500/20 to-purple-500/20",
      vitanaImpact: "+10 points"
    },
    {
      id: "CT-311",
      title: "Claims Support",
      description: "Help with insurance claims and reimbursements",
      icon: FileText,
      color: "from-yellow-500/20 to-orange-500/20",
      vitanaImpact: "+5 points"
    },
    {
      id: "CT-312",
      title: "HSA/FSA Planning",
      description: "Maximize your health savings accounts",
      icon: CreditCard,
      color: "from-teal-500/20 to-cyan-500/20",
      vitanaImpact: "+15 points"
    }
  ],
  myServices: [
    {
      id: "CT-313",
      title: "Upcoming Appointments",
      description: "View and manage your scheduled services",
      icon: Calendar,
      color: "from-violet-500/20 to-purple-500/20",
      count: "3 this week"
    },
    {
      id: "CT-314",
      title: "Service History",
      description: "Track your completed services and results",
      icon: Clock,
      color: "from-gray-500/20 to-slate-500/20",
      count: "12 completed"
    },
    {
      id: "CT-315",
      title: "Favorites",
      description: "Quick access to your preferred services",
      icon: Star,
      color: "from-yellow-500/20 to-amber-500/20",
      count: "5 saved"
    }
  ]
};

export default function WellnessServices() {
  const [activeTab, setActiveTab] = useState("preventive");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="preventive">Preventive</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="wellness">Wellness</TabsTrigger>
              <TabsTrigger value="insurance">Insurance</TabsTrigger>
              <TabsTrigger value="myServices">My Services</TabsTrigger>
            </TabsList>

            <TabsContent value="preventive" className="mt-6">
              {renderServiceCards(servicesData.preventive)}
            </TabsContent>

            <TabsContent value="medical" className="mt-6">
              {renderServiceCards(servicesData.medical)}
            </TabsContent>

            <TabsContent value="wellness" className="mt-6">
              {renderServiceCards(servicesData.wellness)}
            </TabsContent>

            <TabsContent value="insurance" className="mt-6">
              {renderServiceCards(servicesData.insurance)}
            </TabsContent>

            <TabsContent value="myServices" className="mt-6">
              {renderServiceCards(servicesData.myServices)}
            </TabsContent>
          </Tabs>
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