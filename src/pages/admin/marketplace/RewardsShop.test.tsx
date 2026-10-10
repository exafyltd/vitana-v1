/**
 * VTID-05036 — Admin › Rewards Shop, end to end over a mocked gateway: the
 * real page, sections, hook and form, with communityFetch answering like
 * routes/rewards-shop.ts. Proves the request each action sends (PUT item,
 * image upload, fee add/delete, order status) and the 403 state. Nothing
 * here reaches a network.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

type Call = { path: string; method: string; body: unknown };
const calls: Call[] = [];
let routes: Record<string, (c: Call) => { status?: number; body: unknown }> = {};

vi.mock('@/lib/community-gateway', () => ({
  COMMUNITY_GATEWAY: 'https://gw.test',
  communityFetch: vi.fn(async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const call: Call = { path, method, body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const key = `${method} ${path.split('?')[0]}`;
    const handler = routes[key] ?? routes[`${method} *`];
    const r = handler ? handler(call) : { status: 404, body: { ok: false, error: 'NOT_FOUND' } };
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  }),
}));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/StandardHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/RTLProvider', () => ({ useRTL: () => ({ isRTL: false }) }));
// Phone layout: the section switcher is a native select.
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/components/admin/rewards/image-shrink', async (orig) => ({
  ...(await orig<typeof import('@/components/admin/rewards/image-shrink')>()),
  prepareItemImage: vi.fn(async () => ({ content_type: 'image/webp', data_base64: 'UklGRg==' })),
}));

import RewardsShop from './RewardsShop';

const BASE = '/api/v1/admin/rewards';
const wine = {
  id: 'i-wine', slug: 'son-amaret', titles: { de: 'Son Amaret Chardonnay', en: 'Son Amaret Chardonnay' }, descriptions: {},
  images: [], vtna_price: 1200, fulfilment: 'ship', age_restricted: true, min_age: 18, ships_to_countries: ['DE', 'AT'],
  stock: 24, reserved: 1, is_active: true, sort_order: 10,
};
const ticket = {
  id: 'i-ticket', slug: 'event-ticket', titles: { de: 'Event-Ticket' }, descriptions: {}, images: [], vtna_price: 300,
  fulfilment: 'event', age_restricted: false, min_age: null, ships_to_countries: [], stock: null, reserved: 0, is_active: false, sort_order: 20,
};
const fees = [
  { country: 'DE', currency: 'EUR', fee_cents: 690, updated_at: '2026-10-09T10:00:00Z' },
  { country: 'DE', currency: 'USD', fee_cents: 790, updated_at: '2026-10-09T10:00:00Z' },
];
const orderBase = {
  item_id: 'i-wine', vtna_amount: 1200, fulfilment: 'ship', country: 'DE', shipping_fee_cents: 690, shipping_currency: 'EUR',
  age_confirmed_at: null, reservation_expires_at: null, paid_at: '2026-10-09T11:00:00Z', status_reason: null,
  created_at: '2026-10-09T10:55:00Z', updated_at: '2026-10-09T11:00:00Z', user_id: 'a27552a3-0000-0000-0000-000000000000', tenant_id: 't',
  shipping_address: { name: 'Erika Muster', line1: 'Hauptstr. 1', postal_code: '10115', city: 'Berlin' },
};
const orders = [
  { ...orderBase, id: 'o-paid', status: 'paid' },
  { ...orderBase, id: 'o-cancelled', status: 'cancelled', status_reason: 'expired' },
];

function okRoutes() {
  routes = {
    [`GET ${BASE}/items`]: () => ({ body: { ok: true, items: [wine, ticket] } }),
    [`GET ${BASE}/shipping-fees`]: () => ({ body: { ok: true, fees } }),
    [`GET ${BASE}/orders`]: () => ({ body: { ok: true, orders } }),
    [`PUT ${BASE}/items`]: (c) => ({ body: { ok: true, item: { ...(c.body as object), id: 'new' } } }),
    [`POST ${BASE}/items/image`]: () => ({ body: { ok: true, url: 'https://cdn.test/items/abc.webp', path: 'items/abc.webp' } }),
    [`PUT ${BASE}/shipping-fees`]: () => ({ body: { ok: true } }),
    [`DELETE *`]: () => ({ body: { ok: true } }),
    [`PATCH ${BASE}/orders/o-paid`]: () => ({ body: { ok: true, order_id: 'o-paid', from: 'paid', to: 'shipped' } }),
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}><RewardsShop /></QueryClientProvider>);
}

const writes = () => calls.filter((c) => c.method !== 'GET');

async function openSection(section: 'items' | 'fees' | 'orders') {
  const select = await screen.findByTestId('reward-admin-section-select');
  fireEvent.change(select, { target: { value: section } });
}

describe('Admin › Rewards Shop (VTID-05036)', () => {
  beforeEach(() => {
    calls.length = 0;
    okRoutes();
  });

  it('a 403 shows "Nur für Exafy-Admins" instead of a form, and does not retry', async () => {
    routes[`GET ${BASE}/items`] = () => ({ status: 403, body: { ok: false, error: 'FORBIDDEN', message: 'This endpoint requires exafy_admin privileges' } });
    routes[`GET ${BASE}/shipping-fees`] = routes[`GET ${BASE}/items`];
    renderPage();
    const box = await screen.findByTestId('reward-admin-forbidden');
    expect(box.textContent).toContain('Nur für Exafy-Admins');
    expect(screen.queryByTestId('reward-admin-new-item')).toBeNull();
    expect(calls.filter((c) => c.path === `${BASE}/items`)).toHaveLength(1);
  });

  it('lists all items, active and inactive, with VTNA price and ≈ €', async () => {
    renderPage();
    const card = await screen.findByTestId('reward-admin-item-son-amaret');
    expect(card.textContent).toMatch(/1[.,\s]?200 VTNA/);
    expect(card.textContent).toMatch(/12,00\s?€/);
    expect(screen.getByTestId('reward-admin-item-event-ticket').textContent).toContain('Inaktiv');
  });

  it('a new item is saved inactive, with exactly the gateway fields and the slug from the German title', async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId('reward-admin-new-item'));
    const form = await screen.findByTestId('reward-item-form');
    fireEvent.change(within(form).getByTestId('reward-item-title-de'), { target: { value: 'Bio-Olivenöl Kreta' } });
    expect((within(form).getByTestId('reward-item-slug') as HTMLInputElement).value).toBe('bio-olivenoel-kreta');
    fireEvent.change(within(form).getByTestId('reward-item-price'), { target: { value: '250' } });
    expect(within(form).getByTestId('reward-item-price-eur').textContent).toMatch(/2,50\s?€/);
    fireEvent.click(within(form).getByTestId('reward-item-country-DE'));
    fireEvent.click(within(form).getByTestId('reward-item-save'));

    await waitFor(() => expect(writes()).toHaveLength(1));
    const put = writes()[0];
    expect(put).toMatchObject({ method: 'PUT', path: `${BASE}/items` });
    expect(Object.keys(put.body as object).sort()).toEqual([
      'age_restricted', 'descriptions', 'fulfilment', 'images', 'is_active', 'min_age', 'ships_to_countries',
      'slug', 'sort_order', 'stock', 'titles', 'vtna_price',
    ]);
    expect(put.body).toMatchObject({
      slug: 'bio-olivenoel-kreta', titles: { de: 'Bio-Olivenöl Kreta' }, vtna_price: 250, fulfilment: 'ship',
      ships_to_countries: ['DE'], stock: null, is_active: false, images: [],
    });
    // Saving refetches the list.
    await waitFor(() => expect(calls.filter((c) => c.method === 'GET' && c.path === `${BASE}/items`).length).toBeGreaterThan(1));
  });

  it('validation blocks the save: German title, integer price > 0, a country for ship items', async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId('reward-admin-new-item'));
    const form = await screen.findByTestId('reward-item-form');
    fireEvent.click(within(form).getByTestId('reward-item-save'));
    expect(within(form).getByTestId('reward-item-error-titleDe')).toBeTruthy();
    expect(within(form).getByTestId('reward-item-error-price')).toBeTruthy();
    expect(within(form).getByTestId('reward-item-error-countries')).toBeTruthy();
    expect(writes()).toHaveLength(0);
  });

  it("shows the server's message when the item is rejected", async () => {
    routes[`PUT ${BASE}/items`] = () => ({ status: 400, body: { ok: false, error: 'ITEM_REJECTED', message: 'duplicate key value violates unique constraint' } });
    renderPage();
    fireEvent.click(await screen.findByTestId('reward-admin-item-edit-son-amaret'));
    const form = await screen.findByTestId('reward-item-form');
    expect((within(form).getByTestId('reward-item-slug') as HTMLInputElement).readOnly).toBe(true);
    fireEvent.click(within(form).getByTestId('reward-item-save'));
    const err = await within(form).findByTestId('reward-item-server-error');
    expect(err.textContent).toContain('duplicate key value violates unique constraint');
    expect(err.textContent).toContain('nicht gespeichert');
  });

  it('a photo is uploaded as base64 plus its type and shown as a preview', async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId('reward-admin-new-item'));
    const form = await screen.findByTestId('reward-item-form');
    const file = new File([new Uint8Array(10)], 'wine.jpg', { type: 'image/jpeg' });
    fireEvent.change(within(form).getByTestId('reward-item-photo-input'), { target: { files: [file] } });
    const img = await within(form).findByTestId('reward-item-photo-preview');
    expect(img.getAttribute('src')).toBe('https://cdn.test/items/abc.webp');
    expect(writes()[0]).toEqual({ method: 'POST', path: `${BASE}/items/image`, body: { content_type: 'image/webp', data_base64: 'UklGRg==' } });
    fireEvent.click(within(form).getByTestId('reward-item-photo-remove'));
    expect(within(form).queryByTestId('reward-item-photo-preview')).toBeNull();
  });

  it('shipping fees: warns about a missing country, adds and deletes fee rows', async () => {
    renderPage();
    await openSection('fees');
    const warn = await screen.findByTestId('reward-admin-missing-fees');
    expect(within(warn).getByTestId('reward-admin-missing-fee-AT').textContent).toContain('EUR, USD');
    expect(within(warn).queryByTestId('reward-admin-missing-fee-DE')).toBeNull();

    fireEvent.click(screen.getByTestId('reward-admin-fee-add'));
    fireEvent.change(screen.getByTestId('reward-admin-fee-country'), { target: { value: 'at' } });
    fireEvent.change(screen.getByTestId('reward-admin-fee-currency'), { target: { value: 'USD' } });
    fireEvent.change(screen.getByTestId('reward-admin-fee-amount'), { target: { value: '9,90' } });
    fireEvent.click(screen.getByTestId('reward-admin-fee-save'));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toEqual({ method: 'PUT', path: `${BASE}/shipping-fees`, body: { country: 'AT', currency: 'USD', fee_cents: 990 } });

    fireEvent.click(screen.getByTestId('reward-admin-fee-delete-DE-EUR'));
    expect(writes()).toHaveLength(1); // asks first
    fireEvent.click(screen.getByTestId('reward-admin-fee-confirm-DE-EUR'));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes()[1]).toMatchObject({ method: 'DELETE', path: `${BASE}/shipping-fees/DE/EUR` });
  });

  it('orders: filter by status, change status with a reason, never offer cancel', async () => {
    renderPage();
    await openSection('orders');
    const paid = await screen.findByTestId('reward-admin-order-o-paid');
    expect(within(paid).getByTestId('reward-admin-order-address-o-paid').textContent).toContain('Erika Muster');
    expect(within(paid).getByTestId('reward-admin-order-fee-o-paid').textContent).toMatch(/6,90\s?€/);
    expect(within(paid).getByText('Son Amaret Chardonnay')).toBeTruthy();

    const select = within(paid).getByTestId('reward-admin-order-status-o-paid') as HTMLSelectElement;
    const values = [...select.options].map((o) => o.value).filter(Boolean);
    expect(values).toEqual(['fulfilling', 'shipped', 'delivered']);
    expect(values).not.toContain('cancelled');
    expect(screen.getByTestId('reward-admin-order-readonly-o-cancelled')).toBeTruthy();
    expect(screen.queryByTestId('reward-admin-order-status-o-cancelled')).toBeNull();

    fireEvent.change(select, { target: { value: 'shipped' } });
    fireEvent.change(within(paid).getByTestId('reward-admin-order-reason-o-paid'), { target: { value: 'DHL 00340434' } });
    fireEvent.click(within(paid).getByTestId('reward-admin-order-apply-o-paid'));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toEqual({ method: 'PATCH', path: `${BASE}/orders/o-paid`, body: { status: 'shipped', reason: 'DHL 00340434' } });

    fireEvent.change(screen.getByTestId('reward-admin-orders-filter'), { target: { value: 'shipped' } });
    await waitFor(() => expect(calls.some((c) => c.method === 'GET' && c.path === `${BASE}/orders?status=shipped`)).toBe(true));
  });
});

describe('Admin › Rewards Shop strings (VTID-05036)', () => {
  const dir = join(__dirname, '../../../i18n');
  const load = (lc: string) => JSON.parse(readFileSync(join(dir, lc, 'admin.json'), 'utf8')).admin.rewardsShop;
  const keys = (o: Record<string, unknown>, p = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (k.startsWith('_') ? [] : v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));

  it('every string exists in German and English, and in every shipped locale', () => {
    const de = keys(load('de')).sort();
    expect(keys(load('en')).sort()).toEqual(de);
    for (const lc of readdirSync(dir).filter((d) => /^[a-z]{2}$/.test(d))) expect(keys(load(lc)).sort(), lc).toEqual(de);
    expect(load('de').forbiddenTitle).toBe('Nur für Exafy-Admins');
  });

  it('every key the screen uses is in the German catalog', () => {
    const root = join(__dirname, '../../..');
    const files = [
      'pages/admin/marketplace/RewardsShop.tsx',
      ...readdirSync(join(root, 'components/admin/rewards')).filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.')).map((f) => `components/admin/rewards/${f}`),
      'pages/admin/marketplace/Overview.tsx',
      'pages/admin/marketplace/Products.tsx',
    ];
    const de = new Set(keys(load('de')));
    const used = files.flatMap((f) => [...readFileSync(join(root, f), 'utf8').matchAll(/'admin\.rewardsShop\.([A-Za-z_.]+)'/g)].map((m) => m[1]));
    expect(used.length).toBeGreaterThan(50);
    for (const k of used) expect(de.has(k), k).toBe(true);
  });
});
