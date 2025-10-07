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
    <div className="relative h-full flex flex-col items-center justify-center p-8 bg-card border rounded-2xl shadow-lg">
      {/* Avatar */}
      <div className="relative mb-4">
        {/* Ambient glow behind avatar */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full" 
               style={{
                 backgroundColor: 'hsl(var(--accent))',
                 opacity: 0.06,
                 filter: 'blur(40px)'
               }} />
        </div>
        
        <Avatar className="relative h-48 w-48 border-4 border-background shadow-xl drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(0, 0, 0, 0.1)) drop-shadow(0 8px 32px rgba(0, 0, 0, 0.15))'
                }}>
          <AvatarImage src={profile.avatarUrl} alt={profile.name} />
          <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
            {profile.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        {editMode && onEdit && (
          <Button
            size="sm"
            variant="outline"
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full p-0 bg-background shadow-lg"
            onClick={onEdit}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Name, Handle, VITANA Index */}
      <div className="text-center mb-4 w-full">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
          {profile.roles.includes('professional') && (
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          )}
          {/* VITANA Index Badge */}
          {profile.vitanaIndex && (
            <div className="relative flex items-center">
              <div className="absolute inset-0 w-14 h-14 rounded-full bg-white/40 blur-lg animate-pulse"></div>
              
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 shadow-xl border border-gray-300/60 flex flex-col items-center justify-center animate-pulse"
                   style={{
                     background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
                     boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                   }}>
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="text-lg font-bold leading-none" style={{color: '#006D5B'}}>{profile.vitanaIndex}</div>
                  <div className="text-[6px] font-medium leading-tight mt-0.5" style={{color: '#2C2C2C'}}>
                    <span className="font-semibold">VITANA</span>
                  </div>
                </div>
              </div>
              
              {profile.vitanaPercentile && (
                <div className="absolute -top-1 -right-1 z-20">
                  <div className="h-3 px-1 rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 shadow-md flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white leading-none">TOP {100 - profile.vitanaPercentile}%</span>
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
        
        {/* Role Badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
          {profile.roles.map((role) => (
            <Badge key={role} variant="secondary" className="capitalize">
              {role}
            </Badge>
          ))}
          {profile.membershipTier && (
            <Badge variant="outline" className="capitalize text-primary">
              {profile.membershipTier}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2">
          {isOwner ? (
            <>
              <Button variant="ghost" className="rounded-full">
                <ExternalLink className="h-4 w-4" />
              </Button>
              {editMode && onEdit && (
                <Button 
                  variant="outline" 
                  onClick={onEdit}
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
                className="rounded-full"
                onClick={handleFollowClick}
                disabled={followLoading}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
              </Button>
              <Button 
                variant="outline" 
                className="rounded-full" 
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
                            className="rounded-full"
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
