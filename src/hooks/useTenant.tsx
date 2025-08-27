import { createContext, useContext, useEffect, useState } from "react";

export type TenantType = "maxina" | "earthlings" | "alkalma" | "salama";

interface TenantConfig {
  id: TenantType;
  name: string;
  brandAccent: string;
  brandBg: string;
  brandFg: string;
}

const TENANT_CONFIGS: Record<TenantType, TenantConfig> = {
  maxina: {
    id: "maxina",
    name: "Maxina",
    brandAccent: "#FF7BAC",
    brandBg: "#FFF5F8",
    brandFg: "#1A1A1A",
  },
  earthlings: {
    id: "earthlings", 
    name: "Earthlings",
    brandAccent: "#4ADE80",
    brandBg: "#F0FDF4",
    brandFg: "#1A1A1A",
  },
  alkalma: {
    id: "alkalma",
    name: "AlKalma", 
    brandAccent: "#3B82F6",
    brandBg: "#EFF6FF",
    brandFg: "#1A1A1A",
  },
  salama: {
    id: "salama",
    name: "Salama",
    brandAccent: "#F59E0B",
    brandBg: "#FFFBEB", 
    brandFg: "#1A1A1A",
  },
};

interface TenantContextValue {
  tenant: TenantConfig;
  setTenant: (tenant: TenantType) => void;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<TenantType>("maxina");

  useEffect(() => {
    // Auto-detect tenant from subdomain or URL param
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get("tenant") as TenantType;
    
    if (tenantParam && TENANT_CONFIGS[tenantParam]) {
      setCurrentTenant(tenantParam);
    } else {
      // Could also check subdomain here
      const hostname = window.location.hostname;
      if (hostname.includes("maxina")) setCurrentTenant("maxina");
      else if (hostname.includes("earthlings")) setCurrentTenant("earthlings");
      else if (hostname.includes("alkalma")) setCurrentTenant("alkalma");
      else if (hostname.includes("salama")) setCurrentTenant("salama");
    }
  }, []);

  useEffect(() => {
    // Apply tenant CSS variables to root
    const root = document.documentElement;
    const config = TENANT_CONFIGS[currentTenant];
    
    root.style.setProperty("--brand-accent", config.brandAccent);
    root.style.setProperty("--brand-bg", config.brandBg);
    root.style.setProperty("--brand-fg", config.brandFg);
  }, [currentTenant]);

  const value: TenantContextValue = {
    tenant: TENANT_CONFIGS[currentTenant],
    setTenant: setCurrentTenant,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}