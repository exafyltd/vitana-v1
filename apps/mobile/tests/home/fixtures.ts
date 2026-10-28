/**
 * VTID-05297 (Native Wave 2, home-feed lane) — composed fixtures for the Home
 * feed tests: one `FeedItem` per kind (article, post, feature_announcement,
 * performer, new_member), the `NewsArticle` rows the community tab renders, an
 * `EnrichmentCard`, and the loaded / empty / error shapes the mocked data hooks
 * return. No network — the gateway / Supabase doubles are installed by
 * makeWrapper; these are plain in-memory objects. React 19: type-only exports,
 * no `JSX`.
 */
import type {
  ArticleFeedItem,
  FeatureAnnouncementFeedItem,
  NewMemberFeedItem,
  PerformerFeedItem,
  PostFeedItem,
} from '../../src/ports/feed';
import type { EnrichmentCard } from '../../src/screens/home/data/enrichment';
import type { NewsArticle } from '../../src/screens/home/types';

export const articleItem: ArticleFeedItem = {
  id: 'article-a-1',
  kind: 'article',
  source_name: 'Longevity Daily',
  title: 'NMN and the cell',
  summary: 'A study on NMN.',
  image_url: 'https://cdn.example.org/primary.jpg',
  link: 'https://example.org/nmn',
  tags: ['supplements'],
  published_at: '2026-10-05T00:00:00.000Z',
};

export const postItem: PostFeedItem = {
  id: 'post-p-1',
  kind: 'post',
  source: 'post',
  post_id: 'p-1',
  user_id: 'u-2',
  author_name: 'Mara',
  author_avatar: null,
  content: 'Heute 5 km gelaufen 🏃',
  image_url: null,
  video_url: null,
  background_style: null,
  mentions: [],
  likes_count: 3,
  comments_count: 1,
  followed: false,
  tags: [],
  attached_ref: null,
  published_at: '2026-10-04T00:00:00.000Z',
};

export const featureItem: FeatureAnnouncementFeedItem = {
  id: 'feature-announcement-f-1',
  kind: 'feature_announcement',
  variant: 'brand-new-feature',
  feature_title: 'Neuer Feed',
  description: 'Entdecke deinen neuen Feed.',
  deep_link: '/home',
  published_at: '2026-10-03T00:00:00.000Z',
};

export const performerItem: PerformerFeedItem = {
  id: 'performer-u-3',
  kind: 'performer',
  user_id: 'u-3',
  display_name: 'Tom',
  avatar_url: null,
  improvement: 12,
  published_at: '2026-10-02T00:00:00.000Z',
};

export const newMemberItem: NewMemberFeedItem = {
  id: 'new-member-u-4',
  kind: 'new_member',
  user_id: 'u-4',
  display_name: 'Lena',
  avatar_url: null,
  bio: 'Neu hier und gespannt.',
  published_at: '2026-10-01T00:00:00.000Z',
};

/** One of every renderable kind, newest first (the order rankFeed would leave them in). */
export const allKinds = [articleItem, postItem, featureItem, performerItem, newMemberItem];

export const enrichmentCard: EnrichmentCard = {
  card_type: 'E1',
  category: 'enrichment',
  priority: 10,
  title: 'Vervollständige dein Profil',
  description: 'Ein paar Angaben fehlen noch.',
};

/** The chronological community articles (community tab): a member row + an article row. */
export const communityArticles: NewsArticle[] = [
  {
    id: 'member-m-1',
    source: 'community',
    source_name: 'MAXINA Community',
    title: 'Lena',
    link: '/u/u-4',
    member_user_id: 'u-4',
    member_display_name: 'Lena',
    summary: 'Neu hier.',
    image_url: null,
    published_at: '2026-10-06T00:00:00.000Z',
    tags: ['member_spotlight'],
    category: 'member_spotlight',
  },
  {
    id: 'event-e-1',
    source: 'community',
    source_name: 'MAXINA Community',
    title: 'Morgen-Yoga',
    link: '/comm/events-meetups',
    summary: 'Gemeinsames Yoga.',
    image_url: null,
    published_at: '2026-10-05T00:00:00.000Z',
    tags: ['community_event'],
    category: 'community_event',
  },
];
