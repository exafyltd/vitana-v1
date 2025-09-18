-- Clean up duplicate direct message threads
-- This migration consolidates multiple direct threads between the same participants

-- For global direct threads: keep the most recent thread, migrate messages from duplicates
WITH duplicate_global_threads AS (
  -- Find groups of direct threads between the same two participants
  SELECT 
    gmt.id,
    gmt.updated_at,
    array_agg(DISTINCT gtp.user_id ORDER BY gtp.user_id) as participant_ids,
    ROW_NUMBER() OVER (
      PARTITION BY array_agg(DISTINCT gtp.user_id ORDER BY gtp.user_id) 
      ORDER BY gmt.updated_at DESC
    ) as rn
  FROM global_message_threads gmt
  JOIN global_thread_participants gtp ON gmt.id = gtp.thread_id
  WHERE gmt.type = 'direct' AND gtp.is_active = true
  GROUP BY gmt.id, gmt.updated_at
  HAVING COUNT(DISTINCT gtp.user_id) = 2  -- Only direct threads (2 participants)
),
threads_to_merge AS (
  -- Get all threads except the most recent one for each participant pair
  SELECT 
    id as old_thread_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY participant_ids 
      ORDER BY updated_at DESC, id DESC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as keep_thread_id
  FROM duplicate_global_threads
  WHERE rn > 1  -- Not the most recent thread
)
-- Update messages to point to the thread we're keeping
UPDATE global_messages 
SET thread_id = (
  SELECT keep_thread_id 
  FROM threads_to_merge 
  WHERE old_thread_id = global_messages.thread_id
)
WHERE thread_id IN (SELECT old_thread_id FROM threads_to_merge);

-- Disable old thread participants
UPDATE global_thread_participants 
SET is_active = false 
WHERE thread_id IN (
  SELECT old_thread_id 
  FROM (
    WITH duplicate_global_threads AS (
      SELECT 
        gmt.id,
        gmt.updated_at,
        array_agg(DISTINCT gtp.user_id ORDER BY gtp.user_id) as participant_ids,
        ROW_NUMBER() OVER (
          PARTITION BY array_agg(DISTINCT gtp.user_id ORDER BY gtp.user_id) 
          ORDER BY gmt.updated_at DESC
        ) as rn
      FROM global_message_threads gmt
      JOIN global_thread_participants gtp ON gmt.id = gtp.thread_id
      WHERE gmt.type = 'direct' AND gtp.is_active = true
      GROUP BY gmt.id, gmt.updated_at
      HAVING COUNT(DISTINCT gtp.user_id) = 2
    )
    SELECT id as old_thread_id FROM duplicate_global_threads WHERE rn > 1
  ) t
);

-- Similar cleanup for tenant direct threads
WITH duplicate_tenant_threads AS (
  SELECT 
    mt.id,
    mt.updated_at,
    mt.tenant_id,
    array_agg(DISTINCT tp.user_id ORDER BY tp.user_id) as participant_ids,
    ROW_NUMBER() OVER (
      PARTITION BY mt.tenant_id, array_agg(DISTINCT tp.user_id ORDER BY tp.user_id) 
      ORDER BY mt.updated_at DESC
    ) as rn
  FROM message_threads mt
  JOIN thread_participants tp ON mt.id = tp.thread_id
  WHERE mt.type = 'direct' AND tp.is_active = true
  GROUP BY mt.id, mt.updated_at, mt.tenant_id
  HAVING COUNT(DISTINCT tp.user_id) = 2
),
tenant_threads_to_merge AS (
  SELECT 
    id as old_thread_id,
    FIRST_VALUE(id) OVER (
      PARTITION BY tenant_id, participant_ids 
      ORDER BY updated_at DESC, id DESC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as keep_thread_id
  FROM duplicate_tenant_threads
  WHERE rn > 1
)
-- Update tenant messages to point to the thread we're keeping
UPDATE messages 
SET thread_id = (
  SELECT keep_thread_id 
  FROM tenant_threads_to_merge 
  WHERE old_thread_id = messages.thread_id
)
WHERE thread_id IN (SELECT old_thread_id FROM tenant_threads_to_merge);

-- Disable old tenant thread participants
UPDATE thread_participants 
SET is_active = false 
WHERE thread_id IN (
  SELECT old_thread_id 
  FROM (
    WITH duplicate_tenant_threads AS (
      SELECT 
        mt.id,
        mt.updated_at,
        mt.tenant_id,
        array_agg(DISTINCT tp.user_id ORDER BY tp.user_id) as participant_ids,
        ROW_NUMBER() OVER (
          PARTITION BY mt.tenant_id, array_agg(DISTINCT tp.user_id ORDER BY tp.user_id) 
          ORDER BY mt.updated_at DESC
        ) as rn
      FROM message_threads mt
      JOIN thread_participants tp ON mt.id = tp.thread_id
      WHERE mt.type = 'direct' AND tp.is_active = true
      GROUP BY mt.id, mt.updated_at, mt.tenant_id
      HAVING COUNT(DISTINCT tp.user_id) = 2
    )
    SELECT id as old_thread_id FROM duplicate_tenant_threads WHERE rn > 1
  ) t
);