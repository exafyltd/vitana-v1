import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { CheckCircle, Clock, FileCheck, Filter } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";

export default function CommandApprovals() {
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <>
      <SEO 
        title="Vitana DEV — Command Approvals" 
        description="Review and approve commands requiring authorization"
        canonical={window.location.href}
      />

      <SubNavigation items={devCommandNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Command Approvals"
            description="Review and approve commands requiring authorization"
            emoji="✅"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search approvals…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="pending">Pending</SplitBarTrigger>
              <SplitBarTrigger value="history">History</SplitBarTrigger>
              <SplitBarTrigger value="policies">Policies</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="pending" className="mt-6">
              <DevEmptyState 
                title="Pending Approvals" 
                description="Review the queue of commands requiring authorization before execution."
                icon={CheckCircle}
              />
            </SplitBarContent>

            <SplitBarContent value="history" className="mt-6">
              <DevEmptyState 
                title="Approval History" 
                description="Browse past approval decisions and their outcomes."
                icon={Clock}
              />
            </SplitBarContent>

            <SplitBarContent value="policies" className="mt-6">
              <DevEmptyState 
                title="Approval Policies" 
                description="View the approval workflow policies and authorization rules."
                icon={FileCheck}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
