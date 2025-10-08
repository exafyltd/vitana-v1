import { useMemo } from "react";
import { useProfile } from "@/context/ProfileProvider";
import { getChannelIcon, getChannelColor, getChannelDisplayName } from "@/utils/channelHelpers";

export interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  url?: string;
  connected: boolean;
  supportsDirectShare: boolean;
  supportsAutomation: boolean;
}

export function useSocialPlatforms() {
  const { profile } = useProfile();
  
  const allPlatforms = useMemo(() => {
    const platforms = [
      { type: 'linkedin', url: profile?.linkedin_url, directShare: true, automation: true },
      { type: 'instagram', url: profile?.instagram_url, directShare: true, automation: true },
      { type: 'facebook', url: profile?.facebook_url, directShare: true, automation: true },
      { type: 'twitter', url: profile?.x_url, directShare: true, automation: true },
      { type: 'youtube', url: profile?.youtube_url, directShare: false, automation: true },
      { type: 'tiktok', url: profile?.tiktok_url, directShare: false, automation: true },
    ];
    
    return platforms.map(p => ({
      id: p.type,
      name: getChannelDisplayName(p.type),
      icon: getChannelIcon(p.type),
      color: getChannelColor(p.type),
      url: p.url,
      connected: !!p.url,
      supportsDirectShare: p.directShare,
      supportsAutomation: p.automation
    }));
  }, [profile?.linkedin_url, profile?.instagram_url, profile?.facebook_url, profile?.x_url, profile?.youtube_url, profile?.tiktok_url]);
  
  const connectedPlatforms = useMemo(() => 
    allPlatforms.filter(p => p.connected),
    [allPlatforms]
  );
  
  return { allPlatforms, connectedPlatforms, loading: !profile };
}
