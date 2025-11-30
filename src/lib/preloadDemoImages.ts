import { UNSPLASH_PROFILE_PHOTOS } from './unsplashFallback';

export async function preloadDemoImages(): Promise<void> {
  const preloadPromises = UNSPLASH_PROFILE_PHOTOS.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Resolve even on error to not block
      img.src = url;
    });
  });

  // Preload all images in parallel
  await Promise.all(preloadPromises);
}
