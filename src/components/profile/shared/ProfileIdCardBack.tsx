import { UserProfile } from "@/types/profile";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);
  
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

  // Parse links to identify connected social media platforms
  const socialLinks: SocialLink[] = [];
  
  if (profile.links) {
    profile.links.forEach(link => {
      const matchedPlatform = allPlatforms.find(p => p.urlPattern.test(link.url));
      if (matchedPlatform) {
        socialLinks.push({
          platform: matchedPlatform.name,
          url: link.url,
          icon: matchedPlatform.icon,
          color: matchedPlatform.color,
        });
      }
    });
  }

  const handleConnect = (platform: PlatformConfig) => {
    setSelectedPlatform(platform);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="relative h-full flex flex-col items-center justify-center p-8 bg-card border rounded-2xl shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Connect Social Media</h2>
          <p className="text-sm text-muted-foreground">Import your profiles to enrich Vitana</p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {allPlatforms.map((platform) => {
            const isConnected = socialLinks.some(s => s.platform === platform.name);
            
            return (
              <div
                key={platform.name}
                className={`group relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition-all ${platform.color}`}
              >
                <div className="text-muted-foreground">
                  {platform.icon}
                </div>
                <span className="text-xs font-medium text-foreground">{platform.name}</span>
                
                {isConnected ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <LinkIcon className="h-3 w-3" />
                    <span>Connected</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-3"
                    onClick={() => handleConnect(platform)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground/60 text-center mt-4 max-w-xs">
          Connect accounts to auto-import bio, photos, and professional info
        </p>

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
          profileId={profile.user_id || profile.id}
        />
      )}
    </>
  );
}
