import { createContext, useContext, useEffect, useState } from "react";

interface RTLContextValue {
  isRTL: boolean;
  toggleRTL: () => void;
}

const RTLContext = createContext<RTLContextValue | undefined>(undefined);

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const [isRTL, setIsRTL] = useState(false);

  const toggleRTL = () => {
    setIsRTL(!isRTL);
  };

  useEffect(() => {
    // Apply RTL direction to document
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    
    // Add RTL class for additional styling if needed
    if (isRTL) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [isRTL]);

  return (
    <RTLContext.Provider value={{ isRTL, toggleRTL }}>
      {children}
    </RTLContext.Provider>
  );
}

export function useRTL() {
  const context = useContext(RTLContext);
  if (context === undefined) {
    throw new Error("useRTL must be used within an RTLProvider");
  }
  return context;
}