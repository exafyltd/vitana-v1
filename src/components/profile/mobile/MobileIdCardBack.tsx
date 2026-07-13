import { useState } from "react";
import { UserProfile } from "@/types/profile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Plus, ExternalLink } from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { YouTubeIcon } from "@/components/icons/YouTubeIcon";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { XIcon } from "@/components/icons/XIcon";
import { useAuth } from "@/context/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfile } from "@/context/ProfileProvider";
import { SocialMediaImportDialog } from "@/components/profile/dialogs/SocialMediaImportDialog";

interface MobileIdCardBackProps {
  profile: UserProfile;
  editMode?: boolean;
  onEdit?: () => void;
  onRefreshProfile?: () => void;
  className?: string;
}

type SocialPlatform = 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'x';

interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  color: string;
  getUrl: (profile: UserProfile) => string | undefined;
  icon: React.ReactNode;
}

const platforms: PlatformConfig[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    getUrl: (p) => p.linkedin_url,
    icon: <LinkedInIcon className="h-5 w-5" connected={true} />
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E4405F',
    getUrl: (p) => p.instagram_url,
    icon: <InstagramIcon className="h-5 w-5" connected={true} />
  },
  {
    id: 'x',
    name: 'X',
    color: '#000000',
    getUrl: (p) => p.x_url,
    icon: <XIcon className="h-5 w-5" />
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#00f2ea',
    getUrl: (p) => p.tiktok_url,
    icon: <TikTokIcon className="h-5 w-5" connected={true} />
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    getUrl: (p) => p.youtube_url,
    icon: <YouTubeIcon className="h-5 w-5" connected={true} />
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    getUrl: (p) => p.facebook_url,
    icon: <FacebookIcon className="h-5 w-5" connected={true} />
  }
];

export function MobileIdCardBack({
  profile,
  editMode = false,
  onEdit,
  onRefreshProfile,
  className
}: MobileIdCardBackProps) {
  const { user } = useAuth();
  const { translate } = useTranslation();
  const { refreshProfile } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);

  const handleImportSuccess = () => {
    refreshProfile();         // Update ProfileProvider context
    onRefreshProfile?.();     // Trigger parent to refetch local state
  };
  
  const connectedPlatforms = platforms.filter(p => !!p.getUrl(profile));
  const unconnectedPlatforms = platforms.filter(p => !p.getUrl(profile));

  const handleOpenProfile = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConnect = (platform: PlatformConfig) => {
    setSelectedPlatform(platform);
    setDialogOpen(true);
  };

  return (
    <div className={cn("px-4 pb-2", className)}>
      {/* Glass Card - Same style as Front ID */}
      <div
        className="relative rounded-2xl border border-white/5 overflow-hidden"
        style={{
          // Android WebView (Appilix) can drop a card's gradient `background`
          // when the card paints on its own compositing layer, washing it out
          // to the light page underneath (see MobileIdentityCard.tsx for the
          // original occurrence). Keep a SOLID dark `backgroundColor` as a
          // fallback so the card can never render light even if the gradient
          // layer fails to paint, and promote the card onto its own stable
          // compositing layer so descendants can't knock out its background.
          backgroundColor: "hsl(216, 53%, 8%)",
          backgroundImage: "linear-gradient(135deg, hsl(216, 53%, 8%) 0%, hsl(222, 47%, 11%) 100%)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          isolation: "isolate",
          transform: "translateZ(0)"
        }}
      >

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              {translate('socialImport.socialPresence', 'Social Presence')}
            </h2>
            <p className="text-xs text-white/50">
              {translate('socialImport.verifiedConnections', 'Verified connections across your digital life')}
            </p>
          </div>

          {/* Connected Platforms Grid */}
          {connectedPlatforms.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {connectedPlatforms.map((platform) => {
                const url = platform.getUrl(profile);
                return (
                  <button
                    key={platform.id}
                    onClick={() => url && handleOpenProfile(url)}
                    className="flex flex-col items-center p-3 rounded-xl border transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: `${platform.color}10`,
                      borderColor: `${platform.color}30`
                    }}
                  >
                    {/* Icon with check */}
                    <div className="relative mb-2">
                      <div style={{ color: platform.color }}>
                        {platform.icon}
                      </div>
                      <div 
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center"
                        style={{ boxShadow: "0 2px 6px rgba(34,197,94,0.4)" }}
                      >
                        <Check className="h-2 w-2 text-white" strokeWidth={3} />
                      </div>
                    </div>
                    
                    {/* Name */}
                    <span 
                      className="text-[10px] font-semibold"
                      style={{ color: platform.color }}
                    >
                      {platform.name}
                    </span>
                    
                    {/* External link hint */}
                    <ExternalLink className="h-2.5 w-2.5 text-white/30 mt-1" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Unconnected Platforms - Compact row */}
          {unconnectedPlatforms.length > 0 && editMode && (
            <>
              <div className="h-px bg-white/5 my-4" />
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] text-white/40 mr-2">{translate('socialImport.connect', 'Connect:')}</span>
                {unconnectedPlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleConnect(platform)}
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                  >
                    <div className="opacity-40 grayscale">
                      {platform.icon}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Empty state when no platforms connected */}
          {connectedPlatforms.length === 0 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Plus className="h-5 w-5 text-white/40" />
              </div>
              <p className="text-sm text-white/50 mb-3">{translate('socialImport.noAccountsConnected', 'No social accounts connected')}</p>
            </div>
          )}

          {/* Subtle footer note */}
          {connectedPlatforms.length > 0 && (
            <p className="text-[10px] text-white/30 text-center mt-4 italic">
              {translate('socialImport.tapToVisit', 'Tap to visit profile')}
            </p>
          )}
        </div>
      </div>

      {/* Social Media Import Dialog */}
      {selectedPlatform && (
        <SocialMediaImportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          platform={selectedPlatform.id}
          platformName={selectedPlatform.name}
          icon={selectedPlatform.icon}
          profileId={user?.id || (profile.user_id && profile.user_id !== 'current-user' ? profile.user_id : '')}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
