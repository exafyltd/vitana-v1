// Profile-related TypeScript interfaces based on CTO specifications

export type Visibility = 'public' | 'followers' | 'private';

export interface ProfileVisibility {
  about: Visibility;
  links: Visibility;
  location: Visibility;
  showcase: Visibility;
  indexPublic: boolean;           // derived from healthShareConsent
  healthShareConsent: boolean;    // controls Health Snapshot + Index on public
}

// Account tab — per-field visibility rule. "connections" ≈ followers/mutuals.
export type FieldVisibility = 'private' | 'connections' | 'public';

export type AccountFieldKey =
  | 'firstName'
  | 'lastName'
  | 'dateOfBirth'
  | 'gender'
  | 'maritalStatus'
  | 'email'
  | 'phone'
  | 'address'
  | 'country'
  | 'city'
  | 'memberSince'
  | 'accountType'
  | 'verificationStatus'
  | 'handle'
  | 'avatarUrl'
  | 'longevityArchetype';

export type AccountVisibility = Record<AccountFieldKey, FieldVisibility>;

export type AccountVerificationStatus = 'unverified' | 'pending' | 'verified';

export interface AccountInfo {
  // Basic Personal Information
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;          // ISO yyyy-mm-dd
  gender?: string;
  maritalStatus?: string;

  // Contact Information
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  city?: string;

  // Account Details
  memberSince?: string;          // ISO; derived from profiles.created_at
  accountType?: string;          // e.g. "Community", "Professional", "Staff"
  tenantId?: string;
  role?: string;
  verificationStatus?: AccountVerificationStatus;

  // Public profile (previously edited in Identity drawer)
  handle?: string;
  avatarUrl?: string;
  avatarOffsetX?: number;        // 0-100, avatar image position
  avatarOffsetY?: number;
  longevityArchetype?: string;

  // Privacy
  visibility: AccountVisibility;
}

export const DEFAULT_ACCOUNT_VISIBILITY: AccountVisibility = {
  firstName: 'private',
  lastName: 'private',
  dateOfBirth: 'private',
  gender: 'private',
  maritalStatus: 'private',
  email: 'private',
  phone: 'private',
  address: 'private',
  country: 'connections',
  city: 'connections',
  memberSince: 'public',
  accountType: 'public',
  verificationStatus: 'public',
  handle: 'public',
  avatarUrl: 'public',
  longevityArchetype: 'public',
};

export interface ServiceOffering {
  id: string;
  title: string;
  durationMin: number;
  priceCents?: number;            // omit or 0 = free
  currency?: string;
  nextTimes?: string[];           // ISO
  status: 'draft' | 'published';
}

export interface CoachingSpecialty {
  id: string;
  type: 'fitness' | 'mental' | 'nutrition' | 'wellness' | 'other';
  title: string;
  sessionsHeld: number;
  participantsHelped: number;
  rating: number;
  totalRatings: number;
  subscribers: number;
  certifications: Certification[];
  isActive: boolean;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialUrl?: string;
  badgeImageUrl?: string;
  verified: boolean;
}

export interface ProfessionalCompliance {
  isProfessional: boolean;
  licenseVerified: boolean;
  licenseFiles?: string[];
  specialties?: string[];
}

export interface ProfessionalCredentials {
  coachingSpecialties: CoachingSpecialty[];
  overallRating: number;
  totalSessions: number;
  totalParticipants: number;
  totalSubscribers: number;
  isLiveStreamingEnabled: boolean;
  currentlyLive: boolean;
  liveSessionTitle?: string;
  liveViewerCount?: number;
}

export interface UserProfile {
  id: string;
  user_id?: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
  coverUrl?: string;
  roles: Array<'community'|'patient'|'professional'|'staff'|'admin'>;
  membershipTier?: 'vip' | 'standard' | null;
  theme?: 'serenity' | 'focus' | 'expression';

  bio?: string;
  links?: { label: string; url: string }[];
  languages?: string[];
  location?: string;

  // LinkedIn
  linkedin_url?: string;
  linkedin_synced_at?: string;
  linkedin_headline?: string;
  linkedin_summary?: string;
  linkedin_skills?: string[];

  // Instagram
  instagram_url?: string;
  instagram_synced_at?: string;
  instagram_bio?: string;
  instagram_followers_count?: number;
  instagram_interests?: string[];

  // TikTok
  tiktok_url?: string;
  tiktok_synced_at?: string;
  tiktok_bio?: string;
  tiktok_followers_count?: number;
  tiktok_content_themes?: string[];

  // YouTube
  youtube_url?: string;
  youtube_synced_at?: string;
  youtube_description?: string;
  youtube_subscribers_count?: number;
  youtube_content_categories?: string[];

  // Facebook
  facebook_url?: string;
  facebook_synced_at?: string;
  facebook_bio?: string;
  facebook_interests?: string[];

  // X (Twitter)
  x_url?: string;
  x_synced_at?: string;
  x_bio?: string;
  x_followers_count?: number;
  x_topics?: string[];

  stats: { posts: number; followers: number; following: number; mediaUploads: number; groupsJoined: number };
  vitanaIndex?: number;          // 0–999; present only if healthShareConsent=true
  vitanaPercentile?: number;     // optional for drawer
  longevityArchetype?: string;   // e.g., "The Mindful Mover"

  offerings?: ServiceOffering[]; // public shows when ≥1 published
  compliance?: ProfessionalCompliance;
  professionalCredentials?: ProfessionalCredentials;

  visibility: ProfileVisibility;

  // Account tab — fixed + editable personal data with per-field visibility
  account?: AccountInfo;
}

export type ViewAsMode = 'me' | 'public' | 'follower';