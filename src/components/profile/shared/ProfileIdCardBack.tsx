import { UserProfile } from "@/types/profile";
import { Instagram, Linkedin, Youtube, Twitter, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    { name: 'Instagram', pattern: /instagram\.com/i, icon: <Instagram className="h-6 w-6" />, color: 'hover:text-pink-600' },
    { name: 'TikTok', pattern: /tiktok\.com/i, icon: <ExternalLink className="h-6 w-6" />, color: 'hover:text-gray-900' },
    { name: 'LinkedIn', pattern: /linkedin\.com/i, icon: <Linkedin className="h-6 w-6" />, color: 'hover:text-blue-600' },
    { name: 'YouTube', pattern: /youtube\.com|youtu\.be/i, icon: <Youtube className="h-6 w-6" />, color: 'hover:text-red-600' },
    { name: 'Twitter', pattern: /twitter\.com|x\.com/i, icon: <Twitter className="h-6 w-6" />, color: 'hover:text-sky-500' },
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
    <div className="relative h-full flex flex-col items-center justify-center p-8 bg-card border rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Connect With Me</h2>
        <p className="text-sm text-muted-foreground">Follow on social media</p>
      </div>

      {socialLinks.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
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
        <div className="text-center text-muted-foreground text-sm py-8">
          <p>No social media links available</p>
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
