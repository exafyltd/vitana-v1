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
      <SEO title="Memory Permissions | VITANA Memory" description="Manage privacy, access, and security settings for your health memories and wellness data." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Memory Permissions"
          description="Manage privacy, access, and security settings for your health memories."
          emoji="🔒"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search privacy and security settings..." />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionPopupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Manage Access
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="privacy">🔐 Privacy Settings</SplitBarTrigger>
            <SplitBarTrigger value="access">👥 Data Access</SplitBarTrigger>
            <SplitBarTrigger value="security">🛡️ Security Features</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="privacy">
            <div className="mt-6">
              {/* Privacy Settings Card with toggles */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 mb-6">
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>Control your data privacy and sharing preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">AI Analysis Enabled</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Research Participation</span>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Community Sharing</span>
                    <Switch defaultChecked />
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
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 mb-6">
                <CardHeader>
                  <CardTitle>Data Access</CardTitle>
                  <CardDescription>Manage who can access your health memories</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Healthcare Providers</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Emergency Access</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Family Members</span>
                    <Switch />
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