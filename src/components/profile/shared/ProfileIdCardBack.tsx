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
  urlPattern: RegExp;
  brandColor: string; // For icon when connected
  brandBorder: string; // For border accent
  brandTint: string; // Subtle background tint (4-6% opacity)
  brandHalo: string; // Hover halo effect
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
  
  // Define all available platforms with subtle brand styling
  const allPlatforms: PlatformConfig[] = [
    { 
      name: 'LinkedIn', 
      platform: 'linkedin',
      icon: <Linkedin className="h-7 w-7" />, 
      urlPattern: /linkedin\.com/i,
      brandColor: '[#0A66C2]',
      brandBorder: 'border-[#0A66C2]',
      brandTint: 'bg-[#0A66C2]/[0.04]',
      brandHalo: 'hover:shadow-[0_0_20px_rgba(10,102,194,0.15)]'
    },
    { 
      name: 'Instagram', 
      platform: 'instagram',
      icon: <Instagram className="h-7 w-7" />, 
      urlPattern: /instagram\.com/i,
      brandColor: '[#E4405F]',
      brandBorder: 'border-[#E4405F]',
      brandTint: 'bg-[#E4405F]/[0.04]',
      brandHalo: 'hover:shadow-[0_0_20px_rgba(228,64,95,0.15)]'
    },
    { 
      name: 'X', 
      platform: 'x',
      icon: <XIcon className="h-7 w-7" />, 
      urlPattern: /twitter\.com|x\.com/i,
      brandColor: '[#0F1419]',
      brandBorder: 'border-[#0F1419] dark:border-white',
      brandTint: 'bg-[#0F1419]/[0.04] dark:bg-white/[0.04]',
      brandHalo: 'hover:shadow-[0_0_20px_rgba(15,20,25,0.15)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]'
    },
    { 
      name: 'TikTok', 
      platform: 'tiktok',
      icon: <TikTokIcon className="h-7 w-7" />, 
      urlPattern: /tiktok\.com/i,
      brandColor: '[#000000]',
      brandBorder: 'border-[#69C9D0]',
      brandTint: 'bg-[#69C9D0]/[0.04]',
      brandHalo: 'hover:shadow-[0_0_20px_rgba(105,201,208,0.15)]'
    },
    { 
      name: 'YouTube', 
      platform: 'youtube',
      icon: <Youtube className="h-7 w-7" />, 
      urlPattern: /youtube\.com|youtu\.be/i,
      brandColor: '[#FF0000]',
      brandBorder: 'border-[#FF0000]',
      brandTint: 'bg-[#FF0000]/[0.04]',
      brandHalo: 'hover:shadow-[0_0_20px_rgba(255,0,0,0.15)]'
    },
    { 
      name: 'Facebook', 
      platform: 'facebook',
      icon: <Facebook className="h-7 w-7" />, 
      urlPattern: /facebook\.com/i,
      brandColor: '[#1877F2]',
      brandBorder: 'border-[#1877F2]',
      brandTint: 'bg-[#1877F2]/[0.04]',
      brandHalo: 'hover:shadow-[0_0_20px_rgba(24,119,242,0.15)]'
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

        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {allPlatforms.map((platform) => {
            const connected = isConnected(platform.platform);
            
            return (
              <div
                key={platform.name}
                className={`group relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-all duration-300 ${
                  connected 
                    ? `${platform.brandTint} border-${platform.brandColor} border-2 cursor-pointer hover:scale-[1.02] ${platform.brandHalo}` 
                    : 'bg-card border-border hover:border-${platform.brandColor}/20 hover:scale-[1.02]'
                }`}
                onClick={() => connected && handleOpenProfile(platform.platform)}
              >
                {/* Icon */}
                <div 
                  className={`transition-all duration-300 ${
                    connected 
                      ? `text-${platform.brandColor} scale-100` 
                      : 'text-muted-foreground/40 group-hover:text-muted-foreground/60'
                  }`}
                >
                  {platform.icon}
                </div>
                
                {/* Platform name */}
                <span className="text-sm font-medium text-foreground">
                  {platform.name}
                </span>
                
                {/* State indicator & action */}
                {connected ? (
                  <div className={`flex items-center gap-1.5 text-xs font-medium text-${platform.brandColor}`}>
                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                    <span>Connected</span>
                  </div>
                ) : isOwnProfile ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-3 min-w-[80px]"
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
