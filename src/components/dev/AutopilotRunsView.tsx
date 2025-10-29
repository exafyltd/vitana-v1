import { useState } from "react";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { RunHistoryList } from "./RunHistoryList";
import { ActiveRunsList } from "./ActiveRunsList";
import { TemplatesLibrary } from "./TemplatesLibrary";
import { AnalyticsView } from "./AnalyticsView";

export function AutopilotRunsView() {
  const [activeSubTab, setActiveSubTab] = useState("run-history");

  return (
    <SplitBar value={activeSubTab} onValueChange={setActiveSubTab}>
      <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
        <SplitBarTrigger value="run-history">Run History</SplitBarTrigger>
        <SplitBarTrigger value="active-runs">Active Runs</SplitBarTrigger>
        <SplitBarTrigger value="templates">Templates & Recipes</SplitBarTrigger>
        <SplitBarTrigger value="analytics">Analytics</SplitBarTrigger>
      </SplitBarList>

      <SplitBarContent value="run-history">
        <RunHistoryList />
      </SplitBarContent>

      <SplitBarContent value="active-runs">
        <ActiveRunsList />
      </SplitBarContent>

      <SplitBarContent value="templates">
        <TemplatesLibrary />
      </SplitBarContent>

      <SplitBarContent value="analytics">
        <AnalyticsView />
      </SplitBarContent>
    </SplitBar>
  );
}
