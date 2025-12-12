import { ResellerHeader } from "@/components/reseller/ResellerHeader";
import { AutopilotSuggestionsBanner } from "@/components/reseller/AutopilotSuggestionsBanner";
import { Button } from "@/components/ui/button";
import { Share2, Megaphone } from "lucide-react";

export function ResellerOverviewTab() {
  return (
    <div className="space-y-8">
      {/* Autopilot Insight Card */}
      <AutopilotSuggestionsBanner />
      
      {/* 4 KPI Cards */}
      <ResellerHeader />

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="rounded-full gap-2">
            <Share2 className="h-4 w-4" />
            Share a reseller link
          </Button>
          <Button variant="outline" size="sm" className="rounded-full gap-2">
            <Megaphone className="h-4 w-4" />
            Create promotion
          </Button>
        </div>
      </div>
    </div>
  );
}
