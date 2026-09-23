/**
 * VTID-04389 — the Memory Garden reads the canonical memory store through the
 * gateway. These tests pin the pure mapping: category ids, progress from real
 * counts, and KnowledgeItem ids that carry the entry kind.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('@/lib/community-gateway', () => ({ communityFetch: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useActivityLogger', () => ({ useActivityLogger: () => ({ logActivity: vi.fn() }) }));

import { metadataFromSummary, progressForCount, CATEGORY_TARGETS } from './useMemoryMetadata';
import { entryToKnowledgeItem, parseKnowledgeId, categoryFromItem } from './useKnowledgeBase';
import { toApiCategory, toUiCategory, GARDEN_CATEGORY_IDS } from '@/lib/memory-api';

describe('category ids', () => {
  it('round-trips every Garden category between the UI and the API', () => {
    for (const api of GARDEN_CATEGORY_IDS) expect(toApiCategory(toUiCategory(api))).toBe(api);
    expect(toUiCategory('autopilot_context')).toBe('autopilot-settings');
    expect(toUiCategory('uncategorized')).toBe('general');
    expect(toApiCategory('health-wellness')).toBe('health_wellness');
    expect(toApiCategory('diary')).toBeUndefined();
  });

  it('every UI target key is a Garden category', () => {
    for (const k of Object.keys(CATEGORY_TARGETS)) expect(toApiCategory(k)).toBeDefined();
  });
});

describe('progress (D5)', () => {
  it('is the share of the target reached, capped at 100', () => {
    expect(progressForCount(0, 10)).toBe(0);
    expect(progressForCount(5, 10)).toBe(50);
    expect(progressForCount(30, 10)).toBe(100);
    expect(progressForCount(3, 0)).toBe(0);
  });

  it('maps the API summary onto the UI category ids', () => {
    const m = metadataFromSummary(7, [
      { category: 'health_wellness', count: 3, last_updated_at: '2026-09-20T00:00:00Z' },
      { category: 'uncategorized', count: 4, last_updated_at: '2026-09-21T00:00:00Z' },
    ]);
    expect(m.total_memories_count).toBe(7);
    expect(m.category_progress['health-wellness']).toMatchObject({ memoryCount: 3, progress: 20 });
    expect(m.category_progress['general']).toMatchObject({ memoryCount: 4, progress: 40 });
    expect(m.last_ai_sync_at).toBe('2026-09-21T00:00:00Z');
  });
});

describe('knowledge items', () => {
  it('carry the entry kind in the id and the category in memoryType/tags', () => {
    const item = entryToKnowledgeItem({
      kind: 'episode', id: 'e1', category: 'health_wellness', content: 'slept 6h', episode_kind: 'diary',
      source: 'diary', confidence: null, user_confirmed: false, occurred_at: '2026-09-22T00:00:00Z',
    });
    expect(item).toMatchObject({ id: 'episode:e1', source: 'diary', memoryType: 'health-wellness', tags: ['health-wellness', 'diary'] });
    expect(parseKnowledgeId(item.id)).toEqual({ kind: 'episode', id: 'e1' });
    expect(parseKnowledgeId('fact:f1')).toEqual({ kind: 'fact', id: 'f1' });
    expect(parseKnowledgeId('legacy-id')).toEqual({ kind: 'episode', id: 'legacy-id' });
  });

  it('the chosen category comes from the first meaningful tag, else memoryType', () => {
    expect(categoryFromItem({ tags: ['future-plans', 'diary'] })).toBe('future_plans');
    expect(categoryFromItem({ tags: ['diary', 'voice'], memoryType: 'general' })).toBe('uncategorized');
  });
});

describe('source contract', () => {
  const kb = readFileSync(join(__dirname, 'useKnowledgeBase.ts'), 'utf8');
  const meta = readFileSync(join(__dirname, 'useMemoryMetadata.ts'), 'utf8');
  it('the Garden hooks no longer read or write the legacy tables or Gemini edge functions', () => {
    for (const src of [kb, meta]) {
      expect(src).not.toMatch(/from\("ai_memory"\)|from\("diary_entries"\)|from\("user_memory_metadata"\)/);
      expect(src).not.toMatch(/extract-diary-insights|refresh-memory-metadata/);
    }
  });
});
