-- Create secure accessor functions for privacy-hardened database access

-- Function to get minimal profiles by IDs
CREATE OR REPLACE FUNCTION get_minimal_profiles_by_ids(user_ids text[])
RETURNS TABLE (
    user_id text,
    display_name text,
    avatar_url text
) AS $$
BEGIN
    -- For global context, use global_community_profiles if it exists, otherwise profiles
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'global_community_profiles') THEN
        RETURN QUERY
        SELECT 
            gcp.user_id::text,
            COALESCE(gcp.display_name, gcp.full_name, 'Unknown User')::text as display_name,
            gcp.avatar_url::text
        FROM global_community_profiles gcp
        WHERE gcp.user_id::text = ANY(user_ids)
        AND gcp.user_id IS NOT NULL;
    ELSE
        RETURN QUERY
        SELECT 
            p.user_id::text,
            COALESCE(p.display_name, p.full_name, 'Unknown User')::text as display_name,
            p.avatar_url::text
        FROM profiles p
        WHERE p.user_id::text = ANY(user_ids)
        AND p.user_id IS NOT NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search minimal profiles
CREATE OR REPLACE FUNCTION search_minimal_profiles(search_query text, search_scope text DEFAULT 'global')
RETURNS TABLE (
    user_id text,
    display_name text,
    avatar_url text
) AS $$
BEGIN
    -- Limit search results for security
    IF LENGTH(search_query) < 2 THEN
        RETURN;
    END IF;

    -- For global context, use global_community_profiles if it exists
    IF search_scope = 'global' AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'global_community_profiles') THEN
        RETURN QUERY
        SELECT 
            gcp.user_id::text,
            COALESCE(gcp.display_name, gcp.full_name, 'Unknown User')::text as display_name,
            gcp.avatar_url::text
        FROM global_community_profiles gcp
        WHERE (
            gcp.display_name ILIKE '%' || search_query || '%' OR
            gcp.full_name ILIKE '%' || search_query || '%'
        )
        AND gcp.user_id IS NOT NULL
        ORDER BY gcp.display_name
        LIMIT 20;
    ELSE
        RETURN QUERY
        SELECT 
            p.user_id::text,
            COALESCE(p.display_name, p.full_name, 'Unknown User')::text as display_name,
            p.avatar_url::text
        FROM profiles p
        WHERE (
            p.display_name ILIKE '%' || search_query || '%' OR
            p.full_name ILIKE '%' || search_query || '%'
        )
        AND p.user_id IS NOT NULL
        ORDER BY p.display_name
        LIMIT 20;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get thread participants with membership validation
CREATE OR REPLACE FUNCTION get_thread_participants(thread_id_param text, context_param text DEFAULT 'global')
RETURNS TABLE (
    user_id text,
    display_name text,
    avatar_url text,
    role text,
    joined_at text,
    last_read_at text
) AS $$
DECLARE
    participants_table text;
    profiles_table text;
BEGIN
    -- Determine which tables to use based on context
    IF context_param = 'global' THEN
        participants_table := 'global_thread_participants';
        profiles_table := 'global_community_profiles';
    ELSE
        participants_table := 'thread_participants';
        profiles_table := 'profiles';
    END IF;

    -- Check if user is a member of the thread (security check)
    IF NOT EXISTS (
        SELECT 1 FROM global_thread_participants gtp 
        WHERE gtp.thread_id::text = thread_id_param 
        AND gtp.user_id = auth.uid()
        AND gtp.is_active = true
        WHEN context_param = 'global'
        
        UNION ALL
        
        SELECT 1 FROM thread_participants tp
        WHERE tp.thread_id::text = thread_id_param
        AND tp.user_id = auth.uid()
        AND tp.is_active = true
        WHEN context_param = 'tenant'
    ) THEN
        -- User is not a member, return empty
        RETURN;
    END IF;

    -- Return participants based on context
    IF context_param = 'global' AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'global_thread_participants') THEN
        RETURN QUERY
        SELECT 
            gtp.user_id::text,
            COALESCE(gcp.display_name, gcp.full_name, 'Unknown User')::text as display_name,
            gcp.avatar_url::text,
            gtp.role::text,
            gtp.joined_at::text,
            gtp.last_read_at::text
        FROM global_thread_participants gtp
        LEFT JOIN global_community_profiles gcp ON gtp.user_id = gcp.user_id
        WHERE gtp.thread_id::text = thread_id_param
        AND gtp.is_active = true
        ORDER BY gtp.joined_at;
    ELSE
        RETURN QUERY
        SELECT 
            tp.user_id::text,
            COALESCE(p.display_name, p.full_name, 'Unknown User')::text as display_name,
            p.avatar_url::text,
            tp.role::text,
            tp.joined_at::text,
            tp.last_read_at::text
        FROM thread_participants tp
        LEFT JOIN profiles p ON tp.user_id = p.user_id
        WHERE tp.thread_id::text = thread_id_param
        AND tp.is_active = true
        ORDER BY tp.joined_at;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message reactions with access validation
CREATE OR REPLACE FUNCTION get_message_reactions(message_id_param text)
RETURNS TABLE (
    message_id text,
    user_id text,
    emoji text,
    created_at text,
    display_name text,
    avatar_url text
) AS $$
BEGIN
    -- Check if user has access to the message (simplified check)
    -- In production, this should verify thread membership
    IF NOT EXISTS (
        SELECT 1 FROM global_messages gm 
        JOIN global_thread_participants gtp ON gm.thread_id = gtp.thread_id
        WHERE gm.id::text = message_id_param 
        AND gtp.user_id = auth.uid()
        AND gtp.is_active = true
        
        UNION ALL
        
        SELECT 1 FROM messages m
        JOIN thread_participants tp ON m.thread_id = tp.thread_id
        WHERE m.id::text = message_id_param
        AND tp.user_id = auth.uid()
        AND tp.is_active = true
    ) THEN
        -- User doesn't have access, return empty
        RETURN;
    END IF;

    -- Return reactions if message_reactions table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'message_reactions') THEN
        RETURN QUERY
        SELECT 
            mr.message_id::text,
            mr.user_id::text,
            mr.emoji::text,
            mr.created_at::text,
            COALESCE(p.display_name, p.full_name, 'Unknown User')::text as display_name,
            p.avatar_url::text
        FROM message_reactions mr
        LEFT JOIN profiles p ON mr.user_id = p.user_id
        WHERE mr.message_id::text = message_id_param
        ORDER BY mr.created_at;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle message reactions
CREATE OR REPLACE FUNCTION toggle_message_reaction(message_id_param text, emoji_param text)
RETURNS boolean AS $$
DECLARE
    reaction_exists boolean := false;
    user_has_access boolean := false;
BEGIN
    -- Check if user has access to the message
    SELECT EXISTS (
        SELECT 1 FROM global_messages gm 
        JOIN global_thread_participants gtp ON gm.thread_id = gtp.thread_id
        WHERE gm.id::text = message_id_param 
        AND gtp.user_id = auth.uid()
        AND gtp.is_active = true
        
        UNION ALL
        
        SELECT 1 FROM messages m
        JOIN thread_participants tp ON m.thread_id = tp.thread_id
        WHERE m.id::text = message_id_param
        AND tp.user_id = auth.uid()
        AND tp.is_active = true
    ) INTO user_has_access;

    IF NOT user_has_access THEN
        RETURN false;
    END IF;

    -- Only proceed if message_reactions table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'message_reactions') THEN
        RETURN false;
    END IF;

    -- Check if reaction already exists
    SELECT EXISTS (
        SELECT 1 FROM message_reactions 
        WHERE message_id::text = message_id_param 
        AND user_id = auth.uid() 
        AND emoji = emoji_param
    ) INTO reaction_exists;

    IF reaction_exists THEN
        -- Remove reaction
        DELETE FROM message_reactions 
        WHERE message_id::text = message_id_param 
        AND user_id = auth.uid() 
        AND emoji = emoji_param;
        RETURN false; -- Reaction was removed
    ELSE
        -- Add reaction
        INSERT INTO message_reactions (message_id, user_id, emoji)
        VALUES (message_id_param::uuid, auth.uid(), emoji_param);
        RETURN true; -- Reaction was added
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;