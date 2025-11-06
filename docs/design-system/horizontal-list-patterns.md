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
Text-focused horizontal card with icon, title, description, badges, and actions.

### VisualHorizontalCard
Image-heavy horizontal card with visual content, category badge, and status indicators.

### HorizontalCardList
Container with virtualization (≥30 items), infinite scroll, grouping, and single-open expansion.

## Privacy & Consent

**Health CTAs requiring consent:**
- Share with Provider
- Export biomarkers
- Connect to healthcare providers

**Telemetry rules:**
- ✅ Log: IDs, screen IDs, action IDs, counts
- ❌ Never: Names, emails, message content, biomarker values

## Usage Example

```typescript
import { HorizontalCardList } from '@/components/ui/horizontal-card-list';
import { StandardHorizontalCardProps } from '@/components/ui/standard-horizontal-card';

const items: StandardHorizontalCardProps[] = messages.map(msg => ({
  id: msg.id,
  screenId: 'D1-004-01',
  icon: '💬',
  title: msg.title,
  description: msg.content,
  primaryAction: {
    label: 'Mark Done',
    onClick: () => handleDone(msg.id)
  }
}));

<HorizontalCardList
  items={items}
  variant="standard"
  screenId="D1-004-01"
  groupBy="date"
  infiniteScroll
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
