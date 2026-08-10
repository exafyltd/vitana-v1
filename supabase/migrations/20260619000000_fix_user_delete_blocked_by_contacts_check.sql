-- Fix: deleting an auth user fails with "Database error deleting user"
--
-- Root cause:
--   public.contacts.contact_user_id REFERENCES auth.users(id) ON DELETE SET NULL
--   together with CHECK contact_identifier_required:
--     (contact_phone IS NOT NULL OR contact_user_id IS NOT NULL)
--
--   When a user is deleted, Postgres sets contact_user_id = NULL on every row
--   that referenced them. For rows that have no contact_phone, this makes BOTH
--   identifier columns NULL, violating contact_identifier_required (sqlstate
--   23514) and aborting the whole delete transaction. GoTrue surfaces this as
--   the generic "Database error deleting user".
--
-- Why not just ON DELETE CASCADE on the FK:
--   CASCADE would also delete contacts that still hold a valid contact_phone,
--   losing useful data. We only want to remove rows that would be left without
--   ANY identifier.
--
-- Fix:
--   A BEFORE DELETE trigger on auth.users that removes only the inbound contact
--   rows which would become identifier-less (contact_phone IS NULL). It runs
--   before the FK's SET NULL action, so:
--     - phone-less inbound contacts -> deleted here (would have violated CHECK)
--     - phone-bearing inbound contacts -> left to FK SET NULL, survive on phone
--
-- Scope: targeted at public.contacts, the only table exhibiting this
-- SET-NULL-into-CHECK pattern against auth.users.

CREATE OR REPLACE FUNCTION public.cleanup_identifierless_contacts_before_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove contact rows that reference the user being deleted and would be
  -- left with no identifier once contact_user_id is set NULL by the FK action.
  DELETE FROM public.contacts
  WHERE contact_user_id = OLD.id
    AND contact_phone IS NULL;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS before_auth_user_delete_cleanup_contacts ON auth.users;

CREATE TRIGGER before_auth_user_delete_cleanup_contacts
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_identifierless_contacts_before_user_delete();
