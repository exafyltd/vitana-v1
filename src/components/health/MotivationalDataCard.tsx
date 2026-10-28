import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

interface MotivationalDataCardProps {
  userName?: string;
  dataCompleteness?: number;
}

export default function MotivationalDataCard({ userName = "there", dataCompleteness = 45 }: MotivationalDataCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="h-full bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to border-2 border-dashed border-category-2/25">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-category-2" />{t('screens.health.heyUsername', { userName })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-base font-medium text-foreground">
            {t('screens.health.iNeedYourBloodTestResults')}
          </p>
          
          <p className="text-sm text-muted-foreground">
            {t('screens.health.withYourBiomarkerDataICan')}
          </p>

          {/* Progress indicator */}
          <div className="bg-card/60 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span>{t('screens.health.healthProfile')}</span>
              <span className="text-category-2">{t('screens.health.datacompletenessComplete', { dataCompleteness })}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-category-2/80 to-category-4 transition-all duration-500"
                style={{ width: `${dataCompleteness}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button 
            className="w-full bg-gradient-to-r from-category-2 to-category-4 hover:from-category-2 hover:to-category-4"
            onClick={() => navigate('/health/biomarker-results')}
          >
            <Upload className="w-4 h-4 me-2" />
            {t('screens.health.uploadBloodTest')}
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/health/services-hub')}
          >
            {t('screens.health.orderBloodTest')}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          {t('screens.health.donTWorryYourDataPrivate')}
        </p>
      </CardContent>
    </Card>
  );
}
