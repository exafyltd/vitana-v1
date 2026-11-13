/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — page telemetry of
 * the Discover screens (`src/hooks/useActivityLogger.ts`: one `user_activity_log`
 * row per page view with the app session id), re-implemented natively (class B:
 * the web Supabase client).
 *
 * VTID-05653: the reads behind the utility bar and the gift-voucher calls moved
 * to `shell/utility/data.ts` (one bar, one voucher modal for every screen);
 * they are re-exported here so the Discover screens and their suites keep one
 * import path.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'expo-crypto';
import { getSupabase } from '../../../auth/client';

export {
  AUTOPILOT_ROLE,
  CONSENT_KEY,
  VOUCHER_STATUS_ATTEMPTS,
  VOUCHER_STATUS_DELAY_MS,
  createVoucherCheckout,
  dismissedKey,
  downloadVoucherPdf,
  fetchVitanaIndex,
  fetchVoucherOrder,
  sendVoucherEmail,
  useAutopilotPendingCount,
  useCalendarEvents,
  useVitanaIndex,
  waitForPaidVoucherOrder,
  type CalendarEventRow,
  type VoucherCheckout,
  type VoucherPdfData,
} from '../../../shell/utility/data';

const db = () => getSupabase() as any;

// ── activity log ─────────────────────────────────────────────────────────
let appSessionId: string | null = null;

/** web `useActivityLogger().logActivity`: one row, signed-in members only, never throws. */
export async function logActivity(entry: { activityType: string; activityData: unknown; contextData?: unknown; dedupeKey?: string }): Promise<void> {
  try {
    const { data } = await db().auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return;
    if (!appSessionId) appSessionId = randomUUID();
    await db()
      .from('user_activity_log')
      .insert({
        user_id: userId,
        activity_type: entry.activityType,
        activity_data: entry.activityData,
        context_data: entry.contextData ?? {},
        dedupe_key: entry.dedupeKey,
        session_id: appSessionId,
      });
  } catch {
    /* telemetry never blocks the page */
  }
}
