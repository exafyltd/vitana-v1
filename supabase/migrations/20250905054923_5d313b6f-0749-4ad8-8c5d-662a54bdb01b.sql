-- Update tenant name from Earthlings to Earthlinks
UPDATE public.tenants
SET name = 'Earthlinks', slug = 'earthlinks'
WHERE slug = 'earthlings';

-- Ensure the new Earthlinks tenant exists if not already present
INSERT INTO public.tenants (id, name, slug)
SELECT gen_random_uuid(), 'Earthlinks', 'earthlinks'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug='earthlinks');

-- Clean up any duplicate entries
DELETE FROM public.tenants
WHERE slug = 'earthlings' AND name != 'Earthlinks';