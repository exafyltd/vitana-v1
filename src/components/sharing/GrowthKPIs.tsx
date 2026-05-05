import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Eye, MousePointer, Share2, DollarSign } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface KPI {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: any;
}

const MOCK_KPIS: KPI[] = [
  { label: "Reach", value: "12.4K", change: "+23%", trend: "up", icon: Eye },
  { label: "Clicks", value: "3,247", change: "+18%", trend: "up", icon: MousePointer },
  { label: "CTR", value: "4.2%", change: "+0.8%", trend: "up", icon: TrendingUp },
  { label: "Revenue", value: "$842", change: "+31%", trend: "up", icon: DollarSign },
];

export function GrowthKPIs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {t('screens.sharing.growthKpis')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('screens.sharing.last7DaysPerformance')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {MOCK_KPIS.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4" />
                  {kpi.label}
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <Badge
                    variant="secondary"
                    className={
                      kpi.trend === "up"
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {kpi.change}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Share2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('screens.sharing.bestTimePostToday')}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('screens.sharing.text900Am1100')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
