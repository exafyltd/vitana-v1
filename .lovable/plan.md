

## Mobile Connected Apps & Integrations Redesign

### Overview

Redesign `/settings/connected-apps` for mobile using the established VITANA mobile hub patterns (Events, Business Hub, Media Hub). The screen will feel native, calm, and lightweight — not a compressed desktop page.

---

## Current State Analysis

The desktop `ConnectedApps.tsx` (1,876 lines) contains:

| Category | Apps Count | Status |
|----------|-----------|--------|
| Social Media & Sharing | 6 | Some connected |
| Wearables & Fitness | 6 | Apple Health, Fitbit, MyFitnessPal connected |
| Sleep & Recovery | 3 | Oura connected, others "Coming Soon" |
| Nutrition & Wellness | 4 | MyFitnessPal connected |
| Clinical & Lab | 3 | All "Coming Soon" |
| Mindfulness | 3 | Not connected |
| Smart Home | 3 | All "Coming Soon" |
| Communication | 4 | All "Coming Soon" |
| Wallet & Payments | 3 | All "Coming Soon" |
| Developer Tools | 4 | CSV Import available |

**Desktop Complexity to Remove:**
- 3-tab SplitBar (Connected/Available/Sync) → simplify to single scrollable list
- HorizontalCardList with expandable content → compact mobile rows
- Sync history logs and filtering → hide behind detail sheet
- Technical metadata (last sync timestamps, detailed permissions)

---

## Mobile Categorization (Simplified)

Reduce from 10+ categories to **4 primary mobile sections**:

| Section | Emoji | Contains |
|---------|-------|----------|
| 📱 Social & Sharing | 📱 | LinkedIn, Instagram, TikTok, YouTube, Facebook, X |
| 💪 Fitness & Wearables | 💪 | Apple Health, Fitbit, Strava, Garmin, Oura, MyFitnessPal |
| 🩺 Health & Labs | 🩺 | Clinical providers, Partner Labs, FHIR |
| 🔧 Other | 🔧 | Mindfulness, Smart Home, Communication, Developer (collapsed) |

---

## Mobile Layout Structure

Following the same pattern as `BusinessHub.tsx` mobile (lines 109-285):

```text
┌─────────────────────────────────────┐
│  StandardHeader                     │
│  "Connected Apps" + description     │
├─────────────────────────────────────┤
│  UtilityActionButton                │
│  [🔍 Search] [+ Connect App]        │
├─────────────────────────────────────┤
│  Connection Summary Strip           │
│  "4 Connected • 2 Syncing"          │
├─────────────────────────────────────┤
│                                     │
│  📱 Social & Sharing          [3/6] │
│  ├─ LinkedIn        ✓ Connected     │
│  ├─ Instagram       ✓ Connected     │
│  └─ TikTok         → Connect        │
│                                     │
│  💪 Fitness & Wearables       [4/6] │
│  ├─ Apple Health    ✓ Synced        │
│  ├─ Fitbit          ✓ Synced        │
│  └─ Strava         → Connect        │
│                                     │
│  🩺 Health & Labs            [0/3]  │
│  ├─ Lifespin       ○ Coming Soon    │
│  └─ Partner Labs   ○ Coming Soon    │
│                                     │
│  🔧 Other                    [0/8]  │
│  └─ [Expand to see more]            │
│                                     │
└─────────────────────────────────────┘
               ↓ tap row
┌─────────────────────────────────────┐
│  ══════════════════════════════     │  ← Bottom Sheet
│  Apple Health                       │
│  ✓ Connected • Last sync: 2m ago    │
│                                     │
│  Data syncing:                      │
│  • Steps  • Heart rate  • Sleep     │
│                                     │
│  [Configure Sync]  [Disconnect]     │
└─────────────────────────────────────┘
```

---

## New Components to Create

### 1. MobileConnectedAppsView.tsx
Main mobile container following `BusinessHub.tsx` mobile pattern.

```tsx
// src/components/settings/MobileConnectedAppsView.tsx

export function MobileConnectedAppsView() {
  const { translate } = useTranslation();
  const [selectedApp, setSelectedApp] = useState<Integration | null>(null);
  
  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background">
      <div className="p-4 pb-32 space-y-4">
        <StandardHeader
          title={translate('connectedApps.title')}
          description={translate('connectedApps.description')}
        />
        
        <UtilityActionButton>
          <ExpandableSearchButton placeholder={translate('connectedApps.searchPlaceholder')} />
          <Button onClick={() => setConnectPopupOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {translate('connectedApps.addApp')}
          </Button>
        </UtilityActionButton>
        
        {/* Connection Summary */}
        <MobileConnectionSummary 
          connectedCount={4}
          syncingCount={2}
        />
        
        {/* Collapsible Sections */}
        <div className="space-y-3">
          <MobileIntegrationSection
            title={translate('connectedApps.sections.social')}
            emoji="📱"
            integrations={socialApps}
            onSelect={setSelectedApp}
          />
          <MobileIntegrationSection
            title={translate('connectedApps.sections.fitness')}
            emoji="💪"
            integrations={fitnessApps}
            onSelect={setSelectedApp}
          />
          {/* ... more sections */}
        </div>
      </div>
      
      {/* Detail Sheet */}
      <MobileIntegrationDetailSheet
        integration={selectedApp}
        onClose={() => setSelectedApp(null)}
      />
    </div>
  );
}
```

### 2. MobileIntegrationSection.tsx
Collapsible section with category header and compact rows.

```tsx
// src/components/settings/MobileIntegrationSection.tsx

interface MobileIntegrationSectionProps {
  title: string;
  emoji: string;
  integrations: Integration[];
  onSelect: (app: Integration) => void;
}

export function MobileIntegrationSection({ title, emoji, integrations, onSelect }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const connectedCount = integrations.filter(i => i.connected).length;
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-card/60 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{connectedCount}/{integrations.length}</Badge>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-2 mt-2">
        {integrations.map(app => (
          <MobileIntegrationRow
            key={app.id}
            integration={app}
            onTap={() => onSelect(app)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### 3. MobileIntegrationRow.tsx
Compact list row following `MobileMusicList.tsx` pattern (lines 102-184).

```tsx
// src/components/settings/MobileIntegrationRow.tsx

export function MobileIntegrationRow({ integration, onTap }: Props) {
  const { translate } = useTranslation();
  const Icon = integration.icon;
  
  return (
    <div
      onClick={onTap}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all",
        "bg-card/60 border border-border/50",
        integration.connected && "border-l-2 border-l-emerald-500"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center",
        integration.connected ? "bg-emerald-500/10" : "bg-muted/50"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate">{integration.name}</h3>
        <p className="text-xs text-muted-foreground truncate">
          {integration.connected 
            ? translate('connectedApps.status.connected')
            : integration.comingSoon 
              ? translate('connectedApps.status.comingSoon')
              : integration.syncData
          }
        </p>
      </div>
      
      {/* Status/Action */}
      <div className="shrink-0">
        {integration.connected ? (
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        ) : integration.comingSoon ? (
          <Badge variant="secondary" className="text-xs">Soon</Badge>
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
```

### 4. MobileIntegrationDetailSheet.tsx
Bottom sheet for app management (following `MeetupDetailsDrawer.tsx` pattern).

```tsx
// src/components/settings/MobileIntegrationDetailSheet.tsx

export function MobileIntegrationDetailSheet({ integration, onClose }: Props) {
  const { translate } = useTranslation();
  if (!integration) return null;
  
  return (
    <Sheet open={!!integration} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center",
            integration.connected ? "bg-emerald-500/10" : "bg-muted"
          )}>
            <integration.icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold">{integration.name}</h3>
            <p className="text-sm text-muted-foreground">
              {integration.connected 
                ? `${translate('connectedApps.lastSync')}: ${integration.lastSync}`
                : translate('connectedApps.status.notConnected')
              }
            </p>
          </div>
        </div>
        
        {integration.connected ? (
          <>
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium">{translate('connectedApps.dataSync')}:</p>
              <p className="text-sm text-muted-foreground">{integration.syncData}</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                {translate('connectedApps.actions.configure')}
              </Button>
              <Button variant="destructive" className="flex-1">
                {translate('connectedApps.actions.disconnect')}
              </Button>
            </div>
          </>
        ) : integration.comingSoon ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              {translate('connectedApps.comingSoonMessage', { appName: integration.name })}
            </p>
          </div>
        ) : (
          <Button className="w-full" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            {translate('connectedApps.actions.connect')}
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

### 5. MobileConnectionSummary.tsx
Quick glance summary strip.

```tsx
// src/components/settings/MobileConnectionSummary.tsx

export function MobileConnectionSummary({ connectedCount, syncingCount }: Props) {
  const { translate } = useTranslation();
  
  return (
    <div className="flex items-center justify-between p-3 bg-card/80 rounded-xl border">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm">
          {connectedCount} {translate('connectedApps.connected')}
        </span>
      </div>
      {syncingCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {syncingCount} {translate('connectedApps.syncing')}
        </span>
      )}
    </div>
  );
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/settings/ConnectedApps.tsx` | Add `useIsMobile()` check, render `MobileConnectedAppsView` when mobile |
| `src/i18n/de.json` | Add `connectedApps` namespace with all mobile-specific keys |
| `src/i18n/en.json` | Add matching English translations |

## New Files to Create

| File | Purpose |
|------|---------|
| `src/components/settings/MobileConnectedAppsView.tsx` | Main mobile container |
| `src/components/settings/MobileIntegrationSection.tsx` | Collapsible category section |
| `src/components/settings/MobileIntegrationRow.tsx` | Compact integration row |
| `src/components/settings/MobileIntegrationDetailSheet.tsx` | Bottom sheet for management |
| `src/components/settings/MobileConnectionSummary.tsx` | Summary strip component |
| `src/components/settings/integrationData.ts` | Unified data structure for all integrations |

---

## Translation Keys to Add

```json
{
  "connectedApps": {
    "title": "Connected Apps",
    "description": "Manage your connected devices and services",
    "searchPlaceholder": "Search apps...",
    "addApp": "Add App",
    "connected": "connected",
    "syncing": "syncing",
    "sections": {
      "social": "Social & Sharing",
      "fitness": "Fitness & Wearables",
      "health": "Health & Labs",
      "other": "Other"
    },
    "status": {
      "connected": "Connected",
      "notConnected": "Not connected",
      "comingSoon": "Coming Soon"
    },
    "actions": {
      "connect": "Connect",
      "disconnect": "Disconnect",
      "configure": "Configure Sync",
      "manage": "Manage"
    },
    "lastSync": "Last sync",
    "dataSync": "Data syncing",
    "comingSoonMessage": "{appName} integration coming soon"
  }
}
```

German equivalents:
```json
{
  "connectedApps": {
    "title": "Verbundene Apps",
    "description": "Verwalten Sie Ihre verbundenen Geräte und Dienste",
    "searchPlaceholder": "Apps suchen...",
    "addApp": "App hinzufügen",
    "connected": "verbunden",
    "syncing": "synchronisiert",
    "sections": {
      "social": "Social & Teilen",
      "fitness": "Fitness & Wearables",
      "health": "Gesundheit & Labore",
      "other": "Weitere"
    },
    "status": {
      "connected": "Verbunden",
      "notConnected": "Nicht verbunden",
      "comingSoon": "Demnächst"
    },
    "actions": {
      "connect": "Verbinden",
      "disconnect": "Trennen",
      "configure": "Sync konfigurieren",
      "manage": "Verwalten"
    },
    "lastSync": "Letzte Sync",
    "dataSync": "Daten-Synchronisation",
    "comingSoonMessage": "{appName}-Integration kommt bald"
  }
}
```

---

## Implementation Sequence

1. Create `integrationData.ts` with unified data structure
2. Create `MobileIntegrationRow.tsx` component
3. Create `MobileIntegrationSection.tsx` component
4. Create `MobileConnectionSummary.tsx` component
5. Create `MobileIntegrationDetailSheet.tsx` component
6. Create `MobileConnectedAppsView.tsx` main container
7. Update `ConnectedApps.tsx` with mobile detection and routing
8. Add translation keys to `de.json` and `en.json`

---

## UX Principles Applied

- **Mobile-first**: Single-column, one-handed scrolling
- **Clarity over completeness**: Hide sync history and technical metadata
- **Progressive disclosure**: Collapsible sections, detail sheets only when tapped
- **Consistent with VITANA mobile hubs**: Same `StandardHeader` + `UtilityActionButton` + vertical scroll pattern

