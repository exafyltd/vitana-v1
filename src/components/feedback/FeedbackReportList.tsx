import { useState } from "react";
import { Bug, Lightbulb, Clock, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from "@/components/ui/responsive-confirm-dialog";
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { formatDistanceToNow } from '@/lib/locale-format';
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
  const [displayCount, setDisplayCount] = useState(5);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['feedback-reports', refreshKey],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_feedback_reports" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return [];
      return (data as unknown as FeedbackReport[]) || [];
    },
  });

  const visibleReports = reports?.slice(0, displayCount) || [];
  const hasMore = reports && reports.length > displayCount;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const report = reports?.find(r => r.id === deleteTarget);
      // Cleanup storage files if they exist
      if (report?.attachments && Array.isArray(report.attachments)) {
        const filePaths = report.attachments
          .map(url => {
            const match = url.match(/feedback-attachments\/(.+?)(?:\?|$)/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];
        if (filePaths.length > 0) {
          await supabase.storage.from('feedback-attachments').remove(filePaths);
        }
      }

      const { error } = await supabase
        .from("user_feedback_reports" as any)
        .delete()
        .eq("id", deleteTarget);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['feedback-reports'], exact: false });
      notify('toasts.feedback.reportDeleted', 'toasts.feedback.feedbackReportHasRemoved');
    } catch (error) {
      notifyError('toasts.feedback.error', 'toasts.feedback.failedDeleteReportPleaseTryAgain');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
            <Bug className="h-5 w-5 text-destructive" />
          </div>
          <p>{t('screens.feedback.noReportsSentYet')}</p>
          <p className="text-sm mt-1">{t('screens.feedback.useRecorderAboveReportBugsSuggest')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{t('screens.feedback.myReportsLength', { length: reports.length })}
        </h3>
        {visibleReports.map((report) => {
          const statusConfig = STATUS_CONFIG[report.status] || STATUS_CONFIG.received;
          const StatusIcon = statusConfig.icon;

          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      report.report_type === "bug_report"
                        ? "bg-destructive/10"
                        : "bg-yellow-100 dark:bg-yellow-950/30"
                    }`}>
                      {report.report_type === "bug_report" ? (
                        <Bug className="h-5 w-5 text-destructive" />
                      ) : (
                        <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusConfig.variant} className="gap-1 text-xs">
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[report.severity] || ''}`}>
                        {report.severity}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </span>
                      <button
                        onClick={() => setDeleteTarget(report.id)}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={t('screens.feedback.deleteReport')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm line-clamp-2">
                      {report.transcript.slice(0, 120)}
                      {report.transcript.length > 120 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      {report.affected_screen && (
                        <Badge variant="outline" className="text-xs">
                          {report.affected_screen}
                        </Badge>
                      )}
                      {report.vtid && (
                        <Badge variant="outline" className="text-xs">
                          {report.vtid}
                        </Badge>
                      )}
                      {report.attachments?.length > 0 && (
                        <span className="text-xs text-muted-foreground">{t('screens.feedback.lengthAttachmentS', { length: report.attachments.length })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={() => setDisplayCount(prev => prev + 10)}
            className="px-6 py-2 text-sm font-medium text-primary hover:text-primary/80 bg-muted/60 hover:bg-muted rounded-full transition-colors"
          >{t('screens.feedback.loadMoreValue0Remaining', { value0: reports.length - displayCount })}
          </button>
        </div>
      )}

      <ResponsiveConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <ResponsiveConfirmDialogContent className="max-w-sm">
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>{t('screens.feedback.deleteReport')}</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>
              {t('screens.feedback.thisFeedbackReportWillPermanentlyDeleted')}
            </ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel disabled={isDeleting}>{t('screens.feedback.cancel')}</ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>
    </>
  );
}
