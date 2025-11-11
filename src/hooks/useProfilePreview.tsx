import { createContext, useContext, useState, ReactNode } from 'react';

interface ProfilePreviewContextType {
  userId: string | null;
  isOpen: boolean;
  openPreview: (userId: string) => void;
  closePreview: () => void;
}

const ProfilePreviewContext = createContext<ProfilePreviewContextType | undefined>(undefined);

export function ProfilePreviewProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openPreview = (uid: string) => {
    setUserId(uid);
    setIsOpen(true);
  };

  const closePreview = () => {
    setIsOpen(false);
    // Clear userId after animation completes
    setTimeout(() => setUserId(null), 300);
  };

  return (
    <ProfilePreviewContext.Provider value={{ userId, isOpen, openPreview, closePreview }}>
      {children}
    </ProfilePreviewContext.Provider>
  );
}

export function useProfilePreview() {
  const context = useContext(ProfilePreviewContext);
  if (!context) {
    throw new Error('useProfilePreview must be used within ProfilePreviewProvider');
  }
  return context;
}
