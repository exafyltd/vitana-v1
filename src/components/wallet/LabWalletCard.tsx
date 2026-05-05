import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Upload, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RewardDot } from "@/components/ui/reward-dot";
import { useHealthLogger } from "@/hooks/useHealthLogger";
import { t } from '@/lib/i18n-toast';

export function LabWalletCard() {
  const { logLabReportUpload, logLabReportExport } = useHealthLogger();

  return (
    <Card className="relative">
      <RewardDot points={20} description="Upload lab results for rewards" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-cyan-500" />
          Lab Wallet
        </CardTitle>
        <CardDescription>{t('screens.wallet.testResultsBiomarkers')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2 bg-cyan-50 rounded">
            <div className="text-lg font-bold text-cyan-600">24</div>
            <div className="text-xs text-muted-foreground">{t('screens.wallet.labReports')}</div>
          </div>
          <div className="p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">847</div>
            <div className="text-xs text-muted-foreground">{t('screens.wallet.vtnEarned')}</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{t('screens.wallet.latestCompleteBloodPanel')}</span>
            <Badge variant="secondary" className="text-xs">{t('screens.wallet.jan15')}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{t('screens.wallet.pendingLipidProfile')}</span>
            <Badge variant="outline" className="text-xs">Processing</Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1 bg-cyan-500 hover:bg-cyan-600"
            onClick={logLabReportUpload}
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={logLabReportExport}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}