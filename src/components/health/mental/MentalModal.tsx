import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DailyMentalData } from "@/types/mental";
import { Badge } from "@/components/ui/badge";
import { Brain, Heart, Target, Clock } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface MentalModalProps {
  data: DailyMentalData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MentalModal({ data, open, onOpenChange }: MentalModalProps) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span className="text-3xl">{data.moodEmoji}</span>{t('screens.health.dayValue0Dayname2', { value0: data.dayId.split('-')[1], dayName: data.dayName })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Mood */}
          <div className="bg-card/60 rounded-xl p-4 backdrop-blur-sm border border-border/60">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-category-4" />
              <span className="text-sm font-medium text-muted-foreground">{t('screens.health.mood')}</span>
            </div>
            <p className="text-xl font-semibold">{data.mood}</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card/60 rounded-xl p-4 backdrop-blur-sm border border-border/60">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-category-1" />
                <span className="text-sm font-medium text-muted-foreground">{t('screens.health.focus')}</span>
              </div>
              <p className="text-2xl font-bold">{data.focusScore}<span className="text-sm text-muted-foreground">/100</span></p>
            </div>

            <div className="bg-card/60 rounded-xl p-4 backdrop-blur-sm border border-border/60">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-status-warning" />
                <span className="text-sm font-medium text-muted-foreground">{t('screens.health.stress')}</span>
              </div>
              <p className="text-2xl font-bold">{data.stressLevel}<span className="text-sm text-muted-foreground">/100</span></p>
            </div>
          </div>

          {/* Mindfulness */}
          <div className="bg-card/60 rounded-xl p-4 backdrop-blur-sm border border-border/60">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-category-1" />
              <span className="text-sm font-medium text-muted-foreground">{t('screens.health.mindfulnessDuration')}</span>
            </div>
            <p className="text-xl font-semibold">🧘 {data.mindfulnessDuration}</p>
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="text-sm text-muted-foreground">
                {t('screens.health.target10MinDaily')}
              </p>
            </div>
          </div>

          {/* Tags */}
          {data.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('screens.health.activitiesCompleted')}</p>
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag, idx) => (
                  <Badge 
                    key={idx}
                    className="bg-gradient-to-r from-status-success/80 to-category-1/80 text-primary-foreground text-xs font-semibold px-3 py-1"
                  >
                    ✓ {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI Note */}
          <div className="bg-card/60 rounded-xl p-4 backdrop-blur-sm border border-border/60">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-category-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('screens.health.aiInsight')}</p>
                <p className="text-sm italic text-muted-foreground">{data.aiNote}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
