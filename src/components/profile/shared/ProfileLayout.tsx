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
import { CommunityImpactWidget } from "../community/CommunityImpactWidget";
import { SuccessStoryCarousel } from "../community/SuccessStoryCarousel";
import { CompatibilityIndicator } from "../engagement/CompatibilityIndicator";
import { ContextualCTAs } from "../engagement/ContextualCTAs";
import { ViewModeIntelligence } from "../engagement/ViewModeIntelligence";
import { SmartEditingToolbar } from "../editor/SmartEditingToolbar";
import { ProfileProgressCard } from "../editor/ProfileProgressCard";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useState, useCallback } from "react";

interface ProfileLayoutProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  isOwnProfile?: boolean;
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
  isOwnProfile = false,
  onEditIdentity,
  onEditAbout,
  onEditServices,
  onEditCompliance,
  onEditShowcase,
  onEditVisibility
}: ProfileLayoutProps) {
  // Smart editing state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editHistory, setEditHistory] = useState<UserProfile[]>([profile]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Mock achievements data - replace with real data from profile
  const mockAchievements = ['Mindfulness Master', 'Community Helper', 'Wellness Warrior'];
  const mockEngagementBadges = ['Posted 20+ videos', 'Joined 5+ groups', 'Daily meditation streak'];

  // Auto-save functionality
  const handleSaveProfile = useCallback(async (updatedProfile: UserProfile) => {
    // TODO: Implement actual profile saving logic
    console.log('Saving profile:', updatedProfile);
    // This would typically call a Supabase update function
  }, []);

  const { forceSave, hasUnsavedChanges, isSaving } = useAutoSave({
    data: profile,
    onSave: handleSaveProfile,
    enabled: editMode
  });

  // History management
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < editHistory.length - 1;

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1);
    }
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [canRedo]);

  // Section navigation
  const handleSectionClick = useCallback((sectionId: string) => {
    switch (sectionId) {
      case 'identity':
        onEditIdentity?.();
        break;
      case 'about':
        onEditAbout?.();
        break;
      case 'avatar':
      case 'cover':
        onEditShowcase?.();
        break;
      case 'location':
      case 'links':
      case 'languages':
        onEditAbout?.();
        break;
      case 'services':
        onEditServices?.();
        break;
      default:
        console.log('Unknown section:', sectionId);
    }
  }, [onEditIdentity, onEditAbout, onEditShowcase, onEditServices]);

  const effectiveEditMode = editMode && !isPreviewMode;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Smart Editing Toolbar */}
      {editMode && (
        <SmartEditingToolbar
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          isPreviewMode={isPreviewMode}
          canUndo={canUndo}
          canRedo={canRedo}
          onSave={forceSave}
          onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAutopilot={() => {
            const autopilotElement = document.querySelector('[data-autopilot-trigger]') as HTMLElement;
            if (autopilotElement) {
              autopilotElement.click();
            }
          }}
        />
      )}

      <div className="space-y-8">
        <div className="max-w-6xl mx-auto">
          <ProfileHeader 
            profile={profile}
            scope={scope}
            editMode={effectiveEditMode}
            onEdit={onEditIdentity}
          />
        </div>
        
        <ProfileStats profile={profile} />
        
        <ProfileAchievementsStrip 
          achievements={mockAchievements}
          engagementBadges={mockEngagementBadges}
        />

        {/* Community Impact + Success Story + Engagement (Public social proof) */}
        <div className="px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <CommunityImpactWidget 
                vitanaIndex={profile.vitanaIndex ?? 0}
                communityStats={{
                  posts: profile.stats.posts,
                  helpedUsers: 12,
                  featuredStories: 3,
                  influenceScore: 85
                }}
              />
              <SuccessStoryCarousel />
            </div>
            
            {/* Engagement Sidebar */}
            <div className="space-y-4">
              {effectiveEditMode ? (
                <ProfileProgressCard
                  profile={profile}
                  onSectionClick={handleSectionClick}
                />
              ) : (
                <>
                  <CompatibilityIndicator 
                    isOwnProfile={isOwnProfile}
                    mutualConnections={5}
                  />
                  <ContextualCTAs 
                    isOwnProfile={isOwnProfile}
                    profileType="coach"
                    hasActiveChallenge={true}
                    isServiceProvider={true}
                    compatibilityScore={92}
                  />
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Showcase Section - Single unified location */}
        {effectiveEditMode && onEditShowcase && (
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
        {effectiveEditMode && (
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
        
        {/* View Mode Intelligence */}
        <div className="px-6">
          <div className="max-w-6xl mx-auto">
            <ViewModeIntelligence 
              isOwnProfile={isOwnProfile}
              viewerCompatibility={92}
            />
          </div>
        </div>
        
        <div className="px-6">
          <div className="max-w-6xl mx-auto">
            <ProfileTabs
              profile={profile} 
              scope={scope} 
              editMode={effectiveEditMode}
              isOwnProfile={isOwnProfile}
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