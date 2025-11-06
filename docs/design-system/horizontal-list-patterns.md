# Horizontal List Patterns - VITANA Design System

## Quick Decision Tree

```
Does the list item need an image?
├─ YES → Use VisualHorizontalCard
│   └─ Examples: AI Feed, Events, Health Journeys
│
└─ NO → Use StandardHorizontalCard
    └─ Examples: Messages, Activities, Logs, Knowledge Base
```

## Components

### StandardHorizontalCard
**Text-focused horizontal card** with icon, title, description, badges, and actions.

**Dimensions:**
- `min-h-[88px]` - Locked height
- `px-4 py-3` - Internal padding
- `gap-3` - Between cards
- `rounded-xl` - Corner radius (12px)

**Layout:**
- Icon/Avatar: 36px circle
- Title: 15px/semibold (2-line clamp)
- Description: 13.5px (2-line clamp)
- Metadata: 12px text
- Badges: 11px text, h-5, px-2

**States:**
- Hover: 2px accent rail (left), shadow-xl, border-accent/40
- Focus: ring-2 ring-accent/60
- Expansion: 200ms ease-out (Standard only)

**Actions:**
- Primary: Right side, ghost variant → solid on hover
- Secondary: Kebab menu (DropdownMenu)

**A11y:**
- `<article>` semantic
- `aria-expanded` for expandable cards
- Keyboard: Enter/Space to expand, Esc to collapse
- RTL: Accent rail flips to right

### VisualHorizontalCard
**Image-heavy horizontal card** with visual content, category badge, and status indicators.

**Dimensions:**
- `min-h-[160px]` - Locked height
- `px-4 py-3` - Internal padding
- `gap-3` - Between cards
- `rounded-xl` - Corner radius (12px)

**Layout:**
- Image: 36% width (≥1024px), stacked on mobile
- Image aspect: 16:9 default, 4:3 option via `mediaAspect` prop
- Image treatment: `object-cover`, `rounded-xl`, `lazy` loading
- Reserved height via padding-bottom trick
- Title: 15px/semibold (2-line clamp)
- Description: 13.5px (2-line clamp)
- Metadata: 12px text
- Badges: 11px text, h-5, px-2

**States:**
- Hover: 2px accent rail (left), shadow-xl, border-accent/40
- Focus: ring-2 ring-accent/60
- Motion: 200ms ease-out

**Actions:**
- No expansion (Visual cards are display-only)
- Category badge overlays image (top-left)
- Status dot (right side)

**A11y:**
- `<article>` semantic
- Image alt text required
- RTL: Accent rail flips to right
- Dark mode: Uses semantic tokens only

### HorizontalCardList
**Container** with virtualization (≥30 items), infinite scroll, grouping, and single-open expansion.

## Analytics

**Events emitted:**
- `horizontal_list_view` - When list renders
- `horizontal_card_view` - When card becomes visible (50% threshold)
- `horizontal_card_expand` - When card expansion toggled (Standard only)
- `horizontal_card_cta` - When primary/secondary action clicked
- `horizontal_list_load_more` - When infinite scroll loads more

**Payload structure:**
```typescript
{
  variant: 'standard' | 'visual',
  screenId: string,
  cardId: string,
  listId?: string,
  actionId?: string,
  value?: string
}
```

**Privacy rules:**
- ✅ Log: IDs, screen IDs, action IDs, counts
- ❌ Never: Names, emails, message content, biomarker values

## Domain Accent Colors

**Accent rail colors (2px left border):**
- Health: `hsl(var(--pill-mental))`
- Hydration: `hsl(var(--pill-hydration))`
- Exercise: `hsl(var(--sys-warning))`
- Sleep: `hsl(var(--primary))`
- Default: `hsl(var(--accent))`

Use `category.color` prop to set domain-specific accent colors.

## Usage Examples

### Standard Pattern (Text-Only)

```typescript
import { HorizontalCardList } from '@/components/ui/horizontal-card-list';
import { StandardHorizontalCardProps } from '@/components/ui/standard-horizontal-card';

const items: StandardHorizontalCardProps[] = messages.map(msg => ({
  id: msg.id,
  screenId: 'D1-004-01',
  icon: '💬',
  title: msg.title,
  description: msg.content,
  badges: ['urgent'],
  timestamp: '2h ago',
  metadata: '3 replies',
  primaryAction: {
    label: 'Mark Done',
    onClick: () => handleDone(msg.id)
  },
  expandedContent: <div>Expanded details here</div>,
  density: 'compact'
}));

<HorizontalCardList
  items={items}
  variant="standard"
  screenId="D1-004-01"
  groupBy="date"
  gap="sm"
  infiniteScroll
/>
```

### Visual Pattern (With Images)

```typescript
import { HorizontalCardList } from '@/components/ui/horizontal-card-list';
import { VisualHorizontalCardProps } from '@/components/ui/visual-horizontal-card';

const items: VisualHorizontalCardProps[] = activities.map(activity => ({
  id: activity.id,
  screenId: 'AI_FEED_ACTIVITY',
  imageUrl: activity.image,
  imageAlt: activity.title,
  mediaAspect: '16:9', // or '4:3'
  category: {
    icon: '💧',
    label: 'Health',
    color: 'hsl(var(--pill-hydration))'
  },
  title: activity.title,
  description: activity.description,
  motivationalHook: 'Great progress! 🎉',
  metadata: [
    { icon: <Award />, text: '7 day streak' },
    { icon: <TrendingUp />, text: '+25 pts' }
  ],
  statusBadge: {
    label: 'Completed',
    variant: 'default',
    icon: <CheckCircle />
  },
  timestamp: '2h ago',
  statusDot: 'completed',
  rewardPoints: 5,
  density: 'compact'
}));

<HorizontalCardList
  items={items}
  variant="visual"
  screenId="AI_FEED_ACTIVITY"
  listId="ai-feed-activity"
  groupBy="date"
  gap="sm"
/>
```

## SLOs

- TTI < 2000ms
- Interaction < 200ms
- Infinite scroll < 500ms
- A11y score ≥ 95%
- Zero critical violations

## Feature Flags

Enable via `src/lib/feature-flags.ts` after validation.
