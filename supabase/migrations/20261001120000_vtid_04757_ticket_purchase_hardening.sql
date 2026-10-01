-- VTID-04757: event ticket purchase hardening.
--
-- Problems this closes (found in the end-to-end review of Events & MeetUps):
--   * availability was a read-then-write that ignored pending checkouts, so
--     concurrent buyers could oversell;
--   * quantity_sold was incremented twice (trigger + webhook fallback, because
--     the increment_ticket_sold RPC the webhook calls never existed);
--   * a pending purchase that never paid (or whose Stripe session failed to
--     create) stayed 'pending' forever.
--
-- Design: quantity_sold is owned by the existing trigger_update_quantity_sold
-- trigger (pending -> completed, completed -> refunded). Nothing else writes it.
-- A pending purchase holds a time-boxed reservation (expires_at) that counts
-- against availability until it completes, expires, or is cancelled.

ALTER TABLE public.event_ticket_purchases
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_event_ticket_purchases_pending_reservation
  ON public.event_ticket_purchases (ticket_type_id, expires_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_event_ticket_purchases_payment_intent
  ON public.event_ticket_purchases (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Atomically check availability (sold + live reservations) and create the
-- pending purchase. The ticket-type row lock serialises concurrent buyers.
CREATE OR REPLACE FUNCTION public.reserve_event_tickets(
  p_event_id        uuid,
  p_ticket_type_id  uuid,
  p_buyer_id        uuid,
  p_buyer_email     text,
  p_buyer_name      text,
  p_quantity        integer,
  p_qr_code_token   text,
  p_metadata        jsonb,
  p_reserve_minutes integer DEFAULT 35
)
RETURNS public.event_ticket_purchases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type     public.event_ticket_types%ROWTYPE;
  v_reserved integer;
  v_available integer;
  v_purchase public.event_ticket_purchases%ROWTYPE;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  SELECT * INTO v_type
  FROM public.event_ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  IF NOT FOUND OR v_type.event_id <> p_event_id OR NOT v_type.is_active THEN
    RAISE EXCEPTION 'TICKET_TYPE_NOT_FOUND';
  END IF;

  IF v_type.sale_start_date IS NOT NULL AND v_type.sale_start_date > now() THEN
    RAISE EXCEPTION 'SALES_NOT_STARTED';
  END IF;
  IF v_type.sale_end_date IS NOT NULL AND v_type.sale_end_date < now() THEN
    RAISE EXCEPTION 'SALES_ENDED';
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved
  FROM public.event_ticket_purchases
  WHERE ticket_type_id = p_ticket_type_id
    AND status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at > now();

  v_available := v_type.quantity_available - v_type.quantity_sold - v_reserved;
  IF p_quantity > v_available THEN
    RAISE EXCEPTION 'INSUFFICIENT_TICKETS:%', GREATEST(v_available, 0);
  END IF;

  INSERT INTO public.event_ticket_purchases (
    event_id, ticket_type_id, buyer_id, buyer_email, buyer_name, quantity,
    unit_price, total_amount, currency, status, qr_code_token, ticket_number,
    metadata, expires_at
  ) VALUES (
    p_event_id, p_ticket_type_id, p_buyer_id, p_buyer_email, p_buyer_name, p_quantity,
    v_type.price, v_type.price * p_quantity, v_type.currency, 'pending', p_qr_code_token, '',
    COALESCE(p_metadata, '{}'::jsonb),
    now() + make_interval(mins => p_reserve_minutes)
  )
  RETURNING * INTO v_purchase;

  RETURN v_purchase;
END;
$$;

-- Idempotent completion. Safe to call any number of times (webhook retries,
-- duplicate deliveries, free-ticket path). Returns true only for the call that
-- performed the pending/expired -> completed transition; the quantity_sold
-- trigger fires exactly once because of that transition.
-- 'expired' is accepted on purpose: money was taken, so the buyer gets the
-- ticket even if the reservation lapsed first.
CREATE OR REPLACE FUNCTION public.complete_ticket_purchase(
  p_purchase_id        uuid,
  p_payment_intent_id  text,
  p_session_id         text,
  p_metadata           jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.event_ticket_purchases
  SET status = 'completed',
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
      stripe_session_id = COALESCE(p_session_id, stripe_session_id),
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
      updated_at = now()
  WHERE id = p_purchase_id
    AND status IN ('pending', 'expired');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- Release a reservation that will never complete (checkout expired, Stripe
-- session creation failed). Only ever touches rows that are still pending.
CREATE OR REPLACE FUNCTION public.release_ticket_reservation(
  p_purchase_id uuid,
  p_status      text DEFAULT 'expired'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF p_status NOT IN ('expired', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  UPDATE public.event_ticket_purchases
  SET status = p_status, updated_at = now()
  WHERE id = p_purchase_id AND status = 'pending';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- Full refund seen by the webhook (charge.refunded). The existing trigger
-- decrements quantity_sold on completed -> refunded.
CREATE OR REPLACE FUNCTION public.refund_ticket_purchase(
  p_payment_intent_id text,
  p_reason            text DEFAULT 'stripe_refund'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.event_ticket_purchases
  SET status = 'refunded',
      refunded_at = now(),
      refund_reason = p_reason,
      updated_at = now()
  WHERE stripe_payment_intent_id = p_payment_intent_id
    AND status = 'completed';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- Server-side only: the edge functions call these with the service role.
REVOKE ALL ON FUNCTION public.reserve_event_tickets(uuid, uuid, uuid, text, text, integer, text, jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_ticket_purchase(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ticket_reservation(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_ticket_purchase(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_event_tickets(uuid, uuid, uuid, text, text, integer, text, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_ticket_purchase(uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ticket_reservation(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_ticket_purchase(text, text) TO service_role;

-- Existing pending rows are deliberately NOT swept here. All of them predate
-- this migration, none has a reservation, and we cannot tell from the database
-- alone whether any was paid and missed by the webhook. Reconcile them against
-- Stripe first (see the PR description), then expire the confirmed-unpaid ones.
