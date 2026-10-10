/**
 * VTID-05058 — "People who have my number can find me".
 *
 * Persists profiles.discoverable_by_phone (VTID-05057, on by default). The
 * gateway matches an imported phone number to a member only when that
 * member's number is verified and this switch is on. Until the VTID-05057
 * migration is applied the column does not exist; the read then fails and
 * the switch is hidden rather than showing a choice that cannot be saved.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { t } from "@/lib/i18n-toast";

export function PhoneDiscoverabilityToggle() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = ["phone-discoverability", userId];

  const { data: discoverable, isError, isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("discoverable_by_phone" as never)
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as { discoverable_by_phone?: boolean } | null)?.discoverable_by_phone !== false;
    },
  });

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ discoverable_by_phone: next } as never)
        .eq("user_id", userId);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => queryClient.setQueryData(queryKey, next),
  });

  if (!userId || isError || isLoading) return null;

  return (
    <div className="flex items-center justify-between gap-3" data-testid="phone-discoverability">
      <div>
        <h4 className="font-medium">{t("mailhub.findFriends.privacy.title")}</h4>
        <p className="text-sm text-muted-foreground">{t("mailhub.findFriends.privacy.body")}</p>
      </div>
      <Switch
        checked={!!discoverable}
        disabled={mutation.isPending}
        aria-label={t("mailhub.findFriends.privacy.title")}
        onCheckedChange={(v) => mutation.mutate(v)}
      />
    </div>
  );
}
