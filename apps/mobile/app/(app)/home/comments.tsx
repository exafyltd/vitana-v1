/**
 * VTID-05297 (Native Wave 2, home-feed lane) — `/home/comments`, the comments
 * deep link (a feed push tap target). Mirrors the web `src/pages/Home.tsx`
 * `commentsDeepLinkActive` behaviour: render the feed and auto-open the first
 * commentable post's comments on mount, a transient flag that clears shortly
 * after so a later re-render cannot re-force a sheet the member closed.
 */
import { HomeScreen } from '../../../src/screens/home/HomeScreen';

export default function HomeCommentsRoute() {
  return <HomeScreen openCommentsOnMount />;
}
