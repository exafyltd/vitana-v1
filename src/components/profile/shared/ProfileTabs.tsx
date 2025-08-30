import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope, shouldShowField } from "@/lib/profileScope";
import { ProfilePostsTab } from "./tabs/ProfilePostsTab";
import { ProfileMediaTab } from "./tabs/ProfileMediaTab";
import { ProfileGroupsTab } from "./tabs/ProfileGroupsTab";
import { ProfileHealthTab } from "./tabs/ProfileHealthTab";
import { ProfileServicesTab } from "./tabs/ProfileServicesTab";

interface ProfileTabsProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEditAbout?: () => void;
  onEditServices?: () => void;
  onEditCompliance?: () => void;
  onEditShowcase?: () => void;
  onEditVisibility?: () => void;
}

export function ProfileTabs({ 
  profile, 
  scope, 
  editMode,
  onEditAbout,
  onEditServices,
  onEditCompliance,
  onEditShowcase,
  onEditVisibility
}: ProfileTabsProps) {
  // Determine which tabs to show
  const showHealthTab = profile.visibility.healthShareConsent && 
    shouldShowField('public', scope); // Health is public when consented
  
  const showServicesTab = profile.offerings && 
    profile.offerings.some(offering => offering.status === 'published');

  // In edit mode, show Showcase as the first tab
  const tabs = editMode ? ['showcase', 'posts', 'media', 'groups'] : ['posts', 'media', 'groups'];
  if (showHealthTab) tabs.push('health');
  if (showServicesTab) tabs.push('services');

  return (
    <div className="px-6">
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue={editMode ? "showcase" : "posts"} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-${tabs.length}`}>
            {editMode && <TabsTrigger value="showcase">Showcase</TabsTrigger>}
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            {showHealthTab && <TabsTrigger value="health">Health Snapshot</TabsTrigger>}
            {showServicesTab && <TabsTrigger value="services">Services</TabsTrigger>}
          </TabsList>

          {editMode && (
            <TabsContent value="showcase">
              <div className="space-y-6">
                <div className="bg-background rounded-lg border p-6">
                  <h2 className="text-xl font-semibold mb-4">Edit Showcase</h2>
                  <Button onClick={onEditShowcase} variant="outline" className="w-full">
                    <Star className="h-4 w-4 mr-2" />
                    Manage Featured Content
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="posts">
            <ProfilePostsTab 
              profile={profile} 
              scope={scope} 
              editMode={editMode}
              onEditAbout={onEditAbout}
              onEditShowcase={onEditShowcase}
            />
          </TabsContent>

          <TabsContent value="media">
            <ProfileMediaTab 
              profile={profile} 
              scope={scope}
              editMode={editMode}
              onEditShowcase={onEditShowcase}
            />
          </TabsContent>

          <TabsContent value="groups">
            <ProfileGroupsTab profile={profile} scope={scope} />
          </TabsContent>

          {showHealthTab && (
            <TabsContent value="health">
              <ProfileHealthTab 
                profile={profile} 
                scope={scope}
                editMode={editMode}
                onEditVisibility={onEditVisibility}
              />
            </TabsContent>
          )}

          {showServicesTab && (
            <TabsContent value="services">
              <ProfileServicesTab 
                profile={profile} 
                scope={scope}
                editMode={editMode}
                onEditServices={onEditServices}
                onEditCompliance={onEditCompliance}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}