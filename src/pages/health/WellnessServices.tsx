import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { ServicesMasterActionPopup } from "@/components/ServicesMasterActionPopup";
import { ServiceDetailSplitScreen } from "@/components/ui/split-screen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import ServiceDetailDrawer from "@/components/health/ServiceDetailDrawer";
import { healthNavigation } from "@/config/navigation";
import { Stethoscope, Users, Target, Shield, Heart, Activity, Calendar, TestTube, UserCheck, Phone, FileText, CreditCard, Clock, Star, MessageSquare, TestTube2, Microscope, Package, Plane, Apple, Dumbbell, Brain, Briefcase, BookOpen, Plus } from "lucide-react";
import { t } from '@/lib/i18n-toast';

const servicesData = {
  preventiveCare: [
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
  medicalServices: [
    {
      id: "CT-305",
      title: "Specialist Consultation",
      description: "Connect with medical specialists",
      icon: UserCheck,
      color: "from-blue-500/20 to-indigo-500/20",
      vitanaImpact: "+20 points"
    },
    {
      id: "CT-306", 
      title: "Telemedicine",
      description: "Virtual consultations with healthcare providers",
      icon: Phone,
      color: "from-green-500/20 to-emerald-500/20",
      vitanaImpact: "+15 points"
    },
    {
      id: "CT-307",
      title: "Lab Tests & Diagnostics",
      description: "Comprehensive laboratory testing services",
      icon: TestTube,
      color: "from-purple-500/20 to-violet-500/20",
      vitanaImpact: "+25 points"
    },
    {
      id: "CT-308",
      title: "Prescription Management",
      description: "Medication reviews and management",
      icon: Package,
      color: "from-orange-500/20 to-amber-500/20",
      vitanaImpact: "+20 points"
    }
  ],
  wellnessPrograms: [
    {
      id: "CT-309",
      title: "Nutrition Coaching",
      description: "Personalized nutrition education and meal planning",
      icon: Apple,
      color: "from-orange-500/20 to-amber-500/20",
      vitanaImpact: "+20 points"
    },
    {
      id: "CT-310",
      title: "Fitness Training",
      description: "Personal training and exercise program design",
      icon: Dumbbell,
      color: "from-blue-500/20 to-indigo-500/20",
      vitanaImpact: "+30 points"
    },
    {
      id: "CT-311",
      title: "Mental Wellness Coach",
      description: "Stress management and mental health support",
      icon: Brain,
      color: "from-purple-500/20 to-pink-500/20",
      vitanaImpact: "+25 points"
    },
    {
      id: "CT-312",
      title: "30-Day Wellness Challenge",
      description: "Community-based health improvement program",
      icon: Target,
      color: "from-cyan-500/20 to-blue-500/20",
      suggestion: "3 people from your Longevity group joined this",
      vitanaImpact: "+40 points"
    }
  ],
  insuranceSupport: [
    {
      id: "CT-313",
      title: "Claims Processing",
      description: "Help with insurance claims and documentation",
      icon: FileText,
      color: "from-blue-500/20 to-cyan-500/20",
      vitanaImpact: "+10 points"
    },
    {
      id: "CT-314",
      title: "Coverage Verification",
      description: "Verify insurance coverage for services",
      icon: Shield,
      color: "from-green-500/20 to-emerald-500/20",
      vitanaImpact: "+5 points"
    },
    {
      id: "CT-315",
      title: "Pre-Authorization",
      description: "Assistance with medical pre-authorizations",
      icon: Briefcase,
      color: "from-purple-500/20 to-violet-500/20",
      vitanaImpact: "+15 points"
    },
    {
      id: "CT-316",
      title: "Payment Plans",
      description: "Flexible payment options for medical services",
      icon: CreditCard,
      color: "from-orange-500/20 to-amber-500/20",
      vitanaImpact: "+5 points"
    }
  ],
  myServices: [
    {
      id: "CT-317",
      title: "My Appointments",
      description: "View and manage your upcoming appointments",
      icon: Calendar,
      color: "from-green-500/20 to-emerald-500/20",
      count: "3 upcoming"
    },
    {
      id: "CT-318",
      title: "Service History",
      description: "Review your past services and treatments",
      icon: Clock,
      color: "from-blue-500/20 to-cyan-500/20",
      count: "12 completed"
    },
    {
      id: "CT-319",
      title: "My Providers",
      description: "Manage your healthcare provider network",
      icon: Users,
      color: "from-purple-500/20 to-violet-500/20",
      count: "5 providers"
    },
    {
      id: "CT-320",
      title: "Health Records",
      description: "Access your complete health records",
      icon: BookOpen,
      color: "from-orange-500/20 to-amber-500/20"
    }
  ]
};

export default function WellnessServices() {
  const [activeSection, setActiveSection] = useState("preventiveCare");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [servicesActionsOpen, setServicesActionsOpen] = useState(false);
  const { translate } = useTranslation();

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
      <SEO title={t('screens.health.servicesHubHealth')} description="Access comprehensive healthcare and wellness services" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.health.servicesHub')}
            description="Book appointments, screenings, and wellness programs tailored to your needs."
            emoji="🏥"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={translate('wellnessServices.searchPlaceholder', 'Search services, providers, or programs...')} />
            <UniversalCalendarButton />
            <Button
              variant="default"
              size="sm"
              onClick={() => setServicesActionsOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Service Actions
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeSection} onValueChange={setActiveSection} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="preventiveCare">{t('screens.health.preventiveCare')}</SplitBarTrigger>
              <SplitBarTrigger value="medicalServices">{t('screens.health.medicalServices')}</SplitBarTrigger>
              <SplitBarTrigger value="wellnessPrograms">{t('screens.health.wellnessPrograms')}</SplitBarTrigger>
              <SplitBarTrigger value="insuranceSupport">{t('screens.health.insuranceSupport')}</SplitBarTrigger>
              <SplitBarTrigger value="myServices">{t('screens.health.myServices')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="preventiveCare">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.earlyDetectionPreventionServicesMaintainOptimal')}</p>
                </div>
                {renderServiceCards(servicesData.preventiveCare)}
              </div>
            </SplitBarContent>

            <SplitBarContent value="medicalServices">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.professionalMedicalServicesConsultations')}</p>
                </div>
                {renderServiceCards(servicesData.medicalServices)}
              </div>
            </SplitBarContent>

            <SplitBarContent value="wellnessPrograms">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.personalizedWellnessProgramsForLastingLifestyle')}</p>
                </div>
                {renderServiceCards(servicesData.wellnessPrograms)}
              </div>
            </SplitBarContent>

            <SplitBarContent value="insuranceSupport">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.insuranceBillingSupportServices')}</p>
                </div>
                {renderServiceCards(servicesData.insuranceSupport)}
              </div>
            </SplitBarContent>

            <SplitBarContent value="myServices">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.manageYourPersonalServicesAppointments')}</p>
                </div>
                {renderServiceCards(servicesData.myServices)}
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <ServiceDetailDrawer
        service={selectedService}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      
      <ServicesMasterActionPopup
        open={servicesActionsOpen}
        onOpenChange={setServicesActionsOpen}
      />
    </AppLayout>
  );
}