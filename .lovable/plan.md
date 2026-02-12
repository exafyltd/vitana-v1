
# Move Close (X) Button Up — Right Under the App Bar

## Problem
The X close button sits too low, with 16px of extra spacing below the safe area / app bar. The user wants it positioned tighter, right under the app bar.

## Solution
Reduce the top offset from `16px` to `4px` in the inline style, so the button sits snugly just below the app bar.

## Technical Details

### File: `src/components/meetups/MeetupDetailsDrawer.tsx` (line 658)

Change the inline style top value:

```
Before: style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
After:  style={{ top: 'calc(env(safe-area-inset-top) + 4px)' }}
```

Single-line change. The `env(safe-area-inset-top)` already accounts for the status bar/notch, so `+ 4px` places the button just below the app bar with minimal gap.
