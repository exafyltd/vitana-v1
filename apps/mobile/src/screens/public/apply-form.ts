/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — the
 * `/apply` test-user application form, pure part: the same fields, required
 * set, regexes, error keys, order of checks and payload as src/pages/Apply.tsx
 * `handleSubmit`. The web page is class-B (it imports the Supabase client), so
 * this is mirrored natively, not re-exported from `@vitana/core`.
 *
 * `submitApplication` performs the web's one public insert
 * (`test_user_applications`, no auth) through the app's Supabase client. The
 * native app has no production profile (`assertNotProduction()`); the unit
 * tests run it only against a fake client — no live submit.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type Device = 'ios' | 'android';
export type ApplyLocale = 'de' | 'en';

export interface ApplyFormState {
  full_name: string;
  email: string;
  phone: string;
  instagram_handle: string;
  device: Device | '';
  google_account_email: string;
  location: string;
  available_for_events: boolean;
  consent_age: boolean;
  consent_terms: boolean;
}

export const EMPTY_APPLY_FORM: ApplyFormState = {
  full_name: '',
  email: '',
  phone: '',
  instagram_handle: '',
  device: '',
  google_account_email: '',
  location: '',
  available_for_events: false,
  consent_age: false,
  consent_terms: false,
};

export const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const INSTAGRAM_RX = /^@?[A-Za-z0-9._]{1,30}$/;

/** The first failing check's `apply.*` error key, or null when the form may be sent. */
export function validateApplication(form: ApplyFormState): string | null {
  if (
    !form.full_name.trim() ||
    !form.email.trim() ||
    !form.phone.trim() ||
    !form.instagram_handle.trim() ||
    !form.device ||
    !form.location.trim() ||
    !form.consent_age ||
    !form.consent_terms
  ) {
    return 'apply.errorRequired';
  }
  if (!EMAIL_RX.test(form.email.trim())) return 'apply.errorInvalidEmail';
  if (!INSTAGRAM_RX.test(form.instagram_handle.trim())) return 'apply.errorInvalidInstagram';
  if (form.device === 'android' && !form.google_account_email.trim()) return 'apply.errorAndroidGoogleRequired';
  return null;
}

export type Utm = { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null };

export function applicationPayload(form: ApplyFormState, locale: ApplyLocale, utm: Utm) {
  return {
    full_name: form.full_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    instagram_handle: form.instagram_handle.trim().replace(/^@/, ''),
    device: form.device,
    google_account_email: form.device === 'android' ? form.google_account_email.trim().toLowerCase() : null,
    location: form.location.trim(),
    available_for_events: form.available_for_events,
    consent_age: form.consent_age,
    consent_terms: form.consent_terms,
    locale,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
  };
}

export type ApplicationPayload = ReturnType<typeof applicationPayload>;

/** null on success, else the `apply.*` error key (23505 = already applied). */
export async function submitApplication(client: SupabaseClient, payload: ApplicationPayload): Promise<string | null> {
  try {
    const { error } = await (client as unknown as { from: (table: string) => { insert: (rows: unknown) => Promise<{ error: { code?: string } | null }> } })
      .from('test_user_applications')
      .insert(payload);
    if (!error) return null;
    return error.code === '23505' ? 'apply.errorAlreadyApplied' : 'apply.errorGeneric';
  } catch {
    return 'apply.errorGeneric';
  }
}
