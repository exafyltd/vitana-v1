

## Localize Inbox (Messages) Page Components

### Root Cause

The translation keys were updated in `de.json`, but the React components still use **hardcoded English strings**. The `useTranslation()` hook is imported in `Messages.tsx` (line 53-58) but barely used.

### Files to Modify

| File | Changes Needed |
|------|----------------|
| `src/i18n/de.json` | Add ~50 missing keys for popups and context tabs |
| `src/i18n/en.json` | Mirror all keys in English |
| `src/pages/Messages.tsx` | Replace ALL hardcoded strings with `translate()` calls |
| `src/components/NewConversationPopup.tsx` | Add `useTranslation()` hook and localize all strings |
| `src/components/messages/CreateGroupPopup.tsx` | Add `useTranslation()` hook and localize all strings |

### Detailed Changes

#### 1. Add Missing Translation Keys to `de.json`

```json
"inbox": {
  "title": "Postfach",
  "description": "Ihre Unterhaltungen, Updates und Benachrichtigungen",
  "desktopTitle": "Nachrichten",
  "desktopDescription": "Verbinden Sie sich mit Ihrer Community und Ihrem Netzwerk",
  "loading": "Nachrichten werden geladen...",
  "contextTabs": {
    "community": "🌍 Community",
    "network": "🏢 Netzwerk"
  },
  "actions": {
    "new": "Neu",
    "newMessage": "Neue Nachricht",
    "createGroup": "Gruppe erstellen"
  },
  "searchPlaceholder": "Suchen...",
  "tabs": {
    "all": "Alle",
    "groups": "Gruppen",
    "direct": "Direkt",
    "contacts": "Kontakte"
  },
  "newConversation": {
    "title": "Neue Unterhaltung starten",
    "titleGroup": "Gruppenchat erstellen",
    "groupName": "Gruppenname",
    "groupNamePlaceholder": "Gruppenname eingeben...",
    "members": "Mitglieder",
    "recipient": "Empfänger",
    "addMore": "Weitere Personen hinzufügen",
    "searchPeople": "Personen suchen",
    "searchPlaceholder": "Name oder E-Mail eingeben...",
    "searchMinChars": "Mindestens 2 Zeichen zum Suchen eingeben",
    "searchResults": "Suchergebnisse",
    "noResults": "Keine Nutzer gefunden. Versuchen Sie einen anderen Suchbegriff.",
    "add": "Hinzufügen",
    "added": "Hinzugefügt",
    "cancel": "Abbrechen",
    "startChat": "Chat starten",
    "createGroup": "Gruppe erstellen",
    "creating": "Wird erstellt..."
  },
  "createGroup": {
    "title": "Gruppe erstellen",
    "avatarSoon": "Avatar-Upload bald verfügbar.",
    "groupName": "Gruppenname",
    "addMembers": "Mitglieder hinzufügen",
    "searchPlaceholder": "Nutzer suchen...",
    "groupNameRequired": "Gruppenname erforderlich",
    "groupNameRequiredDesc": "Bitte geben Sie einen Namen für Ihre Gruppe ein.",
    "addMembersRequired": "Mitglieder hinzufügen",
    "addMembersRequiredDesc": "Bitte fügen Sie mindestens ein Mitglied hinzu.",
    "groupExists": "Gruppe existiert bereits",
    "groupExistsDesc": "Eine Gruppe mit diesen Mitgliedern wurde kürzlich erstellt.",
    "created": "Gruppe erstellt",
    "createdDesc": "\"{name}\" wurde erfolgreich erstellt.",
    "failed": "Gruppe konnte nicht erstellt werden",
    "failedDesc": "Bitte versuchen Sie es erneut."
  },
  "toast": {
    "success": "Erfolg",
    "error": "Fehler",
    "conversationStarted": "Unterhaltung gestartet!",
    "authRequired": "Anmeldung erforderlich",
    "noTenantContext": "Kein Mandantenkontext verfügbar",
    "searchFailed": "Suche fehlgeschlagen",
    "accessDenied": "Zugriff verweigert",
    "communityOnly": "Nur Community-Nutzer können globale Unterhaltungen erstellen",
    "pleaseLogin": "Bitte melden Sie sich an",
    "groupRecipientsRequired": "Gruppenname und Empfänger erforderlich",
    "singleRecipientRequired": "Wählen Sie einen Empfänger für Direktnachrichten"
  }
}
```

#### 2. Update `src/pages/Messages.tsx`

**Loading states (lines 184-225):**

```tsx
// BEFORE
<StandardHeader 
  title="Inbox"
  description="Your conversations, updates, and notifications"
/>
// AFTER
<StandardHeader 
  title={translate('inbox.title')}
  description={translate('inbox.description')}
/>
```

**Mobile inbox view (lines 868-928):**

```tsx
// BEFORE
<StandardHeader
  title="Inbox"
  description="Your conversations, updates, and notifications"
/>
// AFTER
<StandardHeader
  title={translate('inbox.title')}
  description={translate('inbox.description')}
/>

// BEFORE
<span className="text-sm">New</span>
// AFTER
<span className="text-sm">{translate('inbox.actions.new')}</span>
```

**Context tabs (lines 937-938):**

```tsx
// BEFORE
<SplitBarTrigger value="global">🌍 Community</SplitBarTrigger>
<SplitBarTrigger value="tenant">🏢 Network</SplitBarTrigger>
// AFTER
<SplitBarTrigger value="global">{translate('inbox.contextTabs.community')}</SplitBarTrigger>
<SplitBarTrigger value="tenant">{translate('inbox.contextTabs.network')}</SplitBarTrigger>
```

**Filter buttons (lines 956, 978):**

```tsx
// BEFORE
{filter === 'all' ? 'All' : filter === 'direct' ? 'Direct' : 'Groups'}
// AFTER
{translate(`inbox.tabs.${filter}`)}
```

**Desktop tabs (lines 252-275):**

```tsx
// BEFORE
<TabsTrigger value="all">All</TabsTrigger>
<TabsTrigger value="groups">Groups</TabsTrigger>
<TabsTrigger value="direct">Direct Messages</TabsTrigger>
<TabsTrigger value="contacts">Contacts</TabsTrigger>
// AFTER
<TabsTrigger value="all">{translate('inbox.tabs.all')}</TabsTrigger>
<TabsTrigger value="groups">{translate('inbox.tabs.groups')}</TabsTrigger>
<TabsTrigger value="direct">{translate('inbox.tabs.direct')}</TabsTrigger>
<TabsTrigger value="contacts">{translate('inbox.tabs.contacts')}</TabsTrigger>
```

#### 3. Update `src/components/NewConversationPopup.tsx`

Add import and hook:
```tsx
import { useTranslation } from "@/hooks/useTranslation";
// Inside component:
const { translate } = useTranslation();
```

Replace all hardcoded strings:

| Line | Current | New |
|------|---------|-----|
| 409 | `'Create Group Chat' : 'Start New Conversation'` | `translate('inbox.newConversation.titleGroup') : translate('inbox.newConversation.title')` |
| 417 | `"Group Name"` | `translate('inbox.newConversation.groupName')` |
| 422 | `"Enter group name..."` | `translate('inbox.newConversation.groupNamePlaceholder')` |
| 431 | `'Members' / 'Recipient'` | `translate('inbox.newConversation.members') / translate('inbox.newConversation.recipient')` |
| 465 | `'Add more people' : 'Search for people'` | `translate('inbox.newConversation.addMore') : translate('inbox.newConversation.searchPeople')` |
| 474 | `"Enter name or email to search..."` | `translate('inbox.newConversation.searchPlaceholder')` |
| 483 | `"Type at least 2 characters..."` | `translate('inbox.newConversation.searchMinChars')` |
| 490 | `"Search Results"` | `translate('inbox.newConversation.searchResults')` |
| 524 | `'Added' : 'Add'` | `translate('inbox.newConversation.added') : translate('inbox.newConversation.add')` |
| 534 | `"No users found..."` | `translate('inbox.newConversation.noResults')` |
| 545 | `"Cancel"` | `translate('inbox.newConversation.cancel')` |
| 551 | `'Creating...' / 'Create Group' / 'Start Chat'` | Localized versions |

Toast messages (lines 87-109, 148-165, 266-295):
```tsx
// BEFORE
toast({ title: "Error", description: "No tenant context available" });
// AFTER
toast({ 
  title: translate('inbox.toast.error'), 
  description: translate('inbox.toast.noTenantContext') 
});
```

#### 4. Update `src/components/messages/CreateGroupPopup.tsx`

Add import and hook:
```tsx
import { useTranslation } from "@/hooks/useTranslation";
// Inside component:
const { translate } = useTranslation();
```

Replace all hardcoded strings:

| Line | Current | New |
|------|---------|-----|
| 283 | `"Create Group"` | `translate('inbox.createGroup.title')` |
| 304-306 | `"Coming soon" / "Avatar upload..."` | `translate('inbox.createGroup.avatarSoon')` |
| 313 | `"Group Name"` | `translate('inbox.createGroup.groupName')` |
| 327 | `"Members"` | `translate('inbox.newConversation.members')` |
| 360 | `"Add Members"` | `translate('inbox.createGroup.addMembers')` |
| 367 | `"Search users..."` | `translate('inbox.createGroup.searchPlaceholder')` |
| 409 | `"Cancel"` | `translate('inbox.newConversation.cancel')` |
| 415 | `"Creating..." / "Create Group"` | Localized versions |

Toast messages:
```tsx
// BEFORE
toast({ title: "Group name required", description: "Please enter..." });
// AFTER
toast({ 
  title: translate('inbox.createGroup.groupNameRequired'), 
  description: translate('inbox.createGroup.groupNameRequiredDesc') 
});
```

### Summary of Changes

| Component | Strings to Replace |
|-----------|-------------------|
| Messages.tsx (loading) | 4 strings |
| Messages.tsx (mobile view) | 12 strings |
| Messages.tsx (desktop view) | 10 strings |
| NewConversationPopup.tsx | 25+ strings including toasts |
| CreateGroupPopup.tsx | 18+ strings including toasts |

### Verification Steps

1. Set language to German (🇩🇪)
2. Navigate to Inbox/Messages
3. Verify:
   - Title: "Postfach" ✓
   - Description: "Ihre Unterhaltungen, Updates und Benachrichtigungen" ✓
   - Context tabs: "🌍 Community" / "🏢 Netzwerk" ✓
   - Filter tabs: "Alle" / "Direkt" / "Gruppen" ✓
   - New button: "Neu" ✓
4. Tap "Neu" button
5. Verify popup:
   - Title: "Neue Unterhaltung starten" ✓
   - Search placeholder: "Name oder E-Mail eingeben..." ✓
   - Cancel: "Abbrechen" ✓
   - Start Chat: "Chat starten" ✓
6. Test Create Group flow with German labels

