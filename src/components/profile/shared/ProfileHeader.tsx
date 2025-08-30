import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MessageSquare, Share, Star, Edit3 } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";

interface ProfileHeaderProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEdit?: () => void;
}

export function ProfileHeader({ profile, scope, editMode, onEdit }: ProfileHeaderProps) {
  const isOwner = scope === 'owner';
  
  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="h-48 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 rounded-t-2xl relative overflow-hidden">
        {profile.coverUrl && (
          <img 
            src={profile.coverUrl} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
        {editMode && onEdit && (
          <Button
            size="sm"
            variant="outline"
            className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm"
            onClick={onEdit}
          >
            <Edit3 className="h-4 w-4 mr-1" />
            Edit Cover
          </Button>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-6 pb-6 relative">
        {/* VITANA Index Badge - Top Right Corner */}
        {profile.vitanaIndex && (
          <div className="absolute top-4 right-4">
            <div className="relative">
              {/* Powerful outer halo glow */}
              <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-radial from-white/60 via-slate-100/40 to-transparent blur-3xl animate-[pulse_3s_ease-in-out_infinite]"></div>
              <div className="absolute inset-0 w-28 h-28 rounded-full bg-gradient-radial from-white/80 via-slate-200/30 to-transparent blur-xl"></div>
              
              {/* Main circular badge - premium steel/crystal medal */}
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 shadow-2xl border border-slate-400/40 flex flex-col items-center justify-center overflow-hidden animate-[pulse_4s_ease-in-out_infinite,_scale-pulse_4s_ease-in-out_infinite]">
                {/* Deep inner shadow for strong 3D concave effect */}
                <div className="absolute inset-1 rounded-full shadow-[inset_0_6px_12px_rgba(0,0,0,0.25),inset_0_-3px_6px_rgba(255,255,255,0.4)]"></div>
                
                {/* Enhanced metallic shine layers */}
                <div className="absolute top-1 left-2 w-12 h-12 rounded-full bg-gradient-to-br from-white/90 via-white/60 to-transparent blur-[1px] opacity-80"></div>
                <div className="absolute top-2 left-3 w-8 h-8 rounded-full bg-gradient-to-br from-white/70 via-white/40 to-transparent blur-[1px] opacity-60"></div>
                <div className="absolute top-4 left-1 w-6 h-6 rounded-full bg-gradient-to-br from-white/50 via-white/20 to-transparent blur-[2px]"></div>
                
                {/* Animated shine sweep - living medal effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/60 to-transparent transform rotate-45 opacity-70 animate-[spin_6s_linear_infinite]"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-bl from-transparent via-white/40 to-transparent transform -rotate-45 opacity-50 animate-[spin_8s_linear_infinite_reverse]"></div>
                
                {/* Glass reflection with movement */}
                <div className="absolute top-0 left-0 right-0 h-8 rounded-t-full bg-gradient-to-b from-white/60 to-transparent"></div>
                <div className="absolute top-1 left-1 w-10 h-4 rounded-full bg-gradient-to-r from-white/40 to-transparent transform rotate-12"></div>
                
                {/* Secondary depth layer */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-50/30 via-transparent to-slate-300/20"></div>
                
                {/* Content inside circle - perfectly centered */}
                <div className="flex flex-col items-center justify-center z-20 relative">
                  {/* Score - prominent and crystal clear */}
                  <div className="text-4xl font-black text-[#006D5B] leading-none tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">{profile.vitanaIndex}</div>
                  {/* Label - elegantly spaced with better contrast */}
                  <div className="text-[9px] font-bold text-slate-700 tracking-[0.5px] leading-tight mt-1 drop-shadow-sm">VITANA INDEX</div>
                </div>
                
                {/* Premium inner border ring with glow */}
                <div className="absolute inset-3 rounded-full border border-white/60 shadow-[0_0_4px_rgba(255,255,255,0.3)]"></div>
                
                {/* Outer border enhancement with metallic edge */}
                <div className="absolute inset-0 rounded-full border border-slate-300/80"></div>
              </div>
              
              {/* Top % Pill Badge - Refined positioning and elegant size */}
              {profile.vitanaPercentile && (
                <div className="absolute -top-1 -right-1 z-30">
                  <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400 border border-orange-600/60 shadow-lg">
                    <span className="text-[8px] font-bold text-white leading-none drop-shadow-sm tracking-tight">TOP {100 - profile.vitanaPercentile}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Avatar - Centered */}
        <div className="flex justify-center -mt-16 mb-4">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
              <AvatarImage src={profile.avatarUrl} alt={profile.name} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                {profile.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            {editMode && onEdit && (
              <Button
                size="sm"
                variant="outline"
                className="absolute bottom-2 right-2 h-8 w-8 rounded-full p-0 bg-background shadow-lg"
                onClick={onEdit}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Name, Handle, and Actions - Centered */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{profile.name}</h1>
            {profile.roles.includes('professional') && (
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            )}
          </div>
          <p className="text-lg text-muted-foreground mb-3">@{profile.handle}</p>
          
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

          {/* Action Buttons - Centered */}
          <div className="flex items-center justify-center gap-2">
            {!isOwner && (
              <>
                <Button className="rounded-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow
                </Button>
                <Button variant="outline" className="rounded-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button variant="ghost" className="rounded-full">
                  <Share className="h-4 w-4" />
                </Button>
              </>
            )}
            {editMode && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Identity
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}