import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Share2, Download, Eye, Calendar, Users } from "lucide-react";
import { CreatePackagePopup } from "@/components/CreatePackagePopup";
import { t } from '@/lib/i18n-toast';

const packageData = {
  myPackages: [
    {
      id: 1,
      name: "Comprehensive Health Profile",
      description: "Complete health overview including biomarkers, vitals, and lifestyle data",
      dataTypes: ["Lab Results", "Vital Signs", "Activity Data", "Sleep Patterns", "Nutrition"],
      dateRange: "Last 6 months",
      createdDate: "2024-01-15",
      size: "2.4 MB",
      recipients: ["Dr. Sarah Johnson", "Mayo Clinic Research"]
    },
    {
      id: 2,
      name: "Cardiovascular Risk Assessment Package",
      description: "Focused data package for heart health evaluation",
      dataTypes: ["Blood Pressure", "Cholesterol", "ECG Data", "Exercise Performance"],
      dateRange: "Last 12 months",
      createdDate: "2024-01-10",
      size: "1.8 MB",
      recipients: ["Stanford Cardiology Center"]
    },
    {
      id: 3,
      name: "Diabetes Management Data",
      description: "Glucose monitoring and related health metrics",
      dataTypes: ["Glucose Levels", "HbA1c", "Medication Adherence", "Diet Tracking"],
      dateRange: "Last 3 months",
      createdDate: "2024-01-08",
      size: "950 KB",
      recipients: ["Endocrinology Associates"]
    }
  ],
  templates: [
    {
      id: 1,
      name: "Basic Health Summary",
      description: "Essential health metrics for routine consultations",
      dataTypes: ["Recent Lab Results", "Current Medications", "Vital Signs"],
      useCase: "Primary care visits"
    },
    {
      id: 2,
      name: "Research Participation Package",
      description: "Comprehensive data set for clinical research",
      dataTypes: ["Complete Medical History", "Biomarkers", "Lifestyle Data", "Genetic Information"],
      useCase: "Clinical studies and research"
    },
    {
      id: 3,
      name: "Specialist Consultation Package",
      description: "Targeted data for specialist appointments",
      dataTypes: ["Relevant Lab Results", "Imaging Data", "Previous Treatments", "Symptoms Log"],
      useCase: "Specialist referrals"
    }
  ]
};

export default withScreenId(function Packages() {
  const [activeTab, setActiveTab] = useState("my-packages");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO 
        title={t('screens.sharing.dataPackagesSharing')} 
        description="Create, manage, and share customized health data packages with healthcare providers and researchers."
        canonical={window.location.href}
      />
      <SubNavigation items={sharingNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title={t('screens.sharing.dataPackages')}
            description="Create and manage customized health data packages for sharing with healthcare providers"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.sharing.searchPackagesTemplates')} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('screens.sharing.createPackage')}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="my-packages">{t('screens.sharing.myPackages')}</SplitBarTrigger>
              <SplitBarTrigger value="templates">{t('screens.sharing.templates')}</SplitBarTrigger>
              <SplitBarTrigger value="create-custom">{t('screens.sharing.createCustom')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="my-packages">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {packageData.myPackages.map((pkg) => (
                  <div key={pkg.id} className="col-span-1">
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{pkg.name}</CardTitle>
                            <CardDescription>{pkg.description}</CardDescription>
                          </div>
                          <Badge variant="outline">{pkg.size}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">{t('screens.sharing.dataTypesIncluded')}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pkg.dataTypes.map((type, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">{type}</Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-muted-foreground">{t('screens.sharing.dateRange')}</div>
                            <div>{pkg.dateRange}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">{t('screens.sharing.created')}</div>
                            <div>{pkg.createdDate}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">{t('screens.sharing.sharedWith')}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pkg.recipients.map((recipient, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {recipient}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t('screens.sharing.preview')}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            {t('screens.sharing.download')}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4 mr-2" />
                            {t('screens.sharing.share')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </SplitBarContent>

            <SplitBarContent value="templates">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {packageData.templates.map((template) => (
                  <div key={template.id} className="col-span-1">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">{t('screens.sharing.includedDataTypes')}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {template.dataTypes.map((type, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">{t('screens.sharing.bestFor2')}</div>
                          <div className="text-sm">{template.useCase}</div>
                        </div>
                        
                        <Button className="w-full" size="sm">
                          <Package className="h-4 w-4 mr-2" />
                          {t('screens.sharing.useTemplate')}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </SplitBarContent>

            <SplitBarContent value="create-custom">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {t('screens.sharing.createCustomPackage')}
                      </CardTitle>
                      <CardDescription>
                        {t('screens.sharing.buildPersonalizedDataPackageWithSpecific')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">{t('screens.sharing.createCustomDataPackageBySelecting')}
                      </div>
                      
                      <div className="flex gap-4">
                        <Button size="sm">
                          <Package className="h-4 w-4 mr-2" />
                          {t('screens.sharing.startCustomPackage')}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          {t('screens.sharing.previewAvailableData')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>

          <CreatePackagePopup 
            isOpen={actionPopupOpen} 
            onClose={() => setActionPopupOpen(false)}
          />
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_PACKAGES);