import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { ProfileIdCardFront } from "./ProfileIdCardFront";
import { ProfileIdCardBack } from "./ProfileIdCardBack";
import { useProfileTheme } from "@/hooks/useProfileTheme";
import { useAuth } from "@/context/AuthProvider";

interface ProfileHeaderProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEdit?: () => void;
}

export function ProfileHeader({ profile, scope, editMode, onEdit }: ProfileHeaderProps) {
  const { user } = useAuth();
  const isOwner = scope === 'owner';
  const targetUserId = isOwner ? user?.id : profile.id;
  const { themeConfig, cycleTheme } = useProfileTheme(targetUserId);
  
  return (
    <div className="relative pt-12 pb-6">
      <div className="container mx-auto px-6">
        {/* Two ID Cards Layout with Themed Divider */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Front ID Card - Left */}
          <ProfileIdCardFront 
            profile={profile} 
            scope={scope} 
            editMode={editMode} 
            onEdit={onEdit}
            themeConfig={themeConfig}
            cycleTheme={cycleTheme}
          />
          
          {/* Themed Vertical Divider - Only visible on large screens */}
          <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px pointer-events-none">
            <div className={`h-full bg-gradient-to-b ${themeConfig.backCard.dividerColor || 'from-transparent via-current to-transparent'} via-current to-transparent opacity-40 transition-all duration-500 ease-in-out`} />
          </div>
          
          {/* Back ID Card - Right */}
          <ProfileIdCardBack profile={profile} themeConfig={themeConfig} />
        </div>
      </div>
    </div>
  );
}