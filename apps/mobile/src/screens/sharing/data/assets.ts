/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the writes behind the Distribution
 * "Create asset" sheets and the data-consent "Create package" sheet: native twins of the web hooks
 * `useTemplates.createTemplate`, `useAutomationRules.createRule` and `useBusinessPackages.createPackage`
 * (class B: they import the web Supabase client, so they are re-implemented here on the app's own
 * client — same tables, columns and success toasts; a failed write raises the generic error toast).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { notify, notifyError } from '../../../ports/ui';
import { currentUserId } from './hooks';

const sb = () => getSupabase() as any;
const fail = () => notifyError('errors.somethingWentWrong');

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; content: string; category: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await sb().from('templates').insert({ user_id, ...input }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      notify('toasts.hooks.templateSaved');
    },
    onError: fail,
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description: string; trigger_type: string; action_type: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await sb()
        .from('automation_rules')
        .insert({ user_id, ...input, trigger_config: {}, action_config: {}, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['automation_rules'] });
      notify('toasts.hooks.automationRuleCreated');
    },
    onError: fail,
  });
}

export interface PackageItemInput {
  item_type: 'service' | 'event';
  item_title: string;
  item_description?: string;
  item_duration_min?: number;
  item_value_cents?: number;
  quantity: number;
  event_id?: string;
}

export interface PackageInput {
  title: string;
  description?: string;
  price_cents: number;
  original_price_cents?: number;
  validity_days: number;
  status: 'draft' | 'published';
  items: PackageItemInput[];
}

/** `useBusinessPackages.createPackage`: the package for the active tenant, then its items in order. */
export function useCreatePackage(tenantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PackageInput) => {
      const user_id = await currentUserId();
      if (!tenantId) throw new Error('No active tenant');
      const { data: pkg, error } = await sb()
        .from('business_packages')
        .insert({
          creator_id: user_id,
          tenant_id: tenantId,
          title: data.title,
          description: data.description,
          price_cents: data.price_cents,
          currency: 'USD',
          original_price_cents: data.original_price_cents,
          package_type: 'bundle',
          validity_days: data.validity_days,
          status: data.status,
        })
        .select()
        .single();
      if (error) throw error;
      if (data.items.length > 0) {
        const rows = data.items.map((item, index) => ({
          package_id: pkg.id,
          tenant_id: tenantId,
          item_type: item.item_type,
          event_id: item.event_id,
          item_title: item.item_title,
          item_description: item.item_description,
          item_duration_min: item.item_duration_min,
          item_value_cents: item.item_value_cents || 0,
          quantity: item.quantity,
          sort_order: index,
        }));
        const { error: itemsError } = await sb().from('package_items').insert(rows);
        if (itemsError) throw itemsError;
      }
      return pkg;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['business-packages'] });
      notify('toasts.hooks.packageCreated', 'toasts.hooks.yourPackageHasCreatedSuccessfully');
    },
    onError: () => notifyError('toasts.hooks.error'),
  });
}

/** CreatePackageDialog: the member's own events, newest first, for the "Event Access" item picker. */
export async function fetchOwnEvents(userId: string): Promise<Array<{ id: string; title: string }>> {
  const { data } = await sb().from('global_community_events').select('id, title, start_time').eq('created_by', userId).order('start_time', { ascending: false }).limit(50);
  return (data ?? []) as Array<{ id: string; title: string }>;
}
