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
            className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm"
            onClick={onEdit}
          >
            <Edit3 className="h-4 w-4 mr-1" />
            Edit Cover
          </Button>
        )}
        
        {/* VITANA Index Badge - Premium Medal Style */}
        {profile.vitanaIndex && (
          <div className="absolute top-4 right-4">
            <div className="relative">
              {/* Subtle halo glow */}
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-white/30 blur-xl animate-pulse"></div>
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-white/50 blur-lg"></div>
              
              {/* Main circular badge - Premium metallic medal */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-white via-gray-100 to-gray-200 shadow-2xl border border-white/60 flex flex-col items-center justify-center overflow-hidden">
                {/* Inner highlight (top-left) for 3D depth */}
                <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-gradient-to-br from-white/80 to-transparent blur-sm"></div>
                
                {/* Inner shadow (bottom-right) for 3D depth */}
                <div className="absolute inset-1 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-1px_-1px_2px_rgba(255,255,255,0.8)]"></div>
                
                {/* Glass reflection */}
                <div className="absolute top-0 left-0 right-0 h-6 rounded-t-full bg-gradient-to-b from-white/60 to-transparent"></div>
                
                {/* Content inside circle - perfectly centered */}
                <div className="flex flex-col items-center justify-center z-10 relative text-center">
                  {/* Large bold number */}
                  <div className="text-2xl font-bold text-teal-600 leading-none">{profile.vitanaIndex}</div>
                  {/* VITANA Index text below */}
                  <div className="text-[8px] font-medium text-gray-600 leading-tight mt-0.5">
                    <span className="font-semibold">VITANA</span> Index
                  </div>
                </div>
                
                {/* Subtle border for definition */}
                <div className="absolute inset-0 rounded-full border border-gray-300/40"></div>
              </div>
              
              {/* Top % Ribbon - Small pill overlapping top-right edge */}
              {profile.vitanaPercentile && (
                <div className="absolute -top-1 -right-2 z-20">
                  <div className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 shadow-md">
                    <span className="text-[7px] font-bold text-white leading-none">TOP {100 - profile.vitanaPercentile}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-6 pb-6 relative">
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