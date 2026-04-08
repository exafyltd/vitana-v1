ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_offset_x integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_offset_y integer NOT NULL DEFAULT 50;