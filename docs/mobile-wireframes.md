# VITANA Mobile PWA - Wireframes

> **Visual reference for mobile surface layouts and navigation patterns.**

---

## 1. Global Layout Structure

```
┌────────────────────────────────────────────────┐
│ ≡                    Status Bar           🔔   │ ← Floating header
├────────────────────────────────────────────────┤
│                                                │
│                                                │
│              FULL-SCREEN CONTENT               │
│                                                │
│                                                │
│                                                │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ Type here...                        📤   │  │ ← Floating input (optional)
│  └──────────────────────────────────────────┘  │
│                                                │
├────────────────────────────────────────────────┤
│   [📅]    [👥]    (ORB)    [💰]    [👤]       │ ← Bottom nav (4 tabs + ORB)
└────────────────────────────────────────────────┘
```

---

## 2. Community Feed (with Sticky Pills)

```
┌────────────────────────────────────────────────┐
│ ≡                 Community               🔔   │
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐ │
│ │  Events  │  Meetups  │  Live  │  People    │ │ ← Sticky filter pills
│ └────────────────────────────────────────────┘ │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ [Avatar]  User Name              2h ago  │  │
│  │                                          │  │
│  │ Post content here with social            │  │
│  │ activity from the community...           │  │
│  │                                          │  │
│  │ ❤️ 24   💬 12   🔗 Share                 │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ [Avatar]  Another User          30m ago  │  │
│  │ ...                                      │  │
│  └──────────────────────────────────────────┘  │
│                                                │
├────────────────────────────────────────────────┤
│   [📅]    [👥]    (ORB)    [💰]    [👤]       │
└────────────────────────────────────────────────┘
```

### Pills Behavior
- Pills are **sticky** at top when scrolling
- Pills filter content **within** `/m/community` route
- Active pill has primary color background
- Scroll position resets on pill change

---

## 3. Events Feed (Horizontal Swipe)

```
┌────────────────────────────────────────────────┐
│ ≡                  Events                  🔔  │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │                                          │  │
│  │           [EVENT IMAGE]                  │  │
│  │                                          │  │
│  │                                          │  │
│  │ ─────────────────────────────────────── │  │
│  │ Yoga Retreat Berlin                      │  │
│  │ 📍 Berlin  •  📅 Jan 15  •  €49          │  │
│  │                                          │  │
│  │ [Get Tickets]              [♡] [Share]   │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│           ◀  •  ○  ○  ○  ▶                    │ ← Navigation dots
│                                                │
├────────────────────────────────────────────────┤
│   [📅]    [👥]    (ORB)    [💰]    [👤]       │
└────────────────────────────────────────────────┘
```

### Swipe Behavior
- Full-screen event cards
- Horizontal swipe left/right
- Arrow buttons visible on sides
- Dots indicate position in carousel

---

## 4. Business Hub (Mobile)

```
┌────────────────────────────────────────────────┐
│ ≡               Business Hub               🔔  │
├────────────────────────────────────────────────┤
│                                                │
│  ┌─────────────────┐  ┌─────────────────┐     │
│  │  💰 €1,234      │  │  📈 €456        │     │
│  │  Total Earned   │  │  This Month     │     │
│  └─────────────────┘  └─────────────────┘     │
│                                                │
│  ┌─────────────────┐  ┌─────────────────┐     │
│  │  ⏳ €89         │  │  📦 12          │     │
│  │  Pending        │  │  Active Items   │     │
│  └─────────────────┘  └─────────────────┘     │
│                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                │
│  Quick Actions                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ ➕  Create Event                         │  │
│  ├──────────────────────────────────────────┤  │
│  │ 📦  Add to Inventory                     │  │
│  ├──────────────────────────────────────────┤  │
│  │ 📊  View Analytics                       │  │
│  └──────────────────────────────────────────┘  │
│                                                │
├────────────────────────────────────────────────┤
│   [📅]    [👥]    (ORB)    [💰]    [👤]       │
└────────────────────────────────────────────────┘
```

### Business Hub Notes
- Simplified KPI cards (4 key metrics)
- Quick action list for common tasks
- Full Business Hub accessible on desktop
- Phase 3 implementation priority

---

## 5. Full-Screen Sidebar Menu

```
┌────────────────────────────────────────────────┐
│                                           ✕    │ ← Close button
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────┐  User Name                          │
│  │ [AV] │  @handle                            │
│  └──────┘                                      │
│                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                │
│  📰  Community Feed                           │
│  🎫  Events                                   │
│  🤝  Meetups                                  │
│  🔴  Live Rooms                               │
│  ▶️  Shorts                                   │
│                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                │
│  💰  Wallet                                   │
│  📅  Calendar                                 │
│  ❤️  Health Dashboard                         │
│  💼  Business Hub                             │
│  🛒  Services                                 │
│                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                │
│  🔔  Notifications                    (3)     │
│  💬  Messages                         (2)     │
│                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                │
│  ⚙️  Settings                                 │
│  🚪  Log Out                                  │
│                                                │
└────────────────────────────────────────────────┘
```

### Menu Behavior
- Full-screen overlay (`fixed inset-0`)
- Slide in from left
- Scrollable if content exceeds viewport
- Badge counts for notifications/messages

---

## 6. ORB States

### Browse Mode (Default)
```
┌────────────────────────────────────────────────┐
│   [📅]    [👥]    (ORB)    [💰]    [👤]       │
│                    ╭───╮                       │
│                    │ ◉ │  ← Crystal orb        │
│                    ╰───╯     with glow         │
└────────────────────────────────────────────────┘
```

### Listening Mode (Active)
```
┌────────────────────────────────────────────────┐
│                                                │
│              ╭─────────────────╮               │
│              │                 │               │
│              │   ◉ Listening   │               │ ← Expanded ORB
│              │   ~~~~~~~~~~~   │               │    with audio waves
│              │                 │               │
│              ╰─────────────────╯               │
│                                                │
├────────────────────────────────────────────────┤
│   [📅]    [👥]    (ORB)    [💰]    [👤]       │
└────────────────────────────────────────────────┘
```

### Live Mode (In Live Room)
```
┌────────────────────────────────────────────────┐
│                                                │
│              ┌─────────────────┐               │
│              │ ORB (text only) │               │ ← Collapsed pill
│              └─────────────────┘               │    mic blocked
│                                                │
│              [LIVE ROOM CONTENT]               │
│                                                │
├────────────────────────────────────────────────┤
│   [📅]    [👥]    (ORB)    [💰]    [👤]       │
└────────────────────────────────────────────────┘
```

---

## 7. Bottom Navigation Customization

### Default State
```
┌────────────────────────────────────────────────┐
│   Events   Community   ORB   Wallet   Profile  │
│    [📅]      [👥]      (◉)    [💰]     [👤]   │
└────────────────────────────────────────────────┘
```

### Customized Example
```
┌────────────────────────────────────────────────┐
│   Health   Messages    ORB   Events   Profile  │
│    [❤️]      [💬]      (◉)    [📅]     [👤]   │
└────────────────────────────────────────────────┘
```

### Customization Rules
- ORB is **always** in center (fixed)
- 4 surrounding tabs are user-customizable
- Access customization via Settings > Navigation

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-12-26 | Initial wireframes with Community pills, Business Hub, ORB states | — |
