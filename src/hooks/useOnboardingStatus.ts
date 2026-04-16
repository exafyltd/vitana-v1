import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY = 'vitana_onboarding_completed';

/**
 * Determines whether the current user still needs to go through
 * the post-registration onboarding flow (Vitana speech + name form).
 *
 * Resolution order:
 * 1. localStorage flag (set after successful form submission) → skip onboarding
 * 2. Profile query with display_name AND handle populated → skip onboarding
 * 3. Profile query with missing display_name OR handle → show onboarding
 * 4. Query error / uncertain → show onboarding (safer default for new users)
 */
export function useOnboardingStatus() {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      console.debug('[Onboarding] Auth still loading, waiting…');
      return;
    }

    // Not authenticated — no onboarding needed (shouldn't even reach this page)
    if (!user) {
      console.debug('[Onboarding] No user, skipping onboarding check');
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    // Fast path: localStorage flag means user has completed the form before
    if (localStorage.getItem(ONBOARDING_KEY) === user.id) {
      console.debug('[Onboarding] localStorage flag set for user', user.id.slice(0, 8), '→ skipping');
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    // Durable check: query the profiles table
    let cancelled = false;
    (async () => {
      try {
        console.debug('[Onboarding] Checking profile for user', user.id.slice(0, 8));
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, handle')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn('[Onboarding] Profile query failed:', error.message, '→ showing onboarding as safer default');
          // Safer default: show onboarding on error. A new user who hasn't
          // filled their profile is more common than an existing user with
          // query issues — and the form upsert will handle both cases.
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }

        const hasName = !!data?.display_name?.trim();
        const hasHandle = !!data?.handle?.trim();

        console.debug('[Onboarding] Profile check:', {
          hasName, hasHandle,
          display_name: data?.display_name,
          handle: data?.handle,
        });

        if (hasName && hasHandle) {
          // Profile is complete — mark localStorage to skip next time
          localStorage.setItem(ONBOARDING_KEY, user.id);
          console.debug('[Onboarding] Profile complete → flag set, skipping');
          setNeedsOnboarding(false);
        } else {
          console.debug('[Onboarding] Profile incomplete → showing onboarding');
          setNeedsOnboarding(true);
        }
      } catch (err: any) {
        console.error('[Onboarding] Unexpected error:', err?.message);
        // Safer default on unexpected errors too
        setNeedsOnboarding(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  return { needsOnboarding, loading };
}

/** Call after the user completes the onboarding form to persist the flag. */
export function markOnboardingComplete(userId: string) {
  localStorage.setItem(ONBOARDING_KEY, userId);
}
