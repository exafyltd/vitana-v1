/**
 * VTID-05430 (Native Wave 2, public-profile lane) — fixture rows for the public
 * profile reads (`get_user_profile_by_identifier`, `get_public_vitana_index`,
 * `profile_milestones`, `profile_gallery`, `profile_posts`, groups). Invented
 * test data, no real member.
 */
export const PROFILE_ID = '11111111-2222-4333-8444-555555555555';
export const VIEWER_ID = 'u-viewer';

export const dbProfile = {
  user_id: PROFILE_ID,
  display_name: 'Lena Test',
  full_name: 'Lena Fixture',
  handle: 'lenatest',
  avatar_url: 'https://cdn.example.org/avatar.png',
  cover_url: '',
  bio: 'Bewegung, Schlaf und gutes Essen.',
  location: 'Berlin',
  created_at: '2025-01-01T00:00:00Z',
  instagram_url: 'https://instagram.example.org/lenatest',
  tiktok_url: 'https://tiktok.example.org/@lenatest',
  linkedin_url: null,
  youtube_url: null,
  facebook_url: null,
  x_url: null,
  longevity_archetype: 'explorer',
  account_type: 'community',
  verification_status: 'unverified',
};

export const milestones = [
  { id: 'm-1', user_id: PROFILE_ID, title: 'Erster Marathon', description: 'Berlin 2024', milestone_date: '2024-09-29', icon: '🏃', is_public: true, sort_order: 0, created_at: '2024-10-01', updated_at: '2024-10-01' },
  { id: 'm-2', user_id: PROFILE_ID, title: 'Yoga-Ausbildung', milestone_date: '2023-05-01', icon: '🧘', is_public: true, sort_order: 1, created_at: '2023-05-02', updated_at: '2023-05-02' },
];

export const photos = [
  { id: 'p-1', user_id: PROFILE_ID, image_url: 'https://cdn.example.org/p1.jpg', caption: 'Morgenlauf', sort_order: 0, is_public: true, created_at: '2024-01-01' },
  { id: 'p-2', user_id: PROFILE_ID, image_url: 'https://cdn.example.org/p2.jpg', sort_order: 1, is_public: true, created_at: '2024-01-02' },
];

export const posts = [
  { id: 'post-1', user_id: PROFILE_ID, content: 'Heute 10 km gelaufen.', image_url: null, video_url: null, likes_count: 3, comments_count: 1, shares_count: 0, is_public: true, created_at: '2025-03-01T08:00:00Z' },
];

export const groupMemberships = [{ group_id: 'g-1', user_id: PROFILE_ID, role: 'member', joined_at: '2025-02-01T00:00:00Z' }];
export const groups = [{ id: 'g-1', name: 'Läufer Berlin', description: null, category: 'fitness', cover_url: null, avatar_url: null, member_count: 42, status: 'approved', created_by: 'someone-else' }];
