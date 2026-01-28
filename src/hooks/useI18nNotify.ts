import { useTranslation } from "@/hooks/useTranslation";
import { createI18nToast, createI18nConfirm } from "@/lib/i18n-helpers";
import { useMemo } from "react";

/**
 * Hook for translated toast notifications and confirm dialogs.
 * 
 * Usage:
 * const { notify, confirm } = useI18nNotify();
 * 
 * // Show success toast
 * notify.success('toasts.success.saved', 'toasts.success.savedDesc');
 * 
 * // Show error toast with replacements
 * notify.error('toasts.error.generic', 'toasts.error.tryAgain', { action: 'save' });
 * 
 * // Show confirm dialog
 * if (confirm('confirm.delete')) { ... }
 */
export function useI18nNotify() {
  const { translate } = useTranslation();
  
  const notify = useMemo(() => createI18nToast(translate), [translate]);
  const confirm = useMemo(() => createI18nConfirm(translate), [translate]);
  
  return { notify, confirm };
}
