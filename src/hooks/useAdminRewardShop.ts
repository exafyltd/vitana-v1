/**
 * VTID-05036 — Admin › Rewards Shop data. Every call goes to the gateway's
 * exafy_admin endpoints (routes/rewards-shop.ts, VTID-04982 + VTID-05035);
 * this app never writes the shop tables itself. A 403 means the signed-in
 * admin is not an exafy_admin, and the page shows that instead of a form.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communityFetch } from '@/lib/community-gateway';
import type { RewardOrderStatus, ShopCurrency, ShopFulfilment } from '@/hooks/useRewardShop';

export interface AdminRewardItem {
  id: string;
  slug: string;
  titles: Record<string, string>;
  descriptions: Record<string, string>;
  images: string[];
  vtna_price: number;
  fulfilment: ShopFulfilment;
  age_restricted: boolean;
  min_age: number | null;
  ships_to_countries: string[];
  stock: number | null;
  reserved: number;
  is_active: boolean;
  sort_order: number;
}

/** Exactly the fields PUT /admin/rewards/items reads — nothing else is sent. */
export interface AdminRewardItemBody {
  slug: string;
  titles: Record<string, string>;
  descriptions: Record<string, string>;
  images: string[];
  vtna_price: number;
  fulfilment: ShopFulfilment;
  age_restricted: boolean;
  min_age: number | null;
  ships_to_countries: string[];
  stock: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface AdminShippingFee {
  country: string;
  currency: ShopCurrency;
  fee_cents: number;
  updated_at?: string | null;
}

export interface AdminRewardOrderAddress {
  name?: string;
  line1?: string;
  line2?: string;
  postal_code?: string;
  city?: string;
  region?: string;
}

export interface AdminRewardOrder {
  id: string;
  item_id: string;
  vtna_amount: number;
  fulfilment: ShopFulfilment;
  status: RewardOrderStatus;
  country: string | null;
  shipping_fee_cents: number | null;
  shipping_currency: ShopCurrency | null;
  age_confirmed_at: string | null;
  reservation_expires_at: string | null;
  paid_at: string | null;
  status_reason: string | null;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  tenant_id: string | null;
  shipping_address: AdminRewardOrderAddress | null;
}

export type AdminOrderStatus = 'fulfilling' | 'shipped' | 'delivered';

export interface ItemImageUpload {
  content_type: string;
  data_base64: string;
}

/** A gateway answer that was not `{ ok: true }`: HTTP status, error code and the server's message. */
export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly serverMessage: string | null;
  constructor(status: number, code: string, serverMessage: string | null) {
    super(code);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
  }
}

export function isForbidden(err: unknown): boolean {
  return err instanceof AdminApiError && (err.status === 403 || err.code === 'FORBIDDEN');
}

const BASE = '/api/v1/admin/rewards';

async function adminCall<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await communityFetch(`${BASE}${path}`, init);
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.ok) {
    throw new AdminApiError(
      resp.status,
      String(json?.error || `HTTP_${resp.status}`),
      typeof json?.message === 'string' && json.message ? json.message : null,
    );
  }
  return json as T;
}

export const adminRewardKeys = {
  all: ['admin', 'rewards'] as const,
  items: ['admin', 'rewards', 'items'] as const,
  fees: ['admin', 'rewards', 'shipping-fees'] as const,
  orders: (status: string | null) => ['admin', 'rewards', 'orders', status ?? 'all'] as const,
};

export async function fetchAdminRewardItems(): Promise<AdminRewardItem[]> {
  const json = await adminCall<{ items?: AdminRewardItem[] }>('/items');
  return json.items ?? [];
}

export async function fetchAdminShippingFees(): Promise<AdminShippingFee[]> {
  const json = await adminCall<{ fees?: AdminShippingFee[] }>('/shipping-fees');
  return json.fees ?? [];
}

export async function fetchAdminRewardOrders(status: string | null): Promise<AdminRewardOrder[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const json = await adminCall<{ orders?: AdminRewardOrder[] }>(`/orders${q}`);
  return json.orders ?? [];
}

export async function saveAdminRewardItem(body: AdminRewardItemBody): Promise<AdminRewardItem> {
  const json = await adminCall<{ item: AdminRewardItem }>('/items', { method: 'PUT', body: JSON.stringify(body) });
  return json.item;
}

export async function uploadRewardItemImage(upload: ItemImageUpload): Promise<{ url: string; path: string }> {
  return adminCall<{ url: string; path: string }>('/items/image', {
    method: 'POST',
    body: JSON.stringify({ content_type: upload.content_type, data_base64: upload.data_base64 }),
  });
}

export async function saveAdminShippingFee(fee: { country: string; currency: ShopCurrency; fee_cents: number }): Promise<void> {
  await adminCall('/shipping-fees', {
    method: 'PUT',
    body: JSON.stringify({ country: fee.country, currency: fee.currency, fee_cents: fee.fee_cents }),
  });
}

export async function deleteAdminShippingFee(country: string, currency: ShopCurrency): Promise<void> {
  await adminCall(`/shipping-fees/${encodeURIComponent(country)}/${encodeURIComponent(currency)}`, { method: 'DELETE' });
}

export async function setAdminRewardOrderStatus(id: string, status: AdminOrderStatus, reason?: string): Promise<void> {
  const trimmed = reason?.trim();
  await adminCall(`/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(trimmed ? { status, reason: trimmed } : { status }),
  });
}

/** A 403 will not turn into a 200 by asking again. */
function retryUnlessForbidden(count: number, err: unknown): boolean {
  return !isForbidden(err) && count < 2;
}

export function useAdminRewardItems() {
  return useQuery({ queryKey: adminRewardKeys.items, queryFn: fetchAdminRewardItems, retry: retryUnlessForbidden });
}

export function useAdminShippingFees() {
  return useQuery({ queryKey: adminRewardKeys.fees, queryFn: fetchAdminShippingFees, retry: retryUnlessForbidden });
}

export function useAdminRewardOrders(status: string | null) {
  return useQuery({
    queryKey: adminRewardKeys.orders(status),
    queryFn: () => fetchAdminRewardOrders(status),
    retry: retryUnlessForbidden,
  });
}

export function useSaveAdminRewardItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveAdminRewardItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminRewardKeys.items }),
  });
}

export function useUploadRewardItemImage() {
  return useMutation({ mutationFn: uploadRewardItemImage });
}

export function useSaveAdminShippingFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveAdminShippingFee,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminRewardKeys.fees }),
  });
}

export function useDeleteAdminShippingFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fee: { country: string; currency: ShopCurrency }) => deleteAdminShippingFee(fee.country, fee.currency),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminRewardKeys.fees }),
  });
}

export function useSetAdminRewardOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: AdminOrderStatus; reason?: string }) => setAdminRewardOrderStatus(v.id, v.status, v.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'rewards', 'orders'] }),
  });
}
