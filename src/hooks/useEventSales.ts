import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsEventOrganizer(eventId: string) {
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOrganizer = async () => {
      if (!eventId) {
        setIsOrganizer(false);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsOrganizer(false);
        setLoading(false);
        return;
      }

      const { data: event } = await supabase
        .from("global_community_events")
        .select("created_by")
        .eq("id", eventId)
        .single();

      setIsOrganizer(event?.created_by === user.id);
      setLoading(false);
    };

    checkOrganizer();
  }, [eventId]);

  return { isOrganizer, loading };
}

export function useEventHasTickets(eventId: string) {
  const [hasTickets, setHasTickets] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTickets = async () => {
      if (!eventId) {
        setHasTickets(false);
        setLoading(false);
        return;
      }

      const { count } = await supabase
        .from("event_ticket_types")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("is_active", true);

      setHasTickets((count || 0) > 0);
      setLoading(false);
    };

    checkTickets();
  }, [eventId]);

  return { hasTickets, loading };
}
