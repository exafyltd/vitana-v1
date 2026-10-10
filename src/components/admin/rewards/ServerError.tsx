/** VTID-05036 — a gateway error in a form: catalog text plus the server's own message. */
import { AlertCircle } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { errorText } from './errors';

export function ServerError({ error, testId }: { error: unknown; testId?: string }) {
  if (!error) return null;
  const { text, serverMessage } = errorText(error);
  return (
    <div
      role="alert"
      data-testid={testId}
      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1 text-start">
        <p className="break-words">{text}</p>
        {serverMessage && (
          <p className="break-words text-xs opacity-90">{t('admin.rewardsShop.errors.serverMessage', { message: serverMessage })}</p>
        )}
      </div>
    </div>
  );
}
