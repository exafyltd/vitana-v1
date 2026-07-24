import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
// VTID-02754 — "How we searched" card when arriving via find_community_member voice tool
import { WhyThisMatchCard } from "@/components/community/WhyThisMatchCard";
import { getScope } from "@/lib/profileScope";
import { UserProfile, DEFAULT_ACCOUNT_VISIBILITY, AccountVerificationStatus } from "@/types/profile";
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
  longevity_archetype: string;
  account_type: string;
  verification_status: string;
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

  // Monotonic request id. Only the most recent fetchProfile call is allowed to
  // write state — a slower/stale call (e.g. one kicked off by an auth-token
  // refresh that re-created the `user` object) can never clobber a freshly
  // loaded profile. Without this guard a transient re-fetch could overwrite a
  // good profile with null and surface "user not found".
  const reqIdRef = useRef(0);

  // Core profile fetch keyed ONLY on the identifier. It deliberately does NOT
  // depend on `user`: the public profile is identical regardless of who is
  // viewing, and `user` changes reference on every token refresh (~hourly and
  // on tab focus in the Appilix WebView). Re-running the destructive fetch on
  // those events is what flipped an already-rendered profile to "not found".
  useEffect(() => {
    if (identifier) {
      const reqId = ++reqIdRef.current;
      fetchProfile(identifier, reqId);
    } else {
      setLoading(false);
      setError("No profile identifier provided");
    }
  }, [identifier]);

  // Follow status is the only piece that genuinely depends on the viewer, so it
  // lives in its own effect. A failure here only affects the follow button — it
  // can never null out the profile.
  useEffect(() => {
    if (!user || !profile || profile.id === user.id) {
      setIsFollower(false);
      return;
    }
    let active = true;
    supabase
      .rpc('get_follow_status', { target_user_id: profile.id })
      .then(({ data }) => {
        if (active) setIsFollower(Boolean(data));
      })
      .catch((e) => console.warn('PublicProfilePage: get_follow_status failed', e));
    return () => {
      active = false;
    };
  }, [user, profile]);

  const fetchProfile = async (id: string, reqId: number) => {
    // Bail out of any state write if a newer request has superseded this one.
    const isStale = () => reqIdRef.current !== reqId;
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

      // A newer request superseded us while the RPC was in flight — drop out
      // without touching state.
      if (isStale()) return;

      if (dbError) {
        console.error('Database error:', dbError);
        setError('Failed to load profile');
        setProfile(null);
        return;
      }
      if (!data || data.length === 0) {
        console.log('No profile found for identifier:', cleanId);
        setProfile(null);
        return;
      }

      {
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
          longevityArchetype: dbProfile.longevity_archetype || undefined,
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
          // Mirrors the subset of Account-tab fields ("Public profile —
          // Shown on Identity") that are already visible on this same
          // Identity card above, so non-owner viewers don't see "—" for
          // data they can already see one tab over.
          account: {
            avatarUrl: dbProfile.avatar_url || undefined,
            handle: dbProfile.handle || undefined,
            longevityArchetype: dbProfile.longevity_archetype || undefined,
            memberSince: dbProfile.created_at || undefined,
            accountType: dbProfile.account_type || undefined,
            verificationStatus: (dbProfile.verification_status as AccountVerificationStatus) || undefined,
            visibility: DEFAULT_ACCOUNT_VISIBILITY,
          },
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
        
        if (isStale()) return;
        setProfile(transformedProfile);

        // Secondary, non-critical data (milestones + gallery). A failure here
        // must NEVER null the profile we just rendered, so it gets its own
        // try/catch isolated from the core-lookup error handling below. This
        // was the bug behind the intermittent "user not found": a transient
        // failure on these calls used to fall into the outer catch and wipe a
        // perfectly good profile.
        try {
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

          if (isStale()) return;
          setMilestones((milestonesRes.data || []) as Milestone[]);
          setGalleryPhotos((galleryRes.data || []) as GalleryPhoto[]);
        } catch (secondaryErr) {
          console.warn('PublicProfilePage: secondary profile data failed', secondaryErr);
        }
      }
    } catch (err) {
      // Only the core profile lookup reaches here. We still avoid nulling an
      // already-rendered profile when a newer request is in flight.
      console.error('Error fetching profile:', err);
      if (!isStale()) {
        setError('An unexpected error occurred');
        setProfile(null);
      }
    } finally {
      if (!isStale()) setLoading(false);
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
            {t('screens.publicprofilepage.returnHome')}
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

      {/* VTID-02754 — Show "How we searched" card when the user arrived
          here via the find_community_member voice tool. The query param
          search_id keys the cached match_recipe in the gateway. */}
      {searchParams.get('from') === 'who_search' && searchParams.get('search_id') ? (
        <div className="container max-w-3xl mx-auto px-4 mt-3">
          <WhyThisMatchCard
            searchId={searchParams.get('search_id') as string}
            currentVitanaId={profile.handle ?? null}
          />
        </div>
      ) : null}

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