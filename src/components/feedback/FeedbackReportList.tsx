import { useEffect, useState } from "react";
import { Bug, Lightbulb, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface FeedbackReport {
  id: string;
  transcript: string;
  report_type: "bug_report" | "ux_improvement";
  severity: "low" | "medium" | "high" | "critical";
  affected_screen: string | null;
  status: string;
  vtid: string | null;
  created_at: string;
  attachments: string[];
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  received: { label: "Received", variant: "secondary", icon: Clock },
  under_review: { label: "Under Review", variant: "default", icon: Loader2 },
  in_progress: { label: "In Progress", variant: "default", icon: Loader2 },
  fixed: { label: "Fixed", variant: "outline", icon: CheckCircle2 },
  wont_fix: { label: "Won't Fix", variant: "destructive", icon: XCircle },
  duplicate: { label: "Duplicate", variant: "secondary", icon: XCircle },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30",
  medium: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/30",
  high: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30",
  critical: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30",
};

interface FeedbackReportListProps {
  refreshKey?: number;
}

export function FeedbackReportList({ refreshKey }: FeedbackReportListProps) {
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_feedback_reports" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setReports(data as unknown as FeedbackReport[]);
      }
      setLoading(false);
    };

    fetchReports();
  }, [refreshKey]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("feedback-reports-changes")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "user_feedback_reports" },
        async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data } = await supabase
            .from("user_feedback_reports" as any)
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (data) setReports(data as unknown as FeedbackReport[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
        <Bug className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">No reports sent yet</p>
        <p className="text-xs text-muted-foreground/70">
          Use the recorder above to report bugs or suggest improvements
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        My Reports ({reports.length})
      </h3>
      {reports.map((report) => {
        const statusConfig = STATUS_CONFIG[report.status] || STATUS_CONFIG.received;
        const StatusIcon = statusConfig.icon;

        return (
          <Card key={report.id} className="overflow-hidden">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {report.report_type === "bug_report" ? (
                    <Bug className="h-4 w-4 text-red-500" />
                  ) : (
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-sm flex-1 line-clamp-2">
                  {report.transcript.slice(0, 80)}
                  {report.transcript.length > 80 ? "..." : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusConfig.variant} className="gap-1 text-xs">
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[report.severity] || ''}`}>
                  {report.severity}
                </span>
                {report.affected_screen && (
                  <span className="text-xs text-muted-foreground">
                    {report.affected_screen}
                  </span>
                )}
                {report.vtid && (
                  <Badge variant="outline" className="text-xs">
                    {report.vtid}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                {report.attachments?.length > 0 && ` · ${report.attachments.length} attachment(s)`}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
