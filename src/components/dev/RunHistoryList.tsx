import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Play, Copy, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface RunHistoryItem {
  id: string;
  name: string;
  status: "success" | "failed" | "cancelled";
  duration: string;
  date: string;
  initiatedBy: string;
  logs?: string;
}

const mockRunHistory: RunHistoryItem[] = [
  {
    id: "RUN-2024-001",
    name: "Database Backup & Cleanup",
    status: "success",
    duration: "2m 34s",
    date: "2024-01-15 14:32",
    initiatedBy: "System Scheduler",
    logs: "✓ Database backup completed\n✓ Cleanup routines executed\n✓ Verification passed"
  },
  {
    id: "RUN-2024-002",
    name: "Security Audit Workflow",
    status: "success",
    duration: "5m 12s",
    date: "2024-01-15 12:15",
    initiatedBy: "Admin User",
    logs: "✓ Scanned 1,234 endpoints\n✓ No vulnerabilities found\n✓ Report generated"
  },
  {
    id: "RUN-2024-003",
    name: "Deploy to Production",
    status: "failed",
    duration: "1m 08s",
    date: "2024-01-15 09:45",
    initiatedBy: "CI/CD Pipeline",
    logs: "✗ Build failed at stage 3\n✗ Deployment rolled back\n⚠ Check error logs"
  },
  {
    id: "RUN-2024-004",
    name: "Weekly Analytics Report",
    status: "success",
    duration: "3m 42s",
    date: "2024-01-14 23:00",
    initiatedBy: "System Scheduler",
    logs: "✓ Data aggregation complete\n✓ Charts generated\n✓ Email sent to stakeholders"
  },
];

export function RunHistoryList() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "failed": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "cancelled": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-3">
      {mockRunHistory.map((run) => (
        <Card key={run.id} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Main Row */}
            <div 
              className="grid grid-cols-12 gap-4 p-4 items-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedRow(expandedRow === run.id ? null : run.id)}
            >
              <div className="col-span-1 flex items-center">
                {expandedRow === run.id ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="col-span-2 font-mono text-sm text-muted-foreground">{run.id}</div>
              <div className="col-span-3 font-medium">{run.name}</div>
              <div className="col-span-2">
                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusColor(run.status))}>
                  {run.status}
                </span>
              </div>
              <div className="col-span-1 text-sm text-muted-foreground">{run.duration}</div>
              <div className="col-span-2 text-sm text-muted-foreground">{run.date}</div>
              <div className="col-span-1 text-sm text-muted-foreground truncate">{run.initiatedBy}</div>
            </div>

            {/* Expanded Details */}
            {expandedRow === run.id && (
              <div className="border-t bg-muted/20 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">{t('screens.dev.executionLogs')}</h4>
                  <pre className="bg-background p-3 rounded-lg text-xs font-mono whitespace-pre-wrap border">
                    {run.logs}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <FileText className="w-3 h-3 mr-2" />
                    View Full Log
                  </Button>
                  <Button size="sm" variant="outline">
                    <Play className="w-3 h-3 mr-2" />
                    Re-run
                  </Button>
                  <Button size="sm" variant="outline">
                    <Copy className="w-3 h-3 mr-2" />
                    Duplicate as Template
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
