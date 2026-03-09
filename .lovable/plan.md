

# Translate hardcoded English strings in Group Detail, Group Feed, Follow Dialog, and Group Membership

## Problem
Multiple components show English text even when German is selected:
- **GroupDetail.tsx**: "Members", "Public/Private", "Leave Group", "Leaving...", "Join Group", "Joining...", "Back"
- **GroupFeed.tsx**: "Share something with the group...", "Post", "No messages yet", "Be the first to post...", "Join the group to start posting.", "Message sent", "Delete this message?", "Message deleted", toast errors
- **GroupImageCard.tsx**: "members"
- **FollowListDialog.tsx**: "Folge ich" should be "Ich folge", "Not following anyone yet" needs German
- **useGroupMembership.ts**: "Joined! 🎉", "You're now a member of this group.", "Left group", "You've left this group.", error toasts

## Changes

### 1. `src/i18n/de.json` — Add new keys + fix existing
- Fix `profileStats.following`: "Folge ich" → "Ich folge"
- Add `follow.noFollowers`: "Noch keine Follower"
- Add `follow.noFollowing`: "Folgt noch niemandem"
- Add `groupDetail` namespace: members ("Mitglieder"), public ("Öffentlich"), private ("Privat"), leaveGroup ("Gruppe verlassen"), leaving ("Verlassen..."), joinGroup ("Beitreten"), joining ("Beitreten..."), back ("Zurück")
- Add `groupFeed` namespace: placeholder ("Mitteilung in der Gruppe..."), post ("Posten"), noMessages ("Noch keine Nachrichten"), beFirst ("Schreibe den ersten Beitrag!"), joinToPost ("Tritt der Gruppe bei, um zu posten."), messageSent ("Nachricht gesendet"), deleteConfirm ("Diese Nachricht löschen?"), messageDeleted ("Nachricht gelöscht"), error/errorSend/errorDelete
- Add `groupMembership` namespace: joined, joinedDesc, left, leftDesc, errorJoin, errorLeave

### 2. `src/i18n/en.json` — Add matching English keys
Same keys with English values for consistency.

### 3. `src/pages/community/GroupDetail.tsx`
- Import `useTranslation`, replace all hardcoded strings with `translate()` calls

### 4. `src/components/community/GroupFeed.tsx`
- Import `useTranslation`, replace all hardcoded strings and toast messages

### 5. `src/components/groups/GroupImageCard.tsx`
- Import `useTranslation`, replace "members" with `translate('groupDetail.members')`

### 6. `src/hooks/useGroupMembership.ts`
- Cannot use hooks directly (it's a hook itself), but toast strings need translating
- Option: accept translate fn as param, or inline the keys. Simplest: keep English in the hook for now and translate in components that consume it. **Better**: since this hook already uses `useToast`, we add `useTranslation` and translate the toast strings directly.

### 7. `src/components/profile/FollowListDialog.tsx`
- Already uses `translate()` — the "Not following anyone yet" string uses `translate("follow.noFollowing", ...)` but the key doesn't exist in de.json yet. Adding it fixes this.

## Files to modify (7 files)
- `src/i18n/en.json`
- `src/i18n/de.json`
- `src/pages/community/GroupDetail.tsx`
- `src/components/community/GroupFeed.tsx`
- `src/components/groups/GroupImageCard.tsx`
- `src/hooks/useGroupMembership.ts`
- No changes needed to `FollowListDialog.tsx` (already uses translate, just needs keys)

