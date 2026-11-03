/**
 * VTID-05475 — Settings → Privacy: "Introduce me to the community" (explicit
 * choice). Default off: nobody is introduced until they choose Yes (owner
 * decision 2026-10-30, supersedes VTID-05206 D1). On: during the first 7 days
 * the News Feed shows a "new member" card so other members can say hello; the
 * member becomes Say-Hello eligible. Off: no card, not eligible. Reads and
 * writes the member's own global_community_profiles row (src/lib/community-intro.ts).
 * Every toggle — on AND off — is recorded via setCommunityIntroOptIn, which
 * writes both community_intro_opt_in and the community_intro_choice_at marker
 * (so a withdrawal is an explicit false + marker, not an absence). Hides itself
 * while loading or when the setting cannot be read, like the phone switch.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthProvider";
import { t, notifyError } from "@/lib/i18n-toast";
import { getCommunityIntroOptIn, setCommunityIntroOptIn } from "@/lib/community-intro";

export function CommunityIntroToggle() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = ["community-intro-opt-in", userId];

  const { data: optedIn, isError, isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    retry: false,
    queryFn: () => getCommunityIntroOptIn(userId as string),
  });

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!userId) throw new Error("Not authenticated");
      await setCommunityIntroOptIn(userId, next);
      return next;
    },
    onSuccess: (next) => queryClient.setQueryData(queryKey, next),
    onError: () => notifyError("screens.settings.communityIntroSaveFailed"),
  });

  if (!userId || isError || isLoading) return null;

  return (
    <div className="flex items-center justify-between gap-3" data-testid="community-intro">
      <div>
        <h4 className="font-medium">{t("screens.settings.communityIntroTitle")}</h4>
        <p className="text-sm text-muted-foreground">{t("screens.settings.communityIntroBody")}</p>
      </div>
      <Switch
        data-testid="community-intro-switch"
        checked={optedIn === true}
        disabled={mutation.isPending}
        aria-label={t("screens.settings.communityIntroTitle")}
        onCheckedChange={(v) => mutation.mutate(v)}
      />
    </div>
  );
}
