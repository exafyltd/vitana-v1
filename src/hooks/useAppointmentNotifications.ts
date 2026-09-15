import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

export const useAppointmentNotifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    const setupSubscription = async () => {
      // Get user ID first to avoid Promise in filter
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("appointment-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "provider_appointments",
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
          console.log("🆕 New appointment created:", payload.new);
          
          const appointment = payload.new as any;
          
          // Show toast notification
          notify('toasts.hooks.appointmentConfirmed');

          // Send confirmation email via Edge Function
          try {
            const { error } = await supabase.functions.invoke("send-appointment-email", {
              body: {
                appointmentId: appointment.id,
                emailType: "confirmation",
              },
            });
            if (error) console.error("Failed to send confirmation email:", error);
          } catch (error) {
            console.error("Failed to send confirmation email:", error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "provider_appointments",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("📝 Appointment updated:", payload);
          
          const oldAppointment = payload.old as any;
          const newAppointment = payload.new as any;

          // Status changed to confirmed
          if (
            oldAppointment.status !== "confirmed" &&
            newAppointment.status === "confirmed"
          ) {
            notify('toasts.hooks.appointmentConfirmed');
          }

          // Status changed to cancelled
          if (newAppointment.status === "cancelled") {
            notifyError('toasts.hooks.appointmentCancelled');

            // Send cancellation email
            try {
              const { error } = await supabase.functions.invoke("send-appointment-email", {
                body: {
                  appointmentId: newAppointment.id,
                  emailType: "cancellation",
                  additionalData: {
                    reason: newAppointment.metadata?.cancellation_reason,
                  },
                },
              });
              if (error) console.error("Failed to send cancellation email:", error);
            } catch (error) {
              console.error("Failed to send cancellation email:", error);
            }
          }

          // Time changed (rescheduled)
          if (oldAppointment.start_time !== newAppointment.start_time) {
            notify('toasts.hooks.appointmentRescheduled');

            // Send reschedule email
            try {
              const { error } = await supabase.functions.invoke("send-appointment-email", {
                body: {
                  appointmentId: newAppointment.id,
                  emailType: "reschedule",
                  additionalData: {
                    oldStartTime: oldAppointment.start_time,
                  },
                },
              });
              if (error) console.error("Failed to send reschedule email:", error);
            } catch (error) {
              console.error("Failed to send reschedule email:", error);
            }
          }
        }
      )
      .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [toast]);
};
