import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from '@/lib/locale-format';
interface MobileHealthMedicalTabProps {
  onUpload: () => void;
}

const REPORT_TYPE_ICONS: Record<string, string> = {
  blood_panel: '🩸',
  hormones: '⚗️',
  cancer: '🔬',
  allergy: '🤧',
  imaging: '📷',
  genomics: '🧬',
  metabolomics: '🧪',
  microbiome: '🦠',
  other: '📋',
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success"> = {
  uploaded: 'secondary',
  processing: 'default',
  processed: 'success',
  error: 'destructive',
};

export function MobileHealthMedicalTab({ onUpload }: MobileHealthMedicalTabProps) {
  const { translate } = useTranslation();

  const { data: labReports = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['lab-reports'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching lab reports:', error);
        throw error;
      }
      return data || [];
    },
  });

  const handleViewReport = async (filePath: string | null) => {
    if (!filePath) return;
    const { data } = await supabase.storage
      .from('health-reports')
      .createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4">
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-6 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {translate('health.reportsLoadFailed')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            {translate('health.reportsLoadFailedDesc')}
          </p>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
            {translate('health.reportsLoadFailedRetry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4">
      {/* Upload CTA — only show when reports exist; empty state has its own CTA */}
      {labReports.length > 0 && (
        <button
          onClick={onUpload}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground">{translate('health.uploadBloodTest', 'Upload Health Report')}</p>
            <p className="text-sm text-muted-foreground">{translate('health.uploadDescription')}</p>
          </div>
        </button>
      )}

      {/* Reports list */}
      {labReports.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 border border-border p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {translate('health.noReports')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            {translate('health.noReportsDesc')}
          </p>
          <Button size="sm" className="rounded-full gap-1.5" onClick={onUpload}>
            <Upload className="h-4 w-4" />
            {translate('health.uploadFirstReport')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {labReports.map((report: any) => {
            const icon = REPORT_TYPE_ICONS[report.report_type || 'other'] || '📋';
            const statusVariant = STATUS_VARIANTS[report.processing_status || 'uploaded'] || 'secondary';

            return (
              <button
                key={report.id}
                onClick={() => handleViewReport(report.raw_file_ref)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors text-left"
              >
                <span className="text-2xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {report.title || report.raw_file_ref || 'Health Report'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {report.provider_name || report.source || translate('health.unknownProvider')}
                  </p>
                  {report.report_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(new Date(report.report_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
                <Badge variant={statusVariant} className="shrink-0 capitalize">
                  {report.processing_status || 'uploaded'}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
