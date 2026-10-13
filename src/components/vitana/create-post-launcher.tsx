/**
 * VTID-05143 — open the existing create-post composer from a card.
 *
 * There is no create-post route (plan §1): E3 "First post" and F10 "Upload
 * video/music" open CreateContentPopup (desktop) or MobileCreatePostSheet
 * (phone), F10 in media mode. When a card already sits INSIDE the composer
 * (the "Make a Post" strip), the composer provides this context so the card
 * switches the open composer instead of stacking a second one on top.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { CreateContentPopup } from '@/components/CreateContentPopup';
import { MobileCreatePostSheet } from '@/components/profile/mobile/MobileCreatePostSheet';
import { useIsMobile } from '@/hooks/use-mobile';

export type CreatePostMode = 'post' | 'media';

const CreatePostLauncherContext = createContext<((mode: CreatePostMode) => void) | null>(null);

export function CreatePostLauncherProvider({ open, children }: { open: (mode: CreatePostMode) => void; children: ReactNode }) {
  return <CreatePostLauncherContext.Provider value={open}>{children}</CreatePostLauncherContext.Provider>;
}

export function useCreatePostLauncher(): { open: (mode: CreatePostMode) => void; composer: ReactNode } {
  const host = useContext(CreatePostLauncherContext);
  const isMobile = useIsMobile();
  const [openMode, setOpenMode] = useState<CreatePostMode | null>(null);

  if (host) return { open: host, composer: null };

  const close = () => setOpenMode(null);
  const composer = isMobile ? (
    <MobileCreatePostSheet
      open={openMode !== null}
      onOpenChange={(o) => !o && close()}
      pickMediaOnOpen={openMode === 'media'}
    />
  ) : (
    <CreateContentPopup isOpen={openMode !== null} onClose={close} initialType={openMode ?? undefined} />
  );
  return { open: setOpenMode, composer };
}
