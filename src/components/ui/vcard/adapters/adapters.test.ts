/** VTID-05105 — data → VCard slot mappers. */
import { describe, expect, it } from 'vitest';
import { articleToVCard, postToVCard, productToVCard } from './index';
import type { ArticleFeedItem, PostFeedItem } from '@/lib/news-feed-ranker';
import type { MarketplaceProduct } from '@/hooks/useMarketplace';

const post = (over: Partial<PostFeedItem> = {}): PostFeedItem => ({
  id: 'post-1', kind: 'post', published_at: '2026-10-12T08:00:00Z', source: 'post', post_id: 'p1', user_id: 'u1',
  author_name: 'Mila', author_avatar: null, content: '\n  Sunrise walk\nsecond line', image_url: 'https://img/1.jpg',
  video_url: null, background_style: null, mentions: [], likes_count: 1, comments_count: 0, followed: false, tags: [],
  ...over,
});

describe('VTID-05105 VCard adapters', () => {
  it('post: first non-empty line is the title, author is the eyebrow, links to the post page', () => {
    const d = postToVCard(post());
    expect(d.title).toBe('Sunrise walk');
    expect(d.eyebrow).toBe('Mila');
    expect(d.href).toBe('/post/post/p1');
    expect(d.media).toEqual({ src: 'https://img/1.jpg', alt: '', ratio: 'landscape' });
  });

  it('post without image or video is text-only (no media box)', () => {
    expect(postToVCard(post({ image_url: null })).media).toBeUndefined();
  });

  it('video post keeps a media box for the player slot', () => {
    expect(postToVCard(post({ image_url: null, video_url: 'v.mp4' })).media).toEqual({ src: null, alt: '', ratio: 'landscape' });
  });

  it('article: title, source eyebrow, summary body, placeholder when no image', () => {
    const a: ArticleFeedItem = { id: 'a1', kind: 'article', published_at: '', source_name: 'Longevity News', title: 'Sleep & HRV', summary: null, image_url: null, link: null, tags: [] };
    const d = articleToVCard(a);
    expect(d).toMatchObject({ title: 'Sleep & HRV', eyebrow: 'Longevity News', media: { src: null } });
    expect(d.body).toBeUndefined();
    expect(d.href).toBeUndefined();
  });

  it('product: brand eyebrow, formatted price as meta, first image, detail route', () => {
    const p = { id: 'x1', title: 'Magnesium 400', brand: 'NordVital', category: 'sleep', images: ['m.jpg'], price_cents: 2490, currency: 'EUR' } as unknown as MarketplaceProduct;
    const d = productToVCard(p);
    expect(d).toMatchObject({ title: 'Magnesium 400', eyebrow: 'NordVital', media: { src: 'm.jpg', alt: 'Magnesium 400' }, href: '/discover/product/x1' });
    expect(d.meta).toMatch(/24[.,]90/);
  });

  it('product without price or image never invents values', () => {
    const p = { id: 'x2', title: 'T', brand: null, category: null, images: [], price_cents: null, currency: null } as unknown as MarketplaceProduct;
    const d = productToVCard(p);
    expect(d.meta).toBeUndefined();
    expect(d.eyebrow).toBeUndefined();
    expect(d.media).toEqual({ src: null, alt: 'T' });
  });
});
