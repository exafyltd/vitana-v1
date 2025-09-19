-- Drop existing functions that have signature conflicts
DROP FUNCTION IF EXISTS search_minimal_profiles(text, text);
DROP FUNCTION IF EXISTS get_minimal_profiles_by_ids(text[]);
DROP FUNCTION IF EXISTS get_thread_participants(text, text);
DROP FUNCTION IF EXISTS get_message_reactions(text);
DROP FUNCTION IF EXISTS toggle_message_reaction(text, text);

-- Recreate functions with correct signatures matching existing UUID-based functions

-- Function to get minimal profiles by IDs (corrected to use UUID)
CREATE OR REPLACE FUNCTION get_minimal_profiles_by_ids_text(user_ids text[])
RETURNS TABLE (
    user_id text,
    display_name text,
    avatar_url text
) AS $$
BEGIN
  -- Convert text array to UUID array and call existing function
  RETURN QUERY
  SELECT 
    gmp.user_id::text,
    gmp.display_name::text,
    gmp.avatar_url::text
  FROM get_minimal_profiles_by_ids(user_ids::uuid[]) gmp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search minimal profiles (corrected to use existing function)
CREATE OR REPLACE FUNCTION search_minimal_profiles_text(search_query text, search_scope text DEFAULT 'global')
RETURNS TABLE (
    user_id text,
    display_name text,
    avatar_url text
) AS $$
BEGIN
  -- Use existing function and convert UUIDs to text
  RETURN QUERY
  SELECT 
    smp.user_id::text,
    smp.display_name::text,
    smp.avatar_url::text
  FROM search_minimal_profiles(search_query, search_scope) smp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get thread participants (corrected to use existing function)
CREATE OR REPLACE FUNCTION get_thread_participants_text(thread_id_param text, context_param text DEFAULT 'global')
RETURNS TABLE (
    user_id text,
    display_name text,
    avatar_url text,
    role text,
    joined_at text,
    last_read_at text
) AS $$
BEGIN
  -- Use existing function and convert types
  RETURN QUERY
  SELECT 
    gtp.user_id::text,
    gtp.display_name::text,
    gtp.avatar_url::text,
    gtp.role::text,
    gtp.joined_at::text,
    gtp.last_read_at::text
  FROM get_thread_participants(thread_id_param::uuid, context_param) gtp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message reactions (corrected to use existing function)
CREATE OR REPLACE FUNCTION get_message_reactions_text(message_id_param text)
RETURNS TABLE (
    message_id text,
    user_id text,
    emoji text,
    created_at text,
    display_name text,
    avatar_url text
) AS $$
BEGIN
  -- Use existing function and convert types
  RETURN QUERY
  SELECT 
    gmr.message_id::text,
    gmr.user_id::text,
    gmr.emoji::text,
    gmr.created_at::text,
    gmr.display_name::text,
    gmr.avatar_url::text
  FROM get_message_reactions(message_id_param::uuid) gmr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle message reactions (corrected to use existing function)
CREATE OR REPLACE FUNCTION toggle_message_reaction_text(message_id_param text, emoji_param text)
RETURNS boolean AS $$
BEGIN
  -- Use existing function with UUID conversion
  RETURN toggle_message_reaction(message_id_param::uuid, emoji_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;