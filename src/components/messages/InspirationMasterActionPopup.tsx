import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb, Plus, Edit3, Copy, Bookmark, Share2, Users, Sparkles } from "lucide-react";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-purple-500" />
            Inspiration Actions
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("create-template")}
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">Create Template</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("edit-template")}
          >
            <Edit3 className="w-5 h-5" />
            <span className="text-sm">Edit Template</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("copy-favorites")}
          >
            <Copy className="w-5 h-5" />
            <span className="text-sm">Copy Favorites</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("save-collection")}
          >
            <Bookmark className="w-5 h-5" />
            <span className="text-sm">Save Collection</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("share-templates")}
          >
            <Share2 className="w-5 h-5" />
            <span className="text-sm">Share Templates</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-2"
            onClick={() => handleAction("ai-suggestions")}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-sm">AI Suggestions</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}