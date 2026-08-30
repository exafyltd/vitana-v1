/**
 * VTID-03319 — opt-in toggle for the news-feed "most improved" spotlight.
 *
 * Persists profiles.index_spotlight_consent for the current user. Off by
 * default; the gateway only considers opted-in members for the spotlight and
 * never exposes exact Index scores. Self-contained so the Privacy page only
 * needs to drop it in.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { t } from "@/lib/i18n-toast";

export function SpotlightConsentToggle() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = ["spotlight-consent", userId];

  const { data: consent = false, isError } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("index_spotlight_consent")
        .eq("user_id", userId as string)
        .maybeSingle();
      // A privacy-sensitive read must not silently default to "off" on a
      // real DB error — that misrepresents the user's actual saved choice
      // instead of showing an error/loading state.
      if (error) throw error;
      return Boolean((data as { index_spotlight_consent?: boolean } | null)?.index_spotlight_consent);
    },
  });

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ index_spotlight_consent: next } as never)
        .eq("user_id", userId);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => queryClient.setQueryData(queryKey, next),
  });

  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-medium">{t("screens.home.spotlightConsentTitle")}</h4>
        <p className="text-sm text-muted-foreground">{t("screens.home.spotlightConsentDesc")}</p>
      </div>
      <Switch
        checked={consent}
        disabled={!userId || mutation.isPending || isError}
        onCheckedChange={(v) => mutation.mutate(v)}
      />
    </div>
  );
}
