import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, Zap, ArrowRight } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface AnalysisResultsProps {
  analysis: any;
  onDeploy: () => void;
  isDeploying: boolean;
}

export default function AnalysisResults({ analysis, onDeploy, isDeploying }: AnalysisResultsProps) {
  const result = analysis.analysis_result;

  const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary"
  } as const;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                {t('screens.admin.aiAnalysisComplete')}
              </CardTitle>
              <CardDescription>
                Analysis took {analysis.analysis_duration_ms}ms
              </CardDescription>
            </div>
            <Badge variant={priorityColors[result.priority as keyof typeof priorityColors]}>
              {result.priority} priority
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">{t('screens.admin.analysis')}</h4>
            <p className="text-sm text-muted-foreground">{result.analysis}</p>
          </div>

          {result.estimatedImpact && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('screens.admin.expectedImpact')}</p>
                  <p className="text-sm text-muted-foreground">{result.estimatedImpact}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('screens.admin.suggestedTriggers')}</CardTitle>
          <CardDescription>{t('screens.admin.eventsThatWillStartThisAutomation')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {result.suggestedTriggers?.map((trigger: string, index: number) => (
              <Badge key={index} variant="outline" className="px-3 py-1">
                {trigger.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {result.suggestedConditions && result.suggestedConditions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('screens.admin.suggestedConditions')}</CardTitle>
            <CardDescription>{t('screens.admin.whenTheseConditionsMet')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.suggestedConditions.map((condition: any, index: number) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Badge variant="secondary">{condition.field}</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="secondary">{condition.operator}</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="secondary">{condition.value}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{condition.reasoning}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('screens.admin.suggestedActions')}</CardTitle>
          <CardDescription>{t('screens.admin.whatWillHappenWhenTriggered')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.suggestedActions?.map((action: any, index: number) => (
            <div key={index} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Badge>{action.type.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="text-sm space-y-1">
                {Object.entries(action.config).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium">{key}: </span>
                    <span className="text-muted-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{action.reasoning}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t('screens.admin.analyzeAnother')}
        </Button>
        <Button onClick={onDeploy} disabled={isDeploying}>
          {isDeploying ? "Deploying..." : "Deploy as Automation"}
        </Button>
      </div>
    </div>
  );
}
