import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { lookup } from '@/lib/i18n-toast';

export interface UserPreferences {
  id: string;
  user_id: string;
  // Autopilot settings
  autopilot_enabled: boolean;
  autopilot_max_actions_per_day: number;
  autopilot_quiet_hours_start: string;
  autopilot_quiet_hours_end: string;
  autopilot_priority_filter: 'all' | 'high_medium' | 'high';
  autopilot_categories: {
    health: boolean;
    community: boolean;
    discovery: boolean;
    memory: boolean;
  };
  // Voice STT settings
  stt_language: string;
  stt_instant_enabled: boolean;
  stt_auto_punctuation: boolean;
  stt_sensitivity: number;
  // Voice TTS settings
  //
  // NULLABLE, and the column always was (VTID-03671) — this type said `string`
  // and was simply wrong about the database. Null means "no override: derive
  // the voice from stt_language", which is what useTextToSpeech already does
  // and what the language picker now writes when the stored voice belongs to a
  // language the user has switched away from. Declaring it non-null forced
  // every caller to invent a provider-specific id to write, which is how
  // Google voice ids ended up persisted against profiles.
  tts_voice: string | null;
  tts_gender: 'male' | 'female' | 'neutral';
  tts_character: string;
  tts_speed: number;
  tts_pitch: number;
  tts_volume: number;
  // AI settings
  ai_model: string;
  ai_temperature: number;
  ai_response_length: 'short' | 'medium' | 'long';
  // Privacy
  store_voice_recordings: boolean;
  auto_delete_recordings_days: number;
  // Greeting settings
  auto_greeting_enabled: boolean;
  greeting_frequency: 'session' | 'daily' | 'hourly' | 'off';
  greeting_message_types: string[];
  // Interests & Goals (for content filtering)
  interests: string[];
  wellness_goals: string[];
  shorts_filtering_enabled: boolean;
  // AI Data Consent (Apple 5.1.1)
  ai_data_consent_given: boolean;
  ai_data_consent_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserPreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ["user_preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from("user_preferences")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as UserPreferences;
      }

      return data as UserPreferences;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_preferences")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_preferences"] });
    },
    onError: (error) => {
      toast.error(lookup('toasts.hooks.errorUpdatingPreferences'), {
        description: error.message,
      });
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
