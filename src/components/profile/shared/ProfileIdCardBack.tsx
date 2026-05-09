import { UserProfile } from "@/types/profile";
import { useAuth } from "@/context/AuthProvider";
import { useProfile } from "@/context/ProfileProvider";
import { Plus, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { XIcon } from "@/components/icons/XIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { YouTubeIcon } from "@/components/icons/YouTubeIcon";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { useState } from "react";
import { SocialMediaImportDialog } from "@/components/profile/dialogs/SocialMediaImportDialog";
import { useProfileTheme, ThemeConfig } from "@/hooks/useProfileTheme";
import { t } from '@/lib/i18n-toast';

interface ProfileIdCardBackProps {
  profile: UserProfile;
  themeConfig: ThemeConfig;
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
  brandTintHex: string;
  brandTintHexDark: string;
  brandBorder: string;
}

export function ProfileIdCardBack({ profile, themeConfig }: ProfileIdCardBackProps) {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);

  const handleImportSuccess = () => {
    refreshProfile();
  };
  
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
      icon: <LinkedInIcon className="h-[32px] w-[32px]" connected={true} />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(10,102,194,0.15)]',
      urlPattern: /linkedin\.com/i,
      brandColor: '#0A66C2',
      brandTint: 'bg-[#0A66C2]/[0.04] dark:bg-[#0A66C2]/[0.06]',
      brandTintHex: '#E9F2FB',
      brandTintHexDark: '#0A4580',
      brandBorder: 'border-t-[#0A66C2]'
    },
    { 
      name: 'Instagram', 
      platform: 'instagram',
      icon: <InstagramIcon className="h-[32px] w-[32px]" connected={true} />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(221,42,123,0.12)]',
      urlPattern: /instagram\.com/i,
      brandColor: '#DD2A7B',
      brandTint: 'bg-[#E4405F]/[0.04] dark:bg-[#E4405F]/[0.06]',
      brandTintHex: '#FCEBF6',
      brandTintHexDark: '#9C1C55',
      brandBorder: 'border-t-[#E4405F]'
    },
    { 
      name: 'X', 
      platform: 'x',
      icon: <XIcon className="h-[32px] w-[32px]" />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(15,20,25,0.15)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]',
      urlPattern: /twitter\.com|x\.com/i,
      brandColor: '#0F1419',
      brandTint: 'bg-[#0F1419]/[0.04] dark:bg-white/[0.06]',
      brandTintHex: '#F2F3F5',
      brandTintHexDark: '#2C2F33',
      brandBorder: 'border-t-[#0F1419] dark:border-t-white'
    },
    { 
      name: 'TikTok', 
      platform: 'tiktok',
      icon: <TikTokIcon className="h-[32px] w-[32px]" connected={true} />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(0,242,234,0.15)]',
      urlPattern: /tiktok\.com/i,
      brandColor: '#00f2ea',
      brandTint: 'bg-[#00f2ea]/[0.04] dark:bg-[#00f2ea]/[0.06]',
      brandTintHex: '#EAF7F9',
      brandTintHexDark: '#00A39E',
      brandBorder: 'border-t-[#00f2ea]'
    },
    { 
      name: 'YouTube', 
      platform: 'youtube',
      icon: <YouTubeIcon className="h-[32px] w-[32px]" connected={true} />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(255,0,0,0.15)]',
      urlPattern: /youtube\.com|youtu\.be/i,
      brandColor: '#FF0000',
      brandTint: 'bg-[#FF0000]/[0.04] dark:bg-[#FF0000]/[0.06]',
      brandTintHex: '#FBEAEA',
      brandTintHexDark: '#B30000',
      brandBorder: 'border-t-[#FF0000]'
    },
    { 
      name: 'Facebook', 
      platform: 'facebook',
      icon: <FacebookIcon className="h-[32px] w-[32px]" connected={true} />, 
      hoverHalo: 'hover:shadow-[0_0_20px_rgba(24,119,242,0.15)]',
      urlPattern: /facebook\.com/i,
      brandColor: '#1877F2',
      brandTint: 'bg-[#1877F2]/[0.04] dark:bg-[#1877F2]/[0.06]',
      brandTintHex: '#EAF0FE',
      brandTintHexDark: '#1057B8',
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
      <div id="social-connections-section" className={`relative h-full flex flex-col items-center justify-center p-8 ${themeConfig.backCard.darkBase || themeConfig.backCard.lightBase || 'bg-gradient-to-br from-white/90 via-white/60 to-white/30 dark:from-gray-900/90 dark:via-gray-900/60 dark:to-gray-900/30'} ${themeConfig.backCard.darkBase || themeConfig.backCard.lightBase ? 'backdrop-blur-2xl' : 'backdrop-blur-xl'} rounded-3xl overflow-hidden transition-all duration-500 ease-in-out`}
           style={{
             boxShadow: themeConfig.backCard.darkBase 
               ? '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
               : themeConfig.backCard.lightShadow || '0 20px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)'
           }}>
        {/* Themed gradient border */}
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${themeConfig.backCard.borderGradient} ${themeConfig.backCard.darkBase ? 'opacity-50' : themeConfig.backCard.lightBorderOpacity || 'opacity-40'} pointer-events-none transition-all duration-500 ease-in-out`} style={{ padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
        
        {/* Left edge glow (ambient light bleed for dark theme) */}
        {themeConfig.backCard.leftEdgeGlow && (
          <div className={`absolute left-0 top-0 bottom-0 w-32 ${themeConfig.backCard.leftEdgeGlow} opacity-60 pointer-events-none transition-all duration-500 ease-in-out`} />
        )}
        
        {/* Themed corner glow */}
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full bg-gradient-to-br ${themeConfig.backCard.borderGradient} blur-3xl opacity-20 pointer-events-none transition-all duration-500 ease-in-out`} />
        
        {/* Themed top stripe */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${themeConfig.backCard.topStripe} rounded-t-3xl transition-all duration-500 ease-in-out`} />
        
        <div className="relative z-10 text-center mb-8">
          <h2 className={`text-2xl font-bold mb-2 transition-colors duration-500 ${themeConfig.backCard.textHeader || 'text-foreground'}`}>
            {t('screens.profile.socialPresence')}
          </h2>
          <p className={`text-sm transition-colors duration-500 ${themeConfig.backCard.textInactive || 'text-muted-foreground'}`}>
            {t('screens.profile.verifiedConnectionsAcrossYourDigitalLife')}
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
          <TooltipProvider delayDuration={200}>
            {allPlatforms.map((platform) => {
              const connected = isConnected(platform.platform);
              
              const cardContent = (
                <div
                  key={platform.name}
                  className={`group relative flex flex-col items-center p-5 rounded-2xl border transition-all duration-[400ms] ease-in-out ${
                    connected 
                      ? `bg-white/70 dark:bg-gray-800/70 backdrop-blur-md cursor-pointer ${themeConfig.backCard.platformHoverGlow}` 
                      : `bg-gray-100/40 dark:bg-gray-900/40 backdrop-blur-sm hover:scale-[1.02]`
                  }`}
                style={connected ? {
                  borderColor: platform.brandColor,
                  boxShadow: themeConfig.backCard.darkBase 
                    ? `0 8px 24px ${platform.brandColor}16, 0 0 40px ${platform.brandColor}12, inset 0 2px 8px rgba(255,255,255,0.15), inset 0 -2px 6px rgba(0,0,0,0.05)`
                    : `0 8px 24px ${platform.brandColor}20, 0 0 40px ${platform.brandColor}15, inset 0 2px 8px rgba(255,255,255,0.15), inset 0 -2px 6px rgba(0,0,0,0.05)`,
                } as React.CSSProperties : {
                  borderColor: 'rgba(160, 160, 160, 0.2)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 2px rgba(0,0,0,0.03)',
                  filter: 'grayscale(0.7)',
                  opacity: 0.6
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  if (connected) {
                    e.currentTarget.style.transform = 'translateY(-4px) rotateY(2deg)';
                    const hoverShadow = themeConfig.backCard.darkBase
                      ? `0 16px 48px ${platform.brandColor}28, 0 0 60px ${platform.brandColor}22, inset 0 2px 8px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,0,0,0.05)`
                      : `0 16px 48px ${platform.brandColor}35, 0 0 60px ${platform.brandColor}30, inset 0 2px 8px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,0,0,0.05)`;
                    e.currentTarget.style.boxShadow = hoverShadow;
                  } else {
                    e.currentTarget.style.filter = 'grayscale(0.3)';
                    e.currentTarget.style.opacity = '0.8';
                    e.currentTarget.style.borderColor = platform.brandColor + '40';
                  }
                }}
                onMouseLeave={(e) => {
                  if (connected) {
                    e.currentTarget.style.transform = 'translateY(0) rotateY(0deg)';
                    const defaultShadow = themeConfig.backCard.darkBase
                      ? `0 8px 24px ${platform.brandColor}16, 0 0 40px ${platform.brandColor}12, inset 0 2px 8px rgba(255,255,255,0.15), inset 0 -2px 6px rgba(0,0,0,0.05)`
                      : `0 8px 24px ${platform.brandColor}20, 0 0 40px ${platform.brandColor}15, inset 0 2px 8px rgba(255,255,255,0.15), inset 0 -2px 6px rgba(0,0,0,0.05)`;
                    e.currentTarget.style.boxShadow = defaultShadow;
                  } else {
                    e.currentTarget.style.filter = 'grayscale(0.7)';
                    e.currentTarget.style.opacity = '0.6';
                    e.currentTarget.style.borderColor = 'rgba(160, 160, 160, 0.2)';
                  }
                }}
                onClick={() => connected && handleOpenProfile(platform.platform)}
                tabIndex={connected ? 0 : -1}
                role={connected ? "link" : undefined}
                aria-label={connected ? `Open ${platform.name} profile` : undefined}
              >
                {/* Icon with colored ring for connected, green check overlay */}
                <div className="relative flex items-center justify-center h-[40px] mb-3">
                  <div 
                    className={`relative flex items-center justify-center ${connected ? 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-3' : ''}`}
                  >
                    {/* Colored ring for connected platforms */}
                    {connected && (
                      <div 
                        className="absolute inset-0 rounded-full -m-2 transition-all duration-300"
                        style={{
                          border: `2px solid ${platform.brandColor}40`,
                          boxShadow: `0 0 16px ${platform.brandColor}30`
                        }}
                      />
                    )}
                    
                    <div 
                      className={`relative z-10 transition-all duration-300`}
                      style={connected ? { 
                        color: platform.brandColor,
                        filter: `drop-shadow(0 4px 20px ${platform.brandColor}50)`
                      } : {
                        color: '#aaa',
                        filter: 'grayscale(1)',
                        opacity: 0.5
                      }}
                    >
                      {platform.platform === 'instagram' ? (
                        <InstagramIcon className="h-[32px] w-[32px]" connected={connected} />
                      ) : platform.platform === 'linkedin' ? (
                        <LinkedInIcon className="h-[32px] w-[32px]" connected={connected} />
                      ) : platform.platform === 'tiktok' ? (
                        <TikTokIcon className="h-[32px] w-[32px]" connected={connected} />
                      ) : platform.platform === 'youtube' ? (
                        <YouTubeIcon className="h-[32px] w-[32px]" connected={connected} />
                      ) : platform.platform === 'facebook' ? (
                        <FacebookIcon className="h-[32px] w-[32px]" connected={connected} />
                      ) : (
                        platform.icon
                      )}
                    </div>
                    
                    {/* Green check overlay for connected */}
                    {connected && (
                      <div className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-green-500 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-[0_4px_12px_rgba(34,197,94,0.4)]">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Platform name */}
                <span className={`text-sm font-semibold mb-3 transition-colors duration-300 ${
                  connected ? (themeConfig.backCard.textHeader || 'text-foreground') : 'text-white/50'
                }`}
                style={connected ? { color: platform.brandColor } : {}}
                >
                  {platform.name}
                </span>
                
                {/* Status or action button */}
                <div className="flex flex-col items-center gap-2 w-full">
                  {connected ? (
                    <>
                      <div 
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${platform.brandColor}15`,
                          color: platform.brandColor,
                          border: `1px solid ${platform.brandColor}30`
                        }}
                      >
                        <span>{t('screens.profile.connected')}</span>
                      </div>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-3 w-full transition-colors duration-200"
                          style={{
                            color: platform.brandColor
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(platform);
                          }}
                        >{t('screens.profile.manage')}
                        </Button>
                      )}
                    </>
                  ) : isOwnProfile ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs px-4 w-full font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnect(platform);
                      }}
                    >{t('screens.profile.connect')}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground/40 italic">{t('screens.profile.notLinked')}</span>
                  )}
                </div>
              </div>
              );
              
              // Wrap with tooltip only for unconnected platforms when viewing other users
              return !connected && !isOwnProfile ? (
                <Tooltip key={platform.name}>
                  <TooltipTrigger asChild>
                    {cardContent}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('screens.profile.notConnectedYet')}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                cardContent
              );
            })}
          </TooltipProvider>
        </div>

        {/* Display LinkedIn enriched data if available */}
        {profile.linkedin_url && (profile.linkedin_headline || profile.linkedin_summary) && (
          <div className="w-full max-w-md mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <LinkedInIcon className="h-4 w-4" connected={true} />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{t('screens.profile.linkedinProfileData')}</span>
            </div>
            {profile.linkedin_headline && (
              <p className="text-sm font-medium text-foreground mb-1">{profile.linkedin_headline}</p>
            )}
            {profile.linkedin_summary && (
              <p className="text-xs text-muted-foreground line-clamp-3">{profile.linkedin_summary}</p>
            )}
            {profile.linkedin_synced_at && (
              <p className="text-xs text-muted-foreground/60 mt-2">{t('screens.profile.syncedValue0', { value0: new Date(profile.linkedin_synced_at).toLocaleDateString() })}</p>
            )}
          </div>
        )}

        {isOwnProfile && (
          <p className="text-xs text-muted-foreground/60 text-center mt-4 max-w-xs">{t('screens.profile.connectAccountsAutoimportBioPhotosProfessional')}
          </p>
        )}

        {/* ID Card decorative elements */}
        <div className="absolute top-4 right-4 text-xs text-muted-foreground/50">{t('screens.profile.idValue0', { value0: profile.id.slice(0, 8) })}</div>
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
          onSuccess={handleImportSuccess}
        />
      )}
    </>
  );
}
