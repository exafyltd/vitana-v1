import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface SituationFormProps {
  onAnalyze: (situation: string) => Promise<void>;
  isAnalyzing: boolean;
}

export default function SituationForm({ onAnalyze, isAnalyzing }: SituationFormProps) {
  const [situation, setSituation] = useState("");

  const exampleSituations = [
    "When a patient misses two appointments in a row, send them a wellness check message",
    "Remind users to log their daily medications at 9 AM if they haven't logged yet",
    "Send welcome emails to new users who sign up, including getting started tips",
    "Alert care team when a patient's blood pressure reading is above 140/90"
  ];

  const handleSubmit = async () => {
    if (!situation.trim()) return;
    await onAnalyze(situation);
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('screens.admin.describeYourSituation')}
        </CardTitle>
        <CardDescription>
          {t('screens.admin.tellUsWhatYouWantAutomate')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="situation">{t('screens.admin.whatWouldYouLikeAutomate')}</Label>
          <Textarea
            id="situation"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Describe the scenario you want to automate..."
            rows={4}
            disabled={isAnalyzing}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">{t('screens.admin.exampleScenarios')}</Label>
          <div className="grid gap-2">
            {exampleSituations.map((example, index) => (
              <button
                key={index}
                onClick={() => setSituation(example)}
                disabled={isAnalyzing}
                className="text-left text-sm p-3 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={!situation.trim() || isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {t('screens.admin.analyzeSituation')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
