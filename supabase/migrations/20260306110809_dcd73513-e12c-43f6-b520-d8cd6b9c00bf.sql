-- Fix 3 Maxina Experience events: sync ticket prices to match event metadata (€149)
UPDATE event_ticket_types SET price = 149, currency = 'EUR'
WHERE event_id IN (
  '1d695c0b-45e4-4f2a-b83e-ed70c71b003b',
  '1d77334c-7a9f-4911-98fa-6db837c42c21',
  '92606649-a22c-43a5-92c6-53974f8a514f'
);