import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, StopCircle } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ActiveRun {
  id: string;
  name: string;
  status: "running" | "queued";
  progress: number;
  currentStep: string;
  startedAt: string;
}

const mockActiveRuns: ActiveRun[] = [
  {
    id: "RUN-2024-LIVE-001",
    name: "Real-time Data Sync",
    status: "running",
    progress: 67,
    currentStep: "Processing batch 3 of 5",
    startedAt: "2 minutes ago"
  },
  {
    id: "RUN-2024-LIVE-002",
    name: "Infrastructure Health Check",
    status: "running",
    progress: 34,
    currentStep: "Analyzing network latency",
    startedAt: "5 minutes ago"
  },
  {
    id: "RUN-2024-LIVE-003",
    name: "Scheduled Maintenance",
    status: "queued",
    progress: 0,
    currentStep: "Waiting for previous run to complete",
    startedAt: "Queued 1 minute ago"
  },
];

export function ActiveRunsList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {mockActiveRuns.map((run) => (
        <Card key={run.id} className="relative overflow-visible">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{run.name}</CardTitle>
              {run.status === "running" ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Running</span>
                </div>
              ) : (
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Queued</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">{run.id}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{run.progress}%</span>
              </div>
              <Progress value={run.progress} className="h-2" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('screens.dev.currentStep')}</p>
              <p className="text-sm font-medium">{run.currentStep}</p>
            </div>

            <div className="text-xs text-muted-foreground">
              Started {run.startedAt}
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="flex-1">
                <FileText className="w-3 h-3 mr-2" />
                View Logs
              </Button>
              <Button size="sm" variant="destructive" className="flex-1">
                <StopCircle className="w-3 h-3 mr-2" />
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
