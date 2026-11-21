/**
 * VTID-05677 (native-wave2-media-hub-r2/media-hub) — the Media Hub's one door
 * to data and core. Re-exports the class-A pieces of `@vitana/core/media`
 * (the Shorts tag allow-list and the three `useShorts.ts` types) and declares
 * `MediaHubData`, the interface every Media Hub screen reads and writes through:
 * shorts, music, podcasts, bookmarks, comments, likes, edit / delete and the
 * three uploads. The route file wraps the screen in `MediaHubDataProvider` with
 * the real implementation (`src/screens/media/data/index.ts`, the same tables,
 * filters, limits and buckets as web); tests wrap it with a fake, so no test
 * write reaches a live system.
 */
import { createContext, createElement, useContext, type ReactElement, type ReactNode } from 'react';
import type { DeleteShortInput, FetchShortsParams, Short } from '@vitana/core/media';

export { SHORTS_TAG_IDS, type ShortsTagId, type Short, type FetchShortsParams, type DeleteShortInput } from '@vitana/core/media';

/** The slice of a TanStack query result the screens read. */
export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Web `MobileMusicList` track (`media_uploads` + `music_metadata`, `MediaHub.tsx:337-366`). */
export interface MusicTrack {
  id: string;
  title: string;
  description?: string | null;
  tags?: string[] | null;
  file_url: string;
  duration?: number | null;
  plays_count?: number | null;
  created_at?: string;
  music_metadata?: MusicMetadata[] | MusicMetadata | null;
}
export interface MusicMetadata {
  genre?: string | null;
  mood?: string | null;
  artist_name?: string | null;
}

/** Web `MobilePodcastList` episode (`media_uploads` + `podcast_metadata`, `MediaHub.tsx:535-551`). */
export interface PodcastEpisode {
  id: string;
  title: string;
  description?: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  duration?: number | null;
  created_at?: string;
  user_id?: string;
  podcast_metadata?: PodcastMetadata[] | PodcastMetadata | null;
}
export interface PodcastMetadata {
  host_name?: string | null;
  guest_name?: string | null;
  language?: string | null;
  show_name?: string | null;
}

/** Web `ShortComment` (`useShortComments.ts:6-17`). */
export interface ShortComment {
  id: string;
  video_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  liked_by_me: boolean;
  display_name?: string;
  avatar_url?: string | null;
}

/** Web `BookmarkButtonItem` for a music track (`types/bookmarks.ts`). */
export interface MusicBookmarkInput {
  item_type: 'music';
  item_id: string;
  item_name: string;
  item_image_url?: string;
  item_metadata?: Record<string, unknown>;
}

/** A file picked on the device (the web `File`). */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface EditShortInput {
  id: string;
  userId: string;
  title: string;
  description: string;
  tags: string[];
  /** The short's current thumbnail, kept when no new one is picked. */
  thumbnailUrl: string | null;
  thumbnail?: PickedFile;
}

export interface VideoUploadInput {
  file: PickedFile;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  language?: string;
  thumbnail?: PickedFile;
  durationSec?: number;
}

export interface AudioUploadInput {
  file: PickedFile;
  mediaType: 'music' | 'podcast';
  title: string;
  description: string;
  tags: string[];
  visibility: 'public' | 'private';
  genre?: string;
  mood?: string;
  hostGuest?: string;
  language?: string;
}

export interface MediaHubData {
  // reads
  useShorts(params: FetchShortsParams): QueryResult<Short[]>;
  useMusic(): QueryResult<MusicTrack[]>;
  usePodcasts(): QueryResult<PodcastEpisode[]>;
  /** The member's bookmarked music ids (web `useBookmarks().isBookmarked('music', id)`). */
  useBookmarks(): { isBookmarked: (type: 'music', id: string) => boolean };
  useShortComments(videoId: string | undefined): { comments: ShortComment[]; isLoading: boolean; refetch: () => void };
  // writes
  toggleLike(input: { videoId: string; action: 'like' | 'unlike' }): Promise<void>;
  toggleBookmark(input: MusicBookmarkInput): Promise<boolean>;
  addComment(input: { videoId: string; content: string; parentId: string | null }): Promise<void>;
  deleteComment(input: { videoId: string; commentId: string }): Promise<void>;
  toggleCommentLike(input: { videoId: string; commentId: string; liked: boolean }): Promise<void>;
  deleteShort(input: DeleteShortInput): Promise<void>;
  editShort(input: EditShortInput): Promise<void>;
  uploadVideo(input: VideoUploadInput): Promise<void>;
  uploadAudio(input: AudioUploadInput): Promise<void>;
}

const MediaHubDataContext = createContext<MediaHubData | null>(null);

export function MediaHubDataProvider({ value, children }: { value: MediaHubData; children?: ReactNode }): ReactElement {
  return createElement(MediaHubDataContext.Provider, { value }, children);
}

/** The screen's data; throws outside a `MediaHubDataProvider`. */
export function useMediaHubData(): MediaHubData {
  const value = useContext(MediaHubDataContext);
  if (!value) throw new Error('useMediaHubData must be used inside MediaHubDataProvider');
  return value;
}
