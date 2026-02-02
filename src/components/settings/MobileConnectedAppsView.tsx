import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { useTranslation } from "@/hooks/useTranslation";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { ConnectAppPopup } from "@/components/ConnectAppPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";

import { MobileIntegrationSection } from "./MobileIntegrationSection";
import { MobileIntegrationDetailSheet } from "./MobileIntegrationDetailSheet";
import { MobileConnectionSummary } from "./MobileConnectionSummary";
import {
  socialIntegrations,
  fitnessIntegrations,
  healthIntegrations,
  otherIntegrations,
  getConnectionStats,
  type Integration,
} from "./integrationData";

export function MobileConnectedAppsView() {
  const { translate } = useTranslation();
  const [selectedApp, setSelectedApp] = useState<Integration | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectPopupOpen, setConnectPopupOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);

  const { connected, syncing } = getConnectionStats();

  // Filter integrations by search query
  const filterIntegrations = (integrations: Integration[]) => {
    if (!searchQuery.trim()) return integrations;
    const query = searchQuery.toLowerCase();
    return integrations.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.syncData.toLowerCase().includes(query)
    );
  };

  const filteredSocial = filterIntegrations(socialIntegrations);
  const filteredFitness = filterIntegrations(fitnessIntegrations);
  const filteredHealth = filterIntegrations(healthIntegrations);
  const filteredOther = filterIntegrations(otherIntegrations);

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background">
      <div className="p-4 pb-32 space-y-4">
        {/* Header */}
        <StandardHeader
          title={translate('connectedApps.title')}
          description={translate('connectedApps.description')}
        />

        {/* Action Bar */}
        <UtilityActionButton
          afterGiftVoucherChildren={
            <>
              <VitanaIndexChip />
              <AutopilotChip 
                pendingCount={0} 
                onClick={() => setAutopilotOpen(true)} 
              />
            </>
          }
        >
          <ExpandableSearchButton
            placeholder={translate('connectedApps.searchPlaceholder')}
            onSearch={setSearchQuery}
          />
          <UniversalCalendarButton />
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
            onClick={() => setConnectPopupOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {translate('connectedApps.addApp')}
          </Button>
        </UtilityActionButton>

        {/* Connection Summary */}
        <MobileConnectionSummary
          connectedCount={connected}
          syncingCount={syncing}
        />

        {/* Integration Sections */}
        <div className="space-y-3">
          {filteredSocial.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.social')}
              emoji="📱"
              integrations={filteredSocial}
              onSelect={setSelectedApp}
            />
          )}

          {filteredFitness.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.fitness')}
              emoji="💪"
              integrations={filteredFitness}
              onSelect={setSelectedApp}
            />
          )}

          {filteredHealth.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.health')}
              emoji="🩺"
              integrations={filteredHealth}
              onSelect={setSelectedApp}
            />
          )}

          {filteredOther.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.other')}
              emoji="🔧"
              integrations={filteredOther}
              onSelect={setSelectedApp}
              defaultExpanded={false}
            />
          )}
        </div>
      </div>

      {/* Detail Sheet */}
      <MobileIntegrationDetailSheet
        integration={selectedApp}
        onClose={() => setSelectedApp(null)}
      />

      {/* Connect App Popup */}
      <ConnectAppPopup 
        isOpen={connectPopupOpen} 
        onClose={() => setConnectPopupOpen(false)} 
      />

      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen} 
      />
    </div>
  );
}
