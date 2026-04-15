import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY = 'vitana_onboarding_completed';

/**
 * Determines whether the current user still needs to go through
 * the post-registration onboarding flow (Vitana speech + name form).
 *
 * Fast path: checks localStorage flag first.
 * Durable path: falls back to checking if profiles.display_name AND
 *               profiles.handle are both populated.
 */
export function useOnboardingStatus() {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // Not authenticated — no onboarding needed
    if (!user) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    // Fast path: localStorage flag means onboarding is done
    if (localStorage.getItem(ONBOARDING_KEY) === user.id) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    // Durable check: query the profiles table
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, handle')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn('[Onboarding] Failed to check profile:', error.message);
          // On error, assume onboarding is not needed to avoid blocking the user
          setNeedsOnboarding(false);
          setLoading(false);
          return;
        }

        const hasName = !!data?.display_name?.trim();
        const hasHandle = !!data?.handle?.trim();

        if (hasName && hasHandle) {
          // Profile is complete — mark localStorage to skip next time
          localStorage.setItem(ONBOARDING_KEY, user.id);
          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(true);
        }
      } catch (err) {
        console.error('[Onboarding] Error checking status:', err);
        setNeedsOnboarding(false);
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
