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
  coverUrl?: string;
  roles: Array<'community'|'patient'|'professional'|'staff'|'admin'>;
  membershipTier?: 'vip' | 'standard' | null;

  bio?: string;
  links?: { label: string; url: string }[];
  languages?: string[];
  location?: string;

  stats: { posts: number; followers: number; following: number; mediaUploads: number; groupsJoined: number };
  vitanaIndex?: number;          // 0–999; present only if healthShareConsent=true
  vitanaPercentile?: number;     // optional for drawer
  longevityArchetype?: string;   // e.g., "The Mindful Mover"

  offerings?: ServiceOffering[]; // public shows when ≥1 published
  compliance?: ProfessionalCompliance;
  professionalCredentials?: ProfessionalCredentials;

  visibility: ProfileVisibility;
}

export type ViewAsMode = 'me' | 'public' | 'follower';