

## WhatsApp-Style Chat View Redesign

Comparing the current app (second screenshot) to WhatsApp (first screenshot), the issues are clear: the header is too tall with excessive padding, the message input/composer area wastes vertical space, and the overall density is too loose. Here is the plan to make it WhatsApp-like.

### Changes

**1. Compact Header** — `src/components/messages/ConversationView.tsx`

Current header (lines 992-1054) uses `px-4 py-3` padding and generous spacing. Changes:
- Reduce padding from `py-3` to `py-2` on mobile
- Reduce avatar size gap from `gap-3` to `gap-2`
- Make the subtitle (`Online`, `Last seen...`) smaller — `text-xs` instead of `text-sm`
- Remove the separate `shadow-sm` on the header (WhatsApp has a flat, clean header)
- Remove the Info button on mobile to save horizontal space (keep call buttons and back arrow only, like WhatsApp)

**2. Compact Composer** — `src/components/messages/MessageInput.tsx`

Current composer (lines 465-609) uses `px-3 py-2` on the form plus an outer wrapper in ConversationView with `px-4 py-3`. Changes:
- Reduce outer wrapper padding from `px-4 py-3` to `px-3 py-1.5` on mobile
- Remove the double-padding (form has its own `px-3 py-2` inside the outer `px-4 py-3`)
- Make the textarea more compact: reduce `py-3` to `py-2` on the textarea
- Add a subtle rounded border container around the input row (emoji + text + mic/send) like WhatsApp's pill-shaped input bar
- Reduce the `--composer-h` base from 112px to something tighter

**3. Slim Composer Wrapper** — `src/components/messages/ConversationView.tsx`

The composer wrapper (lines 1157-1197) adds its own `px-4 py-3` padding around `MessageInput`. Changes:
- Reduce to `px-2 py-1` — let the form handle its own internal padding
- Remove redundant `backdrop-blur` and `shadow-sm` if not needed (WhatsApp has a simple white bar)

**4. WhatsApp-style Input Bar Shape** — `src/components/messages/MessageInput.tsx`

The input row (line 536 `flex items-end gap-3`) should be wrapped in a rounded pill container:
- Add `bg-muted/50 rounded-full px-2 py-1` wrapper around the emoji + textarea + attachment buttons
- Keep the send/mic button outside the pill (like WhatsApp's green circle)
- Reduce gap from `gap-3` to `gap-1`

### Summary of visual impact

```text
BEFORE                          AFTER (WhatsApp-style)
┌────────────────────┐          ┌────────────────────┐
│ ← [Avatar] Name    │ py-3     │← [Av] Name    📞🎥│ py-2, tight
│   Online       ℹ️📞🎥│          │  Online            │
├────────────────────┤          ├────────────────────┤
│                    │          │                    │
│   Messages area    │          │   Messages area    │
│   (more space!)    │          │   (MORE space!)    │
│                    │          │                    │
├────────────────────┤          ├────────────────────┤
│ px-4 py-3 wrapper  │          │ ╭──────────────╮   │ py-1
│ 😊 📎 [  input  ] │ py-2     │ │😊📎 input   │ 🎤│ compact pill
│                 🎤 │          │ ╰──────────────╯   │
└────────────────────┘          └────────────────────┘
```

Two files changed: `ConversationView.tsx` (header + composer wrapper) and `MessageInput.tsx` (input bar layout). No logic changes, purely CSS/layout.

