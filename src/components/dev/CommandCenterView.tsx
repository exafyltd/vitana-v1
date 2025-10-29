import { SplitScreen } from "@/components/ui/split-screen";
import { DevHubFeed } from "./DevHubFeed";
import { CommandChat } from "./CommandChat";
import { useSplitFocus } from "@/hooks/dev/useSplitFocus";

export function CommandCenterView() {
  const { focusedPane, setFocus, hasUnreadLeft, hasUnreadRight, markRead } = useSplitFocus();

  const handleTickerVTIDClick = () => {
    setFocus('right');
    markRead('left');
  };

  const leftPanel = (
    <DevHubFeed
      onVTIDClick={handleTickerVTIDClick}
      isFocused={focusedPane === 'left'}
      hasUnread={hasUnreadLeft}
    />
  );

  const rightPanel = (
    <CommandChat
      isFocused={focusedPane === 'right'}
      hasUnread={hasUnreadRight}
    />
  );

  return (
    <div className="h-[600px]">
      <SplitScreen
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        defaultLeftSize={30}
        minLeftSize={20}
        minRightSize={50}
        screenId="command-hub-command-center"
      />
    </div>
  );
}
