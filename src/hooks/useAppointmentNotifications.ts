import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAppointmentNotifications = () => {
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel("appointment-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "provider_appointments",
          filter: `user_id=eq.${supabase.auth.getUser().then(r => r.data.user?.id)}`,
        },
        async (payload) => {
          console.log("🆕 New appointment created:", payload.new);
          
          const appointment = payload.new as any;
          
          // Show toast notification
          toast({
            title: "✅ Appointment Confirmed",
            description: `Your appointment with ${appointment.provider_name} on ${new Date(appointment.start_time).toLocaleDateString()} has been booked.`,
          });

          // Send confirmation email via Edge Function
          try {
            await supabase.functions.invoke("send-appointment-email", {
              body: {
                appointmentId: appointment.id,
                emailType: "confirmation",
              },
            });
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
          filter: `user_id=eq.${supabase.auth.getUser().then(r => r.data.user?.id)}`,
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
            toast({
              title: "✅ Appointment Confirmed",
              description: `Your appointment with ${newAppointment.provider_name} has been confirmed.`,
            });
          }

          // Status changed to cancelled
          if (newAppointment.status === "cancelled") {
            toast({
              title: "❌ Appointment Cancelled",
              description: `Your appointment with ${newAppointment.provider_name} has been cancelled.`,
              variant: "destructive",
            });

            // Send cancellation email
            try {
              await supabase.functions.invoke("send-appointment-email", {
                body: {
                  appointmentId: newAppointment.id,
                  emailType: "cancellation",
                  additionalData: {
                    reason: newAppointment.metadata?.cancellation_reason,
                  },
                },
              });
            } catch (error) {
              console.error("Failed to send cancellation email:", error);
            }
          }

          // Time changed (rescheduled)
          if (oldAppointment.start_time !== newAppointment.start_time) {
            toast({
              title: "📅 Appointment Rescheduled",
              description: `Your appointment with ${newAppointment.provider_name} has been moved to ${new Date(newAppointment.start_time).toLocaleString()}.`,
            });

            // Send reschedule email
            try {
              await supabase.functions.invoke("send-appointment-email", {
                body: {
                  appointmentId: newAppointment.id,
                  emailType: "reschedule",
                  additionalData: {
                    oldStartTime: oldAppointment.start_time,
                  },
                },
              });
            } catch (error) {
              console.error("Failed to send reschedule email:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);
};
