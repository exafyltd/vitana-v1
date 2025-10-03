-- Phase 1: Enable Real-time for Critical Tables
-- This enables complete row data broadcasting for all wallet, calendar, and profile tables

-- Wallet tables - Enable REPLICA IDENTITY FULL
ALTER TABLE public.user_wallets REPLICA IDENTITY FULL;
ALTER TABLE public.wallet_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.exchange_rates REPLICA IDENTITY FULL;

-- Calendar tables - Enable REPLICA IDENTITY FULL
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.calendar_invite_responses REPLICA IDENTITY FULL;

-- Profile tables - Enable REPLICA IDENTITY FULL
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.global_community_profiles REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication (skip if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'wallet_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'exchange_rates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exchange_rates;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'calendar_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'calendar_invite_responses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_invite_responses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'global_community_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.global_community_profiles;
  END IF;
END $$;