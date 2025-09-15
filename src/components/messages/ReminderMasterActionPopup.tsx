import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Send, MessageSquare, Users, Bell, CheckCircle, AlertCircle, Zap } from "lucide-react";

interface ReminderMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ReminderMasterActionPopup({ open, onOpenChange, trigger }: ReminderMasterActionPopupProps) {
  const handleAction = (action: string) => {
    console.log(`Reminder action: ${action}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            Smart Reminder Actions
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("quick-reply-all")}
          >
            <Zap className="w-5 h-5" />
            <span className="text-sm">Quick Reply All</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("mark-all-read")}
          >
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm">Mark All Read</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("set-auto-replies")}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">Auto-Replies</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("snooze-reminders")}
          >
            <Bell className="w-5 h-5" />
            <span className="text-sm">Snooze All</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("priority-filter")}
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Priority Filter</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("batch-respond")}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm">Batch Respond</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}