import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileAchievementsStrip } from "./ProfileAchievementsStrip";
import { ProfileTabs } from "./ProfileTabs";
import PageHeader from "@/components/PageHeader";
import { AutopilotSuggestions } from "../AutopilotSuggestions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, Zap } from "lucide-react";

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
      <div className="space-y-8">
        <div className="max-w-6xl mx-auto">
          <ProfileHeader 
            profile={profile}
            scope={scope}
            editMode={editMode}
            onEdit={onEditIdentity}
          />
        </div>
        
        <ProfileStats profile={profile} />
        
        <ProfileAchievementsStrip 
          achievements={mockAchievements}
          engagementBadges={mockEngagementBadges}
        />
        
        {/* Showcase Section - Single unified location */}
        {editMode && onEditShowcase && (
          <div className="px-6">
            <div className="max-w-6xl mx-auto">
              <div className="bg-background rounded-lg border p-6 shadow-sm">
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
            </div>
          </div>
        )}
        
        {/* Autopilot Suggestions - Positioned after Showcase */}
        {editMode && (
          <div className="px-6">
            <div className="max-w-6xl mx-auto">
              <AutopilotSuggestions 
                type="profile-section"
                onSuggestionClick={(suggestion) => {
                  console.log('Autopilot suggestion clicked:', suggestion);
                }}
              />
            </div>
          </div>
        )}
        
        <div className="px-6">
          <div className="max-w-6xl mx-auto">
            <ProfileTabs
              profile={profile} 
              scope={scope} 
              editMode={editMode}
              onEditAbout={onEditAbout}
              onEditServices={onEditServices}
              onEditCompliance={onEditCompliance}
              onEditVisibility={onEditVisibility}
            />
          </div>
        </div>
        
        {/* Floating Autopilot Button - Always visible during edit mode */}
        {editMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90 z-50"
                  onClick={() => {
                    // Trigger the autopilot popup
                    const autopilotElement = document.querySelector('[data-autopilot-trigger]') as HTMLElement;
                    if (autopilotElement) {
                      autopilotElement.click();
                    }
                  }}
                >
                  <Zap className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Autopilot Assist</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}