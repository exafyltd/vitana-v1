import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Send, UserPlus, Settings, Filter, Calendar, Bell } from "lucide-react";
import { t } from '@/lib/i18n-toast';

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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>}
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
          <ResponsiveDialogTitle className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            Inbox Actions
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        
        <ResponsiveDialogBody>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("compose")}
            >
              <Send className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.composeMessage')}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("new-group")}
            >
              <Users className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.newGroupChat')}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("invite-contact")}
            >
              <UserPlus className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.inviteContact')}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("schedule-message")}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.scheduleMessage')}</span>
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
              <span className="text-sm">{t('screens.messages.messageFilters')}</span>
            </Button>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}