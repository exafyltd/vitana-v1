import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Download, Play, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface ExecutionLog {
  id: string;
  name: string;
  status: "success" | "failed" | "running" | "cancelled";
  duration: string;
  date: string;
  initiator: string;
  output?: string;
  vtid?: string;
}

const MOCK_LOGS: ExecutionLog[] = [
  {
    id: "exec_2025_001",
    name: "Deploy Production Pipeline",
    status: "success",
    duration: "2m 34s",
    date: "2025-01-15 14:32",
    initiator: "system.autopilot",
    vtid: "VTID-2025-001",
    output: "✓ All stages completed successfully\n✓ 12 services deployed\n✓ Health checks passed",
  },
  {
    id: "exec_2025_002",
    name: "Database Migration v2.4",
    status: "success",
    duration: "45s",
    date: "2025-01-15 13:15",
    initiator: "user.admin",
    vtid: "VTID-2025-002",
    output: "✓ Migration applied\n✓ 3 tables updated\n✓ Indexes rebuilt",
  },
  {
    id: "exec_2025_003",
    name: "API Gateway Restart",
    status: "failed",
    duration: "1m 12s",
    date: "2025-01-15 11:47",
    initiator: "system.monitor",
    vtid: "VTID-2025-003",
    output: "✗ Connection timeout\n✗ Upstream service unavailable\n→ Retrying...",
  },
  {
    id: "exec_2025_004",
    name: "Backup Task Scheduler",
    status: "success",
    duration: "3m 21s",
    date: "2025-01-15 09:00",
    initiator: "system.cron",
    output: "✓ 247 files backed up\n✓ Compression ratio: 67%\n✓ Upload to S3 complete",
  },
];

export function ExecutionLogsList() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const filteredLogs = MOCK_LOGS.filter((log) => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (agentFilter !== "all" && !log.initiator.includes(agentFilter)) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "running":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "cancelled":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4 bg-white/50 dark:bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">{t('screens.dev.status')}</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('screens.dev.allStatuses2')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('screens.dev.allStatuses')}</SelectItem>
                <SelectItem value="success">{t('screens.dev.success')}</SelectItem>
                <SelectItem value="failed">{t('screens.dev.failed')}</SelectItem>
                <SelectItem value="running">{t('screens.dev.running')}</SelectItem>
                <SelectItem value="cancelled">{t('screens.dev.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">{t('screens.dev.agent')}</label>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('screens.dev.allAgents2')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('screens.dev.allAgents')}</SelectItem>
                <SelectItem value="system">{t('screens.dev.system')}</SelectItem>
                <SelectItem value="user">{t('screens.dev.user')}</SelectItem>
                <SelectItem value="autopilot">{t('screens.dev.autopilot')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Execution Logs Table */}
      <Card className="bg-white/50 dark:bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-12"></TableHead>
              <TableHead>ID</TableHead>
              <TableHead>{t('screens.dev.name')}</TableHead>
              <TableHead>{t('screens.dev.status')}</TableHead>
              <TableHead>{t('screens.dev.duration')}</TableHead>
              <TableHead>{t('screens.dev.date')}</TableHead>
              <TableHead>{t('screens.dev.initiator')}</TableHead>
              <TableHead className="text-right">{t('screens.dev.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <>
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-muted/50 border-border/50"
                  onClick={() =>
                    setExpandedRow(expandedRow === log.id ? null : log.id)
                  }
                >
                  <TableCell>
                    {expandedRow === log.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.id}
                  </TableCell>
                  <TableCell className="font-medium">{log.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("capitalize", getStatusColor(log.status))}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.duration}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.date}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {log.initiator}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("View details:", log.id);
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {expandedRow === log.id && (
                  <TableRow className="border-border/50">
                    <TableCell colSpan={8} className="bg-muted/20 p-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            {t('screens.dev.executionOutput')}
                          </h4>
                          <pre className="bg-background/50 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap border border-border/50">
                            {log.output || "No output available"}
                          </pre>
                        </div>

                        {log.vtid && (
                          <div>
                            <span className="text-sm text-muted-foreground">{t('screens.dev.vtidValue0', { value0: " " })}</span>
                            <code className="text-sm font-mono bg-background/50 px-2 py-1 rounded">
                              {log.vtid}
                            </code>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline">
                            <Download className="w-3 h-3 mr-2" />
                            {t('screens.dev.exportLog')}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Play className="w-3 h-3 mr-2" />
                            {t('screens.dev.rerunCommand')}
                          </Button>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-3 h-3 mr-2" />
                            {t('screens.dev.viewDetails')}
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <p>{t('screens.dev.noExecutionLogsMatchYourFilters')}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
