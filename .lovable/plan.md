

# Add /logout Route for Appilix Mobile Drawer

## Overview
Create a dedicated `/logout` route that the Appilix mobile app can trigger from its native drawer menu. Desktop functionality remains completely untouched - this route is specifically for mobile app integration.

## Scope Confirmation
| Platform | Impact |
|----------|--------|
| Desktop | ❌ No changes - existing sidebar logout continues to work |
| Mobile (Appilix) | ✅ New `/logout` route for drawer navigation |

## Technical Implementation

### 1. Create Logout Page Component
**File:** `src/pages/Logout.tsx`

```typescript
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Loader2 } from "lucide-react";

export default function Logout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      // 1. Sign out from Supabase
      await signOut();
      
      // 2. Clear React Query cache
      const queryClient = (window as any).queryClient;
      if (queryClient) queryClient.clear();
      
      // 3. Clear persisted localStorage cache
      localStorage.removeItem('vitana-query-cache');
      
      // 4. Redirect to Maxina portal
      navigate('/maxina', { replace: true });
    };
    
    performLogout();
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Signing out...</p>
      </div>
    </div>
  );
}
```

### 2. Register Route in App.tsx
Add as a public route (no auth guard):

```typescript
<Route path="/logout" element={<Logout />} />
```

## Logout Flow Sequence

```text
Appilix Drawer → /logout → signOut() → Clear Cache → /maxina
```

## State Clearing Checklist
| Item | Method |
|------|--------|
| Supabase session | `signOut()` from AuthProvider |
| React Query cache | `queryClient.clear()` |
| Persisted cache | `localStorage.removeItem('vitana-query-cache')` |
| Toast notifications | Handled automatically by `onAuthStateChange` |

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Logout.tsx` | Create - logout page component |
| `src/App.tsx` | Modify - add route registration |

## Appilix Integration
The mobile app drawer can simply navigate to:
```
https://vitanaland.com/logout
```

No JavaScript bridge or native code changes required.

