import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  quantity_available: number;
  quantity_sold: number;
  sale_start_date: string | null;
  sale_end_date: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface TicketPurchase {
  id: string;
  event_id: string;
  ticket_type_id: string;
  buyer_id: string | null;
  buyer_email: string;
  buyer_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: string;
  qr_code_token: string;
  ticket_number: string;
  checked_in_at: string | null;
  created_at: string;
  metadata: any;
  ticket_type?: TicketType;
  event?: {
    id: string;
    title: string;
    start_time: string;
    location: string | null;
    image_url: string | null;
  };
}

export function useEventTicketTypes(eventId: string) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setTicketTypes([]);
      setLoading(false);
      return;
    }

    const fetchTicketTypes = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("event_ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setTicketTypes([]);
      } else {
        setTicketTypes(data || []);
      }
      setLoading(false);
    };

    fetchTicketTypes();
  }, [eventId]);

  return { ticketTypes, loading, error };
}

export function useMyTickets() {
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMyTickets = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setTickets([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("event_ticket_purchases")
      .select(`
        *,
        ticket_type:event_ticket_types(*),
        event:global_community_events(id, title, start_time, location, image_url)
      `)
      .eq("buyer_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load your tickets",
        variant: "destructive",
      });
      setTickets([]);
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  return { tickets, loading, refetch: fetchMyTickets };
}

export function useTicketPurchase(purchaseId: string) {
  const [purchase, setPurchase] = useState<TicketPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!purchaseId) {
      setPurchase(null);
      setLoading(false);
      return;
    }

    const fetchPurchase = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("event_ticket_purchases")
        .select(`
          *,
          ticket_type:event_ticket_types(*),
          event:global_community_events(id, title, start_time, location, image_url)
        `)
        .eq("id", purchaseId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setPurchase(null);
      } else {
        setPurchase(data);
      }
      setLoading(false);
    };

    fetchPurchase();
  }, [purchaseId]);

  return { purchase, loading, error };
}

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export function usePurchaseTicket() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const purchaseTicket = async (
    eventId: string,
    ticketTypeId: string,
    quantity: number,
    buyerEmail?: string,
    buyerName?: string,
    utmParams?: UtmParams,
    discountCode?: string
  ) => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("stripe-create-ticket-checkout", {
        body: {
          event_id: eventId,
          ticket_type_id: ticketTypeId,
          quantity,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          discount_code: discountCode || undefined,
          // Pass UTM params for reseller attribution
          utm_source: utmParams?.utm_source,
          utm_medium: utmParams?.utm_medium,
          utm_campaign: utmParams?.utm_campaign,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create checkout");
      }

      const { url } = response.data;
      if (url) {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          window.location.href = url;
        } else {
          const width = 500;
          const height = 700;
          const left = (window.screen.width - width) / 2;
          const top = (window.screen.height - height) / 2;
          window.open(url, 'stripe-checkout', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`);
        }
      }

      return response.data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase ticket",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { purchaseTicket, loading };
}
