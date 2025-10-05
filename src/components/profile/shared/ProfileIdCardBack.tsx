import { UserProfile } from "@/types/profile";
import { Instagram, Linkedin, Youtube, Plus, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/icons/XIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { useState } from "react";
import { LinkedInImportDialog } from "@/components/profile/dialogs/LinkedInImportDialog";

interface ProfileIdCardBackProps {
  profile: UserProfile;
}

interface SocialLink {
  platform: string;
  url: string;
  icon: React.ReactNode;
  color: string;
}

export function ProfileIdCardBack({ profile }: ProfileIdCardBackProps) {
  const [linkedInDialogOpen, setLinkedInDialogOpen] = useState(false);
  
  // Parse links to identify social media platforms
  const socialLinks: SocialLink[] = [];
  
  const platformPatterns = [
    { name: 'Instagram', pattern: /instagram\.com/i, icon: <Instagram className="h-6 w-6" strokeWidth={1.5} />, color: 'hover:text-pink-600' },
    { name: 'TikTok', pattern: /tiktok\.com/i, icon: <TikTokIcon className="h-6 w-6" strokeWidth={1.5} />, color: 'hover:text-gray-900' },
    { name: 'LinkedIn', pattern: /linkedin\.com/i, icon: <Linkedin className="h-6 w-6" strokeWidth={1.5} />, color: 'hover:text-blue-600' },
    { name: 'YouTube', pattern: /youtube\.com|youtu\.be/i, icon: <Youtube className="h-6 w-6" strokeWidth={1.5} />, color: 'hover:text-red-600' },
    { name: 'X', pattern: /twitter\.com|x\.com/i, icon: <XIcon className="h-6 w-6" strokeWidth={1.5} />, color: 'hover:text-gray-900' },
  ];

  if (profile.links) {
    profile.links.forEach(link => {
      const matchedPlatform = platformPatterns.find(p => p.pattern.test(link.url));
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

  // Define all available platforms to show connect buttons
  const allPlatforms = [
    { name: 'LinkedIn', icon: <Linkedin className="h-5 w-5" />, color: 'hover:bg-blue-50 dark:hover:bg-blue-950', action: () => setLinkedInDialogOpen(true) },
    { name: 'Instagram', icon: <Instagram className="h-5 w-5" />, color: 'hover:bg-pink-50 dark:hover:bg-pink-950' },
    { name: 'X', icon: <XIcon className="h-5 w-5" />, color: 'hover:bg-gray-50 dark:hover:bg-gray-900' },
    { name: 'TikTok', icon: <TikTokIcon className="h-5 w-5" />, color: 'hover:bg-gray-50 dark:hover:bg-gray-900' },
    { name: 'YouTube', icon: <Youtube className="h-5 w-5" />, color: 'hover:bg-red-50 dark:hover:bg-red-950' },
  ];

  const handleConnect = (platform: string, action?: () => void) => {
    if (action) {
      action();
    } else {
      console.log(`Connect to ${platform} - Coming soon!`);
    }
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
                    onClick={() => handleConnect(platform.name, platform.action)}
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

      <LinkedInImportDialog 
        open={linkedInDialogOpen} 
        onOpenChange={setLinkedInDialogOpen}
        profileId={profile.id}
      />
    </>
  );
}
