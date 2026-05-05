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
      <DialogContent className="max-w-lg bg-gradient-to-br from-[#FDE2E4]/95 via-[#FAD4C0]/95 to-[#CDEDF6]/95 dark:from-[#1A1013]/95 dark:via-[#1E1C1B]/95 dark:to-[#122025]/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span className="text-3xl">{data.moodEmoji}</span>
            Day {data.dayId.split('-')[1]} - {data.dayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Mood */}
          <div className="bg-white/60 dark:bg-slate-900/50 rounded-xl p-4 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mood</span>
            </div>
            <p className="text-xl font-semibold">{data.mood}</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/60 dark:bg-slate-900/50 rounded-xl p-4 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-teal-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Focus</span>
              </div>
              <p className="text-2xl font-bold">{data.focusScore}<span className="text-sm text-slate-500">/100</span></p>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/50 rounded-xl p-4 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Stress</span>
              </div>
              <p className="text-2xl font-bold">{data.stressLevel}<span className="text-sm text-slate-500">/100</span></p>
            </div>
          </div>

          {/* Mindfulness */}
          <div className="bg-white/60 dark:bg-slate-900/50 rounded-xl p-4 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-teal-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('screens.health.mindfulnessDuration')}</span>
            </div>
            <p className="text-xl font-semibold">🧘 {data.mindfulnessDuration}</p>
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Target: 10 min daily
              </p>
            </div>
          </div>

          {/* Tags */}
          {data.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('screens.health.activitiesCompleted')}</p>
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag, idx) => (
                  <Badge 
                    key={idx}
                    className="bg-gradient-to-r from-emerald-400 to-teal-400 text-white text-xs font-semibold px-3 py-1"
                  >
                    ✓ {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI Note */}
          <div className="bg-white/60 dark:bg-slate-900/50 rounded-xl p-4 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('screens.health.aiInsight')}</p>
                <p className="text-sm italic text-slate-700 dark:text-slate-300">{data.aiNote}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
