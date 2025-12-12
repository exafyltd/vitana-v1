import { ResellerHeader } from "@/components/reseller/ResellerHeader";
import { AutopilotSuggestionsBanner } from "@/components/reseller/AutopilotSuggestionsBanner";

export function ResellerOverviewTab() {
  return (
    <div className="space-y-6">
      {/* Autopilot Suggestions Panel */}
      <AutopilotSuggestionsBanner />
      
      {/* 4 KPI Cards */}
      <ResellerHeader />
    </div>
  );
}
