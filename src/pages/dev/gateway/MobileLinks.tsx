import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Smartphone, Link, QrCode, Plus } from "lucide-react";
import { devGatewayNavigation } from "@/config/dev-navigation";

export default function GatewayMobileLinks() {
  const [activeTab, setActiveTab] = useState("registry");

  return (
    <>
      <SEO 
        title="Vitana DEV — Mobile Deep Links" 
        description="Mobile deep link configurations and management"
        canonical={window.location.href}
      />

      <SubNavigation items={devGatewayNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Mobile Deep Links"
            description="Mobile deep link configurations and management"
            emoji="📱"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search deep links…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Link
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="registry">Link Registry</SplitBarTrigger>
              <SplitBarTrigger value="analytics">Link Analytics</SplitBarTrigger>
              <SplitBarTrigger value="testing">Testing Tools</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="registry" className="mt-6">
              <DevEmptyState 
                title="Deep Link Registry" 
                description="Browse and manage registered mobile deep links and their configurations."
                icon={Smartphone}
              />
            </SplitBarContent>

            <SplitBarContent value="analytics" className="mt-6">
              <DevEmptyState 
                title="Link Analytics" 
                description="Track deep link usage, click-through rates, and conversion metrics."
                icon={Link}
              />
            </SplitBarContent>

            <SplitBarContent value="testing" className="mt-6">
              <DevEmptyState 
                title="Testing Tools" 
                description="Test deep link functionality with QR codes and validation tools."
                icon={QrCode}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
