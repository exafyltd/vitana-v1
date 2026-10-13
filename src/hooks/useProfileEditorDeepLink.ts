/**
 * VTID-05143 — Unified Card System deep links into the profile editor:
 * /me/profile#avatar | #about | #location | #cover | #interests.
 *
 * The hash is consumed: once its editor is opened it is dropped from the URL
 * (replace, path and query kept). Otherwise it stays after the editor closes
 * and tapping the same card again navigates to the same URL — no change, no
 * effect, nothing opens.
 *
 * `onEditorClosed` re-reads the member's enrichment cards: a card whose step
 * was just saved in the editor (photo, bio, location, cover) goes away.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInvalidateEnrichmentCards } from '@/hooks/useEnrichmentCards';

export type ProfileEditorHash = 'avatar' | 'about' | 'location' | 'cover' | 'interests';

const EDITOR_HASHES: readonly string[] = ['avatar', 'about', 'location', 'cover', 'interests'];

export function useProfileEditorDeepLink(openers: Partial<Record<ProfileEditorHash, () => void>>): {
  onEditorClosed: () => void;
} {
  const location = useLocation();
  const navigate = useNavigate();
  const onEditorClosed = useInvalidateEnrichmentCards();
  // Latest openers without re-running the effect on every render.
  const openersRef = useRef(openers);
  openersRef.current = openers;

  useEffect(() => {
    const hash = location.hash.replace(/^#/, '');
    if (!EDITOR_HASHES.includes(hash)) return;
    openersRef.current[hash as ProfileEditorHash]?.();
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: location.state });
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  return { onEditorClosed };
}
