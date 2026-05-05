import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface VertexDebugConsoleProps {
  logs: LogEntry[];
  onExportLogs: () => void;
}

export function VertexDebugConsole({ logs, onExportLogs }: VertexDebugConsoleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive" className="text-xs">ERROR</Badge>;
      case 'warn':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs">WARN</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">INFO</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{t('screens.vertex.debugConsole')}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportLogs}
              className="h-8"
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border bg-black/5 dark:bg-black/20">
            <div className="p-4 space-y-2 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">{t('screens.vertex.noLogsYet')}</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">
                      {log.timestamp}
                    </span>
                    {getLevelBadge(log.level)}
                    <span className={
                      log.level === 'error' ? 'text-red-600 dark:text-red-400' :
                      log.level === 'warn' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-foreground'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
