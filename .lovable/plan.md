

## Fix: People Emoji Category — Add Faces and Body Emojis

### Problem
The "People" category only contains hand/gesture emojis. It should also include faces, person emojis, and other people-related emojis.

### Fix

**File: `src/components/ui/emoji-picker.tsx`** — Expand the `people` array to include faces, person emojis, family, and body parts alongside existing hand gestures:

```
people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👍', '👎',
         '👶', '👦', '👧', '👨', '👩', '👴', '👵', '🧑', '👮', '👷', '💂', '🕵️', '👩‍⚕️', '👩‍🎓', '👩‍💻',
         '🙋', '🙅', '🙆', '💁', '🙇', '🤷', '🤦', '💆', '💇', '🧖',
         '👫', '👬', '👭', '👪',
         '👀', '👁️', '👃', '👂', '👄', '💀', '🧠', '💪', '🦵', '🦶']
```

### Files to modify
- `src/components/ui/emoji-picker.tsx` — expand `people` array

