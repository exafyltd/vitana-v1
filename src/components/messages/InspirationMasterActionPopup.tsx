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
import { Lightbulb, Plus, Edit3, Copy, Bookmark, Share2, Users, Sparkles } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface InspirationMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function InspirationMasterActionPopup({ open, onOpenChange, trigger }: InspirationMasterActionPopupProps) {
  const handleAction = (action: string) => {
    console.log(`Inspiration action: ${action}`);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>}
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
          <ResponsiveDialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-purple-500" />
            Inspiration Actions
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        
        <ResponsiveDialogBody>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("create-template")}
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.createTemplate')}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("edit-template")}
            >
              <Edit3 className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.editTemplate')}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("copy-favorites")}
            >
              <Copy className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.copyFavorites')}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("save-collection")}
            >
              <Bookmark className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.saveCollection')}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("share-templates")}
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.shareTemplates')}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex-col gap-2"
              onClick={() => handleAction("ai-suggestions")}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-sm">{t('screens.messages.aiSuggestions')}</span>
            </Button>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}