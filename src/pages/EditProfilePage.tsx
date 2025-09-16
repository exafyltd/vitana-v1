import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { UserProfile, ViewAsMode } from "@/types/profile";
import { ProfileLayout } from "@/components/profile/shared/ProfileLayout";
import { EditToolbar } from "@/components/profile/EditToolbar";
import { IdentityDrawer } from "@/components/profile/drawers/IdentityDrawer";
import { AboutDrawer } from "@/components/profile/drawers/AboutDrawer";
import { ServicesDrawer } from "@/components/profile/drawers/ServicesDrawer";
import { ComplianceDrawer } from "@/components/profile/drawers/ComplianceDrawer";
import { ShowcaseDrawer } from "@/components/profile/drawers/ShowcaseDrawer";
import { VisibilityDrawer } from "@/components/profile/drawers/VisibilityDrawer";
import { getScope } from "@/lib/profileScope";
import { useProfile } from "@/context/ProfileProvider";
import { toast } from "sonner";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { profile: contextProfile } = useProfile();
  const [viewAs, setViewAs] = useState<ViewAsMode>("me");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [identityDrawerOpen, setIdentityDrawerOpen] = useState(false);
  const [aboutDrawerOpen, setAboutDrawerOpen] = useState(false);
  const [servicesDrawerOpen, setServicesDrawerOpen] = useState(false);
  const [complianceDrawerOpen, setComplianceDrawerOpen] = useState(false);
  const [showcaseDrawerOpen, setShowcaseDrawerOpen] = useState(false);
  const [visibilityDrawerOpen, setVisibilityDrawerOpen] = useState(false);

  // Profile data from context
  const [profile, setProfile] = useState<UserProfile>({
    id: 'current-user',
    name: contextProfile.displayName,
    handle: contextProfile.handle || 'user',
    avatarUrl: contextProfile.avatar,
    roles: ['community'],
    bio: 'Wellness enthusiast passionate about holistic health and community building. 🌱',
    location: 'San Francisco, CA',
    links: [
      { label: 'Website', url: 'https://mariia.com' },
      { label: 'Instagram', url: 'https://instagram.com/mariia' }
    ],
    languages: ['English', 'Ukrainian'],
    stats: {
      posts: 124,
      followers: 1205,
      following: 487,
      mediaUploads: 89,
      groupsJoined: 12
    },
    vitanaIndex: 742,
    vitanaPercentile: 85,
    longevityArchetype: 'The Mindful Mover',
    visibility: {
      about: 'public',
      links: 'public',
      location: 'public',
      showcase: 'public',
      indexPublic: true,
      healthShareConsent: true
    }
  });

  // Update profile when context changes
  useEffect(() => {
    setProfile(prev => ({
      ...prev,
      name: contextProfile.displayName,
      handle: contextProfile.handle || 'user',
      avatarUrl: contextProfile.avatar,
    }));
  }, [contextProfile]);

  const scopeContext = {
    isOwner: true,
    isFollower: false,
    editMode: true,
    viewAs
  };

  const scope = getScope(scopeContext);

  const handleSave = () => {
    // TODO: Save profile changes
    setHasUnsavedChanges(false);
    toast.success("Profile updated successfully! Your changes are now live.", {
      description: "Your VITANA profile looks amazing.",
      duration: 4000,
    });
    console.log('Saving profile changes...');
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    navigate(`/u/${profile.handle}`);
  };

  const handleEditIdentity = () => {
    setIdentityDrawerOpen(true);
  };

  const handleEditAbout = () => {
    setAboutDrawerOpen(true);
  };

  const handleEditServices = () => {
    setServicesDrawerOpen(true);
  };

  const handleEditCompliance = () => {
    setComplianceDrawerOpen(true);
  };

  const handleEditShowcase = () => {
    setShowcaseDrawerOpen(true);
  };

  const handleEditVisibility = () => {
    setVisibilityDrawerOpen(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
        if (e.shiftKey && e.key === 'P') {
          e.preventDefault();
          const modes: ViewAsMode[] = ["me", "public", "follower"];
          const currentIndex = modes.indexOf(viewAs);
          const nextIndex = (currentIndex + 1) % modes.length;
          setViewAs(modes[nextIndex]);
        }
      }
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewAs, hasUnsavedChanges]);

  return (
    <AppLayout>
      <SEO 
        title="Edit Profile – VITANA" 
        description="Edit your VITANA profile and customize your public presence" 
      />
      
      <EditToolbar
        viewAs={viewAs}
        onViewAsChange={setViewAs}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      
      <ProfileLayout 
        profile={profile}
        scope={scope}
        editMode={true}
        isOwnProfile={viewAs === "me"}
        onEditIdentity={handleEditIdentity}
        onEditAbout={handleEditAbout}
        onEditServices={handleEditServices}
        onEditCompliance={handleEditCompliance}
        onEditShowcase={handleEditShowcase}
        onEditVisibility={handleEditVisibility}
      />

      <IdentityDrawer
        open={identityDrawerOpen}
        onOpenChange={setIdentityDrawerOpen}
      />

      <AboutDrawer
        open={aboutDrawerOpen}
        onOpenChange={setAboutDrawerOpen}
      />

      <ServicesDrawer
        open={servicesDrawerOpen}
        onOpenChange={setServicesDrawerOpen}
      />

      <ComplianceDrawer
        open={complianceDrawerOpen}
        onOpenChange={setComplianceDrawerOpen}
      />

      <ShowcaseDrawer
        open={showcaseDrawerOpen}
        onOpenChange={setShowcaseDrawerOpen}
      />

      <VisibilityDrawer
        open={visibilityDrawerOpen}
        onOpenChange={setVisibilityDrawerOpen}
      />
    </AppLayout>
  );
}