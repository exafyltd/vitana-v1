

## Add full utility bar to Daily Diary

The current utility bar at line 74-76 has only `<span />` as children (empty). It needs: search, calendar, + action button, gift voucher (auto), Vitana Index, Autopilot — matching EventsAndMeetups pattern.

### Changes to `src/pages/MobileDailyDiary.tsx`

1. **Add imports**: `ExpandableSearchButton`, `UniversalCalendarButton`, `Button`, `Badge`, `Plane`, `VitanaIndexChip`/`AutopilotChip` (or inline like Events), `useAutopilot`, `AutopilotPopup`, `useNavigate` (already imported).

2. **Add state/hooks**: `useAutopilot()` for `pendingCount`, `autopilotOpen` state for the popup, search query state.

3. **Replace the empty `<UtilityActionButton>` block** (lines 74-76) with the full pattern:
   ```tsx
   <UtilityActionButton 
     className="min-w-0"
     afterGiftVoucherChildren={(
       <>
         {/* Vitana Index pill */}
         <Button variant="ghost" size="sm" onClick={() => navigate('/health')}
           className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0">
           <span className="text-xs opacity-60">🧬</span>
           <span className="text-sm font-medium text-primary">742</span>
         </Button>
         {/* Autopilot pill */}
         <Button variant="ghost" size="sm" onClick={() => setAutopilotOpen(true)}
           className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 relative shrink-0">
           <Plane className="h-4 w-4 text-muted-foreground" />
           <span className="text-sm">Autopilot</span>
           {pendingCount > 0 && <Badge ...>{pendingCount}</Badge>}
         </Button>
       </>
     )}
   >
     <div className="flex items-center gap-2 min-w-max">
       <ExpandableSearchButton placeholder="Search diary..." onSearch={...} />
       <UniversalCalendarButton />
       <Button variant="ghost" size="sm" 
         className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
         onClick={() => setPlusOpen(true)}>
         <Plus className="h-4 w-4" />
         <span className="text-sm">Add</span>
       </Button>
     </div>
   </UtilityActionButton>
   ```

4. **Add `<AutopilotPopup>`** at the bottom of the return, before closing `</MobileAppShell>`.

