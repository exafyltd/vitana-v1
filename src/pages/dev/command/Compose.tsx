import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { FileEdit, Code, Zap, CheckCircle } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function CommandCompose() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("editor");
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Command Composer"
            description="Compose and execute custom commands (read-only in Phase 1)"
            emoji="✏️"
          />

          <UtilityActionButton
            trailingElement={<RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />}
          >
            <ExpandableSearchButton 
              placeholder="Search templates…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" disabled>
              <CheckCircle className="w-4 h-4 me-2" />
              Validate
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="editor">Editor</SplitBarTrigger>
              <SplitBarTrigger value="templates">Templates</SplitBarTrigger>
              <SplitBarTrigger value="validation">Validation</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="editor" className="mt-6">
              <DevEmptyState 
                title="Command Editor" 
                description="Syntax-highlighted editor for composing custom commands (disabled in read-only mode)."
                icon={FileEdit}
              />
            </SplitBarContent>

            <SplitBarContent value="templates" className="mt-6">
              <DevEmptyState 
                title="Command Templates" 
                description="Browse pre-built command templates and examples for common operations."
                icon={Code}
              />
            </SplitBarContent>

            <SplitBarContent value="validation" className="mt-6">
              <DevEmptyState 
                title="Syntax Validation" 
                description="View syntax validation rules and command structure requirements."
                icon={Zap}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — Command Composer" 
        description="Compose and execute custom commands with syntax highlighting"
        canonical={window.location.href}
      />

      <SubNavigation items={devCommandNavigation} />

      {spotlight ? (
        <ScreenFrame archetype="workspace">
          {devBody}
        </ScreenFrame>
      ) : (
        <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to dark:from-background dark:via-background dark:to-background min-h-screen">{devBody}</div>
      )}

      <RestoreSessionModal 
        open={restoreSessionOpen} 
        onOpenChange={setRestoreSessionOpen}
      />
    </>
  );
}
