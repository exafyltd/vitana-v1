/**
 * VTID-05430 (Native Wave 2, public-profile lane) — the data shapes the public
 * profile renders. The subset of the web `UserProfile` (`src/types/profile.ts`)
 * that `PublicProfilePage.tsx` fills from `get_user_profile_by_identifier`, plus
 * the web `Milestone` (`useProfileMilestones.ts`), `GalleryPhoto`
 * (`useProfileGallery.ts`) and `ProfilePost` (`useProfilePosts.ts`) rows. Plain
 * types, re-declared natively because those web modules are class B.
 */
export interface PublicProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  coverUrl: string;
  bio: string;
  location: string;
  vitanaIndex?: number;
  longevityArchetype?: string;
  instagram_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  x_url?: string;
  memberSince?: string;
  accountType?: string;
  verificationStatus?: string;
  stats: { posts: number; followers: number; following: number; mediaUploads: number; groupsJoined: number };
}

export interface Milestone {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  milestone_date?: string;
  icon: string;
  is_public: boolean;
  sort_order: number;
}

export interface GalleryPhoto {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  sort_order: number;
  is_public: boolean;
}

export interface ProfilePost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_public: boolean;
  created_at: string;
}

export type PublicProfileData = { profile: PublicProfile; milestones: Milestone[]; galleryPhotos: GalleryPhoto[] };

/** What one lookup of `/u/:identifier` yields. */
export type PublicProfileResult =
  | ({ status: 'found' } & PublicProfileData)
  | { status: 'not-found' }
  | { status: 'redirect'; canonical: string }
  | { status: 'error'; reason: 'load-failed' | 'unexpected' };
