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
      <div className="relative h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-white/95 via-white/70 to-white/40 dark:from-gray-900/95 dark:via-gray-900/70 dark:to-gray-900/40 backdrop-blur-2xl border border-white/50 dark:border-gray-800/50 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.15),0_10px_30px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)] overflow-hidden animate-fade-in"
           style={{
             background: 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 100%)',
           }}>
        {/* Premium gradient overlay with radial depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--sys-vitana-accent))/8_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,hsl(var(--pill-mental-accent))/6_0%,transparent_50%)] pointer-events-none" />
        
        {/* Gradient bridge connecting panels */}
        <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-[hsl(var(--sys-vitana-accent))]/30 to-transparent pointer-events-none" />
        
        {/* User ID Chip - Embossed style - Top Right */}
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-gradient-to-br from-white/30 to-white/10 dark:from-gray-800/30 dark:to-gray-800/10 backdrop-blur-md border border-white/40 dark:border-gray-700/40 shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.5)] transition-all duration-300 hover:scale-105 animate-fade-in"
             style={{ animationDelay: '0.6s', opacity: 0, animationFillMode: 'forwards' }}>
          <span className="text-xs font-mono font-semibold text-foreground/70 tracking-wide">🆔 {profile.id.slice(0, 8)}</span>
        </div>
      
        {/* Avatar with Layered Glow System */}
        <div className="relative mb-5 z-10 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
          {/* Outer ambient halo - soft and wide */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/25 via-[hsl(var(--pill-nutrition-accent))]/20 to-[hsl(var(--pill-mental-accent))]/15 blur-[60px] animate-[pulse_4s_ease-in-out_infinite]" />
          </div>
          
          {/* Inner light ring - bright and focused */}
          <div className="absolute inset-0 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
            <div className="w-56 h-56 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/30 to-[hsl(var(--pill-nutrition-accent))]/25 blur-2xl" />
          </div>
          
          {/* Outer glow ring with pulse */}
          <div className="absolute inset-0 flex items-center justify-center animate-[pulse_3.5s_ease-in-out_infinite]">
            <div className="w-[210px] h-[210px] rounded-full border border-[hsl(var(--sys-vitana-accent))]/50" 
                 style={{
                   boxShadow: '0 0 30px hsl(var(--sys-vitana-accent) / 0.3), 0 0 60px hsl(var(--sys-vitana-accent) / 0.15), inset 0 0 20px hsl(var(--sys-vitana-accent) / 0.08)'
                 }} />
          </div>
          
          {/* Inner vitality ring */}
          <div className="absolute inset-0 flex items-center justify-center animate-[pulse_2.5s_ease-in-out_infinite]">
            <div className="w-[202px] h-[202px] rounded-full border-2 border-[hsl(var(--sys-vitana-accent))]/40" 
                 style={{
                   boxShadow: '0 0 40px hsl(var(--sys-vitana-accent) / 0.4), inset 0 0 25px hsl(var(--sys-vitana-accent) / 0.12)'
                 }} />
          </div>
          
          <Avatar className="relative h-48 w-48 border-[5px] border-white/90 dark:border-gray-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.25),0_0_50px_hsl(var(--sys-vitana-accent)/0.3),inset_0_2px_4px_rgba(255,255,255,0.5)] transition-all duration-500 hover:scale-105"
                  style={{
                    filter: 'drop-shadow(0 0 30px hsl(var(--sys-vitana-accent) / 0.4))'
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
        <div className="relative text-center mb-3.5 w-full z-10">
          <div className="flex items-center justify-center gap-4 mb-1.5 animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
            {/* Name with gradient text */}
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground/95 to-foreground/90 bg-clip-text text-transparent tracking-tight" 
                style={{ letterSpacing: '-0.02em' }}>
              {profile.name}
            </h1>
            
            {/* Glass Orb VITANA Index with animated pulse and gradient edge */}
            {profile.vitanaIndex && (
              <div className="relative flex items-center">
                {/* Triple-layer ethereal glow system */}
                <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/35 to-[hsl(var(--pill-nutrition-accent))]/35 blur-3xl animate-[pulse_2.5s_ease-in-out_infinite]"></div>
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/45 to-[hsl(var(--pill-nutrition-accent))]/45 blur-2xl animate-[pulse_2s_ease-in-out_infinite]"></div>
                <div className="absolute inset-0 w-18 h-18 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/50 to-[hsl(var(--pill-nutrition-accent))]/50 blur-xl animate-[pulse_3s_ease-in-out_infinite]"></div>
                
                {/* Glass orb with gradient border and inner light */}
                <div className="relative w-[68px] h-[68px] rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.15),0_0_50px_hsl(var(--sys-vitana-accent)/0.6),inset_0_2px_12px_rgba(255,255,255,0.3),inset_0_-2px_8px_rgba(0,0,0,0.1)] border-[3px] flex flex-col items-center justify-center animate-[pulse_2.8s_ease-in-out_infinite] transition-all duration-500 hover:scale-110 hover:shadow-[0_12px_50px_rgba(0,0,0,0.2),0_0_70px_hsl(var(--sys-vitana-accent)/0.8)] cursor-pointer group"
                     style={{
                       background: 'linear-gradient(135deg, hsl(var(--sys-vitana-accent)) 0%, hsl(var(--sys-vitana-accent))/95 50%, hsl(var(--pill-nutrition-accent)) 100%)',
                       borderImage: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2), hsl(var(--pill-nutrition-accent))/0.4) 1',
                       borderStyle: 'solid',
                     }}>
                  {/* Inner glass reflection */}
                  <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="flex flex-col items-center justify-center text-center relative z-10">
                    <div className="text-2xl font-extrabold leading-none text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)]">{profile.vitanaIndex}</div>
                    <div className="text-[8px] font-bold leading-tight mt-1 text-white/98 tracking-[0.08em] uppercase">
                      Vitana
                    </div>
                  </div>
                  
                  {/* Rotating gradient border effect */}
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                       style={{
                         background: 'conic-gradient(from 0deg, hsl(var(--sys-vitana-accent)), hsl(var(--pill-nutrition-accent)), hsl(var(--pill-mental-accent)), hsl(var(--sys-vitana-accent)))',
                         mask: 'radial-gradient(circle, transparent 95%, black 98%)',
                         WebkitMask: 'radial-gradient(circle, transparent 95%, black 98%)',
                       }} />
                </div>
                
                {/* Metallic gradient capsule for Top % badge */}
                {profile.vitanaPercentile && (
                  <div className="absolute -top-1.5 -right-2 z-20 animate-fade-in" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                    <div className="relative group/badge">
                      {/* Badge glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full blur-md opacity-60 group-hover/badge:opacity-80 transition-opacity" />
                      {/* Metallic badge */}
                      <div className="relative h-5 px-2.5 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-[0_4px_16px_rgba(251,191,36,0.5),inset_0_1px_2px_rgba(255,255,255,0.8),inset_0_-1px_2px_rgba(0,0,0,0.2)] flex items-center justify-center border border-amber-200/50 transition-all duration-300 hover:scale-110">
                        <span className="text-[8px] font-extrabold text-amber-950 leading-none tracking-[0.05em] drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
                          TOP {100 - profile.vitanaPercentile}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Handle with refined typography */}
          <div className="flex items-center justify-center gap-2 mb-2 animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
            <p className="text-base text-muted-foreground/75 font-light tracking-wide">@{profile.handle}</p>
            {profile.longevityArchetype && (
              <>
                <span className="text-muted-foreground/50 text-xs">•</span>
                <span className="text-sm text-muted-foreground/70 font-light tracking-wide">{profile.longevityArchetype}</span>
              </>
            )}
          </div>
          
          {/* Optional bio tagline */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground/75 max-w-md mx-auto mb-3 px-4 leading-relaxed font-light italic animate-fade-in" 
               style={{ animationDelay: '0.35s', opacity: 0, animationFillMode: 'forwards' }}>
              {profile.bio}
            </p>
          )}
          
          {/* Premium Metallic Membership Tier Capsule */}
          {(profile.roles.length > 0 || profile.membershipTier) && (
            <div className="flex items-center justify-center mb-4 animate-fade-in" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
              <div className="relative group/tier">
                {/* Glowing halo effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))]/40 via-[hsl(var(--pill-nutrition-accent))]/35 to-[hsl(var(--pill-mental-accent))]/30 rounded-full blur-xl group-hover/tier:blur-2xl transition-all duration-500 opacity-60 group-hover/tier:opacity-80" />
                
                {/* Metallic gradient capsule */}
                <div className="relative px-6 py-2.5 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/20 via-[hsl(var(--pill-nutrition-accent))]/15 to-[hsl(var(--sys-vitana-accent))]/10 backdrop-blur-md border-2 border-[hsl(var(--sys-vitana-accent))]/40 shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_rgba(0,0,0,0.16),inset_0_2px_6px_rgba(255,255,255,0.4)]">
                  {/* Inner shine reflection */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
                  
                  <span className="relative text-sm font-bold bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))] via-[hsl(var(--pill-nutrition-accent))] to-[hsl(var(--sys-vitana-accent))] bg-clip-text text-transparent tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                    {profile.membershipTier || profile.roles[0] || 'Community Member'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Premium Action Buttons with Enhanced Hover States */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 animate-fade-in" style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
            {isOwner ? (
              <>
                <Button 
                  variant="outline"
                  onClick={() => window.open(profileUrl, '_blank')}
                  className="rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-2 border-white/50 dark:border-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:-translate-y-1.5 hover:scale-105 transition-all duration-300 shadow-[0_6px_16px_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1),0_0_0_3px_rgba(147,51,234,0.1)] active:scale-100"
                >
                  <ExternalLink className="h-4 w-4 mr-2 text-foreground" />
                  <span className="text-foreground font-medium">View Public Profile</span>
                </Button>
                {editMode && onEdit && (
                  <Button 
                    variant="outline" 
                    onClick={onEdit}
                    className="rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-2 border-white/50 dark:border-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:-translate-y-1.5 hover:scale-105 transition-all duration-300 shadow-[0_6px_16px_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1),0_0_0_3px_rgba(147,51,234,0.1)] active:scale-100"
                  >
                    <Edit3 className="h-4 w-4 mr-2 text-foreground" />
                    <span className="text-foreground font-medium">Edit Identity</span>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button 
                  variant="default"
                  className="rounded-full bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] hover:from-[hsl(var(--sys-vitana-accent))]/90 hover:to-[hsl(var(--pill-nutrition-accent))]/90 hover:-translate-y-1.5 hover:scale-105 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.15),0_0_50px_hsl(var(--sys-vitana-accent)/0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2),0_0_80px_hsl(var(--sys-vitana-accent)/0.6),0_0_0_3px_hsl(var(--sys-vitana-accent)/0.2)] border-0 text-white font-semibold active:scale-100"
                  onClick={handleFollowClick}
                  disabled={followLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                </Button>
                
                <Button 
                  className="inline-flex items-center gap-2 rounded-full h-10 px-5 bg-white/20 dark:bg-gray-800/20 backdrop-blur-md border-2 border-white/30 dark:border-gray-700/30 text-foreground hover:bg-white/30 dark:hover:bg-gray-800/30 hover:border-white/40 dark:hover:border-gray-700/40 hover:-translate-y-1 hover:scale-105 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12),0_0_0_2px_hsl(var(--domain-messages-accent)/0.15)] font-medium active:scale-100"
                  onClick={handleMessageClick}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Message</span>
                </Button>
                
                <Button 
                  className="inline-flex items-center gap-2 rounded-full h-10 px-5 bg-white/20 dark:bg-gray-800/20 backdrop-blur-md border-2 border-white/30 dark:border-gray-700/30 text-foreground hover:bg-white/30 dark:hover:bg-gray-800/30 hover:border-white/40 dark:hover:border-gray-700/40 hover:-translate-y-1 hover:scale-105 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12),0_0_0_2px_hsl(var(--sys-vitana-accent)/0.15)] font-medium active:scale-100"
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
