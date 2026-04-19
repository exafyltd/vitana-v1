import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Loader2 } from "lucide-react";
import VoiceSettingsPanel from "@/components/assistant/VoiceSettingsPanel";
import AIModelSettingsPanel from "@/components/assistant/AIModelSettingsPanel";
import ProactiveTalkingPanel from "@/components/assistant/ProactiveTalkingPanel";
import AutopilotSettingsPanel from "@/components/assistant/AutopilotSettingsPanel";
import { VaeaConfigPanel } from "@/components/business/vaea/VaeaConfigPanel";

export default function AIAssistant() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();
  
  const activeTab = searchParams.get('tab') || 'voice';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!preferences) return null;

  return (
    <AppLayout>
      <SEO
        title="AI Assistant"
        description="Configure your AI assistant, voice settings, and automation preferences"
        canonical={window.location.href}
      />

      <div className="p-6 bg-gradient-subtle min-h-screen pb-32 md:pb-40">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="AI Assistant"
            description="Your personal AI assistant configuration hub"
            emoji="✨"
          />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {/* Mobile: horizontal-scroll strip so long labels never overflow.
                Desktop: even 5-col grid once there's room. */}
            <TabsList className="flex w-full gap-1 overflow-x-auto justify-start md:grid md:grid-cols-5">
              <TabsTrigger value="voice" className="shrink-0">Voice</TabsTrigger>
              <TabsTrigger value="ai" className="shrink-0">AI</TabsTrigger>
              <TabsTrigger value="autopilot" className="shrink-0">
                <span className="md:hidden">Autopilot</span>
                <span className="hidden md:inline">Autopilot &amp; Automation</span>
              </TabsTrigger>
              <TabsTrigger value="proactive" className="shrink-0">
                <span className="md:hidden">Proactive</span>
                <span className="hidden md:inline">Proactive Talking</span>
              </TabsTrigger>
              <TabsTrigger value="referrals" className="shrink-0">
                <span className="md:hidden">Referrals</span>
                <span className="hidden md:inline">Referrals</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="voice" className="space-y-4 mt-6">
              <VoiceSettingsPanel
                preferences={preferences}
                isUpdating={isUpdating}
                updatePreferences={updatePreferences}
              />
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-6">
              <AIModelSettingsPanel
                preferences={preferences}
                isUpdating={isUpdating}
                updatePreferences={updatePreferences}
              />
            </TabsContent>

            <TabsContent value="autopilot" className="space-y-4 mt-6">
              <AutopilotSettingsPanel
                preferences={preferences}
                isUpdating={isUpdating}
                updatePreferences={updatePreferences}
              />
            </TabsContent>

            <TabsContent value="proactive" className="space-y-4 mt-6">
              <ProactiveTalkingPanel
                preferences={preferences}
                isUpdating={isUpdating}
                updatePreferences={updatePreferences}
              />
            </TabsContent>

            <TabsContent value="referrals" className="space-y-4 mt-6">
              <VaeaConfigPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
