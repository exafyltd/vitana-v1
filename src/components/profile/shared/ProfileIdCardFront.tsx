import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MessageSquare, ExternalLink, Star, Edit3, Share2 } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";

interface ProfileIdCardFrontProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEdit?: () => void;
}

export function ProfileIdCardFront({ profile, scope, editMode, onEdit }: ProfileIdCardFrontProps) {
  const isOwner = scope === 'owner';
  
  return (
    <div className="relative h-full flex flex-col items-center justify-center p-8 bg-card border rounded-2xl shadow-lg">
      {/* Avatar */}
      <div className="relative mb-4">
        <Avatar className="h-40 w-40 border-4 border-background shadow-xl drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(0, 0, 0, 0.1)) drop-shadow(0 8px 32px rgba(0, 0, 0, 0.15))'
                }}>
          <AvatarImage src={profile.avatarUrl} alt={profile.name} />
          <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
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
                <Button variant="outline" onClick={onEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Identity
                </Button>
              )}
            </>
          ) : (
            <>
              <Button className="rounded-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Follow
              </Button>
              <Button variant="outline" className="rounded-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
              <Button variant="outline" className="rounded-full">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
