import { TenantType } from "@/hooks/useTenant";

type Environment = "dev" | "staging" | "prod";

function getEnvironment(): Environment {
  const hostname = window.location.hostname;
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    return "dev";
  }
  if (hostname.includes("staging") || hostname.includes("preview")) {
    return "staging";
  }
  return "prod";
}

function createNamespacedKey(tenant: string, module: string, key: string): string {
  const env = getEnvironment();
  return `vitana::${tenant}::${env}::${module}::${key}`;
}

export function getLocalStorageItem(
  tenant: TenantType | "global" | string,
  module: string, 
  key: string,
  defaultValue?: string
): string | null {
  try {
    const namespacedKey = createNamespacedKey(tenant as any, module, key);
    return localStorage.getItem(namespacedKey) || defaultValue || null;
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return defaultValue || null;
  }
}

export function setLocalStorageItem(
  tenant: TenantType | "global" | string,
  module: string,
  key: string, 
  value: string
): void {
  try {
    const namespacedKey = createNamespacedKey(tenant as any, module, key);
    localStorage.setItem(namespacedKey, value);
  } catch (error) {
    console.error("Error writing to localStorage:", error);
  }
}

export function removeLocalStorageItem(
  tenant: TenantType,
  module: string,
  key: string
): void {
  try {
    const namespacedKey = createNamespacedKey(tenant, module, key);
    localStorage.removeItem(namespacedKey);
  } catch (error) {
    console.error("Error removing from localStorage:", error);
  }
}

export function clearTenantStorage(tenant: TenantType): void {
  try {
    const env = getEnvironment();
    const prefix = `vitana::${tenant}::${env}::`;
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error("Error clearing tenant storage:", error);
  }
}