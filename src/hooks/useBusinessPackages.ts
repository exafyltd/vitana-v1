import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "@/components/ui/use-toast";
import type { Json } from "@/integrations/supabase/types";
import { notify, notifyError } from '@/lib/i18n-toast';

export type PackageType = 'bundle' | 'subscription' | 'program';
export type PackageStatus = 'draft' | 'published' | 'archived';
// V1: Only service and event are supported
export type PackageItemType = 'service' | 'group_session' | 'event' | 'course' | 'digital' | 'resource';
export type BillingInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface PackageItem {
  id?: string;
  item_type: PackageItemType;
  service_key?: string; // References profile.services[key]
  event_id?: string;
  item_title?: string;
  item_description?: string;
  item_duration_min?: number;
  item_value_cents?: number; // INTEGER cents
  quantity: number;
  sort_order?: number;
}

export interface BusinessPackage {
  id: string;
  creator_id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  price_cents: number; // INTEGER cents
  currency: string;
  original_price_cents?: number | null; // INTEGER cents
  package_type: PackageType;
  billing_interval?: BillingInterval | null;
  duration_weeks?: number | null;
  start_date?: string | null;
  validity_days?: number | null;
  status: PackageStatus;
  metadata?: Json | null;
  created_at: string;
  updated_at: string;
  items?: PackageItem[];
}

export interface CreatePackageData {
  title: string;
  description?: string;
  image_url?: string;
  price_cents: number; // INTEGER cents
  currency?: string;
  original_price_cents?: number; // INTEGER cents
  package_type: PackageType;
  billing_interval?: BillingInterval;
  duration_weeks?: number;
  start_date?: string;
  validity_days?: number;
  status?: PackageStatus;
  items: PackageItem[];
}

// Helper to format cents to currency string
export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

// Helper to convert dollars to cents
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function useBusinessPackages() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();

  const packagesQuery = useQuery({
    queryKey: ['business-packages', user?.id, activeTenantId],
    queryFn: async () => {
      if (!user?.id || !activeTenantId) return [];
      
      const { data, error } = await supabase
        .from('business_packages')
        .select(`
          *,
          items:package_items(*)
        `)
        .eq('creator_id', user.id)
        .eq('tenant_id', activeTenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BusinessPackage[];
    },
    enabled: !!user?.id && !!activeTenantId,
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: CreatePackageData) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!activeTenantId) throw new Error('No active tenant');

      // Create package with tenant_id
      const { data: pkg, error: pkgError } = await supabase
        .from('business_packages')
        .insert({
          creator_id: user.id,
          tenant_id: activeTenantId,
          title: data.title,
          description: data.description,
          image_url: data.image_url,
          price_cents: data.price_cents,
          currency: data.currency || 'USD',
          original_price_cents: data.original_price_cents,
          package_type: data.package_type,
          billing_interval: data.billing_interval,
          duration_weeks: data.duration_weeks,
          start_date: data.start_date,
          validity_days: data.validity_days || 180,
          status: data.status || 'draft',
        })
        .select()
        .single();

      if (pkgError) throw pkgError;

      // Create items with tenant_id
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item, index) => ({
          package_id: pkg.id,
          tenant_id: activeTenantId,
          item_type: item.item_type,
          service_key: item.service_key,
          event_id: item.event_id,
          item_title: item.item_title,
          item_description: item.item_description,
          item_duration_min: item.item_duration_min,
          item_value_cents: item.item_value_cents || 0,
          quantity: item.quantity,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('package_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return pkg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-packages'] });
      notify('toasts.hooks.packageCreated', 'toasts.hooks.yourPackageHasCreatedSuccessfully');
    },
    onError: (error) => {
      notifyError('toasts.hooks.error');
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (updateData: Partial<BusinessPackage> & { id: string }) => {
      const { id, items, ...data } = updateData;
      // Exclude items from update - they're managed separately
      const { data: pkg, error } = await supabase
        .from('business_packages')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return pkg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-packages'] });
      notify('toasts.hooks.packageUpdated', 'toasts.hooks.yourPackageHasUpdatedSuccessfully');
    },
  });

  // Atomic update using RPC function
  const updatePackageWithItemsMutation = useMutation({
    mutationFn: async (updateData: Partial<BusinessPackage> & { id: string; items?: PackageItem[] }) => {
      if (!activeTenantId) throw new Error('No active tenant');
      
      const { id, items, ...data } = updateData;
      
      // Call the RPC function for atomic update
      const { data: result, error } = await supabase.rpc('update_package_with_items', {
        p_package_id: id,
        p_tenant_id: activeTenantId,
        p_title: data.title || '',
        p_description: data.description || null,
        p_image_url: data.image_url || null,
        p_price_cents: data.price_cents || 0,
        p_original_price_cents: data.original_price_cents || null,
        p_package_type: data.package_type || 'bundle',
        p_billing_interval: data.billing_interval || null,
        p_duration_weeks: data.duration_weeks || null,
        p_validity_days: data.validity_days || 180,
        p_status: data.status || 'draft',
        p_items: items ? JSON.stringify(items.map((item, index) => ({
          item_type: item.item_type,
          service_key: item.service_key || null,
          event_id: item.event_id || null,
          item_title: item.item_title || null,
          item_description: item.item_description || null,
          item_duration_min: item.item_duration_min || null,
          item_value_cents: item.item_value_cents || 0,
          quantity: item.quantity || 1,
        }))) : '[]',
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-packages'] });
      notify('toasts.hooks.packageUpdated', 'toasts.hooks.yourPackageItemsHaveUpdatedSuccessfully');
    },
    onError: (error) => {
      notifyError('toasts.hooks.error');
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-packages'] });
      notify('toasts.hooks.packageDeleted', 'toasts.hooks.yourPackageHasDeleted');
    },
  });

  return {
    packages: packagesQuery.data || [],
    isLoading: packagesQuery.isLoading,
    error: packagesQuery.error,
    createPackage: createPackageMutation.mutate,
    updatePackage: updatePackageMutation.mutate,
    updatePackageWithItems: updatePackageWithItemsMutation.mutate,
    deletePackage: deletePackageMutation.mutate,
    isCreating: createPackageMutation.isPending,
    isUpdating: updatePackageWithItemsMutation.isPending,
  };
}