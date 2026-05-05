import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { ExternalContact, CsvValidationResult } from "@/types/audience";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

interface CsvContactUploaderProps {
  onContactsImported: (contacts: ExternalContact[]) => void;
  currentContacts?: ExternalContact[];
}

export function CsvContactUploader({ onContactsImported, currentContacts = [] }: CsvContactUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Basic validation: allow digits, spaces, hyphens, parentheses, plus
    return /^[\d\s\-\(\)\+]{10,}$/.test(phone);
  };

  const parseCsvText = (text: string): CsvValidationResult => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header row
    const headerRow = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = headerRow.findIndex(h => h.includes('name'));
    const emailIdx = headerRow.findIndex(h => h.includes('email'));
    const phoneIdx = headerRow.findIndex(h => h.includes('phone') && !h.includes('whatsapp'));
    const whatsappIdx = headerRow.findIndex(h => h.includes('whatsapp'));

    if (nameIdx === -1) {
      throw new Error('CSV must contain a "name" column');
    }

    const valid: ExternalContact[] = [];
    const invalid: Array<{ row: number; data: any; errors: string[] }> = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const errors: string[] = [];

      const name = values[nameIdx]?.trim() || '';
      const email = emailIdx !== -1 ? values[emailIdx]?.trim() : undefined;
      const phone = phoneIdx !== -1 ? values[phoneIdx]?.trim() : undefined;
      const whatsapp_number = whatsappIdx !== -1 ? values[whatsappIdx]?.trim() : undefined;

      // Validate
      if (!name) {
        errors.push('Name is required');
      }

      if (email && !validateEmail(email)) {
        errors.push('Invalid email format');
      }

      if (phone && !validatePhone(phone)) {
        errors.push('Invalid phone format');
      }

      if (whatsapp_number && !validatePhone(whatsapp_number)) {
        errors.push('Invalid WhatsApp number format');
      }

      if (!email && !phone && !whatsapp_number) {
        errors.push('At least one contact method (email, phone, or WhatsApp) is required');
      }

      if (errors.length > 0) {
        invalid.push({ row: i + 1, data: { name, email, phone, whatsapp_number }, errors });
      } else {
        valid.push({ name, email, phone, whatsapp_number });
      }
    }

    return {
      valid,
      invalid,
      totalRows: lines.length - 1 // excluding header
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      notifyError('toasts.sharing.pleaseUploadCsvFile');
      return;
    }

    setIsProcessing(true);

    try {
      const text = await file.text();
      const result = parseCsvText(text);
      
      setValidationResult(result);

      if (result.valid.length === 0) {
        notifyError('toasts.sharing.noValidContactsFoundCsv');
      } else {
        toast.success(`${result.valid.length} contacts imported successfully`);
        onContactsImported(result.valid);
      }
    } catch (error) {
      console.error('CSV parsing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse CSV file');
      setValidationResult(null);
    } finally {
      setIsProcessing(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleClearImport = () => {
    setValidationResult(null);
    onContactsImported([]);
    notifySuccess('toasts.sharing.importCleared');
  };

  const hasImportedContacts = currentContacts.length > 0;

  return (
    <div className="space-y-4">
      {!hasImportedContacts ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">{t('screens.sharing.uploadCsvFile')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            CSV should contain columns: name, email, phone, whatsapp_number
          </p>
          <Button variant="outline" className="relative" disabled={isProcessing}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            {isProcessing ? 'Processing...' : 'Choose CSV File'}
          </Button>
        </div>
      ) : (
        <Card className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <h3 className="font-semibold">{t('screens.sharing.csvImported')}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentContacts.length} contacts ready to send
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearImport}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {validationResult && validationResult.invalid.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">
                  {validationResult.invalid.length} rows skipped due to errors
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                {validationResult.invalid.slice(0, 5).map((item, idx) => (
                  <div key={idx}>
                    Row {item.row}: {item.errors.join(', ')}
                  </div>
                ))}
                {validationResult.invalid.length > 5 && (
                  <div>...and {validationResult.invalid.length - 5} more</div>
                )}
              </div>
            </div>
          )}

          {/* Preview first 5 contacts */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Preview</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {currentContacts.slice(0, 5).map((contact, idx) => (
                <div key={idx} className="text-xs bg-muted/50 rounded p-2">
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-muted-foreground">
                    {contact.email && `📧 ${contact.email}`}
                    {contact.phone && ` 📱 ${contact.phone}`}
                    {contact.whatsapp_number && ` 💬 ${contact.whatsapp_number}`}
                  </div>
                </div>
              ))}
              {currentContacts.length > 5 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  ...and {currentContacts.length - 5} more contacts
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Instructions */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">{t('screens.sharing.csvFormatRequirements')}</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>{t('screens.sharing.firstRowMustContainColumnHeaders')}</li>
          <li>Required column: <code>{t('screens.sharing.name')}</code></li>
          <li>Optional columns: <code>{t('screens.sharing.email')}</code>, <code>{t('screens.sharing.phone')}</code>, <code>{t('screens.sharing.whatsapp_number')}</code></li>
          <li>{t('screens.sharing.atLeastOneContactMethodEmail')}</li>
        </ul>
      </div>
    </div>
  );
}
