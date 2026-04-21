import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarPositionStyle } from "@/lib/avatarPosition";
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
import { ShareProfileSheet } from "./ShareProfileSheet";
import { MobileQRShareScreen } from "../mobile/MobileQRShareScreen";
import { useCommunityLogger } from "@/hooks/useCommunityLogger";
import { ThemeConfig } from "@/hooks/useProfileTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { resolveProfileUserId } from "@/lib/resolveProfileUserId";

interface ProfileIdCardFrontProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEdit?: () => void;
  themeConfig: ThemeConfig;
  cycleTheme: () => void;
}

export function ProfileIdCardFront({ profile, scope, editMode, onEdit, themeConfig, cycleTheme }: ProfileIdCardFrontProps) {
  const isOwner = scope === 'owner';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createThread, sendMessage } = useHybridMessages('global');
  const { toast } = useToast();
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const resolvedId = resolveProfileUserId(profile.user_id, profile.id, user?.id);
  const { isFollowing, loading: followLoading, followUser, unfollowUser } = useFollow(resolvedId);
  const { logFollow, logUnfollow, logProfileView, logMessageSend } = useCommunityLogger();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [qrScreenOpen, setQrScreenOpen] = useState(false);
  const { translate } = useTranslation();

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

  const handleShareToFacebook = shareHook.shareToFacebook;

  const handleViewPublicProfile = () => {
    window.open(`/u/${profile.handle}`, '_blank');
  };
  
  const profileUrl = `${window.location.origin}/u/${profile.handle}`;
  
  return (
    <>
      <div className={`relative h-full flex flex-col items-center justify-center p-8 backdrop-blur-2xl ${themeConfig.card.border} rounded-3xl ${themeConfig.card.shadow} overflow-hidden animate-fade-in transition-all duration-500 ease-in-out`}
           style={{
             background: themeConfig.card.background,
           }}>
        {/* Avatar-centered gradient glow (Serenity & Expression only) */}
        {(themeConfig.name === 'serenity' || themeConfig.name === 'expression') && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none" 
               style={{ 
                 background: 'radial-gradient(circle at top center, rgba(255,255,255,0.3), transparent 80%)',
               }} />
        )}
        
        {/* Premium gradient overlay with radial depth */}
        <div className={`absolute inset-0 ${themeConfig.card.overlay} pointer-events-none transition-all duration-500 ease-in-out`} />
        
        {/* Top Right Corner - ID Chip (Theme Switcher Disabled - Focus is Exclusive) */}
        <div className="absolute top-4 right-4 flex items-center gap-2 animate-fade-in z-20" style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
          {/* User ID Chip */}
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-br from-white/30 to-white/10 dark:from-gray-800/30 dark:to-gray-800/10 backdrop-blur-md border border-white/40 dark:border-gray-700/40 shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.5)] transition-all duration-300 hover:scale-105">
            <span className="text-xs font-mono font-semibold text-foreground/70 tracking-wide">🆔 {profile.id.slice(0, 8)}</span>
          </div>
        </div>
      
        {/* Avatar with Premium Subtle Depth - NO ANIMATIONS */}
        <div className="relative mb-5 z-10 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
          {/* Static soft ambient glow - single layer */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className={`w-56 h-56 rounded-full bg-gradient-to-br ${themeConfig.avatar.glow} blur-[40px] opacity-30 transition-colors duration-300`}
            />
          </div>
          
          {/* Static elegant ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className={`w-[202px] h-[202px] rounded-full border ${themeConfig.avatar.rings[0]} transition-all duration-300`}
              style={{
                boxShadow: '0 0 20px hsl(var(--sys-vitana-accent) / 0.15)'
              }}
            />
          </div>
          
          <Avatar 
            className={`relative h-48 w-48 ${themeConfig.avatar.border} ring-1 ring-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.06)] transition-transform duration-150 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none`}
            tabIndex={0}
            role="img"
            aria-label={`${profile.name}'s profile picture`}
          >
            <AvatarImage src={profile.avatarUrl} alt={profile.name} className="object-cover" style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)} />
            <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-[hsl(199,36%,48%)] to-[hsl(239,36%,67%)] text-white">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
      </div>

        {/* Name, Handle, VITANA Index */}
        <div className="relative text-center mb-3.5 w-full z-10">
          <div className="flex items-center justify-center gap-4 mb-1.5 animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
            {/* Name with gradient text */}
            <h1 className={`text-3xl font-bold ${themeConfig.text.name} tracking-tight transition-all duration-300 ease-out`} 
                style={{ letterSpacing: '-0.02em' }}>
              {profile.name}
            </h1>
            
            {/* Glass Orb VITANA Index - Premium Static Style */}
            {profile.vitanaIndex && (
              <div className="relative flex items-center">
                {/* Single static ambient glow */}
                <div className={`absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br ${themeConfig.vitanaOrb.glow} blur-2xl opacity-40 transition-all duration-300`}></div>
                
                {/* Glass orb with premium depth */}
                <div className={`relative w-[68px] h-[68px] rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.06),0_0_30px_hsl(var(--sys-vitana-accent)/0.2),inset_0_2px_8px_rgba(255,255,255,0.25),inset_0_-2px_6px_rgba(0,0,0,0.08)] border-[3px] flex flex-col items-center justify-center transition-transform duration-150 ease-out hover:scale-[1.02] cursor-pointer group focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none`}
                     style={{
                       background: themeConfig.vitanaOrb.background,
                     }}
                     tabIndex={0}
                     role="button"
                     aria-label={`Vitana Index: ${profile.vitanaIndex}`}
                     onClick={() => { window.history.pushState({}, '', '/health/my-health-tracker'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' || e.key === ' ') {
                         e.preventDefault();
                         window.history.pushState({}, '', '/health/my-health-tracker');
                         window.dispatchEvent(new PopStateEvent('popstate'));
                       }
                     }}
                >
                  {/* Inner glass reflection */}
                  <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="flex flex-col items-center justify-center text-center relative z-10">
                    <div className={`text-2xl font-extrabold leading-none ${themeConfig.vitanaOrb.text} drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-colors duration-300`}>{profile.vitanaIndex}</div>
                    <div className={`text-[10px] font-semibold leading-tight mt-1 ${themeConfig.vitanaOrb.text}/98 tracking-[0.05em] uppercase transition-colors duration-300`}>
                      Vitana
                    </div>
                  </div>
                  
                  {/* Rotating gradient border effect */}
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                       style={{
                         background: 'conic-gradient(from 0deg, hsl(199,36%,48%), hsl(239,36%,67%), hsl(219,36%,58%), hsl(199,36%,48%))',
                         mask: 'radial-gradient(circle, transparent 95%, black 98%)',
                         WebkitMask: 'radial-gradient(circle, transparent 95%, black 98%)',
                       }} />
                </div>
                
                {/* Premium percentile badge */}
                {profile.vitanaPercentile && (
                  <div className="absolute -top-1.5 -right-3 z-20 animate-fade-in" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                    <div 
                      className="relative h-5 px-2.5 py-0.5 rounded-full
                                 bg-[color-mix(in_oklab,hsl(var(--accent))_20%,hsl(var(--background)))]
                                 ring-1 ring-[hsl(var(--accent))/40]
                                 shadow-[0_2px_8px_rgba(0,0,0,0.15)]
                                 flex items-center justify-center
                                 transition-transform duration-150 ease-out hover:scale-[1.02]
                                 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
                      role="status"
                      aria-label={`Top ${100 - profile.vitanaPercentile} percentile`}
                    >
                      <span className="text-[9px] font-bold text-foreground leading-none tracking-wide">
                        TOP {100 - profile.vitanaPercentile}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Handle with refined typography */}
          <div className="flex items-center justify-center gap-2 mb-2 animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
            <p className={`text-base ${themeConfig.text.handle} font-light tracking-wide transition-colors duration-300`}>@{profile.handle}</p>
            {profile.longevityArchetype && (
              <>
                <span className="text-muted-foreground/50 text-xs">•</span>
                <span className={`text-sm ${themeConfig.text.handle} font-light tracking-wide transition-colors duration-300`}>{profile.longevityArchetype}</span>
              </>
            )}
          </div>
          
          {/* Optional bio tagline */}
          {profile.bio && (
            <p className={`text-sm ${themeConfig.text.bio} max-w-md mx-auto mb-3 px-4 leading-relaxed font-light italic animate-fade-in transition-colors duration-300`} 
               style={{ animationDelay: '0.35s', opacity: 0, animationFillMode: 'forwards' }}>
              {profile.bio}
            </p>
          )}
          
          {/* Premium Metallic Membership Tier Capsule */}
          {(profile.roles.length > 0 || profile.membershipTier) && (
            <div className="flex items-center justify-center mb-4 animate-fade-in" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
              <div className="relative group/tier">
                {/* Glowing halo effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(199,36%,48%)]/20 via-[hsl(239,36%,67%)]/15 to-[hsl(219,36%,58%)]/10 rounded-full blur-xl group-hover/tier:blur-2xl transition-all duration-500 opacity-60 group-hover/tier:opacity-80" />
                
                {/* Metallic gradient capsule */}
                <div className="relative px-6 py-2.5 rounded-full bg-gradient-to-br from-[hsl(199,36%,48%)]/10 via-[hsl(239,36%,67%)]/8 to-[hsl(199,36%,48%)]/5 backdrop-blur-md border-2 border-[hsl(199,36%,48%)]/25 shadow-[0_6px_20px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_rgba(0,0,0,0.16),inset_0_2px_6px_rgba(255,255,255,0.4)]">
                  {/* Inner shine reflection */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
                  
                  <span className="relative text-sm font-bold bg-gradient-to-r from-[hsl(199,36%,48%)] via-[hsl(239,36%,67%)] to-[hsl(199,36%,48%)] bg-clip-text text-transparent tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
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
                  className={`rounded-full ${themeConfig.buttons.secondary} backdrop-blur-md hover:-translate-y-1.5 hover:scale-105 transition-all duration-300 shadow-[0_6px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.15)] active:scale-100 ease-out`}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  <span className="font-medium">View Public Profile</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="default"
                  className={`rounded-full ${themeConfig.buttons.primary} hover:-translate-y-1.5 hover:scale-105 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] border-0 text-white font-semibold active:scale-100 ease-out`}
                  onClick={handleFollowClick}
                  disabled={followLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                </Button>
                
                <Button 
                  className={`inline-flex items-center gap-2 rounded-full h-10 px-5 ${themeConfig.buttons.secondary} backdrop-blur-md hover:-translate-y-1 hover:scale-105 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] font-medium active:scale-100 ease-out`}
                  onClick={handleMessageClick}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Message</span>
                </Button>
                
                <Button 
                  className={`inline-flex items-center gap-2 rounded-full h-10 px-5 ${themeConfig.buttons.secondary} backdrop-blur-md hover:-translate-y-1 hover:scale-105 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] font-medium active:scale-100 ease-out`}
                  onClick={() => setShareModalOpen(true)}
                >
                  <Share2 className="h-4 w-4" />
                  <span>{translate('common.share', 'Share')}</span>
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

      {/* Share sheet — native share + QR, visitor-only entry point */}
      {!isOwner && (
        <>
          <ShareProfileSheet
            isOpen={shareModalOpen}
            onOpenChange={setShareModalOpen}
            profile={profile}
            shareUrl={shareHook.getShareUrl()}
            onShowQR={() => setQrScreenOpen(true)}
          />
          <MobileQRShareScreen
            isOpen={qrScreenOpen}
            onClose={() => setQrScreenOpen(false)}
            profileUrl={shareHook.getShareUrl()}
            profileName={profile.name}
            profileHandle={profile.handle}
            avatarUrl={profile.avatarUrl}
            avatarOffsetX={profile.avatarOffsetX}
            avatarOffsetY={profile.avatarOffsetY}
          />
        </>
      )}
    </>
  );
}
