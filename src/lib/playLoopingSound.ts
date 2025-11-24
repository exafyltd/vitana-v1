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
  audio.play().catch(() => {});

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
 */
export function stopAllLoopingSoundsForPath(path: string) {
  const instancesToStop = Array.from(activeLoopingSounds).filter(
    instance => instance.path === path
  );
  
  instancesToStop.forEach(instance => {
    try {
      instance.stop();
    } catch (e) {
      console.warn('Error stopping audio instance:', e);
    }
  });
}
