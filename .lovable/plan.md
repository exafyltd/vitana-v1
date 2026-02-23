

## Make Share Button More Prominent on Identity Card

The current share button is a small, nearly invisible ghost icon in the top-left corner of the dark identity card. The plan is to make it more noticeable while keeping the elegant card aesthetic.

### Change

**File: `src/components/profile/mobile/MobileIdentityCard.tsx` (lines 61-71)**

Replace the minimal ghost icon button with a slightly larger, pill-shaped button that includes a label:

- Increase size from `h-8 w-8` icon-only to a pill shape with text
- Use a semi-transparent glassmorphism background: `bg-white/10 backdrop-blur-sm border border-white/20`
- Add "Share" text label next to the icon
- Slightly larger touch target for mobile usability
- Hover state: `hover:bg-white/20` for subtle feedback
- Keep the rounded-full pill shape to match the edit button aesthetic

The result will look like a frosted-glass pill button reading "[icon] Share" -- visible but not distracting on the dark card.

### Technical Detail

```tsx
<Button
  variant="ghost"
  size="sm"
  className="absolute top-3 left-3 h-8 px-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white/80 hover:text-white z-10 text-xs font-medium gap-1.5"
  onClick={...}
>
  <Share2 className="h-3.5 w-3.5" />
  Share
</Button>
```

