# Real-time Diagnostics Panel

## Overview
The Real-time Diagnostics Panel is a dev-only tool for verifying real-time chat functionality in VITANA Inbox. It provides comprehensive monitoring of WebSocket connections, subscriptions, and message flow without affecting the normal user experience.

## Access
The panel is only visible when **BOTH** conditions are met:
1. URL includes `?diagnostics=1` (e.g., `/inbox?diagnostics=1`)
2. Feature flag is enabled:
   - Development: Always enabled by default
   - Production: Only if `VITE_DIAGNOSTICS_ENABLED=true` or localStorage override

## Feature Flag Override
For development testing, you can manually enable/disable:
```javascript
// Enable in console
localStorage.setItem('VITANA_DIAGNOSTICS_ENABLED', 'true');

// Disable in console  
localStorage.setItem('VITANA_DIAGNOSTICS_ENABLED', 'false');
```

## Panel Sections

### 1. WebSocket Status
- Shows connection state per Supabase channel (connected/reconnecting/failed)
- Displays subscription count and event activity
- Real-time status updates with color-coded indicators

### 2. Active Subscriptions
- Lists all active real-time subscriptions for the current thread
- Shows subscription types (messages, typing, unread sync)
- Updates as subscriptions are added/removed

### 3. Event Log (Last 20)
- Captures all real-time events with precise timestamps
- Event types: `send`, `ack`, `delivered`, `read`, `typing_start`, `typing_stop`, `unread_change`, `error`
- Highlights duplicates in red, errors in orange
- Shows performance latency for operations
- Truncates message content to 50 chars (PII protection)

### 4. Simulation Controls
- "Simulate Second User" toggle for multi-client testing
- Creates artificial typing indicators and message events
- Useful for testing without needing actual second browser/user

## Guardrails & Monitoring

### Automatic Error Detection
- **Send Failures**: Shows toast notification + logs error event
- **Duplicate Messages**: Highlights duplicates in red in event log
- **Cross-tab Unread Sync**: Measures convergence timing (target ≤500ms)

### Performance Tracking
- Measures latency for send→ack operations
- Tracks typing indicator response times (target ≤300ms)
- Monitors pagination smoothness and scroll anchoring

## Acceptance Testing

With the panel open, verify:

1. **Two Browser Test**: 
   - Open `/inbox?diagnostics=1` in two browsers with different users
   - Type in one → typing indicator appears in other ≤300ms
   - Send message → delivered/read events appear correctly
   - Unread counters sync across tabs ≤500ms

2. **Pagination Test**:
   - Load older messages → no scroll jumping
   - Anchor preservation during message loads

3. **Error Recovery**:
   - Simulate network issues → proper error logging
   - Retry behavior and graceful degradation

## Files Modified
- `src/components/diagnostics/RealtimeCheckPanel.tsx` - Main panel component
- `src/lib/diagnostics.ts` - Feature flags and instrumentation utilities
- `src/pages/Messages.tsx` - Integration point
- `src/hooks/useHybridMessages.ts` - Send instrumentation
- `src/hooks/useTypingIndicators.ts` - Typing event tracking
- `src/hooks/useUnreadSync.ts` - Unread sync monitoring
- `src/hooks/useConversationRealtime.ts` - Message delivery tracking

## Security & Privacy
- No PII beyond display names and thread IDs in logs
- Message content truncated to 50 characters
- Panel state resets on page reload
- Only available in development or with explicit production flag