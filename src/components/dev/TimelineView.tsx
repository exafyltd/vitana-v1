import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  status: "success" | "failed" | "running" | "info";
  initiator: string;
  details?: string;
}

const MOCK_EVENTS: TimelineEvent[] = [
  {
    id: "evt_001",
    timestamp: "2025-01-15 14:32:15",
    title: "Production deployment completed",
    status: "success",
    initiator: "system.autopilot",
    details: "12 services deployed successfully across 3 availability zones",
  },
  {
    id: "evt_002",
    timestamp: "2025-01-15 14:30:02",
    title: "Pre-deployment health check started",
    status: "running",
    initiator: "system.monitor",
    details: "Validating system readiness for deployment",
  },
  {
    id: "evt_003",
    timestamp: "2025-01-15 13:15:42",
    title: "Database migration v2.4 applied",
    status: "success",
    initiator: "user.admin",
    details: "3 tables updated, indexes rebuilt, schema version incremented",
  },
  {
    id: "evt_004",
    timestamp: "2025-01-15 11:47:33",
    title: "API Gateway restart failed",
    status: "failed",
    initiator: "system.monitor",
    details: "Connection timeout to upstream service, retry scheduled",
  },
  {
    id: "evt_005",
    timestamp: "2025-01-15 11:45:12",
    title: "Anomaly detected in response times",
    status: "info",
    initiator: "system.monitor",
    details: "95th percentile latency exceeded threshold for 3 consecutive minutes",
  },
  {
    id: "evt_006",
    timestamp: "2025-01-15 09:00:05",
    title: "Scheduled backup task completed",
    status: "success",
    initiator: "system.cron",
    details: "247 files backed up to S3, 67% compression ratio",
  },
];

export function TimelineView() {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("today");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case "running":
        return <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-green-500/50";
      case "failed":
        return "border-red-500/50";
      case "running":
        return "border-blue-500/50";
      default:
        return "border-gray-500/50";
    }
  };

  return (
    <div className="space-y-4">
      {/* Time Range Filter */}
      <Card className="p-4 bg-white/50 dark:bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">{t('screens.dev.timeRange')}</label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">{t('screens.dev.thisWeek')}</SelectItem>
              <SelectItem value="month">{t('screens.dev.thisMonth')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Timeline Feed */}
      <div className="space-y-3">
        {MOCK_EVENTS.map((event, index) => (
          <Card
            key={event.id}
            className={cn(
              "bg-white/50 dark:bg-card/50 backdrop-blur-sm border-l-4 transition-all duration-200",
              getStatusColor(event.status),
              expandedEvent === event.id && "ring-2 ring-primary/20"
            )}
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() =>
                setExpandedEvent(expandedEvent === event.id ? null : event.id)
              }
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">{getStatusIcon(event.status)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{event.timestamp}</span>
                        <span>•</span>
                        <span className="font-mono">{event.initiator}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="capitalize text-xs"
                      >
                        {event.status}
                      </Badge>
                      {expandedEvent === event.id ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {expandedEvent === event.id && event.details && (
                <div className="mt-4 pl-9 animate-fade-in">
                  <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground border border-border/50">
                    {event.details}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {MOCK_EVENTS.length === 0 && (
        <Card className="p-12 text-center bg-white/50 dark:bg-card/50 backdrop-blur-sm">
          <p className="text-muted-foreground">
            No timeline events for the selected time range.
          </p>
        </Card>
      )}
    </div>
  );
}
