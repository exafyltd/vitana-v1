-- Full emoji reactions (VTID: pending allocation from the ledger): supported reaction set as a lookup table,
-- foreign key instead of the six-value CHECK, and an atomic per-user cap of six
-- distinct emojis per message. Widening only: every existing row (the six quick
-- emojis, canonical form) is in the seed, so no row can violate the new FK.
-- Canonical form = fully-qualified (U+FE0F); the list is pinned in
-- src/lib/reactions/reaction-emojis.json (identical copies in apps/mobile and the gateway).
--
-- Rollback (manual, owner-approved). Member reactions are preserved; a rollback never deletes a reaction.
-- Step 1, always: disable expanded writes (gateway REACTION_EXPANDED_ENABLED=false; web and mobile
-- REACTION_PICKER_ENABLED=false). This stops new reactions outside the six and keeps the wider schema in place.
-- Step 2, only if this precheck returns 0 (no reaction outside the six exists):
--   SELECT count(*) FROM public.message_reactions WHERE emoji NOT IN ('👍','❤️','😂','😮','🙏','🎉');
--   BEGIN;
--   DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.message_reactions
--     WHERE emoji NOT IN ('👍','❤️','😂','😮','🙏','🎉')) THEN
--     RAISE EXCEPTION 'rollback refused: reactions outside the six exist'; END IF; END $$;
--   DROP TRIGGER IF EXISTS message_reactions_cap ON public.message_reactions;
--   DROP FUNCTION IF EXISTS public.enforce_message_reaction_cap();
--   ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_emoji_fk;
--   ALTER TABLE public.message_reactions ADD CONSTRAINT message_reactions_emoji_check
--     CHECK (emoji IN ('👍','❤️','😂','😮','🙏','🎉'));
--   DROP TABLE IF EXISTS public.message_reaction_emojis;
--   COMMIT;
-- If the precheck is not 0, do not roll back: keep the schema, keep expanded writes disabled.

CREATE TABLE IF NOT EXISTS public.message_reaction_emojis (
  emoji      text PRIMARY KEY,
  sort_order integer NOT NULL
);

INSERT INTO public.message_reaction_emojis (emoji, sort_order) VALUES
  ('👍', 0),
  ('❤️', 1),
  ('😂', 2),
  ('😮', 3),
  ('🙏', 4),
  ('🎉', 5),
  ('😀', 6),
  ('😃', 7),
  ('😄', 8),
  ('😁', 9),
  ('😆', 10),
  ('😅', 11),
  ('🤣', 12),
  ('🙂', 13),
  ('🙃', 14),
  ('😉', 15),
  ('😊', 16),
  ('😇', 17),
  ('🥰', 18),
  ('😍', 19),
  ('🤩', 20),
  ('😘', 21),
  ('👋', 22),
  ('🤚', 23),
  ('🖐️', 24),
  ('✋', 25),
  ('🖖', 26),
  ('👌', 27),
  ('🤌', 28),
  ('🤏', 29),
  ('✌️', 30),
  ('🤞', 31),
  ('🤟', 32),
  ('🤘', 33),
  ('🤙', 34),
  ('👈', 35),
  ('👉', 36),
  ('👆', 37),
  ('👎', 38),
  ('👶', 39),
  ('👦', 40),
  ('👧', 41),
  ('👨', 42),
  ('👩', 43),
  ('👴', 44),
  ('👵', 45),
  ('🧑', 46),
  ('👮', 47),
  ('👷', 48),
  ('💂', 49),
  ('🕵️', 50),
  ('👩‍⚕️', 51),
  ('👩‍🎓', 52),
  ('👩‍💻', 53),
  ('🙋', 54),
  ('🙅', 55),
  ('🙆', 56),
  ('💁', 57),
  ('🙇', 58),
  ('🤷', 59),
  ('🤦', 60),
  ('💆', 61),
  ('💇', 62),
  ('🧖', 63),
  ('👫', 64),
  ('👬', 65),
  ('👭', 66),
  ('👪', 67),
  ('👀', 68),
  ('👁️', 69),
  ('👃', 70),
  ('👂', 71),
  ('👄', 72),
  ('💀', 73),
  ('🧠', 74),
  ('💪', 75),
  ('🦵', 76),
  ('🦶', 77),
  ('🐶', 78),
  ('🐱', 79),
  ('🐭', 80),
  ('🐹', 81),
  ('🐰', 82),
  ('🦊', 83),
  ('🐻', 84),
  ('🐼', 85),
  ('🐨', 86),
  ('🐯', 87),
  ('🦁', 88),
  ('🐮', 89),
  ('🐷', 90),
  ('🐸', 91),
  ('🐵', 92),
  ('🌸', 93),
  ('🌹', 94),
  ('🌺', 95),
  ('🌻', 96),
  ('🌼', 97),
  ('🌷', 98),
  ('🌱', 99),
  ('🌲', 100),
  ('🌳', 101),
  ('🍀', 102),
  ('🍁', 103),
  ('🍂', 104),
  ('🌾', 105),
  ('🌵', 106),
  ('☀️', 107),
  ('🌙', 108),
  ('⭐', 109),
  ('🌈', 110),
  ('☁️', 111),
  ('⛅', 112),
  ('🌊', 113),
  ('❄️', 114),
  ('🔥', 115),
  ('💧', 116),
  ('🍏', 117),
  ('🍎', 118),
  ('🍐', 119),
  ('🍊', 120),
  ('🍋', 121),
  ('🍌', 122),
  ('🍉', 123),
  ('🍇', 124),
  ('🍓', 125),
  ('🫐', 126),
  ('🍈', 127),
  ('🍒', 128),
  ('🍑', 129),
  ('🥭', 130),
  ('🍍', 131),
  ('🥥', 132),
  ('⚽', 133),
  ('🏀', 134),
  ('🏈', 135),
  ('⚾', 136),
  ('🥎', 137),
  ('🎾', 138),
  ('🏐', 139),
  ('🏉', 140),
  ('🎱', 141),
  ('🪀', 142),
  ('🏓', 143),
  ('🏸', 144),
  ('🏒', 145),
  ('🏑', 146),
  ('🥍', 147),
  ('🏏', 148),
  ('🚗', 149),
  ('🚕', 150),
  ('🚙', 151),
  ('🚌', 152),
  ('🚎', 153),
  ('🏎️', 154),
  ('🚓', 155),
  ('🚑', 156),
  ('🚒', 157),
  ('🚐', 158),
  ('🛻', 159),
  ('🚚', 160),
  ('🚛', 161),
  ('🚜', 162),
  ('🏍️', 163),
  ('🛵', 164),
  ('⌚', 165),
  ('📱', 166),
  ('📲', 167),
  ('💻', 168),
  ('⌨️', 169),
  ('🖥️', 170),
  ('🖨️', 171),
  ('🖱️', 172),
  ('🖲️', 173),
  ('🕹️', 174),
  ('🗜️', 175),
  ('💽', 176),
  ('💾', 177),
  ('💿', 178),
  ('📀', 179),
  ('📼', 180)
ON CONFLICT (emoji) DO UPDATE SET sort_order = EXCLUDED.sort_order;

ALTER TABLE public.message_reaction_emojis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_reaction_emojis_read ON public.message_reaction_emojis;
CREATE POLICY message_reaction_emojis_read ON public.message_reaction_emojis
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.message_reaction_emojis TO authenticated;

-- Replace the six-value CHECK with a foreign key. Add the FK first so there is
-- never a moment without enforcement.
ALTER TABLE public.message_reactions
  ADD CONSTRAINT message_reactions_emoji_fk
  FOREIGN KEY (emoji) REFERENCES public.message_reaction_emojis (emoji);
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_emoji_check;

-- Cap: at most six DISTINCT emojis per user per message. The advisory lock
-- serialises concurrent inserts for the same (message, user), so the count is
-- exact. Re-adding an emoji already on the message is not a new distinct emoji.
-- Removing a reaction (DELETE) is never capped.
CREATE OR REPLACE FUNCTION public.enforce_message_reaction_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  distinct_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.message_id::text || ':' || NEW.user_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.message_reactions
    WHERE message_id = NEW.message_id AND user_id = NEW.user_id AND emoji = NEW.emoji
  ) THEN
    RETURN NEW; -- same emoji again: the primary key decides (duplicate)
  END IF;
  SELECT count(DISTINCT emoji) INTO distinct_count
  FROM public.message_reactions
  WHERE message_id = NEW.message_id AND user_id = NEW.user_id;
  IF distinct_count >= 6 THEN
    RAISE EXCEPTION 'reaction_cap_reached' USING ERRCODE = 'P0001',
      HINT = 'A member can react with at most six different emojis per message.';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS message_reactions_cap ON public.message_reactions;
CREATE TRIGGER message_reactions_cap
  BEFORE INSERT ON public.message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_reaction_cap();
