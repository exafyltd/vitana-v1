-- My Journey North Star: give a Life Compass goal a deadline + optional quantified target.
-- Progress on the My Journey screen is time-based (days elapsed vs. days until the
-- deadline), so target_date is the field that makes the North Star real. target_value /
-- target_unit / starting_value are optional and only used to phrase the goal and to
-- support later metric-based progress. All nullable — existing goals keep working.

ALTER TABLE public.life_compass
  ADD COLUMN IF NOT EXISTS target_date    DATE,
  ADD COLUMN IF NOT EXISTS target_value   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS target_unit    TEXT,
  ADD COLUMN IF NOT EXISTS starting_value NUMERIC(10,2);

COMMENT ON COLUMN public.life_compass.target_date IS 'Goal deadline; drives My Journey days-to-deadline North Star.';
COMMENT ON COLUMN public.life_compass.target_value IS 'Optional quantified target, e.g. 10 for "lose 10 kg".';
COMMENT ON COLUMN public.life_compass.target_unit IS 'Optional unit for target_value, e.g. "kg".';
COMMENT ON COLUMN public.life_compass.starting_value IS 'Optional baseline measurement; reserved for later metric progress.';
