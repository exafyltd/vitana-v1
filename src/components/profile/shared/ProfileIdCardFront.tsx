import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MessageSquare, ExternalLink, Star, Edit3, Share2 } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { useNavigate } from "react-router-dom";
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useFollow } from "@/hooks/useFollow";
import { useProfileShare } from "@/hooks/useProfileShare";
import { ProfileShareSheet } from "./ProfileShareSheet";
import { useCommunityLogger } from "@/hooks/useCommunityLogger";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProfileIdCardFrontProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEdit?: () => void;
}

export function ProfileIdCardFront({ profile, scope, editMode, onEdit }: ProfileIdCardFrontProps) {
  const isOwner = scope === 'owner';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createThread } = useHybridMessages('global');
  const { toast } = useToast();
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const { isFollowing, loading: followLoading, followUser, unfollowUser } = useFollow(profile.id);
  const { logFollow, logUnfollow, logProfileView, logMessageSend } = useCommunityLogger();

  const handleFollowClick = async () => {
    if (isFollowing) {
      await unfollowUser();
      logUnfollow(profile.id, profile.name);
    } else {
      await followUser();
      logFollow(profile.id, profile.name);
    }
  };

  // Determine if profile is public
  const isPublicProfile = profile.visibility?.indexPublic !== false;

  const shareHook = useProfileShare({
    handle: profile.handle,
    name: profile.name,
    profileId: profile.id,
    isPublic: isPublicProfile
  });

  const handleMessageClick = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send messages",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingThread(true);
    try {
      const thread = await createThread([profile.id]);
      if (thread?.id) {
        logMessageSend(thread.id, 'direct', 'global');
        navigate('/inbox/direct', { state: { selectedThreadId: thread.id } });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingThread(false);
    }
  };
  
  return (
    <div className="relative h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-white/90 via-white/60 to-white/30 dark:from-gray-900/90 dark:via-gray-900/60 dark:to-gray-900/30 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/5 via-transparent to-[hsl(var(--pill-mental-accent))]/5 pointer-events-none" />
      
      {/* User ID Chip - Top Right */}
      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 shadow-sm">
        <span className="text-xs font-medium text-muted-foreground">ID • {profile.id.slice(0, 8)}</span>
      </div>
      
      {/* Avatar with Glowing Ring */}
      <div className="relative mb-4 z-10">
        {/* Animated ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-52 h-52 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/20 to-[hsl(var(--pill-nutrition-accent))]/20 blur-3xl animate-pulse" />
        </div>
        
        {/* Glowing ring animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[200px] h-[200px] rounded-full border-2 border-[hsl(var(--sys-vitana-accent))]/30 animate-pulse" 
               style={{
                 boxShadow: '0 0 30px hsl(var(--sys-vitana-accent) / 0.3), inset 0 0 20px hsl(var(--sys-vitana-accent) / 0.1)'
               }} />
        </div>
        
        <Avatar className="relative h-48 w-48 border-4 border-white/80 dark:border-gray-800/80 shadow-[0_20px_60px_rgba(0,0,0,0.2),0_0_40px_hsl(var(--sys-vitana-accent)/0.2)]"
                style={{
                  filter: 'drop-shadow(0 0 20px hsl(var(--sys-vitana-accent) / 0.3))'
                }}>
          <AvatarImage src={profile.avatarUrl} alt={profile.name} className="object-cover" />
          <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] text-white">
            {profile.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        {editMode && onEdit && (
          <Button
            size="sm"
            variant="outline"
            className="absolute bottom-2 right-2 h-9 w-9 rounded-full p-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:scale-110 transition-transform"
            onClick={onEdit}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Name, Handle, VITANA Index */}
      <div className="relative text-center mb-4 w-full z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-foreground">{profile.name}</h1>
          {profile.roles.includes('professional') && (
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400 drop-shadow-md" />
          )}
          {/* Animated VITANA Index Orb */}
          {profile.vitanaIndex && (
            <div className="relative flex items-center">
              {/* Pulsing glow layers */}
              <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/30 to-[hsl(var(--pill-nutrition-accent))]/30 blur-2xl animate-pulse"></div>
              
              {/* Main orb with gradient */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] shadow-[0_10px_40px_rgba(0,0,0,0.15),0_0_30px_hsl(var(--sys-vitana-accent)/0.4)] border-2 border-white/30 dark:border-white/20 flex flex-col items-center justify-center animate-pulse"
                   style={{
                     background: 'linear-gradient(135deg, hsl(var(--sys-vitana-accent)) 0%, hsl(var(--pill-nutrition-accent)) 100%)',
                   }}>
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="text-xl font-bold leading-none text-white drop-shadow-md">{profile.vitanaIndex}</div>
                  <div className="text-[7px] font-semibold leading-tight mt-0.5 text-white/90">
                    VITANA
                  </div>
                </div>
              </div>
              
              {/* Tier badge as gradient chip */}
              {profile.vitanaPercentile && (
                <div className="absolute -top-1 -right-1 z-20">
                  <div className="h-4 px-2 rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 shadow-lg flex items-center justify-center border border-white/30">
                    <span className="text-[7px] font-bold text-white leading-none">TOP {100 - profile.vitanaPercentile}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-3">
          <p className="text-base text-muted-foreground">@{profile.handle}</p>
          {profile.longevityArchetype && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{profile.longevityArchetype}</span>
            </>
          )}
        </div>
        
        {/* Role Badges - Gradient Chips */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
          {profile.roles.map((role) => (
            <div key={role} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))]/20 to-[hsl(var(--pill-nutrition-accent))]/20 rounded-full blur-sm group-hover:blur-md transition-all" />
              <Badge variant="secondary" className="relative capitalize bg-gradient-to-r from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-800/60 backdrop-blur-sm border-[hsl(var(--sys-vitana-accent))]/20 shadow-sm">
                {role}
              </Badge>
            </div>
          ))}
          {profile.membershipTier && (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))]/30 to-[hsl(var(--pill-nutrition-accent))]/30 rounded-full blur-sm group-hover:blur-md transition-all" />
              <Badge variant="outline" className="relative capitalize bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))]/10 to-[hsl(var(--pill-nutrition-accent))]/10 border-[hsl(var(--sys-vitana-accent))]/30 text-[hsl(var(--sys-vitana-accent))] font-semibold shadow-sm">
                {profile.membershipTier}
              </Badge>
            </div>
          )}
        </div>

        {/* Glass Action Buttons with Hover Lift */}
        <div className="flex items-center justify-center gap-3">
          {isOwner ? (
            <>
              <Button variant="ghost" className="rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:-translate-y-0.5 transition-all shadow-sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
              {editMode && onEdit && (
                <Button 
                  variant="outline" 
                  onClick={onEdit}
                  className="rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:-translate-y-0.5 transition-all shadow-sm"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Identity
                </Button>
              )}
            </>
          ) : (
            <>
              <Button 
                variant={isFollowing ? "secondary" : "default"} 
                className="rounded-full bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] hover:shadow-lg hover:-translate-y-1 transition-all shadow-md border-0 text-white"
                onClick={handleFollowClick}
                disabled={followLoading}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
              </Button>
              <Button 
                variant="outline" 
                className="rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:-translate-y-1 transition-all shadow-md" 
                onClick={handleMessageClick}
                disabled={isCreatingThread}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isCreatingThread ? "Opening..." : "Message"}
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <ProfileShareSheet
                        isOpen={shareHook.isShareOpen}
                        onOpenChange={shareHook.setIsShareOpen}
                        onCopyLink={shareHook.copyLink}
                        onShareToX={shareHook.shareToX}
                        onShareToLinkedIn={shareHook.shareToLinkedIn}
                        onShareToWhatsApp={shareHook.shareToWhatsApp}
                        onShareViaEmail={shareHook.shareViaEmail}
                        onShareNative={shareHook.shareNative}
                        canUseNativeShare={shareHook.canUseNativeShare}
                        trigger={
                          <Button 
                            variant="outline" 
                            className="rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:-translate-y-1 transition-all shadow-md"
                            onClick={shareHook.openShare}
                            disabled={!shareHook.isPublic}
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </Button>
                        }
                      />
                    </div>
                  </TooltipTrigger>
                  {!shareHook.isPublic && (
                    <TooltipContent>
                      <p>Profile must be public to share</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
