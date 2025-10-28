import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReactNode } from "react";

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
  return (
    <Tabs 
      defaultValue={defaultTab} 
      className="w-full"
      onValueChange={onTabChange}
    >
      <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
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
