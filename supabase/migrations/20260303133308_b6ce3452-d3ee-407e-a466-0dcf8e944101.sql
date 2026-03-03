
-- Add chat_thread_id to link community groups with messaging threads
ALTER TABLE public.global_community_groups 
ADD COLUMN IF NOT EXISTS chat_thread_id uuid REFERENCES public.global_message_threads(id);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_community_groups_chat_thread 
ON public.global_community_groups(chat_thread_id) WHERE chat_thread_id IS NOT NULL;

-- Trigger: when a community group is created, auto-create a chat thread and link it
CREATE OR REPLACE FUNCTION public.auto_create_group_chat_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_thread_id uuid;
BEGIN
  -- Create a group chat thread
  INSERT INTO global_message_threads (created_by, type, name, metadata)
  VALUES (NEW.created_by, 'group', NEW.name, jsonb_build_object('community_group_id', NEW.id))
  RETURNING id INTO new_thread_id;

  -- Link thread to community group
  UPDATE global_community_groups SET chat_thread_id = new_thread_id WHERE id = NEW.id;

  -- Add creator as admin participant
  INSERT INTO global_thread_participants (thread_id, user_id, role)
  VALUES (new_thread_id, NEW.created_by, 'admin');

  -- Send system message
  INSERT INTO global_messages (thread_id, sender_id, body, message_type, content_data)
  VALUES (
    new_thread_id, 
    NEW.created_by, 
    'Group "' || NEW.name || '" was created',
    'system',
    jsonb_build_object('system_type', 'group_created', 'group_name', NEW.name, 'group_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_group_chat_thread ON public.global_community_groups;
CREATE TRIGGER trg_auto_create_group_chat_thread
AFTER INSERT ON public.global_community_groups
FOR EACH ROW EXECUTE FUNCTION public.auto_create_group_chat_thread();

-- Trigger: when a member joins a community group, add them to the chat thread
CREATE OR REPLACE FUNCTION public.sync_group_chat_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_id_val uuid;
  group_name_val text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get the chat thread for this group
    SELECT chat_thread_id, name INTO thread_id_val, group_name_val
    FROM global_community_groups WHERE id = NEW.group_id;

    IF thread_id_val IS NOT NULL THEN
      -- Add participant (ignore if already exists)
      INSERT INTO global_thread_participants (thread_id, user_id, role)
      VALUES (thread_id_val, NEW.user_id, COALESCE(NEW.role, 'member'))
      ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Get the chat thread for this group
    SELECT chat_thread_id INTO thread_id_val
    FROM global_community_groups WHERE id = OLD.group_id;

    IF thread_id_val IS NOT NULL THEN
      -- Remove participant from chat thread
      DELETE FROM global_thread_participants 
      WHERE thread_id = thread_id_val AND user_id = OLD.user_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_chat_participant ON public.global_community_group_members;
CREATE TRIGGER trg_sync_group_chat_participant
AFTER INSERT OR DELETE ON public.global_community_group_members
FOR EACH ROW EXECUTE FUNCTION public.sync_group_chat_participant();

-- Backfill: create chat threads for existing community groups that don't have one
DO $$
DECLARE
  grp RECORD;
  new_thread_id uuid;
  member RECORD;
BEGIN
  FOR grp IN 
    SELECT id, name, created_by 
    FROM global_community_groups 
    WHERE chat_thread_id IS NULL AND status = 'approved'
  LOOP
    -- Create thread
    INSERT INTO global_message_threads (created_by, type, name, metadata)
    VALUES (grp.created_by, 'group', grp.name, jsonb_build_object('community_group_id', grp.id))
    RETURNING id INTO new_thread_id;

    -- Link
    UPDATE global_community_groups SET chat_thread_id = new_thread_id WHERE id = grp.id;

    -- Add all existing members as participants
    FOR member IN
      SELECT user_id, role FROM global_community_group_members WHERE group_id = grp.id
    LOOP
      INSERT INTO global_thread_participants (thread_id, user_id, role)
      VALUES (new_thread_id, member.user_id, member.role)
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- System message
    INSERT INTO global_messages (thread_id, sender_id, body, message_type, content_data)
    VALUES (
      new_thread_id, grp.created_by, 
      'Group "' || grp.name || '" chat started',
      'system',
      jsonb_build_object('system_type', 'group_created', 'group_name', grp.name, 'group_id', grp.id)
    );
  END LOOP;
END;
$$;
