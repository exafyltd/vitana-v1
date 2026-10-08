import { useCallback, useEffect, useRef, useState } from "react";
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
import { SocialChannelPickerDrawer } from "./SocialChannelPickerDrawer";

interface MobileIdCardBackProps {
  profile: UserProfile;
  editMode?: boolean;
  isOwner?: boolean;
  onEdit?: () => void;
  onRefreshProfile?: () => void;
  className?: string;
}

type SocialPlatform = 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'x';

interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  color: string;
  /** App-icon tile behind the logo (VTID-04979) — TikTok's glyph is white, so it sits on black. */
  tileBg: string;
  getUrl: (profile: UserProfile) => string | undefined;
  icon: React.ReactNode;
}

const platforms: PlatformConfig[] = [
  {
    id: 'linkedin',
    tileBg: '#FFFFFF',
    name: 'LinkedIn',
    color: '#0A66C2',
    getUrl: (p) => p.linkedin_url,
    icon: <LinkedInIcon className="h-5 w-5" connected={true} />
  },
  {
    id: 'instagram',
    tileBg: '#FFFFFF',
    name: 'Instagram',
    color: '#E4405F',
    getUrl: (p) => p.instagram_url,
    icon: <InstagramIcon className="h-5 w-5" connected={true} />
  },
  {
    id: 'x',
    tileBg: '#FFFFFF',
    name: 'X',
    color: '#000000',
    getUrl: (p) => p.x_url,
    icon: <XIcon className="h-5 w-5" />
  },
  {
    id: 'tiktok',
    tileBg: '#000000',
    name: 'TikTok',
    color: '#00f2ea',
    getUrl: (p) => p.tiktok_url,
    icon: <TikTokIcon className="h-5 w-5" connected={true} />
  },
  {
    id: 'youtube',
    tileBg: '#FFFFFF',
    name: 'YouTube',
    color: '#FF0000',
    getUrl: (p) => p.youtube_url,
    icon: <YouTubeIcon className="h-5 w-5" connected={true} />
  },
  {
    id: 'facebook',
    tileBg: '#FFFFFF',
    name: 'Facebook',
    color: '#1877F2',
    getUrl: (p) => p.facebook_url,
    icon: <FacebookIcon className="h-5 w-5" connected={true} />
  }
];

export function MobileIdCardBack({
  profile,
  editMode = false,
  isOwner = true,
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

  // "+" → channel picker → the same edit dialog as a logo tap (VTID-04979).
  // The dialog only opens once the picker has finished closing, so vaul's
  // scroll lock / focus trap is released before Radix takes its own.
  const [pickerOpen, setPickerOpen] = useState(false);
  const pendingPlatform = useRef<PlatformConfig | null>(null);
  const [pendingTick, setPendingTick] = useState(0);

  const openPending = useCallback(() => {
    const platform = pendingPlatform.current;
    if (!platform) return;
    pendingPlatform.current = null;
    handleConnect(platform);
  }, []);

  const handlePick = (id: string) => {
    const platform = platforms.find((p) => p.id === id);
    if (!platform) return;
    pendingPlatform.current = platform;
    setPickerOpen(false);
    setPendingTick((n) => n + 1);
  };

  // Fallback if onAnimationEnd never fires: open after vaul's 500 ms close transition.
  useEffect(() => {
    if (pickerOpen || !pendingPlatform.current) return;
    const timer = setTimeout(openPending, 550);
    return () => clearTimeout(timer);
  }, [pickerOpen, pendingTick, openPending]);

  const addButton = (
    <button
      type="button"
      data-testid="social-add-channel"
      onClick={() => setPickerOpen(true)}
      aria-label={translate('socialImport.addChannelAria', 'Add a social channel')}
      className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center mx-auto shadow-sm transition-colors hover:bg-white active:scale-95"
    >
      <Plus className="h-5 w-5 text-slate-600" />
    </button>
  );

  return (
    <div className={cn("px-4 pb-2", className)}>
      {/* Pastel Card - Same style as Front ID */}
      <div
        className="relative rounded-2xl border border-white/60 overflow-hidden"
        style={{
          // Android WebView (Appilix) can drop a card's gradient `background`
          // when the card paints on its own compositing layer, washing it out
          // to the page underneath (see MobileIdentityCard.tsx for the
          // original occurrence). Keep a SOLID pastel `backgroundColor` as a
          // fallback so the card still renders on-brand even if the gradient
          // layer fails to paint, and promote the card onto its own stable
          // compositing layer so descendants can't knock out its background.
          backgroundColor: "hsl(218, 65%, 92%)",
          backgroundImage: "linear-gradient(170deg, hsl(205, 85%, 89%) 0%, hsl(228, 72%, 92%) 40%, hsl(262, 55%, 93%) 72%, hsl(310, 55%, 94%) 100%)",
          boxShadow: "0 8px 28px rgba(99, 102, 241, 0.14)",
          isolation: "isolate",
          transform: "translateZ(0)"
        }}
      >

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {translate('socialImport.socialPresence', 'Social Presence')}
            </h2>
            <p className="text-xs text-slate-600">
              {translate('socialImport.verifiedConnections', 'Verified connections across your digital life')}
            </p>
          </div>

          {isOwner ? (
            <>
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
                        <ExternalLink className="h-2.5 w-2.5 text-slate-500 mt-1" />
                      </button>
                    );
                  })}
                  <div className="flex items-center justify-center p-3">{addButton}</div>
                </div>
              )}

              {/* Unconnected Platforms - Compact row */}
              {unconnectedPlatforms.length > 0 && editMode && (
                <>
                  <div className="h-px bg-black/5 my-4" />
                  <p className="text-[11px] text-slate-600 text-center mb-2">{translate('socialImport.connect', 'Connect:')}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {unconnectedPlatforms.map((platform) => (
                      <button
                        key={platform.id}
                        type="button"
                        data-testid={`social-connect-${platform.id}`}
                        onClick={() => handleConnect(platform)}
                        aria-label={translate('socialImport.connectPlatformAria', 'Connect {platform}').replace('{platform}', platform.name)}
                        className="flex items-center justify-center w-9 h-9 rounded-xl border border-black/5 shadow-sm transition-transform active:scale-95 [&_svg]:h-6 [&_svg]:w-6"
                        style={{ backgroundColor: platform.tileBg }}
                      >
                        {platform.icon}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Empty state when no platforms connected */}
              {connectedPlatforms.length === 0 && (
                <div className="text-center py-6">
                  <div className="mb-3">{addButton}</div>
                  <p className="text-sm text-slate-600 mb-3">{translate('socialImport.noAccountsConnected', 'No social accounts connected')}</p>
                </div>
              )}

              {/* Subtle footer note */}
              {connectedPlatforms.length > 0 && (
                <p className="text-[11px] text-slate-500 text-center mt-4 italic">
                  {translate('socialImport.tapToVisit', 'Tap to visit profile')}
                </p>
              )}
            </>
          ) : (
            <>
              {/* Visitor view: every platform shown as connected/not-linked —
                  never a "+" or any connect affordance, which would wrongly
                  imply the viewer can link accounts to someone else's
                  profile. Mirrors the desktop ProfileIdCardBack.tsx pattern. */}
              <div className="grid grid-cols-3 gap-3">
                {platforms.map((platform) => {
                  const url = platform.getUrl(profile);
                  const connected = !!url;
                  return connected ? (
                    <button
                      key={platform.id}
                      onClick={() => handleOpenProfile(url)}
                      className="flex flex-col items-center p-3 rounded-xl border transition-all duration-200 active:scale-95"
                      style={{
                        backgroundColor: `${platform.color}10`,
                        borderColor: `${platform.color}30`
                      }}
                    >
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
                      <span className="text-[10px] font-semibold" style={{ color: platform.color }}>
                        {platform.name}
                      </span>
                      <ExternalLink className="h-2.5 w-2.5 text-slate-500 mt-1" />
                    </button>
                  ) : (
                    <div
                      key={platform.id}
                      className="flex flex-col items-center p-3 rounded-xl border border-black/5 bg-white/30"
                    >
                      <div className="mb-2 opacity-40 grayscale">
                        {platform.icon}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {platform.name}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1">
                        {translate('screens.profile.notLinked', 'Not linked')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {connectedPlatforms.length > 0 && (
                <p className="text-[11px] text-slate-500 text-center mt-4 italic">
                  {translate('socialImport.tapToVisit', 'Tap to visit profile')}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {isOwner && (
        <SocialChannelPickerDrawer
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onClosed={openPending}
          onPick={handlePick}
          channels={platforms.map((p) => ({
            id: p.id,
            name: p.name,
            icon: p.icon,
            tileBg: p.tileBg,
            connected: !!p.getUrl(profile),
          }))}
        />
      )}

      {/* Social Media Import Dialog */}
      {selectedPlatform && (
        <SocialMediaImportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          platform={selectedPlatform.id}
          platformName={selectedPlatform.name}
          icon={selectedPlatform.icon}
          initialUrl={selectedPlatform.getUrl(profile)}
          profileId={user?.id || (profile.user_id && profile.user_id !== 'current-user' ? profile.user_id : '')}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
