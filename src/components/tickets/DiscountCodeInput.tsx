import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, Check, X, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

interface DiscountCodeInputProps {
  onApply: (code: string) => Promise<{ valid: boolean; message?: string }>;
  appliedCode?: string | null;
  onClear?: () => void;
}

export default function DiscountCodeInput({ onApply, appliedCode, onClear }: DiscountCodeInputProps) {
  const [code, setCode] = useState(appliedCode || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(!!appliedCode);
  const { translate } = useTranslation();

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await onApply(code.trim().toUpperCase());
      if (result.valid) {
        setApplied(true);
      } else {
        setError(result.message || translate('discount.invalid'));
      }
    } catch {
      setError(translate('discount.invalid'));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode("");
    setApplied(false);
    setError(null);
    onClear?.();
  };

  if (applied) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
        <Check className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm text-green-700 dark:text-green-400 font-medium flex-1">
          {translate('discount.applied')} <code className="font-mono">{code}</code>
        </span>
        <button onClick={handleClear} className="text-green-600 hover:text-green-800">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">{translate('discount.applyCode')}</span>
      </div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          placeholder={t('screens.tickets.maxinaxxxxxx')}
          className="font-mono text-sm uppercase"
          maxLength={13}
        />
        <Button
          onClick={handleApply}
          disabled={!code.trim() || loading}
          size="sm"
          variant="outline"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : translate('discount.applyCode')}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
