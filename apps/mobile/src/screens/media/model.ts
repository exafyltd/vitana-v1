/**
 * VTID-05677 — the view model of the shorts list, the native twin of the
 * `videoShorts` mapping in `MediaHub.tsx:368-440`: a real short becomes a
 * `VideoShort` (creator name, avatar, normalised tags, likes, comment count,
 * thumbnail with the web's first-demo fallback); when the query returned no
 * short (empty, loading or error) the three demo shorts take its place.
 */
import type { ImageSourcePropType } from 'react-native';
import type { Short } from '../../ports/media';

export interface VideoShort {
  id?: string;
  user_id?: string;
  title: string;
  description?: string | null;
  creator: string;
  creatorAvatar?: string | null;
  src_url?: string;
  thumbnail_url?: string | null;
  /** A remote url, or a bundled demo asset. */
  thumbnailImage?: string | number;
  likes: number;
  commentsCount?: number;
  tags?: string[];
  isLive?: boolean;
}

/** Copies of `src/assets/shorts-*.jpg` (`MediaHub.tsx:59-61`); `tests/media/assets.test.ts` compares them byte for byte. */
/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles a static `require` of an image asset */
const MORNING_STRETCH = require('./assets/shorts-morning-stretch.jpg') as number;
const HEALTHY_BREAKFAST = require('./assets/shorts-healthy-breakfast.jpg') as number;
const BREATHING_EXERCISE = require('./assets/shorts-breathing-exercise.jpg') as number;
/* eslint-enable @typescript-eslint/no-require-imports */

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Web `fallbackShorts` (`MediaHub.tsx:375-405`); title, creator and tags come from the `mediaHubNative.demo.*` keys. */
export function demoShorts(t: Translate): VideoShort[] {
  return [
    { title: t('mediaHubNative.demo.morningStretch.title'), creator: t('mediaHubNative.demo.morningStretch.creator'), likes: 234, thumbnailImage: MORNING_STRETCH, isLive: false, tags: [t('mediaHubNative.demo.tagFitness'), t('mediaHubNative.demo.tagYoga')] },
    { title: t('mediaHubNative.demo.healthyBreakfast.title'), creator: t('mediaHubNative.demo.healthyBreakfast.creator'), likes: 189, thumbnailImage: HEALTHY_BREAKFAST, isLive: false, tags: [t('mediaHubNative.demo.tagNutrition'), t('mediaHubNative.demo.tagRecipes')] },
    { title: t('mediaHubNative.demo.breathing.title'), creator: t('mediaHubNative.demo.breathing.creator'), likes: 412, thumbnailImage: BREATHING_EXERCISE, isLive: true, tags: [t('mediaHubNative.demo.tagMindfulness'), t('mediaHubNative.demo.tagWellness')] },
  ];
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') return raw.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

export function toVideoShorts(real: Short[], t: Translate): VideoShort[] {
  if (real.length === 0) return demoShorts(t);
  return real.map((short) => {
    const raw = short.profiles?.display_name ?? short.profiles?.full_name ?? null;
    const creator = typeof raw === 'string' && raw.trim().length > 0 ? raw : t('mediaHubNative.communityMember');
    return {
      id: short.id,
      user_id: short.user_id,
      title: short.title,
      description: short.description,
      creator,
      creatorAvatar: short.profiles?.avatar_url || null,
      src_url: short.src_url,
      thumbnail_url: short.thumbnail_url,
      thumbnailImage: short.thumbnail_url || MORNING_STRETCH,
      likes: short.likes_count,
      commentsCount: short.comments_count ?? 0,
      tags: normalizeTags((short as { tags?: unknown }).tags),
      isLive: false,
    };
  });
}

/** Web card image: `thumbnail_url || thumbnailImage`. */
export function thumbnailSource(short: VideoShort): ImageSourcePropType | undefined {
  const img = short.thumbnail_url || short.thumbnailImage;
  if (!img) return undefined;
  return typeof img === 'number' ? img : { uri: img };
}

/** Web `formatDuration` of the lists: m:ss, `0:00` when unknown. */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
