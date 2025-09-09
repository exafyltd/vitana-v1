import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { homeNavigation } from "@/config/navigation";

// Context Cards
import { CurrentVibeCard } from "@/components/crossover/CurrentVibeCard";
import { AIReasoningCard } from "@/components/crossover/AIReasoningCard";
import { TimelineContextCard } from "@/components/crossover/TimelineContextCard";
import { EnvironmentalContextCard } from "@/components/crossover/EnvironmentalContextCard";
import { SocialContextCard } from "@/components/crossover/SocialContextCard";
import { BiometricContextCard } from "@/components/crossover/BiometricContextCard";

export default function Context() {
  const navigate = useNavigate();
  const { pendingCount } = useAutopilot();

  return (
    <AppLayout>
      <SEO title="Context | Dashboard" description="Now & Context Snapshot" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-pink-950/20 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Now & Context Snapshot"
            description="Transparency: Why Autopilot makes these choices."
            emoji="🌍"
          />

          {/* Action Buttons */}
          <UtilityActionButton className="mb-6">
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button variant="default" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Context
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation */}
          <SplitBar defaultValue="current" className="w-full">
            <SplitBarList className="grid w-full grid-cols-5">
              <SplitBarTrigger value="current">Current</SplitBarTrigger>
              <SplitBarTrigger value="reasoning">AI Logic</SplitBarTrigger>
              <SplitBarTrigger value="timeline">Timeline</SplitBarTrigger>
              <SplitBarTrigger value="environment">Environment</SplitBarTrigger>
              <SplitBarTrigger value="social">Social</SplitBarTrigger>
            </SplitBarList>

            {/* Current Status Tab */}
            <SplitBarContent value="current">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CurrentVibeCard className="lg:col-span-2" />
                <BiometricContextCard />
                <AIReasoningCard className="md:col-span-2" />
              </div>
            </SplitBarContent>

            {/* AI Reasoning Tab */}
            <SplitBarContent value="reasoning">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AIReasoningCard className="lg:col-span-2" />
                <BiometricContextCard />
                <CurrentVibeCard className="md:col-span-2" />
              </div>
            </SplitBarContent>

            {/* Timeline Tab */}
            <SplitBarContent value="timeline">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <TimelineContextCard className="lg:col-span-2" />
                <SocialContextCard />
                <AIReasoningCard className="md:col-span-2" />
              </div>
            </SplitBarContent>

            {/* Environment Tab */}
            <SplitBarContent value="environment">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <EnvironmentalContextCard className="lg:col-span-2" />
                <BiometricContextCard />
                <TimelineContextCard className="md:col-span-2" />
              </div>
            </SplitBarContent>

            {/* Social Tab */}
            <SplitBarContent value="social">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SocialContextCard className="lg:col-span-2" />
                <CurrentVibeCard />
                <EnvironmentalContextCard className="md:col-span-2" />
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </AppLayout>
  );
}