/**
 * Video source helper for tenant intro experiences
 * Supports both single video fallback and manifest-based daily rotation
 */

interface VideoManifest {
  videos: string[];
}

/**
 * Get intro video source for a tenant
 * - Tries to load manifest.json from /videos/intro/{tenant}/
 * - If manifest exists and has videos, picks one deterministically by date
 * - Otherwise returns default video path
 */
export async function getIntroVideoSrc(tenant: string): Promise<string> {
  const basePath = `/videos/intro/${tenant}`;
  const manifestUrl = `${basePath}/manifest.json`;
  const defaultVideo = `${basePath}/101516-video-720.mp4`;

  // VTID-03652: a stalled connection (not a rejection) never hits the catch
  // below, and the caller (IntroExperience) renders nothing but a spinner
  // until videoSrc resolves — so an unguarded fetch here can strand the
  // whole landing page exactly like the same-shaped AuthProvider bug this
  // VTID also fixes. Bound the wait so a hung request always falls back to
  // the default video instead of hanging the page forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(manifestUrl, { signal: controller.signal });
    if (!response.ok) {
      return defaultVideo;
    }

    const manifest: VideoManifest = await response.json();
    if (!manifest.videos || manifest.videos.length === 0) {
      return defaultVideo;
    }

    // Deterministic selection based on current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hash = Array.from(today).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % manifest.videos.length;

    return `${basePath}/${manifest.videos[index]}`;
  } catch (error) {
    // Silently fall back to default video if manifest fetch fails (includes
    // the AbortError from the 5s timeout above)
    return defaultVideo;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check if intro has been seen in current session
 */
export function hasSeenIntro(tenant: string): boolean {
  return localStorage.getItem(`introSeen:${tenant}`) === 'true';
}

/**
 * Mark intro as seen for current session
 */
export function markIntroAsSeen(tenant: string): void {
  localStorage.setItem(`introSeen:${tenant}`, 'true');
}
