import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, Wand2, X } from "lucide-react";
import { Pattern } from "@/hooks/usePatternDiscovery";
import { t } from '@/lib/i18n-toast';

interface PatternCardProps {
  pattern: Pattern;
  onViewDetails: () => void;
  onReview: () => void;
  onCreateAutomation: () => void;
  onDismiss: () => void;
}

const PATTERN_TYPE_COLORS = {
  user_behavior: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  temporal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  communication: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  workflow: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  health_metric: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
};

const STATUS_COLORS = {
  discovered: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  implemented: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function PatternCard({
  pattern,
  onViewDetails,
  onReview,
  onCreateAutomation,
  onDismiss,
}: PatternCardProps) {
  const confidencePercentage = Math.round(pattern.confidence_level * 100);
  const occurrencePercentage = Math.round(pattern.occurrence_rate * 100);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{pattern.pattern_name}</CardTitle>
              <Badge className={PATTERN_TYPE_COLORS[pattern.pattern_type as keyof typeof PATTERN_TYPE_COLORS]}>
                {pattern.pattern_type.replace('_', ' ')}
              </Badge>
              <Badge className={STATUS_COLORS[pattern.status as keyof typeof STATUS_COLORS]}>
                {pattern.status}
              </Badge>
            </div>
            <CardDescription>{pattern.pattern_description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-b">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{confidencePercentage}%</div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{pattern.sample_size}</div>
            <div className="text-xs text-muted-foreground">Occurrences</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{occurrencePercentage}%</div>
            <div className="text-xs text-muted-foreground">Frequency</div>
          </div>
        </div>

        {/* Expected Impact */}
        <div className="text-sm">
          <span className="font-medium">{t('screens.admin.expectedImpact2')} </span>
          <span className="text-muted-foreground">{pattern.expected_impact}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          
          {pattern.status === "discovered" && (
            <>
              <Button variant="outline" size="sm" onClick={onReview}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Review
              </Button>
              <Button size="sm" onClick={onCreateAutomation}>
                <Wand2 className="h-4 w-4 mr-2" />
                Create Automation
              </Button>
            </>
          )}

          {pattern.status === "reviewed" && (
            <Button size="sm" onClick={onCreateAutomation}>
              <Wand2 className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          )}

          {pattern.status !== "dismissed" && pattern.status !== "implemented" && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          )}
        </div>

        {pattern.linked_rule_id && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Linked to automation rule: {pattern.linked_rule_id}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
