import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Save, 
  Eye, 
  EyeOff, 
  Undo, 
  Redo, 
  Sparkles,
  Clock,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface SmartEditingToolbarProps {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isPreviewMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  onTogglePreview: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAutopilot: () => void;
  className?: string;
}

export function SmartEditingToolbar({
  hasUnsavedChanges,
  isSaving,
  isPreviewMode,
  canUndo,
  canRedo,
  onSave,
  onTogglePreview,
  onUndo,
  onRedo,
  onAutopilot,
  className
}: SmartEditingToolbarProps) {
  return (
    <div className={cn(
      "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b px-6 py-3",
      className
    )}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isPreviewMode ? "default" : "outline"}
            size="sm"
            onClick={onTogglePreview}
          >
            {isPreviewMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {isPreviewMode ? "Exit Preview" : "Preview"}
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-save status */}
          {isSaving ? (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3 animate-spin" />
              {t('screens.profile.saving')}
            </Badge>
          ) : hasUnsavedChanges ? (
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--util-profile-accent))]" />
              {t('screens.profile.unsavedChanges')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {t('screens.profile.allChangesSaved')}
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {t('screens.profile.saveNow')}
          </Button>

          <Button
            size="sm"
            onClick={onAutopilot}
            className="bg-gradient-to-r from-[hsl(var(--util-profile-accent))] to-[hsl(var(--domain-community-accent))] hover:from-[hsl(var(--util-profile-accent)/0.9)] hover:to-[hsl(var(--domain-community-accent)/0.9)] text-white border-0"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {t('screens.profile.aiAssist')}
          </Button>
        </div>
      </div>
    </div>
  );
}