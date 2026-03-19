import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotAction, AutopilotPriority } from "@/types/autopilot";
import { 
  Plane,
  Zap, 
  Clock, 
  ChevronRight, 
  Settings, 
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useIsMobile } from "@/hooks/use-mobile";

interface AutopilotPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutopilotPopup({ open, onOpenChange }: AutopilotPopupProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { translate } = useTranslation();
  const { 
    pendingActions, 
    selectedActions, 
    executeActions, 
    toggleActionSelection, 
    dismissActions,
    isExecuting 
  } = useAutopilot();
  
  const isMobile = useIsMobile();
  const [showOptions, setShowOptions] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);

  const getPriorityColor = (priority: AutopilotPriority) => {
    switch (priority) {
      case "high": return "text-red-500 bg-red-50 border-red-200";
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const getPriorityIcon = (priority: AutopilotPriority) => {
    switch (priority) {
      case "high": return <AlertTriangle className="w-3 h-3" />;
      case "medium": return <Info className="w-3 h-3" />;
      case "low": return <CheckCircle className="w-3 h-3" />;
    }
  };

  const handleExecute = async () => {
    if (selectedActions.length === 0) return;
    
    setExecutionProgress(0);
    const actionIds = selectedActions.map(a => a.id);
    
    // Animate progress
    const progressInterval = setInterval(() => {
      setExecutionProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    
    try {
      const results = await executeActions(actionIds);
      const successCount = results.filter(r => r.success).length;
      
      toast({
        title: translate('autopilot.popup.toastExecutedTitle'),
        description: translate('autopilot.popup.toastExecutedDesc')
          .replace('{success}', String(successCount))
          .replace('{total}', String(results.length)),
      });
      
      onOpenChange(false);
      setShowOptions(false);
      setExecutionProgress(0);
    } catch (error) {
      toast({
        title: translate('autopilot.popup.toastFailedTitle'), 
        description: translate('autopilot.popup.toastFailedDesc'),
        variant: "destructive"
      });
    }
  };

  const handleNotNow = () => {
    onOpenChange(false);
    setShowOptions(false);
  };

  const handleQuickJump = () => {
    onOpenChange(false);
    navigate("/dashboard/actions");
  };

  const ActionItem = ({ action, showCheckbox = false }: { action: AutopilotAction; showCheckbox?: boolean }) => (
    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      {showCheckbox && (
        <Checkbox
          checked={action.selected}
          onCheckedChange={() => toggleActionSelection(action.id)}
          className="mt-1"
        />
      )}
      <div className="text-2xl">{action.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm">{action.title}</h4>
          <div className="flex items-center space-x-2">
            {action.timeEstimate && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {action.timeEstimate}
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={cn("text-xs border", getPriorityColor(action.priority))}
            >
              {getPriorityIcon(action.priority)}
              <span className="ml-1 capitalize">{translate(`autopilot.priorities.${action.priority}`)}</span>
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{action.reason}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400/20 to-orange-500/20 flex items-center justify-center">
              <Plane className="w-4 h-4 text-red-500" />
            </div>
            <span>{translate('autopilot.popup.title')}</span>
            <Badge variant="outline" className="ml-2">
              {translate('autopilot.popup.selectedOf')
                .replace('{selected}', String(selectedActions.length))
                .replace('{total}', String(pendingActions.length))}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {translate('autopilot.popup.readyToExecute').replace('{count}', String(selectedActions.length))}
          </DialogDescription>
        </DialogHeader>

        {isExecuting ? (
          <div className="py-8">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-red-400/20 to-orange-500/20 flex items-center justify-center">
                <Plane className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
              <h3 className="font-medium mb-2">{translate('autopilot.popup.executingTitle')}</h3>
              <p className="text-sm text-muted-foreground">{translate('autopilot.popup.executingDesc')}</p>
            </div>
            <Progress value={executionProgress} className="w-full" />
            <div className="text-center mt-2">
              <span className="text-sm text-muted-foreground">
                {translate('autopilot.popup.complete').replace('{percent}', String(executionProgress))}
              </span>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {showOptions ? (
                  pendingActions.map((action) => (
                    <ActionItem key={action.id} action={action} showCheckbox={true} />
                  ))
                ) : (
                  selectedActions.slice(0, 6).map((action) => (
                    <ActionItem key={action.id} action={action} />
                  ))
                )}
                
                {!showOptions && selectedActions.length > 6 && (
                  <div className="text-center py-3">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowOptions(true)}
                    >
                      {translate('autopilot.popup.moreActions').replace('{count}', String(selectedActions.length - 6))}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <DialogFooter className="flex-col space-y-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex space-x-2">
                  <Button
                    onClick={handleExecute}
                    disabled={selectedActions.length === 0}
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {translate('autopilot.popup.go').replace('{count}', String(selectedActions.length))}
                  </Button>
                  <Button variant="outline" onClick={handleNotNow}>
                    {translate('autopilot.popup.notNow')}
                  </Button>
                  {!showOptions && (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowOptions(true)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      {translate('autopilot.popup.seeOptions')}
                    </Button>
                  )}
                </div>
                
                <Button
                  variant="link"
                  onClick={handleQuickJump}
                  className="text-sm text-muted-foreground p-0 h-auto"
                >
                  {translate('autopilot.popup.seeAllInAI')}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
