import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

interface Contact {
  user_id: string;
  display_name: string;
  avatar_url: string;
}

export function useEventInvites() {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendInvites = async (
    eventId: string,
    contacts: Contact[],
    channel: string = "messenger"
  ) => {
    try {
      setSending(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        throw new Error("Not authenticated");
      }

      // Create attendee records
      const attendeeRecords = contacts.map((contact) => ({
        event_id: eventId,
        user_id: contact.user_id,
        response: "pending" as const,
        invited_by: session.session.user.id,
        metadata: { channel },
      }));

      const { error: attendeesError } = await supabase
        .from("event_attendees")
        .upsert(attendeeRecords, {
          onConflict: "event_id,user_id",
          ignoreDuplicates: false,
        });

      if (attendeesError) throw attendeesError;

      // Update analytics - get existing or create new
      const { data: existingAnalytics } = await supabase
        .from("invite_analytics")
        .select("sent_count")
        .eq("event_id", eventId)
        .eq("channel", channel)
        .maybeSingle();

      const newSentCount = (existingAnalytics?.sent_count || 0) + contacts.length;

      await supabase
        .from("invite_analytics")
        .upsert(
          {
            event_id: eventId,
            channel,
            sent_count: newSentCount,
          },
          {
            onConflict: "event_id,channel",
          }
        );

      notify('toasts.hooks.invitesSent');

      return { success: true };
    } catch (error) {
      console.error("Error sending invites:", error);
      notifyError('toasts.hooks.failedSendInvites', 'toasts.hooks.pleaseTryAgainLater');
      return { success: false, error };
    } finally {
      setSending(false);
    }
  };

  return { sendInvites, sending };
}
