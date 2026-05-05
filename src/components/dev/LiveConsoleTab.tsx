import { useState } from "react";
import { SplitScreen } from "@/components/ui/split-screen";
import { DevHubFeed } from "./DevHubFeed";
import { CommandChat } from "./CommandChat";
import { OpenTasksList } from "./OpenTasksList";
import { useSplitFocus } from "@/hooks/dev/useSplitFocus";
import { Card } from "@/components/ui/card";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { t } from '@/lib/i18n-toast';

export function LiveConsoleTab() {
  const [nestedTab, setNestedTab] = useState("command-center");
  const { focusedPane, setFocus, hasUnreadLeft, hasUnreadRight, markRead } = useSplitFocus();

  const handleTickerVTIDClick = () => {
    setFocus('right');
    markRead('left');
  };

  const commandCenterLeftPanel = (
    <DevHubFeed
      onVTIDClick={handleTickerVTIDClick}
      isFocused={focusedPane === 'left'}
      hasUnread={hasUnreadLeft}
    />
  );

  const commandCenterRightPanel = (
    <CommandChat
      isFocused={focusedPane === 'right'}
      hasUnread={hasUnreadRight}
    />
  );


  return (
    <Card className="overflow-hidden">
      {/* Split-Screen Navigation Bar */}
      <div className="border-b bg-muted/30">
        <SplitBar value={nestedTab} onValueChange={setNestedTab}>
          <SplitBarList className="w-full p-1">
            <SplitBarTrigger value="command-center">{t('screens.dev.commandCenter')}</SplitBarTrigger>
            <SplitBarTrigger value="open-tasks">{t('screens.dev.openTasks')}</SplitBarTrigger>
          </SplitBarList>
        </SplitBar>
      </div>

      {/* Split Screen Content */}
      <div className="h-[600px]">
        {nestedTab === "command-center" && (
          <SplitScreen
            leftPanel={commandCenterLeftPanel}
            rightPanel={commandCenterRightPanel}
            defaultLeftSize={30}
            minLeftSize={20}
            minRightSize={50}
            screenId="command-hub-command-center"
          />
        )}
        {nestedTab === "open-tasks" && <OpenTasksList />}
      </div>

      <div className="p-2 border-t bg-muted/30 text-center">
        <p className="text-xs text-muted-foreground">
          {t('screens.dev.keyboardShortcuts')} <kbd className="px-1 py-0.5 bg-background border rounded text-xs">1</kbd>{t('screens.dev.focusLeft')} <kbd className="px-1 py-0.5 bg-background border rounded text-xs">2</kbd>{t('screens.dev.focusRight')} <kbd className="px-1 py-0.5 bg-background border rounded text-xs">←</kbd> <kbd className="px-1 py-0.5 bg-background border rounded text-xs">→</kbd>{t('screens.dev.switch')}
        </p>
      </div>
    </Card>
  );
}
