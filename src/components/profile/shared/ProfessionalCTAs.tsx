import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProfessionalCredentials } from "@/types/profile";
import { Video, Users, Calendar, MessageCircle, Play, Zap } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ProfessionalCTAsProps {
  credentials?: ProfessionalCredentials;
  isOwnProfile?: boolean;
  onGoLive?: () => void;
  onJoinLive?: () => void;
  onBookSession?: () => void;
  onMessage?: () => void;
}

export function ProfessionalCTAs({ 
  credentials, 
  isOwnProfile = false,
  onGoLive,
  onJoinLive,
  onBookSession,
  onMessage
}: ProfessionalCTAsProps) {
  // Allow rendering even without credentials (use sensible defaults)
  const isCurrentlyLive = credentials?.currentlyLive ?? false;
  const canGoLive = credentials?.isLiveStreamingEnabled ?? true;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="p-4">
        {/* Live Status */}
        {isCurrentlyLive && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-red-700">{t('screens.profile.liveNow')}</span>
            </div>
            <p className="text-sm text-red-700 mb-2">{credentials.liveSessionTitle}</p>
            <div className="flex items-center gap-1 text-xs text-red-600">
              <Users className="h-3 w-3" />
              <span>{credentials.liveViewerCount || 0} watching</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {isOwnProfile ? (
            // Owner View - Go Live Button
            <>
              {canGoLive && (
                <Button 
                  onClick={onGoLive}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
                  size="lg"
                >
                  {isCurrentlyLive ? (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Manage Live Session
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      {t('screens.profile.goLive')}
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={onBookSession} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                {t('screens.profile.manageAvailability')}
              </Button>
            </>
          ) : (
            // Visitor View - Join Live / Book Session
            <>
              {isCurrentlyLive && (
                <Button 
                  onClick={onJoinLive}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {t('screens.profile.joinLiveSession')}
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={onBookSession} className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('screens.profile.bookSession')}
                </Button>
                <Button variant="outline" onClick={onMessage} className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t('screens.profile.message')}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-4 pt-3 border-t border-muted/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('screens.profile.responseRate95')}</span>
            <span>{t('screens.profile.avgResponse2h')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}