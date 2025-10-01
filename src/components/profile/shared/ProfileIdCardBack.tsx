import { UserProfile } from "@/types/profile";
import { Instagram, Linkedin, Youtube, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/icons/XIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";

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

  return (
    <div className="relative h-full flex flex-col items-center justify-center p-8 bg-card border rounded-2xl shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Connect With Me</h2>
        <p className="text-sm text-muted-foreground">Follow on social media</p>
      </div>

      {socialLinks.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {socialLinks.map((social) => (
            <a
              key={social.platform}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Button
                variant="outline"
                className={`w-full h-20 flex flex-col items-center justify-center gap-2 transition-all ${social.color}`}
              >
                <div className="transition-transform group-hover:scale-110">
                  {social.icon}
                </div>
                <span className="text-xs font-medium">{social.platform}</span>
              </Button>
            </a>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-4">
            {[
              { icon: <Instagram className="h-6 w-6" strokeWidth={1.5} />, name: 'Instagram' },
              { icon: <Linkedin className="h-6 w-6" strokeWidth={1.5} />, name: 'LinkedIn' },
              { icon: <Youtube className="h-6 w-6" strokeWidth={1.5} />, name: 'YouTube' },
              { icon: <XIcon className="h-6 w-6" strokeWidth={1.5} />, name: 'X' },
              { icon: <TikTokIcon className="h-6 w-6" strokeWidth={1.5} />, name: 'TikTok' },
              { icon: <Plus className="h-6 w-6" strokeWidth={1.5} />, name: 'More', isPlaceholder: true },
            ].map((placeholder, index) => (
              <div
                key={placeholder.name}
                className={`group h-20 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed transition-all duration-300 cursor-pointer ${
                  placeholder.isPlaceholder 
                    ? 'border-muted-foreground/20 bg-muted/10 hover:border-muted-foreground/30 hover:bg-muted/15' 
                    : 'border-muted-foreground/30 bg-muted/20 animate-pulse hover:border-muted-foreground/50 hover:bg-muted/30 hover:shadow-md'
                } hover:scale-105`}
                style={{ animationDelay: `${index * 150}ms`, animationDuration: '3s' }}
              >
                <div className={`transition-all duration-300 group-hover:scale-110 ${
                  placeholder.isPlaceholder 
                    ? 'text-muted-foreground/30 group-hover:text-muted-foreground/40' 
                    : 'text-muted-foreground/40 group-hover:text-muted-foreground/60'
                }`}>
                  {placeholder.icon}
                </div>
                <span className={`text-xs transition-colors duration-300 ${
                  placeholder.isPlaceholder
                    ? 'text-muted-foreground/40 group-hover:text-muted-foreground/50'
                    : 'text-muted-foreground/50 group-hover:text-muted-foreground/70'
                }`}>{placeholder.name}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground/50 italic text-center mt-2">
            Add your social links to connect
          </p>
        </div>
      )}

      {/* ID Card decorative elements */}
      <div className="absolute top-4 right-4 text-xs text-muted-foreground/50">
        ID #{profile.id.slice(0, 8)}
      </div>
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground/50">
        @{profile.handle}
      </div>
    </div>
  );
}
