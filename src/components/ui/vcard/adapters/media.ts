/**
 * VTID-05110 — Media Hub records → VCard slots (shorts, music tracks, podcast
 * episodes). Pure functions, no hooks and no JSX, so the Media Hub Spotlight
 * stage and its rail map the same record the same way. Screens add their own
 * actions (play, bookmark, share, owner edit/delete).
 *
 * Only real rows are mapped: the Media Hub's hard-coded demo shorts,
 * playlists and shows are never passed in (contract SR-24).
 */
import type { VCardData } from './index';

/** `m:ss` — seconds are a duration, not a date or a localised number. */
export function formatMediaDuration(seconds: number | null | undefined): string | undefined {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** Joins the non-empty meta parts with a middle dot. */
export function joinMeta(...parts: Array<string | null | undefined | false>): string | undefined {
  const kept = parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  return kept.length > 0 ? kept.join(' · ') : undefined;
}

/** A published short as the Media Hub view model carries it. */
export interface MediaShortRecord {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  creator: string;
  duration: string;
  thumbnail_url?: string | null;
  src_url: string;
  tags?: string[];
}

/** Shorts are vertical video, so the spotlight card uses the 4:5 ratio. */
export function shortToVCard(short: MediaShortRecord): VCardData {
  return {
    key: short.id,
    media: { src: short.thumbnail_url || null, alt: short.title, ratio: 'portrait' },
    eyebrow: short.creator,
    title: short.title,
    meta: joinMeta(short.duration !== '0:00' ? short.duration : undefined, ...(short.tags ?? []).slice(0, 2)),
    body: short.description ?? undefined,
  };
}

/** A row of `media_uploads` (media_type = music) with its `music_metadata`. */
export interface MusicTrackRecord {
  id: string;
  title: string;
  description?: string | null;
  tags?: string[] | null;
  file_url: string;
  duration?: number | null;
  /** PostgREST returns the 1:1 embed as an object; older callers typed it as an array. Both are read. */
  music_metadata?: MusicMetadata | MusicMetadata[] | null;
}

interface MusicMetadata {
  genre?: string | null;
  mood?: string | null;
  artist_name?: string | null;
}

export function musicMetadata(track: MusicTrackRecord): MusicMetadata | undefined {
  const m = track.music_metadata;
  return (Array.isArray(m) ? m[0] : m) ?? undefined;
}

export function musicArtist(track: MusicTrackRecord): string | undefined {
  const name = musicMetadata(track)?.artist_name;
  return name && name.trim() ? name : undefined;
}

/** Music has no artwork: the screen supplies an icon tile via `mediaSlot`. */
export function musicTrackToVCard(track: MusicTrackRecord, unknownArtist: string): VCardData {
  const genre = musicMetadata(track)?.genre ?? undefined;
  return {
    key: track.id,
    eyebrow: genre,
    title: track.title,
    meta: joinMeta(musicArtist(track) ?? unknownArtist, formatMediaDuration(track.duration)),
    body: track.description ?? undefined,
  };
}

/** A row of `media_uploads` (media_type = podcast) with its `podcast_metadata`. */
export interface PodcastEpisodeRecord {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  duration?: number | null;
  created_at?: string;
  podcast_metadata?:
    | { host_name?: string | null; language?: string | null; series_name?: string | null }
    | Array<{ host_name?: string | null; language?: string | null; series_name?: string | null }>
    | null;
}

export function podcastMetadata(episode: PodcastEpisodeRecord) {
  const m = episode.podcast_metadata;
  return (Array.isArray(m) ? m[0] : m) ?? undefined;
}

export function podcastHost(episode: PodcastEpisodeRecord, unknownHost: string): string {
  const host = podcastMetadata(episode)?.host_name;
  return host && host.trim() ? host : unknownHost;
}

export function podcastToVCard(episode: PodcastEpisodeRecord, unknownHost: string): VCardData {
  const meta = podcastMetadata(episode);
  return {
    key: episode.id,
    media: { src: episode.thumbnail_url || null, alt: episode.title },
    eyebrow: meta?.series_name ?? undefined,
    title: episode.title,
    meta: joinMeta(podcastHost(episode, unknownHost), formatMediaDuration(episode.duration)),
    body: episode.description ?? undefined,
  };
}
