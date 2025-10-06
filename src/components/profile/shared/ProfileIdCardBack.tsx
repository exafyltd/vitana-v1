import { UserProfile } from "@/types/profile";
import { useAuth } from "@/context/AuthProvider";
import { Instagram, Linkedin, Youtube, Plus, Link as LinkIcon, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/icons/XIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { useState } from "react";
import { SocialMediaImportDialog } from "@/components/profile/dialogs/SocialMediaImportDialog";

interface ProfileIdCardBackProps {
  profile: UserProfile;
}

interface SocialLink {
  platform: string;
  url: string;
  icon: React.ReactNode;
  color: string;
}

type SocialPlatform = 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'x';

interface PlatformConfig {
  name: string;
  platform: SocialPlatform;
  icon: React.ReactNode;
  color: string;
  urlPattern: RegExp;
}

export function ProfileIdCardBack({ profile }: ProfileIdCardBackProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);
  
  // Check if this is the user's own profile
  const isOwnProfile = user?.id === (profile.user_id || profile.id);
  
  // Check if platform is connected by checking dedicated URL columns
  const isConnected = (platform: SocialPlatform): boolean => {
    switch(platform) {
      case 'linkedin': return !!profile.linkedin_url;
      case 'instagram': return !!profile.instagram_url;
      case 'tiktok': return !!profile.tiktok_url;
      case 'youtube': return !!profile.youtube_url;
      case 'facebook': return !!profile.facebook_url;
      case 'x': return !!profile.x_url;
      default: return false;
    }
  };
  
  // Define all available platforms
  const allPlatforms: PlatformConfig[] = [
    { 
      name: 'LinkedIn', 
      platform: 'linkedin',
      icon: <Linkedin className="h-5 w-5" />, 
      color: 'hover:bg-blue-50 dark:hover:bg-blue-950',
      urlPattern: /linkedin\.com/i
    },
    { 
      name: 'Instagram', 
      platform: 'instagram',
      icon: <Instagram className="h-5 w-5" />, 
      color: 'hover:bg-pink-50 dark:hover:bg-pink-950',
      urlPattern: /instagram\.com/i
    },
    { 
      name: 'X', 
      platform: 'x',
      icon: <XIcon className="h-5 w-5" />, 
      color: 'hover:bg-gray-50 dark:hover:bg-gray-900',
      urlPattern: /twitter\.com|x\.com/i
    },
    { 
      name: 'TikTok', 
      platform: 'tiktok',
      icon: <TikTokIcon className="h-5 w-5" />, 
      color: 'hover:bg-gray-50 dark:hover:bg-gray-900',
      urlPattern: /tiktok\.com/i
    },
    { 
      name: 'YouTube', 
      platform: 'youtube',
      icon: <Youtube className="h-5 w-5" />, 
      color: 'hover:bg-red-50 dark:hover:bg-red-950',
      urlPattern: /youtube\.com|youtu\.be/i
    },
    { 
      name: 'Facebook', 
      platform: 'facebook',
      icon: <Facebook className="h-5 w-5" />, 
      color: 'hover:bg-blue-50 dark:hover:bg-blue-950',
      urlPattern: /facebook\.com/i
    }
  ];

  const handleConnect = (platform: PlatformConfig) => {
    setSelectedPlatform(platform);
    setDialogOpen(true);
  };

  const getPlatformUrl = (platform: SocialPlatform): string | undefined => {
    switch(platform) {
      case 'linkedin': return profile.linkedin_url;
      case 'instagram': return profile.instagram_url;
      case 'tiktok': return profile.tiktok_url;
      case 'youtube': return profile.youtube_url;
      case 'facebook': return profile.facebook_url;
      case 'x': return profile.x_url;
      default: return undefined;
    }
  };

  const handleOpenProfile = (platform: SocialPlatform) => {
    const url = getPlatformUrl(platform);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="relative h-full flex flex-col items-center justify-center p-8 bg-card border rounded-2xl shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">
            {isOwnProfile ? 'Connect Social Media' : 'Social Media Profiles'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile ? 'Import your profiles to enrich Vitana' : 'Connected social media accounts'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {allPlatforms.map((platform) => {
            const connected = isConnected(platform.platform);
            
            return (
              <div
                key={platform.name}
                className={`group relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition-all ${platform.color} ${connected ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={() => connected && handleOpenProfile(platform.platform)}
              >
                <div className="text-muted-foreground">
                  {platform.icon}
                </div>
                <span className="text-xs font-medium text-foreground">{platform.name}</span>
                
                {connected ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <LinkIcon className="h-3 w-3" />
                    <span>Connected</span>
                  </div>
                ) : isOwnProfile ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect(platform);
                    }}
                  >
                    Connect
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Display LinkedIn enriched data if available */}
        {profile.linkedin_url && (profile.linkedin_headline || profile.linkedin_summary) && (
          <div className="w-full max-w-md mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Linkedin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">LinkedIn Profile Data</span>
            </div>
            {profile.linkedin_headline && (
              <p className="text-sm font-medium text-foreground mb-1">{profile.linkedin_headline}</p>
            )}
            {profile.linkedin_summary && (
              <p className="text-xs text-muted-foreground line-clamp-3">{profile.linkedin_summary}</p>
            )}
            {profile.linkedin_synced_at && (
              <p className="text-xs text-muted-foreground/60 mt-2">
                Synced {new Date(profile.linkedin_synced_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {isOwnProfile && (
          <p className="text-xs text-muted-foreground/60 text-center mt-4 max-w-xs">
            Connect accounts to auto-import bio, photos, and professional info
          </p>
        )}

        {/* ID Card decorative elements */}
        <div className="absolute top-4 right-4 text-xs text-muted-foreground/50">
          ID #{profile.id.slice(0, 8)}
        </div>
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground/50">
          @{profile.handle}
        </div>
      </div>

      {selectedPlatform && (
        <SocialMediaImportDialog 
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          platform={selectedPlatform.platform}
          platformName={selectedPlatform.name}
          icon={selectedPlatform.icon}
          profileId={user?.id ?? profile.user_id ?? profile.id}
        />
      )}
    </>
  );
}
