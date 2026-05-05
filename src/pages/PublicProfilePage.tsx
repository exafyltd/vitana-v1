import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { ProfileLayout } from "@/components/profile/shared/ProfileLayout";
// VTID-DANCE-D5/D9
import { DancePublicSection } from "@/components/profile/sections/DancePublicSection";
// E2
import { PartnerPreferencesPublicSection } from "@/components/profile/sections/PartnerPreferencesPublicSection";
import { ServiceOfferingsPublicSection } from "@/components/profile/sections/ServiceOfferingsPublicSection";
import { MyPostsSection } from "@/components/profile/sections/MyPostsSection";
import { PublicProfileLanding } from "@/components/profile/public/PublicProfileLanding";
import { getScope } from "@/lib/profileScope";
import { UserProfile } from "@/types/profile";
import { useAuth } from "@/context/AuthProvider";
import { Milestone } from "@/hooks/useProfileMilestones";
import { GalleryPhoto } from "@/hooks/useProfileGallery";
import { t } from '@/lib/i18n-toast';

interface DatabaseProfile {
  user_id: string;
  display_name: string;
  full_name: string;
  handle: string;
  avatar_url: string;
  cover_url: string;
  bio: string;
  email: string;
  location: string;
  created_at: string;
  linkedin_url: string;
  linkedin_headline: string;
  linkedin_summary: string;
  linkedin_synced_at: string;
  instagram_url: string;
  instagram_bio: string;
  instagram_followers_count: number;
  instagram_synced_at: string;
  instagram_interests: string[];
  tiktok_url: string;
  tiktok_bio: string;
  tiktok_followers_count: number;
  tiktok_synced_at: string;
  tiktok_content_themes: string[];
  youtube_url: string;
  youtube_description: string;
  youtube_subscribers_count: number;
  youtube_synced_at: string;
  youtube_content_categories: string[];
  facebook_url: string;
  facebook_bio: string;
  facebook_synced_at: string;
  facebook_interests: string[];
  x_url: string;
  x_bio: string;
  x_followers_count: number;
  x_synced_at: string;
  x_topics: string[];
}

export default function PublicProfilePage() {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollower, setIsFollower] = useState(false);

  const isSharedLink = searchParams.get('utm_source') === 'profile' || !user;

  useEffect(() => {
    if (identifier) {
      fetchProfile(identifier);
    } else {
      setLoading(false);
      setError("No profile identifier provided");
    }
  }, [identifier, user]);

  const fetchProfile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clean identifier (remove @ if present)
      const cleanId = id.startsWith('@') ? id.slice(1) : id;

      console.log('PublicProfilePage: Fetching profile for identifier:', cleanId);

      let { data, error: dbError } = await supabase
        .rpc('get_user_profile_by_identifier', { identifier: cleanId });

      // VTID-01967: alias-redirect fallback. If the identifier doesn't match
      // a current profiles.handle (which is now a mirror of vitana_id under
      // the replace policy), check handle_aliases for a legacy mapping and
      // redirect to the canonical /u/<vitana_id> URL.
      if (!dbError && (!data || data.length === 0) && cleanId) {
        try {
          const { data: aliasRow } = await (supabase as any)
            .from('handle_aliases')
            .select('user_id')
            .eq('old_handle', cleanId.toLowerCase())
            .maybeSingle();
          if (aliasRow?.user_id) {
            const { data: canonicalProfile } = await supabase
              .from('profiles')
              .select('handle, vitana_id')
              .eq('user_id', aliasRow.user_id)
              .maybeSingle();
            const canonical =
              (canonicalProfile as any)?.vitana_id ||
              (canonicalProfile as any)?.handle;
            if (canonical && canonical !== cleanId) {
              console.log(`[VTID-01967] alias redirect: @${cleanId} -> @${canonical}`);
              navigate(`/u/${canonical}`, { replace: true });
              return;
            }
          }
        } catch (aliasErr) {
          console.warn('[VTID-01967] alias lookup failed:', aliasErr);
        }
      }

      if (dbError) {
        console.error('Database error:', dbError);
        setError('Failed to load profile');
        setProfile(null);
      } else if (!data || data.length === 0) {
        console.log('No profile found for identifier:', cleanId);
        setProfile(null);
      } else {
        const dbProfile = data[0] as DatabaseProfile;
        console.log('Found profile:', dbProfile);

        // Live Vitana Index via public RPC (SECURITY DEFINER). Returns null
        // when the user has no Index yet — we render the card without the
        // Index badge rather than a fake hash-derived number.
        let vitanaScore: number | null = null;
        try {
          const { data: indexData, error: indexErr } = await (supabase as any)
            .rpc('get_public_vitana_index', { p_user_id: dbProfile.user_id });
          if (!indexErr) {
            const row = Array.isArray(indexData) ? indexData[0] : indexData;
            const raw = row?.score_total;
            if (typeof raw === 'number' && raw > 0) vitanaScore = raw;
          }
        } catch (e) {
          console.warn('PublicProfilePage: get_public_vitana_index failed', e);
        }

        const transformedProfile: UserProfile = {
          id: dbProfile.user_id,
          name: dbProfile.display_name || dbProfile.full_name || 'Unknown User',
          handle: dbProfile.handle || '',
          avatarUrl: dbProfile.avatar_url || '',
          coverUrl: dbProfile.cover_url || '',
          bio: dbProfile.bio || '',
          location: dbProfile.location || '',
          roles: ['community'],
          membershipTier: 'standard',
          links: [],
          languages: ['English'],
          vitanaIndex: vitanaScore ?? undefined,
          vitanaPercentile: vitanaScore ? Math.min(99, Math.floor((vitanaScore / 999) * 100)) : undefined,
          // LinkedIn
          linkedin_url: dbProfile.linkedin_url || undefined,
          linkedin_headline: dbProfile.linkedin_headline || undefined,
          linkedin_summary: dbProfile.linkedin_summary || undefined,
          linkedin_synced_at: dbProfile.linkedin_synced_at || undefined,
          // Instagram
          instagram_url: dbProfile.instagram_url || undefined,
          instagram_bio: dbProfile.instagram_bio || undefined,
          instagram_followers_count: dbProfile.instagram_followers_count || undefined,
          instagram_synced_at: dbProfile.instagram_synced_at || undefined,
          instagram_interests: dbProfile.instagram_interests || undefined,
          // TikTok
          tiktok_url: dbProfile.tiktok_url || undefined,
          tiktok_bio: dbProfile.tiktok_bio || undefined,
          tiktok_followers_count: dbProfile.tiktok_followers_count || undefined,
          tiktok_synced_at: dbProfile.tiktok_synced_at || undefined,
          tiktok_content_themes: dbProfile.tiktok_content_themes || undefined,
          // YouTube
          youtube_url: dbProfile.youtube_url || undefined,
          youtube_description: dbProfile.youtube_description || undefined,
          youtube_subscribers_count: dbProfile.youtube_subscribers_count || undefined,
          youtube_synced_at: dbProfile.youtube_synced_at || undefined,
          youtube_content_categories: dbProfile.youtube_content_categories || undefined,
          // Facebook
          facebook_url: dbProfile.facebook_url || undefined,
          facebook_bio: dbProfile.facebook_bio || undefined,
          facebook_synced_at: dbProfile.facebook_synced_at || undefined,
          facebook_interests: dbProfile.facebook_interests || undefined,
          // X (Twitter)
          x_url: dbProfile.x_url || undefined,
          x_bio: dbProfile.x_bio || undefined,
          x_followers_count: dbProfile.x_followers_count || undefined,
          x_synced_at: dbProfile.x_synced_at || undefined,
          x_topics: dbProfile.x_topics || undefined,
          stats: {
            posts: 0,
            followers: 0,
            following: 0,
            mediaUploads: 0,
            groupsJoined: 0
          },
          visibility: {
            about: 'public',
            links: 'public',
            location: 'public',
            showcase: 'public',
            indexPublic: true,
            healthShareConsent: true
          }
        };
        
        setProfile(transformedProfile);

        // Fetch milestones and gallery in parallel
        const [milestonesRes, galleryRes] = await Promise.all([
          supabase
            .from('profile_milestones')
            .select('*')
            .eq('user_id', dbProfile.user_id)
            .eq('is_public', true)
            .order('milestone_date', { ascending: false }),
          supabase
            .from('profile_gallery')
            .select('*')
            .eq('user_id', dbProfile.user_id)
            .eq('is_public', true)
            .order('sort_order', { ascending: true }),
        ]);

        setMilestones((milestonesRes.data || []) as Milestone[]);
        setGalleryPhotos((galleryRes.data || []) as GalleryPhoto[]);

        // Fetch follow status if user is authenticated
        if (user && transformedProfile.id !== user.id) {
          const { data: followStatus } = await supabase
            .rpc('get_follow_status', { target_user_id: transformedProfile.id });
          setIsFollower(followStatus || false);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('An unexpected error occurred');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t('screens.publicprofilepage.loadingProfile')}</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('screens.publicprofilepage.userNotFound')}</h1>
          <p className="text-muted-foreground mb-4">
            {error || "The profile you're looking for doesn't exist."}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Return to Home
          </button>
        </div>
      </AppLayout>
    );
  }

  const scopeContext = {
    isOwner: user?.id === profile.id,
    isFollower: isFollower,
    editMode: false
  };

  const scope = getScope(scopeContext);

  // Show immersive landing for shared links / unauthenticated users
  if (isSharedLink) {
    return (
      <>
        <SEO 
          title={`${profile.name} (@${profile.handle}) - VITANA`}
          description={profile.bio || `${profile.name}'s profile on VITANA`}
          image={profile.avatarUrl}
          imageAlt={`${profile.name}'s profile photo`}
          url={`https://vitana-v1.lovable.app/u/${profile.handle}`}
        />
        <PublicProfileLanding 
          profile={profile} 
          milestones={milestones} 
          galleryPhotos={galleryPhotos} 
        />
      </>
    );
  }

  return (
    <AppLayout>
      <SEO 
        title={`${profile.name} (@${profile.handle}) - VITANA`}
        description={profile.bio || `${profile.name}'s profile on VITANA`}
        image={profile.avatarUrl}
        imageAlt={`${profile.name}'s profile photo`}
        url={`https://vitana-v1.lovable.app/u/${profile.handle}`}
      />
      
      <ProfileLayout
        profile={profile}
        scope={scope}
        editMode={false}
      />

      {/* VTID-DANCE-D5/D9: dance preferences (visibility-honoring) */}
      <div className="container max-w-3xl mx-auto px-4 space-y-3">
        <DancePublicSection userId={profile.id} isOwn={false} />
        {/* E5 — partner preferences. Cross-user fetch via gateway with
            server-side visibility filter applied per the subject's
            account_visibility map. */}
        <PartnerPreferencesPublicSection userId={profile.id} vitanaId={profile.handle} />
        {/* E5 — service offerings. Default-public; priceRange may be
            redacted per-row by the server. */}
        <ServiceOfferingsPublicSection userId={profile.id} vitanaId={profile.handle} />
        {/* E1 / E2 — owner's open posts (partner_seek excluded by hardcoded rule). */}
        <MyPostsSection userId={profile.id} />
      </div>
    </AppLayout>
  );
}