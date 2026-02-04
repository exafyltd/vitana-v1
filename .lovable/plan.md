

# Wire Orb to Auth: Multi-Tenant Voice Implementation

## Summary

Implement authenticated, multi-tenant voice sessions by adding JWT authorization to all Orb API calls. The gateway extracts `user_id` and `tenant_id` from the JWT claims - we only pass the access token.

---

## Key Clarification Applied

When user is authenticated but has no `active_tenant_id` in their JWT:

1. **Check localStorage** for stored `tenant_slug` (set by TenantDetector)
2. **Auto-call `switch_to_tenant_by_slug`** to update JWT's `app_metadata.active_tenant_id`
3. **Refresh session** to get updated JWT with tenant context
4. **Then connect to Orb** with the updated token

If no stored tenant and no active tenant → show "Please select a community first" error.

---

## Files to Modify

### 1. `src/lib/OrbVoiceClient.ts`

**Changes:**

- Add `OrbVoiceClientConfig` interface with `lang` and `accessToken`
- Update constructor to accept config object
- Add `getAuthHeaders()` helper method
- Update ALL fetch calls to use auth headers:
  - `start()` - session/start
  - `sendAudio()` - stream/send  
  - `sendTextMessage()` - stream/send
  - `endTurn()` - stream/end-turn
  - `stop()` - session/stop
- Update SSE connection to include token as query parameter
- Add error handling for 401 and 400 TENANT_REQUIRED

### 2. `src/hooks/useOrbVoiceClient.ts`

**Changes:**

- Import `useAuth`, `useTenant`, `useProfile` hooks
- Import Supabase client for fresh token retrieval
- Update `connect()` function to:
  1. Validate user is authenticated
  2. Get fresh access token via `supabase.auth.getSession()`
  3. Check if `activeTenantId` exists
  4. If no tenant, try auto-selecting from localStorage + call `setTenantBySlug`
  5. Create `OrbVoiceClient` with config object
- Add dependency array with auth/tenant state

---

## Implementation Details

### OrbVoiceClient Constructor Change

```typescript
// Before
constructor(lang: string = 'de', callbacks: OrbVoiceClientCallbacks = {})

// After
export interface OrbVoiceClientConfig {
  lang: string;
  accessToken: string;
}

constructor(config: OrbVoiceClientConfig, callbacks: OrbVoiceClientCallbacks = {})
```

### Auth Headers Helper

```typescript
private getAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${this.config.accessToken}`,
  };
}
```

### SSE URL with Token

```typescript
const token = encodeURIComponent(this.config.accessToken);
const sseUrl = `${this.GATEWAY_URL}/api/v1/orb/live/stream?session_id=${this.sessionId}&token=${token}`;
```

### Error Handling

```typescript
if (response.status === 401) {
  throw new Error('Session expired - please sign in again');
}
if (response.status === 400) {
  const errorData = await response.json();
  if (errorData.error === 'TENANT_REQUIRED') {
    throw new Error('Please select a community first');
  }
}
```

### Tenant Auto-Selection in Hook

```typescript
// In connect() when no activeTenantId
if (!activeTenantId) {
  const storedSlug = localStorage.getItem('tenant_slug');
  if (storedSlug) {
    await setTenantBySlug(storedSlug);  // Updates JWT
    // Re-fetch session to get updated token
    const { data: { session: updatedSession } } = await supabase.auth.getSession();
    // Use updatedSession.access_token
  } else {
    setError('Please select a community first');
    return;
  }
}
```

---

## API Contract

| Endpoint | Auth Header | Body |
|----------|-------------|------|
| `POST /session/start` | `Bearer <token>` | `{lang, voice_style, response_modalities}` |
| `GET /stream` (SSE) | Query: `token=<token>` | - |
| `POST /stream/send` | `Bearer <token>` | `{session_id, type, data_b64, mime}` |
| `POST /stream/end-turn` | `Bearer <token>` | `{session_id}` |
| `POST /session/stop` | `Bearer <token>` | `{session_id}` |

**Note:** `user_id` and `tenant_id` are NOT sent in body - gateway extracts from JWT.

---

## Error States

| Condition | Error Message | Resolution |
|-----------|---------------|------------|
| Not signed in | "Please sign in to use voice features" | Redirect to login |
| Token expired | "Session expired - please sign in again" | Re-authenticate |
| No tenant selected | "Please select a community first" | Navigate to tenant portal |
| Gateway 401 mid-session | Disconnect + show error | Re-connect with fresh token |

---

## Testing Checklist

1. Sign in to app
2. Navigate to tenant portal (e.g., `/maxina`)
3. Open Orb overlay
4. Verify network request to `/session/start` includes `Authorization` header
5. Verify SSE URL includes `token` query parameter
6. Test voice conversation works
7. Sign out and verify "Please sign in" error
8. Clear localStorage tenant and verify "Please select a community" error

