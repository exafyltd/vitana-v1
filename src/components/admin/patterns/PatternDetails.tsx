import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pattern } from "@/hooks/usePatternDiscovery";
import { t } from '@/lib/i18n-toast';

interface PatternDetailsProps {
  pattern: Pattern | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PatternDetails({ pattern, open, onOpenChange }: PatternDetailsProps) {
  if (!pattern) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{pattern.pattern_name}</DialogTitle>
          <DialogDescription>{pattern.pattern_description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Metrics */}
          <div>
            <h3 className="font-semibold mb-3">{t('screens.admin.patternMetrics')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">{t('screens.admin.confidenceLevel')}</div>
                <div className="text-2xl font-bold">{Math.round(pattern.confidence_level * 100)}%</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">{t('screens.admin.sampleSize')}</div>
                <div className="text-2xl font-bold">{pattern.sample_size}</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">{t('screens.admin.occurrenceRate')}</div>
                <div className="text-2xl font-bold">{Math.round(pattern.occurrence_rate * 100)}%</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">{t('screens.admin.status')}</div>
                <div className="text-lg font-semibold capitalize">{pattern.status}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Triggers */}
          {pattern.triggers && pattern.triggers.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">{t('screens.admin.suggestedTriggers')}</h3>
              <div className="flex flex-wrap gap-2">
                {pattern.triggers.map((trigger, idx) => (
                  <Badge key={idx} variant="outline" className="text-sm">
                    {trigger}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Conditions */}
          {pattern.conditions && pattern.conditions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">{t('screens.admin.suggestedConditions')}</h3>
              <div className="space-y-2">
                {pattern.conditions.map((condition: any, idx: number) => (
                  <div key={idx} className="p-3 border rounded-lg bg-muted/50">
                    <div className="font-mono text-sm">
                      <span className="font-semibold">{condition.field}</span>
                      {' '}{condition.operator}{' '}
                      <span className="text-primary">{condition.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {pattern.suggested_actions && pattern.suggested_actions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">{t('screens.admin.suggestedActions')}</h3>
              <div className="space-y-3">
                {pattern.suggested_actions.map((action: any, idx: number) => (
                  <div key={idx} className="p-4 border rounded-lg bg-muted/50">
                    <div className="font-semibold mb-2 capitalize">
                      {action.type?.replace('_', ' ') || 'Action'}
                    </div>
                    {action.config && (
                      <div className="space-y-1 text-sm">
                        {Object.entries(action.config).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-muted-foreground">{key}: </span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected Impact */}
          <div>
            <h3 className="font-semibold mb-3">{t('screens.admin.expectedImpact')}</h3>
            <p className="text-sm text-muted-foreground">{pattern.expected_impact}</p>
          </div>

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
            <div>{t('screens.admin.discoveredValue0', { value0: new Date(pattern.created_at).toLocaleString() })}</div>
            {pattern.reviewed_at && (
              <div>{t('screens.admin.reviewedValue0', { value0: new Date(pattern.reviewed_at).toLocaleString() })}</div>
            )}
            {pattern.implemented_at && (
              <div>{t('screens.admin.implementedValue0', { value0: new Date(pattern.implemented_at).toLocaleString() })}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
