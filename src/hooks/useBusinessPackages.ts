import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import type { Json } from "@/integrations/supabase/types";

export type PackageType = 'bundle' | 'subscription' | 'program';
export type PackageStatus = 'draft' | 'published' | 'archived';
export type PackageItemType = 'service' | 'event' | 'access' | 'digital_asset';
export type BillingInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface PackageItem {
  id?: string;
  item_type: PackageItemType;
  event_id?: string;
  item_title?: string;
  item_description?: string;
  item_duration_min?: number;
  item_value?: number;
  quantity: number;
  access_type?: string;
  access_duration_days?: number;
  sort_order?: number;
}

export interface BusinessPackage {
  id: string;
  creator_id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  currency: string;
  original_price?: number | null;
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
  price: number;
  currency?: string;
  original_price?: number;
  package_type: PackageType;
  billing_interval?: BillingInterval;
  duration_weeks?: number;
  start_date?: string;
  validity_days?: number;
  status?: PackageStatus;
  items: PackageItem[];
}

export function useBusinessPackages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const packagesQuery = useQuery({
    queryKey: ['business-packages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('business_packages')
        .select(`
          *,
          items:package_items(*)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BusinessPackage[];
    },
    enabled: !!user?.id,
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: CreatePackageData) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create package
      const { data: pkg, error: pkgError } = await supabase
        .from('business_packages')
        .insert({
          creator_id: user.id,
          title: data.title,
          description: data.description,
          image_url: data.image_url,
          price: data.price,
          currency: data.currency || 'USD',
          original_price: data.original_price,
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

      // Create items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item, index) => ({
          package_id: pkg.id,
          item_type: item.item_type,
          event_id: item.event_id,
          item_title: item.item_title,
          item_description: item.item_description,
          item_duration_min: item.item_duration_min,
          item_value: item.item_value,
          quantity: item.quantity,
          access_type: item.access_type,
          access_duration_days: item.access_duration_days,
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
    mutationFn: async ({ id, items: _items, ...data }: Partial<BusinessPackage> & { id: string }) => {
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
    deletePackage: deletePackageMutation.mutate,
    isCreating: createPackageMutation.isPending,
  };
}
