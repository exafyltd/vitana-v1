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
import { useTranslation } from "@/hooks/useTranslation";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Eye, Settings, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import ManageConsentPopup from "@/components/ManageConsentPopup";
import { t } from '@/lib/i18n-toast';

const consentData = {
  activeConsents: [
    {
      id: 1,
      organization: "Vitana Health Research Institute",
      purpose: "Health Analytics & Personalized Recommendations",
      dataTypes: ["Health Tracking", "Lab Results", "Activity Data"],
      grantedDate: "2024-01-15",
      expiryDate: "2024-07-15",
      status: "active",
      canRevoke: true
    },
    {
      id: 2,
      organization: "Mayo Clinic Research Network",
      purpose: "Chronic Disease Prevention Study",
      dataTypes: ["Biomarkers", "Medical History", "Lifestyle Data"],
      grantedDate: "2024-01-10",
      expiryDate: "2024-12-31",
      status: "active",
      canRevoke: true
    },
    {
      id: 3,
      organization: "Stanford Medicine AI Lab",
      purpose: "Cardiovascular Risk Assessment Model",
      dataTypes: ["Heart Rate", "Blood Pressure", "Exercise Data"],
      grantedDate: "2024-01-05",
      expiryDate: "2025-01-05",
      status: "active",
      canRevoke: false
    }
  ],
  pendingRequests: [
    {
      id: 4,
      organization: "Johns Hopkins Digital Health Center",
      purpose: "Diabetes Prevention Program",
      dataTypes: ["Glucose Data", "Diet Tracking", "Weight Measurements"],
      requestedDate: "2024-01-20",
      expiryDate: "2024-06-20"
    },
    {
      id: 5,
      organization: "Harvard T.H. Chan School of Public Health",
      purpose: "Environmental Health Impact Study",
      dataTypes: ["Location Data", "Air Quality Exposure", "Health Symptoms"],
      requestedDate: "2024-01-18",
      expiryDate: "2025-01-18"
    }
  ]
};

export default withScreenId(function Consent() {
  const [activeTab, setActiveTab] = useState("active");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const { translate } = useTranslation();

  return (
    <AppLayout>
      <SEO title={t('screens.sharing.consentDashboardSharing')} description="Manage your data sharing consents, view active permissions, and control how your health data is used." />
      <SubNavigation items={sharingNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.sharing.dataConsentControl')}
            description="Manage permissions and control how your health data is shared securely"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={translate('consent.searchPlaceholder', 'Search consent packages, organizations, permissions...')} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('screens.sharing.manageConsent')}
            </Button>
          </UtilityActionButton>
      <SplitBar value={activeTab} onValueChange={setActiveTab}>
        <SplitBarList>
          <SplitBarTrigger value="active">{t('screens.sharing.activeConsents')}</SplitBarTrigger>
          <SplitBarTrigger value="pending">{t('screens.sharing.pendingRequests')}</SplitBarTrigger>
          <SplitBarTrigger value="overview">{t('screens.sharing.privacyOverview')}</SplitBarTrigger>
        </SplitBarList>
        
        <SplitBarContent value="active">
          <div className="mt-6 grid grid-cols-12 gap-6">
            {/* Active Consents - Full Width Cards */}
            <div className="col-span-12">
              <div className="space-y-4">
                {consentData.activeConsents.map((consent) => (
                  <Card key={consent.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{consent.organization}</CardTitle>
                          <CardDescription>{consent.purpose}</CardDescription>
                        </div>
                        <Badge variant="secondary">{t('screens.sharing.active')}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">{t('screens.sharing.dataTypesShared')}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {consent.dataTypes.map((type, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">{t('screens.sharing.accessPeriod')}</div>
                          <div className="text-sm">{t('screens.sharing.granteddateExpirydate', { grantedDate: consent.grantedDate, expiryDate: consent.expiryDate })}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch disabled={!consent.canRevoke} />
                            <span className="text-sm">{t('screens.sharing.dataSharingEnabled')}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t('screens.sharing.viewDetails')}
                          </Button>
                          {consent.canRevoke ? (
                            <Button variant="outline" size="sm">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              {t('screens.sharing.revokeAccess')}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              {t('screens.sharing.cannotRevoke')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </SplitBarContent>
        
        <SplitBarContent value="pending">
          <div className="mt-6 grid grid-cols-12 gap-6">
            {/* Pending Requests - Full Width Cards */}
            <div className="col-span-12">
              <div className="space-y-4">
                {consentData.pendingRequests.map((request) => (
                  <Card key={request.id} className="border-orange-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{request.organization}</CardTitle>
                          <CardDescription>{request.purpose}</CardDescription>
                        </div>
                        <Badge variant="outline">{t('screens.sharing.pending')}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">{t('screens.sharing.requestedDataTypes')}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {request.dataTypes.map((type, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">{t('screens.sharing.proposedAccessPeriod')}</div>
                          <div className="text-sm">{t('screens.sharing.requesteddateExpirydate', { requestedDate: request.requestedDate, expiryDate: request.expiryDate })}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-sm text-muted-foreground">{t('screens.sharing.requestedRequesteddate', { requestedDate: request.requestedDate })}</div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t('screens.sharing.reviewDetails')}
                          </Button>
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t('screens.sharing.approve')}
                          </Button>
                          <Button variant="outline" size="sm">
                            {t('screens.sharing.decline')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </SplitBarContent>
        
        <SplitBarContent value="overview">
          <div className="mt-6 grid grid-cols-12 gap-6">
            {/* Big + Small + Small Pattern (6+3+3) */}
            <div className="col-span-12 lg:col-span-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    {t('screens.sharing.privacyProtectionStatus')}
                  </CardTitle>
                  <CardDescription>{t('screens.sharing.yourDataSecurityConsentOverview')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-green-600">100%</div>
                  <p className="text-sm text-muted-foreground">{t('screens.sharing.allDataEncryptedSecured')}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('screens.sharing.activeConsents')}</span>
                      <span className="font-medium">{consentData.activeConsents.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('screens.sharing.pendingRequests')}</span>
                      <span className="font-medium text-orange-600">{consentData.pendingRequests.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('screens.sharing.revokedAccess')}</span>
                      <span className="font-medium">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="col-span-12 sm:col-span-6 lg:col-span-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('screens.sharing.activeConsents')}</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{consentData.activeConsents.length}</div>
                  <p className="text-xs text-muted-foreground">{t('screens.sharing.organizationsWithAccess')}</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="col-span-12 sm:col-span-6 lg:col-span-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('screens.sharing.pendingRequests')}</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{consentData.pendingRequests.length}</div>
                  <p className="text-xs text-muted-foreground">{t('screens.sharing.awaitingYourDecision')}</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Actions - Full Width Row */}
            <div className="col-span-12">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.sharing.quickActions')}</CardTitle>
                  <CardDescription>{t('screens.sharing.manageYourPrivacySettingsConsentHistory')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button>
                      <Settings className="h-4 w-4 mr-2" />
                      {t('screens.sharing.privacySettings')}
                    </Button>
                    <Button variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      {t('screens.sharing.viewAllActivity')}
                    </Button>
                    <Button variant="outline">{t('screens.sharing.downloadConsentHistory')}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SplitBarContent>
      </SplitBar>

          <ManageConsentPopup 
            isOpen={actionPopupOpen} 
            onClose={() => setActionPopupOpen(false)} 
          />
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_CONSENT);