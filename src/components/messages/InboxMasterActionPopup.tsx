import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Send, UserPlus, Settings, Filter, Calendar, Bell } from "lucide-react";

interface InboxMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function InboxMasterActionPopup({ open, onOpenChange, trigger }: InboxMasterActionPopupProps) {
  const handleAction = (action: string) => {
    console.log(`Inbox action: ${action}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            Inbox Actions
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("compose")}
          >
            <Send className="w-5 h-5" />
            <span className="text-sm">Compose Message</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("new-group")}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm">New Group Chat</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("invite-contact")}
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-sm">Invite Contact</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("schedule-message")}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-sm">Schedule Message</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("notification-settings")}
          >
            <Bell className="w-5 h-5" />
            <span className="text-sm">Notifications</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("message-filters")}
          >
            <Filter className="w-5 h-5" />
            <span className="text-sm">Message Filters</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}