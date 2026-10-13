/**
 * VTID-05108 — News focus feed (desktop Spotlight): which item goes where.
 *
 * Pure and IO-free. The stage shows content only (member posts, news
 * articles); everything else the feed already carries moves to the context
 * rail — the placement is decided by `feed-compose.ts` (`placement` field), not
 * here. Nothing is fetched or invented: the rail's "People to meet" block is
 * built from match / most-improved / new-member items the feed already holds.
 */
import { composeFeed, splitByPlacement } from '@/lib/feed-compose';
import type { NewsArticle } from '@/hooks/useNewsFeed';
import type {
  ArticleFeedItem,
  FeatureAnnouncementFeedItem,
  FeedItem,
  MatchFeedItem,
  NewMemberFeedItem,
  PerformerFeedItem,
  PostFeedItem,
} from '@/lib/news-feed-ranker';

export type StageItem =
  | { type: 'post'; key: string; item: PostFeedItem }
  | { type: 'article'; key: string; item: ArticleFeedItem }
  | { type: 'news'; key: string; article: NewsArticle };

export type PersonItem = MatchFeedItem | PerformerFeedItem | NewMemberFeedItem;

export interface FocusFeedModel {
  stage: StageItem[];
  people: PersonItem[];
  features: FeatureAnnouncementFeedItem[];
}

/** The unified, ranked "All" feed (feed v2). */
export function modelFromFeed(feedItems: FeedItem[]): FocusFeedModel {
  const { stream, rail } = splitByPlacement(composeFeed(feedItems, [] as never[]));
  const stage: StageItem[] = [];
  for (const e of stream) {
    if (e.type !== 'item') continue;
    const { item } = e;
    if (item.kind === 'post') stage.push({ type: 'post', key: item.id, item });
    else if (item.kind === 'article') stage.push({ type: 'article', key: item.id, item });
  }
  const people: PersonItem[] = [];
  const features: FeatureAnnouncementFeedItem[] = [];
  for (const e of rail) {
    if (e.type !== 'item') continue;
    const { item } = e;
    if (item.kind === 'feature_announcement') features.push(item);
    else if (item.kind === 'match' || item.kind === 'performer' || item.kind === 'new_member') people.push(item);
  }
  // Suggested people first (match, most improved), then newcomers to greet.
  people.sort((a, b) => Number(a.kind === 'new_member') - Number(b.kind === 'new_member'));
  return { stage, people, features };
}

/** The Longevity / Community tabs (and "All" while feed v2 is off): news items, new-member entries to the rail. */
export function modelFromArticles(articles: NewsArticle[]): FocusFeedModel {
  const stage: StageItem[] = [];
  const people: PersonItem[] = [];
  for (const article of articles) {
    if (article.member_user_id) {
      people.push({
        id: article.id,
        kind: 'new_member',
        published_at: article.published_at,
        user_id: article.member_user_id,
        display_name: article.member_display_name ?? null,
        avatar_url: article.image_url,
        bio: article.summary,
      });
    } else {
      stage.push({ type: 'news', key: article.id, article });
    }
  }
  return { stage, people, features: [] };
}

/** "Up next" — the items after the focused one, at most `count`. */
export function upNextOf<T>(stage: T[], focusedIndex: number, count = 3): T[] {
  return stage.slice(Math.max(0, focusedIndex) + 1, Math.max(0, focusedIndex) + 1 + count);
}
