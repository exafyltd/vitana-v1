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