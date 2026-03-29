import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { settingsNavigation } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { useProfile } from "@/context/ProfileProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSocialPlatforms } from "@/hooks/useSocialPlatforms";
import { SocialMediaImportDialog } from "@/components/profile/dialogs/SocialMediaImportDialog";
import { ExternalLink, LinkIcon } from "lucide-react";

type Platform = 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'x';

export default function SocialConnect() {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const isMobile = useIsMobile();
  const { allPlatforms } = useSocialPlatforms();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("linkedin");
  const [selectedPlatformName, setSelectedPlatformName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<React.ReactNode>(null);

  const handleOpenDialog = (platformId: string, platformName: string, icon: React.ComponentType<any>) => {
    setSelectedPlatform(platformId as Platform);
    setSelectedPlatformName(platformName);
    const IconComponent = icon;
    setSelectedIcon(<IconComponent className="h-5 w-5" />);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    refreshProfile();
  };

  return (
    <AppLayout>
      <SEO title="Social Accounts" />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-subtle min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <StandardHeader
            title="Social Accounts"
            description="Connect your accounts to auto-fill your profile"
            emoji="🔗"
          />

          <p className="text-sm text-muted-foreground">
            Paste your social profile URL and we'll use AI to enrich your Vitana profile — no OAuth needed!
          </p>

          <div className="space-y-3">
            {allPlatforms.map((platform) => {
              const IconComponent = platform.icon;
              return (
                <Card key={platform.id}>
                  <CardContent className={isMobile ? "p-4" : "p-5"}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 ${platform.color}`}>
                          <IconComponent className="w-8 h-8" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{platform.name}</p>
                          {platform.connected && platform.url ? (
                            <a
                              href={platform.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary truncate block max-w-[200px]"
                            >
                              {platform.url}
                            </a>
                          ) : (
                            <p className="text-xs text-muted-foreground">Not connected</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {platform.connected ? (
                          <>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Connected
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(platform.id, platform.name, platform.icon)}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Reconnect
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleOpenDialog(platform.id, platform.name, platform.icon)}
                          >
                            <LinkIcon className="w-4 h-4 mr-1" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {user?.id && (
        <SocialMediaImportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          platform={selectedPlatform}
          platformName={selectedPlatformName}
          icon={selectedIcon}
          profileId={user.id}
          onSuccess={handleSuccess}
        />
      )}
    </AppLayout>
  );
}