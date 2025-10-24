import { UserProfile } from "@/types/profile";
import { useAuth } from "@/context/AuthProvider";
import { Globe } from "lucide-react";
import { Linkedin, Youtube, Facebook } from "lucide-react";
import { XIcon } from "@/components/icons/XIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { cn } from "@/lib/utils";
import { useProfileTheme } from "@/hooks/useProfileTheme";

interface ProfileIdCardBackProps {
  profile: UserProfile;
}

interface PlatformInfo {
  name: string;
  icon: React.ReactNode;
  url?: string;
  color: string;
}

export function ProfileIdCardBack({ profile }: ProfileIdCardBackProps) {
  const { user } = useAuth();
  const isOwnProfile = user?.id === (profile.user_id || profile.id);
  const targetUserId = isOwnProfile ? user?.id : profile.id;
  const { themeConfig } = useProfileTheme(targetUserId);
  const isFocusTheme = themeConfig.name === 'focus';

  // Get connected platforms with their info
  const connectedPlatforms: PlatformInfo[] = [
    profile.linkedin_url && {
      name: 'LinkedIn',
      icon: <Linkedin className="w-7 h-7" />,
      url: profile.linkedin_url,
      color: '#0A66C2'
    },
    profile.instagram_url && {
      name: 'Instagram',
      icon: <InstagramIcon className="w-7 h-7" connected={true} />,
      url: profile.instagram_url,
      color: '#E4405F'
    },
    profile.x_url && {
      name: 'X',
      icon: <XIcon className="w-7 h-7" />,
      url: profile.x_url,
      color: isFocusTheme ? '#FFFFFF' : '#0F1419'
    },
    profile.tiktok_url && {
      name: 'TikTok',
      icon: <TikTokIcon className="w-7 h-7" />,
      url: profile.tiktok_url,
      color: '#00F2EA'
    },
    profile.youtube_url && {
      name: 'YouTube',
      icon: <Youtube className="w-7 h-7" />,
      url: profile.youtube_url,
      color: '#FF0000'
    },
    profile.facebook_url && {
      name: 'Facebook',
      icon: <Facebook className="w-7 h-7" />,
      url: profile.facebook_url,
      color: '#1877F2'
    },
  ].filter(Boolean) as PlatformInfo[];

  return (
    <div
      className={cn(
        "relative group",
        isFocusTheme 
          ? "bg-white/10 dark:bg-white/10 backdrop-blur-2xl" 
          : "bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl",
        "border border-gray-200/60 dark:border-gray-700/60",
        "rounded-3xl p-8",
        isFocusTheme
          ? "shadow-[0_30px_80px_rgba(147,51,234,0.25),0_10px_40px_rgba(99,102,241,0.15),inset_0_1px_0_rgba(139,92,246,0.1)]"
          : "shadow-[0_30px_60px_rgba(0,0,0,0.08),0_10px_25px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.3)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.4),0_10px_25px_rgba(0,0,0,0.3)]",
        "transition-all duration-500 ease-in-out",
        "overflow-hidden"
      )}
    >
      {/* Left edge ambient glow for Focus theme */}
      {isFocusTheme && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-violet-600/40 to-transparent pointer-events-none transition-opacity duration-500"
        />
      )}

      {/* Themed gradient border using mask */}
      <div 
        className={cn(
          "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          "pointer-events-none"
        )}
        style={{
          background: `linear-gradient(135deg, ${themeConfig.backCard.borderGradient.split(' ').map((c: string) => {
            if (c.startsWith('from-')) return c.replace('from-', '');
            if (c.startsWith('via-')) return c.replace('via-', '');
            if (c.startsWith('to-')) return c.replace('to-', '');
            return c;
          }).filter((c: string) => c).map((c: string, i: number, arr: string[]) => {
            const colors = ['var(--tw-gradient-from)', 'var(--tw-gradient-via)', 'var(--tw-gradient-to)'];
            return i < arr.length ? colors[i] || c : c;
          }).join(', ')})`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '2px',
        }}
      />

      {/* Top accent stripe */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-1 opacity-60 transition-opacity duration-500",
          themeConfig.backCard.topStripe
        )}
      />

      {/* Corner glow effect */}
      <div 
        className={cn(
          "absolute top-0 right-0 w-48 h-48 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
          themeConfig.backCard.accentGlow
        )}
      />

      <div className="relative z-10 space-y-6">
        {/* Social Presence Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <Globe className={cn(
            "w-5 h-5",
            isFocusTheme ? "text-white/90" : "text-gray-700 dark:text-gray-300"
          )} />
          <h3 className={cn(
            "text-lg font-semibold",
            isFocusTheme ? "text-white/90" : "text-gray-800 dark:text-gray-200"
          )}>
            Social Presence
          </h3>
        </div>

        {/* Connected Platforms Grid */}
        {connectedPlatforms.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {connectedPlatforms.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group/tile relative flex items-center justify-center",
                  "w-16 h-16 rounded-2xl",
                  isFocusTheme 
                    ? "bg-white/5 dark:bg-white/5 backdrop-blur-sm"
                    : "bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm",
                  "border border-gray-200/50 dark:border-gray-700/50",
                  "transition-all duration-500 ease-out",
                  "hover:scale-110 hover:-translate-y-1",
                  themeConfig.backCard.platformHoverGlow
                )}
                style={{
                  boxShadow: isFocusTheme 
                    ? `0 4px 12px ${platform.color}15, 0 2px 6px ${platform.color}10`
                    : `0 4px 12px ${platform.color}20, 0 2px 6px ${platform.color}15`,
                }}
              >
                <div 
                  className="transition-all duration-500"
                  style={{ color: platform.color }}
                >
                  {platform.icon}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Empty State */}
        {connectedPlatforms.length === 0 && (
          <div className="text-center py-8">
            <p className={cn(
              "text-sm",
              isFocusTheme ? "text-gray-400/70" : "text-gray-500 dark:text-gray-400"
            )}>
              No social platforms connected yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
