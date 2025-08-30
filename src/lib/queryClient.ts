import { QueryClient } from '@tanstack/react-query';

// Create a new QueryClient instance with tenant-aware cache
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
      },
    },
  });
};

// Helper function to create tenant-scoped query keys
export const createTenantQueryKey = (activeTenantId: string | null, baseKey: string[]) => {
  return activeTenantId ? ['tenant', activeTenantId, ...baseKey] : ['no-tenant', ...baseKey];
};