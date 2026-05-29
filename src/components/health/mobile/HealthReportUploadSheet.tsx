import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  Upload, FileText, CalendarIcon, Loader2, CheckCircle,
  Droplets, Dna, FlaskConical, Bug, AlertTriangle, 
  Heart, Scan, ImageIcon, MoreHorizontal 
} from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
const REPORT_CATEGORIES = [
  { value: 'blood_panel', label: 'Blood Panel', icon: Droplets, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { value: 'genomics', label: 'Genomics', icon: Dna, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { value: 'metabolomics', label: 'Metabolomics', icon: FlaskConical, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  { value: 'microbiome', label: 'Microbiome', icon: Bug, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'allergy', label: 'Allergy', icon: AlertTriangle, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  { value: 'cancer', label: 'Cancer', icon: Heart, color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  { value: 'hormones', label: 'Hormones', icon: FlaskConical, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  { value: 'imaging', label: 'Imaging', icon: Scan, color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-muted text-muted-foreground border-border' },
] as const;

type ReportCategory = typeof REPORT_CATEGORIES[number]['value'];

interface HealthReportUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
  defaultCategory?: ReportCategory;
}

export function HealthReportUploadSheet({ 
  open, onOpenChange, onUploadComplete, defaultCategory = 'blood_panel' 
}: HealthReportUploadSheetProps) {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>(defaultCategory);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [providerName, setProviderName] = useState("");
  const [testDate, setTestDate] = useState<Date>(new Date());
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Reset state when sheet opens with new defaultCategory
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedCategory(defaultCategory);
      setSelectedFile(null);
      setProviderName("");
      setTestDate(new Date());
    }
    onOpenChange(isOpen);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      notifyError('toasts.health.fileTooLarge', 'toasts.health.maximumFileSize20mb');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const tenantId = user.app_metadata?.active_tenant_id;
      if (!tenantId) throw new Error("No active tenant");

      // Materialize file into memory (mobile reliability pattern)
      const arrayBuffer = await selectedFile.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: selectedFile.type });

      // Build storage path
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${selectedCategory}/${Date.now()}_${sanitizedName}`;

      // Upload to storage bucket
      const { error: uploadError } = await supabase.storage
        .from('health-reports')
        .upload(filePath, blob, {
          contentType: selectedFile.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert into lab_reports (new columns via type assertion since migration may not be in generated types yet)
      const { error: dbError } = await supabase
        .from('lab_reports')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          report_date: formatDate(testDate, 'yyyy-MM-dd'),
          source: 'upload',
          // New columns added by migration - cast to bypass generated types until refresh
          ...(({
            report_type: selectedCategory,
            title: selectedFile.name,
            provider_name: providerName || null,
            file_path: filePath,
            file_size: selectedFile.size,
            mime_type: selectedFile.type,
            processing_status: 'uploaded',
          }) as any),
        } as any);

      if (dbError) throw dbError;

      notify('toasts.health.reportUploaded', 'toasts.health.yourHealthReportHasSavedSuccessfully');
      onUploadComplete?.();
      handleOpenChange(false);
    } catch (error: any) {
      console.error('[HealthReportUpload] Error:', error);
      notifyError('toasts.health.uploadFailed');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[90dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {t('screens.health.uploadHealthReport')}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Category Pills */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('screens.health.reportType')}</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {REPORT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all",
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : cat.color
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Upload Zone */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('screens.health.document')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                >{t('screens.health.change')}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">{t('screens.health.tapSelectFile')}</span>
                <span className="text-xs">{t('screens.health.pdfJpegPngHeicMax20mb')}</span>
              </button>
            )}
          </div>

          {/* Provider Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('screens.health.providerLabOptional')}</label>
            <Input
              placeholder={t('screens.health.eGQuestDiagnostics')}
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
            />
          </div>

          {/* Test Date */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('screens.health.testDate')}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(testDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={testDate}
                  onSelect={(date) => date && setTestDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Upload Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!selectedFile || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('screens.health.uploading')}</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> {t('screens.health.uploadReport')}</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
