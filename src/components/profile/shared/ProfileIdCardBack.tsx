import { UserProfile } from "@/types/profile";
import { useAuth } from "@/context/AuthProvider";
import { Linkedin, Youtube, Plus, Link as LinkIcon, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/icons/XIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
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
  hoverHalo: string;
  urlPattern: RegExp;
  brandColor: string;
  brandTint: string;
  brandBorder: string;
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
  
  // Define all available platforms with precise brand styling
  const allPlatforms: PlatformConfig[] = [
    { 
      name: 'LinkedIn', 
      platform: 'linkedin',
      icon: <Linkedin className="h-[30px] w-[30px]" />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(10,102,194,0.15)]',
      urlPattern: /linkedin\.com/i,
      brandColor: '#0A66C2',
      brandTint: 'bg-[#0A66C2]/[0.04] dark:bg-[#0A66C2]/[0.06]',
      brandBorder: 'border-t-[#0A66C2]'
    },
    { 
      name: 'Instagram', 
      platform: 'instagram',
      icon: <InstagramIcon className="h-[28px] w-[28px]" connected={true} />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(221,42,123,0.12)]',
      urlPattern: /instagram\.com/i,
      brandColor: '#DD2A7B', // Mid-gradient pink for glow
      brandTint: 'bg-[#E4405F]/[0.04] dark:bg-[#E4405F]/[0.06]',
      brandBorder: 'border-t-[#E4405F]'
    },
    { 
      name: 'X', 
      platform: 'x',
      icon: <XIcon className="h-[30px] w-[30px]" />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(15,20,25,0.15)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]',
      urlPattern: /twitter\.com|x\.com/i,
      brandColor: '#0F1419',
      brandTint: 'bg-[#0F1419]/[0.04] dark:bg-white/[0.06]',
      brandBorder: 'border-t-[#0F1419] dark:border-t-white'
    },
    { 
      name: 'TikTok', 
      platform: 'tiktok',
      icon: <TikTokIcon className="h-[30px] w-[30px]" />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(0,242,234,0.15)]',
      urlPattern: /tiktok\.com/i,
      brandColor: '#000000',
      brandTint: 'bg-[#00f2ea]/[0.04] dark:bg-[#00f2ea]/[0.06]',
      brandBorder: 'border-t-[#00f2ea]'
    },
    { 
      name: 'YouTube', 
      platform: 'youtube',
      icon: <Youtube className="h-[30px] w-[30px]" />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(255,0,0,0.15)]',
      urlPattern: /youtube\.com|youtu\.be/i,
      brandColor: '#FF0000',
      brandTint: 'bg-[#FF0000]/[0.04] dark:bg-[#FF0000]/[0.06]',
      brandBorder: 'border-t-[#FF0000]'
    },
    { 
      name: 'Facebook', 
      platform: 'facebook',
      icon: <Facebook className="h-[30px] w-[30px]" />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(24,119,242,0.15)]',
      urlPattern: /facebook\.com/i,
      brandColor: '#1877F2',
      brandTint: 'bg-[#1877F2]/[0.04] dark:bg-[#1877F2]/[0.06]',
      brandBorder: 'border-t-[#1877F2]'
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
      <div className="relative h-full flex flex-col items-center justify-center p-6 bg-card border rounded-2xl shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">
            {isOwnProfile ? 'Connect Social Media' : 'Social Media Profiles'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile ? 'Import your profiles to enrich Vitana' : 'Connected social media accounts'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full max-w-md">
          {allPlatforms.map((platform) => {
            const connected = isConnected(platform.platform);
            
            return (
              <div
                key={platform.name}
                className={`group relative flex flex-col items-center pt-3 pb-3 px-3 rounded-2xl border transition-all duration-300 ease-out focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                  connected 
                    ? `bg-card border-border cursor-pointer hover:-translate-y-1 shadow-inner` 
                    : `bg-card border-border shadow-inner`
                }`}
                style={connected ? {
                  boxShadow: `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 20px ${platform.brandColor}1F`,
                } as React.CSSProperties : {
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.05)',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  if (connected) {
                    e.currentTarget.style.borderColor = platform.brandColor;
                    e.currentTarget.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 4px 24px ${platform.brandColor}30, 0 0 0 1px ${platform.brandColor}20`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (connected) {
                    e.currentTarget.style.borderColor = '';
                    e.currentTarget.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 20px ${platform.brandColor}1F`;
                  }
                }}
                onClick={() => connected && handleOpenProfile(platform.platform)}
                tabIndex={connected ? 0 : -1}
                role={connected ? "link" : undefined}
                aria-label={connected ? `Open ${platform.name} profile` : undefined}
              >
                {/* Icon - fixed size, centered */}
                <div className="flex items-center justify-center h-[30px] mb-2">
                  <div 
                    className={`relative flex items-center justify-center ${connected ? 'transition-all duration-300 ease-out group-hover:scale-110' : ''}`}
                  >
                    {/* Gradient background for connected logos */}
                    {connected && (
                      <div 
                        className="absolute inset-0 rounded-lg -m-1.5"
                        style={{
                          background: platform.platform === 'instagram' 
                            ? 'linear-gradient(45deg, #F58529 0%, #FEDA77 25%, #DD2A7B 50%, #8134AF 75%, #515BD4 100%)'
                            : platform.platform === 'linkedin'
                            ? 'linear-gradient(135deg, #0A66C2 0%, #0077B5 100%)'
                            : platform.platform === 'facebook'
                            ? 'linear-gradient(135deg, #1877F2 0%, #0C63D4 100%)'
                            : platform.platform === 'youtube'
                            ? 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)'
                            : platform.platform === 'x'
                            ? 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)'
                            : platform.platform === 'tiktok'
                            ? 'linear-gradient(135deg, #000000 0%, #00f2ea 100%)'
                            : `linear-gradient(135deg, ${platform.brandColor} 0%, ${platform.brandColor}CC 100%)`,
                          opacity: 0.08,
                        }}
                      />
                    )}
                    
                    <div 
                      className={`relative z-10 ${
                        platform.platform === 'x' && connected 
                          ? 'dark:text-white' 
                          : !connected 
                          ? ''
                          : ''
                      }`}
                      style={connected && platform.platform !== 'instagram' ? { 
                        color: platform.brandColor,
                        filter: `drop-shadow(0 0 12px ${platform.brandColor}1F)`
                      } : connected && platform.platform === 'instagram' ? {
                        filter: 'drop-shadow(0 0 12px rgba(221, 42, 123, 0.12))'
                      } : {
                        color: '#A0A0A0'
                      }}
                    >
                      {/* Render custom icon or lucide icon based on connection state */}
                      {platform.platform === 'instagram' ? (
                        <InstagramIcon className="h-[28px] w-[28px]" connected={connected} />
                      ) : (
                        platform.icon
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Platform name */}
                <span className="text-sm font-medium text-foreground mb-2">
                  {platform.name}
                </span>
                
                {/* Connected pill and actions - baseline aligned */}
                <div className="flex flex-col items-center gap-2.5 w-full min-h-[28px]">
                  {connected ? (
                    <>
                      <div 
                        className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium border-0"
                        style={{
                          backgroundColor: `${platform.brandColor}18`,
                          color: platform.brandColor
                        }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Connected</span>
                      </div>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-3 w-full transition-colors duration-200 hover:underline"
                          style={{
                            '--hover-color': platform.brandColor,
                          } as React.CSSProperties}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = platform.brandColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(platform);
                          }}
                        >
                          Manage
                        </Button>
                      )}
                    </>
                  ) : isOwnProfile ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs px-4 w-full border-2 font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnect(platform);
                      }}
                    >
                      Connect
                    </Button>
                  ) : null}
                </div>
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
