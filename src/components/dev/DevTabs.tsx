/**
 * @deprecated Use SplitBar component instead (VITANA Universal Design Pattern)
 * This component will be removed in Phase 2.
 * Migrate to: import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar"
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReactNode, useRef, useEffect } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface DevTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface DevTabsProps {
  defaultTab: string;
  tabs: DevTab[];
  onTabChange?: (value: string) => void;
}

export function DevTabs({ defaultTab, tabs, onTabChange }: DevTabsProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const tabsListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view on mobile
  useEffect(() => {
    if (isMobile && tabsListRef.current) {
      const activeTab = tabsListRef.current.querySelector('[data-state="active"]');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [defaultTab, isMobile]);

  return (
    <Tabs 
      defaultValue={defaultTab} 
      className="w-full"
      onValueChange={onTabChange}
    >
      <TabsList 
        ref={tabsListRef}
        className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto md:overflow-visible scrollbar-hide"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 min-h-[44px] whitespace-nowrap"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
