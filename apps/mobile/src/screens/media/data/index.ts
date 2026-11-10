/**
 * VTID-05677 — the real `MediaHubData` (design §3): the same tables, filters,
 * limits, buckets and gateway endpoint as web, on the app's Supabase client and
 * gateway. The route file provides it to `MediaHubDataProvider`. The screen
 * refetches the lists after a write (web calls `refetchShorts` / `refetchMusic`
 * / `refetchPodcasts` the same way).
 */
import type { MediaHubData } from '../../../ports/media';
import { toggleMusicBookmark, useBookmarksQuery } from './bookmarks';
import { addShortComment, deleteShortComment, toggleShortCommentLike, useShortCommentsQuery } from './comments';
import { useMusicQuery, usePodcastsQuery } from './lists';
import { deleteShort, editShort, toggleShortLike, useShortsQuery } from './shorts';
import { uploadAudio, uploadVideo } from './uploads';

export const realMediaHubData: MediaHubData = {
  useShorts: useShortsQuery,
  useMusic: useMusicQuery,
  usePodcasts: usePodcastsQuery,
  useBookmarks: useBookmarksQuery,
  useShortComments: useShortCommentsQuery,
  toggleLike: ({ videoId, action }) => toggleShortLike({ videoId, action }),
  toggleBookmark: toggleMusicBookmark,
  addComment: addShortComment,
  deleteComment: ({ commentId }) => deleteShortComment(commentId),
  toggleCommentLike: ({ commentId, liked }) => toggleShortCommentLike({ commentId, liked }),
  deleteShort,
  editShort,
  uploadVideo: (input) => uploadVideo(input),
  uploadAudio,
};
