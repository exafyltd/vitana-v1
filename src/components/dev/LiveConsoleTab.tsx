import { SplitScreen } from "@/components/ui/split-screen";
import { TickerFeed } from "./TickerFeed";
import { CommandChat } from "./CommandChat";
import { useSplitFocus } from "@/hooks/dev/useSplitFocus";
import { Card } from "@/components/ui/card";

export function LiveConsoleTab() {
  const { focusedPane, setFocus, hasUnreadLeft, hasUnreadRight, markRead } = useSplitFocus();

  const handleTickerVTIDClick = () => {
    setFocus('right');
    markRead('left');
  };

  const leftPanel = (
    <TickerFeed
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
    <Card className="overflow-hidden">
      <div className="h-[600px]">
        <SplitScreen
          leftPanel={leftPanel}
          rightPanel={rightPanel}
          defaultLeftSize={30}
          minLeftSize={20}
          minRightSize={50}
          screenId="command-hub-live-console"
        />
      </div>
      <div className="p-2 border-t bg-muted/30 text-center">
        <p className="text-xs text-muted-foreground">
          Keyboard shortcuts: <kbd className="px-1 py-0.5 bg-background border rounded text-xs">1</kbd> Focus Ticker • <kbd className="px-1 py-0.5 bg-background border rounded text-xs">2</kbd> Focus Chat • <kbd className="px-1 py-0.5 bg-background border rounded text-xs">←</kbd> <kbd className="px-1 py-0.5 bg-background border rounded text-xs">→</kbd> Switch
        </p>
      </div>
    </Card>
  );
}
