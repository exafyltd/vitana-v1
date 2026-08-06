/**
 * Tests for the localStorage mirror of the react-query cache.
 *
 * The immediate-flush path (`persistQueryCacheNow`) exists because of
 * VTID-03503: the periodic writer runs every 30 seconds, and a user who likes
 * a post and reloads inside that window gets the snapshot taken *before* her
 * own action restored over the top of it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  restoreQueryCache,
  writeQueryCache,
  persistQueryCacheNow,
  startQueryCachePersistence,
} from '@/lib/query-persist';

const PERSIST_KEY = 'vitana-query-cache';
const read = () => JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}');

describe('query cache persistence', () => {
  let qc: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    qc = new QueryClient();
  });

  it('mirrors persistable queries and skips the rest', () => {
    qc.setQueryData(['all-news-feed', 'u1', 'de'], { posts: [] });
    qc.setQueryData(['feed-post-comments', 'post', 'p1'], []);

    writeQueryCache(qc);

    const stored = read();
    expect(stored['["all-news-feed","u1","de"]']).toBeTruthy();
    expect(stored['["feed-post-comments","post","p1"]']).toBeUndefined();
  });

  it('persistQueryCacheNow writes without waiting for the interval', () => {
    startQueryCachePersistence(qc);
    qc.setQueryData(['all-news-feed', 'u1', 'de'], { posts: [{ likes_count: 5 }] });

    persistQueryCacheNow();

    expect(read()['["all-news-feed","u1","de"]'].data).toEqual({ posts: [{ likes_count: 5 }] });
  });

  it('a like written into the cache survives a reload', () => {
    // End-to-end shape of the reported bug: mutate the cached count, flush,
    // then restore into a brand-new client the way a page load does.
    startQueryCachePersistence(qc);
    qc.setQueryData(['all-news-feed', 'u1', 'de'], { posts: [{ post_id: 'p1', likes_count: 4 }] });
    writeQueryCache(qc);

    qc.setQueryData(['all-news-feed', 'u1', 'de'], { posts: [{ post_id: 'p1', likes_count: 5 }] });
    persistQueryCacheNow();

    const reloaded = new QueryClient();
    restoreQueryCache(reloaded);

    expect(reloaded.getQueryData(['all-news-feed', 'u1', 'de'])).toEqual({
      posts: [{ post_id: 'p1', likes_count: 5 }],
    });
  });

  it('restores with the original updatedAt so a stale snapshot still refetches', () => {
    const old = Date.now() - 60 * 60 * 1000;
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ '["all-news-feed","u1","de"]': { data: { posts: [] }, timestamp: old } }),
    );

    restoreQueryCache(qc);

    const state = qc.getQueryState(['all-news-feed', 'u1', 'de']);
    expect(state?.dataUpdatedAt).toBe(old);
  });

  it('drops entries older than 24h', () => {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        '["all-news-feed","u1","de"]': {
          data: { posts: [] },
          timestamp: Date.now() - 25 * 60 * 60 * 1000,
        },
      }),
    );

    restoreQueryCache(qc);

    expect(qc.getQueryData(['all-news-feed', 'u1', 'de'])).toBeUndefined();
  });

  it('survives a corrupt payload without taking the app down', () => {
    localStorage.setItem(PERSIST_KEY, 'not json');
    expect(() => restoreQueryCache(qc)).not.toThrow();
  });
});
