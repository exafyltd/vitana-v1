

# Fix: Internationalize Mobile Inbox Empty State

## Problem

The `MobileInboxEmptyState` component has hardcoded English strings that are not using the translation system:
- "Your inbox is quiet for now"
- "Start a conversation or join a community to connect with others."
- "Connect with colleagues and team members in your professional network."
- "Start a conversation"
- "Discover people"

This violates the global "no hardcoded strings" rule and causes English text to appear even when German is selected.

---

## Solution

Replace all hardcoded strings with translation keys using the `useTranslation` hook.

---

## Files to Modify

### 1. `src/components/messages/mobile/MobileInboxEmptyState.tsx`

Add `useTranslation` hook and replace hardcoded strings:

```typescript
// Before
<h3>Your inbox is quiet for now</h3>

// After  
<h3>{translate('inbox.emptyState.title')}</h3>
```

**All strings to replace:**
| Hardcoded | Translation Key |
|-----------|-----------------|
| "Your inbox is quiet for now" | `inbox.emptyState.title` |
| "Start a conversation or join..." | `inbox.emptyState.globalDescription` |
| "Connect with colleagues..." | `inbox.emptyState.tenantDescription` |
| "Start a conversation" | `inbox.emptyState.startConversation` |
| "Discover people" | `inbox.emptyState.discoverPeople` |

---

### 2. `src/i18n/en.json`

Add to `inbox` namespace:

```json
"emptyState": {
  "title": "Your inbox is quiet for now",
  "globalDescription": "Start a conversation or join a community to connect with others.",
  "tenantDescription": "Connect with colleagues and team members in your professional network.",
  "startConversation": "Start a conversation",
  "discoverPeople": "Discover people"
}
```

---

### 3. `src/i18n/de.json`

Add German translations to `inbox` namespace:

```json
"emptyState": {
  "title": "Ihr Postfach ist noch leer",
  "globalDescription": "Starten Sie eine Unterhaltung oder treten Sie einer Community bei, um sich mit anderen zu verbinden.",
  "tenantDescription": "Verbinden Sie sich mit Kollegen und Teammitgliedern in Ihrem professionellen Netzwerk.",
  "startConversation": "Unterhaltung starten",
  "discoverPeople": "Personen entdecken"
}
```

---

## Implementation

1. Add translation keys to both JSON files under `inbox.emptyState`
2. Update `MobileInboxEmptyState.tsx` to import and use `useTranslation()`
3. Replace all 5 hardcoded strings with `translate()` calls

---

## Expected Result

After the fix, when German is selected:
- **Title**: "Ihr Postfach ist noch leer"
- **Description**: "Starten Sie eine Unterhaltung oder treten Sie einer Community bei..."
- **Button 1**: "Unterhaltung starten"
- **Button 2**: "Personen entdecken"

