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
        {/* VITANA Index Badge - Upper Right */}
        {profile.vitanaIndex && (
          <div className="absolute -top-10 right-6">
            <div className="relative">
              {/* Outer glow/halo - enhanced */}
              <div className="absolute inset-0 w-28 h-28 rounded-full bg-gradient-to-br from-blue-200/50 via-slate-300/40 to-indigo-200/50 blur-lg"></div>
              
              {/* Main circular badge - larger and more metallic */}
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-slate-50 via-slate-200 to-slate-400 shadow-2xl border-2 border-slate-400/70 flex flex-col items-center justify-center overflow-hidden">
                {/* Deep inner shadow for metallic depth */}
                <div className="absolute inset-0 rounded-full shadow-inner shadow-slate-600/50"></div>
                
                {/* Enhanced top-left highlight for premium 3D effect */}
                <div className="absolute top-1 left-1 w-8 h-8 rounded-full bg-gradient-to-br from-white/80 via-white/50 to-transparent blur-sm"></div>
                
                {/* Enhanced bottom-right shadow for 3D depth */}
                <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-gradient-to-tl from-slate-500/50 via-slate-400/30 to-transparent blur-sm"></div>
                
                {/* Premium metallic shine effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/60 to-transparent transform rotate-45 opacity-70"></div>
                
                {/* Secondary shine for glass effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-slate-300/40 transform -rotate-12 opacity-50"></div>
                
                {/* Content inside circle */}
                <div className="flex flex-col items-center justify-center z-10">
                  {/* Score - larger and more prominent */}
                  <div className="text-3xl font-black text-[#006D5B] leading-none drop-shadow-md">{profile.vitanaIndex}</div>
                  {/* Label - properly sized for larger badge */}
                  <div className="text-[10px] font-bold text-slate-700 tracking-wide leading-none mt-1">VITANA Index</div>
                </div>
                
                {/* Inner ring for premium detail - adjusted for larger size */}
                <div className="absolute inset-3 rounded-full border border-slate-400/60"></div>
              </div>
              
              {/* Top % Pill Badge - Enhanced orange ribbon */}
              {profile.vitanaPercentile && (
                <div className="absolute -top-2 -right-2 z-20">
                  <div className="px-2 py-1 rounded-full bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400 border-2 border-orange-500/80 shadow-xl">
                    <span className="text-[10px] font-black text-white leading-none drop-shadow-sm">Top {100 - profile.vitanaPercentile}%</span>
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