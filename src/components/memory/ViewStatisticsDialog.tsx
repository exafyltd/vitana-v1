import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, Calendar } from "lucide-react";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { t } from '@/lib/i18n-toast';

interface ViewStatisticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewStatisticsDialog({ open, onOpenChange }: ViewStatisticsDialogProps) {
  const { allItems } = useActivityHistory("all");

  // Calculate statistics
  const totalItems = allItems.length;
  const last7Days = allItems.filter(item => {
    const date = new Date(item.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  }).length;

  const last30Days = allItems.filter(item => {
    const date = new Date(item.createdAt);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return date >= monthAgo;
  }).length;

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  allItems.forEach(item => {
    let category = 'other';
    if (item.itemType === 'activity' && 'activityType' in item) {
      category = item.activityType?.split('.')[0] || 'other';
    } else if (item.itemType === 'exchange') {
      category = 'chat';
    }
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
  });

  const categories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            {t('screens.memory.activityStatistics')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{totalItems}</div>
                    <div className="text-sm text-muted-foreground">{t('screens.memory.totalItems')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-accent" />
                  <div>
                    <div className="text-2xl font-bold">{last7Days}</div>
                    <div className="text-sm text-muted-foreground">{t('screens.memory.last7Days')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-secondary" />
                  <div>
                    <div className="text-2xl font-bold">{last30Days}</div>
                    <div className="text-sm text-muted-foreground">{t('screens.memory.last30Days')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">{t('screens.memory.activityByCategory')}</h3>
              <div className="space-y-3">
                {categories.map(([category, count]) => {
                  const percentage = ((count / totalItems) * 100).toFixed(1);
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{category}</span>
                        <span className="text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('screens.memory.insights')}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Most active category: {categories[0]?.[0] || 'N/A'}</li>
                <li>• Average daily activity: {(last30Days / 30).toFixed(1)} items</li>
                <li>• Weekly trend: {last7Days > last30Days / 4.3 ? '📈 Increasing' : '📉 Decreasing'}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}