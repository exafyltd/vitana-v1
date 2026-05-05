import { useState, useEffect } from 'react';
import { notifyError, notifySuccess } from '@/lib/i18n-toast';

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

const CART_STORAGE_KEY = 'lovable_local_cart';

export function useLocalCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        const items = JSON.parse(stored) as CartItem[];
        setCartItems(items);
        setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  const saveCart = (items: CartItem[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    setCartItems(items);
    setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
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
    try {
      setIsLoading(true);
      
      // Check if item already exists in cart
      const existingItem = cartItems.find(
        (cartItem) => cartItem.item_id === item.item_id && cartItem.item_type === item.item_type
      );

      let updatedItems: CartItem[];

      if (existingItem) {
        // Update quantity
        updatedItems = cartItems.map(cartItem =>
          cartItem.id === existingItem.id
            ? { ...cartItem, quantity: cartItem.quantity + (item.quantity || 1), updated_at: new Date().toISOString() }
            : cartItem
        );
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `local_${Date.now()}_${Math.random()}`,
          user_id: 'demo_user',
          item_type: item.item_type,
          item_id: item.item_id,
          item_name: item.item_name,
          item_price: item.item_price,
          item_image_url: item.item_image_url,
          item_metadata: item.item_metadata || {},
          quantity: item.quantity || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        updatedItems = [...cartItems, newItem];
      }

      saveCart(updatedItems);
      notifySuccess('toasts.hooks.addedCart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      notifyError('toasts.hooks.failedAddCart');
    } finally {
      setIsLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeFromCart(cartItemId);
      return;
    }

    try {
      const updatedItems = cartItems.map(item =>
        item.id === cartItemId
          ? { ...item, quantity: newQuantity, updated_at: new Date().toISOString() }
          : item
      );
      saveCart(updatedItems);
    } catch (error) {
      console.error('Error updating quantity:', error);
      notifyError('toasts.hooks.failedUpdateQuantity');
    }
  };

  // Remove item from cart
  const removeFromCart = async (cartItemId: string) => {
    try {
      const updatedItems = cartItems.filter(item => item.id !== cartItemId);
      saveCart(updatedItems);
      notifySuccess('toasts.hooks.removedFromCart');
    } catch (error) {
      console.error('Error removing from cart:', error);
      notifyError('toasts.hooks.failedRemoveFromCart');
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      setCartItems([]);
      setCartCount(0);
      notifySuccess('toasts.hooks.cartCleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      notifyError('toasts.hooks.failedClearCart');
    }
  };

  // Calculate cart total
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.item_price * item.quantity,
    0
  );

  // Checkout (mock for presentation)
  const checkout = async () => {
    if (cartItems.length === 0) {
      notifyError('toasts.hooks.yourCartEmpty');
      return;
    }

    try {
      setIsLoading(true);
      // Simulate checkout delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      notifySuccess('toasts.hooks.openingCheckout');
      // For demo, just show a success message
      // In real implementation, this would call Stripe
      // SPA-safe navigation
      window.history.pushState({}, '', '/checkout-success');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      console.error('Error during checkout:', error);
      notifyError('toasts.hooks.failedStartCheckout');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCart = async () => {
    // For local cart, just reload from localStorage
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        const items = JSON.parse(stored) as CartItem[];
        setCartItems(items);
        setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
      } catch (error) {
        console.error('Error refreshing cart:', error);
      }
    }
  };

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
    refreshCart,
  };
}
