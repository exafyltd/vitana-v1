import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, ReactNode } from "react";

type HeaderCard = {
  type: string;
  label: string;
  value?: string;
  badge?: string;
};

type Tab = { 
  id: string; 
  label: string; 
};

type Props = {
  sectionNav: any;                 // e.g. sharingNavigation
  header: { 
    title: string; 
    description: string; 
    emoji?: string; 
  };
  actionText: string;              // e.g. "Create Package", "Schedule Test"
  onAction: () => void;
  tabs: Tab[];                     // e.g. [{id:"active", label:"Active Consents"}, ...]
  renderTab: (activeId: string) => ReactNode; // returns the 12-col content for active tab
};

export default function TopStack({
  sectionNav, header, actionText, onAction, tabs, renderTab,
}: Props) {
  const [active, setActive] = useState(tabs[0]?.id ?? "tab1");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* vertical rhythm owner */}
      <div className="space-y-6 lg:space-y-8">
        <SubNavigation items={sectionNav} />

        {/* Overview-style header (left-anchored) */}
        <StandardHeader 
          title={header.title}
          description={header.description}
          emoji={header.emoji}
          className="!mx-0" 
        />

        {/* Search + Action inline, left-aligned */}
        <div className="flex items-center gap-3 flex-wrap">
          <ExpandableSearchButton />
          <UtilityActionButton>
            <Button size="sm" onClick={onAction}>
              <Plus className="w-4 h-4 mr-2" />
              {actionText}
            </Button>
          </UtilityActionButton>
        </div>

        {/* SplitBar and content */}
        <SplitBar value={active} onValueChange={setActive}>
          <SplitBarList>
            {tabs.map(t => (
              <SplitBarTrigger key={t.id} value={t.id}>
                {t.label}
              </SplitBarTrigger>
            ))}
          </SplitBarList>
          <SplitBarContent value={active}>
            {renderTab(active)}
          </SplitBarContent>
        </SplitBar>
      </div>
    </div>
  );
}