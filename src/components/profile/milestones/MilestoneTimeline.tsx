import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { Milestone } from "@/hooks/useProfileMilestones";
import { MilestoneEditor } from "./MilestoneEditor";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface MilestoneTimelineProps {
  milestones: Milestone[];
  isOwner: boolean;
  onAdd: (input: any) => void;
  onUpdate: (input: any) => void;
  onDelete: (id: string) => void;
  isAdding?: boolean;
  compact?: boolean;
}

export function MilestoneTimeline({
  milestones,
  isOwner,
  onAdd,
  onUpdate,
  onDelete,
  isAdding,
  compact = false,
}: MilestoneTimelineProps) {
  const { translate } = useTranslation();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const displayMilestones = compact ? milestones.slice(0, 3) : milestones;

  if (milestones.length === 0 && !isOwner) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">🏆</span>
          {translate('milestones.title', 'Life Milestones')}
        </h3>
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => { setEditingMilestone(null); setEditorOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {translate('milestones.add', 'Add')}
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <Card className="p-8 text-center bg-muted/30 border-dashed">
          <p className="text-muted-foreground text-sm">
            {translate('milestones.empty', 'No milestones yet')}
          </p>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => { setEditingMilestone(null); setEditorOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {translate('milestones.addFirst', 'Add your first milestone')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

          <div className="space-y-4">
            {displayMilestones.map((milestone, index) => (
              <div key={milestone.id} className="relative flex gap-4 group" style={{ animationDelay: `${index * 80}ms` }}>
                {/* Icon dot */}
                <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center text-lg shadow-sm">
                  {milestone.icon || '⭐'}
                </div>

                {/* Content card */}
                <Card className={cn(
                  "flex-1 p-4 rounded-xl bg-card/80 backdrop-blur-sm border-muted/40",
                  "hover:shadow-md transition-shadow"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">{milestone.title}</h4>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{milestone.description}</p>
                      )}
                      {milestone.milestone_date && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(new Date(milestone.milestone_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    {isOwner && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingMilestone(milestone); setEditorOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => onDelete(milestone.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {!milestone.is_public && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {translate('milestones.private', 'Private')}
                    </Badge>
                  )}
                </Card>
              </div>
            ))}
          </div>

          {compact && milestones.length > 3 && (
            <p className="text-xs text-muted-foreground text-center mt-3">{t('screens.profile.value0More', { value0: milestones.length - 3 })}
            </p>
          )}
        </div>
      )}

      <MilestoneEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        milestone={editingMilestone}
        onSave={(input) => {
          if (editingMilestone) {
            onUpdate({ ...input, id: editingMilestone.id });
          } else {
            onAdd(input);
          }
          setEditorOpen(false);
        }}
        isSaving={isAdding}
      />
    </div>
  );
}
