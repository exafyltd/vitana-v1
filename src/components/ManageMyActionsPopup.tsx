import React, { useState } from "react";
import { 
  ResponsiveDialog, 
  ResponsiveDialogContent, 
  ResponsiveDialogDescription, 
  ResponsiveDialogHeader, 
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle 
} from "@/components/ui/responsive-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Star, CheckCircle, Edit, X, Zap } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotCategory, AutopilotPriority } from "@/types/autopilot";
import { t } from '@/lib/i18n-toast';

interface ManageMyActionsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageMyActionsPopup({ open, onOpenChange }: ManageMyActionsPopupProps) {
  const { pendingActions, executeActions, dismissActions } = useAutopilot();
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionCategory, setNewActionCategory] = useState<AutopilotCategory>("health");
  const [newActionPriority, setNewActionPriority] = useState<AutopilotPriority>("medium");
  const [newActionTrigger, setNewActionTrigger] = useState("manual");
  const [newActionNotes, setNewActionNotes] = useState("");
  const [prioritizedActions, setPrioritizedActions] = useState(pendingActions);

  const getPriorityIcon = (priority: AutopilotPriority) => {
    switch (priority) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
    }
  };

  const getPriorityColor = (priority: AutopilotPriority) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const handleSaveNewAction = () => {
    // In a real implementation, this would create a new action
    console.log("Saving new action:", {
      title: newActionTitle,
      category: newActionCategory,
      priority: newActionPriority,
      trigger: newActionTrigger,
      notes: newActionNotes
    });
    
    // Reset form
    setNewActionTitle("");
    setNewActionCategory("health");
    setNewActionPriority("medium");
    setNewActionTrigger("manual");
    setNewActionNotes("");
  };

  const handleConfirmAll = () => {
    executeActions(pendingActions.map(action => action.id));
  };

  const handleSnoozeAll = () => {
    dismissActions(pendingActions.map(action => action.id));
  };

  const moveAction = (fromIndex: number, toIndex: number) => {
    const newActions = [...prioritizedActions];
    const [movedAction] = newActions.splice(fromIndex, 1);
    newActions.splice(toIndex, 0, movedAction);
    setPrioritizedActions(newActions);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-4xl" fullscreenOnMobile>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            {t('screens.common.manageMyActions')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('screens.common.reviewPrioritizeAddActionsOptimizeToday')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <Tabs defaultValue="pending" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('screens.common.pending')}
              </TabsTrigger>
              <TabsTrigger value="new" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t('screens.common.newAction')}
              </TabsTrigger>
              <TabsTrigger value="prioritize" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                {t('screens.common.prioritize')}
              </TabsTrigger>
            </TabsList>

            {/* Pending Actions Tab */}
            <TabsContent value="pending" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{t('screens.common.pendingActionsLength', { length: pendingActions.length })}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleConfirmAll}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('screens.common.confirmAll')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSnoozeAll}>
                    <Clock className="w-4 h-4 mr-2" />
                    {t('screens.common.snoozeAll')}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {pendingActions.map(action => (
                  <div key={action.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-xl">{action.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2 flex-wrap">
                            <h4 className="font-medium">{action.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getPriorityColor(action.priority)}`}
                            >
                              {getPriorityIcon(action.priority)} {action.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {action.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{action.reason}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => executeActions([action.id])}
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => dismissActions([action.id])}
                        >
                          <Clock className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => dismissActions([action.id])}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* New Action Tab */}
            <TabsContent value="new" className="space-y-4 mt-4">
              <h3 className="text-lg font-medium">{t('screens.common.addNewAction')}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('screens.common.actionTitle')}</label>
                  <Input 
                    placeholder={t('screens.common.eGEveningWalkCallDoctor')}
                    value={newActionTitle}
                    onChange={(e) => setNewActionTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('screens.common.category')}</label>
                    <Select value={newActionCategory} onValueChange={(value: AutopilotCategory) => setNewActionCategory(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="health">{t('screens.common.health')}</SelectItem>
                        <SelectItem value="community">{t('screens.common.community')}</SelectItem>
                        <SelectItem value="media">{t('screens.common.learning')}</SelectItem>
                        <SelectItem value="discover">{t('screens.common.discover')}</SelectItem>
                        <SelectItem value="calendar">{t('screens.common.calendar')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('screens.common.priority')}</label>
                    <Select value={newActionPriority} onValueChange={(value: AutopilotPriority) => setNewActionPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">{t('screens.common.high')}</SelectItem>
                        <SelectItem value="medium">{t('screens.common.medium')}</SelectItem>
                        <SelectItem value="low">{t('screens.common.low')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">{t('screens.common.trigger')}</label>
                  <Select value={newActionTrigger} onValueChange={setNewActionTrigger}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time-based">{t('screens.common.timebased')}</SelectItem>
                      <SelectItem value="context-based">{t('screens.common.contextbased')}</SelectItem>
                      <SelectItem value="manual">{t('screens.common.manual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">{t('screens.common.optionalNotes')}</label>
                  <Textarea 
                    placeholder={t('screens.common.additionalDetailsContext')}
                    value={newActionNotes}
                    onChange={(e) => setNewActionNotes(e.target.value)}
                  />
                </div>

                <Button onClick={handleSaveNewAction} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('screens.common.saveAction')}
                </Button>
              </div>
            </TabsContent>

            {/* Prioritize Tab */}
            <TabsContent value="prioritize" className="space-y-4 mt-4">
              <h3 className="text-lg font-medium">{t('screens.common.prioritizeActions')}</h3>
              
              <div className="space-y-3">
                {prioritizedActions.map((action, index) => (
                  <div 
                    key={action.id} 
                    className="p-3 rounded-lg border bg-card cursor-move hover:bg-accent transition-colors"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", index.toString())}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
                      moveAction(fromIndex, index);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">{getPriorityIcon(action.priority)}</div>
                      <div className="text-lg">{action.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-medium">{action.title}</h4>
                        <p className="text-sm text-muted-foreground">{action.category}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">#{index + 1}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('screens.common.autopilotSuggestion')}</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  {t('screens.common.recommendedOrderBasedYourCurrentContext')}
                </p>
              </div>

              <Button className="w-full">
                <Star className="w-4 h-4 mr-2" />
                {t('screens.common.savePriorities')}
              </Button>
            </TabsContent>
          </Tabs>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('screens.common.cancel')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {t('screens.common.saveClose')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
