import { useMemo } from "react";
import { useProfile } from "@/context/ProfileProvider";
import { getChannelIcon, getChannelColor, getChannelDisplayName } from "@/utils/channelHelpers";

export function useSocialPlatforms() {
  const { profile } = useProfile();
  
  const connectedPlatforms = useMemo(() => {
    const platforms = [
      { type: 'linkedin', url: profile?.linkedin_url },
      { type: 'instagram', url: profile?.instagram_url },
      { type: 'facebook', url: profile?.facebook_url },
      { type: 'twitter', url: profile?.x_url },
      { type: 'youtube', url: profile?.youtube_url },
      { type: 'tiktok', url: profile?.tiktok_url },
    ];
    
    return platforms
      .filter(p => !!p.url)
      .map(p => ({
        id: p.type,
        name: getChannelDisplayName(p.type),
        icon: getChannelIcon(p.type),
        color: getChannelColor(p.type),
        url: p.url,
        connected: true
      }));
  }, [profile?.linkedin_url, profile?.instagram_url, profile?.facebook_url, profile?.x_url, profile?.youtube_url, profile?.tiktok_url]);
  
  return { connectedPlatforms, loading: !profile };
}
