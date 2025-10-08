import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { ProfileLayout } from "@/components/profile/shared/ProfileLayout";
import { getScope } from "@/lib/profileScope";
import { UserProfile } from "@/types/profile";
import { useAuth } from "@/context/AuthProvider";

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollower, setIsFollower] = useState(false);

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
      
      const { data, error: dbError } = await supabase
        .rpc('get_user_profile_by_identifier', { identifier: cleanId });

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
        
        // Transform database profile to UserProfile format
        // Generate a consistent VITANA Index score based on user_id for demo purposes
        const userIdHash = dbProfile.user_id.split('-')[0];
        const hashValue = parseInt(userIdHash.substring(0, 8), 16);
        const vitanaScore = 500 + (hashValue % 400); // Range: 500-899
        
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
          vitanaIndex: vitanaScore,
          vitanaPercentile: Math.min(95, Math.floor((vitanaScore / 999) * 100)),
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
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
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

  return (
    <AppLayout>
      <SEO 
        title={`${profile.name} (@${profile.handle}) - VITANA`}
        description={profile.bio || `${profile.name}'s profile on VITANA`}
      />
      
      <ProfileLayout 
        profile={profile}
        scope={scope}
        editMode={false}
      />
    </AppLayout>
  );
}