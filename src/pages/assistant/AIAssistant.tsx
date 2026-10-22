import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import VoiceSettingsPanel from "@/components/assistant/VoiceSettingsPanel";
import AIModelSettingsPanel from "@/components/assistant/AIModelSettingsPanel";
import ProactiveTalkingPanel from "@/components/assistant/ProactiveTalkingPanel";
import AutopilotSettingsPanel from "@/components/assistant/AutopilotSettingsPanel";
import { VaeaConfigPanel } from "@/components/business/vaea/VaeaConfigPanel";
import { t } from '@/lib/i18n-toast';
import type * as React from "react";
import { ScreenFrame, SpotlightLoading } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { SplitBarContent } from "@/components/ui/split-bar";

export default function AIAssistant() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();
  
  const activeTab = searchParams.get('tab') || 'voice';
  const spotlight = useSpotlightEnabled();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // VTID-05111 — Spotlight Tier B (desktop + flag only; phones and flag-off keep the screen below):
  // the tabs move into the utility row (SplitBar), loading shows the archetype skeleton.
  if (spotlight) {
    // The tab labels do not depend on the data, so the utility row and its tabs
    // mount at once and only the stage swaps from the skeleton to the panel.
    const tabItems = [
      { value: 'voice', label: t('screens.assistant.voice') },
      { value: 'ai', label: t('spotlightTierB.ai.assistantTabAi') },
      { value: 'autopilot', label: t('screens.assistant.autopilotAmpAutomation') },
      { value: 'proactive', label: t('screens.assistant.proactiveTalking') },
      { value: 'referrals', label: t('screens.assistant.referrals') },
    ];
    const panels: { value: string; panel: React.ReactNode }[] = preferences
      ? [
          { value: 'voice', panel: <VoiceSettingsPanel preferences={preferences} isUpdating={isUpdating} updatePreferences={updatePreferences} /> },
          { value: 'ai', panel: <AIModelSettingsPanel preferences={preferences} isUpdating={isUpdating} updatePreferences={updatePreferences} /> },
          { value: 'autopilot', panel: <AutopilotSettingsPanel preferences={preferences} isUpdating={isUpdating} updatePreferences={updatePreferences} /> },
          { value: 'proactive', panel: <ProactiveTalkingPanel preferences={preferences} isUpdating={isUpdating} updatePreferences={updatePreferences} /> },
          { value: 'referrals', panel: <VaeaConfigPanel /> },
        ]
      : [];
    return (
      <AppLayout>
        <SEO title={t('screens.assistant.aiAssistant')} description={t('spotlightTierB.ai.assistantDescription')} canonical={window.location.href} />
        <ScreenFrame
          archetype="conversation"
          header={{ title: t('screens.assistant.aiAssistant'), description: t('spotlightTierB.ai.assistantDescription'), emoji: '✨' }}
          tabs={isLoading || panels.length ? { value: activeTab, onValueChange: handleTabChange, items: tabItems } : undefined}
        >
          <SpotlightLoading loading={isLoading} archetype="form">
            {panels.map((p) => (
              <SplitBarContent key={p.value} value={p.value} className="space-y-4">
                {p.panel}
              </SplitBarContent>
            ))}
          </SpotlightLoading>
        </ScreenFrame>
      </AppLayout>
    );
  }

  if (!isLoading && !preferences) return null;

  return (
    <AppLayout>
      <SEO
        title={t('screens.assistant.aiAssistant')}
        description="Configure your AI assistant, voice settings, and automation preferences"
        canonical={window.location.href}
      />

      <div className="p-6 bg-gradient-subtle min-h-screen pb-32 md:pb-40">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title={t('screens.assistant.aiAssistant')}
            description="Your personal AI assistant configuration hub"
            emoji="✨"
          />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {/* Mobile: horizontal-scroll strip so long labels never overflow.
                Desktop: even 5-col grid once there's room. */}
            <TabsList className="flex w-full gap-1 overflow-x-auto justify-start md:grid md:grid-cols-5">
              <TabsTrigger value="voice" className="shrink-0">{t('screens.assistant.voice')}</TabsTrigger>
              <TabsTrigger value="ai" className="shrink-0">AI</TabsTrigger>
              <TabsTrigger value="autopilot" className="shrink-0">
                <span className="md:hidden">{t('screens.assistant.autopilot')}</span>
                <span className="hidden md:inline">{t('screens.assistant.autopilotAmpAutomation')}</span>
              </TabsTrigger>
              <TabsTrigger value="proactive" className="shrink-0">
                <span className="md:hidden">{t('screens.assistant.proactive')}</span>
                <span className="hidden md:inline">{t('screens.assistant.proactiveTalking')}</span>
              </TabsTrigger>
              <TabsTrigger value="referrals" className="shrink-0">
                <span className="md:hidden">{t('screens.assistant.referrals')}</span>
                <span className="hidden md:inline">{t('screens.assistant.referrals')}</span>
              </TabsTrigger>
            </TabsList>

            {/* The header and tab strip stay mounted while the settings load; only the pane swaps. */}
            {!preferences ? (
              <SpotlightLoading archetype="form" className="mt-6" />
            ) : (
            <SpotlightLoading loading={false}>
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
            </SpotlightLoading>
            )}
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
