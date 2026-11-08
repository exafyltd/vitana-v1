# VTID-05645 verification

Native port of the Business Hub: `/business` shell (+ services, clients, sell-earn, analytics tabs and the
`?tab=services.*|sales.*|insights.*` variants), `/business/opportunities`, `/business/listings`. 13 parity rows flipped to native.
Data access is re-implemented natively through the shell gateway port. Reads are queries; the only writes are the same member actions the web screens have (dismiss a draft, respond to or decline an intent match), each run by a tap; tests use a fake gateway only and nothing is sent to a live system. Commerce UX contract:
1:1 port, no added field, step, dialog or status. No What's New entry (port of existing screens).
Deferred to G1 (next_actor: owner): Maestro journeys and device screenshot parity. See commands.log for results.
