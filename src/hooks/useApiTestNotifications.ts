import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ApiTestNotification {
  id: string;
  integration_id: string;
  notification_type: string;
  message: string;
  severity: "info" | "warning" | "error";
  sent_at: string;
  metadata: any;
  created_at: string;
}

export function useApiTestNotifications() {
  return useQuery({
    queryKey: ["api-test-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_test_notifications")
        .select(`
          *,
          api_integrations (
            name,
            integration_type
          )
        `)
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as any[];
    },
  });
}

export function useRecentTestFailures() {
  return useQuery({
    queryKey: ["recent-test-failures"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recent_test_failures");
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useCreateTestNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notification: {
      integration_id: string;
      message: string;
      severity: string;
      metadata?: any;
    }) => {
      const { data, error } = await supabase
        .from("api_test_notifications")
        .insert([notification])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-test-notifications"] });
      toast({
        title: "Notification created",
        description: "Test notification has been logged",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
