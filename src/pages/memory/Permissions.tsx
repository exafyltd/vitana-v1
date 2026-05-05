import { useState } from 'react';
import { Plus } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { NewsCard } from "@/components/crossover/NewsCard";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { PermissionsMasterActionPopup } from "@/components/memory/PermissionsMasterActionPopup";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { t } from '@/lib/i18n-toast';

// Mock data for privacy settings information
const privacySettings = [
  {
    title: "Data Encryption & Security 🔐",
    description: "Your health memories are protected with end-to-end encryption and secure cloud storage",
    imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop",
    pillar: "Security",
    author: { name: "Privacy Team", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Always Active"
  },
  {
    title: "AI Analysis Preferences 🤖",
    description: "Control how artificial intelligence processes your wellness data for personalized insights",
    imageUrl: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=600&fit=crop",
    pillar: "AI Privacy",
    author: { name: "AI Ethics", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Customizable"
  },
  {
    title: "Data Sharing Controls 🤝",
    description: "Manage which wellness communities and research initiatives can access your anonymized data",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop",
    pillar: "Sharing",
    author: { name: "Data Governance", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Your Choice"
  }
];

// Access control information
const accessControls = [
  {
    title: "Healthcare Provider Access 🩺",
    description: "Share specific health memories with your doctors and medical team for better care",
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop",
    pillar: "Healthcare",
    author: { name: "Medical Integration", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Secure Portal"
  },
  {
    title: "Research Participation 🔬",
    description: "Contribute to wellness research studies while maintaining complete anonymity and control",
    imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop",
    pillar: "Research",
    author: { name: "Research Ethics", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Voluntary"
  },
  {
    title: "Emergency Access Protocols 🚨",
    description: "Configure emergency access to critical health information for medical emergencies",
    imageUrl: "https://images.unsplash.com/photo-1576669801820-6ea9fa584fb0?w=800&h=600&fit=crop",
    pillar: "Emergency",
    author: { name: "Emergency Services", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Life-saving Access"
  }
];

// Security features information
const securityFeatures = [
  {
    title: "Biometric Authentication 👆",
    description: "Secure your memories with fingerprint, face recognition, or voice authentication",
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
    pillar: "Security",
    author: { name: "Biometric Security", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Advanced Protection"
  },
  {
    title: "Access Audit Trail 📊", 
    description: "Monitor and review every access to your health memories with detailed audit logs",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
    pillar: "Audit",
    author: { name: "Security Monitoring", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Real-time Tracking"
  },
  {
    title: "Data Portability & Control 📤",
    description: "Export, delete, or transfer your health memories at any time with complete ownership rights",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fff8c4e96c9b?w=800&h=600&fit=crop",
    pillar: "Control",
    author: { name: "Data Rights", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Your Data, Your Choice"
  }
];

function Permissions() {
  const [activeTab, setActiveTab] = useState("privacy");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title={t('screens.memory.memoryPermissionsVitanaMemory')} description="Manage privacy, access, and security settings for your health memories and wellness data." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title={t('screens.memory.memoryPermissions')}
          description="Manage privacy, access, and security settings for your health memories."
          emoji="🔒"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder={t('screens.memory.searchPrivacySecuritySettings')} />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('screens.memory.manageAccess')}
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="privacy">{t('screens.memory.privacySettings')}</SplitBarTrigger>
            <SplitBarTrigger value="access">{t('screens.memory.dataAccess')}</SplitBarTrigger>
            <SplitBarTrigger value="security">{t('screens.memory.securityFeatures')}</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="privacy">
            <div className="mt-6">

              {/* Privacy Settings Card with toggles */}
              <Card className="bg-gradient-to-br from-white/65 to-[#f0f7fa]/40 dark:from-slate-900/65 dark:to-slate-800/40 border-border/30 mb-6 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-2 pt-3 px-5">
                  <CardTitle className="text-base">{t('screens.memory.privacySettings2')}</CardTitle>
                  <CardDescription className="text-xs">{t('screens.memory.controlYourDataPrivacySharingPreferences')}</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-0">
                  {/* Two-column grid layout for toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="group transition-all duration-300 hover:translate-x-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🧠</span>
                          <span className="text-sm font-medium">{t('screens.memory.aiAnalysisEnabled')}</span>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/80" />
                      </div>
                      <span className="text-xs text-muted-foreground ml-8 block">{t('screens.memory.personalizedInsights')}</span>
                    </div>

                    <div className="group transition-all duration-300 hover:translate-x-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🧪</span>
                          <span className="text-sm font-medium">{t('screens.memory.researchParticipation')}</span>
                        </div>
                        <Switch className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/80" />
                      </div>
                      <span className="text-xs text-muted-foreground ml-8 block">{t('screens.memory.contributeResearch')}</span>
                    </div>

                    <div className="group transition-all duration-300 hover:translate-x-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🌐</span>
                          <span className="text-sm font-medium">{t('screens.memory.communitySharing')}</span>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/80" />
                      </div>
                      <span className="text-xs text-muted-foreground ml-8 block">{t('screens.memory.shareAnonymously')}</span>
                    </div>
                  </div>
                  
                  {/* Translucent Footer Bar */}
                  <div className="mt-2 -mx-5 px-5 py-2 bg-muted/30 backdrop-blur-sm border-t border-border/40 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('screens.memory.yourPrivacySettingsEncryptedCanModified')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Row 1: Privacy Settings (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={privacySettings[0]?.title || ""}
                    description={privacySettings[0]?.description}
                    imageUrl={privacySettings[0]?.imageUrl || ""}
                    category="wellness"
                    pillar={privacySettings[0]?.pillar}
                    author={privacySettings[0]?.author}
                    timestamp={privacySettings[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={privacySettings[1]?.title || ""}
                    description={privacySettings[1]?.description}
                    imageUrl={privacySettings[1]?.imageUrl || ""}
                    category="wellness"
                    pillar={privacySettings[1]?.pillar}
                    author={privacySettings[1]?.author}
                    timestamp={privacySettings[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={privacySettings[2]?.title || ""}
                    description={privacySettings[2]?.description}
                    imageUrl={privacySettings[2]?.imageUrl || ""}
                    category="wellness"
                    pillar={privacySettings[2]?.pillar}
                    author={privacySettings[2]?.author}
                    timestamp={privacySettings[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="guidance" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="access">
            <div className="mt-6">

              {/* Data Access Card with toggles */}
              <Card className="bg-gradient-to-br from-white/65 to-[#f0f7fa]/40 dark:from-slate-900/65 dark:to-slate-800/40 border-border/30 mb-6 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-2 pt-3 px-5">
                  <CardTitle className="text-base">{t('screens.memory.dataAccess2')}</CardTitle>
                  <CardDescription className="text-xs">{t('screens.memory.manageWhoCanAccessYourHealth')}</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-0">
                  {/* Two-column grid layout for toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="group transition-all duration-300 hover:translate-x-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🏥</span>
                          <span className="text-sm font-medium">{t('screens.memory.healthcareProviders')}</span>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/80" />
                      </div>
                      <span className="text-xs text-muted-foreground ml-8 block">{t('screens.memory.medicalProfessionalsOnly')}</span>
                    </div>

                    <div className="group transition-all duration-300 hover:translate-x-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🚨</span>
                          <span className="text-sm font-medium">{t('screens.memory.emergencyAccess')}</span>
                        </div>
                        <Switch defaultChecked className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/80" />
                      </div>
                      <span className="text-xs text-muted-foreground ml-8 block">{t('screens.memory.firstRespondersAccess')}</span>
                    </div>

                    <div className="group transition-all duration-300 hover:translate-x-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">👨‍👩‍👧‍👦</span>
                          <span className="text-sm font-medium">{t('screens.memory.familyMembers')}</span>
                        </div>
                        <Switch className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/80" />
                      </div>
                      <span className="text-xs text-muted-foreground ml-8 block">{t('screens.memory.trustedFamilyContacts')}</span>
                    </div>
                  </div>
                  
                  {/* Translucent Footer Bar */}
                  <div className="mt-2 -mx-5 px-5 py-2 bg-muted/30 backdrop-blur-sm border-t border-border/40 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t('screens.memory.accessPermissionsAuditedRegularlyYouCan')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Row 1: Access Controls (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={accessControls[0]?.title || ""}
                    description={accessControls[0]?.description}
                    imageUrl={accessControls[0]?.imageUrl || ""}
                    category="wellness"
                    pillar={accessControls[0]?.pillar}
                    author={accessControls[0]?.author}
                    timestamp={accessControls[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={accessControls[1]?.title || ""}
                    description={accessControls[1]?.description}
                    imageUrl={accessControls[1]?.imageUrl || ""}
                    category="wellness"
                    pillar={accessControls[1]?.pillar}
                    author={accessControls[1]?.author}
                    timestamp={accessControls[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={accessControls[2]?.title || ""}
                    description={accessControls[2]?.description}
                    imageUrl={accessControls[2]?.imageUrl || ""}
                    category="wellness"
                    pillar={accessControls[2]?.pillar}
                    author={accessControls[2]?.author}
                    timestamp={accessControls[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="partnership" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="security">
            <div className="mt-6">
              {/* Row 1: Security Features (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={securityFeatures[0]?.title || ""}
                    description={securityFeatures[0]?.description}
                    imageUrl={securityFeatures[0]?.imageUrl || ""}
                    category="wellness"
                    pillar={securityFeatures[0]?.pillar}
                    author={securityFeatures[0]?.author}
                    timestamp={securityFeatures[0]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={securityFeatures[1]?.title || ""}
                    description={securityFeatures[1]?.description}
                    imageUrl={securityFeatures[1]?.imageUrl || ""}
                    category="wellness"
                    pillar={securityFeatures[1]?.pillar}
                    author={securityFeatures[1]?.author}
                    timestamp={securityFeatures[1]?.timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={securityFeatures[2]?.title || ""}
                    description={securityFeatures[2]?.description}
                    imageUrl={securityFeatures[2]?.imageUrl || ""}
                    category="wellness"
                    pillar={securityFeatures[2]?.pillar}
                    author={securityFeatures[2]?.author}
                    timestamp={securityFeatures[2]?.timestamp}
                    className="h-full"
                  />
                </div>
              </div>

              <MotivationalBanner variant="achievement" />
            </div>
          </SplitBarContent>
        </SplitBar>

        <PermissionsMasterActionPopup 
          open={actionPopupOpen}
          onOpenChange={setActionPopupOpen}
        />
      </div>
    </AppLayout>
  );
}

export default withScreenId(Permissions, SCREEN_IDS.MEMORY_PERMISSIONS);