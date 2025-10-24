import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { ProfileIdCardFront } from "./ProfileIdCardFront";
import { ProfileIdCardBack } from "./ProfileIdCardBack";

interface ProfileHeaderProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEdit?: () => void;
}

export function ProfileHeader({ profile, scope, editMode, onEdit }: ProfileHeaderProps) {
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
          />
          
          {/* Themed Vertical Divider - Only visible on large screens */}
          <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px pointer-events-none">
            <div className="h-full bg-gradient-to-b from-transparent via-current to-transparent opacity-30 transition-all duration-[400ms] ease-in-out" style={{ color: 'hsl(var(--sys-vitana-accent))' }} />
          </div>
          
          {/* Back ID Card - Right */}
          <ProfileIdCardBack profile={profile} />
        </div>
      </div>
    </div>
  );
}