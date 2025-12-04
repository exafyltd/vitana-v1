import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TicketOrder {
  id: string;
  ticket_number: string;
  buyer_name: string;
  buyer_email: string;
  buyer_id: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  ticket_type_name: string;
  ticket_type_id: string;
  stripe_payment_intent_id: string | null;
  qr_code_token: string;
}

export function useOrderManagement(eventId: string | null) {
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!eventId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data: purchases, error: purchasesError } = await supabase
          .from("event_ticket_purchases")
          .select(`
            id,
            ticket_number,
            buyer_name,
            buyer_email,
            buyer_id,
            quantity,
            unit_price,
            total_amount,
            currency,
            status,
            created_at,
            checked_in_at,
            checked_in_by,
            ticket_type_id,
            stripe_payment_intent_id,
            qr_code_token,
            event_ticket_types (
              name
            )
          `)
          .eq("event_id", eventId)
          .order("created_at", { ascending: false });

        if (purchasesError) throw purchasesError;

        const formattedOrders: TicketOrder[] = (purchases || []).map((p: any) => ({
          id: p.id,
          ticket_number: p.ticket_number,
          buyer_name: p.buyer_name,
          buyer_email: p.buyer_email,
          buyer_id: p.buyer_id,
          quantity: p.quantity,
          unit_price: p.unit_price,
          total_amount: p.total_amount,
          currency: p.currency,
          status: p.status,
          created_at: p.created_at,
          checked_in_at: p.checked_in_at,
          checked_in_by: p.checked_in_by,
          ticket_type_name: p.event_ticket_types?.name || "Unknown",
          ticket_type_id: p.ticket_type_id,
          stripe_payment_intent_id: p.stripe_payment_intent_id,
          qr_code_token: p.qr_code_token,
        }));

        setOrders(formattedOrders);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [eventId]);

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.ticket_number.toLowerCase().includes(query) ||
      order.buyer_name.toLowerCase().includes(query) ||
      order.buyer_email.toLowerCase().includes(query)
    );
  });

  return { orders: filteredOrders, allOrders: orders, loading, error, searchQuery, setSearchQuery };
}
