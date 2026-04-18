import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { MarketplaceProduct } from '@/hooks/useMarketplace';

interface ProductSelectionContextType {
  selectedProduct: MarketplaceProduct | null;
  selectProduct: (p: MarketplaceProduct | null) => void;
  clearSelection: () => void;
}

const ProductSelectionContext = createContext<ProductSelectionContextType | undefined>(undefined);

export const ProductSelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);

  const selectProduct = useCallback((p: MarketplaceProduct | null) => {
    setSelectedProduct(p);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  return (
    <ProductSelectionContext.Provider value={{ selectedProduct, selectProduct, clearSelection }}>
      {children}
    </ProductSelectionContext.Provider>
  );
};

export const useProductSelection = () => {
  const context = useContext(ProductSelectionContext);
  if (context === undefined) {
    throw new Error('useProductSelection must be used within a ProductSelectionProvider');
  }
  return context;
};
