import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

export type MobileProfileTab = "posts" | "about" | "media" | "groups";

interface MobileProfileTabsProps {
  activeTab?: MobileProfileTab;
  onTabChange?: (tab: MobileProfileTab) => void;
  className?: string;
}

export function MobileProfileTabs({
  activeTab: controlledActiveTab,
  onTabChange,
  className
}: MobileProfileTabsProps) {
  const { translate } = useTranslation();
  const [internalActiveTab, setInternalActiveTab] = useState<MobileProfileTab>("posts");
  
  const activeTab = controlledActiveTab ?? internalActiveTab;
  
  const tabs: { id: MobileProfileTab; label: string }[] = [
    { id: "posts", label: translate('profileTabs.posts', 'Posts') },
    { id: "about", label: translate('profileTabs.about', 'About') },
    { id: "media", label: translate('profileTabs.media', 'Media') },
    { id: "groups", label: translate('profileTabs.groups', 'Groups') },
  ];
  
  const handleTabChange = (tab: MobileProfileTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  return (
    <div className={cn(
      "sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b",
      className
    )}>
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
