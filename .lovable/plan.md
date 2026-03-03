

## Problem
The GroupFeed (on the group detail card) reads from `group_posts` table while the Messenger chat reads from `global_messages` table. These are two separate data stores — messages in one don't appear in the other. The previous unification plan was approved but not yet implemented.

## Plan

### 1. Rewrite `useGroupPosts.ts` to use `global_messages`

- **`useGroupPosts(groupId)`**: First fetch `chat_thread_id` from `global_community_groups` for the given `groupId`. Then query `global_messages` where `thread_id = chat_thread_id`, ordered by `created_at desc`, enriched with author profiles.
- **`createPost`**: Insert into `global_messages` with `thread_id = chat_thread_id`, `sender_id = user.id`, `body = content`. Also update `global_message_threads.updated_at` so the Messenger inbox sorts correctly.
- **`deletePost`**: Delete from `global_messages`.
- **Remove** `toggleLike` and `useGroupPostComments` — these are not part of the unified messaging model. Likes/comments can be re-added as message reactions later.
- **Cache invalidation**: On mutation, invalidate both `['group-posts', groupId]` and `['global-threads']` so both views update.
- **Realtime**: Subscribe to `global_messages` INSERT where `thread_id = chat_thread_id` for live updates.

### 2. Simplify `GroupFeed.tsx`

- Remove the likes/comments UI (Heart, MessageSquare buttons, `CommentsSection`, `GroupPostCard` nested comments).
- Render messages as a flat feed: avatar, name, content, timestamp, delete button (for own messages).
- The compose box inserts into `global_messages` via the rewritten hook.

### 3. Cache invalidation in `CreateGroupPopup.tsx` and `useGroupMembership.ts`

Already done — both invalidate `['global-threads']`. No changes needed here.

## What this achieves
- Post on the group card → appears in Messenger instantly
- Send in Messenger → appears on the group card instantly
- Single source of truth: `global_messages` table

## Files to modify
| File | Change |
|------|--------|
| `src/hooks/useGroupPosts.ts` | Full rewrite to use `global_messages` via `chat_thread_id` |
| `src/components/community/GroupFeed.tsx` | Simplify to flat message feed, remove likes/comments |

