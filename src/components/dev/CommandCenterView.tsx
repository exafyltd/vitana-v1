import { SplitScreen } from "@/components/ui/split-screen";
import LiveConsole from "./LiveConsole";
import OperatorChat from "./OperatorChat";

export function CommandCenterView() {
  const leftPanel = <LiveConsole />;
  const rightPanel = <OperatorChat />;

  return (
    <div className="h-[600px]">
      <SplitScreen
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        defaultLeftSize={40}
        minLeftSize={30}
        minRightSize={40}
        screenId="command-hub-command-center"
      />
    </div>
  );
}
