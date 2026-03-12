

# Fix: Show only first name in chat input placeholder

## What's happening

The chat input placeholder currently uses `getConversationDisplayTitle()` which returns the **full display name** (e.g., "Jovana Stojanović"). You want it to show just the first name: "Message Jovana..."

## Implementation

1. **Add helper in `src/utils/conversationHelpers.ts`**:
   - New function `getParticipantFirstName()` that extracts the first name from display_name/full_name
   - Falls back gracefully for single names

2. **Update `src/components/messages/ConversationView.tsx`**:
   - Change placeholder from `Message ${getConversationDisplayTitle(...)}...` to `Message ${getParticipantFirstName(...)}...`

## Code changes

### `src/utils/conversationHelpers.ts` - add function:
```typescript
export function getParticipantFirstName(participant: ThreadParticipant | null): string {
  if (!participant) return '';
  const fullName = participant.profile?.display_name ||
                   participant.profile?.full_name ||
                   participant.display_name ||
                   participant.full_name ||
                   '';
  return fullName.split(' ')[0] || fullName;
}
```

### `src/components/messages/ConversationView.tsx` line 1203:
```typescript
// Before
placeholder={`Message ${getConversationDisplayTitle(threads.find(t => t.id === threadId), user?.id)}...`}

// After  
placeholder={`Message ${getParticipantFirstName(getOtherParticipant(threads.find(t => t.id === threadId), user?.id))}...`}
```

