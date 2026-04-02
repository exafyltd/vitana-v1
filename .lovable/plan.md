

# Add ORB Voice Link Handler

## Summary
Add support for `link` events from the ORB voice SSE stream, displaying them as clickable toast notifications.

## Changes

### File 1: `src/lib/OrbVoiceClient.ts`

**A) Add `onLink` callback** (line 16, after `onTranscript`):
```typescript
onLink?: (url: string) => void;
```

**B) Merge `output_transcript` into `assistant_text` case** and add `link` case (lines 251–264):
Replace:
```typescript
          case 'assistant_text':
            if (msg.text) {
              this.callbacks.onTranscript?.(msg.text);
            }
            break;
          case 'turn_complete':
```
With:
```typescript
          case 'assistant_text':
          case 'output_transcript':
            if (msg.text) {
              this.callbacks.onTranscript?.(msg.text);
            }
            break;
          case 'link':
            if (msg.url) {
              console.log('[OrbVoiceClient] Link received:', msg.url);
              this.callbacks.onLink?.(msg.url);
            }
            break;
          case 'turn_complete':
```

### File 2: `src/hooks/useOrbVoiceClient.ts`

**A) Add import** (line 6, after supabase import):
```typescript
import { toast } from 'sonner';
```

**B) Add `onLink` callback** (after `onTranscript` block, line 202):
```typescript
        onLink: (url) => {
          console.log('[useOrbVoiceClient] Event link received:', url);
          toast('Link available', {
            description: url,
            action: {
              label: 'Open',
              onClick: () => window.open(url, '_blank'),
            },
            duration: 15000,
          });
        },
```

No other changes.

