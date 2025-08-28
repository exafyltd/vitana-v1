import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface SplitScreenProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftSize?: number;
  minLeftSize?: number;
  minRightSize?: number;
  direction?: "horizontal" | "vertical";
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
  screenId?: string;
}

export function SplitScreen({
  leftPanel,
  rightPanel,
  defaultLeftSize = 50,
  minLeftSize = 20,
  minRightSize = 20,
  direction = "horizontal",
  className,
  leftClassName,
  rightClassName,
  screenId
}: SplitScreenProps) {
  return (
    <div 
      className={cn("h-full w-full", className)}
      data-screen-id={screenId}
      data-pattern="split-screen"
    >
      <ResizablePanelGroup direction={direction}>
        <ResizablePanel
          defaultSize={defaultLeftSize}
          minSize={minLeftSize}
          className={cn("flex flex-col", leftClassName)}
        >
          {leftPanel}
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel
          defaultSize={100 - defaultLeftSize}
          minSize={minRightSize}
          className={cn("flex flex-col", rightClassName)}
        >
          {rightPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// Split-screen template components for common patterns
interface SplitScreenTemplateProps {
  leftTitle: string;
  leftContent: React.ReactNode;
  rightTitle: string;
  rightContent: React.ReactNode;
  screenId?: string;
}

export function ManagementReferralsSplitScreen({ 
  leftTitle, 
  leftContent, 
  rightTitle, 
  rightContent,
  screenId 
}: SplitScreenTemplateProps) {
  const LeftPanel = (
    <div className="h-full p-6">
      <h3 className="text-xl font-semibold mb-4">{leftTitle}</h3>
      <div className="h-full overflow-auto">
        {leftContent}
      </div>
    </div>
  );

  const RightPanel = (
    <div className="h-full p-6 bg-muted/20">
      <h3 className="text-xl font-semibold mb-4">{rightTitle}</h3>
      <div className="h-full overflow-auto">
        {rightContent}
      </div>
    </div>
  );

  return (
    <SplitScreen
      leftPanel={LeftPanel}
      rightPanel={RightPanel}
      screenId={screenId}
      className="min-h-[600px]"
    />
  );
}

export function ServiceDetailSplitScreen({ 
  leftTitle, 
  leftContent, 
  rightTitle, 
  rightContent,
  screenId 
}: SplitScreenTemplateProps) {
  const LeftPanel = (
    <div className="h-full p-6">
      <h3 className="text-xl font-semibold mb-4">{leftTitle}</h3>
      <div className="h-full overflow-auto">
        {leftContent}
      </div>
    </div>
  );

  const RightPanel = (
    <div className="h-full p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
      <h3 className="text-xl font-semibold mb-4">{rightTitle}</h3>
      <div className="h-full overflow-auto">
        {rightContent}
      </div>
    </div>
  );

  return (
    <SplitScreen
      leftPanel={LeftPanel}
      rightPanel={RightPanel}
      defaultLeftSize={60}
      screenId={screenId}
      className="min-h-[600px]"
    />
  );
}

export function TrackerInsightsSplitScreen({ 
  leftTitle, 
  leftContent, 
  rightTitle, 
  rightContent,
  screenId 
}: SplitScreenTemplateProps) {
  const LeftPanel = (
    <div className="h-full p-6">
      <h3 className="text-xl font-semibold mb-4">{leftTitle}</h3>
      <div className="h-full overflow-auto">
        {leftContent}
      </div>
    </div>
  );

  const RightPanel = (
    <div className="h-full p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
      <h3 className="text-xl font-semibold mb-4">{rightTitle}</h3>
      <div className="h-full overflow-auto">
        {rightContent}
      </div>
    </div>
  );

  return (
    <SplitScreen
      leftPanel={LeftPanel}
      rightPanel={RightPanel}
      defaultLeftSize={65}
      screenId={screenId}
      className="min-h-[600px]"
    />
  );
}

export function BillingRewardsSplitScreen({ 
  leftTitle, 
  leftContent, 
  rightTitle, 
  rightContent,
  screenId 
}: SplitScreenTemplateProps) {
  const LeftPanel = (
    <div className="h-full p-6">
      <h3 className="text-xl font-semibold mb-4">{leftTitle}</h3>
      <div className="h-full overflow-auto">
        {leftContent}
      </div>
    </div>
  );

  const RightPanel = (
    <div className="h-full p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
      <h3 className="text-xl font-semibold mb-4">{rightTitle}</h3>
      <div className="h-full overflow-auto">
        {rightContent}
      </div>
    </div>
  );

  return (
    <SplitScreen
      leftPanel={LeftPanel}
      rightPanel={RightPanel}
      screenId={screenId}
      className="min-h-[600px]"
    />
  );
}