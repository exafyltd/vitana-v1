import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';

interface OnboardingStatus {
  needsOnboarding: boolean;
  isLoading: boolean;
  markOnboardingComplete: () => void;
}

export function useOnboardingStatus(): OnboardingStatus {
  const { user } = useAuth();
  const { tenant } = useTenant();

  // Fast path: check localStorage synchronously
  const cachedComplete = tenant?.id
    ? getLocalStorageItem(tenant.id, 'onboarding', 'completed') === 'true'
    : false;

  const [needsOnboarding, setNeedsOnboarding] = useState(!cachedComplete);
  const [isLoading, setIsLoading] = useState(!cachedComplete);

  useEffect(() => {
    // If localStorage says completed, skip the DB query
    if (cachedComplete) {
      setNeedsOnboarding(false);
      setIsLoading(false);
      return;
    }

    if (!user?.id || !tenant?.id) return;

    let cancelled = false;

    async function check() {
      try {
        const { data } = await supabase
          .from('user_journey')
          .select('onboarding_stage')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (cancelled) return;

        const stage = data?.onboarding_stage;
        if (stage && stage !== 'new') {
          // Already completed in DB — cache locally and skip overlay
          setNeedsOnboarding(false);
          setLocalStorageItem(tenant!.id, 'onboarding', 'completed', 'true');
        } else {
          // Stage is 'new' or no row exists — needs onboarding
          setNeedsOnboarding(true);
        }
      } catch (err) {
        console.warn('[Onboarding] Failed to check status:', err);
        // On error, don't block — assume no onboarding needed
        setNeedsOnboarding(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [user?.id, tenant?.id, cachedComplete]);

  const markOnboardingComplete = useCallback(() => {
    if (!user?.id || !tenant?.id) return;

    // Write localStorage immediately (fast path for next load)
    setLocalStorageItem(tenant.id, 'onboarding', 'completed', 'true');
    setNeedsOnboarding(false);

    // Update backend (fire-and-forget)
    supabase
      .from('user_journey')
      .update({ onboarding_stage: 'completed' })
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) {
          console.warn('[Onboarding] Failed to update journey stage:', error.message);
        }
      });
  }, [user?.id, tenant?.id]);

  return { needsOnboarding, isLoading, markOnboardingComplete };
}
