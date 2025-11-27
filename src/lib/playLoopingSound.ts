// Global registry to track all active looping sounds
const activeLoopingSounds = new Set<{
  audio: HTMLAudioElement;
  stop: () => void;
  path: string;
}>();

export function playLoopingSound(path: string, volume = 0.05) {
  const audio = new Audio(path);
  audio.loop = true;
  audio.volume = volume;
  audio.play().catch((err) => {
    console.warn(`[playLoopingSound] Autoplay blocked for ${path}:`, err);
  });

  const instance = {
    audio,
    path,
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      audio.load();
      activeLoopingSounds.delete(instance);
    }
  };

  activeLoopingSounds.add(instance);
  return instance;
}

/**
 * Stop all looping sounds matching a specific path
 * Useful for cleanup when navigating away or forcing cleanup
 * If path is empty string, stops ALL looping sounds
 */
export function stopAllLoopingSoundsForPath(path: string) {
  const instancesToStop = path === ''
    ? Array.from(activeLoopingSounds)
    : Array.from(activeLoopingSounds).filter(instance => instance.path === path);
  
  console.log(`[playLoopingSound] Stopping ${instancesToStop.length} instances for path: ${path || 'ALL'}`);
  
  instancesToStop.forEach((instance, index) => {
    try {
      console.log(`[playLoopingSound] Stopping instance ${index}:`, instance.path);
      instance.stop();
    } catch (e) {
      console.warn('Error stopping audio instance:', e);
    }
  });
}

/**
 * Remove an audio element from the active registry without stopping it
 * Useful when transferring ownership of audio to another system
 */
export function removeFromRegistry(audio: HTMLAudioElement) {
  const instance = Array.from(activeLoopingSounds).find(inst => inst.audio === audio);
  if (instance) {
    console.log('[playLoopingSound] Removing from registry:', instance.path);
    activeLoopingSounds.delete(instance);
  }
}
