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
import { ProfileEventsTab } from "./tabs/ProfileEventsTab";
import { ProfileInsightTab } from "./tabs/ProfileInsightTab";
import { SmartTabPreview } from "../engagement/SmartTabPreview";
import { useState } from "react";

interface ProfileTabsProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  isOwnProfile?: boolean;
  onEditAbout?: () => void;
  onEditServices?: () => void;
  onEditCompliance?: () => void;
  onEditVisibility?: () => void;
}

export function ProfileTabs({ 
  profile, 
  scope, 
  editMode,
  isOwnProfile = false,
  onEditAbout,
  onEditServices,
  onEditCompliance,
  onEditVisibility
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("posts");
  // Determine which tabs to show
  const showHealthTab = profile.visibility.healthShareConsent && 
    shouldShowField('public', scope); // Health is public when consented
  
  const showServicesTab = profile.offerings && 
    profile.offerings.some(offering => offering.status === 'published');

  // Tab order: Posts, Media, Groups, Events, Health (conditional), Services (conditional), Insight (always last)
  const tabs = ['posts', 'media', 'groups', 'events'];
  if (showHealthTab) tabs.push('health');
  if (showServicesTab) tabs.push('services');
  tabs.push('insight'); // Insight is always the final tab

  return (
    <div className="space-y-6">
      <Tabs defaultValue="posts" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          {showHealthTab && <TabsTrigger value="health">Health</TabsTrigger>}
          {showServicesTab && <TabsTrigger value="services">Services</TabsTrigger>}
          <TabsTrigger value="insight">Insight</TabsTrigger>
        </TabsList>

        {/* Smart Tab Previews */}
        <SmartTabPreview 
          tabType={activeTab as any}
          isActive={!isOwnProfile} // Only show previews when viewing others
        />

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

          <TabsContent value="events">
            <ProfileEventsTab 
              profile={profile} 
              scope={scope}
              editMode={editMode}
              isOwnProfile={isOwnProfile}
            />
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

          <TabsContent value="insight">
            <ProfileInsightTab 
              profile={profile} 
              scope={scope}
              editMode={editMode}
            />
          </TabsContent>
        </Tabs>
    </div>
  );
}