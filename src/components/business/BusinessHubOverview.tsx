/**
 * BUSINESS HUB OVERVIEW
 * 
 * Unified styling matching Sell & Earn Overview:
 * - Autopilot suggestion banner
 * - 4 premium glassy KPI cards
 * - Quick action pill buttons
 */

import { Button } from "@/components/ui/button";
import { Plus, Users, Megaphone } from "lucide-react";
import { BusinessHubAutopilotBanner } from "./BusinessHubAutopilotBanner";
import { BusinessHubKPICards } from "./BusinessHubKPICards";
import { useIsReseller } from "@/hooks/useIsReseller";

interface BusinessHubOverviewProps {
  onCreateService: () => void;
  onCreateEvent: () => void;
  onCreateCampaign: () => void;
}

export function BusinessHubOverview({ 
  onCreateService, 
  onCreateEvent, 
  onCreateCampaign 
}: BusinessHubOverviewProps) {
  const { isReseller } = useIsReseller();

  return (
    <div className="space-y-8">
      {/* Autopilot Suggestion Strip */}
      <BusinessHubAutopilotBanner />
      
      {/* 4 KPI Cards */}
      <BusinessHubKPICards />

      {/* Quick Actions - with section anchoring */}
      <div className="space-y-3">
        {/* Subtle divider */}
        <div className="h-px bg-border/[0.08]" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60 pt-1">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full gap-2"
            onClick={onCreateService}
          >
            <Plus className="h-4 w-4" />
            Create a service
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full gap-2"
            onClick={onCreateEvent}
          >
            <Users className="h-4 w-4" />
            Add a client
          </Button>
          {isReseller && (
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full gap-2"
              onClick={onCreateCampaign}
            >
              <Megaphone className="h-4 w-4" />
              Create a promotion
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
