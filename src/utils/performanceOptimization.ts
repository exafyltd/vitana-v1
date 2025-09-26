// Performance optimization utility for wallet operations
export const createOptimisticWalletUpdate = (
  balances: any[],
  setBalances: (updater: (prev: any[]) => any[]) => void,
  currency: string,
  amount: number,
  operation: 'add' | 'subtract' = 'subtract'
) => {
  // Store original balance for rollback
  const originalBalance = balances.find(b => b.currency_type === currency.toUpperCase())?.balance || 0;
  
  // Apply optimistic update
  const newBalance = operation === 'add' 
    ? originalBalance + amount 
    : Math.max(0, originalBalance - amount);
    
  setBalances(prev => prev.map(b => 
    b.currency_type === currency.toUpperCase() 
      ? { ...b, balance: newBalance }
      : b
  ));
  
  // Return rollback function
  return {
    originalBalance,
    rollback: () => {
      setBalances(prev => prev.map(b => 
        b.currency_type === currency.toUpperCase() 
          ? { ...b, balance: originalBalance }
          : b
      ));
    }
  };
};

// Debounced function for thread updates to prevent excessive calls
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};