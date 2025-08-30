import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileAchievementsStrip } from "./ProfileAchievementsStrip";
import { ProfileTabs } from "./ProfileTabs";
import PageHeader from "@/components/PageHeader";

interface ProfileLayoutProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEditIdentity?: () => void;
}

export function ProfileLayout({ profile, scope, editMode, onEditIdentity }: ProfileLayoutProps) {
  // Mock achievements data - replace with real data from profile
  const mockAchievements = ['Mindfulness Master', 'Community Helper', 'Wellness Warrior'];
  const mockEngagementBadges = ['Posted 20+ videos', 'Joined 5+ groups', 'Daily meditation streak'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <PageHeader
        title={editMode ? "Edit Profile" : profile.name}
        description={editMode ? "Customize your public presence" : profile.bio || ""}
      />
      
      <div className="px-6 space-y-8">
        <div className="max-w-6xl mx-auto">
          <ProfileHeader 
            profile={profile}
            scope={scope}
            editMode={editMode}
            onEdit={onEditIdentity}
          />
          
          <ProfileStats profile={profile} />
          
          <ProfileAchievementsStrip 
            achievements={mockAchievements}
            engagementBadges={mockEngagementBadges}
          />
          
          <ProfileTabs profile={profile} scope={scope} />
        </div>
      </div>
    </div>
  );
}