import { useLocation } from "react-router-dom";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, Plane, Users, Activity } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";
import { LiveConsoleTab } from "@/components/dev/LiveConsoleTab";
import { ActiveVTIDChip } from "@/components/dev/ActiveVTIDChip";

export default function DevCommand() {
  const location = useLocation();
  const activeTab = location.pathname === "/dev/command" 
    ? "live-console" 
    : location.pathname.split("/").pop() || "live-console";

  return (
    <>
      <SEO 
        title="Vitana DEV — Command" 
        description="Command execution hub for Vitana platform"
        canonical={window.location.href}
      />

      {/* Main Navigation */}
      <SubNavigation 
        items={devCommandNavigation}
      />

      <div className="p-6 pb-24 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header with Active VTID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DevStandardHeader 
                  title="Operate the Vitana System Autonomously"
                  description="Execute commands, manage workflows, and monitor system operations"
                  emoji="✨"
                />
              </div>
              <div className="ml-4">
                <ActiveVTIDChip />
              </div>
            </div>
          </div>

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search commands…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Command Actions
            </Button>
          </UtilityActionButton>

          {/* Content based on active tab */}
          {activeTab === "live-console" && <LiveConsoleTab />}
          
          {activeTab === "tasks" && (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12">
                <DevEmptyState 
                  title="Tasks Overview" 
                  description="Manage and track system tasks"
                  icon={Users}
                />
              </div>
            </div>
          )}

          {activeTab === "autopilot-runs" && (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12">
                <DevEmptyState 
                  title="Autopilot Runs" 
                  description="View and manage autonomous workflow executions"
                  icon={Plane}
                />
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12">
                <DevEmptyState 
                  title="Command History" 
                  description="View past operations and executions"
                  icon={Activity}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
