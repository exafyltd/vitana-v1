import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileAchievementsStrip } from "./ProfileAchievementsStrip";
import { ProfileTabs } from "./ProfileTabs";
import PageHeader from "@/components/PageHeader";
import { AutopilotSuggestions } from "../AutopilotSuggestions";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface ProfileLayoutProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEditIdentity?: () => void;
  onEditAbout?: () => void;
  onEditServices?: () => void;
  onEditCompliance?: () => void;
  onEditShowcase?: () => void;
  onEditVisibility?: () => void;
}

export function ProfileLayout({ 
  profile, 
  scope, 
  editMode, 
  onEditIdentity,
  onEditAbout,
  onEditServices,
  onEditCompliance,
  onEditShowcase,
  onEditVisibility
}: ProfileLayoutProps) {
  // Mock achievements data - replace with real data from profile
  const mockAchievements = ['Mindfulness Master', 'Community Helper', 'Wellness Warrior'];
  const mockEngagementBadges = ['Posted 20+ videos', 'Joined 5+ groups', 'Daily meditation streak'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
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
          
          {/* Showcase Section - Single unified location */}
          {editMode && onEditShowcase && (
            <div className="bg-background rounded-lg border p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Showcase</h3>
                <Button variant="outline" size="sm" onClick={onEditShowcase}>
                  <Star className="h-4 w-4 mr-2" />
                  Manage Featured Content
                </Button>
              </div>
              <p className="text-muted-foreground">
                Select posts and content to feature at the top of your profile
              </p>
            </div>
          )}
          
          <ProfileTabs
            profile={profile} 
            scope={scope} 
            editMode={editMode}
            onEditAbout={onEditAbout}
            onEditServices={onEditServices}
            onEditCompliance={onEditCompliance}
            onEditVisibility={onEditVisibility}
          />
          
          {/* Floating Autopilot Suggestions - Subtle placement */}
          {editMode && (
            <div className="mt-8">
              <AutopilotSuggestions 
                type="profile-section"
                onSuggestionClick={(suggestion) => {
                  console.log('Autopilot suggestion clicked:', suggestion);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}