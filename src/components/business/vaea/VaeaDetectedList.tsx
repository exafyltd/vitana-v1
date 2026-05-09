import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useVaeaDetectedQuestions } from "@/hooks/useVaea";
import { t } from '@/lib/i18n-toast';

export function VaeaDetectedList({ limit = 25, collapsible = true }: { limit?: number; collapsible?: boolean }) {
  const { questions, loading, error, reload } = useVaeaDetectedQuestions(limit);
  const [open, setOpen] = useState(!collapsible);

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/20">
        <CardContent className="py-4 flex items-center justify-between gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={reload}>{t('screens.business.retry')}</Button>
        </CardContent>
      </Card>
    );
  }

  const header = (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h3 className="font-medium text-sm">{t('screens.business.whatAutopilotSaw')}</h3>
        <p className="text-xs text-muted-foreground">{t('screens.business.everyMessageAutopilotScannedIncludingOnes')}</p>
      </div>
      {collapsible && (
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="ml-1">{questions.length}</span>
        </Button>
      )}
    </div>
  );

  if (!open) return <div>{header}</div>;

  return (
    <div className="space-y-2">
      {header}
      {questions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-1">{t('screens.business.nothingDetectedYet')}</p>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="rounded-lg border border-white/30 bg-white/50 p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{q.platform}</span>
                {q.author_handle && <span>· @{q.author_handle}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{q.disposition.replace("_", " ")}</Badge>
                <span className="text-xs font-mono">{q.combined_score.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-sm line-clamp-2">{q.message_body}</p>
            {q.extracted_topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {q.extracted_topics.slice(0, 6).map((t) => (
                  <span key={t} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{t}</span>
                ))}
              </div>
            )}
            {q.disposition_reason && (
              <p className="text-[11px] text-muted-foreground mt-1 italic">{q.disposition_reason}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
