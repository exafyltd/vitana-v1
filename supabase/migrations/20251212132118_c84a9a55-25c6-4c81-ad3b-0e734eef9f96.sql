-- Create reseller_payouts table
CREATE TABLE public.reseller_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_profile_id uuid NOT NULL REFERENCES public.reseller_profiles(id),
  total_commission_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid_to_wallet', 'rejected')),
  wallet_transaction_id uuid NULL REFERENCES public.wallet_transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz NULL,
  notes text NULL
);

-- Enable RLS
ALTER TABLE public.reseller_payouts ENABLE ROW LEVEL SECURITY;

-- Resellers can view their own payouts
CREATE POLICY "Resellers can view their own payouts"
  ON public.reseller_payouts FOR SELECT
  USING (reseller_profile_id IN (
    SELECT id FROM public.reseller_profiles WHERE user_id = auth.uid()
  ));

-- Service role can manage all payouts
CREATE POLICY "Service role can manage payouts"
  ON public.reseller_payouts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can insert their own payouts (for requesting payout)
CREATE POLICY "Users can request their own payouts"
  ON public.reseller_payouts FOR INSERT
  WITH CHECK (reseller_profile_id IN (
    SELECT id FROM public.reseller_profiles WHERE user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_reseller_payouts_profile ON public.reseller_payouts(reseller_profile_id);
CREATE INDEX idx_reseller_payouts_status ON public.reseller_payouts(status);

-- Add payout_id to reseller_attributions
ALTER TABLE public.reseller_attributions 
ADD COLUMN payout_id uuid NULL REFERENCES public.reseller_payouts(id);

CREATE INDEX idx_reseller_attributions_payout_id 
ON public.reseller_attributions(payout_id);