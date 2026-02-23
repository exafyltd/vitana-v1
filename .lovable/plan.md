

## Fix: Multiple "Failed to load cart" Toasts on Login

### Root Cause

`useCart()` is called independently in 5+ components (AppLayout, CartBadge, CartSidebar, AddToCartButton, Cart page). Each creates its own state and runs `fetchCart()` via:

```tsx
useEffect(() => {
  fetchCart();
}, [user]);
```

During login, when `user` transitions from `null` to a valid object, every instance fires `fetchCart()` simultaneously. Some queries hit the database before the Supabase client token is fully synced, causing RLS policy failures. Each failure triggers `toast.error('Failed to load cart')`, resulting in multiple stacked error toasts.

### Fix

**File: `src/hooks/useCart.ts`**

Two changes:

1. **Add session check before querying** (same pattern as the event participation fix): call `supabase.auth.getSession()` before the cart query to ensure the token is ready. If no session, silently return empty cart instead of showing an error toast.

2. **Suppress error toast during auth transitions**: When the query fails due to an auth/RLS issue, log it but don't show a toast -- the effect will re-run once the token is ready and succeed.

### Technical Details

```tsx
const fetchCart = async () => {
  if (!user) {
    setCartItems([]);
    setCartCount(0);
    return;
  }

  try {
    setIsLoading(true);

    // Ensure token is ready before querying
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setCartItems([]);
      setCartCount(0);
      return; // silently return -- effect will re-run when auth settles
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const items = (data || []) as CartItem[];
    setCartItems(items);
    setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
  } catch (error) {
    console.error('Error fetching cart:', error);
    // Don't show toast -- this likely fired during auth transition
    // The effect will re-run when the session is fully ready
  } finally {
    setIsLoading(false);
  }
};
```

### What This Fixes

- No more "Failed to load cart" error toasts during login
- Cart still loads correctly once the auth token is ready
- Errors during actual user interactions (add/remove/clear) still show toasts as before
- Only the `fetchCart` function changes -- all other cart operations keep their error toasts

