/**
 * Creator Hooks - Stripe Connect Express Integration
 * VTID-01230: Enable creators to receive payments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notifyError } from '@/lib/i18n-toast';

// VTID-01230: No fallback to prod - fail loudly if missing
const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE;
if (!GATEWAY_BASE) {
  throw new Error('[VTID-01230] VITE_GATEWAY_BASE environment variable is required');
}

// ============================================================================
// Types
// ============================================================================

export interface CreatorStatus {
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarded_at: string | null;
}

// ============================================================================
// Helper: Get JWT Token
// ============================================================================

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get creator's Stripe Connect status
 */
export function useCreatorStatus() {
  return useQuery({
    queryKey: ['creator', 'status'],
    queryFn: async (): Promise<CreatorStatus> => {
      const token = await getToken();
      const response = await fetch(`${GATEWAY_BASE}/api/v1/creators/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch creator status');
      }

      const data = await response.json();
      return {
        stripe_account_id: data.stripe_account_id,
        charges_enabled: data.charges_enabled || false,
        payouts_enabled: data.payouts_enabled || false,
        onboarded_at: data.onboarded_at,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Start Stripe Connect onboarding
 */
export function useCreatorOnboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (returnUrl?: string) => {
      const token = await getToken();
      const response = await fetch(`${GATEWAY_BASE}/api/v1/creators/onboard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: returnUrl || `${window.location.origin}/creator/onboarded`,
          refresh_url: `${window.location.origin}/creator/onboard`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start onboarding');
      }

      const data = await response.json();
      return data.onboarding_url;
    },
    onSuccess: (onboardingUrl) => {
      // VTID-01230: Validate Stripe URL before redirect
      if (!onboardingUrl.startsWith('https://connect.stripe.com/')) {
        throw new Error('Invalid onboarding URL - must be Stripe Connect');
      }
      window.location.href = onboardingUrl;
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.onboardingFailed');
    },
  });
}

/**
 * Get Stripe Express dashboard link
 */
export function useCreatorDashboard() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch(`${GATEWAY_BASE}/api/v1/creators/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get dashboard link');
      }

      const data = await response.json();
      return data.dashboard_url;
    },
    onSuccess: (dashboardUrl) => {
      // VTID-01230: Validate Stripe URL before opening
      if (!dashboardUrl.startsWith('https://connect.stripe.com/')) {
        throw new Error('Invalid dashboard URL - must be Stripe Connect');
      }
      window.open(dashboardUrl, '_blank');
    },
    onError: (error: Error) => {
      notifyError('toasts.hooks.dashboardUnavailable');
    },
  });
}
