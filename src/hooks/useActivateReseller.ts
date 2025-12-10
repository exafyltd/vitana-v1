import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "./useTenant";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

/**
 * Hook to activate reseller capability for the current user.
 * Creates a reseller_profiles entry if one doesn't exist.
 * Can be called from the "+ Business" wizard or via Autopilot.
 */
export function useActivateReseller() {
  const { session } = useAuth();
  const { activeTenantId } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isActivating, setIsActivating] = useState(false);

  /**
   * Generate a unique reseller code based on user name/email and timestamp
   */
  const generateResellerCode = (email: string): string => {
    const namePart = email.split("@")[0].toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const yearPart = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${namePart}_${yearPart}_${randomPart}`;
  };

  /**
   * Activate reseller capability for the current user.
   * Creates reseller_profile if missing, then redirects to My Business → Sell & Earn tab.
   */
  const activateResellerForCurrentUser = async (options?: { 
    redirectAfter?: boolean;
    showToast?: boolean;
  }): Promise<boolean> => {
    const { redirectAfter = true, showToast = true } = options || {};

    if (!session?.user?.id || !activeTenantId) {
      toast({
        title: "Error",
        description: "You must be logged in to activate reseller mode.",
        variant: "destructive",
      });
      return false;
    }

    setIsActivating(true);

    try {
      // Check if reseller profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from("reseller_profiles")
        .select("id, status")
        .eq("user_id", session.user.id)
        .eq("tenant_id", activeTenantId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error checking existing reseller profile:", fetchError);
        throw fetchError;
      }

      if (existingProfile) {
        // Profile exists - reactivate if paused
        if (existingProfile.status !== "active") {
          const { error: updateError } = await supabase
            .from("reseller_profiles")
            .update({ status: "active" })
            .eq("id", existingProfile.id);

          if (updateError) throw updateError;
        }

        if (showToast) {
          toast({
            title: "Reseller Mode Active",
            description: "Your reseller dashboard is now available in My Business.",
          });
        }
      } else {
        // Create new reseller profile
        const resellerCode = generateResellerCode(session.user.email || "USER");

        const { error: insertError } = await supabase
          .from("reseller_profiles")
          .insert({
            user_id: session.user.id,
            tenant_id: activeTenantId,
            reseller_code: resellerCode,
            commission_rate: 10, // Default 10% commission
            status: "active",
            metadata: {
              activated_via: "self_service",
              activated_at: new Date().toISOString(),
            },
          });

        if (insertError) {
          console.error("Error creating reseller profile:", insertError);
          throw insertError;
        }

        if (showToast) {
          toast({
            title: "Welcome, Reseller! 🎉",
            description: "You can now promote events and earn commissions. Check out your Sell & Earn dashboard.",
          });
        }
      }

      // Invalidate reseller profile cache
      queryClient.invalidateQueries({ queryKey: ["reseller-profile"] });

      // Redirect to Business Hub with sell-earn tab
      if (redirectAfter) {
        navigate("/business/sell-earn");
      }

      return true;
    } catch (error: any) {
      console.error("Error activating reseller:", error);
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate reseller mode. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsActivating(false);
    }
  };

  return {
    activateResellerForCurrentUser,
    isActivating,
  };
}
