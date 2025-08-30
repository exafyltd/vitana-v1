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
          <div className="absolute -top-8 right-6">
            <div className="relative">
              {/* Subtle outer glow/halo */}
              <div className="absolute inset-0 w-28 h-28 rounded-full bg-gradient-to-br from-slate-200/30 via-slate-100/20 to-slate-300/30 blur-xl"></div>
              
              {/* Main circular badge - elegant metallic */}
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 shadow-xl border border-slate-300/50 flex flex-col items-center justify-center overflow-hidden">
                {/* Subtle inner shadow for depth */}
                <div className="absolute inset-0 rounded-full shadow-inner shadow-slate-300/30"></div>
                
                {/* Top highlight for glass effect */}
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gradient-to-br from-white/70 via-white/40 to-transparent blur-[2px]"></div>
                
                {/* Subtle metallic shine */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/40 to-transparent transform rotate-45 opacity-50"></div>
                
                {/* Content inside circle */}
                <div className="flex flex-col items-center justify-center z-10 mt-1">
                  {/* Score - prominent but balanced */}
                  <div className="text-3xl font-black text-[#006D5B] leading-none">{profile.vitanaIndex}</div>
                  {/* Label - properly spaced */}
                  <div className="text-[9px] font-semibold text-slate-600 tracking-wide leading-tight mt-1">VITANA Index</div>
                </div>
                
                {/* Subtle inner border */}
                <div className="absolute inset-2 rounded-full border border-white/40"></div>
              </div>
              
              {/* Top % Pill Badge - Smaller and more refined */}
              {profile.vitanaPercentile && (
                <div className="absolute -top-1 -right-1 z-20">
                  <div className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 border border-orange-500/60 shadow-md">
                    <span className="text-[8px] font-bold text-white leading-none">TOP {100 - profile.vitanaPercentile}%</span>
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