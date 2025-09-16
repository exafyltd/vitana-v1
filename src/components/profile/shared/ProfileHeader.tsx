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
      <div className="aspect-[16/5] bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 rounded-t-2xl relative overflow-hidden">
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
        
        {/* VITANA Index Badge - Clean Medal Style */}
        {profile.vitanaIndex && (
          <div className="absolute top-4 right-4">
            <div className="relative">
              {/* Pulsing glow effect */}
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-white/40 blur-lg animate-pulse"></div>
              
              {/* Main circular badge - Steel/Glass Metallic */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 shadow-xl border border-gray-300/60 flex flex-col items-center justify-center animate-pulse"
                   style={{
                     background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
                     boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                   }}>
                {/* Content inside circle */}
                <div className="flex flex-col items-center justify-center text-center">
                  {/* Large bold number in deep emerald */}
                  <div className="text-2xl font-bold leading-none" style={{color: '#006D5B'}}>{profile.vitanaIndex}</div>
                  {/* VITANA Index text below in charcoal gray */}
                  <div className="text-[8px] font-medium leading-tight mt-0.5" style={{color: '#2C2C2C'}}>
                    <span className="font-semibold">VITANA</span> Index
                  </div>
                </div>
              </div>
              
              {/* Top % Ribbon - Small pill overlapping top-right edge */}
              {profile.vitanaPercentile && (
                <div className="absolute -top-1 -right-2 z-20">
                  <div className="h-4 px-1.5 rounded-full bg-gradient-to-r from-orange-400 to-yellow-400 shadow-md flex items-center justify-center">
                    <span className="text-[7px] font-bold text-white leading-none">TOP {100 - profile.vitanaPercentile}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Longevity Archetype - Positioned as badge subtitle */}
        {profile.vitanaIndex && profile.longevityArchetype && (
          <div className="absolute right-4 flex justify-center w-20" style={{ top: '104px' }}>
            <span className="text-xs font-normal leading-tight text-center whitespace-nowrap" style={{ color: '#6A7A89', fontSize: '12px' }}>
              {profile.longevityArchetype}
            </span>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-6 pb-6 relative">
        {/* Avatar - Centered */}
        <div className="flex justify-center -mt-32 mb-4">
          <div className="relative">
            <Avatar className="h-54 w-54 border-4 border-background shadow-xl drop-shadow-2xl"
                    style={{
                      filter: 'drop-shadow(0 0 20px rgba(0, 0, 0, 0.1)) drop-shadow(0 8px 32px rgba(0, 0, 0, 0.15))'
                    }}>
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