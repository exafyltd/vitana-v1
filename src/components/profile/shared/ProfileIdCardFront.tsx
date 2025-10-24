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
import { MessageComposeModal } from "./MessageComposeModal";
import { ShareProfileModal } from "./ShareProfileModal";
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
  const { createThread, sendMessage } = useHybridMessages('global');
  const { toast } = useToast();
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const { isFollowing, loading: followLoading, followUser, unfollowUser } = useFollow(profile.id);
  const { logFollow, logUnfollow, logProfileView, logMessageSend } = useCommunityLogger();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

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

  const handleMessageClick = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send messages",
        variant: "destructive"
      });
      return;
    }

    if (isOwner) {
      toast({
        title: "Can't message yourself",
        description: "You cannot send messages to your own profile",
        variant: "destructive"
      });
      return;
    }

    setMessageModalOpen(true);
  };

  const handleSendMessage = async (message: string) => {
    setIsCreatingThread(true);
    try {
      // 1. Create or get existing thread
      const thread = await createThread([profile.id]);
      if (!thread?.id) {
        throw new Error('Failed to create thread');
      }

      // 2. Send the actual message content
      await sendMessage({
        context: 'global',
        threadId: thread.id,
        content: message,
        type: 'text'
      });

      // 3. Log the activity
      logMessageSend(thread.id, 'text', 'global');
      
      // 4. Show success and navigate to inbox
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully"
      });
      
      // 5. Navigate to inbox with thread selected
      navigate('/inbox', { 
        state: { selectedThreadId: thread.id } 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsCreatingThread(false);
    }
  };

  const handleShareToFacebook = () => {
    const url = shareHook.getShareUrl ? shareHook.getShareUrl() : `${window.location.origin}/u/${profile.handle}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
  };

  const handleViewPublicProfile = () => {
    window.open(`/u/${profile.handle}`, '_blank');
  };
  
  const profileUrl = `${window.location.origin}/u/${profile.handle}`;
  
  return (
    <>
      <div className="relative h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-white/90 via-white/60 to-white/30 dark:from-gray-900/90 dark:via-gray-900/60 dark:to-gray-900/30 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/5 via-transparent to-[hsl(var(--pill-mental-accent))]/5 pointer-events-none" />
        
        {/* Gradient bridge connecting panels */}
        <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-[hsl(var(--sys-vitana-accent))]/20 to-transparent pointer-events-none" />
        
        {/* User ID Chip - Top Right */}
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 shadow-sm">
          <span className="text-xs font-mono text-muted-foreground">🆔 {profile.id.slice(0, 8)}</span>
        </div>
      
        {/* Avatar with Glowing Ring */}
        <div className="relative mb-4 z-10">
          {/* Animated ambient glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-52 h-52 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/20 to-[hsl(var(--pill-nutrition-accent))]/20 blur-3xl animate-pulse" />
          </div>
          
          {/* Subtle pulsing vitality ring */}
          <div className="absolute inset-0 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
            <div className="w-[204px] h-[204px] rounded-full border border-[hsl(var(--sys-vitana-accent))]/40" 
                 style={{
                   boxShadow: '0 0 20px hsl(var(--sys-vitana-accent) / 0.2), inset 0 0 15px hsl(var(--sys-vitana-accent) / 0.05)'
                 }} />
          </div>
          
          {/* Main glowing ring animation */}
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
            {/* Animated VITANA Index Orb Gauge */}
            {profile.vitanaIndex && (
              <div className="relative flex items-center">
                {/* Dual-layer pulsing glow */}
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/30 to-[hsl(var(--pill-nutrition-accent))]/30 blur-2xl animate-[pulse_2s_ease-in-out_infinite]"></div>
                <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/40 to-[hsl(var(--pill-nutrition-accent))]/40 blur-xl animate-[pulse_3s_ease-in-out_infinite]"></div>
                
                {/* Main orb with enhanced gradient and shadow */}
                <div className="relative w-16 h-16 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_40px_hsl(var(--sys-vitana-accent)/0.5),inset_0_2px_8px_rgba(255,255,255,0.2)] border-2 border-white/40 dark:border-white/30 flex flex-col items-center justify-center animate-[pulse_2.5s_ease-in-out_infinite] transition-all duration-300 hover:scale-110"
                     style={{
                       background: 'linear-gradient(135deg, hsl(var(--sys-vitana-accent)) 0%, hsl(var(--pill-nutrition-accent)) 100%)',
                     }}>
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-xl font-bold leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">{profile.vitanaIndex}</div>
                    <div className="text-[7px] font-semibold leading-tight mt-0.5 text-white/95 tracking-wide">
                      VITANA
                    </div>
                  </div>
                </div>
                
                {/* Tier badge as gradient chip */}
                {profile.vitanaPercentile && (
                  <div className="absolute -top-1 -right-1 z-20">
                    <div className="h-4 px-2 rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 shadow-[0_4px_12px_rgba(255,165,0,0.4)] flex items-center justify-center border border-white/40">
                      <span className="text-[7px] font-bold text-white leading-none tracking-wide">TOP {100 - profile.vitanaPercentile}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-base text-muted-foreground">@{profile.handle}</p>
            {profile.longevityArchetype && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{profile.longevityArchetype}</span>
              </>
            )}
          </div>
          
          {/* Optional bio line */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground/80 max-w-md mx-auto mb-3 px-4">
              {profile.bio}
            </p>
          )}
          
          {/* Unified Membership Tier Gradient Capsule */}
          {(profile.roles.length > 0 || profile.membershipTier) && (
            <div className="flex items-center justify-center mb-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))]/30 to-[hsl(var(--pill-nutrition-accent))]/30 rounded-full blur-md group-hover:blur-lg transition-all" />
                <div className="relative px-5 py-2 rounded-full bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))]/15 to-[hsl(var(--pill-nutrition-accent))]/15 backdrop-blur-sm border border-[hsl(var(--sys-vitana-accent))]/30 shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,0.2)]">
                  <span className="text-sm font-semibold bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] bg-clip-text text-transparent">
                    {profile.membershipTier || profile.roles[0] || 'Community Member'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Glass Action Buttons with Soft Shadows and Hover Lift */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {isOwner ? (
              <>
                <Button 
                  variant="outline"
                  onClick={() => window.open(profileUrl, '_blank')}
                  className="rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:-translate-y-1 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.08)]"
                >
                  <ExternalLink className="h-4 w-4 mr-2 text-white dark:text-white" />
                  <span className="text-white dark:text-white">View Public Profile</span>
                </Button>
                {editMode && onEdit && (
                  <Button 
                    variant="outline" 
                    onClick={onEdit}
                    className="rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:-translate-y-1 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12),0_4px_8px_rgba(0,0,0,0.08)]"
                  >
                    <Edit3 className="h-4 w-4 mr-2 text-white dark:text-white" />
                    <span className="text-white dark:text-white">Edit Identity</span>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button 
                  variant="default"
                  className="rounded-full bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] hover:from-[hsl(var(--sys-vitana-accent))]/90 hover:to-[hsl(var(--pill-nutrition-accent))]/90 hover:-translate-y-1 transition-all shadow-[0_6px_20px_rgba(0,0,0,0.12),0_0_40px_hsl(var(--sys-vitana-accent)/0.3)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.16),0_0_60px_hsl(var(--sys-vitana-accent)/0.4)] border-0 text-white"
                  onClick={handleFollowClick}
                  disabled={followLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                </Button>
                
                <Button 
                  className="inline-flex items-center gap-2 rounded-full h-10 px-4 bg-white/10 backdrop-blur-md border border-white/20 text-foreground/80 hover:bg-white/20 hover:border-white/30 hover:text-foreground transition"
                  onClick={handleMessageClick}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Message</span>
                </Button>
                
                <Button 
                  className="inline-flex items-center gap-2 rounded-full h-10 px-4 bg-white/10 backdrop-blur-md border border-white/20 text-foreground/80 hover:bg-white/20 hover:border-white/30 hover:text-foreground transition"
                  onClick={() => setShareModalOpen(true)}
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Message Compose Modal */}
      {!isOwner && (
        <MessageComposeModal
          isOpen={messageModalOpen}
          onOpenChange={setMessageModalOpen}
          recipient={profile}
          onSend={handleSendMessage}
        />
      )}

      {/* Share Profile Modal */}
      {!isOwner && (
        <ShareProfileModal
          isOpen={shareModalOpen}
          onOpenChange={setShareModalOpen}
          profile={profile}
          onCopyLink={shareHook.copyLink}
          onShareToX={shareHook.shareToX}
          onShareToLinkedIn={shareHook.shareToLinkedIn}
          onShareToFacebook={handleShareToFacebook}
          onViewPublicProfile={handleViewPublicProfile}
        />
      )}
    </>
  );
}
