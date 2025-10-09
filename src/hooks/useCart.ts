import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  user_id: string;
  item_type: 'lab_test' | 'wellness_service' | 'provider_session' | 'product' | 'deal';
  item_id: string;
  item_name: string;
  item_price: number;
  item_image_url?: string;
  item_metadata?: Record<string, any>;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export function useCart() {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart items
  const fetchCart = async () => {
    if (!user) {
      setCartItems([]);
      setCartCount(0);
      return;
    }

    try {
      setIsLoading(true);
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
      toast.error('Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (item: {
    item_type: CartItem['item_type'];
    item_id: string;
    item_name: string;
    item_price: number;
    item_image_url?: string;
    item_metadata?: Record<string, any>;
    quantity?: number;
  }) => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    try {
      // Check if item already exists in cart
      const existingItem = cartItems.find(
        (cartItem) => cartItem.item_id === item.item_id && cartItem.item_type === item.item_type
      );

      if (existingItem) {
        // Update quantity
        await updateQuantity(existingItem.id, existingItem.quantity + (item.quantity || 1));
      } else {
        // Extract external product info from metadata
        const externalProductId = item.item_metadata?.external_product_id;
        const externalSource = item.item_metadata?.external_source;

        // Add new item
        const { error } = await supabase.from('cart_items').insert({
          user_id: user.id,
          item_type: item.item_type,
          item_id: item.item_id,
          item_name: item.item_name,
          item_price: item.item_price,
          item_image_url: item.item_image_url,
          item_metadata: item.item_metadata || {},
          quantity: item.quantity || 1,
          external_product_id: externalProductId,
          external_source: externalSource,
        });

        if (error) throw error;
        
        toast.success('Added to cart');
        await fetchCart();
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  // Update item quantity
  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeFromCart(cartItemId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;
      
      await fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  // Remove item from cart
  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;
      
      toast.success('Removed from cart');
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove from cart');
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setCartItems([]);
      setCartCount(0);
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  // Calculate cart total
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.item_price * item.quantity,
    0
  );

  // Checkout
  const checkout = async () => {
    if (!user) {
      toast.error('Please sign in to checkout');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout-session');

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a centered popup window
        const width = 600;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        const features = `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`;
        window.open(data.url, 'stripe-checkout', features);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error('Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  // Load cart on mount and when user changes
  useEffect(() => {
    fetchCart();
  }, [user]);

  // Set up real-time subscription for cart updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('cart_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCart();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    cartItems,
    cartCount,
    cartTotal,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    refreshCart: fetchCart,
  };
}
