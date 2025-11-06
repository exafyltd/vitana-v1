# Analytics Smoke Test - Horizontal Lists

## Quick Test (Paste in DevTools Console)

```javascript
// Retrieve and display all horizontal list analytics events
const events = JSON.parse(localStorage.getItem('g1_analytics_events') || '[]');
const horizontalEvents = events.filter(e => /horizontal_(list_|card_)/.test(e.eventName));

console.log('=== HORIZONTAL LIST ANALYTICS ===');
console.log(`Total events: ${horizontalEvents.length}`);
console.table(horizontalEvents.map(e => ({
  Event: e.eventName,
  Variant: e.payload?.variant || 'N/A',
  ScreenID: e.payload?.screenId || 'N/A',
  CardID: e.payload?.cardId || 'N/A',
  Value: e.payload?.value || 'N/A',
  Timestamp: new Date(e.payload?.timestamp).toLocaleTimeString()
})));

console.log('\n=== PII CHECK ===');
const piiPatterns = [/@/, /\d{3}-\d{3}-\d{4}/, /^\d{9,}$/, /\b(mr|mrs|ms|dr)\b/i];
const hasPII = horizontalEvents.some(e => {
  const payload = JSON.stringify(e.payload);
  return piiPatterns.some(pattern => pattern.test(payload));
});

if (hasPII) {
  console.error('❌ PII DETECTED in analytics payload!');
} else {
  console.log('✅ No PII detected. Safe to log.');
}

console.log('\n=== EVENT BREAKDOWN ===');
const eventCounts = horizontalEvents.reduce((acc, e) => {
  acc[e.eventName] = (acc[e.eventName] || 0) + 1;
  return acc;
}, {});
console.table(eventCounts);
```

## Expected Events

### `horizontal_list_view`
**Trigger:** List component mounts  
**Payload:**
```json
{
  "variant": "standard" | "visual",
  "screenId": "D1-004-01" | "AI_FEED_ACTIVITY" | "MEMORY_TIMELINE",
  "listId": "reminder-list" | "ai-feed-activity" | "timeline-list",
  "value": "12" // itemCount
}
```

### `horizontal_card_view`
**Trigger:** Card becomes 50% visible (IntersectionObserver)  
**Payload:**
```json
{
  "variant": "standard" | "visual",
  "screenId": "D1-004-01",
  "cardId": "msg_abc123", // NEVER contains names, emails, messages
  "value": "standard" | "visual"
}
```

### `horizontal_card_expand`
**Trigger:** Standard card expansion toggled (not Visual)  
**Payload:**
```json
{
  "variant": "standard",
  "screenId": "D1-004-01",
  "cardId": "msg_abc123",
  "value": "true" | "false" // expanded state
}
```

### `horizontal_card_cta`
**Trigger:** Primary/secondary CTA clicked  
**Payload:**
```json
{
  "variant": "standard" | "visual",
  "screenId": "AI_FEED_ACTIVITY",
  "cardId": "activity_xyz789",
  "actionId": "primary_view_details" | "secondary_share"
}
```

### `horizontal_list_load_more`
**Trigger:** Infinite scroll sentinel triggers (600px rootMargin)  
**Payload:**
```json
{
  "variant": "visual",
  "screenId": "AI_FEED_ACTIVITY",
  "listId": "ai-feed-activity",
  "newItemCount": "25" // total items after load
}
```

## Privacy Rules

### ✅ ALLOWED
- IDs: `msg_abc123`, `activity_xyz789`, `user_hashed_a1b2c3`
- Screen IDs: `D1-004-01`, `AI_FEED_ACTIVITY`
- Action IDs: `primary_view_details`, `secondary_share`
- Counts: `itemCount: 12`, `newItemCount: 25`
- Metadata: `variant: "visual"`, `status: "completed"`

### ❌ NEVER LOG
- Names: `John Doe`, `Dr. Smith`
- Emails: `user@example.com`
- Messages: `"Please review my lab results"`
- Biomarker values: `glucose: 120`, `weight: 180`
- Phone numbers: `555-123-4567`
- Addresses: `123 Main St`

## Testing Checklist

- [ ] List view logged on mount with `itemCount`
- [ ] Card view logged at 50% visibility threshold
- [ ] Standard card expand/collapse logged (Visual cards don't expand)
- [ ] CTA clicks logged with `actionId`
- [ ] Infinite scroll load_more logged with `newItemCount` at 600px rootMargin
- [ ] All payloads include `{ variant, screenId, cardId }`
- [ ] No PII/PHI in any payload (run PII check above)
- [ ] Events stored in `localStorage.g1_analytics_events` (max 500 events)

## Manual Verification

1. Open `/inbox/reminder` → Check console for `horizontal_list_view`
2. Scroll down → Check console for `horizontal_card_view` (multiple)
3. Expand first card → Check console for `horizontal_card_expand` with `value: "true"`
4. Press Esc → Check console for `horizontal_card_expand` with `value: "false"`
5. Click "Mark Done" → Check console for `horizontal_card_cta` with `actionId: "primary_mark_done"`
6. Open `/home/aifeed` → Check console for `horizontal_list_view` (Activity tab)
7. Scroll down → Check console for `horizontal_list_load_more` with `newItemCount`
8. Run smoke test script → Verify no PII detected
