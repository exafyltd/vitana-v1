/**
 * VTID-05430 (Native Wave 2, public-profile lane) — the member's groups through
 * one port. The community-hub lane owns the native twin of the web
 * `useUserGroups` (VTID-05296, src/screens/community/data/groups.ts); the
 * public profile's Groups tab (web `MobileGroupsTabContent`, which calls the
 * same hook) consumes that one owner through this port rather than reaching
 * into the community lane's screen folder directly — the pattern
 * src/ports/news-card.ts follows.
 */
export { useUserGroups, type UserGroup } from '../screens/community/data/groups';
