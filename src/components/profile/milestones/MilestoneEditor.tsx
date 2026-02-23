import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/hooks/useTranslation";
import { Milestone } from "@/hooks/useProfileMilestones";

const EMOJI_OPTIONS = ['⭐', '🎓', '💍', '🏆', '✈️', '🏠', '👶', '💼', '🎯', '❤️', '🌍', '🎵', '📚', '🏃', '🧘', '🎉'];

interface MilestoneEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone?: Milestone | null;
  onSave: (input: {
    title: string;
    description?: string;
    milestone_date?: string;
    icon?: string;
    is_public?: boolean;
  }) => void;
  isSaving?: boolean;
}

export function MilestoneEditor({ open, onOpenChange, milestone, onSave, isSaving }: MilestoneEditorProps) {
  const { translate } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [icon, setIcon] = useState('⭐');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title);
      setDescription(milestone.description || '');
      setDate(milestone.milestone_date || '');
      setIcon(milestone.icon || '⭐');
      setIsPublic(milestone.is_public);
    } else {
      setTitle('');
      setDescription('');
      setDate('');
      setIcon('⭐');
      setIsPublic(true);
    }
  }, [milestone, open]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      milestone_date: date || undefined,
      icon,
      is_public: isPublic,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {milestone ? translate('milestones.edit', 'Edit Milestone') : translate('milestones.add', 'Add Milestone')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Emoji picker */}
          <div>
            <Label className="text-sm">{translate('milestones.icon', 'Icon')}</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all ${
                    icon === emoji
                      ? 'bg-primary/20 ring-2 ring-primary scale-110'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="milestone-title">{translate('milestones.titleLabel', 'Title')}</Label>
            <Input
              id="milestone-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={translate('milestones.titlePlaceholder', 'e.g., Graduated from University')}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="milestone-desc">{translate('milestones.description', 'What happened?')}</Label>
            <Textarea
              id="milestone-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={translate('milestones.descPlaceholder', 'Describe this moment...')}
              className="mt-1 resize-none"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="milestone-date">{translate('milestones.date', 'Date')}</Label>
            <Input
              id="milestone-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="milestone-public">{translate('milestones.publicLabel', 'Visible to everyone')}</Label>
            <Switch
              id="milestone-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSaving}>
            {isSaving ? translate('common.saving', 'Saving...') : translate('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
