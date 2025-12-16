import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "@/components/ui/use-toast";
import type { Json } from "@/integrations/supabase/types";

export type PackageType = 'bundle' | 'subscription' | 'program';
export type PackageStatus = 'draft' | 'published' | 'archived';
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
      toast({
        title: "Package created",
        description: "Your package has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create package",
        variant: "destructive",
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (updateData: Partial<Omit<BusinessPackage, 'items'>> & { id: string }) => {
      const { id, ...data } = updateData;
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
      toast({
        title: "Package updated",
        description: "Your package has been updated successfully.",
      });
    },
  });

  // Full update including items (delete old + insert new)
  const updatePackageWithItemsMutation = useMutation({
    mutationFn: async (updateData: Partial<Omit<BusinessPackage, 'items'>> & { id: string; items?: PackageItem[] }) => {
      const { id, items, ...data } = updateData;
      
      // Update package
      const { data: pkg, error: pkgError } = await supabase
        .from('business_packages')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (pkgError) throw pkgError;

      // If items provided, replace all items
      if (items && activeTenantId) {
        // Delete existing items
        await supabase
          .from('package_items')
          .delete()
          .eq('package_id', id);

        // Insert new items
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            package_id: id,
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
      }

      return pkg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-packages'] });
      toast({
        title: "Package updated",
        description: "Your package and items have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update package",
        variant: "destructive",
      });
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
      toast({
        title: "Package deleted",
        description: "Your package has been deleted.",
      });
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
