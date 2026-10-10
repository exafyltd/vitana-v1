/**
 * VTID-05036 — a gateway error as text for the admin: the catalog line for the
 * error code, plus the server's own `message` when it sent one (e.g. the
 * database's reason for ITEM_REJECTED).
 */
import { t } from '@/lib/i18n-toast';
import { AdminApiError } from '@/hooks/useAdminRewardShop';

const KNOWN = new Set([
  'INVALID_ITEM', 'ITEM_REJECTED', 'IMAGE_TOO_LARGE', 'IMAGE_TYPE_NOT_ALLOWED', 'IMAGE_UPLOAD_FAILED',
  'IMAGE_PROCESSING_FAILED', 'INVALID_FEE', 'FEE_REJECTED', 'INVALID_TRANSITION', 'ORDER_NOT_FOUND', 'FORBIDDEN',
]);

export function errorCode(err: unknown): string {
  if (err instanceof AdminApiError) return err.code;
  if (err instanceof Error && KNOWN.has(err.message)) return err.message;
  return 'generic';
}

export function errorText(err: unknown): { text: string; serverMessage: string | null } {
  const code = errorCode(err);
  const text = t(`admin.rewardsShop.errors.${KNOWN.has(code) ? code : 'generic'}`);
  const serverMessage = err instanceof AdminApiError ? err.serverMessage : null;
  return { text, serverMessage };
}
