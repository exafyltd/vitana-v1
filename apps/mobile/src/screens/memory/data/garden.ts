/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the Memory Garden data
 * path, re-implemented natively (class-B): the web `src/lib/memory-api.ts`
 * garden + diary-save calls, `src/hooks/useMemoryMetadata.ts`,
 * `src/hooks/useKnowledgeBase.ts` and the self-awareness query in
 * `src/components/memory/WhatVitanaKnows.tsx`. Same endpoints, same query
 * keys, same transforms; every call goes through `memoryJson` (Bearer +
 * `X-Vitana-Active-Role: community`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify, notifyError } from '../../../ports/ui';
import { useAuth } from '../../../auth/AuthProvider';
import { memoryJson } from './client';

export const GARDEN_CATEGORY_IDS = [
  'personal_identity',
  'health_wellness',
  'lifestyle_routines',
  'network_relationships',
  'learning_knowledge',
  'business_projects',
  'finance_assets',
  'location_environment',
  'digital_footprint',
  'values_aspirations',
  'autopilot_context',
  'future_plans',
  'uncategorized',
] as const;
export type GardenCategoryId = (typeof GARDEN_CATEGORY_IDS)[number];

const UI_TO_API: Record<string, GardenCategoryId> = { 'autopilot-settings': 'autopilot_context', general: 'uncategorized' };
const API_TO_UI: Record<string, string> = { autopilot_context: 'autopilot-settings', uncategorized: 'general' };

export function toApiCategory(uiId: string | undefined | null): GardenCategoryId | undefined {
  if (!uiId) return undefined;
  if (UI_TO_API[uiId]) return UI_TO_API[uiId];
  const snake = uiId.replace(/-/g, '_');
  return (GARDEN_CATEGORY_IDS as readonly string[]).includes(snake) ? (snake as GardenCategoryId) : undefined;
}

export function toUiCategory(apiId: string): string {
  return API_TO_UI[apiId] ?? apiId.replace(/_/g, '-');
}

/** "personal-identity" → "personalIdentity", the key under screens.memory.garden.categories (web gardenCategoryKey). */
export function gardenCategoryKey(uiId: string): string {
  return uiId.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** The 13 garden categories in the web grid order (`MemoryCategoryGrid.tsx` MEMORY_CATEGORIES) with their icon. */
export const GARDEN_CATEGORIES: ReadonlyArray<{ id: string; icon: string }> = [
  { id: 'personal-identity', icon: 'Heart' },
  { id: 'health-wellness', icon: 'Activity' },
  { id: 'lifestyle-routines', icon: 'Calendar' },
  { id: 'business-projects', icon: 'Briefcase' },
  { id: 'network-relationships', icon: 'Users' },
  { id: 'learning-knowledge', icon: 'GraduationCap' },
  { id: 'finance-assets', icon: 'DollarSign' },
  { id: 'location-environment', icon: 'MapPin' },
  { id: 'digital-footprint', icon: 'Wifi' },
  { id: 'values-aspirations', icon: 'Target' },
  { id: 'autopilot-settings', icon: 'Settings' },
  { id: 'future-plans', icon: 'Sparkles' },
  { id: 'general', icon: 'FolderOpen' },
];

export interface GardenEntry {
  kind: 'fact' | 'episode';
  id: string;
  category: GardenCategoryId;
  content: string;
  fact_key?: string;
  episode_kind?: string;
  source: string;
  confidence: number | null;
  user_confirmed: boolean;
  occurred_at: string;
}

export interface GardenCategorySummary {
  category: GardenCategoryId;
  count: number;
  last_updated_at: string | null;
}

export interface CategoryProgress {
  category: string;
  progress: number;
  memoryCount: number;
  lastUpdated: string;
}

export interface MemoryMetadata {
  total_memories_count: number;
  category_progress: Record<string, CategoryProgress>;
}

/** Target memory counts per category (web `CATEGORY_TARGETS`). */
export const CATEGORY_TARGETS: Record<string, number> = {
  'personal-identity': 10,
  'health-wellness': 15,
  'lifestyle-routines': 12,
  'business-projects': 10,
  'network-relationships': 15,
  'learning-knowledge': 12,
  'finance-assets': 8,
  'location-environment': 8,
  'digital-footprint': 10,
  'values-aspirations': 10,
  'autopilot-settings': 5,
  'future-plans': 10,
  general: 10,
};

export function progressForCount(count: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.round(Math.min((count / target) * 100, 100));
}

export function metadataFromSummary(total: number, categories: GardenCategorySummary[]): MemoryMetadata {
  const category_progress: Record<string, CategoryProgress> = {};
  for (const c of categories) {
    const ui = toUiCategory(c.category);
    category_progress[ui] = {
      category: ui,
      progress: progressForCount(c.count, CATEGORY_TARGETS[ui] ?? 10),
      memoryCount: c.count,
      lastUpdated: c.last_updated_at ?? '',
    };
  }
  return { total_memories_count: total, category_progress };
}

/** A garden entry in the shape the web dialogs use (`useKnowledgeBase` KnowledgeItem); `id` is `fact:<id>` / `episode:<id>`. */
export interface KnowledgeItem {
  id: string;
  content: string;
  source: 'ai' | 'diary';
  memoryType: string;
  tags: string[];
  confidenceScore?: number;
  createdAt: string;
}

const TAG_NOISE = new Set(['diary', 'ai', 'voice', 'photo', 'text', 'manual']);

export function entryToKnowledgeItem(e: GardenEntry): KnowledgeItem {
  const isDiary = e.kind === 'episode' && e.episode_kind === 'diary';
  const category = toUiCategory(e.category);
  return {
    id: `${e.kind}:${e.id}`,
    content: e.content,
    source: isDiary ? 'diary' : 'ai',
    memoryType: category,
    tags: [category, isDiary ? 'diary' : 'ai'],
    confidenceScore: e.confidence ?? undefined,
    createdAt: e.occurred_at,
  };
}

export function parseKnowledgeId(id: string): { kind: 'fact' | 'episode'; id: string } {
  const m = /^(fact|episode):(.+)$/.exec(id);
  return m ? { kind: m[1] as 'fact' | 'episode', id: m[2] } : { kind: 'episode', id };
}

export function categoryFromItem(data: { memoryType?: string; tags?: string[] }): GardenCategoryId | undefined {
  const tag = (data.tags ?? []).find((t) => !TAG_NOISE.has(t));
  return toApiCategory(tag) ?? toApiCategory(data.memoryType);
}

// ── gateway calls (web memory-api.ts) ────────────────────────────────────
export async function fetchGardenCategories(): Promise<{ total: number; categories: GardenCategorySummary[] }> {
  const body = await memoryJson<{ total?: number; categories?: GardenCategorySummary[] }>('/memory/garden/categories');
  return { total: body.total ?? 0, categories: body.categories ?? [] };
}

export async function fetchGardenEntries(opts: { limit?: number } = {}): Promise<GardenEntry[]> {
  const q = opts.limit ? `?limit=${opts.limit}` : '';
  const body = await memoryJson<{ entries?: GardenEntry[] }>(`/memory/garden/entries${q}`);
  return body.entries ?? [];
}

export async function editGardenEntry(kind: 'fact' | 'episode', id: string, content: string, category?: GardenCategoryId): Promise<void> {
  await memoryJson(`/memory/garden/entries/${kind}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(category ? { content, category } : { content }),
  });
}

export async function deleteGardenEntry(kind: 'fact' | 'episode', id: string): Promise<void> {
  await memoryJson(`/memory/garden/entries/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** The one diary write path (diary row + memory episode + Vitana Index sync) — what the web Add Memory dialog calls. */
export async function saveDiaryEntry(input: { text: string; source: 'manual'; tags: string[]; attachments: string[] | null }): Promise<{ entry: { id: string } }> {
  return memoryJson('/memory/diary/entries', { method: 'POST', body: JSON.stringify(input) });
}

export interface AwarenessItem {
  kind: string;
  label: string;
  value: string;
  source: string;
}

export interface SelfAwarenessResponse {
  ok: boolean;
  items: AwarenessItem[];
  last_refreshed_at: string;
  user_controls: { edit_memory_url: string; pause_proactivity_url: string };
}

// ── hooks ────────────────────────────────────────────────────────────────
export const gardenKeys = {
  metadata: ['memory-metadata'] as const,
  knowledge: ['knowledge-base', 'all'] as const,
  selfAwareness: (userId: string | undefined) => ['self-awareness-summary', userId] as const,
};

/** Garden category counts (web useMemoryMetadata). */
export function useMemoryMetadata() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: gardenKeys.metadata,
    queryFn: async () => {
      const { total, categories } = await fetchGardenCategories();
      return metadataFromSummary(total, categories);
    },
  });
  return {
    metadata: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isRefreshing: query.isFetching && !query.isLoading,
    refreshMetadata: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['knowledge-base'] }), query.refetch()]);
    },
  };
}

function invalidateGarden(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['knowledge-base'] });
  void qc.invalidateQueries({ queryKey: gardenKeys.metadata });
}

/** Garden entries + their mutations (web useKnowledgeBase("all")). */
export function useKnowledgeBase() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: gardenKeys.knowledge,
    queryFn: async () => (await fetchGardenEntries({ limit: 500 })).map(entryToKnowledgeItem),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const ref = parseKnowledgeId(id);
      await deleteGardenEntry(ref.kind, ref.id);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: gardenKeys.knowledge });
      const before = qc.getQueryData<KnowledgeItem[]>(gardenKeys.knowledge);
      if (before) qc.setQueryData<KnowledgeItem[]>(gardenKeys.knowledge, before.filter((i) => i.id !== id));
      return { before };
    },
    onSuccess: () => {
      invalidateGarden(qc);
      notify('toasts.hooks.knowledgeDeleted', 'toasts.hooks.itemHasRemovedFromYourKnowledge');
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.before) qc.setQueryData(gardenKeys.knowledge, ctx.before);
      notifyError('toasts.hooks.errorDeletingKnowledge');
    },
  });

  const update = useMutation({
    mutationFn: async (data: { id: string; content: string; memoryType?: string; tags?: string[] }) => {
      const ref = parseKnowledgeId(data.id);
      // A fact's category comes from its key; only episodes can be moved.
      const category = ref.kind === 'episode' ? categoryFromItem(data) : undefined;
      await editGardenEntry(ref.kind, ref.id, data.content, category);
    },
    onSuccess: () => {
      invalidateGarden(qc);
      notify('toasts.hooks.knowledgeUpdated', 'toasts.hooks.yourChangesHaveSaved');
    },
    onError: () => notifyError('toasts.hooks.errorUpdatingKnowledge'),
  });

  const create = useMutation({
    mutationFn: async (data: { content: string; tags: string[] }) => {
      const saved = await saveDiaryEntry({ text: data.content, source: 'manual', tags: data.tags, attachments: null });
      return saved.entry;
    },
    onSuccess: () => {
      invalidateGarden(qc);
      notify('toasts.hooks.knowledgeCreated', 'toasts.hooks.newItemAddedYourKnowledgeBase');
    },
    onError: () => notifyError('toasts.hooks.errorCreatingKnowledge'),
  });

  return {
    knowledgeItems: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    deleteKnowledge: remove.mutate,
    updateKnowledge: update.mutate,
    createKnowledge: create.mutateAsync,
    isUpdating: update.isPending,
    isCreating: create.isPending,
  };
}

/** What Vitana knows about the member (web WhatVitanaKnows: `/presence/self-awareness-summary`; a failed read hides the card). */
export function useSelfAwareness() {
  const { user } = useAuth();
  return useQuery<SelfAwarenessResponse | null>({
    queryKey: gardenKeys.selfAwareness(user?.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        return await memoryJson<SelfAwarenessResponse>('/presence/self-awareness-summary');
      } catch {
        return null;
      }
    },
  });
}
