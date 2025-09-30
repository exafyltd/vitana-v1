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
        {/* Two ID Cards Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Front ID Card - Left */}
          <ProfileIdCardFront 
            profile={profile} 
            scope={scope} 
            editMode={editMode} 
            onEdit={onEdit}
          />
          
          {/* Back ID Card - Right */}
          <ProfileIdCardBack profile={profile} />
        </div>
      </div>
    </div>
  );
}