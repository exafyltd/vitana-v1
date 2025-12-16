-- Enable reselling for Mariia Maksina's future events with 20% commission
UPDATE global_community_events
SET 
  resellable = true,
  resale_scope = 'public',
  default_reseller_commission_rate = 20
WHERE created_by = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b'
  AND start_time > NOW();