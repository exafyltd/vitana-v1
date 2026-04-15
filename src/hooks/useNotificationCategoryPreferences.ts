import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || "";

async function getJwt(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export interface CategoryPreference {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  enabled: boolean;
}

export interface CategoryPreferencesGrouped {
  chat: CategoryPreference[];
  calendar: CategoryPreference[];
  community: CategoryPreference[];
}

export function useNotificationCategoryPreferences() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user-category-preferences", user?.id],
    queryFn: async (): Promise<CategoryPreferencesGrouped> => {
      const jwt = await getJwt();
      if (!jwt) throw new Error("Not authenticated");

      const res = await fetch(`${GATEWAY_URL}/api/v1/notifications/category-preferences`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to fetch category preferences");
      }
      const json = await res.json();
      return json.data as CategoryPreferencesGrouped;
    },
    enabled: !!user,
  });

  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async ({ categoryId, enabled }: { categoryId: string; enabled: boolean }) => {
      const jwt = await getJwt();
      if (!jwt) throw new Error("Not authenticated");

      const res = await fetch(
        `${GATEWAY_URL}/api/v1/notifications/category-preferences/${categoryId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to update preference");
      }
      return res.json();
    },
    onMutate: async ({ categoryId, enabled }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ["user-category-preferences"] });
      const previous = qc.getQueryData<CategoryPreferencesGrouped>(["user-category-preferences", user?.id]);

      if (previous) {
        const updated = { ...previous };
        for (const type of ["chat", "calendar", "community"] as const) {
          updated[type] = updated[type].map((cat) =>
            cat.id === categoryId ? { ...cat, enabled } : cat
          );
        }
        qc.setQueryData(["user-category-preferences", user?.id], updated);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["user-category-preferences", user?.id], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["user-category-preferences"] });
    },
  });

  return {
    categories: query.data,
    loading: query.isLoading,
    toggleCategory: (categoryId: string, enabled: boolean) =>
      toggleMutation.mutateAsync({ categoryId, enabled }),
  };
}
