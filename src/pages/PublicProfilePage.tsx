import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { UserProfile } from "@/types/profile";
import { ProfileLayout } from "@/components/profile/shared/ProfileLayout";
import { getScope } from "@/lib/profileScope";

// Mock data - replace with real API calls
const mockUsers: Record<string, UserProfile> = {
  'sarahwellness': {
    id: '1',
    name: 'Sarah Miller',
    handle: 'sarahwellness',
    avatarUrl: '/lovable-uploads/sarah-miller-avatar.jpg',
    roles: ['community', 'professional'],
    membershipTier: 'vip',
    bio: 'Passionate about helping others find inner peace through mindful movement and breathing techniques. Certified yoga instructor with 8+ years of experience in holistic wellness.',
    location: 'San Francisco, CA',
    links: [
      { label: 'Website', url: 'https://sarahwellness.com' },
      { label: 'Instagram', url: 'https://instagram.com/sarahwellness' }
    ],
    languages: ['English', 'Spanish'],
    stats: {
      posts: 142,
      followers: 1250,
      following: 380,
      mediaUploads: 24,
      groupsJoined: 8
    },
    vitanaIndex: 784,
    vitanaPercentile: 85,
    offerings: [
      {
        id: '1',
        title: 'Mindful Movement Session',
        durationMin: 60,
        priceCents: 8000,
        currency: 'USD',
        nextTimes: ['2024-01-15T14:00:00Z', '2024-01-16T10:00:00Z'],
        status: 'published'
      }
    ],
    compliance: {
      isProfessional: true,
      licenseVerified: true,
      specialties: ['Yoga Therapy', 'Mindfulness', 'Stress Management']
    },
    visibility: {
      about: 'public',
      links: 'public',
      location: 'public',
      showcase: 'public',
      indexPublic: true,
      healthShareConsent: true
    }
  },
  'dr-roberts': {
    id: '2',
    name: 'Dr. Roberts',
    handle: 'drroberts_md',
    avatarUrl: '/lovable-uploads/dr-roberts-avatar.jpg',
    roles: ['professional', 'community'],
    bio: 'Board-certified physician specializing in preventive medicine and holistic wellness.',
    location: 'Austin, TX',
    stats: {
      posts: 89,
      followers: 2150,
      following: 156,
      mediaUploads: 15,
      groupsJoined: 5
    },
    vitanaIndex: 896,
    vitanaPercentile: 95,
    compliance: {
      isProfessional: true,
      licenseVerified: true,
      specialties: ['Preventive Medicine', 'Cardiology']
    },
    visibility: {
      about: 'public',
      links: 'public',
      location: 'public',
      showcase: 'public',
      indexPublic: true,
      healthShareConsent: true
    }
  }
};

export default function PublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (handle) {
      // Simulate API call
      setTimeout(() => {
        const foundProfile = mockUsers[handle];
        setProfile(foundProfile || null);
        setLoading(false);
      }, 100);
    } else {
      setLoading(false);
    }
  }, [handle]);

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

  if (!profile) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground mb-4">The profile you're looking for doesn't exist.</p>
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
    isOwner: false, // TODO: Check if current user owns this profile
    isFollower: false, // TODO: Check if current user follows this profile
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