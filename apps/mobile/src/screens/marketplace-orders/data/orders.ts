/**
 * VTID-05511 — the orders data, twins of the web reads `Orders.tsx` makes
 * (`supabase.from('cj_orders')` :186-202), `useMyTickets`
 * (`src/hooks/useEventTickets.ts:86-126`) and `useMyVouchers`
 * (`src/hooks/useVouchers.ts:79-97`), the voucher PDF / e-mail Edge Functions
 * (`useDownloadVoucherPdf`, `useSendVoucherEmail`) and the pure order
 * assembly of `Orders.tsx` (:205-372): ticket / CJ order / voucher → unified
 * order, active vs history split, newest first, and the mobile order shape
 * `MobileOrdersView` renders. Queries unchanged from the web.
 *
 * The web shows three sample tickets while the member has none
 * (`mockTickets`, :78-178, `isShowingMockData` :181-182 — always on phones);
 * MOCK_TICKETS is that list, its visible words through the catalog.
 */
import { useQuery } from '@tanstack/react-query';
import { notifyError } from '../../../ports/ui';
import { formatDate, isPast } from '../format';
import { db } from './client';

export interface TicketPurchase {
  id: string;
  event_id: string;
  ticket_type_id: string;
  buyer_id: string | null;
  buyer_email: string;
  buyer_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: string;
  qr_code_token: string;
  ticket_number: string;
  checked_in_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
  ticket_type?: { id: string; name: string; description?: string | null; [k: string]: unknown } | null;
  event?: { id: string; title: string; start_time: string; location: string | null; image_url: string | null } | null;
}

export interface CjOrder {
  id: string;
  status: string;
  total_amount: number;
  tracking_number?: string | null;
  created_at: string;
  order_items?: Array<{ item_name?: string; item_image_url?: string }>;
}

export interface VoucherOrder {
  id: string;
  tier: string;
  status: string;
  amount_cents: number;
  created_at: string;
  voucher_code?: string | null;
  [k: string]: unknown;
}

export type OrderType = 'ticket' | 'voucher' | 'product' | 'service';

/** `UnifiedMobileOrder` (MobileOrdersView.tsx:28-47). */
export interface UnifiedMobileOrder {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  price: string;
  status: string;
  statusLabel: string;
  type: OrderType;
  orderDate: string;
  rawDate: Date;
  eventDate?: Date;
  eventLocation?: string;
  ticketNumber?: string;
  quantity?: number;
  qrCodeToken?: string;
  ticketPurchase?: TicketPurchase;
  voucherOrder?: VoucherOrder;
  orderId?: string;
}

const K = 'discoverCommerceNative.marketplaceOrders.orders';

// ── reads ───────────────────────────────────────────────────────────────
/** `fetchCjOrders` — every row the member's RLS shows, newest first. A failure is logged only (the web console.error). */
export async function fetchCjOrders(): Promise<CjOrder[]> {
  const { data, error } = await db().from('cj_orders').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as CjOrder[];
}

/** `useMyTickets().fetchMyTickets` — completed purchases with the ticket type and the event. */
export async function fetchMyTickets(userId: string | null): Promise<TicketPurchase[]> {
  if (!userId) return [];
  const { data, error } = await db()
    .from('event_ticket_purchases')
    .select(
      `
        *,
        ticket_type:event_ticket_types(*),
        event:global_community_events(id, title, start_time, location, image_url)
      `,
    )
    .eq('buyer_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });
  if (error) {
    notifyError('toasts.hooks.error', 'toasts.hooks.failedLoadYourTickets');
    return [];
  }
  return (data ?? []) as TicketPurchase[];
}

/** `useMyVouchers` — the member's voucher orders, newest first. */
export async function fetchMyVouchers(userId: string | null): Promise<VoucherOrder[]> {
  if (!userId) return [];
  const { data, error } = await db().from('voucher_orders').select('*').eq('buyer_user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VoucherOrder[];
}

export function useCjOrders(userId: string | null) {
  return useQuery({ queryKey: ['cj-orders', userId], queryFn: fetchCjOrders, enabled: !!userId });
}

export function useMyTickets(userId: string | null) {
  return useQuery({ queryKey: ['my-tickets', userId], queryFn: () => fetchMyTickets(userId) });
}

export function useMyVouchers(userId: string | null) {
  return useQuery({ queryKey: ['my-vouchers', userId], queryFn: () => fetchMyVouchers(userId), enabled: !!userId });
}

export interface VoucherPdf {
  success: boolean;
  voucher: { code: string };
  signedPdfUrl: string;
}

/** `useDownloadVoucherPdf` — `voucher-download-pdf` with `{ orderId }`. */
export async function downloadVoucherPdf(orderId: string): Promise<VoucherPdf> {
  const { data, error } = await db().functions.invoke('voucher-download-pdf', { body: { orderId } });
  if (error) throw error;
  return data as VoucherPdf;
}

/** `useSendVoucherEmail` — `voucher-send-email`. */
export async function sendVoucherEmail(input: { orderId: string; recipientEmail: string; recipientName?: string; message?: string }): Promise<unknown> {
  const { data, error } = await db().functions.invoke('voucher-send-email', { body: input });
  if (error) throw error;
  return data;
}

// ── the sample tickets (Orders.tsx:78-178) ────────────────────────────────
export function mockTickets(userId: string | null, t: (k: string) => string, now: Date = new Date()): TicketPurchase[] {
  const base = (n: number, over: Partial<TicketPurchase>): TicketPurchase => ({
    id: `mock-${n}`,
    event_id: `evt-${n}`,
    ticket_type_id: `tt-${n}`,
    buyer_id: userId,
    buyer_email: 'user@example.com',
    buyer_name: 'Sarah Johnson',
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    currency: 'usd',
    status: 'completed',
    qr_code_token: '',
    ticket_number: '',
    checked_in_at: null,
    created_at: now.toISOString(),
    metadata: {},
    ...over,
  });
  return [
    base(1, {
      quantity: 2,
      unit_price: 75,
      total_amount: 150,
      qr_code_token: 'MOCK-QR-TOKEN-001',
      ticket_number: 'VTN-20250115-000042',
      ticket_type: { id: 'tt-1', name: t(`${K}.mock.vipAccess`) },
      event: { id: 'evt-1', title: t(`${K}.mock.summitTitle`), start_time: '2025-01-15T18:00:00Z', location: 'The Grand Wellness Center, San Francisco, CA', image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800' },
    }),
    base(2, {
      unit_price: 25,
      total_amount: 25,
      qr_code_token: 'MOCK-QR-TOKEN-002',
      ticket_number: 'VTN-20250120-000108',
      ticket_type: { id: 'tt-2', name: t(`${K}.mock.generalAdmission`) },
      event: { id: 'evt-2', title: t(`${K}.mock.yogaTitle`), start_time: '2025-01-20T07:00:00Z', location: 'Zen Garden Studio, Oakland, CA', image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800' },
    }),
    base(3, {
      unit_price: 45,
      total_amount: 45,
      qr_code_token: 'MOCK-QR-TOKEN-003',
      ticket_number: 'VTN-20241201-000015',
      checked_in_at: '2024-12-01T09:15:00Z',
      created_at: '2024-11-15T10:00:00Z',
      ticket_type: { id: 'tt-3', name: t(`${K}.mock.earlyBird`) },
      event: { id: 'evt-3', title: t(`${K}.mock.retreatTitle`), start_time: '2024-12-01T09:00:00Z', location: 'Mountain Lodge Retreat Center, Lake Tahoe', image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800' },
    }),
  ];
}

// ── assembly (Orders.tsx:205-372) ────────────────────────────────────────
type Unified = Omit<UnifiedMobileOrder, 'statusLabel' | 'subtitle' | 'imageUrl'> & { provider: string; providerImage: string };

/** The web placeholder images (`/placeholder.svg`, the CJ / voucher logo) are web-relative assets: no image natively, the type tile shows. */
export const PLACEHOLDER = '/placeholder.svg';
const CJ_LOGO = '/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png';

const STATUS_KEYS = ['upcoming', 'attended', 'expired', 'completed', 'delivered', 'cancelled', 'refunded', 'shipped', 'confirmed', 'pending', 'processing', 'paid', 'active'] as const;

/** `getStatusLabel` (Orders.tsx:310-328): the known statuses from the catalog, anything else capitalised. */
export function statusLabel(status: string, t: (k: string) => string): string {
  if ((STATUS_KEYS as readonly string[]).includes(status)) return t(`${K}.status.${status}`);
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export type BuildInput = {
  cjOrders: CjOrder[];
  tickets: TicketPurchase[];
  vouchers: VoucherOrder[];
  t: (k: string, p?: Record<string, string | number>) => string;
  locale: string;
  now?: Date;
};

export function buildOrders({ cjOrders, tickets, vouchers, t, locale, now = new Date() }: BuildInput): { active: UnifiedMobileOrder[]; history: UnifiedMobileOrder[] } {
  const orderDate = (iso: string) => formatDate(new Date(iso), 'MMM d, yyyy', locale);

  const fromTicket = (ticket: TicketPurchase): Unified => {
    const eventDate = ticket.event ? new Date(ticket.event.start_time) : new Date(now);
    const isUpcoming = !!ticket.event && !isPast(eventDate, now);
    let status = 'upcoming';
    if (!isUpcoming) status = ticket.checked_in_at ? 'attended' : 'expired';
    if (ticket.status === 'refunded') status = 'refunded';
    if (ticket.status === 'cancelled') status = 'cancelled';
    return {
      id: ticket.id,
      title: ticket.event?.title || t(`${K}.eventTicket`),
      provider: ticket.ticket_type?.name || t(`${K}.mock.generalAdmission`),
      providerImage: ticket.event?.image_url || PLACEHOLDER,
      price: `$${ticket.total_amount}`,
      status,
      type: 'ticket',
      orderDate: orderDate(ticket.created_at),
      rawDate: new Date(ticket.created_at),
      eventDate,
      eventLocation: ticket.event?.location || t(`${K}.locationTbd`),
      ticketNumber: ticket.ticket_number,
      quantity: ticket.quantity,
      qrCodeToken: ticket.qr_code_token,
      ticketPurchase: ticket,
    };
  };

  const fromCj = (order: CjOrder): Unified => ({
    id: order.id,
    title: order.order_items?.[0]?.item_name || t(`${K}.cjProduct`),
    provider: 'CJDropshipping',
    providerImage: order.order_items?.[0]?.item_image_url || CJ_LOGO,
    price: `$${order.total_amount}`,
    status: order.status,
    type: 'product',
    orderDate: orderDate(order.created_at),
    rawDate: new Date(order.created_at),
  });

  const fromVoucher = (order: VoucherOrder): Unified => {
    const tier = ['test', 'experience', 'exclusive'].includes(order.tier) ? order.tier : 'gift';
    return {
      id: order.id,
      title: `Maxina ${t(`${K}.voucherTier.${tier}`)}`,
      provider: t(`${K}.voucherProvider`),
      providerImage: CJ_LOGO,
      price: `€${(order.amount_cents / 100).toFixed(2)}`,
      status: order.status,
      type: 'voucher',
      orderDate: orderDate(order.created_at),
      rawDate: new Date(order.created_at),
      voucherOrder: order,
    };
  };

  const done = ['delivered', 'cancelled'];
  const activeCj = cjOrders.filter((o) => !done.includes(o.status)).map(fromCj);
  const completedCj = cjOrders.filter((o) => done.includes(o.status)).map(fromCj);
  const upcomingTickets = tickets.filter((x) => x.event && !isPast(new Date(x.event.start_time), now)).map(fromTicket);
  const pastTickets = tickets.filter((x) => x.event && isPast(new Date(x.event.start_time), now)).map(fromTicket);
  const activeVouchers = vouchers.filter((v) => v.status === 'paid').map(fromVoucher);
  const completedVouchers = vouchers.filter((v) => ['completed', 'redeemed', 'expired', 'cancelled'].includes(v.status)).map(fromVoucher);

  const newestFirst = (a: Unified, b: Unified) => b.rawDate.getTime() - a.rawDate.getTime();
  const toMobile = (o: Unified): UnifiedMobileOrder => {
    const { provider, providerImage, ...rest } = o;
    return { ...rest, subtitle: provider, imageUrl: providerImage, statusLabel: statusLabel(o.status, t), orderId: o.id };
  };
  return {
    active: [...activeCj, ...upcomingTickets, ...activeVouchers].sort(newestFirst).map(toMobile),
    history: [...completedCj, ...pastTickets, ...completedVouchers].sort(newestFirst).map(toMobile),
  };
}

/** MobileOrdersView search (:89-107): title, subtitle or ticket number contains the query. */
export function filterOrders(orders: UnifiedMobileOrder[], query: string): UnifiedMobileOrder[] {
  if (!query) return orders;
  const q = query.toLowerCase();
  return orders.filter((o) => o.title.toLowerCase().includes(q) || o.subtitle.toLowerCase().includes(q) || !!o.ticketNumber?.toLowerCase().includes(q));
}

/** `getStatusBadgeVariant` (MobileOrdersView.tsx:110-129, MobileOrderDetailSheet.tsx:52-71). */
export function statusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    upcoming: 'default',
    active: 'default',
    paid: 'default',
    confirmed: 'default',
    shipped: 'default',
    attended: 'secondary',
    completed: 'secondary',
    delivered: 'secondary',
    redeemed: 'secondary',
    expired: 'outline',
    pending: 'outline',
    processing: 'outline',
    cancelled: 'destructive',
    refunded: 'destructive',
  };
  return variants[status] || 'outline';
}

/** The order's image is a real picture (not a web placeholder asset). */
export function hasImage(url: string | undefined): url is string {
  return !!url && /^https?:\/\//.test(url);
}
