

# Unified Mobile Upper-Screen System — 7 Remaining Screens

## Current State Summary

Each screen has varying degrees of the pattern already. The key gaps are:
- **Orders**: Has header + utility rail + SplitBarList tabs below (second row). No `MobileModePill`. No `compact` on utility rail.
- **Wallet**: Has header + utility rail + SplitBarList tabs below (second row). No `MobileModePill`. No `compact`.
- **Health**: Has header + utility rail + SplitBarList tabs below (second row). No `MobileModePill`. No `compact`.
- **Daily Diary**: Has header + utility rail + custom two-segment tab buttons below (second row). No `MobileModePill`. 
- **Connectors**: Has header + utility rail. No `MobileModePill` dropdown for section categories. No `compact`.
- **Inbox**: Has header + utility rail + SplitBarList tabs (Community/Network) + sub-filter pills below (third row). No `MobileModePill`. No `compact`.
- **Settings**: Has header + utility rail. No `MobileModePill`. Already uses `MobileAppShell`.

## What Changes Per Screen

For all 7 screens: add `MobileModePill` immediately after `ExpandableSearchButton` in the utility rail, use `compact` on `UtilityActionButton`, and remove the separate `SplitBarList` / tab row that currently sits below the utility rail. Content rendering switches on the pill's `activeMode` value directly.

### 1. Orders (`src/components/orders/MobileOrdersView.tsx`)
- Add `compact` to `UtilityActionButton`
- Add `MobileModePill` after Search with modes: `📦 Active`, `✅ History`
- Remove `SplitBarList` row (lines ~299-309). Render content conditionally based on pill mode instead of `SplitBarContent`
- Tighten spacing: `space-y-4` → `space-y-3`, remove excess padding

### 2. Wallet (`src/pages/Wallet.tsx`, mobile section ~302-466)
- Add `compact` to `UtilityActionButton`
- Add `MobileModePill` after Search with modes: `💰 Balances`, `📊 Activity`, `⚡ Actions`
- Remove `SplitBar`/`SplitBarList` row (lines ~374-379). Render content conditionally based on pill mode
- Tighten `space-y-4` → `space-y-3`

### 3. Health (`src/pages/Health.tsx`, mobile section ~193-299)
- Add `compact` to `UtilityActionButton`
- Add `MobileModePill` after Search with modes: `🏠 Overview`, `🏥 Medical`, `💊 Supplements`
- Remove `SplitBarList` row (lines ~236-243). Render content conditionally based on pill mode
- Tighten spacing

### 4. Daily Diary (`src/pages/MobileDailyDiary.tsx`)
- Add `compact` to `UtilityActionButton`
- Add `MobileModePill` after Search with modes: `🩺 Health Diary`, `🐛 Bug Reports`
- Remove the custom two-segment button row (lines ~113-134). Render content conditionally based on pill mode
- Tighten spacing

### 5. Connectors (`src/components/settings/MobileConnectedAppsView.tsx`)
- Add `compact` to `UtilityActionButton`
- Add `MobileModePill` after Search with modes: `📱 Social`, `💪 Fitness`, `🏥 Health`, `🔌 Other`
- Content already renders all sections in a vertical scroll. The pill will filter to show only the selected category section
- Tighten spacing: `space-y-4` → `space-y-3`

### 6. Inbox (`src/pages/Messages.tsx`, mobile section ~946-1100)
- Add `compact` to `UtilityActionButton`
- Add `MobileModePill` after Search with modes: `🌐 Community`, `🏢 Network`
- Remove `SplitBar`/`SplitBarList` for context tabs (lines ~1040-1048). Wire pill to `messageContext` state
- Remove the sub-filter pills row (All/Direct/Groups) — merge into pill as children if needed, or keep as lightweight inline pills inside the content area (since they're sub-filters, not modes)
- Tighten spacing

### 7. Settings (`src/pages/MobileSettings.tsx`)
- Add `compact` to `UtilityActionButton` (already partially compact)
- Add `MobileModePill` after Search with modes: `🔔 Notifications`, `🛡️ Privacy`, `🎛️ Preferences`, `🆘 Support`
- The pill selects which section scrolls into view or filters content. Currently all sections are visible in a single scroll — the pill will act as a jump-to / filter
- Tighten spacing

## Files Changed

1. `src/components/orders/MobileOrdersView.tsx` — add MobileModePill, remove SplitBarList, compact utility rail
2. `src/pages/Wallet.tsx` (mobile block) — add MobileModePill, remove SplitBarList, compact utility rail
3. `src/pages/Health.tsx` (mobile block) — add MobileModePill, remove SplitBarList, compact utility rail
4. `src/pages/MobileDailyDiary.tsx` — add MobileModePill, remove custom tab row, compact utility rail
5. `src/components/settings/MobileConnectedAppsView.tsx` — add MobileModePill, filter sections by mode, compact utility rail
6. `src/pages/Messages.tsx` (mobile block) — add MobileModePill, remove SplitBarList + sub-filter row, compact utility rail
7. `src/pages/MobileSettings.tsx` — add MobileModePill, filter/jump sections by mode, compact utility rail

## What Does Not Change

- Desktop layouts on all screens remain untouched
- Profile is excluded
- Core content areas/components within each screen remain unchanged
- The `MobileModePill` component itself needs no changes (already supports flat modes)

