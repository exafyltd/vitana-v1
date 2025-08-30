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
  onEditVisibility?: () => void;
}

export function ProfileTabs({ 
  profile, 
  scope, 
  editMode,
  onEditAbout,
  onEditServices,
  onEditCompliance,
  onEditVisibility
}: ProfileTabsProps) {
  // Determine which tabs to show
  const showHealthTab = profile.visibility.healthShareConsent && 
    shouldShowField('public', scope); // Health is public when consented
  
  const showServicesTab = profile.offerings && 
    profile.offerings.some(offering => offering.status === 'published');

  // In edit mode, remove showcase tab since it's now a standalone section
  const tabs = ['posts', 'media', 'groups'];
  if (showHealthTab) tabs.push('health');
  if (showServicesTab) tabs.push('services');

  return (
    <div className="px-6">
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className={`grid w-full grid-cols-${tabs.length}`}>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            {showHealthTab && <TabsTrigger value="health">Health Snapshot</TabsTrigger>}
            {showServicesTab && <TabsTrigger value="services">Services</TabsTrigger>}
          </TabsList>

          <TabsContent value="posts">
            <ProfilePostsTab 
              profile={profile} 
              scope={scope} 
              editMode={editMode}
              onEditAbout={onEditAbout}
            />
          </TabsContent>

          <TabsContent value="media">
            <ProfileMediaTab 
              profile={profile} 
              scope={scope}
              editMode={editMode}
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