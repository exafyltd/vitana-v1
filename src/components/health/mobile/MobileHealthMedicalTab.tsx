import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { I18nEmptyState } from "@/components/ui/i18n-empty-state";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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

  const { data: labReports = [], isLoading } = useQuery({
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
        return [];
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

  return (
    <div className="px-4 space-y-4">
      {/* Upload CTA */}
      <button
        onClick={onUpload}
        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-foreground">{translate('health.uploadBloodTest', 'Upload Health Report')}</p>
          <p className="text-sm text-muted-foreground">{translate('health.uploadDescription', 'Blood tests, imaging, lab results')}</p>
        </div>
      </button>

      {/* Reports list */}
      {labReports.length === 0 ? (
        <I18nEmptyState
          Icon={FileText}
          titleKey="health.noReports"
          descriptionKey="health.noReportsDesc"
        />
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
                    {report.provider_name || report.source || translate('health.unknownProvider', 'Unknown provider')}
                  </p>
                  {report.report_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(report.report_date), 'MMM dd, yyyy')}
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
