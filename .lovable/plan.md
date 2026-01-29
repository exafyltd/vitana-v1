
## Localize Discover Page, Quick Actions Popup, and AI Picks Page

### Issues Identified

From the screenshots and code analysis, there are **three main problems**:

| Screen | Issue | Evidence |
|--------|-------|----------|
| Discover main page | Title "Discover" + description in English | Screenshot 3 shows English title |
| Quick Actions popup | All 8 actions in English | Screenshot 2 shows "View Cart", "Book Appointment", etc. |
| AI Picks page | All content in English + vertical cards layout | Screenshot 1 shows English UI with vertical grid |

### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/de.json` | Add ~40 new keys under `discover` namespace |
| `src/i18n/en.json` | Mirror all new keys in English |
| `src/pages/Discover.tsx` | Use `translate()` for title, description |
| `src/components/discover/DiscoverMasterActionPopup.tsx` | Full localization + use `useTranslation()` |
| `src/pages/discover/AIPicksPage.tsx` | Full localization + horizontal scroll layout for mobile |
| `src/components/discover/MobileDiscoverView.tsx` | Localize "View" button |

### Implementation Plan

#### Step 1: Expand Translation Keys

Add new keys under the existing `discover` namespace:

**Main Page:**
- `discover.mobileTitle`: "Entdecken" / "Discover"
- `discover.mobileDescription`: "Erlebnisse, Menschen und Wellness erkunden" / "Explore experiences, people, and wellness"
- `discover.desktopTitle`: "Entdecken Sie Ihren Langlebigkeits-Marktplatz" / "Discover Your Longevity Marketplace"
- `discover.desktopDescription`: (existing)

**Quick Actions Popup:**
- `discover.quickActions.title`: "Schnellaktionen" / "Quick Actions"
- `discover.quickActions.viewCart`: "Warenkorb" / "View Cart"
- `discover.quickActions.bookAppointment`: "Termin buchen" / "Book Appointment"
- `discover.quickActions.quickCheckout`: "Schnellkauf" / "Quick Checkout"
- `discover.quickActions.trackOrders`: "Bestellungen verfolgen" / "Track Orders"
- `discover.quickActions.reorderPrevious`: "Erneut bestellen" / "Reorder Previous"
- `discover.quickActions.managePayment`: "Zahlung verwalten" / "Manage Payment"
- `discover.quickActions.findServicesNearMe`: "Services in der Nähe" / "Find Services Near Me"
- `discover.quickActions.viewSavedItems`: "Gespeicherte Artikel" / "View Saved Items"

**AI Picks Page:**
- `discover.aiPicks.title`: "KI-Empfehlungen für Sie" / "AI Picks for You"
- `discover.aiPicks.description`: "Personalisierte Empfehlungen basierend auf Ihrem Vitana Index, Biomarkern und Gesundheitszielen" / "Personalized recommendations based on your Vitana Index, biomarkers, and health goals"
- `discover.aiPicks.backToDiscover`: "Zurück zu Entdecken" / "Back to Discover"
- `discover.aiPicks.loading`: "KI-Empfehlungen werden geladen..." / "Loading AI recommendations..."
- `discover.aiPicks.unavailable`: "KI-Empfehlungen nicht verfügbar" / "AI Picks unavailable"
- `discover.aiPicks.unavailableDesc`: "Wir konnten Ihre personalisierten Empfehlungen nicht laden" / "We couldn't load your personalized recommendations right now"
- `discover.aiPicks.recommendationsFound`: "{count} Empfehlungen gefunden" / "{count} recommendations found"
- `discover.aiPicks.noRecommendations`: "Keine Empfehlungen gefunden" / "No recommendations found"
- `discover.aiPicks.noRecommendationsDesc`: "Wählen Sie einen anderen Filter, um mehr Empfehlungen zu sehen" / "Try selecting a different filter to see more recommendations"
- `discover.aiPicks.viewAllPicks`: "Alle Empfehlungen anzeigen" / "View All Picks"

**Filter Tabs:**
- `discover.filters.all`: "Alle" / "All"
- `discover.filters.services`: "Services" / "Services"
- `discover.filters.supplements`: "Nahrungsergänzung" / "Supplements"
- `discover.filters.experts`: "Experten" / "Experts"
- `discover.filters.deals`: "Angebote" / "Deals"

**Toast Messages:**
- `discover.toast.actionSelected`: "Aktion ausgewählt" / "Action Selected"
- `discover.toast.comingSoon`: "{action} Funktion bald verfügbar!" / "{action} feature coming soon!"

#### Step 2: Update Discover.tsx

Replace hardcoded StandardHeader with translated strings:

```tsx
// BEFORE (line 213-216)
<StandardHeader
  title={isMobile ? "Discover" : "Discover Your Longevity Marketplace"}
  description={isMobile ? "Explore experiences, people, and wellness" : "..."}

// AFTER
<StandardHeader
  title={isMobile ? translate('discover.mobileTitle') : translate('discover.desktopTitle')}
  description={isMobile ? translate('discover.mobileDescription') : translate('discover.description')}
```

#### Step 3: Update DiscoverMasterActionPopup.tsx

1. Import `useTranslation()`
2. Refactor `actions` array to use stable IDs + translated labels
3. Localize dialog title and toast messages

```tsx
// NEW: Use stable IDs for action keys
const ACTION_IDS = ['viewCart', 'bookAppointment', 'quickCheckout', 'trackOrders', 
                    'reorderPrevious', 'managePayment', 'findServicesNearMe', 'viewSavedItems'];

const actions = ACTION_IDS.map((id, index) => ({
  id,
  icon: [ShoppingCart, Calendar, Zap, Package, RotateCcw, CreditCard, MapPin, Heart][index],
  label: translate(`discover.quickActions.${id}`),
  color: [...colors][index]
}));
```

#### Step 4: Update AIPicksPage.tsx - Localization + Horizontal Scroll Fix

**Localization:**
1. Import `useTranslation()`
2. Replace all hardcoded strings with `translate()` calls
3. Localize filter tabs, loading states, error messages, buttons

**Layout Fix - Horizontal Carousel for Mobile:**

The current grid layout (line 269-272):
```tsx
<div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2...")}>
```

Needs to be replaced with a horizontal carousel for mobile using Embla (same as `MobileDiscoverView.tsx`):

```tsx
// For mobile: Use horizontal carousel with one card per viewport
{isMobile ? (
  <div ref={emblaRef} className="overflow-hidden -mx-6">
    <div className="flex">
      {filteredRecommendations.map((rec) => (
        <div key={rec.id} className="flex-none w-[85vw] px-2 first:pl-6 last:pr-6">
          {/* Card content */}
        </div>
      ))}
    </div>
  </div>
) : (
  /* Desktop: Keep existing grid layout */
)}
```

#### Step 5: Update MobileDiscoverView.tsx

Replace the hardcoded "View" button text (line 156):

```tsx
// BEFORE
<Button size="sm" ...>View</Button>

// AFTER
<Button size="sm" ...>{translate('discover.view')}</Button>
```

### Translation Summary (German)

| Key Path | German Value |
|----------|--------------|
| `discover.mobileTitle` | Entdecken |
| `discover.mobileDescription` | Erlebnisse, Menschen und Wellness erkunden |
| `discover.quickActions.title` | Schnellaktionen |
| `discover.quickActions.viewCart` | Warenkorb |
| `discover.quickActions.bookAppointment` | Termin buchen |
| `discover.quickActions.quickCheckout` | Schnellkauf |
| `discover.quickActions.trackOrders` | Bestellungen verfolgen |
| `discover.quickActions.reorderPrevious` | Erneut bestellen |
| `discover.quickActions.managePayment` | Zahlung verwalten |
| `discover.quickActions.findServicesNearMe` | Services in der Nähe |
| `discover.quickActions.viewSavedItems` | Gespeicherte Artikel |
| `discover.aiPicks.title` | KI-Empfehlungen für Sie |
| `discover.aiPicks.backToDiscover` | Zurück zu Entdecken |
| `discover.aiPicks.loading` | KI-Empfehlungen werden geladen... |
| `discover.aiPicks.recommendationsFound` | {count} Empfehlungen gefunden |
| `discover.filters.all` | Alle |
| `discover.filters.services` | Services |
| `discover.filters.supplements` | Nahrungsergänzung |
| `discover.filters.experts` | Experten |
| `discover.filters.deals` | Angebote |

### Technical Details

**Horizontal Scroll Implementation (AIPicksPage mobile):**

```tsx
import useEmblaCarousel from 'embla-carousel-react';

// Inside component
const [emblaRef, emblaApi] = useEmblaCarousel({ 
  loop: false, 
  align: 'start',
  containScroll: 'trimSnaps'
});
const [currentIndex, setCurrentIndex] = useState(0);

// Update current index on scroll
useEffect(() => {
  if (!emblaApi) return;
  const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
  emblaApi.on('select', onSelect);
  return () => emblaApi.off('select', onSelect);
}, [emblaApi]);
```

This matches the pattern used in `MobileDiscoverView.tsx` for consistent UX across the Discover experience.

### Verification Steps

1. Set language to German
2. Navigate to Discover page
3. Confirm:
   - Title: "Entdecken 🔍"
   - Description: "Erlebnisse, Menschen und Wellness erkunden"
4. Tap the "+" button - Quick Actions popup should show:
   - Title: "Schnellaktionen"
   - All 8 actions in German
5. Tap "Alle anzeigen" on AI Picks section
6. AI Picks page should show:
   - Title: "KI-Empfehlungen für Sie"
   - Filters in German
   - **Horizontal scrolling cards** (one card per viewport)
   - "Zurück zu Entdecken" back button
7. Switch to English and verify all text reverts
