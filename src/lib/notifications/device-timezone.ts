/**
 * VTID-04676: quiet hours are checked on the server in the member's own
 * timezone (profiles.timezone). Nothing ever wrote that column, so every
 * member had the default 'UTC'. When a member sets quiet hours we save the
 * device's timezone with it, so 22:00 means 22:00 where they are.
 */
import { supabase } from "@/integrations/supabase/client";

export function deviceTimeZone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.length > 0 ? tz : null;
  } catch {
    return null;
  }
}

/** Best effort: a failure leaves the server default (Europe/Berlin) in place. */
export async function saveDeviceTimeZone(userId: string): Promise<void> {
  const tz = deviceTimeZone();
  if (!tz) return;
  try {
    const { error } = await supabase.from("profiles").update({ timezone: tz }).eq("user_id", userId);
    if (error) console.warn("[quiet-hours] timezone not saved:", error.message);
  } catch (err) {
    console.warn("[quiet-hours] timezone not saved:", err);
  }
}
