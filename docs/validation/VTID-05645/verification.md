# VTID-05645 verification

Native port of the Business Hub: `/business` shell (+ services, clients, sell-earn, analytics tabs and the
`?tab=services.*|sales.*|insights.*` variants), `/business/opportunities`, `/business/listings`. 13 parity rows flipped to native.
Data access is re-implemented natively (read-only queries); no write to Supabase or the gateway. Commerce UX contract:
1:1 port, no added field, step, dialog or status. No What's New entry (port of existing screens).
Deferred to G1 (next_actor: owner): Maestro journeys and device screenshot parity. See commands.log for results.
