import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, X, Eye, Globe, Users } from "lucide-react";
import { ViewAsMode } from "@/types/profile";
import { t } from '@/lib/i18n-toast';

interface EditToolbarProps {
  viewAs: ViewAsMode;
  onViewAsChange: (mode: ViewAsMode) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditToolbar({ 
  viewAs, 
  onViewAsChange, 
  hasUnsavedChanges, 
  onSave, 
  onCancel 
}: EditToolbarProps) {
  const getViewAsIcon = (mode: ViewAsMode) => {
    switch (mode) {
      case "me": return <Eye className="w-4 h-4" />;
      case "public": return <Globe className="w-4 h-4" />;
      case "follower": return <Users className="w-4 h-4" />;
    }
  };

  const cycleViewAs = () => {
    const modes: ViewAsMode[] = ["me", "public", "follower"];
    const currentIndex = modes.indexOf(viewAs);
    const nextIndex = (currentIndex + 1) % modes.length;
    onViewAsChange(modes[nextIndex]);
  };

  return (
    <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={cycleViewAs}
              className="gap-2"
            >{t('screens.profile.value0ViewAsValue1', { value0: getViewAsIcon(viewAs), value1: viewAs === "me" ? "Me" : viewAs === "public" ? "Public" : "Follower" })}</Button>
            
            <Badge variant={hasUnsavedChanges ? "destructive" : "secondary"}>
              {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              {t('screens.profile.cancel')}
            </Button>
            <Button size="sm" onClick={onSave} disabled={!hasUnsavedChanges}>
              <Save className="w-4 h-4 mr-2" />
              {t('screens.profile.saveChanges')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}